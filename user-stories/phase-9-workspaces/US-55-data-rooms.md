# US-55 — Data Rooms

---

**User Story: Data Rooms**

**As a** workspace owner/editor running a due-diligence or fundraising
process,
**I want** to group several documents into one named collection with a
single shareable link,
**So that** a recipient gets one URL instead of juggling a separate link
per document, matching the "data room" format DocSend/Papermark use for
this workflow.

**Scope decisions (confirmed with the user 2026-07-23):**

- **Permissions are per-document, not per-recipient.** Each document
  inside a room has its own `allow_download` flag, same as a regular
  share link. There is no per-recipient override (e.g. "recipient A can
  download the term sheet but not the cap table") — the existing link
  model has no authenticated-recipient concept (links are anonymous or
  gated by a shared password/email allow-list), so a true per-recipient
  permission system would need an invite/login system of its own,
  explicitly out of scope here.
- **Data room links are a separate, self-contained mechanism** (own
  table, own token, own public route) rather than an extension of
  `share_links`. `share_links` is deeply integrated with single-document
  features that don't have an obvious multi-document equivalent yet (NDA
  gate, custom branding, watermarking, per-email allow-list, AI viewer
  chat, page-level analytics) — polymorphic-izing `share_links` itself
  would mean touching all of those simultaneously. A data room link only
  gets the protections every link fundamentally needs: optional
  password, optional expiry, revocation. Richer gating can be added later
  as its own story once data rooms are validated as useful.
- **Custom domain per workspace is explicitly deferred**, not part of
  this story — it needs real DNS verification and SSL provisioning via
  the Vercel Domains API (a `VERCEL_API_TOKEN` the project doesn't have
  configured, and no real domain to validate against in this
  environment). Scoped out per the user's own call; Phase 9 is
  considered done once this story ships.

**Acceptance Criteria:**

- [ ] `POST /api/v1/workspaces/[id]/data-rooms` creates a room (`name` +
      initial `document_ids`) in the caller's workspace (editor role
      required)
- [ ] `GET /api/v1/workspaces/[id]/data-rooms` lists a workspace's rooms
      (paginated, viewer role required)
- [ ] `GET /api/v1/data-rooms/[id]` returns a room's detail: name, and
      its documents each with `allow_download`
- [ ] `PATCH /api/v1/data-rooms/[id]` renames the room and/or fully
      replaces its document membership (add/remove documents, update
      per-document `allow_download`) — editor role required
- [ ] `DELETE /api/v1/data-rooms/[id]` soft-deletes the room (owner or
      editor)
- [ ] `POST /api/v1/data-rooms/[id]/links` creates a link for the room
      (`label`, optional `password`, optional `expires_at`)
- [ ] `GET /api/v1/data-rooms/[id]/links` lists a room's links
- [ ] `PATCH /api/v1/data-rooms/[id]/links/[linkId]` revokes a link
      (`is_active: false`) or edits label/password/expiry
- [ ] `GET /api/v1/data-room-share/[token]` (public, rate-limited) —
      validates password/expiry/revocation (same `X-Share-Password`
      header convention as the existing public share endpoint), returns
      the room's name and its document list (id, title, mime_type,
      page_count, allow_download)
- [ ] `GET /api/v1/data-room-share/[token]/file?document_id=X` (public,
      rate-limited) — re-validates the token, confirms `document_id`
      belongs to the room, streams that document's bytes (same
      no-server-side-`allow_download`-enforcement convention as the
      existing single-document file route — tracked as the same known
      gap as US-34/Phase 12's blocked-download follow-up, not a new one)
- [ ] Frontend: a "Data rooms" nav destination, a list page, a detail
      page (rename, manage documents + their `allow_download`, manage
      links), and a public `/data-room/[token]` viewer page (password
      gate if set, then a document list with view/download actions)
- [ ] Cross-workspace isolation: a room/link from workspace A is never
      reachable via a workspace-B-scoped or unauthenticated request that
      doesn't have the room's own id/token
- [ ] Integration tests cover CRUD, membership/`allow_download` updates,
      link creation/revocation, public gating (password/expiry/
      revocation), file-serving document-membership validation, and
      cross-workspace isolation

**Technical Context:**

- New tables (migration `034`): `data_rooms` (`id`, `workspace_id`,
  `name`, `created_by`, timestamps, soft-delete), `data_room_documents`
  (composite PK `data_room_id`+`document_id`, `allow_download`,
  `added_at` — a join table, full-replace semantics on update, same
  pattern as `share_link_allowed_emails`), `data_room_links` (`id`,
  `token`, `data_room_id`, `user_id`, `label`, `password_hash`,
  `expires_at`, `is_active`, timestamps — a deliberately smaller column
  set than `share_links`, matching the reduced feature scope above).
- `models/dataRoom.ts` and `models/dataRoomLink.ts` — separate models,
  mirroring `models/shareLink.ts`'s structure (`requireRole` checks,
  `fetchAndValidateTokenRow`-style gate) but without the NDA/branding/
  watermark/allow-list logic that doesn't apply here.
- Reuses `workspace.requireRole` for authorization — same trust boundary
  pattern as every other workspace-scoped model this phase.
- Reuses `infra/rate-limit.ts#rateLimit` on both public routes, same
  `{ limit: 20, windowMs: 60_000 }` as the existing public share routes.
- No plan-gating in this story — data rooms are unlimited on every plan
  for now; if usage suggests otherwise, a follow-up story can add a
  `maxDataRooms` limit to `subscription.PLAN_LIMITS`, same shape as the
  existing `maxActiveLinks`.

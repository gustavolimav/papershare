# Phase 9 — Team Workspaces (básico): Design

**Status:** Validated with the user on 2026-07-16. Ready for implementation.

**Scope:** the first slice of Phase 9 — workspaces with invites and a shared
document library. **Not** in this slice: data rooms (grouping documents into
one link with per-recipient overrides) and custom domains — each is its own
future phase, per `TODO.md`.

---

## Key decisions

| Decision          | Choice                                                                                                                                            | Why                                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base model        | Every user gets an automatic personal workspace at registration; documents always belong to exactly one workspace                                 | One authorization path instead of two (direct-owner vs. workspace-member) to build and maintain forever. Matches Notion/Linear/Vercel's mental model.                                                                            |
| Invites           | Direct — email must match an existing user, added immediately, no accept/decline step                                                             | Avoids building an invite-token system (expiry, revocation, unauthenticated accept flow, new email template) for a v1.                                                                                                           |
| AI key resolution | The workspace's `created_by` user's key, not a per-member lookup                                                                                  | Same one-hop resolution as today (`document owner → key`), just swapping the source of "owner." No new precedence rules to maintain.                                                                                             |
| Roles             | Three tiers: `viewer` / `editor` / `owner`                                                                                                        | Matches the granularity DocSend/Papermark-class tools ship; a flat 2-tier model would need revisiting almost immediately once someone wants read-only access for e.g. an external collaborator.                                  |
| Workspace in URLs | No path prefix — a header switcher sets `users.active_workspace_id` server-side; existing routes (`/dashboard`, `/documents/[id]`) read from that | Avoids migrating every existing App Router route and every internal link in the app. Trade-off: a bookmarked `/dashboard` link always shows whichever workspace was last active, not a specific one — acceptable for this slice. |

## Data model

- **`workspaces`** — `id`, `name`, `created_by` (FK `users.id`), `is_personal` (bool), `created_at`, `updated_at`, `deleted_at` (soft-delete, matching the existing convention on `documents`/accounts).
- **`workspace_members`** — composite PK `(workspace_id, user_id)`, `role` (`owner`/`editor`/`viewer`), `created_at`. No pending-invite table — membership rows are inserted directly on invite.
- **`documents.workspace_id`** (new, eventually `NOT NULL`) — replaces `user_id` for every authorization check. `documents.user_id` is **kept** as an audit/display field ("uploaded by"), just no longer consulted for permission.
- **`users.active_workspace_id`** (new, nullable) — the workspace the header switcher currently points at; defaults to the user's personal workspace.
- `share_links` gets no new column — its workspace is derived via `document_id → documents.workspace_id`, avoiding a column that could drift out of sync.

### Migration path (the project's first data-writing migration)

Every prior migration in `infra/migrations/` has been schema-only DDL. This
one also backfills: for every existing user, create a personal workspace
(`is_personal = true`), insert that user as its `owner` in
`workspace_members`, point their existing documents' `workspace_id` at it,
then apply `NOT NULL`. Safe against `orchestrator.cleanDatabase()`'s
zero-users case — an empty `users` table backfills nothing.

## Authorization

Central helper in a new `models/workspace.ts`:

```ts
requireRole(workspaceId, userId, minRole: "viewer" | "editor" | "owner"): Promise<void>
```

Throws `NotFoundError` (workspace missing/deleted) or `ForbiddenError`
(not a member, or role too low). Role hierarchy: `owner` satisfies any
`minRole`; `editor` satisfies `editor`/`viewer`; `viewer` satisfies only
`viewer`.

- Documents: read → `"viewer"`; upload/edit/delete → `"editor"`.
- Share links: read/list → `"viewer"`; create/edit/revoke → `"editor"`.
- Workspace management (invite, remove, change role, rename, delete) →
  `"owner"`.
- Guardrails: the last `owner` of a workspace can't be removed or
  demoted (would orphan the workspace); a personal workspace
  (`is_personal`) can't be renamed, deleted, invited into, or left.

This replaces the existing `document.user_id === userId` /
`shareLink.user_id === userId` equality checks — no separate
"direct owner" code path survives once every document has a
`workspace_id`.

## API surface

New: `POST/GET /api/v1/workspaces`, `PATCH/DELETE /api/v1/workspaces/[id]`,
`POST /api/v1/workspaces/[id]/activate`,
`GET/POST /api/v1/workspaces/[id]/members`,
`PATCH/DELETE /api/v1/workspaces/[id]/members/[userId]` (the `DELETE` on
one's own `userId` doubles as "leave workspace").

Unchanged surface, changed resolution: `GET/POST /api/v1/documents` and
every document/share-link/AI route keep their existing paths and
contracts — they resolve the acting workspace from
`req.user.active_workspace_id` (loaded with the session) instead of
`req.user.id`, so the frontend needs no new query params to keep working.

## Frontend

- Header gains a workspace switcher (new `useWorkspaces()` SWR hook over
  `GET /api/v1/workspaces`); selecting one calls `.../activate` and
  revalidates every workspace-scoped SWR key. Includes a "+ Criar
  workspace" entry (name-only modal).
- New "Equipe" tab in `/settings` (same pattern as the "IA" tab added in
  Phase 8): member list + role, invite form and role/remove controls for
  owners, a "Sair do workspace" button for everyone else. Shows a
  create-workspace prompt instead of a member list when the personal
  workspace is active.
- `DocumentCard.tsx` shows "Enviado por {nome}" when the active workspace
  has more than one member.
- The public viewer (`/view/[token]`) is untouched — a link recipient
  never needs to know a workspace exists.

## Testing

The load-bearing regression property: **a solo user's behavior doesn't
change.** Their personal workspace behaves exactly like today's
single-owner model, so the entire existing test suite (documents, share
links, analytics, AI) must keep passing unmodified on the single-user
happy path. New coverage: `tests/integration/api/v1/workspaces/*.test.ts`
(CRUD, invite/role/remove, last-owner and personal-workspace guardrails),
plus new cases in the existing document/link suites for the
multi-member path (an editor acting on a document they didn't upload; a
viewer getting `403` on a write). `tests/orchestrator.ts` gains
`createWorkspace()`/`inviteMember()` helpers; existing helpers
(`createUserSession()`, `uploadDocument()`) keep working unchanged.

## User stories

Written to `user-stories/phase-9-workspaces/`: US-28 through US-33,
covering the data model/migration, workspace CRUD + switching, member
management, document/share-link authorization migration, AI key
resolution, and the frontend surfaces above, in that dependency order.

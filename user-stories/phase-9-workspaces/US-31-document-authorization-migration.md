# US-31 — Document & Share-Link Authorization Becomes Workspace-Scoped

---

**User Story: Document & Share-Link Authorization Becomes Workspace-Scoped**

**As a** member of a shared workspace,
**I want** to see, upload, edit, and manage share links for every document in the workspace I'm part of — not just ones I personally uploaded,
**So that** the "shared document library" promised by Phase 9 is actually shared, and my role (viewer/editor/owner) is what determines what I can do, not who clicked upload.

**Acceptance Criteria:**

- [ ] `models/document.ts#findOneById` no longer compares `document.user_id === userId`; instead calls `workspace.requireRole(document.workspace_id, userId, "viewer")` — any member of the document's workspace can fetch it, not just the uploader
- [ ] `models/document.ts#create` takes a `workspaceId` (resolved by the route from `req.user.active_workspace_id`) instead of implicitly using `req.user.id`'s own documents; requires `workspace.requireRole(workspaceId, userId, "editor")` before inserting; the inserted row's `workspace_id` is the active workspace and `user_id` is still the uploader (audit field, per US-28)
- [ ] New migration applies `ALTER TABLE documents ALTER COLUMN workspace_id SET NOT NULL` — deliberately deferred from US-28's migration, since that story lands before `create()` above populates the column on every insert; applying `NOT NULL` any earlier breaks every document upload until this story ships
- [ ] `models/document.ts#findAllByUserId` is renamed `findAllByWorkspaceId` and filters `WHERE workspace_id = $1` instead of `WHERE user_id = $1`; the `GET /api/v1/documents` route resolves `workspaceId` from `req.user.active_workspace_id`
- [ ] `models/document.ts#updateById`/`deleteById` require `"editor"` role on the document's workspace (upgraded from the old direct-ownership check)
- [ ] `models/document.ts#getOwnerId` (used by AI chat's ownership resolution) is deprecated in favor of resolving the workspace and its `created_by` — covered fully in US-32, but this story must not leave `getOwnerId` as a dangling reference to the old `user_id`-based model
- [ ] `models/shareLink.ts`'s create/list/update/revoke functions apply the same pattern: resolve the parent document's `workspace_id`, then `requireRole(..., "editor")` for writes and `"viewer"` for reads, replacing every existing `document.user_id === userId` check reached via the document lookup
- [ ] A `viewer`-role member attempting `POST`/`PATCH`/`DELETE` on a document or share link gets `403`, with a message distinguishing "you're not a member of this workspace" from "your role doesn't allow this" (the former existing check already returns 404-for-non-member via `requireRole`; this is specifically about a `viewer` hitting the role floor)
- [ ] Every existing integration test in `tests/integration/api/v1/documents/**` and `tests/integration/api/v1/documents/[id]/links/**` continues to pass unmodified — a solo user's personal workspace has exactly one member (themselves, as `owner`), so every existing single-user assertion holds
- [ ] New integration tests cover the multi-member path: an `editor` in a shared workspace can view/edit/delete a document uploaded by a different member; a `viewer` gets `403` attempting to upload, edit, delete, or manage share links, but `200` reading them; a user with no membership in the document's workspace gets `404` (not `403` — don't reveal the document exists to a non-member)

**Technical Context:**

- Relevant files:
  - `models/document.ts` _(modify — swap every `user_id` authorization check for `workspace.requireRole()`; rename `findAllByUserId` → `findAllByWorkspaceId`; `create` signature gains `workspaceId`)_
  - `models/shareLink.ts` _(modify — same pattern, resolving through the parent document's `workspace_id`)_
  - `pages/api/v1/documents/index.ts`, `pages/api/v1/documents/[id]/index.ts`, `pages/api/v1/documents/[id]/links/**` _(modify — pass `req.user.active_workspace_id` where a workspace id is now needed; these routes' request/response shapes don't change, only what they resolve internally)_
  - `models/workspace.ts` _(consumed, not modified here — `requireRole()` from US-29/US-30)_
  - `tests/orchestrator.ts` _(likely needs a small addition: a way to fetch/assert the active workspace for a session, and `inviteMember`-then-switch helpers for the new multi-member test cases — coordinate with whatever US-28/US-30 already added rather than duplicating)_
- Depends on: US-28 (workspace_id exists on documents), US-29/US-30 (`requireRole()` and membership must exist to check against).
- This is the highest-risk story in the phase — it touches the authorization path of every existing document/share-link endpoint. Recommend running the full existing test suite (not just new tests) after each model function is migrated, one at a time, rather than changing all of `document.ts` and `shareLink.ts` before testing either.

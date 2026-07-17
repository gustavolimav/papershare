# US-29 — Workspace CRUD & Switching

---

**User Story: Workspace CRUD & Switching**

**As a** user who wants to collaborate with others,
**I want** to create a team workspace, see all the workspaces I belong to, and switch which one is active,
**So that** I can move between my personal library and shared team libraries without them mixing together.

**Acceptance Criteria:**

- [ ] `POST /api/v1/workspaces` — authenticated; body `{ name: string }` (1-120 chars); creates a new workspace with `is_personal: false`, `created_by` = requester, and inserts the requester as `owner` in `workspace_members`. Returns `201` with the created workspace. Does **not** automatically activate it — the client calls `.../activate` separately (keeps the two actions independently testable and lets a future "create without switching" use case exist without a new endpoint)
- [ ] `GET /api/v1/workspaces` — authenticated; returns every workspace the requester is a member of, each with their own `role` and `is_personal` flag, personal workspace first then the rest ordered by `created_at`
- [ ] `PATCH /api/v1/workspaces/[id]` — requires `owner` role; body `{ name: string }`; returns `403` if `is_personal` (name is fixed to the username, matching how a personal account can't be "renamed" as a workspace)
- [ ] `DELETE /api/v1/workspaces/[id]` — requires `owner` role; soft-deletes (`deleted_at`); returns `403` if `is_personal`; a deleted workspace's documents become unreachable via any workspace-scoped route (covered more thoroughly by US-31) but are not themselves deleted
- [ ] `POST /api/v1/workspaces/[id]/activate` — requires `viewer` role (any membership); sets `req.user`'s `active_workspace_id` to this workspace; returns `200` with the now-active workspace. Returns `404` if the workspace doesn't exist, is deleted, or the requester isn't a member (same response for all three — don't leak which workspaces exist)
- [ ] `GET /api/v1/sessions` (existing endpoint backing `useAuth()`) is extended to include `active_workspace_id` on the returned user object, so the frontend knows the active workspace on every page load without an extra request
- [ ] All five endpoints follow the existing `createRouter`/`authMiddleware` pattern used by every other `pages/api/v1/` route
- [ ] Integration tests cover: create + appears in the list with `owner` role; a second user does NOT see a workspace they weren't invited to; rename/delete both 403 for a non-owner and for `is_personal`; activate switches `active_workspace_id` and a subsequent `GET /api/v1/sessions` reflects it; activate 404s for a workspace the user isn't a member of (including one that exists but belongs to someone else — not just a nonexistent id)

**Technical Context:**

- Relevant files:
  - `pages/api/v1/workspaces/index.ts` _(create — `POST`/`GET`)_
  - `pages/api/v1/workspaces/[id]/index.ts` _(create — `PATCH`/`DELETE`)_
  - `pages/api/v1/workspaces/[id]/activate/index.ts` _(create — `POST`)_
  - `pages/api/v1/sessions/index.ts` _(modify — include `active_workspace_id` in the response shape)_
  - `models/workspace.ts` _(create — `create`, `findAllByUserId`, `updateById`, `deleteById`, `activate`; this is also where the `requireRole()` helper from the design doc lives, even though this story's own endpoints only need `viewer`/`owner` checks — US-30/US-31 depend on it existing here)_
  - `infra/schemas.ts` _(add `workspaceCreateSchema`/`workspaceUpdateSchema`, name length validation)_
- Depends on: US-28 (needs `workspaces`/`workspace_members` tables and `users.active_workspace_id` to exist).
- No frontend in this story — API only. US-33 builds the switcher UI on top of these endpoints.

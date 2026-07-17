# US-30 — Member Invitation & Role Management

---

**User Story: Member Invitation & Role Management**

**As a** workspace owner,
**I want** to invite teammates by email, see who's in the workspace, change their role, or remove them,
**So that** I control who can see and edit our shared documents, without needing an email-invite/accept flow to get started.

**Acceptance Criteria:**

- [ ] `GET /api/v1/workspaces/[id]/members` — requires `viewer` role; returns every member's `user_id`, `username`, `email`, `role`, `created_at` (when they joined)
- [ ] `POST /api/v1/workspaces/[id]/members` — requires `owner` role; body `{ email: string, role: "editor" | "viewer" }` (an invite can't directly grant `owner` — see role-change below); looks up a user by that email (case-insensitive, same `LOWER()` convention as the rest of the codebase); returns `404` with a clear message if no account exists with that email ("Nenhuma conta encontrada com esse email. A pessoa precisa se cadastrar no Papershare antes de ser convidada."); returns `409` if already a member; on success, inserts the `workspace_members` row and returns `201`
- [ ] `PATCH /api/v1/workspaces/[id]/members/[userId]` — requires `owner` role; body `{ role: "owner" | "editor" | "viewer" }`; returns `403` if this change would demote the workspace's last remaining `owner` (must check count of `owner` rows excluding this change, not just excluding this row, since the request could be a no-op role reassignment)
- [ ] `DELETE /api/v1/workspaces/[id]/members/[userId]` — two cases in one endpoint: (1) an `owner` removing someone else — requires `owner` role, same last-owner protection as the role-change above; (2) a member removing **themselves** (`userId === req.user.id`) — allowed at any role including `viewer`, i.e. "leave workspace," but still blocked if they're the last `owner` (must transfer ownership or delete the workspace first) and always blocked on `is_personal` workspaces (can't leave your own personal workspace)
- [ ] All membership mutations on `is_personal` workspaces return `403` — no inviting, removing, or role-changing on a personal workspace, since it only ever has one member (the account owner) by construction
- [ ] Integration tests cover: invite by email succeeds and the member appears in `GET .../members`; invite for a nonexistent email 404s with the specific message; invite for an already-member email 409s; a non-owner attempting any mutation gets `403`; demoting the sole owner 403s; a second owner can be demoted successfully (not the last one); a `viewer` can remove themselves (leave); the last owner attempting to leave 403s; any membership mutation on a personal workspace 403s regardless of who's asking

**Technical Context:**

- Relevant files:
  - `pages/api/v1/workspaces/[id]/members/index.ts` _(create — `GET`/`POST`)_
  - `pages/api/v1/workspaces/[id]/members/[userId]/index.ts` _(create — `PATCH`/`DELETE`)_
  - `models/workspace.ts` _(add `listMembers`, `inviteMember`, `updateMemberRole`, `removeMember` — all built on the `requireRole()` helper introduced in US-29; the last-owner check is a `SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1 AND role = 'owner'` guard shared by both `updateMemberRole` and `removeMember`)_
  - `models/user.ts` _(reuse the existing `findOneByEmail` — no new user lookup needed)_
  - `infra/schemas.ts` _(add `workspaceMemberInviteSchema`/`workspaceMemberRoleUpdateSchema`)_
- Depends on: US-28 (tables), US-29 (`models/workspace.ts#requireRole()` and the module it lives in).
- No frontend in this story — US-33 builds the "Equipe" settings tab on top of these endpoints.

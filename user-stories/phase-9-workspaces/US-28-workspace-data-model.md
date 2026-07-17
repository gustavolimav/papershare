# US-28 — Workspace Data Model & Migration

---

**User Story: Workspace Data Model & Migration**

**As a** developer building the rest of Phase 9,
**I want** `workspaces`/`workspace_members` tables and every existing document to belong to a workspace,
**So that** every later story (invites, roles, shared libraries) has a foundation to build on, and no existing document/account becomes unreachable during the transition.

**Acceptance Criteria:**

- [ ] Migration `024-create-workspaces.sql`: `workspaces` table — `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `name VARCHAR(120) NOT NULL`, `created_by UUID NOT NULL REFERENCES users(id)`, `is_personal BOOLEAN NOT NULL DEFAULT false`, `created_at`/`updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`, `deleted_at TIMESTAMPTZ`
- [ ] Migration `025-create-workspace-members.sql`: `workspace_members` table — `workspace_id UUID NOT NULL REFERENCES workspaces(id)`, `user_id UUID NOT NULL REFERENCES users(id)`, `role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer'))`, `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`, composite `PRIMARY KEY (workspace_id, user_id)`
- [ ] Migration `026-add-workspace-id-to-documents.sql`: adds `documents.workspace_id UUID REFERENCES workspaces(id)` (nullable), then **backfills**: for every existing row in `users`, insert one personal workspace (`name` = the user's username, `is_personal = true`, `created_by` = that user), insert a matching `owner` row in `workspace_members`, and `UPDATE documents SET workspace_id = <that user's personal workspace id> WHERE user_id = <that user's id>`. **Stays nullable in this story** — `models/document.ts#create()` doesn't populate `workspace_id` on new inserts until US-31 rewires document authorization, so applying `NOT NULL` here would break every document upload in the gap between this story and US-31 landing (caught via manual verification: `POST /api/v1/documents` 503'd on a `null value in column "workspace_id"` constraint violation before this was corrected). US-31 applies the `NOT NULL` constraint, in a new migration, once `create()` supplies the column on every insert. `documents.user_id` is untouched (kept as the "uploaded by" audit field, no longer used for authorization after US-31)
- [ ] Migration `027-add-active-workspace-id-to-users.sql`: adds `users.active_workspace_id UUID REFERENCES workspaces(id)` (nullable), and backfills every existing user's `active_workspace_id` to their own personal workspace (same one created in `026`)
- [ ] Against an empty database (the state `orchestrator.cleanDatabase()` leaves before every test run), all four migrations apply cleanly with zero rows backfilled — the `INSERT ... SELECT FROM users` and `UPDATE documents ...` backfill steps are no-ops when `users` is empty
- [ ] `models/user.ts#create()` (registration) is updated to create a personal workspace + owner membership + set `active_workspace_id` for every **newly** registered user going forward, mirroring what the migration does for existing ones — a fresh `npm run dev` + register flow ends with the new user already having an active personal workspace, not just users created before this migration existed
- [ ] `types/index.ts` gains `Workspace`, `WorkspaceMember`, `WorkspaceRole` (`"owner" | "editor" | "viewer"`) interfaces
- [ ] Integration test confirms: registering a new user creates exactly one workspace (`is_personal: true`), one `workspace_members` row (`role: "owner"`), and the user's `active_workspace_id` points at it
- [ ] Integration test confirms: running the full migration suite from empty, then manually inserting a `users` row via `orchestrator.createUser()` and re-running `runPendingMigrations()`, does not error and does not retroactively backfill a workspace for that user (the migration-level backfill only ever runs once, at migration time — the registration-time code path above is what covers users created afterward)

**Technical Context:**

- Relevant files:
  - `infra/migrations/024-create-workspaces.sql`, `025-create-workspace-members.sql`, `026-add-workspace-id-to-documents.sql`, `027-add-active-workspace-id-to-users.sql` _(create)_
  - `models/user.ts#create()` _(modify — after inserting the user row, also insert their personal workspace, owner membership, and set `active_workspace_id`, in the same spirit as the existing single-purpose `create()` but now doing three inserts instead of one; consider whether this needs to be transactional — a user with no personal workspace is a broken state, so yes)_
  - `types/index.ts` _(add `Workspace`, `WorkspaceMember`, `WorkspaceRole`)_
- This is the first migration in the project that writes data, not just schema — every prior migration (`001` through `023`) has been pure DDL. Flagged explicitly since it's a new pattern for this codebase.
- No API or UI surface in this story — it's purely foundational. US-29/US-30/US-31 build the endpoints and authorization logic on top of what this creates.
- Dependencies: none — this is the first story in the phase, everything else in Phase 9 depends on it.

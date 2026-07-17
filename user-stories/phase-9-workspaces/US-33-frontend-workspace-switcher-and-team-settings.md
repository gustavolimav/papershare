# US-33 — Frontend: Workspace Switcher & Team Settings

---

**User Story: Frontend: Workspace Switcher & Team Settings**

**As a** user,
**I want** to switch between my workspaces from anywhere in the app and manage a team's membership from Settings,
**So that** everything built in US-28 through US-32 is actually usable, not just an API.

**Acceptance Criteria:**

- [ ] New `useWorkspaces()` SWR hook (`lib/useWorkspaces.ts`) wraps `GET /api/v1/workspaces`, returning the list plus a derived `activeWorkspace` (matched against the session's `active_workspace_id` from `useAuth()`)
- [ ] `components/layout/Header.tsx` gains a workspace switcher: shows the active workspace's name, opens a dropdown listing every workspace the user belongs to (personal one first, labeled distinctly e.g. "Pessoal"); selecting a different one calls `POST /api/v1/workspaces/[id]/activate` then revalidates (`mutate`) every workspace-scoped SWR key so the current page's content refreshes without a full reload
- [ ] The switcher dropdown includes a "+ Criar workspace" entry opening a small modal (name field only, reusing the existing `Dialog` pattern from `CreateShareLinkModal.tsx`) — on submit, `POST /api/v1/workspaces` then immediately `.../activate`s the new one so the user lands in it right away
- [ ] New "Equipe" tab in `/settings` (same pattern as Phase 8's "IA" tab): for the active workspace, if it's `is_personal`, shows an explanatory message + a "Criar workspace" button (reusing the modal above) instead of a member list; otherwise shows the member list (`GET .../members`) with each member's name/email/role
- [ ] Within the "Equipe" tab, if the current user's role in the active workspace is `owner`: an invite form (email + role select), a role dropdown per member (disabled for the last remaining owner — mirrors the backend guardrail, don't let the user submit a request that's going to 403), and a remove button per member (also disabled for the last owner)
- [ ] Within the "Equipe" tab, if the current user's role is `editor`/`viewer` (not `owner`): the member list is read-only, plus a "Sair do workspace" button (hidden entirely if this user is the workspace's last `owner` — though a non-owner viewing this tab never hits that case)
- [ ] `components/documents/DocumentCard.tsx` shows a small "Enviado por {nome}" line when the active workspace's member count is greater than 1 (available from the already-fetched member list, or a lighter `member_count` field added to the workspace object to avoid an extra fetch just for this) — hidden entirely for a personal workspace or a team workspace where this is the only visible document uploader
- [ ] All new UI strings follow the existing pt-BR convention used throughout the app
- [ ] Manual browser verification: create a second test user, create a team workspace as user A, invite user B as `editor`, confirm B sees the shared workspace in their switcher, uploads a document as B, confirms A sees it with "Enviado por B" in their own dashboard, confirms a `viewer`-role user sees the document but no upload/edit affordances

**Technical Context:**

- Relevant files:
  - `lib/useWorkspaces.ts` _(create)_
  - `components/layout/Header.tsx` _(modify — add the switcher)_
  - `components/workspaces/CreateWorkspaceModal.tsx` _(create)_
  - `components/workspaces/TeamSettingsForm.tsx` _(create — the "Equipe" tab content)_
  - `app/settings/page.tsx` _(modify — add the "Equipe" section, same insertion pattern as Phase 8's "IA" section)_
  - `components/documents/DocumentCard.tsx` _(modify — conditional "Enviado por" line)_
  - `types/index.ts` _(add `WorkspaceMemberResponse`, extend `Workspace` with whatever list-response fields the frontend needs — coordinate with what US-29/US-30/US-32 already defined rather than duplicating)_
- Depends on: US-29 (workspace CRUD/activate endpoints), US-30 (member management endpoints), US-31 (documents actually reflect workspace membership, so there's something real to show), US-32 (so AI features on shared documents don't silently vanish for non-creator members — verify this while testing this story, even though the fix itself lives in US-32).
- This is the last story in the phase — by the time it's done, "workspace básico" as scoped is complete and Phase 9's first slice can close, per `TODO.md`.

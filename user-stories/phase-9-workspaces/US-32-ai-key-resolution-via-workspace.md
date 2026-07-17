# US-32 — AI Features Resolve the Workspace's Key, Not the Uploader's

---

**User Story: AI Features Resolve the Workspace's Key, Not the Uploader's**

**As a** member of a shared workspace using an AI feature on a teammate's document,
**I want** the feature to work based on the workspace's configured AI key,
**So that** AI summaries/chat/insights/follow-ups on shared documents don't silently break just because I personally never pasted a key into Settings — the workspace's owner already did.

**Acceptance Criteria:**

- [ ] `models/document.ts#getOwnerId` (the function all 4 AI model callers use to resolve whose key to use) is replaced by resolving the document's `workspace_id`, then that workspace's `created_by` — i.e., "whoever created this workspace" is the key holder, regardless of who uploaded the specific document or who's currently using the AI feature
- [ ] For a personal workspace, this is a no-op behavior change: `created_by` is the same single user who owns every document in it, identical to today's `getOwnerId()` result — this is the regression-safety property to verify first
- [ ] For a team workspace, a document uploaded by a non-`created_by` member still resolves AI features against the workspace creator's key, not the uploader's own key (even if the uploader has their own key configured — the workspace's, not the acting user's, is authoritative, matching the design decision that a workspace has one AI identity)
- [ ] All 4 existing AI call sites are updated to the new resolution: `models/summarizer.ts`, `models/chat.ts`, `models/analyticsInsights.ts`, `models/followupEmail.ts` — each currently calls `document.getOwnerId(documentId)` then `user.getAiApiKey(ownerId)`; this becomes resolving the workspace first (new `models/workspace.ts#getWorkspaceIdForDocument` or reusing whatever the document lookup already returns) then `user.getAiApiKey(workspace.created_by)`
- [ ] The frontend's `lib/useAiKeyConfigured.ts` hook (Phase 8's hide-when-unconfigured feature) is updated to check the **active workspace's** configuration status, not the logged-in user's own — a `viewer` in a team workspace whose creator has a key configured should still see the AI features (summary card, chat toggle, etc.), even though that viewer never configured anything themselves. Requires the workspace's "has AI key" boolean to be exposed somewhere the frontend can read it (e.g. included in the `GET /api/v1/workspaces` list response, alongside each workspace's `role`) — the boolean-only pattern from Phase 8 (`{ configured: boolean }`, never the key itself) is preserved, just scoped to the workspace's creator instead of the requester
- [ ] `ai_chat_available` on the public share response (`models/shareLink.ts`) is updated the same way — it already resolves through the document's owner today; it now needs to resolve through the document's workspace's `created_by` instead
- [ ] Integration tests cover: AI feature works on a document in a personal workspace exactly as before (regression); AI feature on a shared-workspace document uses the workspace creator's key even when triggered by a different member; a member with their own personal AI key configured does NOT have it used for a shared-workspace document (workspace's key wins); `ai_chat_available` on a public share link reflects the workspace creator's configuration state

**Technical Context:**

- Relevant files:
  - `models/document.ts` _(modify or remove `getOwnerId` — replaced by a workspace-based lookup, likely added to `models/workspace.ts` instead since "resolve a document's workspace's creator" is workspace domain logic, not document domain logic)_
  - `models/summarizer.ts`, `models/chat.ts`, `models/analyticsInsights.ts`, `models/followupEmail.ts` _(modify — swap the key-resolution call)_
  - `models/shareLink.ts` _(modify — `ai_chat_available` computation)_
  - `pages/api/v1/workspaces/index.ts` _(modify — `GET` response gains a per-workspace `ai_configured: boolean`, computed the same way Phase 8's `ai-key` endpoint does, joined off `created_by`)_
  - `lib/useAiKeyConfigured.ts` _(modify — read from the active workspace entry in the `useWorkspaces()` list instead of the user's own `/api/v1/users/[username]/ai-key`)_
  - `types/index.ts` _(the `Workspace` interface from US-28 gains `ai_configured: boolean` on the list-response shape)_
- Depends on: US-28 (`workspace_id` on documents), US-31 (documents resolve their workspace consistently — this story reuses that resolution rather than re-deriving it), and Phase 8's existing AI infrastructure (`infra/ai.ts`, `models/user.ts#getAiApiKey`) which is unchanged by this story — only what gets passed into `getAiApiKey()` changes.
- This story deliberately does **not** change `GET/PUT/DELETE /api/v1/users/[username]/ai-key` (Phase 8's per-user key management) — a user's own key is still theirs to manage in Settings; what changes is which user's key gets _read_ when a shared document needs one.

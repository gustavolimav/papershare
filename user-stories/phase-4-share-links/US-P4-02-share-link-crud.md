# US-P4-02 — Share Link CRUD Endpoints

---

**User Story: Share Link CRUD**

**As an** authenticated document owner,
**I want to** create, list, update, and revoke share links for my documents,
**So that** I can control exactly how each document is shared and with whom.

**Acceptance Criteria:**

**Create link — `POST /api/v1/documents/[id]/links`:**
- [ ] Requires authentication and document ownership
- [ ] Accepts optional JSON body: `{ label?, password?, expires_at?, allow_download? }`
- [ ] If `password` is provided, it is hashed with bcrypt (using `models/password.ts → hash()`) before storage — the plaintext is never saved
- [ ] Returns `201` with `ShareLinkResponse` (no `password_hash`; includes `has_password: true/false`)
- [ ] Returns `404` if the document does not exist or is soft-deleted
- [ ] Returns `403` if the authenticated user does not own the document

**List links — `GET /api/v1/documents/[id]/links`:**
- [ ] Requires authentication and document ownership
- [ ] Returns all share links for the document ordered by `created_at DESC`
- [ ] Each link is returned as `ShareLinkResponse` (no `password_hash`)

**Update link — `PATCH /api/v1/documents/[id]/links/[linkId]`:**
- [ ] Requires authentication and document ownership
- [ ] Accepts optional fields: `label`, `password`, `expires_at`, `allow_download`, `is_active` — at least one required
- [ ] If `password` is provided in the update body, it replaces the old hash
- [ ] Returns the updated `ShareLinkResponse`
- [ ] Returns `404` if the link does not exist under the given document

**Revoke link — `DELETE /api/v1/documents/[id]/links/[linkId]`:**
- [ ] Requires authentication and document ownership
- [ ] Sets `is_active = FALSE` (soft revoke — the row is never hard-deleted)
- [ ] Returns the updated `ShareLinkResponse` with `is_active: false`
- [ ] Integration tests cover all operations and error cases (wrong owner, missing link, etc.)

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/[id]/links/index.ts` *(GET list + POST create)*
  - `pages/api/v1/documents/[id]/links/[linkId]/index.ts` *(PATCH + DELETE)*
  - `models/shareLink.ts` *(`create()`, `findAllByDocumentId()`, `findOneById()`, `updateById()`, `deleteById()`)*
  - `infra/schemas.ts` *(add `shareLinkCreateSchema`, `shareLinkUpdateSchema`)*
  - `tests/integration/api/v1/documents/[id]/links/`
- Ownership check flow in `create()`: first verify `document.user_id === userId` by calling `models/document.findOneById(documentId, userId)` — this throws `ForbiddenError` automatically if not the owner
- `updateById()` must use a dynamic query builder since all fields are optional — build the `SET` clause from the provided keys only
- The `deleteById()` method name is "delete" but performs a soft revoke (`is_active = FALSE`), NOT a hard delete — name it `revokeById()` in the model for clarity if not already done
- `linkId` in the URL path is the `id` column (UUID), not the public `token`
- Dependencies / considerations:
  - Requires US-P4-01 (share_links table) and US-P3-04 (documents CRUD, ownership pattern)
  - Apply `authMiddleware` to all routes

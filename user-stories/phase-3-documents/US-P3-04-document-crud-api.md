# US-P3-04 — Document CRUD API Endpoints

---

**User Story: Document CRUD API**

**As an** authenticated document owner,
**I want** full CRUD access to my documents through a REST API,
**So that** I can list, retrieve, update, and delete my documents programmatically.

**Acceptance Criteria:**

**List documents — `GET /api/v1/documents`:**
- [ ] Requires authentication
- [ ] Returns only the authenticated user's non-deleted documents
- [ ] Supports pagination via `page` and `per_page` query params (defaults: page=1, per_page=10, max per_page=100)
- [ ] Response includes `{ documents: DocumentResponse[], total: number }`
- [ ] Results are ordered by `created_at DESC`

**Get document — `GET /api/v1/documents/[id]`:**
- [ ] Requires authentication
- [ ] Returns `404` if document does not exist or is soft-deleted
- [ ] Returns `403` if the document belongs to a different user
- [ ] Returns the full `DocumentResponse` on success

**Update document — `PATCH /api/v1/documents/[id]`:**
- [ ] Requires authentication and ownership
- [ ] Accepts optional `title` and/or `description` — at least one must be provided
- [ ] Returns `400` if neither field is supplied
- [ ] Returns the updated `DocumentResponse` on success
- [ ] Does NOT allow changing `mime_type`, `storage_key`, `size_bytes`, `page_count`, or `user_id`

**Delete document — `DELETE /api/v1/documents/[id]`:**
- [ ] Requires authentication and ownership
- [ ] Performs a soft-delete: sets `deleted_at = NOW()` on the `documents` row
- [ ] Returns the `storage_key` so the caller can clean up the stored file
- [ ] After deletion, subsequent `GET /api/v1/documents/[id]` returns `404`
- [ ] Integration tests cover all endpoints and error cases

**Technical Context:**

- Relevant files:
  - `pages/api/v1/documents/index.ts` *(GET list + POST upload — already has upload from US-P3-03)*
  - `pages/api/v1/documents/[id]/index.ts` *(GET, PATCH, DELETE single document)*
  - `models/document.ts` *(add `findAllByUserId()`, `findOneById()`, `updateById()`, `deleteById()`)*
  - `infra/schemas.ts` *(add `documentUpdateSchema` — at least one of title/description required)*
  - `tests/integration/api/v1/documents/index.test.ts`
  - `tests/integration/api/v1/documents/[id]/index.test.ts`
- All model methods take `userId` as a parameter and enforce ownership — the model, not the handler, is responsible for returning `ForbiddenError`
- `findOneById(id, userId)` should check: document exists AND `deleted_at IS NULL` AND `user_id = userId`; returns `NotFoundError` if not found, `ForbiddenError` if exists but owned by someone else
- `updateById()` uses `COALESCE` to merge new values with existing: `title = COALESCE($1, title)` — allows partial updates without overwriting unchanged fields
- `deleteById()` returns the `storage_key` so the route handler can call `storage.deleteFile(key)` to clean up the physical file
- Dependencies / considerations:
  - Requires US-P3-01 (table), US-P3-02 (storage adapter), US-P3-03 (upload)
  - `authMiddleware` from `infra/auth.ts` must be applied to all routes via `router.use(authMiddleware)`
  - Use `createRouter` from `next-connect` with `onError: onErrorHandler` and `onNoMatch: onNoMatchHandler`

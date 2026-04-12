# US-P4-03 — Public Share Endpoint

---

**User Story: Public Share Endpoint**

**As a** document recipient,
**I want to** access a shared document using only a share token (and password if required),
**So that** I can view the document without needing a Papershare account.

**Acceptance Criteria:**

- [ ] A public endpoint `GET /api/v1/share/[token]` exists (no authentication required)
- [ ] Returns `404 NotFoundError` if the token does not match any share link
- [ ] Returns `403 ForbiddenError` with message "Este link foi revogado." if `is_active = FALSE`
- [ ] Returns `403 ForbiddenError` with message "Este link expirou." if `expires_at` is set and is in the past
- [ ] If the link has a password (`password_hash` is non-null):
  - [ ] Requires a `password` query param or `X-Share-Password` header
  - [ ] Returns `403 ForbiddenError` with message "Senha incorreta." if missing or wrong
  - [ ] Compares the provided password using `models/password.ts → compare()` (bcrypt)
- [ ] Returns `404` if the linked document has been soft-deleted (`deleted_at IS NOT NULL`)
- [ ] On success, returns `200` with `ShareLinkWithDocument`:
  - The share link metadata (excluding `password_hash`): `{ id, token, label, expires_at, allow_download, is_active, created_at }`
  - Embedded document metadata: `{ id, title, description, mime_type, size_bytes, page_count }`
  - `has_password: boolean`
- [ ] Integration tests cover: valid token, revoked link, expired link, wrong password, missing password, deleted document, non-existent token

**Technical Context:**

- Relevant files:
  - `pages/api/v1/share/[token].ts` *(create — public route, no authMiddleware)*
  - `models/shareLink.ts` *(add `getByToken(token, password?)` method)*
  - `types/index.ts` *(add `ShareLinkWithDocument` interface)*
  - `tests/integration/api/v1/share/[token].test.ts` *(create)*
- The `getByToken()` model method performs all validation in order:
  1. Query by token (JOIN documents) — throw `NotFoundError` if not found
  2. Check `is_active` — throw `ForbiddenError` if false
  3. Check `expires_at` — throw `ForbiddenError` if past
  4. Check `password_hash` — if set, verify provided password; throw `ForbiddenError` if wrong/missing
  5. Check `document.deleted_at` — throw `NotFoundError` if deleted
  6. Return combined link + document data
- The SQL query should JOIN `share_links` to `documents` in a single query rather than two separate lookups
- Password can be passed as query param (`?password=...`) or header — check both; prefer the header for security (query params appear in server logs)
- **No authMiddleware** on this route — it must be fully public
- Dependencies / considerations:
  - Requires US-P4-01 (table), US-P4-02 (links CRUD provides test fixtures)
  - The `password_hash` must NEVER appear in the response — strip it in the model before returning

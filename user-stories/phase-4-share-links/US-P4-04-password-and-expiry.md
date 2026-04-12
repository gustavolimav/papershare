# US-P4-04 — Password Protection & Expiry Enforcement

---

**User Story: Password Protection & Expiry**

**As a** document owner,
**I want to** protect my share links with an optional password and/or expiration date,
**So that** I can control who can access my documents and for how long.

**Acceptance Criteria:**

**Password protection:**
- [ ] When creating a share link with a `password` field, the password is hashed using bcrypt via `models/password.ts → hash()` before being stored in `password_hash`
- [ ] The plaintext password is never logged or stored
- [ ] When updating a link with a new `password`, the old hash is replaced with the new hash
- [ ] To remove password protection, passing `password: null` in a PATCH sets `password_hash = NULL`
- [ ] The `has_password` field in `ShareLinkResponse` is derived as `password_hash IS NOT NULL`

**Expiry enforcement:**
- [ ] When creating or updating a share link with `expires_at`, the value must be a future timestamp; passing a past date returns `400 ValidationError`: "A data de expiração deve ser futura."
- [ ] The public endpoint (`GET /api/v1/share/[token]`) compares `expires_at` against `NOW()` at request time — not at link creation time
- [ ] Expired links return `403` (not `404`) so owners can diagnose expiry issues
- [ ] To remove expiry, passing `expires_at: null` in a PATCH sets the column to NULL (link never expires)

**Download flag:**
- [ ] `allow_download` defaults to `TRUE` on creation
- [ ] Can be set to `FALSE` via create or update body
- [ ] The public endpoint returns `allow_download` in the response; the frontend uses this to suppress the download button

**Integration tests:**
- [ ] Test: create link with password → access without password → 403
- [ ] Test: create link with password → access with correct password → 200
- [ ] Test: create link with password → access with wrong password → 403
- [ ] Test: create link with `expires_at` in the past → 400
- [ ] Test: create link with `expires_at` in the future → access before expiry → 200
- [ ] Test: access link after expiry timestamp passes → 403
- [ ] Test: PATCH to set `password: null` → subsequent access without password → 200
- [ ] Test: PATCH to set `allow_download: false` → response contains `allow_download: false`

**Technical Context:**

- Relevant files:
  - `models/shareLink.ts` *(`create()` and `updateById()` — password hashing logic)*
  - `infra/schemas.ts` *(add future-date validation to `shareLinkCreateSchema` and `shareLinkUpdateSchema`)*
  - `models/password.ts` *(existing — `hash()` and `compare()` already implemented)*
  - `tests/integration/api/v1/documents/[id]/links/[linkId]/index.test.ts`
  - `tests/integration/api/v1/share/[token].test.ts`
- Future-date validation in Zod: `expires_at: z.string().datetime().refine(v => new Date(v) > new Date(), { message: "A data de expiração deve ser futura." }).optional()`
- The bcrypt compare in `getByToken()` uses `models/password.ts → compare(providedPassword, storedHash)`
- `allow_download: false` is a UI-level restriction: the public endpoint still returns the document metadata; it is up to the viewer (US-11) to not show a download button. The API does not block file streaming based on this flag (that is a separate concern).
- Dependencies / considerations:
  - Requires US-P4-01 (table), US-P4-02 (CRUD endpoints), US-P4-03 (public endpoint)
  - This story focuses on the security behaviour cross-cutting the CRUD and public endpoints — it can be implemented alongside US-P4-02 and US-P4-03 or as a final integration pass

# US-02 — View Event Recording Endpoint

---

**User Story: View Event Recording**

**As a** document viewer accessing a shared link,
**I want** my viewing session to be recorded automatically when I open a shared document,
**So that** the document owner can see real engagement data (who viewed, when, how long, how many pages).

**Acceptance Criteria:**

- [ ] A new public endpoint `POST /api/v1/share/[token]/view` exists (no authentication required)
- [ ] The endpoint accepts a JSON body with optional fields: `viewer_fingerprint`, `time_on_page`, `pages_viewed`
- [ ] The endpoint extracts `ip_address` from the request headers (`x-forwarded-for` or `socket.remoteAddress`)
- [ ] The endpoint extracts `user_agent` from the `User-Agent` request header
- [ ] The endpoint validates the share link token before recording (returns 404 if link does not exist, 403 if expired or inactive)
- [ ] A row is inserted into `link_views` with all collected fields
- [ ] The endpoint returns `201` with the created `LinkView` object on success
- [ ] `viewer_fingerprint` is stored as-is (the client is responsible for hashing before sending)
- [ ] If `viewer_fingerprint` or `pages_viewed` are absent, the row is still inserted with `NULL` for those fields
- [ ] A `linkView` model exists in `models/linkView.ts` with a `recordView()` method
- [ ] Integration test file exists at `tests/integration/api/v1/share/[token]/view/post.test.ts` covering:
  - [ ] 201 on valid token with full body
  - [ ] 201 on valid token with empty body (all optional fields absent)
  - [ ] 404 on non-existent token
  - [ ] 403 on expired share link
  - [ ] 403 on inactive (revoked) share link

**Technical Context:**

- Relevant files:
  - `pages/api/v1/share/[token]/view.ts` *(create)* — thin route handler
  - `models/linkView.ts` *(create)* — `recordView(token, input)` business logic
  - `types/index.ts` *(already updated in US-01 with `LinkViewCreateInput`)*
  - `infra/schemas.ts` *(add `linkViewCreateSchema` for optional body fields)*
  - `tests/integration/api/v1/share/[token]/view/post.test.ts` *(create)*
- The token validation logic already exists in `models/shareLink.ts → getByToken()` — reuse it here, but note that `getByToken()` currently also checks the password. The view recording should NOT require a password (it is recorded after the viewer has already authenticated with the password on the viewer page). Consider adding a separate `validateToken()` helper that only checks existence/active/expiry, or pass a flag to `getByToken()`.
- Architecture rule: business logic (IP extraction, token validation, DB insert) belongs in `models/linkView.ts`, not in the page handler
- Country code resolution (from IP) is out of scope for this story — leave the `country_code` column as `NULL` for now
- No authentication middleware on this route (public endpoint)
- Error messages must be in Portuguese (pt-BR) per project convention
- Dependencies / considerations:
  - Requires US-01 (link_views table) to be merged first
  - Rate limiting on this endpoint is not required for MVP but should be noted as a future concern

# US-24 — Move Migration Endpoint Behind Admin Auth

---

**User Story: Protect Migration Endpoint**

**As a** platform operator,
**I want** the migration runner endpoint to be protected by a secret token,
**So that** arbitrary users or bots cannot trigger database migrations in production.

**Acceptance Criteria:**

- [ ] The `POST /api/v1/migrations` endpoint requires a `MIGRATIONS_SECRET` header (or `Authorization: Bearer <token>`) matching an environment variable `MIGRATIONS_SECRET`
- [ ] Requests without the header, or with an incorrect token, receive `401 Unauthorized`
- [ ] The `GET /api/v1/migrations` (list pending) endpoint is also protected by the same secret
- [ ] `MIGRATIONS_SECRET` is added to `.env.example` with a note that it must be set in production
- [ ] If `MIGRATIONS_SECRET` is not set in the environment, the endpoint returns 503 with message: "Migration endpoint is not configured."
- [ ] Integration tests cover:
  - [ ] 401 when no token provided
  - [ ] 401 when wrong token provided
  - [ ] 200/201 when correct token provided
- [ ] In the test environment, `MIGRATIONS_SECRET` is set to a known test value via the test config

**Technical Context:**

- Relevant files:
  - `pages/api/v1/migrations/index.ts` *(update — add token check middleware)*
  - `infra/env.ts` *(if US-21 is done, add optional `MIGRATIONS_SECRET` variable)*
  - `.env.example` *(add `MIGRATIONS_SECRET`)*
  - `tests/integration/api/v1/migrations/*.test.ts` *(update to pass correct token)*
- Implementation: create a simple `adminAuthMiddleware` in `infra/auth.ts` (alongside the existing `authMiddleware`):
  ```ts
  export function adminAuthMiddleware(req, res, next) {
    const token = req.headers['x-migrations-secret'] || req.headers.authorization?.replace('Bearer ', '');
    if (!token || token !== process.env.MIGRATIONS_SECRET) {
      throw new UnathorizedError('Token de admin inválido.');
    }
    next();
  }
  ```
- This is NOT the same as the session-based `authMiddleware` — it's a simpler static token check
- Dependencies / considerations:
  - This is a security fix — should be prioritized for any production deployment
  - The migration endpoint is currently used in `npm run migrations:up` (server-side script) — confirm it doesn't call the HTTP endpoint but uses `models/migrator.ts` directly; if so, the HTTP endpoint is only for manual/admin use via HTTP
  - If US-21 is merged first, validate `MIGRATIONS_SECRET` presence in `infra/env.ts` as an optional variable

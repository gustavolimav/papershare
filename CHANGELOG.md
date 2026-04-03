# Changelog

All notable changes to Papershare are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- `POST /api/v1/documents` — upload document (multipart/form-data); validates file type (PDF, DOCX, PPTX) and size (50 MB default); extracts PDF page count
- `GET /api/v1/documents` — list authenticated user's documents with pagination (`page`, `limit`)
- `GET /api/v1/documents/[id]` — get document metadata (403 if not owner)
- `PATCH /api/v1/documents/[id]` — update title/description (403 if not owner)
- `DELETE /api/v1/documents/[id]` — soft-delete document and remove from storage (403 if not owner)
- `models/document.ts` — full CRUD with ownership validation
- `infra/storage.ts` — local filesystem storage adapter (no-op in test env)
- Migration `005-create-documents.sql` — `documents` table
- `documentUpdateSchema` Zod schema and `ALLOWED_MIME_TYPES` / `MAX_FILE_SIZE_BYTES` constants in `infra/schemas.ts`

- Rate limiting middleware (`infra/rate-limit.ts`) — in-memory sliding window; 5 req/min on `POST /api/v1/sessions`, 10 req/min on `POST /api/v1/users`; returns `TooManyRequestsError` (429)
- `TooManyRequestsError` (429) error class in `infra/errors.ts`
- Zod input validation (`infra/schemas.ts`) on `POST /api/v1/users`, `PATCH /api/v1/users/[username]`, `POST /api/v1/sessions` — invalid input returns 400 `ValidationError`
- `session.deleteByUserId(userId)` — invalidates all sessions for a user; called on account deletion
- `DELETE /api/v1/users/[username]` — soft-delete own account (`deleted_at` column), returns 204; all sessions invalidated, deleted users are no longer findable
- `ForbiddenError` (403) error class in `infra/errors.ts`
- Authorization guard on `PATCH /api/v1/users/[username]` — returns 403 if authenticated user tries to update another user's profile
- Authorization guard on `DELETE /api/v1/users/[username]` — returns 403 if authenticated user tries to delete another user's account
- Migration `004-soft-delete-users.sql` — adds `deleted_at TIMESTAMPTZ` column to `users` table
- `user.deleteByUsername(username)` — sets `deleted_at` to now
- Database connection pool (`Pool` from pg) for all regular queries — `getNewClient()` still returns a dedicated `Client` for the migrator
- `DELETE /api/v1/sessions` — logout endpoint, deletes session from DB and clears `session_id` cookie, requires valid session
- Authentication middleware (`infra/auth.ts`) that validates `session_id` cookie on protected routes
- `session.findOneByToken(token)` — look up a session by its token
- `session.deleteByToken(token)` — delete a session (used on expiration cleanup)
- `GET /api/v1/users/[username]` and `PATCH /api/v1/users/[username]` now require a valid session
- Integration tests for all authentication middleware scenarios (no cookie, invalid token, expired session, valid session)
- Test helpers `orchestrator.createExpiredSession(userId)` and `orchestrator.sessionExists(token)`

---

## [0.2.0] — 2026-03-28

### Added

- `POST /api/v1/sessions` — login endpoint that creates a session and sets an HTTP-only `session_id` cookie (30-day expiration)
- `models/session.ts` with `create(userId)` and `EXPIRATION_IN_MILLISECONDS` constant
- `models/authentication.ts` — validates email/password credentials via `getAuthentication()`
- Migration `003-create-sessions.sql` — `sessions` table with UUID primary key, unique token, `user_id`, and `expires_at`
- Integration tests for the login flow (valid credentials, wrong password, unknown email)

### Changed

- Migrated database migration runner from custom implementation to `postgres-migrations` library
- Adjusted migration SQL files for compatibility with the new runner

---

## [0.1.0] — 2026-03-20

### Added

- Initial project setup with Next.js 14, TypeScript, and PostgreSQL
- Clean architecture layout: `pages/` (delivery), `models/` (domain), `infra/` (technical)
- `POST /api/v1/users` — user registration with unique username and email validation
- `GET /api/v1/users/[username]` — fetch user profile by username
- `PATCH /api/v1/users/[username]` — update user profile (username, email, password)
- `GET /api/v1/status` — health check endpoint with database version and connection info
- `GET /api/v1/migrations` — list pending migrations
- `POST /api/v1/migrations` — run pending migrations
- `models/user.ts` — user CRUD with case-insensitive lookups
- `models/password.ts` — bcryptjs hashing with pepper support
- `models/migrator.ts` — migration runner using `postgres-migrations`
- Migration `001-create-users.sql` — `users` table with UUID primary key
- Migration `002-update-users.sql` — UTC timestamps and adjusted password column length
- Custom error classes: `ValidationError` (400), `NotFoundError` (404), `UnathorizedError` (401), `InternalServerError` (500), `ServiceError` (503), `MethodNotAllowedError` (405)
- `infra/controller.ts` — global Next.js error handler middleware
- `infra/database.ts` — PostgreSQL client with environment-based configuration
- Docker Compose setup with PostgreSQL 16
- Jest integration test suite with `tests/orchestrator.ts` helpers
- ESLint, Prettier, Husky pre-commit hooks, and Commitlint
- GitHub Actions CI pipeline

# Changelog

All notable changes to Papershare are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed

- Vercel build warned `Node.js version 20.x is deprecated. Deployments created on or after 2026-10-01 will fail to build.` Bumped `package.json#engines`, `.nvmrc`, and both GitHub Actions workflows from Node 20 (`lts/iron`) to `24.x`, matching Vercel's own suggested fix, so local dev, CI, and Vercel all build on the same, still-supported major.
- `/documents/[id]/analytics` (the per-link/per-page analytics dashboard, including the page-view heatmap) was fully built and reachable by direct URL, but nothing in the UI linked to it — the document detail page had no way to navigate there. Added an "Analytics" button next to "Editar" in `components/documents/DocumentMeta.tsx`.
- Vercel build warned that `package.json`'s `"engines": { "node": ">=20.16.0" }` is open-ended, so it overrides the Project Settings dropdown ("22.x") and silently jumps to whatever the newest major Node release is (24.x at the time) instead — meaning a future Node major release could change the runtime under this app with no code change and no warning beyond a build log line. Bounded the range to `>=20.16.0 <21.0.0`, matching `.nvmrc` (`lts/iron`) and the GitHub Actions workflows, so the version actually used is explicit and stable across local dev, CI, and Vercel.

- CI (`Jest Ubuntu`) was failing on every document-upload-dependent test with "Unexpected token < in JSON": `@aws-sdk/client-s3` requires Node `>=20.0.0` and `pdf-parse`/`pdfjs-dist` require Node `>=20.16.0`, but CI and `.nvmrc` were pinned to `lts/hydrogen` (Node 18) — confirmed via `npm warn EBADENGINE` in the CI log. Bumped `.nvmrc` and both GitHub Actions workflows to `lts/iron` (Node 20), and added an `engines` field to `package.json` so this fails fast with a clear message instead of an obscure runtime crash next time.
- Public PDF viewer (`components/viewer/PDFViewer.tsx`) threw `TypeError: Object.defineProperty called on non-object` on every load, from inside `pdfjs-dist`'s own bundled module code. Confirmed via a native `<script type="module">` test that the unmodified `pdf.mjs` works fine in the same browser — the crash only happens when Next's webpack re-bundles the package's already-webpack-bundled `.mjs`, corrupting its internal export wiring. Fixed by loading both the library and its worker as real native ES modules straight from the jsdelivr CDN (`import(/* webpackIgnore: true */ ...)`), instead of importing the npm package.
- Vercel's production build (`next build`) failed with 26 real ESLint errors across the new frontend files (`'React' is not defined` / `no-undef`, `'x' is defined but never used` / `no-unused-vars`) that never showed up locally in `npm run sf`. Root cause: `.eslintrc.json` was missing `"root": true`, so ESLint's legacy config resolution walked up past the project into an ancestor directory, found another copy of the same plugin, and hard-aborted linting entirely — silently no-op'ing every local lint run without failing the command. Separately, `eslint:recommended`'s base `no-undef`/`no-unused-vars` (extended after `next/core-web-vitals`) were clobbering Next's TypeScript-aware versions of those rules, which don't understand type-only positions (e.g. a named parameter in a function _type_ signature, or a bare `React.FormEvent` type reference) and flag them as real undefined/unused variables. Fixed by adding `"root": true` and an override enabling `@typescript-eslint/no-unused-vars` (and disabling the base rules) for `*.ts`/`*.tsx` files — the standard fix recommended by typescript-eslint for this exact class of false positive.
- `GET /api/v1/documents` (dashboard document listing) 500'd on every request on Vercel with `ReferenceError: DOMMatrix is not defined`, thrown from inside `pdfjs-dist`'s legacy Node build. Cause: `pdf-parse` was imported at the top of `pages/api/v1/documents/index.ts`, a single file that backs both the `GET` (list) and `POST` (upload) handlers as one serverless function — so evaluating that top-level import ran on every request regardless of method, and `pdfjs-dist`'s legacy build references browser canvas globals (`DOMMatrix`) that only exist if a native canvas binary (`@napi-rs/canvas`) loads successfully, which apparently didn't happen on Vercel's Linux runtime even though it worked locally on macOS. Fixed by lazily `import()`-ing `pdf-parse` only inside `extractPageCount()`, so listing/deleting/etc. documents never touches it.
  - That alone wasn't enough: actual PDF uploads still 500'd, because `pdfjs-dist`'s internal geometry code throws the same `DOMMatrix` error in a way that isn't reliably caught by a try/catch around the awaited call (not tied to the promise `getInfo()` returns — looks like an internal fire-and-forget operation). Fixed for real by probing `@napi-rs/canvas` with its own `import()` first — a plain, catchable module-resolution failure — and skipping page-count extraction entirely (falling back to `page_count: null`) when that probe fails, instead of ever calling into `pdf-parse` without it.
- Downloading a password-protected share link always returned `403 Senha incorreta`, even right after typing the correct password to view it. Cause: the download button (`components/viewer/PDFViewer.tsx`) and the non-PDF fallback link (`components/viewer/ViewerPage.tsx`) both pointed the browser straight at `/api/v1/share/[token]/file` via `window.open`/`<a href>` — a plain navigation can't attach the `X-Share-Password` header the route requires, so it always looked like no password was supplied. Fixed by downloading through `fetch()` with the header instead: PDFs reuse the bytes already fetched for the viewer (no extra request), other file types fetch fresh with the remembered password, and either way the bytes are handed to the browser as a `Blob` object URL via a programmatically-clicked anchor.

### Added

- Phase 7 (Engagement, Trust & Growth) — "Duplicate settings" when creating a share link from an existing one: a new "Duplicar" button on `ShareLinkCard.tsx`, next to Editar/Revogar, opens `CreateShareLinkModal.tsx` pre-filled from the source link (label gets a "(cópia)" suffix, expiry/toggles/allow-list all carried over) — except the password, which can't be copied since only its bcrypt hash is ever available; the field shows a placeholder note instead and the owner sets a new one if needed. `CreateShareLinkModal` gained optional `prefill`/`open`/`onOpenChange` props so it can run in this externally-controlled "duplicate" mode without its own trigger button, alongside its existing self-contained "Criar novo link" mode; `ShareLinkList.tsx` lifts the one piece of state needed (which link, if any, is being duplicated) and remounts the modal via `key` per target link so `useState`'s prefill-seeding runs fresh each time.
- Phase 7 (Engagement, Trust & Growth) — Open Graph/Twitter meta tags on public share links, so pasting one into Slack/iMessage/Twitter renders a proper preview card (document title + description) instead of a bare URL. `app/view/[token]/page.tsx` converted from a client-only page to a Server Component wrapping the existing client `ViewerPage`, adding a `generateMetadata()` export. Backed by a new `models/shareLink.ts#getPublicMetadata()` — deliberately skips the password/require-email/allow-list checks (crawlers/link-unfurlers never have the credential a gated link needs) and returns only the document's own title/description, nothing sensitive; falls back to generic "Documento compartilhado" copy for a revoked/expired/deleted/nonexistent link so nothing about it leaks. The title still shows for password-protected links — the same trade-off Dropbox/Google Drive make in their own link previews.
- Phase 7 (Engagement, Trust & Growth) — Dynamic PDF watermark: migration `014-add-watermark-enabled-to-share-links.sql` adds `share_links.watermark_enabled` (default `false`). Like the allow-list, enabling it implies an email is required regardless of the `require_email` toggle — the watermark needs an identity to burn in. `components/viewer/PDFViewer.tsx#drawWatermark()` tiles the viewer's email + a load-time timestamp diagonally across the canvas immediately after `page.render()`, so it's baked into the rendered bitmap (survives a screenshot or browser print) rather than a removable DOM overlay — not tamper-proof against someone editing the client, and the downloadable file itself is untouched, both accepted trade-offs for a canvas-render-only deterrent. The watermark text is computed once in `ViewerPage.tsx` when the document first loads (a ref, not recomputed on zoom/page-change) and passed down as a prop. Editable via a `Switch` in both share-link modals, shown as a "Marca d'água" badge on `ShareLinkCard.tsx`.
- Phase 7 (Engagement, Trust & Growth) — Per-link email allow-list: migration `013-create-share-link-allowed-emails.sql` — `share_link_allowed_emails` table (case-insensitive unique index on `(share_link_id, LOWER(email))`), cascades on link deletion. `models/shareLink.ts#fetchAndValidateTokenRow` checks it after the password gate, and its presence implies an email is required even with `require_email` off — the owner shouldn't have to flip two toggles. Full-replace semantics on save (`replaceAllowedEmails()`): the edit form always sends its current textarea contents, not an add/remove diff. Editable via a `Textarea` (one email per line, parsed/deduped client-side by `lib/parseAllowedEmails.ts`) in both share-link modals, shown as a "Lista de emails (N)" badge on `ShareLinkCard.tsx`. Reuses the existing `email-required` viewer state and `EmailGate.tsx` from the "require email" feature — just a different rejection message ("Email não autorizado.") when the submitted address isn't on the list.
- Phase 7 (Engagement, Trust & Growth) — Per-link "require email" gate: migration `011-add-require-email-to-share-links.sql` adds `share_links.require_email` (default `false`); migration `012-add-viewer-email-to-link-views.sql` adds `link_views.viewer_email` so the captured address is stored on the view record. `models/shareLink.ts#fetchAndValidateTokenRow` checks it after the password gate (one thing to fix at a time if a link has both), via a new `X-Viewer-Email` header on `GET /api/v1/share/[token]` and `.../file`, validated with a plain `z.string().email()` check (`infra/schemas.ts#isValidEmail`) — no ownership/verification email loop, this is lead-capture, not authentication. `components/viewer/ViewerPage.tsx` gains a parallel `email-required` state and `EmailGate.tsx` (mirrors the existing `PasswordGate.tsx`), and resends whichever of password/email it already has on every retry so a link with both gates resolves progressively. Editable via a `Switch` in both share-link modals (same pattern as `notify_on_view`) and shown as a "Requer email" badge on `ShareLinkCard.tsx`. Bonus: the existing new-viewer notification email now names the viewer (`infra/mailer.ts`) when their email was captured — HTML-escaped, since it's attacker-controlled input from an anonymous endpoint landing in the owner's inbox.
- Superadmin role + `/superadmin/migrations` page: migration `010-add-is-superadmin-to-users.sql` adds `users.is_superadmin` (default `false`) — named "superadmin" rather than "admin" so it can't collide with a future account/workspace-level admin role. `infra/auth.ts#migrationsAuthMiddleware` now accepts either the existing `x-migrations-secret` header (unchanged, for scripts/CI) or a logged-in superadmin session, so a superadmin can view/run pending migrations from the browser without ever handling the raw secret. The "Superadmin" nav link (`components/layout/Header.tsx`) only renders for `is_superadmin` users, and `/superadmin/migrations` (Server Component, `components/superadmin/MigrationsPanel.tsx`) redirects everyone else to `/dashboard`. There's deliberately no API/UI to grant superadmin — promoting an account is a one-time manual `UPDATE users SET is_superadmin = true WHERE email = '...'`, documented in `CLAUDE.md`, so no one's email ends up hardcoded in a migration committed to this public repo.
- Phase 7 (Engagement, Trust & Growth) — Per-page analytics heatmap (DocSend's headline differentiator in this category):
  - Migration `009-create-link-view-pages.sql` — `link_view_pages` table, one row per `(link_view_id, page_number)`; repeat reports for the same view+page accumulate time via `ON CONFLICT ... DO UPDATE` instead of overwriting
  - `components/viewer/ViewerPage.tsx` tracks per-page dwell time client-side and includes it as `page_times` in the same `sendBeacon` payload already used for the aggregate `time_on_page`/`pages_viewed` on unload
  - `models/linkView.ts` persists `page_times` (in the same transaction as the existing dedup upsert) and exposes a new `page_breakdown` (avg time + view count per page) on `GET /api/v1/documents/[id]/links/[linkId]/analytics` — per-link only, since a page-by-page breakdown doesn't aggregate meaningfully across a document's different links
  - `components/analytics/PageHeatmapChart.tsx` — new bar chart (recharts, reusing the existing `--color-primary` token) rendered in `LinkAnalyticsDrawer.tsx`
- Phase 7 (Engagement, Trust & Growth) — Per-link toggle to mute view notifications: migration `008-add-notify-on-view-to-share-links.sql` adds `notify_on_view BOOLEAN NOT NULL DEFAULT TRUE`; exposed on create/update via `ShareLinkCreateInput`/`ShareLinkUpdateInput`, checked in the view-recording route before firing the notification email, and editable via a `Switch` in both `CreateShareLinkModal.tsx` and `EditShareLinkModal.tsx` (same pattern as the existing `is_active` toggle).
- Phase 7 (Engagement, Trust & Growth) — Email notification when a share link gets a new viewer:
  - `infra/mailer.ts` — Resend-backed mailer, following the same environment-gated no-op pattern as `infra/storage.ts` (no-op in `NODE_ENV=test` and when `RESEND_API_KEY` is unset, so this never requires a real API key locally or in CI)
  - `models/linkView.ts#recordView()` now distinguishes a genuinely new viewer (no prior row for that fingerprint on this link, at any time) from a returning one outside the existing 30-minute dedup window, and returns `is_new_viewer` on the `POST /api/v1/share/[token]/view` response
  - `models/shareLink.ts#getNotificationInfo()` — looks up the document owner's email, document title, and link label for a given share link
  - The view-recording route fires the notification fire-and-forget, so a mailer failure (missing key, Resend outage, deleted owner) never affects the response to the anonymous viewer; the analytics-page link in the email is built from the request's own `Host`/`X-Forwarded-Proto` headers rather than a new env var, so it works unmodified across local/preview/production
- Phase 6 — Frontend (all 6 blocks complete):
  - Block 1 — Foundation: `GET /api/v1/sessions` (thin authenticated handler backing the frontend auth context), `models/user.ts#findOneById()`, App Router foundation (Tailwind CSS v4 + shadcn/ui on a Radix base), `context/AuthContext.tsx` + `lib/fetcher.ts` + `app/providers.tsx` (SWR-backed `useAuth()`), `lib/auth-server.ts#getServerUser()` for server-side auth gating with no client-side flicker, shared `Header`/`Footer` + landing page (`app/page.tsx`); `pages/index.tsx`/`pages/status/index.tsx` migrated to `app/page.tsx`/`app/status/page.tsx` (`pages/api/v1/*` untouched)
  - Block 2 (US-08) — `app/register/page.tsx`/`app/login/page.tsx` (Server Component gates, redirect to `/dashboard` if already authenticated) with `components/forms/RegisterForm.tsx`/`LoginForm.tsx`
  - Block 3 (US-09) — `app/dashboard/page.tsx`; `components/documents/UploadZone.tsx` (drag-and-drop + XHR upload with progress), `DocumentCard.tsx`, `DocumentList.tsx` (paginated, SWR); `lib/formatters.ts`
  - Block 4 (US-10) — `app/documents/[id]/page.tsx`; `components/documents/DocumentDetailView.tsx`/`EditDocumentForm.tsx`/`DocumentMeta.tsx`; `components/share-links/CreateShareLinkModal.tsx`/`EditShareLinkModal.tsx`/`ShareLinkCard.tsx`/`ShareLinkList.tsx`
  - Block 5 (US-11) — `app/view/[token]/page.tsx` (public, client-rendered); `components/viewer/ViewerPage.tsx` (fetches share metadata + file bytes with the `X-Share-Password` header, records views via `POST .../view` on load and `navigator.sendBeacon` on unload), `PDFViewer.tsx` (canvas rendering via pdfjs-dist), `ViewerControls.tsx`, `PasswordGate.tsx`; `lib/fingerprint.ts`
    - New backend support: `infra/storage.ts#getFile()`, `models/shareLink.ts#getFileByToken()` (shares the existing token/password/expiry validation helper with `getByToken()` but additionally returns `storage_key`), `GET /api/v1/share/[token]/file` — public, rate-limited file-proxy route so the viewer can fetch file bytes with a password header (a direct `<img>`/browser navigation can't attach custom headers)
  - Block 6 (US-12, US-13) — `app/documents/[id]/analytics/page.tsx`; `components/analytics/AnalyticsView.tsx`/`StatCard.tsx`/`ViewsChart.tsx` (recharts)/`TopLinksTable.tsx`/`LinkAnalyticsDrawer.tsx`; `app/settings/page.tsx`; `components/settings/ProfileForm.tsx`/`DangerZone.tsx` (logout, soft-delete account)
  - Each corresponding user story in `user-stories/phase-6-frontend/` has an alignment note reconciling its original Pages-Router-era spec with the App Router / shadcn decisions made in Block 1
- Phase 5 — Analytics & Tracking:
  - Migration `007-create-link-views.sql` — `link_views` table, cascades on share link deletion
  - `POST /api/v1/share/[token]/view` — public view-recording endpoint; extracts `ip_address`/`user_agent` from headers, does not require the link password (already gated by the public GET)
  - `models/shareLink.ts#validateToken()` — existence/active/expiry check without the password gate, so view recording doesn't need the viewer to re-supply the password
  - `models/linkView.ts#recordView()` — deduplicates repeat views from the same `viewer_fingerprint` within a 30-minute window (updates `time_on_page`/`pages_viewed` on the existing row instead of inserting a new one), using a transaction + `SELECT ... FOR UPDATE` on a dedicated client to avoid a race between the check and the write
  - `GET /api/v1/documents/[id]/links/[linkId]/analytics` and `GET /api/v1/documents/[id]/analytics` — aggregated view stats (total/unique/avg time/avg pages/first-last viewed) plus a 30-day zero-filled `views_by_day` series; the per-document endpoint also returns `top_links` (top 5 by views)
  - All aggregate SQL casts `COUNT`/`AVG` results to `::int`/`::float` — `pg` returns `bigint`/`numeric` as strings by default, which would otherwise leak into the API response as strings instead of numbers
- Phase 4 — Share Links:
  - Migration `006-create-share-links.sql` — `share_links` table (plaintext UUID `token`, bcrypt `password_hash`, `expires_at`, `allow_download`, `is_active` for soft-revoke)
  - `models/shareLink.ts` — `create`, `findAllByDocumentId`, `findOneById`, `updateById`, `revokeById`, `getByToken` (validates active/expiry/password/document-deleted, in that order)
  - `POST`/`GET /api/v1/documents/[id]/links` — create and list share links, ownership enforced via `models/document.ts#findOneById`
  - `PATCH`/`DELETE /api/v1/documents/[id]/links/[linkId]` — update link config (label/password/expiry/allow_download/is_active, `null` clears password or expiry) and soft-revoke
  - `GET /api/v1/share/[token]` — public, unauthenticated endpoint; rate-limited (20 req/min); accepts the optional link password only via `X-Share-Password` header, never a query param
  - `infra/schemas.ts` — `shareLinkCreateSchema`/`shareLinkUpdateSchema`, `expires_at` must be a future ISO datetime
  - Share link tokens are intentionally **not** hashed at rest (unlike session tokens) — see the `TODO.md` Phase 4 note for why, and what was hardened instead (header-only password, rate limiting, narrow public response shape)
- Phase 3 — Documents Core:
  - Migration `005-create-documents.sql` — `documents` table (soft-delete, `user_id` FK, indexed)
  - `infra/storage.ts` — S3-compatible storage adapter (`@aws-sdk/client-s3`); MinIO locally via `infra/compose.yaml`, AWS S3/Cloudflare R2 in production; no-op in `NODE_ENV=test`
  - `POST /api/v1/documents` — multipart upload (`formidable`), Zod-validated title/description, MIME allowlist (PDF/DOCX/PPTX), size limit via `MAX_FILE_SIZE_MB`, PDF page-count extraction via `pdf-parse`
  - `GET /api/v1/documents` — paginated list of the authenticated user's documents (`page`/`per_page` query params)
  - `GET`/`PATCH`/`DELETE /api/v1/documents/[id]` — ownership-checked read, partial update, and soft-delete (with storage cleanup) of a single document
  - `models/document.ts` — `create`, `findAllByUserId`, `findOneById`, `updateById`, `deleteById`; ownership enforcement returns `ForbiddenError` (403) vs `NotFoundError` (404)
  - `tests/fixtures/sample.pdf` and `orchestrator.uploadDocument()` test helper
  - `services:up`/`services:down`/`services:stop` now pass `--env-file .env.development` to `docker compose` so the new `storage` (MinIO) service's env var substitution resolves correctly
- Pre-Phase-3 hardening sprint:
  - `infra/auth.ts#migrationsAuthMiddleware` — `GET`/`POST /api/v1/migrations` now require a matching `x-migrations-secret` header (`MIGRATIONS_SECRET` env var); previously unauthenticated and able to run migrations against the live database
  - `models/session.ts` — session tokens are now stored as a SHA-256 hash; the raw bearer token is never persisted
  - `models/user.ts` — Postgres unique-violation (`23505`) on insert/update is now caught and mapped to `ValidationError`, closing the check-then-insert race in `validateUniqueEmail`/`validateUniqueUserName`
  - `typecheck` job (`npx tsc --noEmit`) added to `.github/workflows/linting.yaml`; required adding `baseUrl: "."` to `tsconfig.json` so `tsc` resolves the root-style imports (`tests/orchestrator`, `models/session`, …) some test files already used, matching jest's `moduleDirectories` resolution
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

### Fixed

- Renamed `UnathorizedError` → `UnauthorizedError` (typo was part of the API error contract's `name` field)
- Session cookies (`session_id`) now set `SameSite=Lax` explicitly instead of relying on the browser default
- Removed `console.log` calls from `models/migrator.ts` (violated the "no console.log in production code" convention)

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

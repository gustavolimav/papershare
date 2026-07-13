# Papershare — Product & Engineering Roadmap

> Maintained jointly by PO and TL. Each phase builds on the previous one.
> Phases are ordered by value delivery. Items within a phase are ordered by priority.

---

## Status

| Phase | Name                               | Status     |
| ----- | ---------------------------------- | ---------- |
| 1     | Foundation                         | ✅ Done    |
| 2     | Authorization & Account Management | ✅ Done    |
| 3     | Documents Core                     | ✅ Done    |
| 4     | Share Links                        | ✅ Done    |
| 5     | Analytics & Tracking               | ⏳ Planned |
| 6     | Frontend                           | ⏳ Planned |
| 7     | AI Features                        | ⏳ Future  |
| 8     | Monetization                       | ⏳ Future  |

---

## Phase 1 — Foundation ✅

Core authentication infrastructure. All items delivered.

- [x] User registration (`POST /api/v1/users`)
- [x] Login with session cookie (`POST /api/v1/sessions`)
- [x] Session validation middleware (`infra/auth.ts`)
- [x] Authenticated user profile (`GET /api/v1/users/[username]`)
- [x] User profile update (`PATCH /api/v1/users/[username]`)
- [x] Database migrations system
- [x] Custom error classes with HTTP status mapping
- [x] Integration test suite

---

## Phase 2 — Authorization & Account Management ✅

**Goal:** Users can only manage their own resources. Provide complete session lifecycle.

### API

- [x] `DELETE /api/v1/sessions` — Logout (delete session, clear cookie)
- [x] Authorization guard: `PATCH /api/v1/users/[username]` must verify `req.user.username === params.username`
- [x] `DELETE /api/v1/users/[username]` — Soft-delete account (add `deleted_at` column)

### Model

- [x] `session.deleteByUserId(userId)` — Invalidate all sessions on account deletion
- [x] Add `ForbiddenError` (403) to `infra/errors.ts` for authorization failures

### Infrastructure

- [x] Rate limiting middleware (protect login and registration endpoints)
- [x] Input validation with Zod (replace ad-hoc validation in models)
- [x] Database connection pool (replace single-connection pattern in `infra/database.ts`)

### Tests

- [x] Logout flow: session deleted, cookie cleared, subsequent requests return 401
- [x] Forbidden: user A cannot PATCH user B's profile
- [x] Account deletion: user gone, sessions invalidated

---

## Phase 3 — Documents Core ✅

**Goal:** Users can upload, manage, and retrieve documents. This is the core product.

### Database

- [x] Migration: `documents` table (`infra/migrations/005-create-documents.sql`)
  ```sql
  id, title, description, original_filename, storage_key,
  mime_type, size_bytes, page_count, user_id,
  created_at, updated_at, deleted_at
  ```
  `size_bytes` is `INTEGER`, not `BIGINT` — max upload size is capped well under
  2GB, and `pg` returns `BIGINT`/`int8` columns as strings (precision safety),
  which would have leaked into the API response as a string instead of a number.

### Storage

- [x] Storage adapter (`infra/storage.ts`), S3-compatible (`@aws-sdk/client-s3`)
      backed by MinIO locally (`infra/compose.yaml`) and AWS S3 / Cloudflare R2 in
      production — same code path in both, only env vars differ. Local filesystem
      storage was considered and rejected (see `US-P3-02`): it doesn't survive
      serverless/ephemeral deploy targets like Vercel Preview Deployments.
- [x] File type validation (PDF, DOCX, PPTX only) — `infra/schemas.ts#ALLOWED_MIME_TYPES`
- [x] File size limit (configurable via `MAX_FILE_SIZE_MB`, default 50; set to 2 in `.env.development`)

### API

- [x] `POST /api/v1/documents` — Upload document (multipart/form-data via `formidable`)
- [x] `GET /api/v1/documents` — List authenticated user's documents (paginated)
- [x] `GET /api/v1/documents/[id]` — Get document metadata
- [x] `PATCH /api/v1/documents/[id]` — Update title/description
- [x] `DELETE /api/v1/documents/[id]` — Soft-delete document + storage cleanup

### Model

- [x] `models/document.ts` — CRUD + ownership validation (`ForbiddenError` on cross-user access)
- [x] PDF page count extraction on upload (`pdf-parse`'s `PDFParse#getInfo()`; `null` on failure, never throws)

### Tests

- [x] Upload, list, get, update, delete flows
- [x] Authorization: user cannot manage another user's documents (403)
- [x] Invalid file type / size / missing file or title: returns 400

---

## Phase 4 — Share Links ✅

**Goal:** Users can generate configurable sharing links for documents.

### Security decision: share link tokens are not hashed at rest

Session tokens (hardening sprint, pre-Phase-3) are hashed before storage because
the server never needs to show one back to its owner — the browser already
holds it. Share link tokens are different: `GET /api/v1/documents/[id]/links`
must keep returning the full shareable URL every time an owner lists their
links, potentially long after creation, so it can be re-copied and re-shared.
Hashing the token would make that impossible to fulfill (a hash can't be
reversed back into the original URL). So the token stays a plaintext UUID
(122 bits of entropy, matching how most products — Dropbox, Google Drive,
Notion — implement "share link" URLs), and the security budget went instead
into the parts of this feature that don't conflict with that requirement:

- `GET /api/v1/share/[token]` only accepts the optional password via the
  `X-Share-Password` header, never a query param — query strings end up in
  server/proxy access logs, browser history, and `Referer` headers
- The same endpoint is rate-limited (`infra/rate-limit.ts`, 20 req/min) since
  it's the only unauthenticated route that accepts a secret and would
  otherwise be brute-forceable
- Passwords are still bcrypt-hashed (`password_hash`), expiry and revocation
  (`is_active`) are enforced server-side, and the public response is a
  deliberately narrow shape that never includes `password_hash`,
  `storage_key`, or the document owner's `user_id`

### Database

- [x] Migration `006-create-share-links.sql`: `share_links` table
  ```sql
  id, token (UUID), document_id, user_id,
  label, password_hash, expires_at,
  allow_download, is_active,
  created_at, updated_at
  ```

### API

- [x] `POST /api/v1/documents/[id]/links` — Create share link
- [x] `GET /api/v1/documents/[id]/links` — List links for a document
- [x] `PATCH /api/v1/documents/[id]/links/[linkId]` — Update link config
- [x] `DELETE /api/v1/documents/[id]/links/[linkId]` — Revoke link (soft: `is_active = FALSE`)
- [x] `GET /api/v1/share/[token]` — Public endpoint: validates expiration, active
      status, password, and document soft-delete state; returns share link +
      document metadata. Does not yet return a viewer URL or stream file
      bytes — that's Phase 6 (frontend viewer) territory; `allow_download` is
      returned as a flag for the viewer to respect, not enforced by the API.

### Model

- [x] `models/shareLink.ts`
- [x] Password-protected links: hash on create/update, verify on access

### Tests

- [x] Link creation with/without password and expiration
- [x] Expired link returns 403
- [x] Revoked link returns 403
- [x] `allow_download: false` is reflected in the public response (enforcement is a viewer-level concern, see above)

---

## Phase 5 — Analytics & Tracking ⏳

**Goal:** Document owners see engagement data for each share link.

### Database

- [ ] Migration: `link_views` table
  ```sql
  id, link_id, viewer_fingerprint, ip_address,
  country_code, user_agent, time_on_page_seconds,
  pages_viewed, created_at
  ```

### API

- [ ] `POST /api/v1/share/[token]/view` — Record view event (called by viewer frontend)
- [ ] `GET /api/v1/documents/[id]/links/[linkId]/analytics` — Analytics summary per link
  - Total views, unique viewers, avg time on page, page heatmap
- [ ] `GET /api/v1/documents/[id]/analytics` — Aggregated analytics across all links

### Model

- [ ] `models/analytics.ts` — Aggregation queries (no ORM, raw SQL with GROUP BY)

### Tests

- [ ] View event recorded correctly
- [ ] Duplicate fingerprint within 30 min counts as one unique view
- [ ] Analytics endpoint returns correct aggregations

---

## Phase 6 — Frontend ⏳

**Goal:** Full UI on top of the existing API. No new backend work in this phase.

### Architecture decision: App Router, not Pages Router

All Phase 6 pages/components below go under `app/`, not `pages/`. Next.js treats
Pages Router as maintenance-only; starting the one large remaining chunk of
frontend work on it would mean building a dashboard-heavy UI on a legacy
foundation from day one. Reasons:

- Server Components can read the `session_id` cookie via `next/headers` and
  gate protected routes (`/dashboard`, `/documents/[id]`, `/account`) before
  render — no client-side auth-check flicker, less boilerplate than
  per-page `getServerSideProps`.
- SWR still has a role for client-side mutation/revalidation (uploads, editing
  share links) inside Client Components — it's not either/or with Server
  Components, it's Server Components for the authenticated initial fetch and
  SWR for interactive updates.
- `pages/api/v1/*` (7 route files, fully covered by integration tests) stay
  exactly as they are. Next.js supports `pages/` and `app/` side by side, so
  there is no need to rewrite working, tested API routes for zero functional
  gain. Only `pages/index.tsx` and `pages/status/index.tsx` move to
  `app/page.tsx` / `app/status/page.tsx` since they're trivial and avoid
  routing collisions once `app/` exists.

### Pages

- [ ] `/` — Landing page (marketing)
- [ ] `/register` — Registration form
- [ ] `/login` — Login form
- [ ] `/dashboard` — Document list + upload button
- [ ] `/documents/[id]` — Document detail + share link manager
- [ ] `/documents/[id]/analytics` — Analytics view
- [ ] `/share/[token]` — Public document viewer (PDF.js)
- [ ] `/account` — Profile settings

### Components

- [ ] `DocumentCard` — Thumbnail, title, link count
- [ ] `ShareLinkForm` — Create/edit link with config options
- [ ] `AnalyticsDashboard` — Charts with Recharts or Chart.js
- [ ] `PdfViewer` — Embedded PDF.js viewer (respects `allow_download` flag)

### Infrastructure

- [ ] Authentication context (React Context + SWR)
- [ ] Redirect unauthenticated users to `/login`
- [ ] Deploy to Vercel (connect GitHub repo, configure env vars)
- [ ] Set up webapp-testing skill (`anthropics/skills`) for automated UI regression tests

---

## Phase 7 — AI Features ⏳

**Goal:** Add AI-powered value on top of existing data.

> **Tools to evaluate:** Flowise (drag-and-drop agent builder, fast prototyping) or LangChain (full control, better for RAG pipelines over user documents).

- [ ] Auto-summarization on upload (extract text → Claude API → store summary)
- [ ] `GET /api/v1/documents/[id]/summary` — Return AI summary
- [ ] "Ask about this document" chat interface on the viewer page (RAG)
- [ ] Analytics insights: natural language summary of engagement ("Most viewers drop off at page 4")
- [ ] Improvement suggestions based on engagement drop-off data

---

---

## Phase 8 — Monetization ⏳

**Goal:** Gate premium features behind a paid plan.

> **Tools:** Stripe for subscriptions and one-time payments. Open SaaS (wasp-lang) has a ready integration as reference.

### Infrastructure

- [ ] Stripe account + webhook setup
- [ ] Migration: `subscriptions` table (`user_id`, `stripe_customer_id`, `plan`, `status`, `current_period_end`)
- [ ] Stripe webhook handler (`POST /api/v1/webhooks/stripe`) — update subscription status on events

### Plans (TBD)

- [ ] Define plan tiers (e.g. Free / Pro) and which features are gated
- [ ] Enforce plan limits in relevant model functions (e.g. max documents, max share links)

### API

- [ ] `POST /api/v1/billing/checkout` — Create Stripe Checkout session
- [ ] `GET /api/v1/billing/portal` — Redirect to Stripe Customer Portal (manage/cancel)
- [ ] `GET /api/v1/billing/subscription` — Current user's plan and status

### Tests

- [ ] Webhook events correctly update subscription state
- [ ] Plan-gated endpoints return 402 when limit exceeded

---

## Technical Debt Backlog

These are not tied to a specific phase but should be addressed progressively.

### Developer Experience

- [ ] Install Repomix (`npx repomix`) + MCP plugin for richer Claude Code context in exploratory sessions

### Code Quality

- [ ] Replace `any` types in `DatabaseQuery.values` with proper typing
- [x] Add `ForbiddenError` (403) — already in `infra/errors.ts`
- [ ] Standardize error message language (mix of PT-BR and EN)
- [x] Connection pooling in `infra/database.ts` (uses `Pool` from `pg`)
- [ ] Environment variable validation on startup (fail fast)
- [ ] API response envelope (`{ data, meta }`) for list endpoints
- [ ] Pagination helper utility
- [x] Move migration endpoint behind an admin auth guard — `MIGRATIONS_SECRET` header check via `infra/auth.ts#migrationsAuthMiddleware`
- [ ] Add `updated_at` trigger function in migrations (currently updated manually)
- [x] CI: add TypeScript type-check step to GitHub Actions — `typecheck` job in `.github/workflows/linting.yaml`

### Security hardening (2026-07-12)

- [x] Fixed `UnathorizedError` typo → `UnauthorizedError` (was baked into the API error contract)
- [x] Hash session tokens before persisting (`models/session.ts`) — DB now stores SHA-256 hash, never the raw bearer token
- [x] Explicit `sameSite: "lax"` on all session cookies
- [x] Backstop against the check-then-insert race on unique username/email: unique-violation (`23505`) from Postgres is now caught and mapped to `ValidationError` in `models/user.ts`
- [ ] Rate limiter (`infra/rate-limit.ts`) uses an in-memory `Map` and is a no-op outside `NODE_ENV=production` — doesn't survive multi-instance/serverless deploys (e.g. Vercel) and isn't exercised by CI. Needs a shared store (e.g. a Postgres-backed counter, consistent with this project's no-extra-infra approach) before relying on it in production.
- [ ] DB connection pool in `infra/database.ts` is created at module scope — fine for a long-running Docker/Node process, but a serverless deploy target needs a pooled connection strategy (e.g. Neon's pooled connection string or a serverless driver) decided before Phase 3 adds more I/O-heavy endpoints.

# Papershare — Product & Engineering Roadmap

> Maintained jointly by PO and TL. Each phase builds on the previous one.
> Phases are ordered by value delivery. Items within a phase are ordered by priority.

---

## Status

| Phase | Name                               | Status     |
| ----- | ---------------------------------- | ---------- |
| 1     | Foundation                         | ✅ Done    |
| 2     | Authorization & Account Management | 🔄 Next    |
| 3     | Documents Core                     | ⏳ Planned |
| 4     | Share Links                        | ⏳ Planned |
| 5     | Analytics & Tracking               | ⏳ Planned |
| 6     | Frontend                           | ⏳ Planned |
| 7     | AI Features                        | ⏳ Future  |

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

## Phase 2 — Authorization & Account Management 🔄

**Goal:** Users can only manage their own resources. Provide complete session lifecycle.

### API

- [ ] `DELETE /api/v1/sessions` — Logout (delete session, clear cookie)
- [ ] Authorization guard: `PATCH /api/v1/users/[username]` must verify `req.user.username === params.username`
- [ ] `DELETE /api/v1/users/[username]` — Soft-delete account (add `deleted_at` column)

### Model

- [ ] `session.deleteByUserId(userId)` — Invalidate all sessions on account deletion
- [ ] Add `ForbiddenError` (403) to `infra/errors.ts` for authorization failures

### Infrastructure

- [ ] Rate limiting middleware (protect login and registration endpoints)
- [ ] Input validation with Zod (replace ad-hoc validation in models)
- [ ] Database connection pool (replace single-connection pattern in `infra/database.ts`)

### Tests

- [ ] Logout flow: session deleted, cookie cleared, subsequent requests return 401
- [ ] Forbidden: user A cannot PATCH user B's profile
- [ ] Account deletion: user gone, sessions invalidated

---

## Phase 3 — Documents Core ⏳

**Goal:** Users can upload, manage, and retrieve documents. This is the core product.

### Database

- [ ] Migration: `documents` table
  ```sql
  id, title, description, original_filename, storage_key,
  mime_type, size_bytes, page_count, user_id,
  created_at, updated_at, deleted_at
  ```

### Storage

- [ ] Storage adapter interface (`infra/storage.ts`) with two implementations:
  - Local filesystem (development)
  - AWS S3 / Cloudflare R2 (production)
- [ ] File type validation (PDF, DOCX, PPTX only at first)
- [ ] File size limit (configurable via env, default 50 MB)

### API

- [ ] `POST /api/v1/documents` — Upload document (multipart/form-data)
- [ ] `GET /api/v1/documents` — List authenticated user's documents (paginated)
- [ ] `GET /api/v1/documents/[id]` — Get document metadata
- [ ] `PATCH /api/v1/documents/[id]` — Update title/description
- [ ] `DELETE /api/v1/documents/[id]` — Soft-delete document

### Model

- [ ] `models/document.ts` — CRUD + ownership validation
- [ ] PDF page count extraction on upload

### Tests

- [ ] Upload, list, get, update, delete flows
- [ ] Authorization: user cannot manage another user's documents
- [ ] Invalid file type / size: returns 400

---

## Phase 4 — Share Links ⏳

**Goal:** Users can generate configurable sharing links for documents.

### Database

- [ ] Migration: `share_links` table
  ```sql
  id, token (UUID), document_id, user_id,
  label, password_hash, expires_at,
  allow_download, is_active,
  created_at, updated_at
  ```

### API

- [ ] `POST /api/v1/documents/[id]/links` — Create share link
- [ ] `GET /api/v1/documents/[id]/links` — List links for a document
- [ ] `PATCH /api/v1/documents/[id]/links/[linkId]` — Update link config
- [ ] `DELETE /api/v1/documents/[id]/links/[linkId]` — Revoke link
- [ ] `GET /api/v1/share/[token]` — Public endpoint: validate link and serve document
  - Checks expiration, active status, password if set
  - Returns document viewer URL (not raw file for non-downloadable links)

### Model

- [ ] `models/shareLink.ts`
- [ ] Password-protected links: hash on create, verify on access

### Tests

- [ ] Link creation with/without password and expiration
- [ ] Expired link returns 403
- [ ] Revoked link returns 403
- [ ] Download-disabled link: file bytes not served

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

---

## Phase 7 — AI Features ⏳

**Goal:** Add AI-powered value on top of existing data.

- [ ] Auto-summarization on upload (extract text → Claude API → store summary)
- [ ] `GET /api/v1/documents/[id]/summary` — Return AI summary
- [ ] "Ask about this document" chat interface on the viewer page (RAG)
- [ ] Analytics insights: natural language summary of engagement ("Most viewers drop off at page 4")
- [ ] Improvement suggestions based on engagement drop-off data

---

## Technical Debt Backlog

These are not tied to a specific phase but should be addressed progressively.

- [ ] Replace `any` types in `DatabaseQuery.values` with proper typing
- [ ] Add `ForbiddenError` (403) — currently missing from `infra/errors.ts`
- [ ] Standardize error message language (mix of PT-BR and EN)
- [ ] Connection pooling in `infra/database.ts` (currently opens/closes per query)
- [ ] Environment variable validation on startup (fail fast)
- [ ] API response envelope (`{ data, meta }`) for list endpoints
- [ ] Pagination helper utility
- [ ] Move migration endpoint behind an admin auth guard
- [ ] Add `updated_at` trigger function in migrations (currently updated manually)
- [ ] CI: add TypeScript type-check step to GitHub Actions

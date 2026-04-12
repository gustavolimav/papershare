# Papershare — User Story Queue

This folder contains detailed user stories generated from `TODO.md`. Each story is written to be self-contained: an autonomous agent can pick it up and implement it without needing additional context beyond the story file and the existing codebase.

Stories are ordered by recommended implementation sequence within each phase. Tech debt stories can be picked up independently of phase work.

---

## Phase 3 — Documents Core

| ID | Title | One-sentence description |
|----|-------|--------------------------|
| [US-P3-01](./phase-3-documents/US-P3-01-documents-table.md) | Documents Table | Create the `documents` migration and TypeScript types with soft-delete support. |
| [US-P3-02](./phase-3-documents/US-P3-02-file-storage-adapter.md) | File Storage Adapter | Build a pluggable `infra/storage.ts` adapter for local filesystem storage, extensible to S3/R2. |
| [US-P3-03](./phase-3-documents/US-P3-03-file-upload-validation.md) | File Upload & Validation | Implement `POST /api/v1/documents` with multipart parsing, MIME type/size validation, and PDF page count extraction. |
| [US-P3-04](./phase-3-documents/US-P3-04-document-crud-api.md) | Document CRUD API | Add GET list, GET single, PATCH, and DELETE endpoints for documents with ownership enforcement. |

---

## Phase 4 — Share Links

| ID | Title | One-sentence description |
|----|-------|--------------------------|
| [US-P4-01](./phase-4-share-links/US-P4-01-share-links-table.md) | Share Links Table | Create the `share_links` migration with token, password_hash, expiry, and download-flag columns. |
| [US-P4-02](./phase-4-share-links/US-P4-02-share-link-crud.md) | Share Link CRUD | Add create, list, update, and revoke (soft) endpoints for share links with ownership validation. |
| [US-P4-03](./phase-4-share-links/US-P4-03-public-share-endpoint.md) | Public Share Endpoint | Implement the public `GET /api/v1/share/[token]` endpoint with full validation (active, expiry, password, document existence). |
| [US-P4-04](./phase-4-share-links/US-P4-04-password-and-expiry.md) | Password Protection & Expiry | Enforce bcrypt password verification, future-date expiry validation, and download-flag behaviour on share links. |

---

## Phase 5 — Analytics & Tracking

| ID | Title | One-sentence description |
|----|-------|--------------------------|
| [US-01](./phase-5-analytics/US-01-link-views-table.md) | Link Views Table | Create the `link_views` migration and TypeScript types to store document view events. |
| [US-02](./phase-5-analytics/US-02-view-event-recording.md) | View Event Recording Endpoint | Implement the public `POST /api/v1/share/[token]/view` endpoint to record a viewer session. |
| [US-03](./phase-5-analytics/US-03-analytics-per-link.md) | Analytics Per Share Link | Add `GET /api/v1/documents/[id]/links/[linkId]/analytics` to return aggregated stats for a single link. |
| [US-04](./phase-5-analytics/US-04-analytics-per-document.md) | Analytics Per Document | Add `GET /api/v1/documents/[id]/analytics` to return rolled-up stats across all links for a document. |
| [US-05](./phase-5-analytics/US-05-unique-viewer-deduplication.md) | Unique Viewer Deduplication | Deduplicate view events within a 30-minute window per viewer fingerprint to avoid inflation from refreshes. |

---

## Phase 6 — Frontend

| ID | Title | One-sentence description |
|----|-------|--------------------------|
| [US-06](./phase-6-frontend/US-06-react-context-swr.md) | React Context + SWR Foundation | Set up `AuthContext`, a `useAuth()` hook, and a global SWR `fetcher` as the client-state foundation. |
| [US-07](./phase-6-frontend/US-07-landing-page.md) | Landing Page | Build the public homepage at `/` with hero, feature highlights, and CTAs to register or log in. |
| [US-08](./phase-6-frontend/US-08-auth-forms.md) | Registration & Login Forms | Build the `/register` and `/login` pages with validation, error handling, and post-auth redirect. |
| [US-09](./phase-6-frontend/US-09-dashboard.md) | Document Dashboard | Build the `/dashboard` page with a paginated document list, upload zone, and delete support. |
| [US-10](./phase-6-frontend/US-10-document-detail-share-links.md) | Document Detail & Share Link Manager | Build the `/documents/[id]` page with metadata editing and a full CRUD share link manager. |
| [US-11](./phase-6-frontend/US-11-public-pdf-viewer.md) | Public PDF Viewer | Build the public `/view/[token]` page with PDF.js rendering, password gate, and download-flag enforcement. |
| [US-12](./phase-6-frontend/US-12-analytics-visualization.md) | Analytics Visualization | Build the `/documents/[id]/analytics` page with charts, stat cards, and a per-link analytics drawer. |
| [US-13](./phase-6-frontend/US-13-profile-settings.md) | Profile Settings Page | Build the `/settings` page for updating profile, logging out, and deleting the account. |

---

## Phase 7 — AI Features

| ID | Title | One-sentence description |
|----|-------|--------------------------|
| [US-14](./phase-7-ai/US-14-auto-summarization.md) | Auto-Summarization on Upload | Trigger an async Claude API summarization job after every document upload and store the result. |
| [US-15](./phase-7-ai/US-15-document-summary-endpoint.md) | Document Summary Endpoint | Add `GET` and `POST /api/v1/documents/[id]/summary` to retrieve and manually regenerate the AI summary. |
| [US-16](./phase-7-ai/US-16-viewer-chat-rag.md) | Viewer Chat Interface (RAG) | Add a chat panel to the public viewer that lets viewers ask questions about the document using RAG + Claude. |
| [US-17](./phase-7-ai/US-17-analytics-insights.md) | Analytics Insights | Generate a cached natural-language analytics summary via Claude and expose it at `GET /analytics/insights`. |
| [US-18](./phase-7-ai/US-18-dropoff-suggestions.md) | Drop-off Rate Suggestions | Extend analytics insights with AI-generated suggestions based on where viewers stop reading. |

---

## Technical Debt

| ID | Title | One-sentence description |
|----|-------|--------------------------|
| [US-19](./tech-debt/US-19-fix-any-types.md) | Fix `any` Types | Replace `any[]` in `DatabaseQuery.values` with a proper `QueryParam` union type. |
| [US-20](./tech-debt/US-20-standardize-error-messages.md) | Standardize Error Messages | Audit and rewrite all user-facing error messages to consistent pt-BR Portuguese. |
| [US-21](./tech-debt/US-21-env-validation.md) | Env Variable Validation | Add startup validation of all required environment variables using Zod, with fast-fail on missing config. |
| [US-22](./tech-debt/US-22-api-response-envelope.md) | API Response Envelope | Wrap all successful API responses in a `{ data, meta }` envelope for consistent client consumption. |
| [US-23](./tech-debt/US-23-pagination-helper.md) | Pagination Helper | Extract pagination parsing and meta-building into a reusable `infra/pagination.ts` utility. |
| [US-24](./tech-debt/US-24-migration-admin-auth.md) | Migration Endpoint Admin Auth | Protect the migration runner HTTP endpoint with a `MIGRATIONS_SECRET` header token. |
| [US-25](./tech-debt/US-25-updated-at-trigger.md) | `updated_at` Trigger | Add a PostgreSQL trigger to auto-update `updated_at` on all tables, removing manual timestamp updates from queries. |
| [US-26](./tech-debt/US-26-ci-typecheck.md) | CI TypeScript Type-Check | Add a `tsc --noEmit` step to GitHub Actions CI to catch type regressions on every pull request. |

---

## Recommended Implementation Order

For a single developer or agent working sequentially:

1. **Phase 3 (documents core):** US-P3-01 → US-P3-02 → US-P3-03 → US-P3-04
2. **Phase 4 (share links):** US-P4-01 → US-P4-02 → US-P4-03 → US-P4-04
3. **Tech debt (foundation):** US-19 → US-21 → US-23 → US-25 → US-26 → US-24 → US-20 → US-22
4. **Phase 5 (backend analytics):** US-01 → US-02 → US-05 → US-03 → US-04
5. **Phase 6 (frontend):** US-06 → US-07 → US-08 → US-09 → US-10 → US-13 → US-11 → US-12
6. **Phase 7 (AI):** US-14 → US-15 → US-17 → US-18 → US-16

For parallel teams: Phase 5 and Phase 6 (up to US-11) can be built concurrently. Phase 7 requires US-14 before any other AI story.

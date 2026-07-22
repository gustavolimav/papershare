# Papershare — User Story Queue

This folder contains detailed user stories generated from `TODO.md`. Each story is written to be self-contained: an autonomous agent can pick it up and implement it without needing additional context beyond the story file and the existing codebase.

Stories are ordered by recommended implementation sequence within each phase. Tech debt stories can be picked up independently of phase work.

---

## Phase 3 — Documents Core

| ID                                                                 | Title                    | One-sentence description                                                                                             |
| ------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [US-P3-01](./phase-3-documents/US-P3-01-documents-table.md)        | Documents Table          | Create the `documents` migration and TypeScript types with soft-delete support.                                      |
| [US-P3-02](./phase-3-documents/US-P3-02-file-storage-adapter.md)   | File Storage Adapter     | Build a pluggable `infra/storage.ts` adapter for local filesystem storage, extensible to S3/R2.                      |
| [US-P3-03](./phase-3-documents/US-P3-03-file-upload-validation.md) | File Upload & Validation | Implement `POST /api/v1/documents` with multipart parsing, MIME type/size validation, and PDF page count extraction. |
| [US-P3-04](./phase-3-documents/US-P3-04-document-crud-api.md)      | Document CRUD API        | Add GET list, GET single, PATCH, and DELETE endpoints for documents with ownership enforcement.                      |

---

## Phase 4 — Share Links

| ID                                                                  | Title                        | One-sentence description                                                                                                       |
| ------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [US-P4-01](./phase-4-share-links/US-P4-01-share-links-table.md)     | Share Links Table            | Create the `share_links` migration with token, password_hash, expiry, and download-flag columns.                               |
| [US-P4-02](./phase-4-share-links/US-P4-02-share-link-crud.md)       | Share Link CRUD              | Add create, list, update, and revoke (soft) endpoints for share links with ownership validation.                               |
| [US-P4-03](./phase-4-share-links/US-P4-03-public-share-endpoint.md) | Public Share Endpoint        | Implement the public `GET /api/v1/share/[token]` endpoint with full validation (active, expiry, password, document existence). |
| [US-P4-04](./phase-4-share-links/US-P4-04-password-and-expiry.md)   | Password Protection & Expiry | Enforce bcrypt password verification, future-date expiry validation, and download-flag behaviour on share links.               |

---

## Phase 5 — Analytics & Tracking

| ID                                                                | Title                         | One-sentence description                                                                                    |
| ----------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [US-01](./phase-5-analytics/US-01-link-views-table.md)            | Link Views Table              | Create the `link_views` migration and TypeScript types to store document view events.                       |
| [US-02](./phase-5-analytics/US-02-view-event-recording.md)        | View Event Recording Endpoint | Implement the public `POST /api/v1/share/[token]/view` endpoint to record a viewer session.                 |
| [US-03](./phase-5-analytics/US-03-analytics-per-link.md)          | Analytics Per Share Link      | Add `GET /api/v1/documents/[id]/links/[linkId]/analytics` to return aggregated stats for a single link.     |
| [US-04](./phase-5-analytics/US-04-analytics-per-document.md)      | Analytics Per Document        | Add `GET /api/v1/documents/[id]/analytics` to return rolled-up stats across all links for a document.       |
| [US-05](./phase-5-analytics/US-05-unique-viewer-deduplication.md) | Unique Viewer Deduplication   | Deduplicate view events within a 30-minute window per viewer fingerprint to avoid inflation from refreshes. |

---

## Phase 6 — Frontend

| ID                                                               | Title                                | One-sentence description                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [US-06](./phase-6-frontend/US-06-react-context-swr.md)           | React Context + SWR Foundation       | Set up `AuthContext`, a `useAuth()` hook, and a global SWR `fetcher` as the client-state foundation.       |
| [US-07](./phase-6-frontend/US-07-landing-page.md)                | Landing Page                         | Build the public homepage at `/` with hero, feature highlights, and CTAs to register or log in.            |
| [US-08](./phase-6-frontend/US-08-auth-forms.md)                  | Registration & Login Forms           | Build the `/register` and `/login` pages with validation, error handling, and post-auth redirect.          |
| [US-09](./phase-6-frontend/US-09-dashboard.md)                   | Document Dashboard                   | Build the `/dashboard` page with a paginated document list, upload zone, and delete support.               |
| [US-10](./phase-6-frontend/US-10-document-detail-share-links.md) | Document Detail & Share Link Manager | Build the `/documents/[id]` page with metadata editing and a full CRUD share link manager.                 |
| [US-11](./phase-6-frontend/US-11-public-pdf-viewer.md)           | Public PDF Viewer                    | Build the public `/view/[token]` page with PDF.js rendering, password gate, and download-flag enforcement. |
| [US-12](./phase-6-frontend/US-12-analytics-visualization.md)     | Analytics Visualization              | Build the `/documents/[id]/analytics` page with charts, stat cards, and a per-link analytics drawer.       |
| [US-13](./phase-6-frontend/US-13-profile-settings.md)            | Profile Settings Page                | Build the `/settings` page for updating profile, logging out, and deleting the account.                    |

---

## Phase 7 — AI Features

| ID                                                       | Title                        | One-sentence description                                                                                     |
| -------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [US-14](./phase-7-ai/US-14-auto-summarization.md)        | Auto-Summarization on Upload | Trigger an async Claude API summarization job after every document upload and store the result.              |
| [US-15](./phase-7-ai/US-15-document-summary-endpoint.md) | Document Summary Endpoint    | Add `GET` and `POST /api/v1/documents/[id]/summary` to retrieve and manually regenerate the AI summary.      |
| [US-16](./phase-7-ai/US-16-viewer-chat-rag.md)           | Viewer Chat Interface (RAG)  | Add a chat panel to the public viewer that lets viewers ask questions about the document using RAG + Claude. |
| [US-17](./phase-7-ai/US-17-analytics-insights.md)        | Analytics Insights           | Generate a cached natural-language analytics summary via Claude and expose it at `GET /analytics/insights`.  |
| [US-18](./phase-7-ai/US-18-dropoff-suggestions.md)       | Drop-off Rate Suggestions    | Extend analytics insights with AI-generated suggestions based on where viewers stop reading.                 |

---

## Phase 9 — Team Workspaces (Basic)

| ID                                                                                   | Title                                                        | One-sentence description                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [US-28](./phase-9-workspaces/US-28-workspace-data-model.md)                          | Workspace Data Model & Migration                             | Create `workspaces`/`workspace_members` tables and migrate every existing document to a workspace via an auto-created personal workspace.      |
| [US-29](./phase-9-workspaces/US-29-workspace-crud-and-switching.md)                  | Workspace CRUD & Switching                                   | Add create/list/rename/delete endpoints plus a `.../activate` endpoint that sets the requester's active workspace.                             |
| [US-30](./phase-9-workspaces/US-30-member-management.md)                             | Member Invitation & Role Management                          | Add invite-by-email, role-change, and remove/leave endpoints, with last-owner and personal-workspace guardrails.                               |
| [US-31](./phase-9-workspaces/US-31-document-authorization-migration.md)              | Document & Share-Link Authorization Becomes Workspace-Scoped | Replace every direct `user_id` ownership check on documents/share links with a workspace role check, so the shared library is actually shared. |
| [US-32](./phase-9-workspaces/US-32-ai-key-resolution-via-workspace.md)               | AI Features Resolve the Workspace's Key                      | Point every AI feature's key resolution at the document's workspace's creator instead of the document's uploader.                              |
| [US-33](./phase-9-workspaces/US-33-frontend-workspace-switcher-and-team-settings.md) | Frontend: Workspace Switcher & Team Settings                 | Build the header workspace switcher, workspace-creation modal, and the "Equipe" settings tab for member management.                            |

---

## Phase 10 — Monetization

| ID                                                                      | Title                            | One-sentence description                                                                                                          |
| ----------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [US-35](./phase-10-monetization/US-35-billing-infrastructure.md)        | Billing Infrastructure           | Add the `subscriptions` table, `infra/stripe.ts`, and workspace-scoped checkout/portal/webhook endpoints.                         |
| [US-36](./phase-10-monetization/US-36-plan-gating.md)                   | Plan Gating                      | Enforce Free-tier document/link limits and gate watermark/NDA/allow-list/branding/engagement-score behind Pro.                    |
| [US-37](./phase-10-monetization/US-37-frontend-billing-and-usage-ui.md) | Frontend: Faturamento & Usage UI | Build the "Faturamento" settings tab and make gated UI (upload, create-link, feature toggles) match the current plan.             |
| [US-38](./phase-10-monetization/US-38-homepage-revamp.md)               | Homepage Revamp                  | Replace the Phase-6-era feature grid with a full themed showcase of every shipped feature plus a Free/Pro/Business pricing table. |

---

## Phase 11 — Visual Identity & UI Redesign

| ID                                                                             | Title                                | One-sentence description                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [US-39](./phase-11-visual-identity/US-39-design-tokens.md)                     | Design Tokens & Typography           | Replace the neutral shadcn theme with the new palette/fonts and finish wiring dark mode.                           |
| [US-40](./phase-11-visual-identity/US-40-app-shell-sidebar.md)                 | App Shell (Sidebar Navigation)       | Replace the top-header-only nav with a persistent sidebar for every authenticated page.                            |
| [US-41](./phase-11-visual-identity/US-41-homepage-restyle.md)                  | Homepage Restyle                     | Restyle the marketing homepage's hero, feature sections, and pricing table.                                        |
| [US-42](./phase-11-visual-identity/US-42-auth-restyle.md)                      | Auth Pages Restyle                   | Restyle login, register, and password-reset pages to match.                                                        |
| [US-43](./phase-11-visual-identity/US-43-dashboard-restyle.md)                 | Dashboard Restyle                    | Turn the document list into a data table with a stat-card row.                                                     |
| [US-44](./phase-11-visual-identity/US-44-document-detail-restyle.md)           | Document Detail & Share-Link Restyle | Restyle the document detail page and share-link manager.                                                           |
| [US-45](./phase-11-visual-identity/US-45-analytics-restyle.md)                 | Analytics Dashboard Restyle          | Restyle the heatmap, AI-insight callout, and per-viewer engagement list.                                           |
| [US-46](./phase-11-visual-identity/US-46-settings-restyle.md)                  | Settings Restyle                     | Convert Settings from stacked sections to tab navigation.                                                          |
| [US-47](./phase-11-visual-identity/US-47-public-viewer-and-error-states.md)    | Public Viewer & Error States Restyle | Restyle the public viewer, its gates, and every link error state; add product-attribution footer.                  |
| [US-48](./phase-11-visual-identity/US-48-document-detail-responsive-fix.md)    | Document Detail Responsive Fix       | Fix header/share-link action rows overflowing instead of wrapping at narrow viewport widths.                       |
| [US-49](./phase-11-visual-identity/US-49-superadmin-as-settings-subsection.md) | Superadmin as Settings Subsection    | Fold Migrations + Feature Flags into Configurações as superadmin-only tabs; drop the sidebar item.                 |
| [US-50](./phase-11-visual-identity/US-50-auth-tabs.md)                         | Auth Tabs                            | Merge login/register into one tabbed auth card (real navigation between `/login` and `/register`, both URLs kept). |
| [US-51](./phase-11-visual-identity/US-51-document-detail-tabs.md)              | Document Detail Tabs                 | Add a "Visão geral / Análises" tab bar across `/documents/[id]` and its `/analytics` route.                        |

---

## Phase 12 — Activity Feed

| ID                                                               | Title                 | One-sentence description                                                                                                               |
| ---------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [US-52](./phase-12-activity-feed/US-52-activity-feed-backend.md) | Activity Feed Backend | Real `GET /api/v1/activity` (views, link creation, revisits) replacing the Phase 11 frontend-only mock; NDA/blocked-download deferred. |

---

## Technical Debt

| ID                                                       | Title                         | One-sentence description                                                                                            |
| -------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [US-19](./tech-debt/US-19-fix-any-types.md)              | Fix `any` Types               | Replace `any[]` in `DatabaseQuery.values` with a proper `QueryParam` union type.                                    |
| [US-20](./tech-debt/US-20-standardize-error-messages.md) | Standardize Error Messages    | Audit and rewrite all user-facing error messages to consistent pt-BR Portuguese.                                    |
| [US-21](./tech-debt/US-21-env-validation.md)             | Env Variable Validation       | Add startup validation of all required environment variables using Zod, with fast-fail on missing config.           |
| [US-22](./tech-debt/US-22-api-response-envelope.md)      | API Response Envelope         | Wrap all successful API responses in a `{ data, meta }` envelope for consistent client consumption.                 |
| [US-23](./tech-debt/US-23-pagination-helper.md)          | Pagination Helper             | Extract pagination parsing and meta-building into a reusable `infra/pagination.ts` utility.                         |
| [US-24](./tech-debt/US-24-migration-admin-auth.md)       | Migration Endpoint Admin Auth | Protect the migration runner HTTP endpoint with a `MIGRATIONS_SECRET` header token.                                 |
| [US-25](./tech-debt/US-25-updated-at-trigger.md)         | `updated_at` Trigger          | Add a PostgreSQL trigger to auto-update `updated_at` on all tables, removing manual timestamp updates from queries. |
| [US-26](./tech-debt/US-26-ci-typecheck.md)               | CI TypeScript Type-Check      | Add a `tsc --noEmit` step to GitHub Actions CI to catch type regressions on every pull request.                     |
| [US-34](./tech-debt/US-34-investigate-non-pdf-viewer.md) | Investigate Non-PDF Viewer    | Investigation only: confirm why `.docx`/`.pptx` links show no preview and record no views, and recommend a fix.     |

---

## Recommended Implementation Order

For a single developer or agent working sequentially:

1. **Phase 3 (documents core):** US-P3-01 → US-P3-02 → US-P3-03 → US-P3-04
2. **Phase 4 (share links):** US-P4-01 → US-P4-02 → US-P4-03 → US-P4-04
3. **Tech debt (foundation):** US-19 → US-21 → US-23 → US-25 → US-26 → US-24 → US-20 → US-22
4. **Phase 5 (backend analytics):** US-01 → US-02 → US-05 → US-03 → US-04
5. **Phase 6 (frontend):** US-06 → US-07 → US-08 → US-09 → US-10 → US-13 → US-11 → US-12
6. **Phase 7 (AI):** US-14 → US-15 → US-17 → US-18 → US-16
7. **Phase 9 (team workspaces):** US-28 → US-29 → US-30 → US-31 → US-32 → US-33 (strictly sequential — each story's endpoints/migrations are consumed by the next)
8. **Phase 10 (monetization):** US-35 → US-36 → US-37, with US-38 (homepage) buildable any time after the design is settled (no code dependency, just needs the final pricing numbers)
9. **Phase 11 (visual identity):** US-39 → US-40 (strictly sequential — US-40's sidebar shell needs US-39's tokens/fonts, and every later story needs US-40's `app/(app)/` route group to exist), then US-41 → US-47 in parallel — each touches a disjoint page/component set and only depends on US-40, not on each other. US-48, US-49, US-50, and US-51 are post-launch audit fixes: all depend on `main` already having the relevant US-4x restyle merged (via PR #47), and are disjoint from each other.

For parallel teams: Phase 5 and Phase 6 (up to US-11) can be built concurrently. Phase 7 requires US-14 before any other AI story. Phase 9 does not parallelize well — US-31 in particular depends on every model/endpoint from US-28-30 existing first, and US-33 needs US-31/US-32 to have something real to render. Phase 10's US-38 (homepage) can run in parallel with US-35/36/37 — it's copy-only, no shared code.

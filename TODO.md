# Papershare — Product & Engineering Roadmap

> Maintained jointly by PO and TL. Each phase builds on the previous one.
> Phases are ordered by value delivery. Items within a phase are ordered by priority.

---

## Status

| Phase | Name                               | Status                                                                   |
| ----- | ---------------------------------- | ------------------------------------------------------------------------ |
| 1     | Foundation                         | ✅ Done                                                                  |
| 2     | Authorization & Account Management | ✅ Done                                                                  |
| 3     | Documents Core                     | ✅ Done                                                                  |
| 4     | Share Links                        | ✅ Done                                                                  |
| 5     | Analytics & Tracking               | ✅ Done                                                                  |
| 6     | Frontend                           | ✅ Done                                                                  |
| 7     | Engagement, Trust & Growth         | ✅ Done                                                                  |
| 8     | AI Features                        | ✅ Done                                                                  |
| 9     | Team Workspaces & Data Rooms       | ⏳ Partial ("workspaces básico" done; data rooms/custom domain deferred) |
| 10    | Monetization                       | ✅ Done                                                                  |
| 11    | Visual Identity & UI Redesign      | ⏳ In Progress (US-39–40 done; US-41–47 remaining)                       |
| 12    | Activity Feed                      | ⏳ Planned                                                               |
| 13    | Global Links Inventory             | ⏳ Planned                                                               |
| 14    | Contacts / Viewer Directory        | ⏳ Planned                                                               |

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

### Password Recovery

- [x] `POST /api/v1/password-reset` — request a reset link by email; always
      `204` regardless of whether the email is registered (no enumeration),
      rate-limited. `password_reset_tokens` migration (`031`) +
      `models/passwordReset.ts`, same hashed-token-at-rest shape as `sessions`.
- [x] `PATCH /api/v1/password-reset/[token]` — consume the (single-use,
      1-hour) token, set a new password via `models/user.ts#resetPassword`,
      then invalidate every existing session for that user.
- [x] `/forgot-password` and `/reset-password/[token]` frontend pages;
      "Esqueceu sua senha?" link on the login form.

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

## Phase 5 — Analytics & Tracking ✅

**Goal:** Document owners see engagement data for each share link.

### Database

- [x] Migration `007-create-link-views.sql`: `link_views` table (`share_link_id` FK `ON DELETE CASCADE`, `updated_at` for dedup, indexed on `share_link_id`/`created_at`/dedup composite)

### API

- [x] `POST /api/v1/share/[token]/view` — Record view event (public, no password required — the viewer page already gated on the password via the public GET endpoint)
- [x] `GET /api/v1/documents/[id]/links/[linkId]/analytics` — Analytics summary per link (total views, unique viewers, avg time on page, avg pages viewed, first/last viewed, 30-day zero-filled `views_by_day`)
- [x] `GET /api/v1/documents/[id]/analytics` — Aggregated analytics across all links, plus `top_links` (top 5 by view count)
- [ ] Page-level heatmap — deferred; `pages_viewed` is recorded per view but not yet broken down by individual page number

### Model

- [x] `models/linkView.ts` — `recordView`, `getAnalyticsByLinkId`, `getAnalyticsByDocumentId` (raw SQL, `::int`/`::float` casts so aggregates come back as numbers, not the strings `pg` returns for `bigint`/`numeric` by default — same lesson as `documents.size_bytes` in Phase 3)
- [x] `models/shareLink.ts#validateToken()` — existence/active/expiry check without the password gate, reused by view recording

### Tests

- [x] View event recorded correctly (full body, empty body, 404/403 on invalid/expired/revoked link)
- [x] Duplicate fingerprint within 30 min updates the existing row instead of inserting a new one (`SELECT ... FOR UPDATE` in a transaction on a dedicated client, not the shared pool, to close the race window)
- [x] Analytics endpoints return correct aggregations, including zero/null on no-data and `top_links` ordering/limit

---

## Phase 6 — Frontend ✅

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

### Stack decisions made during Block 1

- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix base — not the CLI's newer
  "Base UI" preset; Radix has the `asChild`/`Slot` pattern and far more
  precedent to build against reliably). 15 base components installed under
  `components/ui/`: button, input, label, card, dialog, alert-dialog,
  checkbox, textarea, badge, separator, skeleton, sonner (toast), switch,
  dropdown-menu, avatar. **Reuse these — don't recreate custom versions.**
- **Charts (US-12):** `recharts`, not yet installed — it's what shadcn/ui's
  own chart wrapper is built on, fits better than `chart.js` here.
- **Toasts:** `sonner`, already installed and mounted (`<Toaster />` in
  `app/layout.tsx`). Use `toast()` from the `sonner` package directly.
- **Auth gate pattern for protected pages:** Server Component calls
  `getServerUser()` (`lib/auth-server.ts`) and `redirect("/login")` if null,
  before any HTML renders — established by the landing page
  (`app/page.tsx`), reused for dashboard/documents/analytics/settings.
- **Route paths corrected vs. the original list below:** the public viewer
  is `/view/[token]` (matches `US-11`, not `/share/[token]`) and the
  settings page is `/settings` (matches `US-13`, not `/account`).

### Progress by block (see `user-stories/phase-6-frontend/` for full specs)

- [x] **Block 1** — `GET /api/v1/sessions`, `AuthContext` + SWR (US-06),
      shared Header/Footer + landing page (US-07). Tailwind v4 + shadcn/ui
      set up. `pages/index.tsx`/`pages/status/index.tsx` migrated to
      `app/page.tsx`/`app/status/page.tsx`; `pages/api/v1/*` untouched.
- [x] **Block 2** — Registration & login forms (US-08)
- [x] **Block 3** — Dashboard: document list + upload (US-09)
- [x] **Block 4** — Document detail page + share link manager (US-10)
- [x] **Block 5** — Public PDF viewer (US-11). Added
      `infra/storage.ts#getFile()` (S3 `GetObjectCommand`) and
      `GET /api/v1/share/[token]/file` (public, rate-limited proxy route) —
      neither existed yet; the original spec assumed a local `/uploads/`
      path that was never built (Phase 3 went S3/MinIO-only, see `US-P3-02`).
      **Gotcha:** `pdfjs-dist`'s bundled `.mjs` gets corrupted by Next's
      webpack (`TypeError: Object.defineProperty called on non-object`,
      thrown from inside the library's own module code) — fixed by loading
      both the library and its worker as native ES modules from the jsdelivr
      CDN (`import(/* webpackIgnore: true */ ...)`) instead of importing the
      npm package directly. See `components/viewer/PDFViewer.tsx`.
- [x] **Block 6** — Analytics visualization (US-12) + Account settings (US-13)

### Infrastructure

- [x] Deploy to Vercel (connect GitHub repo, configure env vars) — live at
      papershare.com.br as of 2026-07-15
- [ ] Set up webapp-testing skill (`anthropics/skills`) for automated UI regression tests

### Known test flakiness

- [ ] `tests/orchestrator.ts#createUser()` generates a test username via
      `faker.internet.username()`, which occasionally exceeds the
      `username varchar(30)` column limit and fails the insert
      intermittently. Bound/truncate the generated value to fit the schema.
- [ ] `tests/e2e/` (Playwright, added alongside US-37) runs against `next
dev`, which occasionally serves a corrupted chunk under rapid
      automated navigation — a page-crashing `SyntaxError` unrelated to
      application code. `playwright.config.ts` sets `retries: 2` to absorb
      it. Switching `npm run test:e2e` to `next build && next start` would
      remove the root cause entirely, but needs `.env.development` loaded
      under Next's production-mode env-file convention (`.env`/
      `.env.production`, not `.env.development`) — deferred rather than
      renaming/duplicating the project's env file for this alone.

---

## Phase 7 — Engagement, Trust & Growth ✅

**Goal:** Close the feature gap against the direct competitive set (DocSend,
Papermark, PandaDoc) with the specific capabilities that come up as their
headline differentiators, before investing further in AI or monetization —
these are comparatively low-effort, high-signal wins that also make the
later phases more valuable (better data for AI insights, more to gate
behind a paid plan). Researched 2026-07-15; sources: DocSend/PandaDoc/Papermark
comparisons on papermark.com and digify.com, and 2026 sales-enablement/
e-signature trend coverage (Gartner DSR prediction via heyiris.ai, AI
engagement scoring via cirrusinsight.com).

### Real-time engagement (the single biggest gap vs. the competitive set)

- [x] Email notification to the document owner when a share link is opened
      by a new viewer, mirroring Papermark's "new document notifications".
      `infra/mailer.ts` (Resend, no-op without `RESEND_API_KEY` or in
      `NODE_ENV=test`, matching `infra/storage.ts`'s existing pattern);
      `models/linkView.ts#recordView()` now detects a genuinely new viewer
      (no prior row for that fingerprint on this link, at any time — not
      just outside the 30-min dedup window) and returns `is_new_viewer` on
      the `POST /api/v1/share/[token]/view` response;
      `models/shareLink.ts#getNotificationInfo()` looks up the
      owner/document/link for the email. Fire-and-forget from the route
      handler so a mailer failure never affects the response to the
      anonymous viewer.
- [x] Per-link toggle to mute notifications (not every link is high-stakes).
      Migration `008-add-notify-on-view-to-share-links.sql` adds
      `notify_on_view BOOLEAN NOT NULL DEFAULT TRUE`; exposed on
      create/update (`ShareLinkCreateInput`/`ShareLinkUpdateInput`) and
      checked in the view-recording route before the fire-and-forget
      email. `Switch` in both `CreateShareLinkModal.tsx` and
      `EditShareLinkModal.tsx`, matching the existing `is_active` pattern.
- [x] Per-page time-on-page tracking (not just an aggregate per view) —
      literally DocSend's headline differentiator ("page-level heatmaps
      remain the gold standard" for this category). Migration
      `009-create-link-view-pages.sql` adds `link_view_pages`
      (`link_view_id`, `page_number`, `time_on_page_seconds`, unique on
      `(link_view_id, page_number)` — repeat reports for the same
      view+page accumulate via `ON CONFLICT ... DO UPDATE`, never
      overwrite). `ViewerPage.tsx` tracks per-page dwell time client-side
      (closes out the previous page's timer on every `onPageChange`, plus
      once more on `beforeunload`) and includes it as `page_times` in the
      same `sendBeacon` payload already used for the aggregate
      `time_on_page`. `GET /api/v1/documents/[id]/links/[linkId]/analytics`
      now returns `page_breakdown` (avg time + view count per page number),
      rendered as a bar chart (`PageHeatmapChart.tsx`, recharts) in
      `LinkAnalyticsDrawer.tsx` — per-link only, since a page-by-page
      breakdown doesn't aggregate meaningfully across a document's
      different links. Verified end-to-end in-browser with a 3-page PDF
      (real per-page times matched the chart and tooltip exactly), plus
      130/130 integration tests passing.
- [x] Composite engagement score per viewer (weighted blend of time on
      page, % of pages viewed, return visits, download) surfaced in the
      analytics dashboard — 2026 market trend is scoring viewer interest
      as a single signal instead of raw time-on-page, so sales/investor
      relations teams know who to follow up with first. Migration `018`
      adds `link_views.downloaded`; new per-viewer list in
      `LinkAnalyticsDrawer.tsx` sorted by score. See CHANGELOG for details.

### Trust & access control (needed to compete for data-room / high-stakes use cases)

- [x] Optional NDA/consent gate per share link — viewer must accept a
      custom NDA text and provide name + email before the document loads.
      Migrations `016`/`017` add `share_links.nda_text` +
      `link_views.viewer_name`; enforced last in the gating pipeline,
      independent of the allow-list so both can coexist on the same link.
      NDA text served pre-credential via a new permission-free
      `GET /api/v1/share/[token]/nda` endpoint. See CHANGELOG for details.
- [x] Optional "require email" per share link (today viewing is anonymous
      by fingerprint only) — also what makes the notification feature above
      actually name the viewer. Migrations `011`/`012` add
      `share_links.require_email` + `link_views.viewer_email`; gated via a
      new `X-Viewer-Email` header, checked after the password gate. See
      CHANGELOG for details.
- [x] Dynamic watermark overlay (viewer email + timestamp burned into the
      PDF canvas render) — deters leaking a "confidential" document,
      standard in every data-room competitor. Migration `014` adds
      `share_links.watermark_enabled`; enabling it implies email is
      required, same as the allow-list. See CHANGELOG for details.
- [x] Email allow-list per share link — only pre-approved addresses can
      unlock it, even with the correct password. Migration `013` adds
      `share_link_allowed_emails`; presence of a list implies email is
      required regardless of the `require_email` toggle. See CHANGELOG
      for details.

### Growth / perceived polish

- [x] Open Graph meta tags on public share/view pages so links render as
      a proper preview card in Slack/iMessage/Twitter instead of a bare URL.
      `app/view/[token]/page.tsx` gained `generateMetadata()`; document
      title/description shown even for gated links (title not leaked only
      for revoked/expired/deleted/nonexistent ones). See CHANGELOG for
      details.
- [x] "Duplicate settings" when creating a new share link from an existing
      one (password/expiry/branding), reducing friction for repeat senders.
      New "Duplicar" button on `ShareLinkCard.tsx` opens `CreateShareLinkModal`
      pre-filled from the source link; password can't be carried over (only
      its hash is ever available) so that field starts blank. See CHANGELOG
      for details.
- [x] Custom branding per share link (accent color, welcome message)
      — cheap to build now, becomes a paid-tier hook in Phase 10. Migration
      `015` adds `share_links.brand_accent_color` + `brand_welcome_message`;
      applied only on the "ready" viewer state, not the gate screens. Logo
      upload deferred — out of scope for this pass. See CHANGELOG for details.

---

## Phase 8 — AI Features ✅

**Goal:** Add AI-powered value on top of existing data.

> **Tools to evaluate:** Flowise (drag-and-drop agent builder, fast prototyping) or LangChain (full control, better for RAG pipelines over user documents). Ended up needing neither — a thin shared Anthropic client wrapper (`infra/ai.ts`) was enough for all six stories.

- [x] Auto-summarization on upload (extract text → Claude API → store summary).
      Migration `019` adds `documents.ai_summary`/`ai_summary_generated_at`;
      fire-and-forget after upload, PDF-only extraction for this pass. See
      CHANGELOG for details.
- [x] `GET /api/v1/documents/[id]/summary` — Return AI summary. `POST` to the
      same route regenerates synchronously, rate-limited to 3/hour per user.
      See CHANGELOG for details.
- [x] "Ask about this document" chat interface on the viewer page (RAG).
      `POST /api/v1/share/[token]/chat`, SSE streaming, keyword-based
      retrieval over per-page chunks (migration `022`) — no vector DB for
      this MVP. See CHANGELOG for details.
- [x] Analytics insights: natural language summary of engagement ("Most
      viewers drop off at page 4"). Cached on the document row (migration
      `021`), regenerated only when the underlying analytics change. See
      CHANGELOG for details.
- [x] Improvement suggestions based on engagement drop-off data. Uses real
      per-page data aggregated across a document's links
      (`getPageBreakdownByDocumentId`) rather than the `avg_pages_viewed`
      estimate originally scoped here — Phase 7's per-page tracking landed
      after this item was written, so the more precise version was cheap to
      build instead. See CHANGELOG for details.
- [x] AI-drafted follow-up email suggestion for the document owner, based on
      a viewer's engagement score and the page they dropped off at (depends
      on Phase 7's per-page tracking + engagement score) — matches the 2026
      "content intelligence" trend: knowing what to say next, not just what
      was viewed. Spec written this session as
      `user-stories/phase-7-ai/US-27-followup-email-suggestion.md`. See
      CHANGELOG for details.

---

## Phase 9 — Team Workspaces & Data Rooms ⏳

**Goal:** Move beyond single-user accounts toward the collaborative,
multi-document product shape that DocSend/Papermark call a "data room" —
the recognized format for M&A, fundraising, and due-diligence sharing
(a growing, high-willingness-to-pay niche). This is a bigger structural
change than Phase 7/8 (touches the ownership model throughout the app), so
it's sequenced after the lower-effort wins above.

> Design validated and detailed stories written 2026-07-16:
> `docs/plans/2026-07-16-team-workspaces-design.md` (key decisions +
> rationale) and `user-stories/phase-9-workspaces/US-28` through `US-33`
> (implementation-ready specs). The first slice ("workspaces básico") is
> scoped below; data rooms and custom domain are deliberately deferred to
> a later slice of this same phase.

- [x] **Workspaces básico** — multi-user workspaces with invite, shared
      document library, and role-based permissions (owner/editor/viewer of
      the workspace itself). Every user gets an automatic personal
      workspace at registration; documents always belong to exactly one
      workspace (no more direct user ownership). Broken into 6 stories:
  - [x] US-28 — Workspace data model & migration (`workspaces`,
        `workspace_members`, `documents.workspace_id` backfill,
        `users.active_workspace_id`). See CHANGELOG for details.
  - [x] US-29 — Workspace CRUD + switching (create/list/rename/delete,
        `.../activate`). See CHANGELOG for details.
  - [x] US-30 — Member invitation & role management (invite by email —
        existing accounts only, no token/accept flow — role change,
        remove/leave, last-owner protection). See CHANGELOG for details.
  - [x] US-31 — Document & share-link authorization migrates from direct
        `user_id` ownership to workspace role checks. See CHANGELOG for
        details.
  - [x] US-32 — AI features resolve the workspace creator's key instead of
        the document uploader's. See CHANGELOG for details.
  - [x] US-33 — Frontend: header workspace switcher, workspace-creation
        modal, "Equipe" settings tab, "Enviado por" on document cards. See
        CHANGELOG for details.
- [ ] Data rooms: group multiple documents into one named collection with
      a single shareable link, with per-document and per-recipient
      permission overrides (e.g. recipient A can download the term sheet
      but only view the cap table) — next slice of this phase, not yet
      scoped into stories
- [ ] Custom domain per workspace (e.g. `docs.yourcompany.com`) for
      white-labeled sharing — pairs with Phase 7's custom branding — not
      yet scoped into stories

---

## Phase 10 — Monetization ⏳

**Goal:** Gate premium features behind a paid plan, scoped per workspace
(not per user) since documents/links already belong to `workspace_id`
since Phase 9.

> Design validated with the user 2026-07-17:
> `docs/plans/2026-07-17-monetization-design.md` (key decisions +
> rationale) and `user-stories/phase-10-monetization/US-35` through
> `US-38` (implementation-ready specs).

> **Tools:** Stripe for subscriptions (Checkout + Customer Portal, BRL). Real billing launch, not just infrastructure — no grandfathering needed since there are no paying users yet.

- [x] US-35 — Billing infrastructure: `subscriptions` table
      (`workspace_id`-scoped), `infra/stripe.ts`, `models/subscription.ts`,
      checkout/portal endpoints, signed webhook handler. See CHANGELOG for
      details.
- [x] US-36 — Plan gating: Free capped at 10 documents/10 active links;
      watermark/NDA/allow-list/branding/engagement-score become Pro-only;
      downgrades keep existing data working, just block new creation. See
      CHANGELOG for details.
- [x] US-37 — Frontend: "Faturamento" settings tab, usage display,
      upgrade/manage-subscription buttons, disabled states on
      gated fields/actions instead of dead-end submits. See CHANGELOG for
      details.
- [x] US-38 — Homepage revamp: replace the Phase-6-era 3-card grid with a
      full themed feature showcase (covering everything shipped through
      Phase 9) plus a Free/Pro/Business pricing table. See CHANGELOG for
      details.
- [x] Soft-launch safety switch: real billing isn't ready to expose to
      every user yet (see the production checklist below), so US-35–38's
      checkout/portal are gated behind a new `billing_stripe` feature flag
      (`/superadmin/feature-flags`, superadmin-only, off by default) — the
      Faturamento tab's action buttons route to `/em-breve` instead of
      calling the API until a superadmin turns it on. See CHANGELOG for
      details.

### Production checklist — before enabling `billing_stripe`

All Dashboard/Vercel setup, no code changes:

- [ ] Finish Stripe account activation in **live mode** (business details,
      bank account for payouts) — Stripe won't process real charges until
      this is done
- [ ] Create the Pro and Business Price objects in **live mode**
      (separate from the test-mode ones used in `.env.development`) —
      note the new `price_...` IDs
- [ ] Register a **live** webhook endpoint (Dashboard → Developers →
      Webhooks) at `https://<domínio>/api/v1/webhooks/stripe`, subscribed
      to at least `customer.subscription.created`/`.updated`/`.deleted`
      and `invoice.payment_failed` — copy the signing secret
- [ ] Configure the **Customer Portal** (Settings → Billing → Customer
      portal) — business info/logo, which plans customers can switch
      between, cancellation policy — the "Gerenciar assinatura" button
      needs this configured at least once
- [ ] Set `STRIPE_SECRET_KEY` (`sk_live_...`), `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` on Vercel's
      **Production** environment specifically (Preview can keep the
      test-mode values)
- [ ] Only then, flip `billing_stripe` on via `/superadmin/feature-flags`

**Deliberately still deferred** (not blockers for the above): Stripe
Tax/`automatic_tax` — no registration yet, enabling it without one
silently collects R$0 tax (see the Stripe follow-ups note below). Boleto
and PIX are a one-click optional add (Settings → Payment methods)
whenever wanted, no code change either way.

### Plans

- **Free** — 10 documents, 10 active share links per workspace, no
  watermark/NDA/allow-list/branding/engagement score.
- **Pro** — R$29/mês — unlimited documents/links, watermarking, NDA
  gate, email allow-list, custom branding, engagement scoring.
- **Business** — R$99/mês — everything in Pro + team workspaces (already
  built); data rooms and custom domain fold in automatically once those
  ship in a later slice, no billing rework needed then.

---

## Phase 11 — Visual Identity & UI Redesign ⏳

**Goal:** Replace the current all-neutral shadcn default theme (grayscale
only, stock Inter font, zero brand color — unchanged since Phase 6
scaffolding) with a real visual identity, applied across every existing
screen. This phase is a restyle only — no new functionality, no new
endpoints, no schema changes. New features discovered alongside this
design are scoped as their own phases below (12–14) so this phase stays
mergeable on its own and doesn't block on unrelated backend work.

> Source of truth: a Claude-generated design prototype
> (`Papershare Standalone.html`, reviewed 2026-07-20) covering the
> homepage, dashboard, document detail, analytics, activity, links,
> contacts, settings, and public-viewer/error states. Key tokens pulled
> from it: warm cream background + terracotta/rust accent (`oklch(0.58
0.16 38)`, i.e. an accent hue around 38°), `Source Serif 4` for
> headings paired with `Manrope` for body text (replacing `Inter`
> everywhere), `0.5rem`–`0.625rem` corner radii.
>
> Design validated and detailed stories written 2026-07-21:
> `docs/plans/2026-07-21-visual-identity-design.md` (key decisions +
> rationale, including the full color/typography spec) and
> `user-stories/phase-11-visual-identity/US-39` through `US-47`
> (implementation-ready specs). Sidebar nav ships with only
> Documentos/Configurações for now — Atividade/Links/Contatos are added
> by Phases 12–14 respectively, not built as placeholders here. No
> Google OAuth (the prototype's login button is decorative only).

- [x] **Design tokens** (US-39) — replace `app/globals.css`'s neutral-only
      shadcn theme with the new color system (background, accent, chart
      colors all currently grayscale) and typography (`Source Serif 4` +
      `Manrope`, replacing `next/font/google`'s `Inter`); also finishes
      the previously-half-installed dark mode wiring. See CHANGELOG.
- [x] **App shell** (US-40) — persistent left sidebar (workspace switcher +
      Documentos/Configurações nav, Atividade/Links/Contatos added when
      Phases 12–14 ship) replacing today's top-header-only nav, for every
      authenticated page — this is the shell those phases' new pages will
      live in. See CHANGELOG.
- [ ] **Marketing homepage** (`/`) — restyle the US-38 feature sections +
      pricing table to the new visual language; hero copy/layout revamp
- [x] **Auth** (`/login`, `/register`) — restyle to match (US-42). See CHANGELOG.
- [ ] **Dashboard** (`/dashboard`) — document list becomes a data table
      (Nome/Visualizações/Links/Pontuação/Atualizado) with a per-document
      aggregate score column, replacing the current card grid; add a
      stat-card row (Documentos, Visualizações · 7 dias, Links ativos,
      Engajamento médio) with trend deltas vs. the prior period
- [ ] **Document detail & share-link manager** (`/documents/[id]`) —
      restyle, no behavior change
- [x] **Analytics dashboard** (`/documents/[id]/analytics`, US-45) —
      restyle the heatmap, per-viewer engagement list, and AI-insight
      callout. See CHANGELOG.
- [ ] **Settings** (`/settings`) — restyle Perfil/Chave de IA/Equipe/
      Faturamento/Zona de perigo to the new visual language (prototype
      uses tab-based navigation instead of today's stacked sections)
- [ ] **Public-facing pages** (`/view/[token]`) — restyle the viewer, the
      password/NDA gates, and add a "Desenvolvido com Papershare" footer
      (new: light product-attribution branding on pages seen by people
      who aren't Papershare customers themselves)
- [ ] **Error/empty states** — restyle (expired-link page confirmed in
      the prototype; audit for other states — 404, revoked link, etc. —
      while in there)

**Story breakdown** (see `user-stories/phase-11-visual-identity/`):
US-39 (design tokens + finishing the dark-mode wiring) → US-40 (app
shell / sidebar — the one item every other page in this phase depends
on) → US-41 through US-47 (homepage, auth, dashboard, document detail,
analytics, settings, public viewer/error states — each independent of
the others once US-40 lands).

---

## Phase 12 — Activity Feed ⏳

**Goal:** One reverse-chronological, cross-document feed of everything
happening in a workspace — views, NDA acceptances, link creation, blocked
download attempts, revisits — grouped by day (Hoje/Ontem/Esta semana), so
an owner doesn't have to open each document individually to know what
just happened. Confirmed as a genuinely new capability (doesn't exist
today) while reviewing the Phase 11 design prototype's "Atividade" page.

- [ ] Aggregation query joining `link_views`, `share_links`, NDA
      acceptances, and blocked-download attempts, scoped to a workspace
      and ordered by `created_at desc`
- [ ] `GET /api/v1/workspaces/[id]/activity` (paginated) — new endpoint,
      new response shape (`types/index.ts`); no new tables expected, this
      reads from data Phase 5/7 already record
- [ ] Frontend: `/atividade` page grouped by day, one row per event with
      an icon + description matching its type (view, NDA accept, link
      created, download blocked, revisit)
- [ ] Depends on Phase 11's app-shell sidebar (this is one of its nav
      destinations)

---

## Phase 13 — Global Links Inventory ⏳

**Goal:** One page listing every share link across every document in a
workspace — label/document/view-count/status — instead of only being able
to see a document's links from inside that document's own detail page.
Confirmed as new (today's `ShareLinkList` is always scoped to a single
document) while reviewing the prototype's "Links" page.

- [ ] `GET /api/v1/workspaces/[id]/links` — new endpoint joining
      `share_links` → `documents`, scoped to the workspace, returning
      document title alongside each link's existing fields
- [ ] Frontend: `/links` page — table (link, document, views, status) +
      copy-link action per row
- [ ] Depends on Phase 11's app-shell sidebar

---

## Phase 14 — Contacts / Viewer Directory ⏳

**Goal:** Turn per-link viewer analytics (Phase 5/7, currently scoped to
one link at a time) into a workspace-wide contact directory: group a
recipient's activity by email across every document/link they've
touched, showing document count, last-seen, and a blended engagement
score — plus surface the existing AI follow-up-email suggestion (US-27)
directly from this directory instead of only from a single link's
analytics view. Confirmed as new (no cross-document viewer identity
exists today — `ViewerEngagement` is always scoped to one link) while
reviewing the prototype's "Contatos" page.

- [ ] Aggregation query: group `link_views` by `viewer_email` across the
      workspace, computing distinct-document count, most recent view,
      and a blended engagement score across all their views
- [ ] `GET /api/v1/workspaces/[id]/contacts` — new endpoint
- [ ] Frontend: `/contatos` page — one row/card per contact, "Gerar
      follow-up" wired to the existing follow-up-email endpoint (US-27)
- [ ] Known limitation to call out in the design doc: a viewer only has
      an email on file if the link required one (NDA gate or
      `require_email`) — fingerprint-only anonymous viewers won't appear
      here, so this directory is necessarily a subset of total viewers,
      not everyone
- [ ] Depends on Phase 11's app-shell sidebar

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
  - [x] Extended (2026-07-15): `users.is_superadmin` column + `/superadmin/migrations` page, so a logged-in superadmin session works as an alternative to the secret header. Named "superadmin" (not "admin") to stay distinct from any future customer-facing admin role. No API/UI grants superadmin — promotion is a manual SQL `UPDATE`, documented in `CLAUDE.md`, to keep real emails out of this public repo's committed code.
- [ ] Add `updated_at` trigger function in migrations (currently updated manually)
- [x] CI: add TypeScript type-check step to GitHub Actions — `typecheck` job in `.github/workflows/linting.yaml`
- [ ] Non-PDF documents (`.docx`/`.pptx`) show a "preview not available" message in the public viewer instead of any content, and — because `ViewerPage.tsx`'s non-PDF branch skips the file fetch entirely — never record a view either, so their analytics stay at zero regardless of real traffic. Spec written to investigate root cause and evaluate fix options (client-side rendering, server-side PDF conversion, third-party embed, or just fixing the view-tracking gap and keeping the download-only fallback) before committing to an approach: `user-stories/tech-debt/US-34-investigate-non-pdf-viewer.md`.

### Security hardening (2026-07-12)

- [x] Fixed `UnathorizedError` typo → `UnauthorizedError` (was baked into the API error contract)
- [x] Hash session tokens before persisting (`models/session.ts`) — DB now stores SHA-256 hash, never the raw bearer token
- [x] Explicit `sameSite: "lax"` on all session cookies
- [x] Backstop against the check-then-insert race on unique username/email: unique-violation (`23505`) from Postgres is now caught and mapped to `ValidationError` in `models/user.ts`
- [ ] Rate limiter (`infra/rate-limit.ts`) uses an in-memory `Map` and is a no-op outside `NODE_ENV=production` — doesn't survive multi-instance/serverless deploys (e.g. Vercel) and isn't exercised by CI. Needs a shared store (e.g. a Postgres-backed counter, consistent with this project's no-extra-infra approach) before relying on it in production.
- [ ] DB connection pool in `infra/database.ts` is created at module scope — fine for a long-running Docker/Node process, but a serverless deploy target needs a pooled connection strategy (e.g. Neon's pooled connection string or a serverless driver) decided before Phase 3 adds more I/O-heavy endpoints.

### Stripe / billing (2026-07-17)

Follow-ups from a best-practices review of US-35 (`infra/stripe.ts`) against Stripe's own integration guidance — all Stripe Dashboard configuration, no code changes needed for these three:

- [ ] Replace the raw secret key (`sk_...`) used for `STRIPE_SECRET_KEY` with a Restricted API Key (`rk_...`) scoped to only what this app calls: Checkout Sessions (write), Billing Portal Sessions (write), Subscriptions (read), Customers (read). Limits blast radius if the key ever leaks.
- [ ] Enable Boleto and PIX in Stripe Dashboard → Settings → Payment methods. `checkout.sessions.create()` already omits `payment_method_types` (correct — lets Stripe pick dynamically), so this alone makes both available to Brazilian customers with no code change, likely relevant for Business-tier B2B checkout.
- [ ] Confirmed no separate Invoicing API integration needed for now — every subscription already generates an Invoice automatically each billing cycle via Stripe Billing. Revisit only if a need for one-off/custom invoices outside the subscription cycle comes up.
- [ ] **Tax not implemented — deliberately deferred.** No `automatic_tax` on the checkout session; confirmed with the user (2026-07-17) there's no active Stripe Tax registration yet, and enabling `automatic_tax` without one silently collects R$0 tax with no error (the most common Stripe Tax mistake). Before implementing: (1) confirm with an accountant whether Stripe Tax actually covers Brazilian domestic tax obligations (ISS/ICMS/PIS-COFINS) — Stripe Tax's core strength is US sales tax/EU VAT/UK VAT, and Brazil's coverage needs to be checked against Stripe's current supported-countries list, not assumed; (2) only then add a registration via the Tax Registrations API/Dashboard and turn on `automatic_tax: { enabled: true }` on the Checkout Session.

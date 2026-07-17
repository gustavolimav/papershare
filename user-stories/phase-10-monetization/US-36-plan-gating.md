# US-36 — Plan Gating: Document/Link Limits & Feature Flags

---

**User Story: Plan Gating**

**As a** Papershare operator,
**I want** Free-plan workspaces capped at 10 documents/10 active links and blocked from Pro-only features,
**So that** the Pro/Business plans built in US-35 actually have something worth paying for.

**Acceptance Criteria:**

- [ ] `models/document.ts#create()`: after the existing `workspace.requireRole(input.workspace_id, input.user_id, "editor")` check, count the workspace's non-deleted documents (`SELECT COUNT(*) FROM documents WHERE workspace_id = $1 AND deleted_at IS NULL`); if `getPlanForWorkspace(workspace_id) === "free"` and the count is `>= 10`, throw `PaymentRequiredError` with a message naming the limit and an `action` pointing at `/settings` (Faturamento tab).
- [ ] `models/shareLink.ts#create()`: after the existing `workspace.requireRole(..., "editor")` check, count `is_active = true` links across every share link belonging to documents in that workspace; on Free with count `>= 10`, throw `PaymentRequiredError`.
- [ ] `models/shareLink.ts#create()` and `updateById()`: if the resolved input would set `watermark_enabled: true`, a non-null `nda_text`, a non-empty `allowed_emails` array, or a non-null `brand_accent_color`/`brand_welcome_message`, and the workspace's plan is `"free"`, throw `PaymentRequiredError` naming the specific feature (e.g. "Marca d'água é um recurso do plano Pro."). Check each gated field independently so the error names the _first_ one actually being set, not a generic "upgrade" message. Setting these fields to `false`/`null`/empty (i.e. turning a feature _off_) is never gated — only enabling counts.
- [ ] `GET /api/v1/documents/[id]/links/[linkId]/analytics`: resolve the link's workspace plan; if `"free"`, the response's `viewers` field is `null` instead of the computed engagement-score array (the rest of the response — aggregate stats, page breakdown — is unaffected, since those aren't gated).
- [ ] `WorkspaceWithRole` (in `types/index.ts`) gains `plan: SubscriptionPlan`, `document_count: number`, `active_link_count: number`. `models/workspace.ts#findAllByUserId()`'s SQL gains three more selected subquery columns (same pattern as `member_count`/`ai_configured` from US-32/33): plan resolved via a `LEFT JOIN subscriptions` + `CASE`, document count via a correlated subquery on `documents`, active link count via a correlated subquery joining `share_links`/`documents`.
- [ ] Integration tests (new `tests/integration/api/v1/documents/plan-gating.test.ts` or extending `workspace-authorization.test.ts`):
  - A Free-plan workspace (no `subscriptions` row) can upload exactly 10 documents; the 11th returns `402` with `name: "PaymentRequiredError"`.
  - A Free-plan workspace can create exactly 10 active share links across its documents; the 11th returns `402`.
  - Revoking a link (making it `is_active = false`) frees up a slot — the count that matters is _active_ links, not total ever created.
  - Attempting to create a share link with `watermark_enabled: true` on a Free workspace returns `402`; the same request on a workspace with a `subscriptions` row (`plan: "pro"`, `status: "active"`, inserted directly via `database.query` — no real Stripe call needed for this test) succeeds.
  - Same 402/success pair for `nda_text`, `allowed_emails`, `brand_accent_color`.
  - `PATCH` on an existing share link that already has `watermark_enabled: true` (set back when the workspace was Pro) to change an unrelated field (e.g. `label`) succeeds on a since-downgraded Free workspace — only _newly enabling_ a gated field is blocked, not editing other fields on a link that already has one set. Explicitly setting `watermark_enabled: false` also succeeds (turning off is never gated).
  - `GET .../analytics` on a Free-plan link's engagement data returns `viewers: null`; the same call on Pro/Business returns the real array.
  - Downgrade scenario: a Pro-plan workspace with 15 documents receives a simulated `status: "canceled"` update (via `upsertFromStripeEvent`, not a real webhook call — that's covered in US-35's own tests); all 15 documents remain `GET`-able and deletable, but a 16th upload returns `402`.

**Technical Context:**

- Relevant files:
  - `models/document.ts` _(modify — `create()`)_
  - `models/shareLink.ts` _(modify — `create()`, `updateById()`)_
  - `models/workspace.ts` _(modify — `findAllByUserId()` SQL)_
  - `pages/api/v1/documents/[id]/links/[linkId]/analytics/index.ts` _(modify — gate `viewers`)_
  - `types/index.ts` _(modify — `WorkspaceWithRole`)_
  - `tests/integration/api/v1/documents/plan-gating.test.ts` _(create)_
- Depends on: US-35 (`models/subscription.ts#getPlanForWorkspace()`, `PaymentRequiredError`, the `subscriptions` table to insert test rows into directly).
- This story is backend-only — no UI. A Free-plan user hitting these limits today (before US-37 ships) would see a raw `402` with no inline warning; that's expected and temporary, matching how earlier phases in this codebase have sequenced "enforce first, surface in UI next."

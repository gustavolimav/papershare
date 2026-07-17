# Phase 10 — Monetization: Design

**Status:** Validated with the user on 2026-07-17. Ready for implementation.

**Scope:** real Stripe billing (not just infrastructure — checkout is meant
to go live), three tiers (Free/Pro/Business), scoped per workspace, plus a
homepage revamp so the product's full feature set (built across Phases
3-9) is actually visible before someone hits a paywall.

---

## Key decisions

| Decision                           | Choice                                                                                                | Why                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Billing scope                      | Per **workspace**, not per user                                                                       | Documents/links already belong to `workspace_id` since Phase 9; Business tier is inherently team-shared, so a workspace-scoped plan needs no separate "who's billed for the team" concept. |
| Plan storage                       | No row = Free; a `subscriptions` row only exists once a workspace starts a checkout                   | Avoids a backfill migration for every existing workspace — there are no real paying users yet, so there's nothing to preserve.                                                             |
| Existing free features             | Watermark, NDA, allow-list, branding, engagement score move behind Pro immediately, no grandfathering | No real paying users yet, so nobody is "losing" something they paid for.                                                                                                                   |
| Pricing                            | Pro R$29/mês, Business R$99/mês, monthly only (no annual yet)                                         | Accessible pricing for the Brazilian market with a thin margin at launch; annual billing can be added later without reworking the data model (just a second Stripe Price per plan).        |
| Free tier limits                   | 10 documents, 10 active share links per workspace                                                     | Generous enough to actually use the product before hitting a wall, unlike a 3/3 cap that pushes conversion too aggressively for a brand-new product.                                       |
| Downgrade/payment-failure behavior | Existing documents/links over the limit keep working; only _creating new ones_ is blocked             | Nobody loses access to what they already have — matches the non-punitive tone of the rest of the product (e.g. soft-delete everywhere, no destructive defaults).                           |
| Billing management                 | Workspace owner only                                                                                  | Same role that already gates rename/delete/member-management (`requireRole(..., "owner")`) — no new permission concept needed.                                                             |
| Checkout mechanism                 | Stripe Checkout (hosted) + Stripe Customer Portal, BRL                                                | Papershare never touches card data directly (no PCI scope); Portal handles cancel/plan-change/invoice-history for free.                                                                    |

## Data model

New migration `029-create-subscriptions.sql`:

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id),
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

`plan` is `'pro' | 'business'` — never `'free'`; Free is the absence of a
row. `UNIQUE` on `workspace_id` — one row per workspace, upserted by the
webhook handler rather than inserted fresh on every event.

New `models/subscription.ts`:

- `getPlanForWorkspace(workspaceId): Promise<"free" | "pro" | "business">`
  — resolves from the row if `status === "active"`; any other status
  (`past_due`, `canceled`, `incomplete`) resolves to `"free"`.
- `PLAN_LIMITS` — a plain constant map: `free` gets `{ maxDocuments: 10,
maxActiveLinks: 10, features: [] }`; `pro`/`business` get `{
maxDocuments: null, maxActiveLinks: null, features: ["watermark", "nda",
"allowlist", "branding", "engagement_score"] }` (`null` = unlimited).
- `upsertFromStripeEvent()` — writes/updates the row from a verified
  Stripe webhook event.

`WorkspaceWithRole` (already returned by `GET /api/v1/workspaces`) gains
`plan`, `document_count`, `active_link_count` — same pattern `member_count`/
`ai_configured` used in US-32/33, so the frontend gets usage data
everywhere workspaces are already fetched via `useWorkspaces()`, no new
request needed.

## Stripe integration

New env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` (Price objects created
manually in the Stripe dashboard in BRL, not via API/migration — same
spirit as external service config living in env vars elsewhere in this
app). `infra/stripe.ts` wraps the `stripe` SDK with a
`requireStripeConfigured()` guard, mirroring `infra/ai.ts`'s degrade-
gracefully pattern for local dev/CI where these vars won't be set.

- `POST /api/v1/workspaces/[id]/billing/checkout` — owner-only. Body
  `{ plan: "pro" | "business" }`. Creates a Stripe Checkout Session
  (`mode: "subscription"`, BRL, `client_reference_id` = workspace ID),
  returns `{ url }`.
- `POST /api/v1/workspaces/[id]/billing/portal` — owner-only. Creates a
  Stripe Customer Portal session for the workspace's
  `stripe_customer_id`, returns `{ url }`. 404s if the workspace has
  never subscribed.
- `POST /api/v1/webhooks/stripe` — public, verifies the `stripe-
signature` header against `STRIPE_WEBHOOK_SECRET` before touching
  anything (the one endpoint where forging a request would grant a free
  paid plan, so this check is never optional). Handles
  `checkout.session.completed` (create the row),
  `customer.subscription.updated` (sync `plan`/`status`/
  `current_period_end`), `customer.subscription.deleted` (`status =
"canceled"`), `invoice.payment_failed` (`status = "past_due"`).

## Feature gating enforcement

New `PaymentRequiredError` (402) in `infra/errors.ts` + its dispatch
branch in `infra/controller.ts` — same pattern as `ConflictError` (409)
from US-30. Carries a pt-BR `message` and an `action` telling the user
what to do.

- `models/document.ts#create()` — after the existing `requireRole(...,
"editor")` check, count the workspace's non-deleted documents; on
  `"free"` with count `>= 10`, throw.
- `models/shareLink.ts#create()` — same shape, counting `is_active =
true` links for the document's workspace, capped at 10 on Free.
- `models/shareLink.ts#create()`/`updateById()` — if the input sets
  `watermark_enabled: true`, a non-null `nda_text`, non-empty
  `allowed_emails`, or non-null `brand_accent_color`/
  `brand_welcome_message`, and the workspace is `"free"`, throw naming
  the specific feature.
- Engagement score is a _read_, not a _write_ — a hard 402 on the whole
  analytics endpoint would break non-gated analytics too. Instead `GET
.../links/[linkId]/analytics` omits the `viewers` array (`null`) for
  Free-plan workspaces, same "degrade gracefully" shape used for AI
  features when a key isn't configured.

## Frontend

- New "Faturamento" tab in `/settings` (same insertion pattern as "IA"/
  "Equipe"): current plan + usage line for Free ("7 de 10 documentos · 3
  de 10 links ativos", from `useWorkspaces()`'s new fields, no extra
  fetch). Owner-only "Assinar Pro"/"Assinar Business" buttons →
  `POST .../billing/checkout` → redirect to the Stripe URL; a "Gerenciar
  assinatura" button once subscribed → `.../billing/portal`. Non-owners
  get a read-only view, mirroring the "Equipe" tab's owner-gating.
- `DocumentList.tsx`'s upload zone and `ShareLinkList.tsx`'s "Criar link"
  gain a companion **limit** check alongside the existing `canEdit` role
  check: hidden/disabled with an inline upgrade hint when the workspace
  is at its Free-tier cap, instead of only discovering it via a 402
  after submitting.
- The watermark/NDA/allow-list/branding fields in the share-link modals
  render disabled with the same inline hint on Free.
- After a successful Checkout redirect back (`?checkout=success`), a
  toast + `mutate(WORKSPACES_KEY)` refreshes the plan immediately.

## Homepage revamp

`app/page.tsx` is still the 3-card version from Phase 6 Block 1 — it
predates AI features, engagement scoring, security controls, and team
workspaces. Restructured into:

1. Hero (kept, lightly reworded).
2. Feature showcase grouped by theme instead of a flat grid:
   _Documentos & Compartilhamento_, _Segurança & Confiança_ (NDA,
   allow-list, watermark, branding), _Analytics & IA_ (heatmap,
   engagement score, resumo automático, chat, insights), _Equipe_
   (workspaces, papéis, "Enviado por").
3. Pricing table — Free / Pro (R$29) / Business (R$99), each with a CTA
   to `/register`.
4. Final CTA section (kept).

## Testing

`infra/stripe.ts` is Jest-mocked at the SDK boundary (no real Stripe
calls in CI, same spirit as `infra/mailer.ts`'s no-op pattern).
Checkout/portal routes are tested for request shape (owner-only,
workspace-not-found). The webhook handler is tested with hand-built
Stripe event payloads signed via `stripe.webhooks.generateTestHeaderString`
against the test `STRIPE_WEBHOOK_SECRET`, so signature verification is
actually exercised, not bypassed. Limit/feature tests: a Free workspace
uploading an 11th document or setting `watermark_enabled` 402s; a
Pro-plan workspace (row inserted directly via `database.query`, no real
Stripe call) allows both. Downgrade test: a Pro workspace with 15 docs
receives a `customer.subscription.deleted` webhook — all 15 stay
`GET`-able, but a 16th upload 402s.

## User stories

Written to `user-stories/phase-10-monetization/`: US-35 through US-38,
covering (1) the data model + Stripe infrastructure (subscriptions table,
`infra/stripe.ts`, checkout/portal/webhook endpoints), (2) plan-limit and
feature gating on documents/share links, (3) the frontend billing surface
and usage-aware UI, and (4) the homepage revamp — in that dependency
order (gating needs the plan-resolution helper from story 1; the frontend
needs something real to render from stories 1-2).

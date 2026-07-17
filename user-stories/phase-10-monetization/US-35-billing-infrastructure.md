# US-35 — Billing Infrastructure: Subscriptions, Stripe, Checkout & Webhook

---

**User Story: Billing Infrastructure**

**As a** workspace owner,
**I want** to subscribe my workspace to a paid plan through Stripe and have that reflected in Papershare automatically,
**So that** I can unlock Pro/Business features without Papershare ever having to touch my card details.

**Acceptance Criteria:**

- [ ] New migration `029-create-subscriptions.sql`: `subscriptions` table — `id` (UUID PK), `workspace_id` (UUID, `NOT NULL`, `UNIQUE`, FK `workspaces(id)`), `stripe_customer_id` (`VARCHAR(255)`, `NOT NULL`), `stripe_subscription_id` (`VARCHAR(255)`, `NOT NULL`), `plan` (`VARCHAR(20)`, `NOT NULL` — `'pro'` or `'business'`, never `'free'`), `status` (`VARCHAR(20)`, `NOT NULL` — `'active'` / `'past_due'` / `'canceled'` / `'incomplete'`), `current_period_end` (`TIMESTAMPTZ`, `NOT NULL`), `created_at`/`updated_at` (standard convention). No row for a workspace means Free — do not backfill existing workspaces with a row.
- [ ] `types/index.ts`: `Subscription` interface matching the table; `SubscriptionPlan = "free" | "pro" | "business"`; `SubscriptionModel` type for the new model.
- [ ] New `infra/stripe.ts`: thin wrapper around the `stripe` npm SDK. Reads `STRIPE_SECRET_KEY` from env; a `requireStripeConfigured()` guard throws `ServiceError` (503) if unset, mirroring `infra/ai.ts`'s pattern so local dev/CI without Stripe configured degrade gracefully rather than crashing at import time.
- [ ] New `models/subscription.ts`:
  - `getPlanForWorkspace(workspaceId: string): Promise<SubscriptionPlan>` — looks up the `subscriptions` row for the workspace; returns `"free"` if no row exists or `status !== "active"`; otherwise returns the row's `plan`.
  - `PLAN_LIMITS` constant: `{ free: { maxDocuments: 10, maxActiveLinks: 10, features: [] }, pro: { maxDocuments: null, maxActiveLinks: null, features: ["watermark", "nda", "allowlist", "branding", "engagement_score"] }, business: { maxDocuments: null, maxActiveLinks: null, features: [...same as pro] } }` (`null` = unlimited).
  - `upsertFromStripeEvent(input: { workspaceId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd })` — `INSERT ... ON CONFLICT (workspace_id) DO UPDATE`.
  - `getByWorkspaceId(workspaceId): Promise<Subscription | null>` — for the portal-session lookup.
- [ ] New `PaymentRequiredError` (402) in `infra/errors.ts`, with its dispatch branch in `infra/controller.ts#onErrorHandler` (same pattern as `ConflictError`/409 from US-30). Takes `message` (pt-BR) and optional `action`.
- [ ] `POST /api/v1/workspaces/[id]/billing/checkout` — requires auth + `workspace.requireRole(id, userId, "owner")`. Body validated with a new Zod schema: `{ plan: z.enum(["pro", "business"]) }`. Creates a Stripe Checkout Session (`mode: "subscription"`, `currency: "brl"`, the correct `STRIPE_PRICE_ID_PRO`/`STRIPE_PRICE_ID_BUSINESS` env var as the line item, `client_reference_id: workspaceId`, success/cancel URLs pointing back at `/settings?checkout=success`/`?checkout=canceled`). Returns `{ url: string }` (201).
- [ ] `POST /api/v1/workspaces/[id]/billing/portal` — requires auth + `requireRole(id, userId, "owner")`. Looks up the workspace's `subscriptions` row; `404`s (`NotFoundError`) if none exists (nothing to manage yet). Creates a Stripe Customer Portal session for `stripe_customer_id`, returns `{ url: string }` (201).
- [ ] `POST /api/v1/webhooks/stripe` — public route (no `authMiddleware`), reads the raw request body (Stripe signature verification needs the exact bytes, not a re-serialized JSON parse — use Next's `bodyParser: false` config for this route and read the raw stream), verifies `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` via `stripe.webhooks.constructEvent()`. Returns `400` on a missing/invalid signature _before_ touching the database. Handles:
  - `checkout.session.completed` — reads `client_reference_id` (workspace ID), `customer` (Stripe customer ID), and the subscription ID from the session; calls `upsertFromStripeEvent()` with `status: "active"`, `plan` resolved from which Price ID was purchased.
  - `customer.subscription.updated` — resolves the workspace by `stripe_subscription_id` (looked up, not trusted from event metadata alone), syncs `plan`/`status`/`current_period_end`.
  - `customer.subscription.deleted` — sets `status: "canceled"`.
  - `invoice.payment_failed` — sets `status: "past_due"`.
  - Any other event type: `200` no-op (Stripe expects a `200` for events it doesn't need acknowledged specially).
- [ ] Env vars documented in `CLAUDE.md`'s environment variables table: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS`.
- [ ] Integration tests: checkout/portal routes reject non-owners (403) and non-members (404); webhook route rejects a request with no/invalid `stripe-signature` (400) without writing to the database; webhook route correctly upserts a `subscriptions` row given a validly-signed `checkout.session.completed` payload built with `stripe.webhooks.generateTestHeaderString()` against the test `STRIPE_WEBHOOK_SECRET`; `getPlanForWorkspace()` returns `"free"` for a workspace with no row, and for a row with `status: "canceled"`.

**Technical Context:**

- Relevant files:
  - `infra/migrations/029-create-subscriptions.sql` _(create)_
  - `infra/stripe.ts` _(create)_
  - `models/subscription.ts` _(create)_
  - `infra/errors.ts` _(modify — add `PaymentRequiredError`)_
  - `infra/controller.ts` _(modify — dispatch branch)_
  - `infra/schemas.ts` _(modify — add checkout body schema)_
  - `pages/api/v1/workspaces/[id]/billing/checkout/index.ts` _(create)_
  - `pages/api/v1/workspaces/[id]/billing/portal/index.ts` _(create)_
  - `pages/api/v1/webhooks/stripe/index.ts` _(create)_
  - `types/index.ts` _(modify)_
  - `CLAUDE.md` _(modify — env vars table)_
- Depends on: Phase 9's `models/workspace.ts#requireRole()` (owner-only guard, same as rename/delete). Nothing in this story depends on data from later Phase 10 stories.
- `stripe` npm package needs adding to `package.json` dependencies.
- Not in this story: any enforcement of limits/features (US-36), any UI (US-37/US-38). This story is pure plumbing — a workspace can subscribe and the `subscriptions` table reflects it correctly, but nothing yet _uses_ `getPlanForWorkspace()` to change behavior.

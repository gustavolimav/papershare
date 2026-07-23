import database from "../infra/database";
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionModel,
  UpsertSubscriptionInput,
  PlanLimits,
} from "../types/index";

const SUBSCRIPTION_COLUMNS = `
  id, workspace_id, stripe_customer_id, stripe_subscription_id, plan,
  status, current_period_end, created_at, updated_at
`;

// Free is never stored — it's the absence of a row, or a row whose status
// isn't "active" (payment failed, canceled, etc.). Pro and Business share
// the same feature set for now; the only difference is Business also gets
// team workspaces, which is a role/membership concern already built in
// Phase 9, not something this plan-limits map needs to encode.
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxDocuments: 10,
    maxActiveLinks: 10,
    features: [],
  },
  pro: {
    maxDocuments: null,
    maxActiveLinks: null,
    features: ["watermark", "nda", "allowlist", "branding", "engagement_score"],
  },
  business: {
    maxDocuments: null,
    maxActiveLinks: null,
    features: ["watermark", "nda", "allowlist", "branding", "engagement_score"],
  },
};

async function getByWorkspaceId(
  workspaceId: string,
): Promise<Subscription | null> {
  const results = await database.query<Subscription>({
    text: `
        SELECT
          ${SUBSCRIPTION_COLUMNS}
        FROM
          subscriptions
        WHERE
          workspace_id = $1
        ;`,
    values: [workspaceId],
  });

  return results.rows[0] ?? null;
}

async function getByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<Subscription | null> {
  const results = await database.query<Subscription>({
    text: `
        SELECT
          ${SUBSCRIPTION_COLUMNS}
        FROM
          subscriptions
        WHERE
          stripe_subscription_id = $1
        ;`,
    values: [stripeSubscriptionId],
  });

  return results.rows[0] ?? null;
}

// A row with a non-"active" status (payment failed, canceled) resolves to
// "free" — the workspace keeps whatever it already has, it just can't grow
// past the Free limits or use gated features until it's active again.
async function getPlanForWorkspace(
  workspaceId: string,
): Promise<SubscriptionPlan> {
  const subscription = await getByWorkspaceId(workspaceId);

  if (!subscription || subscription.status !== "active") {
    return "free";
  }

  return subscription.plan;
}

async function upsertFromStripeEvent(
  input: UpsertSubscriptionInput,
): Promise<void> {
  await database.query({
    text: `
        INSERT INTO
          subscriptions (
            workspace_id, stripe_customer_id, stripe_subscription_id, plan,
            status, current_period_end
          )
        VALUES
          ($1, $2, $3, $4, $5, $6)
        ON CONFLICT
          (workspace_id)
        DO UPDATE SET
          stripe_customer_id = EXCLUDED.stripe_customer_id,
          stripe_subscription_id = EXCLUDED.stripe_subscription_id,
          plan = EXCLUDED.plan,
          status = EXCLUDED.status,
          current_period_end = EXCLUDED.current_period_end
        ;`,
    values: [
      input.workspaceId,
      input.stripeCustomerId,
      input.stripeSubscriptionId,
      input.plan,
      input.status,
      input.currentPeriodEnd,
    ],
  });
}

async function markCanceled(stripeSubscriptionId: string): Promise<void> {
  await database.query({
    text: `
        UPDATE
          subscriptions
        SET
          status = 'canceled'
        WHERE
          stripe_subscription_id = $1
        ;`,
    values: [stripeSubscriptionId],
  });
}

async function markPastDue(stripeSubscriptionId: string): Promise<void> {
  await database.query({
    text: `
        UPDATE
          subscriptions
        SET
          status = 'past_due'
        WHERE
          stripe_subscription_id = $1
        ;`,
    values: [stripeSubscriptionId],
  });
}

const subscription: SubscriptionModel = {
  getPlanForWorkspace,
  getByWorkspaceId,
  getByStripeSubscriptionId,
  upsertFromStripeEvent,
  markCanceled,
  markPastDue,
  PLAN_LIMITS,
};

export default subscription;

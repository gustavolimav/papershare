import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { createRouter } from "next-connect";
import controller from "../../../../../infra/controller";
import stripeInfra from "../../../../../infra/stripe";
import subscription from "../../../../../models/subscription";
import type {
  PaidSubscriptionPlan,
  SubscriptionStatus,
} from "../../../../../types/index";

export const config = {
  api: {
    bodyParser: false,
  },
};

const router = createRouter<NextApiRequest, NextApiResponse>();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request: NextApiRequest, response: NextApiResponse) {
  const rawBody = await readRawBody(request);
  const event = stripeInfra.verifyWebhookEvent(
    rawBody,
    request.headers["stripe-signature"],
  );

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object);
      break;
    case "customer.subscription.deleted":
      await subscription.markCanceled(event.data.object.id);
      break;
    case "invoice.payment_failed": {
      const stripeSubscriptionId = resolveSubscriptionIdFromInvoice(
        event.data.object,
      );

      if (stripeSubscriptionId) {
        await subscription.markPastDue(stripeSubscriptionId);
      }

      break;
    }
    // checkout.session.completed is deliberately a no-op: the session
    // object doesn't carry the subscription's price/period inline, and
    // Stripe always fires customer.subscription.created for the same
    // subscription in the same flow — that event's payload has everything
    // needed (price, period, status) with no extra API call, so it's the
    // single source of truth for persistence instead.
    default:
      break;
  }

  return response.status(200).json({ received: true });
}

// Both created/updated events carry the full Subscription object, so one
// handler covers initial signup, renewals, and plan changes made through
// the Customer Portal.
async function handleSubscriptionUpsert(
  stripeSubscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = stripeSubscription.metadata?.workspace_id;

  if (!workspaceId) {
    return;
  }

  const item = stripeSubscription.items.data[0];
  const plan = item ? resolvePlanFromPriceId(item.price.id) : null;

  if (!plan || !item) {
    return;
  }

  await subscription.upsertFromStripeEvent({
    workspaceId,
    stripeCustomerId:
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer.id,
    stripeSubscriptionId: stripeSubscription.id,
    plan,
    status: mapStripeStatus(stripeSubscription.status),
    currentPeriodEnd: new Date(item.current_period_end * 1000),
  });
}

function resolvePlanFromPriceId(priceId: string): PaidSubscriptionPlan | null {
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
    return "pro";
  }

  if (priceId === process.env.STRIPE_PRICE_ID_BUSINESS) {
    return "business";
  }

  return null;
}

// Only "active" ever grants paid access (see
// models/subscription.ts#getPlanForWorkspace) — every other Stripe status
// maps to whichever of our four narrower statuses is the closest fit, none
// of which change that behavior.
function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "incomplete";
  }
}

function resolveSubscriptionIdFromInvoice(
  invoice: Stripe.Invoice,
): string | null {
  const subscriptionDetails = invoice.parent?.subscription_details;

  if (!subscriptionDetails?.subscription) {
    return null;
  }

  return typeof subscriptionDetails.subscription === "string"
    ? subscriptionDetails.subscription
    : subscriptionDetails.subscription.id;
}

async function readRawBody(request: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

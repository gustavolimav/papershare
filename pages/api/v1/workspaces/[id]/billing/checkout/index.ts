import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import { ServiceError } from "../../../../../../../infra/errors";
import {
  validate,
  billingCheckoutSchema,
} from "../../../../../../../infra/schemas";
import stripeInfra from "../../../../../../../infra/stripe";
import workspace from "../../../../../../../models/workspace";
import type {
  AuthenticatedNextApiRequest,
  CheckoutSessionResponse,
  PaidSubscriptionPlan,
} from "../../../../../../../types/index";

interface WorkspaceBillingRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

const PRICE_ID_BY_PLAN: Record<PaidSubscriptionPlan, string | undefined> = {
  pro: process.env.STRIPE_PRICE_ID_PRO,
  business: process.env.STRIPE_PRICE_ID_BUSINESS,
};

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(authMiddleware);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(
  request: WorkspaceBillingRequest,
  response: NextApiResponse<CheckoutSessionResponse>,
) {
  const workspaceId = request.query.id as string;

  await workspace.requireRole(workspaceId, request.user!.id, "owner");

  const { plan } = validate(billingCheckoutSchema, request.body);

  const priceId = PRICE_ID_BY_PLAN[plan];

  if (!priceId) {
    throw new ServiceError({
      message: "Cobrança indisponível no momento.",
      action: `Configure STRIPE_PRICE_ID_${plan.toUpperCase()}.`,
    });
  }

  const stripe = stripeInfra.requireStripeConfigured();
  const baseUrl = getBaseUrl(request);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // Visible on the Session itself for dashboard debugging, but the
    // webhook handler reads workspace_id from subscription_data.metadata
    // instead — that propagates onto the Subscription object, whose
    // customer.subscription.created/updated events carry price/period
    // inline (the Session's own completed event doesn't).
    client_reference_id: workspaceId,
    subscription_data: {
      metadata: { workspace_id: workspaceId },
    },
    customer_email: request.user!.email,
    success_url: `${baseUrl}/settings?checkout=success`,
    cancel_url: `${baseUrl}/settings?checkout=canceled`,
  });

  if (!session.url) {
    throw new ServiceError({
      message: "Não foi possível iniciar a assinatura.",
      action: "Tente novamente em instantes.",
    });
  }

  return response.status(201).json({ url: session.url });
}

function getBaseUrl(request: NextApiRequest): string {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] ?? "https";
  return `${protocol}://${host}`;
}

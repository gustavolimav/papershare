import type { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import controller from "../../../../../../../infra/controller";
import { authMiddleware } from "../../../../../../../infra/auth";
import { NotFoundError } from "../../../../../../../infra/errors";
import stripeInfra from "../../../../../../../infra/stripe";
import workspace from "../../../../../../../models/workspace";
import subscription from "../../../../../../../models/subscription";
import type {
  AuthenticatedNextApiRequest,
  CheckoutSessionResponse,
} from "../../../../../../../types/index";

interface WorkspaceBillingRequest extends AuthenticatedNextApiRequest {
  query: {
    id?: string;
  } & NextApiRequest["query"];
}

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

  const existingSubscription = await subscription.getByWorkspaceId(workspaceId);

  if (!existingSubscription) {
    throw new NotFoundError({
      message: "Este workspace ainda não possui uma assinatura para gerenciar.",
      action: "Assine um plano pago antes de acessar o portal de cobrança.",
    });
  }

  const stripe = stripeInfra.requireStripeConfigured();
  const baseUrl = getBaseUrl(request);

  const session = await stripe.billingPortal.sessions.create({
    customer: existingSubscription.stripe_customer_id,
    return_url: `${baseUrl}/settings`,
  });

  return response.status(201).json({ url: session.url });
}

function getBaseUrl(request: NextApiRequest): string {
  const host = request.headers["x-forwarded-host"] ?? request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] ?? "https";
  return `${protocol}://${host}`;
}

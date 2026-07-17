import Stripe from "stripe";
import { ServiceError, ValidationError } from "./errors";

// Real Stripe billing is scoped per workspace, but nothing about this
// wrapper cares — it's a thin client factory, same shape as infra/ai.ts's
// per-call client. Unlike infra/ai.ts, there's exactly one Papershare-side
// Stripe account (not bring-your-own-key), so a single module-level client
// is appropriate here.
function getClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new ServiceError({
      message: "Cobrança indisponível no momento.",
      action: "Tente novamente mais tarde ou entre em contato com o suporte.",
    });
  }

  return new Stripe(secretKey);
}

// Local dev/CI never configure STRIPE_SECRET_KEY (same degrade-gracefully
// pattern as infra/ai.ts's requireApiKey / infra/mailer.ts's no-op) — every
// route that needs to actually call Stripe calls this first, so the 503
// happens before any other work.
function requireStripeConfigured(): Stripe {
  return getClient();
}

function requireWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new ServiceError({
      message: "Webhook de cobrança indisponível no momento.",
      action: "Configure STRIPE_WEBHOOK_SECRET.",
    });
  }

  return secret;
}

// Signature verification is pure HMAC — it doesn't call Stripe's API and
// doesn't need a real STRIPE_SECRET_KEY, so it's exposed off the static
// `Stripe.webhooks` (not an instantiated client) and can be exercised in
// tests with just a local STRIPE_WEBHOOK_SECRET, no real Stripe account.
function verifyWebhookEvent(
  rawBody: Buffer,
  signature: string | string[] | undefined,
): Stripe.Event {
  if (!signature) {
    throw new ValidationError({
      message: "Cabeçalho 'stripe-signature' ausente.",
      action: "Esta requisição deve ser enviada pelo Stripe.",
    });
  }

  const secret = requireWebhookSecret();

  try {
    return Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    throw new ValidationError({
      cause: error as Error,
      message: "Assinatura do webhook inválida.",
      action: "Esta requisição deve ser enviada pelo Stripe.",
    });
  }
}

interface StripeInfra {
  requireStripeConfigured(): Stripe;
  verifyWebhookEvent(
    // eslint-disable-next-line no-unused-vars
    rawBody: Buffer,
    // eslint-disable-next-line no-unused-vars
    signature: string | string[] | undefined,
  ): Stripe.Event;
}

const stripeInfra: StripeInfra = {
  requireStripeConfigured,
  verifyWebhookEvent,
};

export default stripeInfra;

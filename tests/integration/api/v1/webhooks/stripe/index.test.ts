import Stripe from "stripe";
import subscriptionModel from "models/subscription";
import orchestrator from "tests/orchestrator";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function createTeamWorkspace(cookie: string, name = "Equipe") {
  const response = await fetch("http://localhost:3000/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name }),
  });

  return response.json();
}

// Only the fields the webhook handler actually reads — real Stripe events
// carry far more, but constructEvent just needs valid JSON matching the
// signature, and nothing downstream validates the payload against a
// schema (the signature itself is the trust boundary).
function buildSubscriptionEventPayload(input: {
  type: "customer.subscription.created" | "customer.subscription.updated";
  workspaceId: string;
  priceId: string;
  status: string;
  subscriptionId?: string;
  customerId?: string;
}) {
  return JSON.stringify({
    id: "evt_test",
    object: "event",
    type: input.type,
    data: {
      object: {
        id: input.subscriptionId ?? "sub_test",
        object: "subscription",
        customer: input.customerId ?? "cus_test",
        status: input.status,
        metadata: { workspace_id: input.workspaceId },
        items: {
          data: [
            {
              price: { id: input.priceId },
              current_period_end:
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
          ],
        },
      },
    },
  });
}

function buildSubscriptionDeletedPayload(subscriptionId: string) {
  return JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
      },
    },
  });
}

function buildInvoicePaymentFailedPayload(subscriptionId: string) {
  return JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "invoice.payment_failed",
    data: {
      object: {
        id: "in_test",
        object: "invoice",
        parent: {
          subscription_details: { subscription: subscriptionId },
        },
      },
    },
  });
}

function sign(payload: string): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
}

async function postWebhook(payload: string, signature?: string) {
  const response = await fetch("http://localhost:3000/api/v1/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature !== undefined ? { "stripe-signature": signature } : {}),
    },
    body: payload,
  });

  return { status: response.status, body: await response.json() };
}

describe("POST /api/v1/webhooks/stripe", () => {
  test("Without a stripe-signature header, returns 400", async () => {
    const { status, body } = await postWebhook(
      buildSubscriptionDeletedPayload("sub_missing_header"),
    );

    expect(status).toBe(400);
    expect(body.name).toBe("ValidationError");
  });

  test("With an invalid signature, returns 400", async () => {
    const { status, body } = await postWebhook(
      buildSubscriptionDeletedPayload("sub_bad_signature"),
      "t=1700000000,v1=not-a-real-signature",
    );

    expect(status).toBe(400);
    expect(body.name).toBe("ValidationError");
  });

  test("A workspace with no subscription row resolves to the free plan", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const plan = await subscriptionModel.getPlanForWorkspace(workspace.id);

    expect(plan).toBe("free");
  });

  test("A validly-signed customer.subscription.created event upserts and resolves to the paid plan", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const payload = buildSubscriptionEventPayload({
      type: "customer.subscription.created",
      workspaceId: workspace.id,
      priceId: process.env.STRIPE_PRICE_ID_PRO!,
      status: "active",
      subscriptionId: "sub_created_test",
    });

    const { status, body } = await postWebhook(payload, sign(payload));

    expect(status).toBe(200);
    expect(body.received).toBe(true);

    const plan = await subscriptionModel.getPlanForWorkspace(workspace.id);
    expect(plan).toBe("pro");
  });

  test("A subsequent customer.subscription.updated event changes the plan", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const createdPayload = buildSubscriptionEventPayload({
      type: "customer.subscription.created",
      workspaceId: workspace.id,
      priceId: process.env.STRIPE_PRICE_ID_PRO!,
      status: "active",
      subscriptionId: "sub_upgrade_test",
    });
    await postWebhook(createdPayload, sign(createdPayload));

    const updatedPayload = buildSubscriptionEventPayload({
      type: "customer.subscription.updated",
      workspaceId: workspace.id,
      priceId: process.env.STRIPE_PRICE_ID_BUSINESS!,
      status: "active",
      subscriptionId: "sub_upgrade_test",
    });
    await postWebhook(updatedPayload, sign(updatedPayload));

    const plan = await subscriptionModel.getPlanForWorkspace(workspace.id);
    expect(plan).toBe("business");
  });

  test("A customer.subscription.deleted event cancels the subscription, resolving back to free", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const createdPayload = buildSubscriptionEventPayload({
      type: "customer.subscription.created",
      workspaceId: workspace.id,
      priceId: process.env.STRIPE_PRICE_ID_PRO!,
      status: "active",
      subscriptionId: "sub_cancel_test",
    });
    await postWebhook(createdPayload, sign(createdPayload));
    expect(await subscriptionModel.getPlanForWorkspace(workspace.id)).toBe(
      "pro",
    );

    const deletedPayload = buildSubscriptionDeletedPayload("sub_cancel_test");
    const { status } = await postWebhook(deletedPayload, sign(deletedPayload));

    expect(status).toBe(200);
    expect(await subscriptionModel.getPlanForWorkspace(workspace.id)).toBe(
      "free",
    );
  });

  test("An invoice.payment_failed event marks the subscription past_due, resolving to free", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const createdPayload = buildSubscriptionEventPayload({
      type: "customer.subscription.created",
      workspaceId: workspace.id,
      priceId: process.env.STRIPE_PRICE_ID_PRO!,
      status: "active",
      subscriptionId: "sub_pastdue_test",
    });
    await postWebhook(createdPayload, sign(createdPayload));
    expect(await subscriptionModel.getPlanForWorkspace(workspace.id)).toBe(
      "pro",
    );

    const failedPayload = buildInvoicePaymentFailedPayload("sub_pastdue_test");
    const { status } = await postWebhook(failedPayload, sign(failedPayload));

    expect(status).toBe(200);
    expect(await subscriptionModel.getPlanForWorkspace(workspace.id)).toBe(
      "free",
    );

    const subscription =
      await subscriptionModel.getByStripeSubscriptionId("sub_pastdue_test");
    expect(subscription?.status).toBe("past_due");
  });

  test("An event for an unrecognized type is acknowledged without error", async () => {
    const payload = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: "customer.created",
      data: { object: { id: "cus_irrelevant" } },
    });

    const { status, body } = await postWebhook(payload, sign(payload));

    expect(status).toBe(200);
    expect(body.received).toBe(true);
  });
});

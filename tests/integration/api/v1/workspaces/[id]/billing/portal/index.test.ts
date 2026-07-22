import database from "infra/database";
import orchestrator from "tests/orchestrator";

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

async function inviteMember(
  workspaceId: string,
  ownerCookie: string,
  email: string,
  role: "editor" | "viewer",
) {
  await fetch(
    `http://localhost:3000/api/v1/workspaces/${workspaceId}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ email, role }),
    },
  );
}

async function insertSubscription(workspaceId: string) {
  await database.query({
    text: `
        INSERT INTO
          subscriptions (
            workspace_id, stripe_customer_id, stripe_subscription_id, plan,
            status, current_period_end
          )
        VALUES
          ($1, 'cus_test', 'sub_test', 'pro', 'active', NOW() + INTERVAL '30 days')
        ;`,
    values: [workspaceId],
  });
}

async function portal(cookie: string | null, workspaceId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/workspaces/${workspaceId}/billing/portal`,
    {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : {},
    },
  );

  return { status: response.status, body: await response.json() };
}

describe("POST /api/v1/workspaces/[id]/billing/portal", () => {
  test("Without session cookie", async () => {
    const { status } = await portal(
      null,
      "00000000-0000-4000-8000-000000000000",
    );

    expect(status).toBe(401);
  });

  test("With a nonexistent workspace", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const { status } = await portal(
      cookie,
      "00000000-0000-4000-8000-000000000000",
    );

    expect(status).toBe(404);
  });

  test("As a non-owner member, returns 403", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: editorUser, cookie: editorCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, editorUser.email, "editor");

    const { status } = await portal(editorCookie, workspace.id);

    expect(status).toBe(403);
  });

  test("As the owner, without a subscription, returns 404", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const { status, body } = await portal(cookie, workspace.id);

    expect(status).toBe(404);
    expect(body.name).toBe("NotFoundError");
  });

  // billing_stripe is off by default (no row = disabled) — a superadmin
  // has to turn it on via the Feature flags tab in /settings before the
  // portal ever reaches Stripe.
  test("As the owner, with a subscription but the billing_stripe feature flag disabled (default), returns 503", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);
    await insertSubscription(workspace.id);

    const { status, body } = await portal(cookie, workspace.id);

    expect(status).toBe(503);
    expect(body.name).toBe("ServiceError");
    expect(body.message).toBe("Esse recurso ainda não está disponível.");
  });

  // See CLAUDE.md — STRIPE_SECRET_KEY is never configured locally/in CI,
  // so with the feature flag enabled, the owner-authorized,
  // subscription-exists path reaches the Stripe call and degrades to 503.
  test("As the owner, with the flag enabled but Stripe not configured, returns 503", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);
    await insertSubscription(workspace.id);
    await orchestrator.enableFeatureFlag("billing_stripe");

    const { status, body } = await portal(cookie, workspace.id);

    expect(status).toBe(503);
    expect(body.name).toBe("ServiceError");
    expect(body.message).toBe("Cobrança indisponível no momento.");
  });
});

import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/feature-flags", () => {
  test("Without session cookie", async () => {
    const response = await fetch("http://localhost:3000/api/v1/feature-flags");

    expect(response.status).toBe(401);
  });

  test("Logged in, no flags enabled yet, every key resolves to false", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch("http://localhost:3000/api/v1/feature-flags", {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toEqual({ billing_stripe: false });
  });

  test("After a flag is enabled, it's reflected for any logged-in user", async () => {
    const { cookie } = await orchestrator.createUserSession();
    await orchestrator.enableFeatureFlag("billing_stripe");

    const response = await fetch("http://localhost:3000/api/v1/feature-flags", {
      headers: { Cookie: cookie },
    });

    const body = await response.json();

    expect(body).toEqual({ billing_stripe: true });
  });
});

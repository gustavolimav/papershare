import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function patchFlag(cookie: string | null, key: string, enabled: boolean) {
  const response = await fetch(
    `http://localhost:3000/api/v1/feature-flags/${key}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ enabled }),
    },
  );

  return { status: response.status, body: await response.json() };
}

describe("PATCH /api/v1/feature-flags/[key]", () => {
  test("Without session cookie", async () => {
    const { status } = await patchFlag(null, "billing_stripe", true);

    expect(status).toBe(401);
  });

  test("Logged in, but not a superadmin", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const { status } = await patchFlag(cookie, "billing_stripe", true);

    expect(status).toBe(401);
  });

  test("As a superadmin, with an unknown key, returns 404", async () => {
    const { cookie } = await orchestrator.createSuperadminUserSession();

    const { status, body } = await patchFlag(cookie, "not_a_real_flag", true);

    expect(status).toBe(404);
    expect(body.name).toBe("NotFoundError");
  });

  test("As a superadmin, with a non-boolean 'enabled', returns 400", async () => {
    const { cookie } = await orchestrator.createSuperadminUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/feature-flags/billing_stripe",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ enabled: "yes" }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("As a superadmin, enables and then disables the flag", async () => {
    const { cookie } = await orchestrator.createSuperadminUserSession();

    const enabled = await patchFlag(cookie, "billing_stripe", true);
    expect(enabled.status).toBe(200);
    expect(enabled.body.enabled).toBe(true);
    expect(enabled.body.key).toBe("billing_stripe");

    const readBack = await fetch("http://localhost:3000/api/v1/feature-flags", {
      headers: { Cookie: cookie },
    });
    expect((await readBack.json()).billing_stripe).toBe(true);

    const disabled = await patchFlag(cookie, "billing_stripe", false);
    expect(disabled.status).toBe(200);
    expect(disabled.body.enabled).toBe(false);
  });
});

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

async function checkout(
  cookie: string | null,
  workspaceId: string,
  body: unknown,
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/workspaces/${workspaceId}/billing/checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    },
  );

  return { status: response.status, body: await response.json() };
}

describe("POST /api/v1/workspaces/[id]/billing/checkout", () => {
  test("Without session cookie", async () => {
    const { status } = await checkout(
      null,
      "00000000-0000-4000-8000-000000000000",
      { plan: "pro" },
    );

    expect(status).toBe(401);
  });

  test("With a nonexistent workspace", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const { status } = await checkout(
      cookie,
      "00000000-0000-4000-8000-000000000000",
      { plan: "pro" },
    );

    expect(status).toBe(404);
  });

  test("As a non-owner member, returns 403", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: editorUser, cookie: editorCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, editorUser.email, "editor");

    const { status } = await checkout(editorCookie, workspace.id, {
      plan: "pro",
    });

    expect(status).toBe(403);
  });

  test("With an invalid plan, returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const { status, body } = await checkout(cookie, workspace.id, {
      plan: "enterprise",
    });

    expect(status).toBe(400);
    expect(body.name).toBe("ValidationError");
  });

  // Local dev/CI never configure STRIPE_SECRET_KEY (see CLAUDE.md) — the
  // owner-authorized, valid-plan path reaches the Stripe call and degrades
  // to 503, same as every other unconfigured-external-service path in
  // this app (infra/ai.ts, infra/mailer.ts).
  test("As the owner, with a valid plan but Stripe not configured, returns 503", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const { status, body } = await checkout(cookie, workspace.id, {
      plan: "pro",
    });

    expect(status).toBe(503);
    expect(body.name).toBe("ServiceError");
  });
});

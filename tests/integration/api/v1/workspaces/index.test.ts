import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/workspaces", () => {
  test("Without a session", async () => {
    const response = await fetch("http://localhost:3000/api/v1/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Equipe" }),
    });

    expect(response.status).toBe(401);
  });

  test("Creates a team workspace with the requester as owner", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch("http://localhost:3000/api/v1/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Equipe de Vendas" }),
    });

    expect(response.status).toBe(201);

    const responseBody = await response.json();

    expect(responseBody.name).toBe("Equipe de Vendas");
    expect(responseBody.is_personal).toBe(false);

    const listResponse = await fetch(
      "http://localhost:3000/api/v1/workspaces",
      { headers: { Cookie: cookie } },
    );
    const workspaces = await listResponse.json();

    const created = workspaces.find(
      (workspace: { id: string }) => workspace.id === responseBody.id,
    );

    expect(created.role).toBe("owner");
  });

  test("With an empty name", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch("http://localhost:3000/api/v1/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/workspaces", () => {
  test("Lists the personal workspace by default, first in the list", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch("http://localhost:3000/api/v1/workspaces", {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);

    const workspaces = await response.json();

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].is_personal).toBe(true);
    expect(workspaces[0].role).toBe("owner");
  });

  test("Does not show a workspace created by a different user", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    await fetch("http://localhost:3000/api/v1/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ name: "Workspace da A" }),
    });

    const response = await fetch("http://localhost:3000/api/v1/workspaces", {
      headers: { Cookie: cookieB },
    });
    const workspaces = await response.json();

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].is_personal).toBe(true);
    expect(
      workspaces.some((workspace: { name: string }) =>
        workspace.name.includes("Workspace da A"),
      ),
    ).toBe(false);
  });
});

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

describe("POST /api/v1/workspaces/[id]/activate", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/activate",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("Switches the active workspace, reflected on GET /api/v1/sessions", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie, "Equipe Nova");

    const activateResponse = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/activate`,
      { method: "POST", headers: { Cookie: cookie } },
    );

    expect(activateResponse.status).toBe(200);

    const activatedWorkspace = await activateResponse.json();

    expect(activatedWorkspace.id).toBe(workspace.id);

    const sessionResponse = await fetch(
      "http://localhost:3000/api/v1/sessions",
      { headers: { Cookie: cookie } },
    );
    const sessionBody = await sessionResponse.json();

    expect(sessionBody.active_workspace_id).toBe(workspace.id);
  });

  test("With a nonexistent workspace", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/activate",
      { method: "POST", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With a workspace that exists but belongs to someone else", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/activate`,
      { method: "POST", headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });
});

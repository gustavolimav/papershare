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

// US-30 hasn't landed yet (no invite endpoint), so membership below `owner`
// is set up directly via the database for these permission tests.
async function addMember(
  workspaceId: string,
  userId: string,
  role: "editor" | "viewer",
) {
  await database.query({
    text: `
      INSERT INTO
        workspace_members (workspace_id, user_id, role)
      VALUES
        ($1, $2, $3)
      ;`,
    values: [workspaceId, userId, role],
  });
}

describe("PATCH /api/v1/workspaces/[id]", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000",
      { method: "PATCH" },
    );

    expect(response.status).toBe(401);
  });

  test("As someone who isn't a member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: strangerCookie },
        body: JSON.stringify({ name: "Nome novo" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("As an editor (not owner)", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: editorUser, cookie: editorCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    await addMember(workspace.id, editorUser.id, "editor");

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: editorCookie },
        body: JSON.stringify({ name: "Nome novo" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("On the personal workspace", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${user.active_workspace_id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "Nome novo" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("As the owner, with a valid name", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie, "Nome antigo");

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "Nome novo" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.name).toBe("Nome novo");
  });
});

describe("DELETE /api/v1/workspaces/[id]", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("As someone who isn't a member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}`,
      { method: "DELETE", headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("As a viewer (not owner)", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: viewerUser, cookie: viewerCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    await addMember(workspace.id, viewerUser.id, "viewer");

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}`,
      { method: "DELETE", headers: { Cookie: viewerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("On the personal workspace", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${user.active_workspace_id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(403);
  });

  test("As the owner", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(204);

    const listResponse = await fetch(
      "http://localhost:3000/api/v1/workspaces",
      { headers: { Cookie: cookie } },
    );
    const workspaces = await listResponse.json();

    expect(workspaces.some((w: { id: string }) => w.id === workspace.id)).toBe(
      false,
    );
  });
});

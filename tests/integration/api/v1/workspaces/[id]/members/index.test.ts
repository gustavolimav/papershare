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

describe("GET /api/v1/workspaces/[id]/members", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/members",
    );

    expect(response.status).toBe(401);
  });

  test("As a non-member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      { headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("As the owner, lists exactly themselves right after creation", async () => {
    const { user: ownerUser, cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const members = await response.json();

    expect(members).toHaveLength(1);
    expect(members[0].user_id).toBe(ownerUser.id);
    expect(members[0].role).toBe("owner");
  });
});

describe("POST /api/v1/workspaces/[id]/members", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/members",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("As a non-owner", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: memberUser, cookie: memberCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ email: memberUser.email, role: "editor" }),
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: memberCookie },
        body: JSON.stringify({
          email: "someoneelse@example.com",
          role: "viewer",
        }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("On the personal workspace", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${user.active_workspace_id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          email: "someone@example.com",
          role: "viewer",
        }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("With an email that has no account", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          email: "nobody-registered@example.com",
          role: "editor",
        }),
      },
    );

    expect(response.status).toBe(404);

    const responseBody = await response.json();

    expect(responseBody.message).toBe(
      "Nenhuma conta encontrada com esse email. A pessoa precisa se cadastrar no Papershare antes de ser convidada.",
    );
  });

  test("Succeeds and the member shows up in the members list", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: invitedUser } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ email: invitedUser.email, role: "editor" }),
      },
    );

    expect(response.status).toBe(201);

    const responseBody = await response.json();

    expect(responseBody.user_id).toBe(invitedUser.id);
    expect(responseBody.role).toBe("editor");

    const listResponse = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      { headers: { Cookie: ownerCookie } },
    );
    const members = await listResponse.json();

    expect(
      members.some(
        (member: { user_id: string }) => member.user_id === invitedUser.id,
      ),
    ).toBe(true);
  });

  test("With an email that is already a member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: invitedUser } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ email: invitedUser.email, role: "editor" }),
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ email: invitedUser.email, role: "viewer" }),
      },
    );

    expect(response.status).toBe(409);
  });
});

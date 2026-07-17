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
  const response = await fetch(
    `http://localhost:3000/api/v1/workspaces/${workspaceId}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ email, role }),
    },
  );

  return response.json();
}

describe("PATCH /api/v1/workspaces/[id]/members/[userId]", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/members/00000000-0000-4000-8000-000000000000",
      { method: "PATCH" },
    );

    expect(response.status).toBe(401);
  });

  test("As a non-owner", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: memberUser, cookie: memberCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, memberUser.email, "editor");

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${memberUser.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: memberCookie },
        body: JSON.stringify({ role: "viewer" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("On the personal workspace", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${user.active_workspace_id}/members/${user.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ role: "viewer" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("Demoting the sole owner", async () => {
    const { user: ownerUser, cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${ownerUser.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ role: "editor" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("Demoting one of two owners succeeds", async () => {
    const { user: ownerUser, cookie: ownerCookie } =
      await orchestrator.createUserSession();
    const { user: secondUser } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);

    const invited = await inviteMember(
      workspace.id,
      ownerCookie,
      secondUser.email,
      "editor",
    );

    await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${invited.user_id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ role: "owner" }),
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${ownerUser.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({ role: "editor" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.role).toBe("editor");
  });
});

describe("DELETE /api/v1/workspaces/[id]/members/[userId]", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/members/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("On the personal workspace, even removing yourself", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${user.active_workspace_id}/members/${user.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(403);
  });

  test("A viewer can remove themselves (leave)", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: viewerUser, cookie: viewerCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, viewerUser.email, "viewer");

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${viewerUser.id}`,
      { method: "DELETE", headers: { Cookie: viewerCookie } },
    );

    expect(response.status).toBe(204);

    const listResponse = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      { headers: { Cookie: ownerCookie } },
    );
    const members = await listResponse.json();

    expect(
      members.some(
        (member: { user_id: string }) => member.user_id === viewerUser.id,
      ),
    ).toBe(false);
  });

  test("The last owner attempting to leave", async () => {
    const { user: ownerUser, cookie } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${ownerUser.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(403);
  });

  test("An owner removing a non-owner member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: memberUser } = await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, memberUser.email, "editor");

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members/${memberUser.id}`,
      { method: "DELETE", headers: { Cookie: ownerCookie } },
    );

    expect(response.status).toBe(204);
  });
});

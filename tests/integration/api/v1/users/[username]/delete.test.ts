import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/users/[username]", () => {
  test("Without session cookie returns 401", async () => {
    await orchestrator.createUser({ username: "targetuser" });

    const response = await fetch(
      "http://localhost:3000/api/v1/users/targetuser",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("Trying to delete another user returns 403", async () => {
    await orchestrator.createUser({ username: "victim" });
    const { cookie } = await orchestrator.createUserSession({
      username: "attacker",
    });

    const response = await fetch("http://localhost:3000/api/v1/users/victim", {
      method: "DELETE",
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(403);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Você não tem permissão para deletar este usuário.",
      action: "Você só pode deletar o seu próprio perfil.",
      status: 403,
    });
  });

  test("Deleting own account returns 204 and account becomes inaccessible", async () => {
    const { user: createdUser, cookie } = await orchestrator.createUserSession({
      username: "tobedeleted",
    });

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "DELETE",
        headers: { Cookie: cookie },
      },
    );

    expect(deleteResponse.status).toBe(204);

    // Deleted user should no longer be found
    const getResponse = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      { headers: { Cookie: cookie } },
    );

    expect(getResponse.status).toBe(404);
  });
});

import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Authorization guard on user endpoints", () => {
  describe("PATCH /api/v1/users/[username]", () => {
    test("Trying to update another user returns 403", async () => {
      await orchestrator.createUser({ username: "victim" });
      const { cookie } = await orchestrator.createUserSession({
        username: "attacker",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/victim",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({ username: "hacked" }),
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não tem permissão para atualizar este usuário.",
        action: "Você só pode atualizar o seu próprio perfil.",
        status: 403,
      });
    });

    test("Updating own profile returns 200", async () => {
      const { user: createdUser, cookie } =
        await orchestrator.createUserSession({ username: "selfupdate" });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({ username: "selfupdated" }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.username).toBe("selfupdated");
    });
  });
});

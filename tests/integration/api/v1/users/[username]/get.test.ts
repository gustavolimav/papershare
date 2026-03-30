import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Running as anonymous user", () => {
    test("With exact case match", async () => {
      const { user: createdUser, cookie } =
        await orchestrator.createUserSession({
          username: "testuser1",
          password: "password123",
          email: "email@gmail.com",
        });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/testuser1",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
        },
      );

      expect(response.status).toBe(200);

      const user = await response.json();

      expect(user.id).toBe(createdUser.id);
      expect(user.username).toBe(createdUser.username);
      expect(user.email).toBe(createdUser.email);
      expect(user.created_at).toBe(createdUser.created_at);
      expect(user.updated_at).toBe(createdUser.updated_at);
    });

    test("With case mismatch", async () => {
      const { user: createdUser, cookie } =
        await orchestrator.createUserSession({
          username: "testuser2",
          password: "password123",
          email: "email2@gmail.com",
        });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/tesTUser2",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
        },
      );

      expect(response.status).toBe(200);

      const user = await response.json();

      expect(user.id).toBe(createdUser.id);
      expect(user.username).toBe(createdUser.username);
      expect(user.email).toBe(createdUser.email);
      expect(user.created_at).toBe(createdUser.created_at);
      expect(user.updated_at).toBe(createdUser.updated_at);
    });

    test("With nonexistent username", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch(
        "http://localhost:3000/api/v1/users/testing",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
        },
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
        status: 404,
      });
    });
  });
});

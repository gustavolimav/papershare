import orchestrator from "tests/orchestrator.ts";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]", () => {
  describe("Running as anonymous user", () => {
    test("With exact case match", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "testuser1",
          password: "password123",
          email: "email@gmail.com",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/testuser1",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      expect(response2.status).toBe(200);

      const expectedUser = await response1.json();
      const user = await response2.json();

      expect(user.id).toBe(expectedUser.id);
      expect(user.username).toBe(expectedUser.username);
      expect(user.email).toBe(expectedUser.email);
      expect(user.created_at).toBe(expectedUser.created_at);
      expect(user.updated_at).toBe(expectedUser.updated_at);
    });

    test("With case mismatch", async () => {
      const response1 = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "testuser2",
          password: "password123",
          email: "email2@gmail.com",
        }),
      });

      expect(response1.status).toBe(201);

      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/tesTUser2",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      expect(response2.status).toBe(200);

      const expectedUser = await response1.json();
      const user = await response2.json();

      expect(user.id).toBe(expectedUser.id);
      expect(user.username).toBe(expectedUser.username);
      expect(user.email).toBe(expectedUser.email);
      expect(user.created_at).toBe(expectedUser.created_at);
      expect(user.updated_at).toBe(expectedUser.updated_at);
    });

    test("With nonexistent username", async () => {
      const response2 = await fetch(
        "http://localhost:3000/api/v1/users/testing",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      expect(response2.status).toBe(404);

      const responseBody = await response2.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
        status: 404,
      });
    });
  });
});

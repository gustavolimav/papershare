import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Authentication Middleware", () => {
  describe("GET /api/v1/users/[username]", () => {
    test("Without session cookie returns 401", async () => {
      await orchestrator.createUser({ username: "targetuser" });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/targetuser",
      );

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnathorizedError",
        message: "Usuário não autenticado.",
        action: "Faça login para realizar esta operação.",
        status: 401,
      });
    });

    test("With invalid session token returns 401 and clears cookie", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/users/targetuser",
        {
          headers: { Cookie: "session_id=invalidtoken123" },
        },
      );

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnathorizedError",
        message: "Sessão não encontrada ou inválida.",
        action: "Faça login novamente para continuar.",
        status: 401,
      });

      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).not.toBeNull();
      expect(setCookieHeader).toContain("session_id=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    test("With expired session returns 401, deletes session and clears cookie", async () => {
      const createdUser = await orchestrator.createUser({
        username: "expireduser",
        email: "expired@test.com",
        password: "password123",
      });

      const expiredToken = await orchestrator.createExpiredSession(
        createdUser.id,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/expireduser",
        {
          headers: { Cookie: `session_id=${expiredToken}` },
        },
      );

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnathorizedError",
        message: "Sessão expirada.",
        action: "Faça login novamente para continuar.",
        status: 401,
      });

      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).not.toBeNull();
      expect(setCookieHeader).toContain("Max-Age=0");

      const sessionStillExists =
        await orchestrator.sessionExists(expiredToken);
      expect(sessionStillExists).toBe(false);
    });

    test("With valid session returns 200", async () => {
      const createdUser = await orchestrator.createUser({
        username: "validuser",
        email: "valid@test.com",
        password: "password123",
      });

      const loginResponse = await fetch(
        "http://localhost:3000/api/v1/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "valid@test.com",
            password: "password123",
          }),
        },
      );

      expect(loginResponse.status).toBe(201);

      const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

      const response = await fetch(
        "http://localhost:3000/api/v1/users/validuser",
        {
          headers: { Cookie: sessionCookie },
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.id).toBe(createdUser.id);
      expect(responseBody.username).toBe("validuser");
    });
  });

  describe("PATCH /api/v1/users/[username]", () => {
    test("Without session cookie returns 401", async () => {
      await orchestrator.createUser({ username: "patchuser" });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/patchuser",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "newname" }),
        },
      );

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody.name).toBe("UnathorizedError");
    });

    test("With valid session allows update", async () => {
      await orchestrator.createUser({
        username: "patchme",
        email: "patchme@test.com",
        password: "password123",
      });

      const loginResponse = await fetch(
        "http://localhost:3000/api/v1/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "patchme@test.com",
            password: "password123",
          }),
        },
      );

      const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

      const response = await fetch(
        "http://localhost:3000/api/v1/users/patchme",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: sessionCookie,
          },
          body: JSON.stringify({ username: "patchedname" }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.username).toBe("patchedname");
    });
  });
});

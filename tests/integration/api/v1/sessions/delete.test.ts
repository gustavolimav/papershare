import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  test("Without session cookie returns 401", async () => {
    const response = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "DELETE",
    });

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
    const response = await fetch("http://localhost:3000/api/v1/sessions", {
      method: "DELETE",
      headers: { Cookie: "session_id=invalidtoken123" },
    });

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
    expect(setCookieHeader).toContain("Max-Age=0");
  });

  test("With valid session deletes session and clears cookie", async () => {
    const { user: createdUser, cookie } =
      await orchestrator.createUserSession();

    const deleteResponse = await fetch(
      "http://localhost:3000/api/v1/sessions",
      {
        method: "DELETE",
        headers: { Cookie: cookie },
      },
    );

    expect(deleteResponse.status).toBe(204);

    const setCookieHeader = deleteResponse.headers.get("set-cookie");
    expect(setCookieHeader).not.toBeNull();
    expect(setCookieHeader).toContain("session_id=");
    expect(setCookieHeader).toContain("Max-Age=0");

    const sessionToken = cookie.split("=")[1]?.split(";")[0] ?? "";
    const sessionStillExists = await orchestrator.sessionExists(sessionToken);
    expect(sessionStillExists).toBe(false);

    // Subsequent request with same cookie should return 401
    const followUpResponse = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      { headers: { Cookie: cookie } },
    );

    expect(followUpResponse.status).toBe(401);
  });
});

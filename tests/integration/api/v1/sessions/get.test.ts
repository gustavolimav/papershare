import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/sessions", () => {
  test("Without session cookie", async () => {
    const response = await fetch("http://localhost:3000/api/v1/sessions");

    expect(response.status).toBe(401);
  });

  test("With a valid session", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch("http://localhost:3000/api/v1/sessions", {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
      is_admin: user.is_admin,
    });
    expect(responseBody.password).toBeUndefined();
  });
});

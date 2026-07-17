import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]/ai-key", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/users/someuser/ai-key",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's username", async () => {
    const { user } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("Returns not configured by default", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({ configured: false });
  });
});

describe("PUT /api/v1/users/[username]/ai-key", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/users/someuser/ai-key",
      { method: "PUT" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's username", async () => {
    const { user } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: attackerCookie },
        body: JSON.stringify({ api_key: "sk-ant-api03-fake-key-value-here" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("With a key that's too short", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ api_key: "too-short" }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("Saves the key, encrypted at rest, and flips GET to configured", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    const putResponse = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ api_key: "sk-ant-api03-fake-key-value-here" }),
      },
    );

    expect(putResponse.status).toBe(200);
    expect(await putResponse.json()).toEqual({ configured: true });

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      { headers: { Cookie: cookie } },
    );

    const getResponseBody = await getResponse.json();
    // The response only ever exposes a boolean — never the key itself,
    // encrypted or otherwise.
    expect(getResponseBody).toEqual({ configured: true });
    expect(getResponseBody).not.toHaveProperty("api_key");
    expect(getResponseBody).not.toHaveProperty("ai_api_key_encrypted");
  });
});

describe("DELETE /api/v1/users/[username]/ai-key", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/users/someuser/ai-key",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's username", async () => {
    const { user } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      { method: "DELETE", headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("Removes a previously-configured key", async () => {
    const { user, cookie } = await orchestrator.createUserSession();

    await fetch(`http://localhost:3000/api/v1/users/${user.username}/ai-key`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ api_key: "sk-ant-api03-fake-key-value-here" }),
    });

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual({ configured: false });

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/users/${user.username}/ai-key`,
      { headers: { Cookie: cookie } },
    );

    expect(await getResponse.json()).toEqual({ configured: false });
  });
});

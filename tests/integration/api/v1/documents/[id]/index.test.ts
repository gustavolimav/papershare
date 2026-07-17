import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/documents/[id]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000",
    );

    expect(response.status).toBe(401);
  });

  test("With a nonexistent id", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000",
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const created = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With own document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const created = await orchestrator.uploadDocument(cookie, {
      title: "Own document",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual(created);
  });
});

describe("PATCH /api/v1/documents/[id]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000",
      { method: "PATCH" },
    );

    expect(response.status).toBe(401);
  });

  test("Without title or description", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const created = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });

  test("With a nonexistent id", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ title: "New title" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const created = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: attackerCookie,
        },
        body: JSON.stringify({ title: "Hacked" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("Updating title and description of own document", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const created = await orchestrator.uploadDocument(cookie, {
      title: "Original title",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          title: "Updated title",
          description: "Updated description",
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      ...created,
      title: "Updated title",
      description: "Updated description",
      updated_at: responseBody.updated_at,
    });
    expect(responseBody.mime_type).toBe(created.mime_type);
    expect(responseBody.storage_key).toBe(created.storage_key);
  });
});

describe("DELETE /api/v1/documents/[id]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("With a nonexistent id", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000",
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const created = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      { method: "DELETE", headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With own document", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const created = await orchestrator.uploadDocument(cookie);

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(deleteResponse.status).toBe(204);

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${created.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(getResponse.status).toBe(404);
  });
});

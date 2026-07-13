import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/documents/[id]/links/[linkId]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000",
      { method: "PATCH" },
    );

    expect(response.status).toBe(401);
  });

  test("Without any field", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);
    const link = await orchestrator.createShareLink(ownerCookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: attackerCookie,
        },
        body: JSON.stringify({ label: "hacked" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/00000000-0000-4000-8000-000000000000`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ label: "new label" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("Updating the label", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      label: "Original",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ label: "Updated" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.label).toBe("Updated");
  });

  test("Setting a password then clearing it with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      password: "secret123",
    });

    const clearResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ password: null }),
      },
    );

    expect(clearResponse.status).toBe(200);

    const responseBody = await clearResponse.json();
    expect(responseBody.has_password).toBe(false);
  });

  test("Clearing expires_at with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ expires_at: null }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.expires_at).toBeNull();
  });
});

describe("DELETE /api/v1/documents/[id]/links/[linkId]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);
    const link = await orchestrator.createShareLink(ownerCookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/00000000-0000-4000-8000-000000000000`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("Revoking an active link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.is_active).toBe(false);
  });
});

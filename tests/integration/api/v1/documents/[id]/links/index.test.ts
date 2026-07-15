import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/documents/[id]/links", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("With a nonexistent document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const responseBody = await orchestrator.createShareLink(
      cookie,
      "00000000-0000-4000-8000-000000000000",
    );

    expect(responseBody.name).toBe("NotFoundError");
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const responseBody = await orchestrator.createShareLink(
      attackerCookie,
      document.id,
    );

    expect(responseBody.name).toBe("ForbiddenError");
  });

  test("With default options", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const responseBody = await orchestrator.createShareLink(
      cookie,
      document.id,
    );

    expect(responseBody).toEqual({
      id: responseBody.id,
      token: responseBody.token,
      document_id: document.id,
      user_id: responseBody.user_id,
      label: null,
      expires_at: null,
      allow_download: true,
      is_active: true,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
      has_password: false,
      notify_on_view: true,
    });
    expect(responseBody.password_hash).toBeUndefined();
  });

  test("With label, password, expiry, allow_download and notify_on_view", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const responseBody = await orchestrator.createShareLink(
      cookie,
      document.id,
      {
        label: "For legal review",
        password: "secret123",
        expires_at: expiresAt,
        allow_download: false,
        notify_on_view: false,
      },
    );

    expect(responseBody.label).toBe("For legal review");
    expect(responseBody.has_password).toBe(true);
    expect(responseBody.allow_download).toBe(false);
    expect(responseBody.notify_on_view).toBe(false);
    expect(new Date(responseBody.expires_at).toISOString()).toBe(expiresAt);
    expect(responseBody.password_hash).toBeUndefined();
  });

  test("With expires_at in the past", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const responseBody = await orchestrator.createShareLink(
      cookie,
      document.id,
      { expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    );

    expect(responseBody.name).toBe("ValidationError");
  });

  test("With a password shorter than 4 characters", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const responseBody = await orchestrator.createShareLink(
      cookie,
      document.id,
      { password: "abc" },
    );

    expect(responseBody.name).toBe("ValidationError");
  });
});

describe("GET /api/v1/documents/[id]/links", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("Lists all links for the document ordered by created_at DESC", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    await orchestrator.createShareLink(cookie, document.id, {
      label: "First",
    });
    await orchestrator.createShareLink(cookie, document.id, {
      label: "Second",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toHaveLength(2);
    expect(responseBody[0].label).toBe("Second");
    expect(responseBody[1].label).toBe("First");
    expect(responseBody[0].password_hash).toBeUndefined();
  });
});

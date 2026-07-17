import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/documents/[id]/summary", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/summary",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/summary`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/summary",
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("Returns null summary before it's ever been generated", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/summary`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({ summary: null, generated_at: null });
  });
});

describe("POST /api/v1/documents/[id]/summary", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/summary",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/summary`,
      { method: "POST", headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/summary",
      { method: "POST", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  // ANTHROPIC_API_KEY is intentionally unset in the test environment (same
  // convention as RESEND_API_KEY for the mailer) — summarizeDocument()
  // never throws when the AI client is unavailable, so this always
  // succeeds with the summary left unchanged (null, for a fresh document).
  test("With no AI client configured, succeeds without generating a summary", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/summary`,
      { method: "POST", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({ summary: null, generated_at: null });
  });

  test("Enforces the 3-per-hour regeneration rate limit", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    for (let i = 0; i < 3; i++) {
      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${document.id}/summary`,
        { method: "POST", headers: { Cookie: cookie } },
      );
      expect(response.status).toBe(200);
    }

    const fourthResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/summary`,
      { method: "POST", headers: { Cookie: cookie } },
    );

    expect(fourthResponse.status).toBe(429);
  });
});

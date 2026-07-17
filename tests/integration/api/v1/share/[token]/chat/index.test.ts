import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/share/[token]/chat", () => {
  test("With a nonexistent token", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/share/00000000-0000-4000-8000-000000000000/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Do que se trata o documento?" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("Without a question", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });

  test("With a password set, no password provided", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      password: "secret123",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Do que se trata o documento?" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("With a revoked link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Do que se trata o documento?" }),
      },
    );

    expect(response.status).toBe(403);
  });

  // ANTHROPIC_API_KEY is intentionally unset in the test environment — a
  // fully valid, correctly-gated request still can't get an actual answer,
  // and surfaces that as a clear 503 rather than hanging or 500ing.
  test("With a valid link but no AI client configured, returns 503", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Do que se trata o documento?" }),
      },
    );

    expect(response.status).toBe(503);
  });
});

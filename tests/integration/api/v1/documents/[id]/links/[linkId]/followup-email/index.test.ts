import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/documents/[id]/links/[linkId]/followup-email", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000/followup-email",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("Without a viewer_fingerprint", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/followup-email`,
      {
        method: "POST",
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
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/followup-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: attackerCookie,
        },
        body: JSON.stringify({ viewer_fingerprint: "some-fingerprint" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000/followup-email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ viewer_fingerprint: "some-fingerprint" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("With a nonexistent viewer fingerprint on a valid link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "known-viewer",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/followup-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ viewer_fingerprint: "unknown-viewer" }),
      },
    );

    expect(response.status).toBe(404);
  });

  // ANTHROPIC_API_KEY is intentionally unset in the test environment. Unlike
  // the fire-and-forget summarization/insights jobs, this is a synchronous,
  // user-initiated action, so it surfaces a clear 503 instead of silently
  // no-op'ing — this also confirms ownership/viewer validation runs before
  // the AI-availability check, not after (a valid request still reaches the
  // AI call and only then 503s, rather than 503'ing before authorization).
  test("With a valid viewer but no AI client configured, returns 503", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "engaged-viewer",
      time_on_page: 60,
      pages_viewed: 1,
      viewer_email: "viewer@example.com",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/followup-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ viewer_fingerprint: "engaged-viewer" }),
      },
    );

    expect(response.status).toBe(503);
  });

  test("Enforces the 20-per-hour rate limit", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "rate-limited-viewer",
    });

    for (let i = 0; i < 20; i++) {
      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/followup-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ viewer_fingerprint: "rate-limited-viewer" }),
        },
      );
      // Every call succeeds past the rate-limit check and only then 503s
      // (no AI client configured) — the important thing here is that none
      // of the first 20 is itself the 429.
      expect(response.status).toBe(503);
    }

    const twentyFirstResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/followup-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ viewer_fingerprint: "rate-limited-viewer" }),
      },
    );

    expect(twentyFirstResponse.status).toBe(429);
  });
});

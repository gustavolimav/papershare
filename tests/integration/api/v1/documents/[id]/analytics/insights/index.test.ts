import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/documents/[id]/analytics/insights", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/analytics/insights",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics/insights`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/analytics/insights",
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With no views yet, returns a friendly message and no suggestions", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics/insights`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      insight: "Nenhuma visualização ainda para gerar insights.",
      suggestions: [],
      generated_at: null,
    });
  });

  // ANTHROPIC_API_KEY is intentionally unset in the test environment — with
  // views present but no AI client configured, generateInsight() returns
  // null and getInsights() falls back to the (empty) cache rather than
  // throwing, since this is a read-mostly endpoint the analytics page polls.
  test("With views but no AI client configured, falls back to an empty cache", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "insight-viewer-1",
      time_on_page: 30,
      pages_viewed: 1,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics/insights`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      insight: null,
      suggestions: [],
      generated_at: null,
    });
  });

  test("Enforces the 10-per-day regeneration rate limit", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    // Each request must invalidate the cache (different total_views) to
    // count as a regeneration attempt against the rate limit.
    for (let i = 0; i < 10; i++) {
      await orchestrator.recordView(link.token, {
        viewer_fingerprint: `rate-limit-viewer-${i}`,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${document.id}/analytics/insights`,
        { headers: { Cookie: cookie } },
      );
      expect(response.status).toBe(200);
    }

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "rate-limit-viewer-11th",
    });

    const eleventhResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics/insights`,
      { headers: { Cookie: cookie } },
    );

    expect(eleventhResponse.status).toBe(429);
  });
});

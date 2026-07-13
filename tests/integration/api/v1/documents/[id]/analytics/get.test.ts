import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/documents/[id]/analytics", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/analytics",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent document", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/analytics",
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With no share links yet", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const analytics = await response.json();

    expect(analytics.total_views).toBe(0);
    expect(analytics.unique_viewers).toBe(0);
    expect(analytics.avg_time_on_page).toBeNull();
    expect(analytics.avg_pages_viewed).toBeNull();
    expect(analytics.top_links).toEqual([]);
  });

  test("With views seeded across multiple links, rolled up correctly", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const linkA = await orchestrator.createShareLink(cookie, document.id, {
      label: "Link A",
    });
    const linkB = await orchestrator.createShareLink(cookie, document.id, {
      label: "Link B",
    });

    await orchestrator.recordView(linkA.token, {
      viewer_fingerprint: "viewer-1",
      time_on_page: 10,
    });
    await orchestrator.recordView(linkA.token, {
      viewer_fingerprint: "viewer-2",
      time_on_page: 20,
    });
    await orchestrator.recordView(linkB.token, {
      viewer_fingerprint: "viewer-3",
      time_on_page: 30,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const analytics = await response.json();

    expect(analytics.total_views).toBe(3);
    expect(analytics.unique_viewers).toBe(3);
    expect(analytics.avg_time_on_page).toBe(20);

    expect(analytics.top_links).toHaveLength(2);
    expect(analytics.top_links[0]).toEqual({
      link_id: linkA.id,
      label: "Link A",
      total_views: 2,
    });
    expect(analytics.top_links[1]).toEqual({
      link_id: linkB.id,
      label: "Link B",
      total_views: 1,
    });
  });

  test("top_links is limited to 5 entries", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    for (let i = 0; i < 6; i++) {
      await orchestrator.createShareLink(cookie, document.id, {
        label: `Link ${i}`,
      });
    }

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const analytics = await response.json();
    expect(analytics.top_links).toHaveLength(5);
  });
});

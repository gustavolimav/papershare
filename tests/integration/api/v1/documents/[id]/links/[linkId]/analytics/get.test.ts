import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/documents/[id]/links/[linkId]/analytics", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000/analytics",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);
    const link = await orchestrator.createShareLink(ownerCookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(403);
  });

  test("With a nonexistent link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/00000000-0000-4000-8000-000000000000/analytics`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With no views yet", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const analytics = await response.json();

    expect(analytics.total_views).toBe(0);
    expect(analytics.unique_viewers).toBe(0);
    expect(analytics.avg_time_on_page).toBeNull();
    expect(analytics.avg_pages_viewed).toBeNull();
    expect(analytics.first_viewed_at).toBeNull();
    expect(analytics.last_viewed_at).toBeNull();
    expect(analytics.views_by_day).toHaveLength(30);
    expect(
      analytics.views_by_day.reduce(
        (sum: number, d: { count: number }) => sum + d.count,
        0,
      ),
    ).toBe(0);
    expect(analytics.page_breakdown).toEqual([]);
    expect(analytics.viewers).toEqual([]);
  });

  test("With correct totals after seeding known view rows", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-1",
      time_on_page: 10,
      pages_viewed: 1,
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-2",
      time_on_page: 20,
      pages_viewed: 2,
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-3",
      time_on_page: 30,
      pages_viewed: 3,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const analytics = await response.json();

    expect(analytics.total_views).toBe(3);
    expect(analytics.unique_viewers).toBe(3);
    expect(analytics.avg_time_on_page).toBe(20);
    expect(analytics.avg_pages_viewed).toBe(2);
    expect(Date.parse(analytics.first_viewed_at)).not.toBeNaN();
    expect(Date.parse(analytics.last_viewed_at)).not.toBeNaN();
    expect(analytics.views_by_day).toHaveLength(30);
    expect(
      analytics.views_by_day.reduce(
        (sum: number, d: { count: number }) => sum + d.count,
        0,
      ),
    ).toBe(3);
  });

  test("With page_times, aggregates average time per page across viewers", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "page-viewer-1",
      page_times: [
        { page: 1, seconds: 10 },
        { page: 2, seconds: 30 },
      ],
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "page-viewer-2",
      page_times: [{ page: 1, seconds: 20 }],
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    const analytics = await response.json();

    expect(analytics.page_breakdown).toEqual([
      { page_number: 1, avg_time_seconds: 15, view_count: 2 },
      { page_number: 2, avg_time_seconds: 30, view_count: 1 },
    ]);
  });

  test("Reporting page_times again for the same view accumulates instead of overwriting", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "accumulate-viewer",
      page_times: [{ page: 1, seconds: 10 }],
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "accumulate-viewer",
      page_times: [{ page: 1, seconds: 5 }],
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    const analytics = await response.json();

    expect(analytics.page_breakdown).toEqual([
      { page_number: 1, avg_time_seconds: 15, view_count: 1 },
    ]);
  });

  test("Returns per-viewer engagement scores, sorted highest first", async () => {
    const { cookie } = await orchestrator.createUserSession();
    // sample.pdf has page_count: 1, so pages_viewed: 1 is 100% of the document.
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    // "engaged-viewer": two separate visits (30+ min apart) totalling full
    // engaged-reading time, saw the whole document, and downloaded it.
    const firstVisit = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "engaged-viewer",
      time_on_page: 60,
      pages_viewed: 1,
    });
    await orchestrator.pushBackLinkViewCreatedAt(firstVisit.id, 40);
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "engaged-viewer",
      time_on_page: 60,
      downloaded: true,
    });

    // "quick-viewer": a single brief visit, no pages recorded, no download.
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "quick-viewer",
      time_on_page: 10,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );

    const analytics = await response.json();

    expect(analytics.viewers).toHaveLength(2);

    const [topViewer, secondViewer] = analytics.viewers;

    expect(topViewer).toMatchObject({
      total_time_on_page: 120,
      max_pages_viewed: 1,
      visit_count: 2,
      downloaded: true,
      engagement_score: 93,
    });

    expect(secondViewer).toMatchObject({
      total_time_on_page: 10,
      max_pages_viewed: 0,
      visit_count: 1,
      downloaded: false,
      engagement_score: 9,
    });

    expect(topViewer.engagement_score).toBeGreaterThan(
      secondViewer.engagement_score,
    );
  });
});

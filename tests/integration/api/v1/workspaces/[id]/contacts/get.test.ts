import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/workspaces/[id]/contacts", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/contacts",
    );

    expect(response.status).toBe(401);
  });

  test("As a non-member of the workspace", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/contacts`,
      { headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("A contact appears with the right document_count across two documents", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const documentA = await orchestrator.uploadDocument(cookie, {
      title: "Doc A",
    });
    const documentB = await orchestrator.uploadDocument(cookie, {
      title: "Doc B",
    });
    const linkA = await orchestrator.createShareLink(cookie, documentA.id);
    const linkB = await orchestrator.createShareLink(cookie, documentB.id);

    await orchestrator.recordView(linkA.token, {
      viewer_name: "Elena Vasquez",
      viewer_email: "elena@example.com",
    });
    await orchestrator.recordView(linkB.token, {
      viewer_name: "Elena Vasquez",
      viewer_email: "elena@example.com",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${documentA.workspace_id}/contacts`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total).toBe(1);
    expect(responseBody.contacts).toHaveLength(1);
    expect(responseBody.contacts[0]).toMatchObject({
      viewer_email: "elena@example.com",
      viewer_name: "Elena Vasquez",
      document_count: 2,
    });
  });

  test("engagement_score is higher for more time-on-page/pages/visits/downloads", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fp-highly-engaged",
      viewer_email: "engaged@example.com",
      time_on_page: 300,
      pages_viewed: document.page_count,
      downloaded: true,
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fp-barely-engaged",
      viewer_email: "barely@example.com",
      time_on_page: 5,
      pages_viewed: 1,
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/contacts`,
      { headers: { Cookie: cookie } },
    );

    const responseBody = await response.json();

    const engaged = responseBody.contacts.find(
      (c: { viewer_email: string }) => c.viewer_email === "engaged@example.com",
    );
    const barely = responseBody.contacts.find(
      (c: { viewer_email: string }) => c.viewer_email === "barely@example.com",
    );

    expect(engaged.engagement_score).toBeGreaterThan(barely.engagement_score);
  });

  test("A view with no viewer_email never creates a contact row", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_name: "Anonymous Visitor",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/contacts`,
      { headers: { Cookie: cookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.total).toBe(0);
    expect(responseBody.contacts).toHaveLength(0);
  });

  test("Does not include another workspace's contacts", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: otherCookie } = await orchestrator.createUserSession();

    const ownerDocument = await orchestrator.uploadDocument(ownerCookie);
    const ownerLink = await orchestrator.createShareLink(
      ownerCookie,
      ownerDocument.id,
    );
    await orchestrator.recordView(ownerLink.token, {
      viewer_email: "someone@example.com",
    });

    const otherDocument = await orchestrator.uploadDocument(otherCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${otherDocument.workspace_id}/contacts`,
      { headers: { Cookie: otherCookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.total).toBe(0);
    expect(responseBody.contacts).toHaveLength(0);
  });

  test("Supports pagination via page and per_page", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_email: "contact1@example.com",
    });
    await orchestrator.recordView(link.token, {
      viewer_email: "contact2@example.com",
    });
    await orchestrator.recordView(link.token, {
      viewer_email: "contact3@example.com",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/contacts?page=1&per_page=2`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total).toBe(3);
    expect(responseBody.contacts).toHaveLength(2);
  });
});

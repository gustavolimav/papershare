import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/workspaces/[id]/links", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/links",
    );

    expect(response.status).toBe(401);
  });

  test("As a non-member of the workspace", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/links`,
      { headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("A link appears with its document's title and a view_count of 0", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie, {
      title: "Series A Deck.pdf",
    });
    const link = await orchestrator.createShareLink(cookie, document.id, {
      label: "Investor link",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/links`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total).toBe(1);
    expect(responseBody.links).toHaveLength(1);
    expect(responseBody.links[0]).toMatchObject({
      id: link.id,
      token: link.token,
      label: "Investor link",
      document_id: document.id,
      document_title: "Series A Deck.pdf",
      view_count: 0,
      status: "active",
    });
  });

  test("view_count increments after a view is recorded", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token);
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "different-viewer",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/links`,
      { headers: { Cookie: cookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.links[0].view_count).toBe(2);
  });

  test("An expired link reports status: expired", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.expireShareLink(link.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/links`,
      { headers: { Cookie: cookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.links[0].status).toBe("expired");
  });

  test("A revoked link also reports status: expired", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/links`,
      { headers: { Cookie: cookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.links[0].status).toBe("expired");
  });

  test("Does not include another workspace's links", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: otherCookie } = await orchestrator.createUserSession();

    const ownerDocument = await orchestrator.uploadDocument(ownerCookie);
    await orchestrator.createShareLink(ownerCookie, ownerDocument.id);

    const otherDocument = await orchestrator.uploadDocument(otherCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${otherDocument.workspace_id}/links`,
      { headers: { Cookie: otherCookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.total).toBe(0);
    expect(responseBody.links).toHaveLength(0);
  });

  test("Supports pagination via page and per_page", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    await orchestrator.createShareLink(cookie, document.id, {
      label: "Link 1",
    });
    await orchestrator.createShareLink(cookie, document.id, {
      label: "Link 2",
    });
    await orchestrator.createShareLink(cookie, document.id, {
      label: "Link 3",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/links?page=1&per_page=2`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total).toBe(3);
    expect(responseBody.links).toHaveLength(2);
    // ordered by created_at DESC: most recently created link first
    expect(responseBody.links[0].label).toBe("Link 3");
    expect(responseBody.links[1].label).toBe("Link 2");
  });
});

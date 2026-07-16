import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/share/[token]/view", () => {
  test("With a nonexistent token", async () => {
    const responseBody = await orchestrator.recordView(
      "00000000-0000-4000-8000-000000000000",
    );

    expect(responseBody.name).toBe("NotFoundError");
  });

  test("With a revoked link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    const responseBody = await orchestrator.recordView(link.token);

    expect(responseBody.name).toBe("ForbiddenError");
    expect(responseBody.message).toBe("Este link foi revogado.");
  });

  test("With an expired link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    await orchestrator.expireShareLink(link.id);

    const responseBody = await orchestrator.recordView(link.token);

    expect(responseBody.name).toBe("ForbiddenError");
    expect(responseBody.message).toBe("Este link expirou.");
  });

  test("With a full body", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const responseBody = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fingerprint-1",
      time_on_page: 42,
      pages_viewed: 3,
    });

    expect(responseBody).toEqual({
      id: responseBody.id,
      share_link_id: link.id,
      viewer_fingerprint: "fingerprint-1",
      viewer_email: null,
      viewer_name: null,
      ip_address: responseBody.ip_address,
      country_code: null,
      user_agent: responseBody.user_agent,
      time_on_page: 42,
      pages_viewed: 3,
      downloaded: false,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
      is_new_viewer: true,
    });
  });

  test("With a viewer_email, persists it on the view", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      require_email: true,
    });

    const responseBody = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fingerprint-email-1",
      viewer_email: "viewer@example.com",
    });

    expect(responseBody.viewer_email).toBe("viewer@example.com");
  });

  test("With a viewer_name, persists it on the view", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      nda_text: "Keep this confidential.",
    });

    const responseBody = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fingerprint-name-1",
      viewer_email: "viewer@example.com",
      viewer_name: "Jane Viewer",
    });

    expect(responseBody.viewer_name).toBe("Jane Viewer");
  });

  test("With downloaded: true, persists it on the view", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const responseBody = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fingerprint-download-1",
      downloaded: true,
    });

    expect(responseBody.downloaded).toBe(true);
  });

  test("Once downloaded is true, a later update without it doesn't clear it", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fingerprint-download-2",
      downloaded: true,
    });

    const secondView = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fingerprint-download-2",
      time_on_page: 5,
    });

    expect(secondView.downloaded).toBe(true);
  });

  test("With notify_on_view disabled on the link, recording still succeeds", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      notify_on_view: false,
    });

    const responseBody = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "muted-link-viewer",
    });

    // notify_on_view only gates the fire-and-forget email, never the view
    // recording itself or the is_new_viewer signal.
    expect(responseBody.share_link_id).toBe(link.id);
    expect(responseBody.is_new_viewer).toBe(true);
  });

  test("With an empty body (no password required, even on a protected link)", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      password: "secret123",
    });

    const responseBody = await orchestrator.recordView(link.token);

    expect(responseBody.share_link_id).toBe(link.id);
    expect(responseBody.viewer_fingerprint).toBeNull();
    expect(responseBody.time_on_page).toBeNull();
    expect(responseBody.pages_viewed).toBeNull();
    expect(responseBody.is_new_viewer).toBe(false);
  });
});

describe("Unique viewer deduplication (30-min window)", () => {
  test("Same fingerprint within 30 minutes updates the existing row", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const firstView = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "dedup-1",
      time_on_page: 10,
    });

    const secondView = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "dedup-1",
      time_on_page: 55,
    });

    expect(secondView.id).toBe(firstView.id);
    expect(secondView.time_on_page).toBe(55);
    expect(firstView.is_new_viewer).toBe(true);
    expect(secondView.is_new_viewer).toBe(false);

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(1);
  });

  test("Same fingerprint more than 30 minutes apart creates a new row, but is not a new viewer", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const firstView = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "dedup-2",
    });

    await orchestrator.pushBackLinkViewCreatedAt(firstView.id, 31);

    const secondView = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "dedup-2",
    });

    expect(secondView.id).not.toBe(firstView.id);
    expect(firstView.is_new_viewer).toBe(true);
    expect(secondView.is_new_viewer).toBe(false);

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(2);
  });

  test("Without a fingerprint, always creates a new row and is never a new viewer", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const firstView = await orchestrator.recordView(link.token);
    const secondView = await orchestrator.recordView(link.token);

    expect(firstView.is_new_viewer).toBe(false);
    expect(secondView.is_new_viewer).toBe(false);

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(2);
  });

  test("Different fingerprints create separate rows and are each a new viewer", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const viewA = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-a",
    });
    const viewB = await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-b",
    });

    expect(viewA.is_new_viewer).toBe(true);
    expect(viewB.is_new_viewer).toBe(true);

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(2);
  });
});

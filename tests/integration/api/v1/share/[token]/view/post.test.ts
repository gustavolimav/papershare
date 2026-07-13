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
      ip_address: responseBody.ip_address,
      country_code: null,
      user_agent: responseBody.user_agent,
      time_on_page: 42,
      pages_viewed: 3,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
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

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(1);
  });

  test("Same fingerprint more than 30 minutes apart creates a new row", async () => {
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

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(2);
  });

  test("Without a fingerprint, always creates a new row", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token);
    await orchestrator.recordView(link.token);

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(2);
  });

  test("Different fingerprints create separate rows", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-a",
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "viewer-b",
    });

    const count = await orchestrator.countLinkViews(link.id);
    expect(count).toBe(2);
  });
});

import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/documents/[id]/links/[linkId]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000",
      { method: "PATCH" },
    );

    expect(response.status).toBe(401);
  });

  test("Without any field", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
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
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: attackerCookie,
        },
        body: JSON.stringify({ label: "hacked" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("With a nonexistent link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/00000000-0000-4000-8000-000000000000`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ label: "new label" }),
      },
    );

    expect(response.status).toBe(404);
  });

  test("Updating the label", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      label: "Original",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ label: "Updated" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.label).toBe("Updated");
  });

  test("Setting a password then clearing it with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      password: "secret123",
    });

    const clearResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ password: null }),
      },
    );

    expect(clearResponse.status).toBe(200);

    const responseBody = await clearResponse.json();
    expect(responseBody.has_password).toBe(false);
  });

  test("Toggling notify_on_view off", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.notify_on_view).toBe(true);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ notify_on_view: false }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.notify_on_view).toBe(false);
  });

  test("Toggling require_email on", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.require_email).toBe(false);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ require_email: true }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.require_email).toBe(true);
  });

  test("Setting allowed_emails then clearing with an empty array", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.allowed_emails).toEqual([]);

    const setResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          allowed_emails: ["viewer1@example.com", "viewer2@example.com"],
        }),
      },
    );

    expect(setResponse.status).toBe(200);
    const setBody = await setResponse.json();
    expect([...setBody.allowed_emails].sort()).toEqual(
      ["viewer1@example.com", "viewer2@example.com"].sort(),
    );

    const clearResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ allowed_emails: [] }),
      },
    );

    expect(clearResponse.status).toBe(200);
    const clearBody = await clearResponse.json();
    expect(clearBody.allowed_emails).toEqual([]);
  });

  test("Toggling watermark_enabled on", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.watermark_enabled).toBe(false);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ watermark_enabled: true }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.watermark_enabled).toBe(true);
  });

  test("Setting nda_text then clearing it with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.nda_text).toBeNull();

    const setResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ nda_text: "Confidential terms apply." }),
      },
    );

    expect(setResponse.status).toBe(200);
    const setBody = await setResponse.json();
    expect(setBody.nda_text).toBe("Confidential terms apply.");

    const clearResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ nda_text: null }),
      },
    );

    expect(clearResponse.status).toBe(200);
    const clearBody = await clearResponse.json();
    expect(clearBody.nda_text).toBeNull();
  });

  test("Setting brand_accent_color then clearing it with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.brand_accent_color).toBeNull();

    const setResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ brand_accent_color: "#123ABC" }),
      },
    );

    expect(setResponse.status).toBe(200);
    const setBody = await setResponse.json();
    expect(setBody.brand_accent_color).toBe("#123ABC");

    const clearResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ brand_accent_color: null }),
      },
    );

    expect(clearResponse.status).toBe(200);
    const clearBody = await clearResponse.json();
    expect(clearBody.brand_accent_color).toBeNull();
  });

  test("Setting brand_welcome_message then clearing it with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    expect(link.brand_welcome_message).toBeNull();

    const setResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ brand_welcome_message: "Welcome!" }),
      },
    );

    expect(setResponse.status).toBe(200);
    const setBody = await setResponse.json();
    expect(setBody.brand_welcome_message).toBe("Welcome!");

    const clearResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ brand_welcome_message: null }),
      },
    );

    expect(clearResponse.status).toBe(200);
    const clearBody = await clearResponse.json();
    expect(clearBody.brand_welcome_message).toBeNull();
  });

  test("Clearing expires_at with null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ expires_at: null }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.expires_at).toBeNull();
  });
});

describe("DELETE /api/v1/documents/[id]/links/[linkId]", () => {
  test("Without session cookie", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-4000-8000-000000000000/links/00000000-0000-4000-8000-000000000000",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: attackerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);
    const link = await orchestrator.createShareLink(ownerCookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: attackerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("With a nonexistent link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/00000000-0000-4000-8000-000000000000`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });

  test("Revoking an active link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.is_active).toBe(false);
  });
});

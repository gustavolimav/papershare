import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/share/[token]/nda", () => {
  test("With a nonexistent token", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/share/00000000-0000-4000-8000-000000000000/nda",
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.nda_text).toBeNull();
  });

  test("With a link that has no NDA configured", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/nda`,
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.nda_text).toBeNull();
  });

  test("With a link that has an NDA configured, no password/email/name needed", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      password: "secret123",
      nda_text: "Keep this confidential.",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/nda`,
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.nda_text).toBe("Keep this confidential.");
  });

  test("With a revoked link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      nda_text: "Keep this confidential.",
    });

    await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}/nda`,
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.nda_text).toBeNull();
  });
});

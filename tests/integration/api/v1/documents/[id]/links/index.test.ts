import path from "path";
import fs from "fs";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

const FIXTURE_PDF = path.resolve("tests/fixtures/sample.pdf");

async function uploadDocument(cookie: string, title = "Test Doc") {
  const pdfBuffer = fs.readFileSync(FIXTURE_PDF);
  const form = new FormData();
  form.append(
    "file",
    new Blob([pdfBuffer], { type: "application/pdf" }),
    "sample.pdf",
  );
  form.append("title", title);

  const response = await fetch("http://localhost:3000/api/v1/documents", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });

  return response.json() as Promise<{ id: string }>;
}

describe("POST /api/v1/documents/[id]/links", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/some-id/links",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("With non-existent document returns 404", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch(
      "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000/links",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(404);
  });

  test("With another user's document returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links`,
      {
        method: "POST",
        headers: { Cookie: cookieB, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(403);
  });

  test("Creates link with defaults", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links`,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.token).toBeDefined();
    expect(body.document_id).toBe(doc.id);
    expect(body.allow_download).toBe(true);
    expect(body.is_active).toBe(true);
    expect(body.label).toBeNull();
    expect(body.expires_at).toBeNull();
  });

  test("Creates link with label, password and expiration", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links`,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "My share link",
          password: "secret123",
          expires_at: expiresAt,
          allow_download: false,
        }),
      },
    );

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.label).toBe("My share link");
    expect(body.allow_download).toBe(false);
    expect(body.expires_at).toBeDefined();
    // password_hash must never be exposed
    expect(body.password_hash).toBeUndefined();
  });
});

describe("GET /api/v1/documents/[id]/links", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/some-id/links",
    );

    expect(response.status).toBe(401);
  });

  test("With another user's document returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links`,
      { headers: { Cookie: cookieB } },
    );

    expect(response.status).toBe(403);
  });

  test("Returns all links for own document", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);

    // Create two links
    for (let i = 0; i < 2; i++) {
      await fetch(`http://localhost:3000/api/v1/documents/${doc.id}/links`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Link ${i + 1}` }),
      });
    }

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
  });
});

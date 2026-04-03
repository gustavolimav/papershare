import path from "path";
import fs from "fs";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

const FIXTURE_PDF = path.resolve("tests/fixtures/sample.pdf");

async function uploadDocument(cookie: string) {
  const pdfBuffer = fs.readFileSync(FIXTURE_PDF);
  const form = new FormData();
  form.append(
    "file",
    new Blob([pdfBuffer], { type: "application/pdf" }),
    "sample.pdf",
  );
  form.append("title", "Test Doc");

  const response = await fetch("http://localhost:3000/api/v1/documents", {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });

  return response.json() as Promise<{ id: string }>;
}

async function createLink(
  cookie: string,
  docId: string,
  body: Record<string, unknown> = {},
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/documents/${docId}/links`,
    {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return response.json() as Promise<{ id: string; token: string }>;
}

describe("GET /api/v1/share/[token]", () => {
  test("Unknown token returns 404", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/share/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
  });

  test("Valid token returns document and link metadata", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.link).toBeDefined();
    expect(body.document).toBeDefined();
    expect(body.link.token).toBe(link.token);
    expect(body.document.title).toBe("Test Doc");
    // Sensitive fields must not be exposed
    expect(body.link.password_hash).toBeUndefined();
    expect(body.link.user_id).toBeUndefined();
    expect(body.document.storage_key).toBeUndefined();
  });

  test("Password-protected link without password returns 403", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id, { password: "secret123" });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );

    expect(response.status).toBe(403);
  });

  test("Password-protected link with wrong password returns 403", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id, { password: "secret123" });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}?password=wrong`,
    );

    expect(response.status).toBe(403);
  });

  test("Password-protected link with correct password returns 200", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id, { password: "secret123" });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}?password=secret123`,
    );

    expect(response.status).toBe(200);
  });

  test("Expired link returns 403", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);

    // Create link with expiration in the past
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const link = await createLink(cookie, doc.id, { expires_at: pastDate });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.message).toContain("expirou");
  });

  test("Download-disabled link does not expose storage key", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id, { allow_download: false });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.link.allow_download).toBe(false);
    expect(body.document.storage_key).toBeUndefined();
  });
});

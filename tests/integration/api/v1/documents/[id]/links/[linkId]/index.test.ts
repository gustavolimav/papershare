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

describe("PATCH /api/v1/documents/[id]/links/[linkId]", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/doc-id/links/link-id",
      { method: "PATCH" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's link returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);
    const link = await createLink(cookieA, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { Cookie: cookieB, "Content-Type": "application/json" },
        body: JSON.stringify({ label: "hacked" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("Without body returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });

  test("Updates label", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Updated label" }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.label).toBe("Updated label");
  });

  test("Revokes link by setting is_active to false", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.is_active).toBe(false);
  });

  test("Clears password by setting it to null", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id, { password: "secret123" });

    // Verify token requires password first
    const sharesRes1 = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );
    expect(sharesRes1.status).toBe(403);

    // Remove password
    await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ password: null }),
      },
    );

    // Now token should be accessible without password
    const sharesRes2 = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );
    expect(sharesRes2.status).toBe(200);
  });
});

describe("DELETE /api/v1/documents/[id]/links/[linkId]", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/doc-id/links/link-id",
      { method: "DELETE" },
    );

    expect(response.status).toBe(401);
  });

  test("With another user's link returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);
    const link = await createLink(cookieA, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookieB } },
    );

    expect(response.status).toBe(403);
  });

  test("Revokes own link and returns 204", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(204);
  });

  test("Revoked link returns 403 on public access", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);
    const link = await createLink(cookie, doc.id);

    // Verify accessible before revocation
    const before = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );
    expect(before.status).toBe(200);

    // Revoke
    await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    // Should now return 403
    const after = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );
    expect(after.status).toBe(403);
  });
});

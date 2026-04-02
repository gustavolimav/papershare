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

describe("GET /api/v1/documents/[id]", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/some-id",
    );
    expect(response.status).toBe(401);
  });

  test("Accessing another user's document returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      { headers: { Cookie: cookieB } },
    );

    expect(response.status).toBe(403);
  });

  test("Returns own document", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie, "My Doc");

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(doc.id);
    expect(body.title).toBe("My Doc");
  });
});

describe("PATCH /api/v1/documents/[id]", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/some-id",
      { method: "PATCH" },
    );
    expect(response.status).toBe(401);
  });

  test("Updating another user's document returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookieB },
        body: JSON.stringify({ title: "Hacked" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("Updates own document", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie, "Old Title");

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ title: "New Title" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("New Title");
  });

  test("Empty body returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/v1/documents/[id]", () => {
  test("Without session returns 401", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/documents/some-id",
      { method: "DELETE" },
    );
    expect(response.status).toBe(401);
  });

  test("Deleting another user's document returns 403", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const doc = await uploadDocument(cookieA);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      { method: "DELETE", headers: { Cookie: cookieB } },
    );

    expect(response.status).toBe(403);
  });

  test("Deletes own document and it becomes inaccessible", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const doc = await uploadDocument(cookie);

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(deleteResponse.status).toBe(204);

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${doc.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(getResponse.status).toBe(404);
  });
});

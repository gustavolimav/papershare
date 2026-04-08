import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function uploadDocument(cookie: string, title: string) {
  const form = new FormData();
  form.append("title", title);
  const blob = new Blob(["%PDF-1.4 test content"], {
    type: "application/pdf",
  });
  form.append("file", blob, "test.pdf");

  const response = await fetch("http://localhost:3000/api/v1/documents", {
    method: "POST",
    body: form,
    headers: { Cookie: cookie },
  });

  return await response.json();
}

describe("GET /api/v1/documents/[id]", () => {
  describe("Running as anonymous user", () => {
    test("Should return 401", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
      );
      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("Returns own document by id", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "My Document");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(doc.id);
      expect(body.title).toBe("My Document");
      expect(body.storage_key).toBeUndefined();
    });

    test("Returns 404 for non-existent document", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(404);
    });
  });
});

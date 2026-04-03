import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function uploadDocument(cookie: string, title: string) {
  const form = new FormData();
  form.append("title", title);
  const blob = new Blob([Buffer.from("%PDF-1.4 test content")], {
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

describe("DELETE /api/v1/documents/[id]", () => {
  describe("Running as anonymous user", () => {
    test("Should return 401", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
        { method: "DELETE" },
      );
      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("Soft-deletes own document and makes it unfindable", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "To Be Deleted");

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

    test("Returns 403 when deleting another user's document", async () => {
      const { cookie: cookieA } = await orchestrator.createUserSession();
      const { cookie: cookieB } = await orchestrator.createUserSession();

      const doc = await uploadDocument(cookieA, "User A Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        { method: "DELETE", headers: { Cookie: cookieB } },
      );

      expect(response.status).toBe(403);
    });
  });
});

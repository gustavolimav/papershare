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

describe("PATCH /api/v1/documents/[id]", () => {
  describe("Running as anonymous user", () => {
    test("Should return 401", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New" }),
        },
      );
      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("Updates own document title", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "Original Title");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ title: "Updated Title" }),
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.title).toBe("Updated Title");
    });

    test("Returns 403 when updating another user's document", async () => {
      const { cookie: cookieA } = await orchestrator.createUserSession();
      const { cookie: cookieB } = await orchestrator.createUserSession();

      const doc = await uploadDocument(cookieA, "User A Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Cookie: cookieB },
          body: JSON.stringify({ title: "Stolen" }),
        },
      );

      expect(response.status).toBe(403);
    });

    test("Returns 400 when no fields provided", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "My Doc");

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
});

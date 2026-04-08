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

describe("GET /api/v1/documents", () => {
  describe("Running as anonymous user", () => {
    test("Should return 401", async () => {
      const response = await fetch("http://localhost:3000/api/v1/documents");
      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("Returns empty list when no documents exist", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
    });

    test("Returns own documents and not other users'", async () => {
      const { cookie: cookieA } = await orchestrator.createUserSession();
      const { cookie: cookieB } = await orchestrator.createUserSession();

      await uploadDocument(cookieA, "Doc A1");
      await uploadDocument(cookieA, "Doc A2");
      await uploadDocument(cookieB, "Doc B1");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: cookieA },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.meta.total).toBe(2);
      expect(
        body.data.every(
          (d: { storage_key?: string }) => d.storage_key === undefined,
        ),
      ).toBe(true);
    });

    test("Pagination works correctly", async () => {
      const { cookie } = await orchestrator.createUserSession();

      for (let i = 1; i <= 5; i++) {
        await uploadDocument(cookie, `Paginated Doc ${i}`);
      }

      const response = await fetch(
        "http://localhost:3000/api/v1/documents?page=2&limit=2",
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.meta.page).toBe(2);
      expect(body.meta.limit).toBe(2);
      expect(body.meta.total).toBe(5);
      expect(body.meta.total_pages).toBe(3);
    });
  });
});

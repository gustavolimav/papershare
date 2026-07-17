import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/documents", () => {
  describe("Anonymous user", () => {
    test("Without session cookie", async () => {
      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    test("With a valid PDF upload", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const responseBody = await orchestrator.uploadDocument(cookie, {
        title: "My contract",
        description: "A sample contract",
      });

      expect(responseBody).toEqual({
        id: responseBody.id,
        title: "My contract",
        description: "A sample contract",
        original_filename: "sample.pdf",
        storage_key: responseBody.storage_key,
        mime_type: "application/pdf",
        size_bytes: responseBody.size_bytes,
        page_count: 1,
        user_id: responseBody.user_id,
        workspace_id: responseBody.workspace_id,
        ai_summary: null,
        ai_summary_generated_at: null,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
        deleted_at: null,
      });

      expect(responseBody.size_bytes).toBeGreaterThan(0);
      expect(responseBody.storage_key).toMatch(/\.pdf$/);
    });

    test("Without a file", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const formData = new FormData();
      formData.append("title", "Missing file");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: formData,
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("Without a title", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([Buffer.from("pdf bytes")], { type: "application/pdf" }),
        "sample.pdf",
      );

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: formData,
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("With a disallowed MIME type", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const responseBody = await orchestrator.uploadDocument(cookie, {
        filename: "malware.exe",
        mimeType: "application/x-msdownload",
        buffer: Buffer.from("not a real document"),
      });

      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toContain("Tipo de arquivo não suportado");
    });

    test("With a file exceeding the max size", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const oversizedBuffer = Buffer.alloc(3 * 1024 * 1024, "a");

      const responseBody = await orchestrator.uploadDocument(cookie, {
        buffer: oversizedBuffer,
      });

      expect(responseBody.name).toBe("ValidationError");
    });
  });
});

describe("GET /api/v1/documents", () => {
  describe("Anonymous user", () => {
    test("Without session cookie", async () => {
      const response = await fetch("http://localhost:3000/api/v1/documents");

      expect(response.status).toBe(401);
    });
  });

  describe("Authenticated user", () => {
    test("Lists only the authenticated user's documents", async () => {
      const { cookie: ownerCookie } = await orchestrator.createUserSession();
      const { cookie: otherCookie } = await orchestrator.createUserSession();

      await orchestrator.uploadDocument(ownerCookie, { title: "Owner doc" });
      await orchestrator.uploadDocument(otherCookie, { title: "Other doc" });

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: ownerCookie },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.total).toBe(1);
      expect(responseBody.documents).toHaveLength(1);
      expect(responseBody.documents[0].title).toBe("Owner doc");
    });

    test("Supports pagination via page and per_page", async () => {
      const { cookie } = await orchestrator.createUserSession();

      await orchestrator.uploadDocument(cookie, { title: "Doc 1" });
      await orchestrator.uploadDocument(cookie, { title: "Doc 2" });
      await orchestrator.uploadDocument(cookie, { title: "Doc 3" });

      const response = await fetch(
        "http://localhost:3000/api/v1/documents?page=1&per_page=2",
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.total).toBe(3);
      expect(responseBody.documents).toHaveLength(2);
      // ordered by created_at DESC: most recent upload first
      expect(responseBody.documents[0].title).toBe("Doc 3");
      expect(responseBody.documents[1].title).toBe("Doc 2");
    });
  });
});

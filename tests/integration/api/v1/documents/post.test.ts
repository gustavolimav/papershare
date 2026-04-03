import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function buildUploadForm(
  title: string,
  fileBuffer?: Buffer,
  mimeType = "application/pdf",
  filename = "test.pdf",
) {
  const form = new FormData();
  form.append("title", title);
  if (fileBuffer) {
    const blob = new Blob([fileBuffer], { type: mimeType });
    form.append("file", blob, filename);
  }
  return form;
}

describe("POST /api/v1/documents", () => {
  describe("Running as anonymous user", () => {
    test("Should return 401", async () => {
      const form = new FormData();
      form.append("title", "Test Doc");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        body: form,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("With a valid PDF file", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const form = await buildUploadForm(
        "My Test PDF",
        Buffer.from("%PDF-1.4 test content"),
      );
      form.append("description", "A test description");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        body: form,
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.title).toBe("My Test PDF");
      expect(body.description).toBe("A test description");
      expect(body.original_filename).toBe("test.pdf");
      expect(body.mime_type).toBe("application/pdf");
      expect(body.size_bytes).toBeGreaterThan(0);
      expect(body.id).toBeDefined();
      expect(body.user_id).toBeDefined();
      expect(Date.parse(body.created_at)).not.toBeNaN();
    });

    test("Without a file returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const form = new FormData();
      form.append("title", "Missing file");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        body: form,
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(400);
    });

    test("Without a title returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const form = await buildUploadForm(
        "",
        Buffer.from("%PDF-1.4 test content"),
      );

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        body: form,
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(400);
    });

    test("With unsupported file type returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const form = await buildUploadForm(
        "Bad file",
        Buffer.from("image data"),
        "image/jpeg",
        "photo.jpg",
      );

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        body: form,
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(400);
    });
  });
});

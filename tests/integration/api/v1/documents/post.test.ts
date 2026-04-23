import fs from "fs";
import path from "path";
import orchestrator from "tests/orchestrator";

const SAMPLE_PDF_PATH = path.resolve(
  process.cwd(),
  "tests/fixtures/sample.pdf",
);

function makePdfFormData(title: string, description?: string): FormData {
  const pdfBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, "sample.pdf");
  form.append("title", title);
  if (description !== undefined) {
    form.append("description", description);
  }
  return form;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/documents", () => {
  describe("Running as unauthenticated user", () => {
    test("Without session cookie returns 401", async () => {
      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        body: makePdfFormData("Test Doc"),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("With valid PDF file and title returns 201 with document", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: makePdfFormData("My First Document", "A test description"),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      expect(body).toMatchObject({
        title: "My First Document",
        description: "A test description",
        original_filename: "sample.pdf",
        mime_type: "application/pdf",
      });
      expect(typeof body.id).toBe("string");
      expect(typeof body.storage_key).toBe("string");
      expect(body.storage_key).toMatch(/\.pdf$/);
      expect(typeof body.size_bytes).toBe("number");
      expect(body.size_bytes).toBeGreaterThan(0);
      expect(body.deleted_at).toBeUndefined();
    });

    test("With valid PDF and no description returns 201", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: makePdfFormData("No Description Doc"),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      expect(body.description).toBeNull();
    });

    test("Without 'file' field returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const form = new FormData();
      form.append("title", "Missing file");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      expect(body).toEqual({
        name: "ValidationError",
        message: "O arquivo é obrigatório.",
        action: "Envie um arquivo no campo 'file' do formulário.",
        status: 400,
      });
    });

    test("Without 'title' field returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const pdfBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
      const form = new FormData();
      form.append(
        "file",
        new Blob([pdfBuffer], { type: "application/pdf" }),
        "sample.pdf",
      );

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      expect(body.name).toBe("ValidationError");
      expect(body.status).toBe(400);
    });

    test("With disallowed MIME type returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const form = new FormData();
      form.append(
        "file",
        new Blob(["plain text content"], { type: "text/plain" }),
        "file.txt",
      );
      form.append("title", "Wrong type");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      expect(body.name).toBe("ValidationError");
      expect(body.status).toBe(400);
      expect(body.message).toMatch(/Tipo de arquivo não permitido/);
    });
  });
});

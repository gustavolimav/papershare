import fs from "fs";
import path from "path";
import orchestrator from "tests/orchestrator";

const SAMPLE_PDF_PATH = path.resolve(
  process.cwd(),
  "tests/fixtures/sample.pdf",
);

async function uploadDocument(
  cookie: string,
  title = "Test Document",
): Promise<Record<string, unknown>> {
  const pdfBuffer = fs.readFileSync(SAMPLE_PDF_PATH);
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

  return response.json() as Promise<Record<string, unknown>>;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/documents/[id]", () => {
  describe("Running as unauthenticated user", () => {
    test("Without session cookie returns 401", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/documents/some-id",
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("With a valid owned document returns 200 with document", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "My Document");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body).toMatchObject({
        id: doc.id,
        title: "My Document",
        mime_type: "application/pdf",
      });
      expect(body.deleted_at).toBeUndefined();
    });

    test("With a non-existent document id returns 404", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(404);

      const body = await response.json();

      expect(body.name).toBe("NotFoundError");
      expect(body.status).toBe(404);
    });

    test("Accessing another user's document returns 403", async () => {
      const { cookie: ownerCookie } = await orchestrator.createUserSession();
      const { cookie: attackerCookie } = await orchestrator.createUserSession();

      const doc = await uploadDocument(ownerCookie, "Owner's Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        { headers: { Cookie: attackerCookie } },
      );

      expect(response.status).toBe(403);

      const body = await response.json();

      expect(body).toEqual({
        name: "ForbiddenError",
        message: "Você não tem permissão para acessar este documento.",
        action: "Você só pode acessar os seus próprios documentos.",
        status: 403,
      });
    });
  });
});

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

describe("PATCH /api/v1/documents/[id]", () => {
  describe("Running as unauthenticated user", () => {
    test("Without session cookie returns 401", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/documents/some-id",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New title" }),
        },
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("Updating title returns 200 with updated document", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "Original Title");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "Updated Title" }),
        },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.title).toBe("Updated Title");
      expect(body.id).toBe(doc.id);
    });

    test("Updating description returns 200 with updated document", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "Doc With Description");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description: "New description" }),
        },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.description).toBe("New description");
    });

    test("Without any field returns 400", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "Some Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);

      const body = await response.json();

      expect(body.name).toBe("ValidationError");
      expect(body.status).toBe(400);
    });

    test("Patching another user's document returns 403", async () => {
      const { cookie: ownerCookie } = await orchestrator.createUserSession();
      const { cookie: attackerCookie } = await orchestrator.createUserSession();

      const doc = await uploadDocument(ownerCookie, "Owner's Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: attackerCookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "Stolen" }),
        },
      );

      expect(response.status).toBe(403);
    });

    test("Patching a non-existent document returns 404", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
        {
          method: "PATCH",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "Ghost" }),
        },
      );

      expect(response.status).toBe(404);
    });

    test("PATCH does not allow changing mime_type or storage_key", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "Immutable Fields Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "PATCH",
          headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Updated",
            mime_type: "text/plain",
            storage_key: "hacked",
          }),
        },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.mime_type).toBe("application/pdf");
      expect(body.storage_key).toBe(doc.storage_key);
    });
  });
});

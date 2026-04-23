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

describe("DELETE /api/v1/documents/[id]", () => {
  describe("Running as unauthenticated user", () => {
    test("Without session cookie returns 401", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/documents/some-id",
        { method: "DELETE" },
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("Deleting own document returns 204", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "To Be Deleted");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "DELETE",
          headers: { Cookie: cookie },
        },
      );

      expect(response.status).toBe(204);
    });

    test("After deletion, GET returns 404", async () => {
      const { cookie } = await orchestrator.createUserSession();
      const doc = await uploadDocument(cookie, "Will Disappear");

      await fetch(`http://localhost:3000/api/v1/documents/${doc.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });

      const getResponse = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        { headers: { Cookie: cookie } },
      );

      expect(getResponse.status).toBe(404);
    });

    test("After deletion, document does not appear in list", async () => {
      const { cookie } = await orchestrator.createUserSession();
      await uploadDocument(cookie, "Stays");
      const toDelete = await uploadDocument(cookie, "Gets Deleted");

      await fetch(`http://localhost:3000/api/v1/documents/${toDelete.id}`, {
        method: "DELETE",
        headers: { Cookie: cookie },
      });

      const listResponse = await fetch(
        "http://localhost:3000/api/v1/documents",
        { headers: { Cookie: cookie } },
      );

      const body = await listResponse.json();

      expect(body.total).toBe(1);
      expect(body.documents[0].title).toBe("Stays");
    });

    test("Deleting another user's document returns 403", async () => {
      const { cookie: ownerCookie } = await orchestrator.createUserSession();
      const { cookie: attackerCookie } = await orchestrator.createUserSession();

      const doc = await uploadDocument(ownerCookie, "Owner's Doc");

      const response = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        {
          method: "DELETE",
          headers: { Cookie: attackerCookie },
        },
      );

      expect(response.status).toBe(403);
    });

    test("Deleting a non-existent document returns 404", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch(
        "http://localhost:3000/api/v1/documents/00000000-0000-0000-0000-000000000000",
        {
          method: "DELETE",
          headers: { Cookie: cookie },
        },
      );

      expect(response.status).toBe(404);
    });
  });
});

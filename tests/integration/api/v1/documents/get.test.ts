import fs from "fs";
import path from "path";
import orchestrator from "tests/orchestrator";

const SAMPLE_PDF_PATH = path.resolve(
  process.cwd(),
  "tests/fixtures/sample.pdf",
);

async function uploadDocument(
  cookie: string,
  title: string,
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

describe("GET /api/v1/documents", () => {
  describe("Running as unauthenticated user", () => {
    test("Without session cookie returns 401", async () => {
      const response = await fetch("http://localhost:3000/api/v1/documents");

      expect(response.status).toBe(401);
    });
  });

  describe("Running as authenticated user", () => {
    test("With no documents returns empty list", async () => {
      const { cookie } = await orchestrator.createUserSession();

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: cookie },
      });

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body).toEqual({ documents: [], total: 0 });
    });

    test("Returns only the authenticated user's documents", async () => {
      const { cookie: cookieA } = await orchestrator.createUserSession();
      const { cookie: cookieB } = await orchestrator.createUserSession();

      await uploadDocument(cookieA, "Doc from user A");
      await uploadDocument(cookieA, "Another doc from user A");
      await uploadDocument(cookieB, "Doc from user B");

      const responseA = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: cookieA },
      });

      const bodyA = await responseA.json();

      expect(responseA.status).toBe(200);
      expect(bodyA.total).toBe(2);
      expect(bodyA.documents).toHaveLength(2);

      const responseB = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: cookieB },
      });

      const bodyB = await responseB.json();

      expect(responseB.status).toBe(200);
      expect(bodyB.total).toBe(1);
      expect(bodyB.documents).toHaveLength(1);
    });

    test("Supports pagination via page and per_page params", async () => {
      const { cookie } = await orchestrator.createUserSession();

      for (let i = 1; i <= 3; i++) {
        await uploadDocument(cookie, `Paginated Doc ${i}`);
      }

      const response = await fetch(
        "http://localhost:3000/api/v1/documents?page=1&per_page=2",
        { headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.total).toBe(3);
      expect(body.documents).toHaveLength(2);
    });

    test("Results are ordered by created_at DESC", async () => {
      const { cookie } = await orchestrator.createUserSession();

      await uploadDocument(cookie, "First uploaded");
      await uploadDocument(cookie, "Second uploaded");

      const response = await fetch("http://localhost:3000/api/v1/documents", {
        headers: { Cookie: cookie },
      });

      const body = await response.json();

      expect(body.documents[0].title).toBe("Second uploaded");
      expect(body.documents[1].title).toBe("First uploaded");
    });
  });
});

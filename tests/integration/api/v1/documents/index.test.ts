import path from "path";
import fs from "fs";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

const FIXTURE_PDF = path.resolve("tests/fixtures/sample.pdf");

describe("POST /api/v1/documents", () => {
  test("Without session returns 401", async () => {
    const response = await fetch("http://localhost:3000/api/v1/documents", {
      method: "POST",
    });

    expect(response.status).toBe(401);
  });

  test("Without file returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const response = await fetch("http://localhost:3000/api/v1/documents", {
      method: "POST",
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("arquivo");
  });

  test("With invalid file type returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from("not a valid file")], { type: "text/plain" }),
      "test.txt",
    );

    const response = await fetch("http://localhost:3000/api/v1/documents", {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.name).toBe("ValidationError");
    expect(body.message).toContain("suportado");
  });

  test("Upload valid PDF returns 201 with document metadata", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const pdfBuffer = fs.readFileSync(FIXTURE_PDF);
    const form = new FormData();
    form.append(
      "file",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "sample.pdf",
    );
    form.append("title", "My Test Document");
    form.append("description", "A test description");

    const response = await fetch("http://localhost:3000/api/v1/documents", {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe("My Test Document");
    expect(body.description).toBe("A test description");
    expect(body.mime_type).toBe("application/pdf");
    expect(body.original_filename).toBe("sample.pdf");
    expect(body.size_bytes).toBeGreaterThan(0);
  });
});

describe("GET /api/v1/documents", () => {
  test("Without session returns 401", async () => {
    const response = await fetch("http://localhost:3000/api/v1/documents");
    expect(response.status).toBe(401);
  });

  test("Returns paginated list of own documents", async () => {
    const { cookie } = await orchestrator.createUserSession();

    const pdfBuffer = fs.readFileSync(FIXTURE_PDF);

    // Upload two documents
    for (let i = 0; i < 2; i++) {
      const form = new FormData();
      form.append(
        "file",
        new Blob([pdfBuffer], { type: "application/pdf" }),
        "sample.pdf",
      );
      form.append("title", `Document ${i + 1}`);

      await fetch("http://localhost:3000/api/v1/documents", {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      });
    }

    const response = await fetch("http://localhost:3000/api/v1/documents", {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.page).toBe(1);
  });

  test("Does not return documents from other users", async () => {
    const { cookie: cookieA } = await orchestrator.createUserSession();
    const { cookie: cookieB } = await orchestrator.createUserSession();

    const pdfBuffer = fs.readFileSync(FIXTURE_PDF);
    const form = new FormData();
    form.append(
      "file",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      "sample.pdf",
    );
    form.append("title", "User A doc");

    await fetch("http://localhost:3000/api/v1/documents", {
      method: "POST",
      headers: { Cookie: cookieA },
      body: form,
    });

    const response = await fetch("http://localhost:3000/api/v1/documents", {
      headers: { Cookie: cookieB },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(0);
  });
});

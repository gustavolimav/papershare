import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

// Unlike the /api/v1/* tests, this fetches the rendered page HTML directly
// (not a JSON response) — Open Graph/Twitter meta tags only exist in the
// <head>, there's no API endpoint that returns them.
describe("GET /view/[token] metadata", () => {
  test("With a valid link, uses the document title and description", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie, {
      title: "Contrato de prestação de serviços",
      description: "Revisão final para assinatura.",
    });
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(`http://localhost:3000/view/${link.token}`);
    const html = await response.text();

    expect(html).toContain(
      `<title>Contrato de prestação de serviços · Papershare</title>`,
    );
    expect(html).toContain(
      `content="Contrato de prestação de serviços · Papershare"`,
    );
    expect(html).toContain(`content="Revisão final para assinatura."`);
  });

  test("With a link that has no document description, falls back to a generic description", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie, {
      title: "Sem descrição",
    });
    const link = await orchestrator.createShareLink(cookie, document.id);

    const response = await fetch(`http://localhost:3000/view/${link.token}`);
    const html = await response.text();

    expect(html).toContain(
      `content="Visualize este documento compartilhado via Papershare."`,
    );
  });

  test("With a nonexistent token, falls back to generic metadata", async () => {
    const response = await fetch(
      "http://localhost:3000/view/00000000-0000-4000-8000-000000000000",
    );
    const html = await response.text();

    expect(html).toContain(
      `<title>Documento compartilhado · Papershare</title>`,
    );
  });

  test("With a revoked link, falls back to generic metadata (title not leaked)", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie, {
      title: "Documento revogado sensível",
    });
    const link = await orchestrator.createShareLink(cookie, document.id);

    await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    const response = await fetch(`http://localhost:3000/view/${link.token}`);
    const html = await response.text();

    expect(html).toContain(
      `<title>Documento compartilhado · Papershare</title>`,
    );
    expect(html).not.toContain("Documento revogado sensível");
  });

  test("With a password-protected link, still shows the title (matches Dropbox/Drive-style previews)", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie, {
      title: "Documento protegido por senha",
    });
    const link = await orchestrator.createShareLink(cookie, document.id, {
      password: "secret123",
    });

    const response = await fetch(`http://localhost:3000/view/${link.token}`);
    const html = await response.text();

    expect(html).toContain(
      `<title>Documento protegido por senha · Papershare</title>`,
    );
  });
});

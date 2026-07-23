import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/data-rooms/[id]", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/data-rooms/00000000-0000-4000-8000-000000000000",
    );

    expect(response.status).toBe(401);
  });

  test("As a non-member of the workspace", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);
    const room = await orchestrator.createDataRoom(
      ownerCookie,
      document.workspace_id,
      { document_ids: [document.id] },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      { headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("Returns the room with its documents", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie, {
      title: "Term Sheet",
    });
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        name: "Due Diligence",
        document_ids: [document.id],
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.name).toBe("Due Diligence");
    expect(responseBody.documents).toHaveLength(1);
    expect(responseBody.documents[0]).toMatchObject({
      document_id: document.id,
      title: "Term Sheet",
      allow_download: true,
    });
  });

  test("A deleted room returns 404", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        document_ids: [document.id],
      },
    );

    await fetch(`http://localhost:3000/api/v1/data-rooms/${room.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/data-rooms/[id]", () => {
  test("Renames the room", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        name: "Old name",
        document_ids: [document.id],
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "New name" }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.name).toBe("New name");
  });

  test("Replaces document membership and per-document allow_download", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document1 = await orchestrator.uploadDocument(cookie);
    const document2 = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document1.workspace_id,
      {
        document_ids: [document1.id],
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          documents: [{ document_id: document2.id, allow_download: false }],
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.documents).toHaveLength(1);
    expect(responseBody.documents[0]).toMatchObject({
      document_id: document2.id,
      allow_download: false,
    });
  });

  test("A document from another workspace is rejected", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: otherCookie } = await orchestrator.createUserSession();

    const ownerDocument = await orchestrator.uploadDocument(ownerCookie);
    const otherDocument = await orchestrator.uploadDocument(otherCookie);
    const room = await orchestrator.createDataRoom(
      ownerCookie,
      ownerDocument.workspace_id,
      { document_ids: [ownerDocument.id] },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          documents: [{ document_id: otherDocument.id, allow_download: true }],
        }),
      },
    );

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/v1/data-rooms/[id]", () => {
  test("Soft-deletes the room", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        document_ids: [document.id],
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(204);

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}`,
      { headers: { Cookie: cookie } },
    );

    expect(getResponse.status).toBe(404);
  });
});

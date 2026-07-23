import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/workspaces/[id]/data-rooms", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/data-rooms",
    );

    expect(response.status).toBe(401);
  });

  test("As a non-member of the workspace", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/data-rooms`,
      { headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });

  test("Lists a workspace's data rooms with document_count", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document1 = await orchestrator.uploadDocument(cookie);
    const document2 = await orchestrator.uploadDocument(cookie);

    await orchestrator.createDataRoom(cookie, document1.workspace_id, {
      name: "Due Diligence",
      document_ids: [document1.id, document2.id],
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document1.workspace_id}/data-rooms`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total).toBe(1);
    expect(responseBody.data_rooms).toHaveLength(1);
    expect(responseBody.data_rooms[0]).toMatchObject({
      name: "Due Diligence",
      document_count: 2,
    });
  });

  test("Does not include another workspace's data rooms", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: otherCookie } = await orchestrator.createUserSession();

    const ownerDocument = await orchestrator.uploadDocument(ownerCookie);
    await orchestrator.createDataRoom(ownerCookie, ownerDocument.workspace_id, {
      document_ids: [ownerDocument.id],
    });

    const otherDocument = await orchestrator.uploadDocument(otherCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${otherDocument.workspace_id}/data-rooms`,
      { headers: { Cookie: otherCookie } },
    );

    const responseBody = await response.json();

    expect(responseBody.total).toBe(0);
    expect(responseBody.data_rooms).toHaveLength(0);
  });

  test("Supports pagination via page and per_page", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    await orchestrator.createDataRoom(cookie, document.workspace_id, {
      name: "Room 1",
      document_ids: [document.id],
    });
    await orchestrator.createDataRoom(cookie, document.workspace_id, {
      name: "Room 2",
      document_ids: [document.id],
    });
    await orchestrator.createDataRoom(cookie, document.workspace_id, {
      name: "Room 3",
      document_ids: [document.id],
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/data-rooms?page=1&per_page=2`,
      { headers: { Cookie: cookie } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total).toBe(3);
    expect(responseBody.data_rooms).toHaveLength(2);
    // ordered by created_at DESC: most recently created room first
    expect(responseBody.data_rooms[0].name).toBe("Room 3");
    expect(responseBody.data_rooms[1].name).toBe("Room 2");
  });
});

describe("POST /api/v1/workspaces/[id]/data-rooms", () => {
  test("Without a session", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/workspaces/00000000-0000-4000-8000-000000000000/data-rooms",
      { method: "POST" },
    );

    expect(response.status).toBe(401);
  });

  test("Creates a room with the given documents", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document1 = await orchestrator.uploadDocument(cookie);
    const document2 = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document1.workspace_id}/data-rooms`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          name: "Due Diligence",
          document_ids: [document1.id, document2.id],
        }),
      },
    );

    expect(response.status).toBe(201);

    const responseBody = await response.json();

    expect(responseBody.name).toBe("Due Diligence");
    expect(responseBody.documents).toHaveLength(2);
    expect(
      responseBody.documents.map((d: any) => d.document_id).sort(),
    ).toEqual([document1.id, document2.id].sort());
    // allow_download defaults to true for every document on creation
    expect(responseBody.documents.every((d: any) => d.allow_download)).toBe(
      true,
    );
  });

  test("A document from another workspace is rejected", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: otherCookie } = await orchestrator.createUserSession();

    const ownerDocument = await orchestrator.uploadDocument(ownerCookie);
    const otherDocument = await orchestrator.uploadDocument(otherCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${ownerDocument.workspace_id}/data-rooms`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: ownerCookie },
        body: JSON.stringify({
          name: "Sneaky room",
          document_ids: [ownerDocument.id, otherDocument.id],
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("Missing name returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/data-rooms`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ document_ids: [document.id] }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("Empty document_ids returns 400", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/workspaces/${document.workspace_id}/data-rooms`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "Empty room", document_ids: [] }),
      },
    );

    expect(response.status).toBe(400);
  });
});

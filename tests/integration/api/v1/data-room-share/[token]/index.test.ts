import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/data-room-share/[token]", () => {
  test("With a nonexistent token", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/data-room-share/00000000-0000-4000-8000-000000000000",
    );

    expect(response.status).toBe(404);
  });

  test("With a revoked link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        document_ids: [document.id],
      },
    );
    const link = await orchestrator.createDataRoomLink(cookie, room.id);

    await fetch(
      `http://localhost:3000/api/v1/data-rooms/${room.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ is_active: false }),
      },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/data-room-share/${link.token}`,
    );

    expect(response.status).toBe(403);

    const responseBody = await response.json();
    expect(responseBody.message).toBe("Este link foi revogado.");
  });

  test("With an expired link", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        document_ids: [document.id],
      },
    );
    const link = await orchestrator.createDataRoomLink(cookie, room.id, {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    await orchestrator.expireDataRoomLink(link.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/data-room-share/${link.token}`,
    );

    expect(response.status).toBe(403);

    const responseBody = await response.json();
    expect(responseBody.message).toBe("Este link expirou.");
  });

  test("With no password set, returns the room and its documents", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document1 = await orchestrator.uploadDocument(cookie, {
      title: "Term Sheet",
    });
    const document2 = await orchestrator.uploadDocument(cookie, {
      title: "Cap Table",
    });
    const room = await orchestrator.createDataRoom(
      cookie,
      document1.workspace_id,
      {
        name: "Due Diligence",
        document_ids: [document1.id, document2.id],
      },
    );
    await fetch(`http://localhost:3000/api/v1/data-rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        documents: [
          { document_id: document1.id, allow_download: true },
          { document_id: document2.id, allow_download: false },
        ],
      }),
    });
    const link = await orchestrator.createDataRoomLink(cookie, room.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/data-room-share/${link.token}`,
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.data_room.name).toBe("Due Diligence");
    expect(responseBody.documents).toHaveLength(2);

    const termSheet = responseBody.documents.find(
      (d: any) => d.document_id === document1.id,
    );
    const capTable = responseBody.documents.find(
      (d: any) => d.document_id === document2.id,
    );

    expect(termSheet).toMatchObject({
      title: "Term Sheet",
      allow_download: true,
    });
    expect(capTable).toMatchObject({
      title: "Cap Table",
      allow_download: false,
    });

    // storage_key must never leak through the public response
    expect(responseBody.documents[0].storage_key).toBeUndefined();
  });

  test("With a password set, requires the correct password", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const room = await orchestrator.createDataRoom(
      cookie,
      document.workspace_id,
      {
        document_ids: [document.id],
      },
    );
    const link = await orchestrator.createDataRoomLink(cookie, room.id, {
      password: "secret123",
    });

    const withoutPassword = await fetch(
      `http://localhost:3000/api/v1/data-room-share/${link.token}`,
    );
    expect(withoutPassword.status).toBe(403);

    const withWrongPassword = await fetch(
      `http://localhost:3000/api/v1/data-room-share/${link.token}`,
      { headers: { "X-Share-Password": "wrong" } },
    );
    expect(withWrongPassword.status).toBe(403);

    const withCorrectPassword = await fetch(
      `http://localhost:3000/api/v1/data-room-share/${link.token}`,
      { headers: { "X-Share-Password": "secret123" } },
    );
    expect(withCorrectPassword.status).toBe(200);
  });
});

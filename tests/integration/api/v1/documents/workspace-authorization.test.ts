import fs from "fs/promises";
import database from "infra/database";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function createTeamWorkspace(cookie: string, name = "Equipe") {
  const response = await fetch("http://localhost:3000/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name }),
  });

  return response.json();
}

async function inviteMember(
  workspaceId: string,
  ownerCookie: string,
  email: string,
  role: "editor" | "viewer",
) {
  await fetch(
    `http://localhost:3000/api/v1/workspaces/${workspaceId}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ email, role }),
    },
  );
}

async function activate(cookie: string, workspaceId: string) {
  await fetch(
    `http://localhost:3000/api/v1/workspaces/${workspaceId}/activate`,
    {
      method: "POST",
      headers: { Cookie: cookie },
    },
  );
}

async function uploadPdf(cookie: string, title: string) {
  const buffer = await fs.readFile("tests/fixtures/sample.pdf");
  const formData = new FormData();
  formData.append("title", title);
  formData.append(
    "file",
    new Blob([Uint8Array.from(buffer)], { type: "application/pdf" }),
    "sample.pdf",
  );

  const response = await fetch("http://localhost:3000/api/v1/documents", {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });

  return { status: response.status, body: await response.json() };
}

describe("Document & share-link authorization is workspace-scoped", () => {
  test("An editor can view/edit/delete a document uploaded by a different member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: editorUser, cookie: editorCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, editorUser.email, "editor");
    await activate(ownerCookie, workspace.id);

    const document = await orchestrator.uploadDocument(ownerCookie, {
      title: "Documento da owner",
    });

    await activate(editorCookie, workspace.id);

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      { headers: { Cookie: editorCookie } },
    );
    expect(getResponse.status).toBe(200);

    const patchResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: editorCookie },
        body: JSON.stringify({ title: "Editado pelo editor" }),
      },
    );
    expect(patchResponse.status).toBe(200);
    expect((await patchResponse.json()).title).toBe("Editado pelo editor");

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      { method: "DELETE", headers: { Cookie: editorCookie } },
    );
    expect(deleteResponse.status).toBe(204);
  });

  test("A viewer can read but not upload, edit, delete, or manage share links", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: viewerUser, cookie: viewerCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, viewerUser.email, "viewer");
    await activate(ownerCookie, workspace.id);

    const document = await orchestrator.uploadDocument(ownerCookie);
    const link = await orchestrator.createShareLink(ownerCookie, document.id);

    await activate(viewerCookie, workspace.id);

    const upload = await uploadPdf(viewerCookie, "Tentativa de upload");
    expect(upload.status).toBe(403);

    const getResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      { headers: { Cookie: viewerCookie } },
    );
    expect(getResponse.status).toBe(200);

    const patchResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: viewerCookie },
        body: JSON.stringify({ title: "hacked" }),
      },
    );
    expect(patchResponse.status).toBe(403);

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      { method: "DELETE", headers: { Cookie: viewerCookie } },
    );
    expect(deleteResponse.status).toBe(403);

    const listLinksResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links`,
      { headers: { Cookie: viewerCookie } },
    );
    expect(listLinksResponse.status).toBe(200);

    const createLinkResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: viewerCookie },
        body: JSON.stringify({}),
      },
    );
    expect(createLinkResponse.status).toBe(403);

    const revokeLinkResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      { method: "DELETE", headers: { Cookie: viewerCookie } },
    );
    expect(revokeLinkResponse.status).toBe(403);
  });

  test("A user with no membership in the document's workspace gets 404, not 403", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { cookie: strangerCookie } = await orchestrator.createUserSession();

    const document = await orchestrator.uploadDocument(ownerCookie);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}`,
      { headers: { Cookie: strangerCookie } },
    );

    expect(response.status).toBe(404);
  });
});

describe("AI features resolve the workspace creator's key (US-32)", () => {
  test("ai_chat_available reflects the workspace creator's key, even set by a different acting member", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: editorUser, cookie: editorCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, editorUser.email, "editor");
    await activate(editorCookie, workspace.id);

    const document = await orchestrator.uploadDocument(editorCookie, {
      title: "Documento do editor",
    });
    const link = await orchestrator.createShareLink(editorCookie, document.id);

    const beforeResponse = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );
    expect((await beforeResponse.json()).ai_chat_available).toBe(false);

    // The workspace *creator* (owner) configures a key — not the editor who
    // actually uploaded the document. Set directly via the DB since the
    // real PUT endpoint requires a plausible-looking key and encrypts it;
    // this test only cares whether the column is non-null.
    await database.query({
      text: `UPDATE users SET ai_api_key_encrypted = 'not-empty' WHERE id = $1;`,
      values: [workspace.created_by],
    });

    const afterResponse = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );
    expect((await afterResponse.json()).ai_chat_available).toBe(true);
  });

  test("A member's own personal AI key is not used for a shared-workspace document — only the workspace creator's is", async () => {
    const { cookie: ownerCookie } = await orchestrator.createUserSession();
    const { user: editorUser, cookie: editorCookie } =
      await orchestrator.createUserSession();
    const workspace = await createTeamWorkspace(ownerCookie);
    await inviteMember(workspace.id, ownerCookie, editorUser.email, "editor");
    await activate(editorCookie, workspace.id);

    const document = await orchestrator.uploadDocument(editorCookie);
    const link = await orchestrator.createShareLink(editorCookie, document.id);

    // The editor (not the workspace creator) configures their own key.
    await database.query({
      text: `UPDATE users SET ai_api_key_encrypted = 'editors-own-key' WHERE id = $1;`,
      values: [editorUser.id],
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/share/${link.token}`,
    );

    // The workspace creator (owner) still hasn't configured anything, so
    // the feature stays unavailable — the editor's own key is never
    // consulted for a document that belongs to a shared workspace.
    expect((await response.json()).ai_chat_available).toBe(false);
  });
});

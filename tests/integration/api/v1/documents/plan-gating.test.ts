import database from "infra/database";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

async function cancelSubscription(workspaceId: string) {
  await database.query({
    text: `UPDATE subscriptions SET status = 'canceled' WHERE workspace_id = $1;`,
    values: [workspaceId],
  });
}

describe("Document limits (US-36)", () => {
  test("A Free workspace can upload up to 10 documents; the 11th is blocked", async () => {
    const { cookie } = await orchestrator.createUserSession();

    for (let i = 0; i < 10; i++) {
      const doc = await orchestrator.uploadDocument(cookie, {
        title: `Doc ${i}`,
      });
      expect(doc.name).not.toBe("PaymentRequiredError");
    }

    const eleventh = await orchestrator.uploadDocument(cookie, {
      title: "Doc 11",
    });

    expect(eleventh.name).toBe("PaymentRequiredError");
    expect(eleventh.status).toBe(402);
  });

  test("A Pro workspace has no document limit", async () => {
    const { user, cookie } = await orchestrator.createUserSession();
    await orchestrator.activateSubscription(user.active_workspace_id!, "pro");

    for (let i = 0; i < 11; i++) {
      const doc = await orchestrator.uploadDocument(cookie, {
        title: `Doc ${i}`,
      });
      expect(doc.name).not.toBe("PaymentRequiredError");
    }
  });

  test("Downgrade keeps existing documents accessible but blocks new uploads", async () => {
    const { user, cookie } = await orchestrator.createUserSession();
    await orchestrator.activateSubscription(user.active_workspace_id!, "pro");

    const uploaded = [];
    for (let i = 0; i < 15; i++) {
      uploaded.push(
        await orchestrator.uploadDocument(cookie, { title: `Doc ${i}` }),
      );
    }

    await cancelSubscription(user.active_workspace_id!);

    for (const doc of uploaded) {
      const getResponse = await fetch(
        `http://localhost:3000/api/v1/documents/${doc.id}`,
        { headers: { Cookie: cookie } },
      );
      expect(getResponse.status).toBe(200);
    }

    const blocked = await orchestrator.uploadDocument(cookie, {
      title: "Doc 16",
    });
    expect(blocked.name).toBe("PaymentRequiredError");
    expect(blocked.status).toBe(402);

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${uploaded[0].id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );
    expect(deleteResponse.status).toBe(204);
  });
});

describe("Share link limits (US-36)", () => {
  test("A Free workspace can create up to 10 active links across its documents; the 11th is blocked", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    for (let i = 0; i < 10; i++) {
      const link = await orchestrator.createShareLink(cookie, document.id, {
        label: `Link ${i}`,
      });
      expect(link.name).not.toBe("PaymentRequiredError");
    }

    const eleventh = await orchestrator.createShareLink(cookie, document.id, {
      label: "Link 11",
    });

    expect(eleventh.name).toBe("PaymentRequiredError");
  });

  test("Revoking a link frees up a slot — only active links count", async () => {
    const { cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);

    const links = [];
    for (let i = 0; i < 10; i++) {
      links.push(
        await orchestrator.createShareLink(cookie, document.id, {
          label: `Link ${i}`,
        }),
      );
    }

    await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${links[0].id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );

    const eleventh = await orchestrator.createShareLink(cookie, document.id, {
      label: "Link after revoke",
    });

    expect(eleventh.name).not.toBe("PaymentRequiredError");
  });
});

describe("Gated features (US-36)", () => {
  test.each([
    ["watermark_enabled", { watermark_enabled: true }],
    ["nda_text", { nda_text: "Aceite os termos." }],
    ["allowed_emails", { allowed_emails: ["viewer@example.com"] }],
    ["brand_accent_color", { brand_accent_color: "#FF5733" }],
  ])(
    "Creating a link with %s on a Free workspace is blocked, but succeeds on Pro",
    async (_name, overrides) => {
      const { cookie: freeCookie } = await orchestrator.createUserSession();
      const freeDocument = await orchestrator.uploadDocument(freeCookie);
      const freeAttempt = await orchestrator.createShareLink(
        freeCookie,
        freeDocument.id,
        overrides,
      );
      expect(freeAttempt.name).toBe("PaymentRequiredError");

      const { user: proUser, cookie: proCookie } =
        await orchestrator.createUserSession();
      await orchestrator.activateSubscription(
        proUser.active_workspace_id!,
        "pro",
      );
      const proDocument = await orchestrator.uploadDocument(proCookie);
      const proAttempt = await orchestrator.createShareLink(
        proCookie,
        proDocument.id,
        overrides,
      );
      expect(proAttempt.name).toBeUndefined();
    },
  );

  test("Downgrading doesn't block editing unrelated fields on a link that already has a gated feature set, and turning a feature off is never gated", async () => {
    const { user, cookie } = await orchestrator.createUserSession();
    await orchestrator.activateSubscription(user.active_workspace_id!, "pro");

    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id, {
      watermark_enabled: true,
    });

    await cancelSubscription(user.active_workspace_id!);

    const relabelResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ label: "Novo rótulo" }),
      },
    );
    expect(relabelResponse.status).toBe(200);
    expect((await relabelResponse.json()).label).toBe("Novo rótulo");

    const turnOffResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ watermark_enabled: false }),
      },
    );
    expect(turnOffResponse.status).toBe(200);
    expect((await turnOffResponse.json()).watermark_enabled).toBe(false);

    const turnOnResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ watermark_enabled: true }),
      },
    );
    expect(turnOnResponse.status).toBe(402);
  });
});

describe("Engagement score gating (US-36)", () => {
  test("GET .../analytics returns viewers: null on Free, a real array on Pro", async () => {
    const { user, cookie } = await orchestrator.createUserSession();
    const document = await orchestrator.uploadDocument(cookie);
    const link = await orchestrator.createShareLink(cookie, document.id);
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fp-1",
      time_on_page: 30,
      pages_viewed: 1,
    });

    const freeResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );
    const freeBody = await freeResponse.json();
    expect(freeBody.viewers).toBeNull();
    expect(freeBody.total_views).toBe(1);

    await orchestrator.activateSubscription(user.active_workspace_id!, "pro");

    const proResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${document.id}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );
    const proBody = await proResponse.json();
    expect(Array.isArray(proBody.viewers)).toBe(true);
    expect(proBody.viewers).toHaveLength(1);
  });
});

import { test, expect } from "@playwright/test";
import orchestrator from "../orchestrator";
import { loginOnPlan, seedDocuments, seedActiveLinks } from "./helpers";

test.beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

test.describe("Share link limits by plan", () => {
  test("Free plan: at the 10-active-link limit, 'Criar novo link' is replaced by an inline upgrade message", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    const [documentId] = await seedDocuments(cookie, 1);
    await seedActiveLinks(cookie, documentId!, 10);

    await page.goto(`/documents/${documentId}`);

    await expect(
      page.getByText(
        "Limite de 10 links ativos do plano Free atingido. Faça upgrade em Configurações → Faturamento.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Criar novo link" }),
    ).toHaveCount(0);
  });

  test("Free plan: the backend rejects an 11th active link with 402, independent of the UI", async ({
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    const [documentId] = await seedDocuments(cookie, 1);
    await seedActiveLinks(cookie, documentId!, 10);

    const eleventh = await orchestrator.createShareLink(cookie, documentId!, {
      label: "Eleventh",
    });

    expect(eleventh.name).toBe("PaymentRequiredError");
    expect(eleventh.status).toBe(402);
  });

  test("Free plan: revoking a link frees a slot for a new one", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    const [documentId] = await seedDocuments(cookie, 1);
    const linkIds = await seedActiveLinks(cookie, documentId!, 10);

    await page.goto(`/documents/${documentId}`);
    await expect(
      page.getByRole("button", { name: "Criar novo link" }),
    ).toHaveCount(0);

    const revokeResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${documentId}/links/${linkIds[0]}`,
      { method: "DELETE", headers: { Cookie: cookie } },
    );
    expect(revokeResponse.status).toBe(200);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Criar novo link" }),
    ).toHaveCount(1);
  });

  test("Pro plan: no active-link limit — 'Criar novo link' stays available past 10 links", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "pro");
    const [documentId] = await seedDocuments(cookie, 1);
    await seedActiveLinks(cookie, documentId!, 11);

    await page.goto(`/documents/${documentId}`);

    await expect(
      page.getByRole("button", { name: "Criar novo link" }),
    ).toHaveCount(1);
    await expect(page.getByText(/Limite de 10 links ativos/)).toHaveCount(0);
  });
});

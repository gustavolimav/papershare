import path from "path";
import { test, expect } from "@playwright/test";
import orchestrator from "../orchestrator";
import { loginOnPlan, seedDocuments, cancelSubscription } from "./helpers";

test.beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

test.describe("Document limits by plan", () => {
  test("Free plan: upload zone works below the limit, and a real upload via the file chooser succeeds", async ({
    page,
    context,
  }) => {
    await loginOnPlan(context, "free");

    await page.goto("/dashboard");
    await expect(
      page.getByText("Nenhum documento ainda. Faça o upload"),
    ).toBeVisible();

    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(process.cwd(), "tests/fixtures/sample.pdf"));

    await expect(page.getByText("sample")).toBeVisible();
  });

  test("Free plan: at the 10-document limit, the upload zone is replaced by an inline upgrade message", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    await seedDocuments(cookie, 10);

    await page.goto("/dashboard");

    await expect(
      page.getByText(
        "Limite de 10 documentos do plano Free atingido. Faça upgrade em Configurações → Faturamento.",
      ),
    ).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test("Free plan: the backend rejects an 11th document with 402, independent of the UI", async ({
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    await seedDocuments(cookie, 10);

    const eleventh = await orchestrator.uploadDocument(cookie, {
      title: "Eleventh",
    });

    expect(eleventh.name).toBe("PaymentRequiredError");
    expect(eleventh.status).toBe(402);
  });

  test("Pro plan: no document limit — upload zone stays available past 10 documents", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "pro");
    await seedDocuments(cookie, 11);

    await page.goto("/dashboard");

    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.getByText(/Limite de 10 documentos/)).toHaveCount(0);
  });

  test("Business plan: no document limit either", async ({ page, context }) => {
    const { cookie } = await loginOnPlan(context, "business");
    await seedDocuments(cookie, 11);

    await page.goto("/dashboard");

    await expect(page.locator('input[type="file"]')).toHaveCount(1);
  });

  test("Downgrade: existing documents stay visible and accessible, but new uploads are blocked", async ({
    page,
    context,
  }) => {
    const { cookie, workspaceId } = await loginOnPlan(context, "pro");
    const ids = await seedDocuments(cookie, 12);
    await cancelSubscription(workspaceId);

    await page.goto("/dashboard");
    await expect(
      page.getByText(/Limite de 10 documentos do plano Free atingido/),
    ).toBeVisible();

    await page.goto(`/documents/${ids[0]}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Seed doc 0",
    );

    const blocked = await orchestrator.uploadDocument(cookie, {
      title: "Blocked after downgrade",
    });
    expect(blocked.name).toBe("PaymentRequiredError");
  });
});

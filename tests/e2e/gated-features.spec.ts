import { test, expect } from "@playwright/test";
import orchestrator from "../orchestrator";
import { loginOnPlan, seedDocuments, cancelSubscription } from "./helpers";

test.beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

test.describe("Gated share-link features — UI", () => {
  test("Free plan: watermark, allow-list, NDA, and branding fields render disabled with a 'Recurso do plano Pro' hint", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    const [documentId] = await seedDocuments(cookie, 1);

    await page.goto(`/documents/${documentId}`);
    await page.getByRole("button", { name: "Criar novo link" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("switch", { name: /Marca d'água/ }),
    ).toBeDisabled();
    await expect(dialog.locator("#allowedEmails")).toBeDisabled();
    await expect(dialog.locator("#ndaText")).toBeDisabled();
    await expect(dialog.locator("#brandAccentColor")).toBeDisabled();
    await expect(dialog.locator("#brandWelcomeMessage")).toBeDisabled();
    await expect(dialog.getByText("Recurso do plano Pro.")).toHaveCount(5);
  });

  test("Pro plan: the same fields render enabled, and a link created with them succeeds", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "pro");
    const [documentId] = await seedDocuments(cookie, 1);

    await page.goto(`/documents/${documentId}`);
    await page.getByRole("button", { name: "Criar novo link" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("switch", { name: /Marca d'água/ }),
    ).toBeEnabled();
    await dialog.getByRole("switch", { name: /Marca d'água/ }).click();
    await dialog.locator("#ndaText").fill("Aceite os termos.");

    await dialog.getByRole("button", { name: "Criar link" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Marca d'água")).toBeVisible();
    await expect(page.getByText("Termo de NDA")).toBeVisible();
  });
});

test.describe("Gated share-link features — backend", () => {
  const gatedPayloads: Array<[string, Record<string, unknown>]> = [
    ["watermark_enabled", { watermark_enabled: true }],
    ["nda_text", { nda_text: "Aceite os termos." }],
    ["allowed_emails", { allowed_emails: ["viewer@example.com"] }],
    ["brand_accent_color", { brand_accent_color: "#FF5733" }],
  ];

  for (const [name, overrides] of gatedPayloads) {
    test(`Free plan: creating a link with ${name} set is rejected by the backend with 402`, async ({
      context,
    }) => {
      const { cookie } = await loginOnPlan(context, "free");
      const [documentId] = await seedDocuments(cookie, 1);

      const attempt = await orchestrator.createShareLink(
        cookie,
        documentId!,
        overrides,
      );

      expect(attempt.name).toBe("PaymentRequiredError");
      expect(attempt.status).toBe(402);
    });
  }
});

test.describe("Gated share-link features — downgrade behavior", () => {
  test("Downgrade: an existing gated field can still be turned off through the UI, but not re-enabled", async ({
    page,
    context,
  }) => {
    const { cookie, workspaceId } = await loginOnPlan(context, "pro");
    const [documentId] = await seedDocuments(cookie, 1);
    await orchestrator.createShareLink(cookie, documentId!, {
      watermark_enabled: true,
    });
    await cancelSubscription(workspaceId);

    await page.goto(`/documents/${documentId}`);
    const linksSection = page.getByRole("region", {
      name: "Links de compartilhamento",
    });
    await linksSection.getByRole("button", { name: "Editar" }).click();

    const dialog = page.getByRole("dialog");
    const watermarkSwitch = dialog.getByRole("switch", {
      name: /Marca d'água/,
    });
    await expect(watermarkSwitch).toBeEnabled();
    await watermarkSwitch.click();
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(linksSection.getByText("Marca d'água")).toHaveCount(0);

    await linksSection.getByRole("button", { name: "Editar" }).click();
    await expect(
      page.getByRole("dialog").getByRole("switch", { name: /Marca d'água/ }),
    ).toBeDisabled();
  });

  test("Downgrade: relabeling a link that already has an NDA set doesn't get blocked by the gated field's own unchanged value", async ({
    context,
  }) => {
    const { cookie, workspaceId } = await loginOnPlan(context, "pro");
    const [documentId] = await seedDocuments(cookie, 1);
    const link = await orchestrator.createShareLink(cookie, documentId!, {
      nda_text: "Keep this confidential.",
    });
    await cancelSubscription(workspaceId);

    const response = await fetch(
      `http://localhost:3000/api/v1/documents/${documentId}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ label: "Novo rótulo" }),
      },
    );

    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.label).toBe("Novo rótulo");
    expect(updated.nda_text).toBe("Keep this confidential.");
  });
});

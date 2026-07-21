import { test, expect } from "@playwright/test";
import orchestrator from "../orchestrator";
import { loginOnPlan, attachSession, seedDocuments } from "./helpers";

test.beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

test.describe("Faturamento tab", () => {
  test("Free plan: shows the plan badge, usage line, and both upgrade buttons for the owner", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    await seedDocuments(cookie, 3);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Faturamento" }).click();

    await expect(page.getByText("Plano atual:")).toBeVisible();
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
    await expect(
      page.getByText("3 de 10 documentos · 0 de 10 links ativos"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Assinar Pro" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Assinar Business" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gerenciar assinatura" }),
    ).toHaveCount(0);
  });

  test("Pro plan: shows the Pro badge, no usage line, and a single 'Gerenciar assinatura' button", async ({
    page,
    context,
  }) => {
    await loginOnPlan(context, "pro");

    await page.goto("/settings");
    await page.getByRole("button", { name: "Faturamento" }).click();

    await expect(page.getByText("Pro", { exact: true })).toBeVisible();
    await expect(page.getByText(/de 10 documentos/)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Gerenciar assinatura" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Assinar Pro" })).toHaveCount(
      0,
    );
  });

  test("Business plan: shows the Business badge and 'Gerenciar assinatura'", async ({
    page,
    context,
  }) => {
    await loginOnPlan(context, "business");

    await page.goto("/settings");
    await page.getByRole("button", { name: "Faturamento" }).click();

    await expect(page.getByText("Business", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Gerenciar assinatura" }),
    ).toBeVisible();
  });

  test("With billing_stripe off (default), clicking 'Assinar Pro' routes to /em-breve instead of calling the API", async ({
    page,
    context,
  }) => {
    await loginOnPlan(context, "free");

    await page.goto("/settings");
    await page.getByRole("button", { name: "Faturamento" }).click();
    await page.getByRole("button", { name: "Assinar Pro" }).click();

    await expect(page).toHaveURL(/\/em-breve$/);
    await expect(page.getByText("Em breve", { exact: true })).toBeVisible();
  });

  test("With billing_stripe on, clicking 'Assinar Pro' surfaces the backend's 503 as a toast (Stripe isn't configured in this environment)", async ({
    page,
    context,
  }) => {
    await loginOnPlan(context, "free");
    await orchestrator.enableFeatureFlag("billing_stripe");

    await page.goto("/settings");
    await page.getByRole("button", { name: "Faturamento" }).click();
    await page.getByRole("button", { name: "Assinar Pro" }).click();

    await expect(
      page.getByText("Cobrança indisponível no momento."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("Non-owner (editor) sees the same plan/usage info but no billing buttons at all", async ({
    page,
    context,
  }) => {
    const owner = await loginOnPlan(context, "free");

    const workspaceResponse = await fetch(
      "http://localhost:3000/api/v1/workspaces",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: owner.cookie,
        },
        body: JSON.stringify({ name: "Equipe Teste" }),
      },
    );
    const workspace = await workspaceResponse.json();

    const editorSession = await orchestrator.createUserSession();
    await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: owner.cookie,
        },
        body: JSON.stringify({
          email: editorSession.user.email,
          role: "editor",
        }),
      },
    );
    await fetch(
      `http://localhost:3000/api/v1/workspaces/${workspace.id}/activate`,
      { method: "POST", headers: { Cookie: editorSession.cookie } },
    );

    await attachSession(context, editorSession.cookie);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Faturamento" }).click();

    await expect(page.getByText("Plano atual:")).toBeVisible();
    await expect(page.getByRole("button", { name: "Assinar Pro" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Assinar Business" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Gerenciar assinatura" }),
    ).toHaveCount(0);
  });
});

test.describe("Homepage pricing & feature sections", () => {
  test("shows all four feature sections and the three pricing cards, each linking to /register", async ({
    page,
  }) => {
    await page.goto("/");

    for (const heading of [
      "Documentos & Compartilhamento",
      "Segurança & Confiança",
      "Analytics & IA",
      "Equipe",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    // exact: true — the hero's "Começar grátis" CTA also contains "grátis"
    // as a substring, so a loose match resolves to both elements.
    await expect(page.getByText("Grátis", { exact: true })).toBeVisible();
    await expect(page.getByText("R$29/mês")).toBeVisible();
    await expect(page.getByText("R$99/mês")).toBeVisible();

    // Header's "Cadastrar" + hero "Começar grátis" + one per pricing card.
    const registerLinks = page.locator('a[href="/register"]');
    await expect(registerLinks).toHaveCount(5);
  });
});

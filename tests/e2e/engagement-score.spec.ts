import { test, expect } from "@playwright/test";
import orchestrator from "../orchestrator";
import { loginOnPlan, seedDocuments } from "./helpers";

test.beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanDatabase();
  await orchestrator.runPendingMigrations();
});

test.describe("Engagement score gating", () => {
  test("Free plan: the per-viewer engagement section is hidden in the analytics drawer, and the API returns viewers: null", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "free");
    const [documentId] = await seedDocuments(cookie, 1);
    const link = await orchestrator.createShareLink(cookie, documentId!, {
      label: "Engagement link",
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fp-1",
      time_on_page: 30,
      pages_viewed: 1,
    });

    const analyticsResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${documentId}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );
    const analyticsBody = await analyticsResponse.json();
    expect(analyticsBody.viewers).toBeNull();
    expect(analyticsBody.total_views).toBe(1);

    await page.goto(`/documents/${documentId}/analytics`);
    await page.getByRole("row", { name: /Engagement link/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Visualizações")).toBeVisible();
    await expect(dialog.getByText("Engajamento por visitante")).toHaveCount(0);
  });

  test("Pro plan: the per-viewer engagement section is visible with a real score, and the API returns a viewers array", async ({
    page,
    context,
  }) => {
    const { cookie } = await loginOnPlan(context, "pro");
    const [documentId] = await seedDocuments(cookie, 1);
    const link = await orchestrator.createShareLink(cookie, documentId!, {
      label: "Engagement link",
    });
    await orchestrator.recordView(link.token, {
      viewer_fingerprint: "fp-1",
      time_on_page: 30,
      pages_viewed: 1,
    });

    const analyticsResponse = await fetch(
      `http://localhost:3000/api/v1/documents/${documentId}/links/${link.id}/analytics`,
      { headers: { Cookie: cookie } },
    );
    const analyticsBody = await analyticsResponse.json();
    expect(Array.isArray(analyticsBody.viewers)).toBe(true);
    expect(analyticsBody.viewers).toHaveLength(1);

    await page.goto(`/documents/${documentId}/analytics`);
    await page.getByRole("row", { name: /Engagement link/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Engajamento por visitante")).toBeVisible();
  });
});

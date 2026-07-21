import setCookieParser from "set-cookie-parser";
import type { BrowserContext } from "@playwright/test";
import orchestrator from "../orchestrator";
import database from "../../infra/database";
import type { UserPublic } from "../../types/index";

// Sessions are created out-of-band (direct DB + a single login fetch, via
// orchestrator — the same helper the Jest integration suite uses) instead of
// driving the registration/login forms through the browser: it's an order of
// magnitude faster, and keeps these specs focused on plan-gating behavior
// rather than re-verifying auth flows already covered by the Jest suite.
export async function attachSession(
  context: BrowserContext,
  rawSetCookie: string,
): Promise<void> {
  const parsed = setCookieParser.parse(rawSetCookie, { map: false });

  await context.addCookies(
    parsed.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      url: "http://localhost:3000",
    })),
  );
}

interface LoggedInSession {
  user: UserPublic;
  cookie: string;
  workspaceId: string;
}

export async function loginNewUser(
  context: BrowserContext,
): Promise<LoggedInSession> {
  const { user, cookie } = await orchestrator.createUserSession();
  await attachSession(context, cookie);

  return { user, cookie, workspaceId: user.active_workspace_id! };
}

export async function loginOnPlan(
  context: BrowserContext,
  plan: "free" | "pro" | "business",
): Promise<LoggedInSession> {
  const session = await loginNewUser(context);

  if (plan !== "free") {
    await orchestrator.activateSubscription(session.workspaceId, plan);
  }

  return session;
}

// Seeds N documents directly via the API (not the UI file input) — fast
// fixture setup for limit-boundary tests, where the document's *content*
// is irrelevant and only its existence/count matters.
export async function seedDocuments(
  cookie: string,
  count: number,
): Promise<string[]> {
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const doc = await orchestrator.uploadDocument(cookie, {
      title: `Seed doc ${i}`,
    });

    if (doc.name) {
      throw new Error(`Failed to seed document ${i}: ${JSON.stringify(doc)}`);
    }

    ids.push(doc.id);
  }

  return ids;
}

// Simulates a downgrade (payment failure, cancellation) the same way the
// Jest plan-gating suite does — a direct status flip, since there's no
// UI/API path that un-subscribes a workspace outside the Stripe webhook.
export async function cancelSubscription(workspaceId: string): Promise<void> {
  await database.query({
    text: `UPDATE subscriptions SET status = 'canceled' WHERE workspace_id = $1;`,
    values: [workspaceId],
  });
}

export async function seedActiveLinks(
  cookie: string,
  documentId: string,
  count: number,
): Promise<string[]> {
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const link = await orchestrator.createShareLink(cookie, documentId, {
      label: `Seed link ${i}`,
    });

    if (link.name) {
      throw new Error(`Failed to seed link ${i}: ${JSON.stringify(link)}`);
    }

    ids.push(link.id);
  }

  return ids;
}

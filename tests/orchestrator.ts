import crypto from "crypto";
import fs from "fs/promises";
import retry from "async-retry";
import { faker } from "@faker-js/faker";

import database from "../infra/database";
import migrator from "../models/migrator";
import user from "../models/user";
import type { UserCreateInput, UserPublic } from "../types/index";

async function waitForAllServices(): Promise<void> {
  await waitForWebServer();

  async function waitForWebServer(): Promise<void> {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage(): Promise<void> {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw new Error("Status page not ready");
      }
    }
  }
}

async function cleanDatabase(): Promise<void> {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations(): Promise<void> {
  await migrator.runPendingMigrations();
}

async function createUser(
  userObject?: Partial<UserCreateInput>,
): Promise<UserPublic> {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createExpiredSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("hex");
  const expiredAt = new Date(Date.now() - 1000);

  await database.query({
    text: `
        INSERT INTO
          sessions (token, user_id, expires_at)
        VALUES
          ($1, $2, $3)
        ;`,
    values: [hashSessionToken(token), userId, expiredAt],
  });

  return token;
}

async function sessionExists(token: string): Promise<boolean> {
  const result = await database.query<{ count: string }>({
    text: "SELECT COUNT(*)::text as count FROM sessions WHERE token = $1",
    values: [hashSessionToken(token)],
  });

  return result.rows[0]!.count !== "0";
}

async function createUserSession(
  userObject?: Partial<UserCreateInput>,
): Promise<{ user: UserPublic; cookie: string }> {
  const plainPassword = userObject?.password || "validpassword";
  const createdUser = await createUser({
    ...userObject,
    password: plainPassword,
  });

  const loginResponse = await fetch("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: createdUser.email, password: plainPassword }),
  });

  const cookie = loginResponse.headers.get("set-cookie") ?? "";
  return { user: createdUser, cookie };
}

async function uploadDocument(
  cookie: string,
  overrides?: {
    title?: string;
    description?: string;
    filename?: string;
    mimeType?: string;
    buffer?: Buffer;
  },
  // returns `any` because the endpoint can respond with either a DocumentResponse or an ErrorResponse
): Promise<any> {
  const buffer =
    overrides?.buffer ?? (await fs.readFile("tests/fixtures/sample.pdf"));
  const filename = overrides?.filename ?? "sample.pdf";
  const mimeType = overrides?.mimeType ?? "application/pdf";

  const formData = new FormData();
  formData.append("title", overrides?.title ?? faker.lorem.words(3));

  if (overrides?.description) {
    formData.append("description", overrides.description);
  }

  formData.append(
    "file",
    new Blob([Uint8Array.from(buffer)], { type: mimeType }),
    filename,
  );

  const response = await fetch("http://localhost:3000/api/v1/documents", {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  });

  return response.json();
}

async function createShareLink(
  cookie: string,
  documentId: string,
  overrides?: {
    label?: string;
    password?: string;
    expires_at?: string;
    allow_download?: boolean;
  },
  // returns `any` because the endpoint can respond with either a ShareLinkResponse or an ErrorResponse
): Promise<any> {
  const response = await fetch(
    `http://localhost:3000/api/v1/documents/${documentId}/links`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(overrides ?? {}),
    },
  );

  return response.json();
}

async function expireShareLink(linkId: string): Promise<void> {
  await database.query({
    text: "UPDATE share_links SET expires_at = $1 WHERE id = $2",
    values: [new Date(Date.now() - 1000), linkId],
  });
}

async function recordView(
  token: string,
  body?: {
    viewer_fingerprint?: string;
    time_on_page?: number;
    pages_viewed?: number;
  },
  // returns `any` because the endpoint can respond with either a LinkView or an ErrorResponse
): Promise<any> {
  const response = await fetch(
    `http://localhost:3000/api/v1/share/${token}/view`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );

  return response.json();
}

async function pushBackLinkViewCreatedAt(
  viewId: string,
  minutesAgo: number,
): Promise<void> {
  await database.query({
    text: "UPDATE link_views SET created_at = $1 WHERE id = $2",
    values: [new Date(Date.now() - minutesAgo * 60 * 1000), viewId],
  });
}

async function countLinkViews(shareLinkId: string): Promise<number> {
  const result = await database.query<{ count: string }>({
    text: "SELECT COUNT(*)::text AS count FROM link_views WHERE share_link_id = $1",
    values: [shareLinkId],
  });

  return Number(result.rows[0]!.count);
}

interface Orchestrator {
  waitForAllServices(): Promise<void>;
  cleanDatabase(): Promise<void>;
  runPendingMigrations(): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  createUser(userObject?: Partial<UserCreateInput>): Promise<UserPublic>;
  // eslint-disable-next-line no-unused-vars
  createUserSession(userObject?: Partial<UserCreateInput>): Promise<{
    user: UserPublic;
    cookie: string;
  }>;
  // eslint-disable-next-line no-unused-vars
  createExpiredSession(userId: string): Promise<string>;
  // eslint-disable-next-line no-unused-vars
  sessionExists(token: string): Promise<boolean>;
  uploadDocument(
    // eslint-disable-next-line no-unused-vars
    cookie: string,
    // eslint-disable-next-line no-unused-vars
    overrides?: {
      title?: string;
      description?: string;
      filename?: string;
      mimeType?: string;
      buffer?: Buffer;
    },
  ): Promise<any>;
  createShareLink(
    // eslint-disable-next-line no-unused-vars
    cookie: string,
    // eslint-disable-next-line no-unused-vars
    documentId: string,
    // eslint-disable-next-line no-unused-vars
    overrides?: {
      label?: string;
      password?: string;
      expires_at?: string;
      allow_download?: boolean;
    },
  ): Promise<any>;
  // eslint-disable-next-line no-unused-vars
  expireShareLink(linkId: string): Promise<void>;
  recordView(
    // eslint-disable-next-line no-unused-vars
    token: string,
    // eslint-disable-next-line no-unused-vars
    body?: {
      viewer_fingerprint?: string;
      time_on_page?: number;
      pages_viewed?: number;
    },
  ): Promise<any>;
  pushBackLinkViewCreatedAt(
    // eslint-disable-next-line no-unused-vars
    viewId: string,
    // eslint-disable-next-line no-unused-vars
    minutesAgo: number,
  ): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  countLinkViews(shareLinkId: string): Promise<number>;
}

const orchestrator: Orchestrator = {
  waitForAllServices,
  cleanDatabase,
  runPendingMigrations,
  createUser,
  createUserSession,
  createExpiredSession,
  sessionExists,
  uploadDocument,
  createShareLink,
  expireShareLink,
  recordView,
  pushBackLinkViewCreatedAt,
  countLinkViews,
};

export default orchestrator;

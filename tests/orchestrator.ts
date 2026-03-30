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

async function createExpiredSession(userId: string): Promise<string> {
  const crypto = await import("crypto");
  const token = crypto.randomBytes(48).toString("hex");
  const expiredAt = new Date(Date.now() - 1000);

  await database.query({
    text: `
        INSERT INTO
          sessions (token, user_id, expires_at)
        VALUES
          ($1, $2, $3)
        ;`,
    values: [token, userId, expiredAt],
  });

  return token;
}

async function sessionExists(token: string): Promise<boolean> {
  const result = await database.query<{ count: string }>({
    text: "SELECT COUNT(*)::text as count FROM sessions WHERE token = $1",
    values: [token],
  });

  return result.rows[0]!.count !== "0";
}

interface Orchestrator {
  waitForAllServices(): Promise<void>;
  cleanDatabase(): Promise<void>;
  runPendingMigrations(): Promise<void>;
  // eslint-disable-next-line no-unused-vars
  createUser(userObject?: Partial<UserCreateInput>): Promise<UserPublic>;
  // eslint-disable-next-line no-unused-vars
  createExpiredSession(userId: string): Promise<string>;
  // eslint-disable-next-line no-unused-vars
  sessionExists(token: string): Promise<boolean>;
}

const orchestrator: Orchestrator = {
  waitForAllServices,
  cleanDatabase,
  runPendingMigrations,
  createUser,
  createExpiredSession,
  sessionExists,
};

export default orchestrator;

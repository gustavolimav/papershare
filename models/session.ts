import crypto from "crypto";
import database from "../infra/database.ts";
import type { Session, SessionModel } from "../types/index.ts";

const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 24 * 30 * 1000; // 30 days

async function create(userId: string): Promise<Session> {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newSession = await runInsertQuery(token, userId, expiresAt);

  return newSession;
}

async function runInsertQuery(
  token: string,
  userId: string,
  expiresAt: Date,
): Promise<Session> {
  const results = await database.query<Session>({
    text: `
        INSERT INTO 
          sessions (token, user_id, expires_at)
        VALUES 
          ($1, $2, $3)
        RETURNING
          id, token, user_id, expires_at, created_at, updated_at
        ;`,
    values: [token, userId, expiresAt],
  });

  return results.rows[0]!;
}

const session: SessionModel = {
  create,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;

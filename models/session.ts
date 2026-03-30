import crypto from "crypto";
import database from "../infra/database";
import type { Session, SessionModel } from "../types/index";

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

async function findOneByToken(token: string): Promise<Session | null> {
  const results = await database.query<Session>({
    text: `
        SELECT
          id, token, user_id, expires_at, created_at, updated_at
        FROM
          sessions
        WHERE
          token = $1
        LIMIT
          1
        ;`,
    values: [token],
  });

  if (!results.rowCount || results.rowCount === 0) {
    return null;
  }

  return results.rows[0]!;
}

async function deleteByToken(token: string): Promise<void> {
  await database.query({
    text: `
        DELETE FROM
          sessions
        WHERE
          token = $1
        ;`,
    values: [token],
  });
}

const session: SessionModel = {
  create,
  findOneByToken,
  deleteByToken,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;

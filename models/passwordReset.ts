import crypto from "crypto";
import database from "../infra/database";
import type { PasswordResetToken, PasswordResetModel } from "../types/index";

const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 1000; // 1 hour

// Only the hash is persisted, mirrors models/session.ts — a leaked database
// backup can't be replayed as a valid reset link.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function create(userId: string): Promise<PasswordResetToken> {
  // Only the most recently requested link should work — an older email
  // still sitting in an inbox shouldn't remain valid after a new request.
  await deleteByUserId(userId);

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const results = await database.query<PasswordResetToken>({
    text: `
        INSERT INTO
          password_reset_tokens (token, user_id, expires_at)
        VALUES
          ($1, $2, $3)
        RETURNING
          id, user_id, expires_at, created_at
        ;`,
    values: [hashToken(token), userId, expiresAt],
  });

  return { ...results.rows[0]!, token };
}

async function findValidByToken(
  token: string,
): Promise<PasswordResetToken | null> {
  const results = await database.query<PasswordResetToken>({
    text: `
        SELECT
          id, user_id, expires_at, created_at
        FROM
          password_reset_tokens
        WHERE
          token = $1
          AND expires_at > NOW()
        LIMIT
          1
        ;`,
    values: [hashToken(token)],
  });

  if (!results.rowCount || results.rowCount === 0) {
    return null;
  }

  return { ...results.rows[0]!, token };
}

async function deleteByToken(token: string): Promise<void> {
  await database.query({
    text: `
        DELETE FROM
          password_reset_tokens
        WHERE
          token = $1
        ;`,
    values: [hashToken(token)],
  });
}

async function deleteByUserId(userId: string): Promise<void> {
  await database.query({
    text: `
        DELETE FROM
          password_reset_tokens
        WHERE
          user_id = $1
        ;`,
    values: [userId],
  });
}

const passwordReset: PasswordResetModel = {
  create,
  findValidByToken,
  deleteByToken,
  deleteByUserId,
};

export default passwordReset;

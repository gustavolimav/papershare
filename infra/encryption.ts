import crypto from "crypto";
import { ServiceError } from "./errors";

// Used to encrypt/decrypt real, reversible credentials at rest (currently:
// each user's own Anthropic API key) — distinct from PEPPER, which only
// ever feeds a one-way password hash and is never used to recover a value.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;

  if (!hex) {
    throw new ServiceError({
      message: "Serviço de criptografia indisponível no momento.",
      action: "Configure a variável de ambiente ENCRYPTION_KEY.",
    });
  }

  return Buffer.from(hex, "hex");
}

// Returns iv + authTag + ciphertext, all concatenated and base64-encoded
// into a single string column value.
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

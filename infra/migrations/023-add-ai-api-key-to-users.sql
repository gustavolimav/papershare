-- Encrypted at rest (AES-256-GCM, see infra/encryption.ts) — this is a real,
-- reusable credential, not a hash, so it must be reversible to actually call
-- the Anthropic API on the user's behalf.
ALTER TABLE
  users
ADD COLUMN
  ai_api_key_encrypted TEXT;

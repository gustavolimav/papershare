-- Create password_reset_tokens table
-- Migration: 031-create-password-reset-tokens.sql
--
-- Same shape as sessions (003-create-sessions.sql): only a SHA-256 hash of
-- the token is stored, so a leaked database backup can't be replayed as a
-- valid reset link. One outstanding token per user — models/passwordReset.ts
-- deletes any previous row before inserting a new one.

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Create share_links table
-- Migration: 006-create-share-links.sql

CREATE TABLE share_links (
    -- application-generated, used for owner-facing CRUD operations
    id UUID PRIMARY KEY,
    -- public-facing token used in share URLs, separate from `id` so the
    -- internal id is never exposed to anonymous viewers
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    -- denormalized for fast ownership checks; documents are soft-deleted,
    -- so no ON DELETE CASCADE here or on document_id
    user_id UUID NOT NULL REFERENCES users(id),
    label VARCHAR(255),
    -- bcrypt hash of the optional link password; NULL means no password
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    -- FALSE = revoked without deleting the row
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX share_links_document_id_idx ON share_links (document_id);
CREATE INDEX share_links_token_idx ON share_links (token);

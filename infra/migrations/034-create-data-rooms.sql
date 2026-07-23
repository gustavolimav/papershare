-- Create data_rooms, data_room_documents, data_room_links tables
-- Migration: 034-create-data-rooms.sql

-- A data room groups several documents under one shareable link
-- (US-55). Deliberately its own tables rather than an extension of
-- share_links/documents: share_links is tightly coupled to
-- single-document features (NDA gate, branding, watermark, per-email
-- allow-list) that don't have an obvious multi-document equivalent yet.
CREATE TABLE data_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX data_rooms_workspace_id_idx ON data_rooms (workspace_id);

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON data_rooms
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Join table: which documents belong to a room, and each document's own
-- allow_download flag — permissions are per-document, not per-recipient
-- (see US-55's scope note: the link model has no authenticated-recipient
-- concept to hang per-recipient overrides on). Full-replace semantics on
-- update, same pattern as share_link_allowed_emails.
CREATE TABLE data_room_documents (
    data_room_id UUID NOT NULL REFERENCES data_rooms(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id),
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (data_room_id, document_id)
);

CREATE INDEX data_room_documents_document_id_idx ON data_room_documents (document_id);

-- A deliberately smaller column set than share_links — only the
-- protections every link fundamentally needs (password, expiry,
-- revocation). No NDA/branding/watermark/allow-list columns; those can
-- be added later as their own story once data rooms are validated.
CREATE TABLE data_room_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    data_room_id UUID NOT NULL REFERENCES data_rooms(id),
    user_id UUID NOT NULL REFERENCES users(id),
    label VARCHAR(255),
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX data_room_links_data_room_id_idx ON data_room_links (data_room_id);
CREATE INDEX data_room_links_token_idx ON data_room_links (token);

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON data_room_links
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

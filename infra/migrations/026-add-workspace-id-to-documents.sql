-- Add workspace_id to documents, and backfill every existing user/document
-- into a personal workspace.
-- Migration: 026-add-workspace-id-to-documents.sql
--
-- This is the project's first data-writing migration — every migration
-- before this one has been schema-only DDL. Against an empty database
-- (the state tests start from), every INSERT/UPDATE below is a no-op,
-- since there are no rows in `users` to iterate over.
--
-- Deliberately left nullable, NOT NULL applied later (US-31): this
-- migration only backfills existing rows — models/document.ts#create()
-- doesn't populate workspace_id on new inserts until US-31 rewires
-- document authorization, so a NOT NULL constraint here would break every
-- document upload in between.

ALTER TABLE
    documents
ADD COLUMN
    workspace_id UUID REFERENCES workspaces(id);

-- One personal workspace per existing user, named after their username.
-- Covers every user regardless of deleted_at: a soft-deleted account's
-- documents still need a valid workspace_id below.
INSERT INTO
    workspaces (name, created_by, is_personal)
SELECT
    username,
    id,
    true
FROM
    users;

-- The workspace's creator is also its sole member, as owner.
INSERT INTO
    workspace_members (workspace_id, user_id, role)
SELECT
    workspaces.id,
    workspaces.created_by,
    'owner'
FROM
    workspaces
WHERE
    workspaces.is_personal = true;

-- Point every existing document at its uploader's new personal workspace.
UPDATE
    documents
SET
    workspace_id = workspaces.id
FROM
    workspaces
WHERE
    workspaces.created_by = documents.user_id
    AND workspaces.is_personal = true;

CREATE INDEX documents_workspace_id_idx ON documents (workspace_id);

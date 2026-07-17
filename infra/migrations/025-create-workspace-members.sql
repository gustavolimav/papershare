-- Create workspace_members table
-- Migration: 025-create-workspace-members.sql

CREATE TABLE workspace_members (
    -- no ON DELETE CASCADE: workspaces are soft-deleted (deleted_at), never
    -- hard-deleted, so membership rows never need to be cascaded away
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    -- no ON DELETE CASCADE: deleting a user is a soft-delete, membership remains
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (workspace_id, user_id)
);

-- speeds up "list every workspace a user belongs to" (GET /api/v1/workspaces)
CREATE INDEX workspace_members_user_id_idx ON workspace_members (user_id);

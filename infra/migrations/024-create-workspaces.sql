-- Create workspaces table
-- Migration: 024-create-workspaces.sql

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    -- who created it — used as the workspace's "AI identity" (whose key
    -- resolves for AI features on documents in this workspace), not an
    -- ownership check (that's workspace_members.role = 'owner')
    created_by UUID NOT NULL REFERENCES users(id),
    -- true for the workspace auto-created for every user at registration;
    -- can't be renamed, deleted, invited into, or left (see models/workspace.ts)
    is_personal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX workspaces_created_by_idx ON workspaces (created_by);

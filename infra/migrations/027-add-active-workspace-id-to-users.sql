-- Add active_workspace_id to users, and point every existing user at the
-- personal workspace created for them in the previous migration.
-- Migration: 027-add-active-workspace-id-to-users.sql
--
-- Nullable, not NOT NULL: registering a new user inserts the users row
-- before its personal workspace can exist (the workspace's created_by
-- references the user), so this column is only ever set in a second step
-- within the same transaction (see models/user.ts#create).

ALTER TABLE
    users
ADD COLUMN
    active_workspace_id UUID REFERENCES workspaces(id);

UPDATE
    users
SET
    active_workspace_id = workspaces.id
FROM
    workspaces
WHERE
    workspaces.created_by = users.id
    AND workspaces.is_personal = true;

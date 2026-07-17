-- Applies NOT NULL to documents.workspace_id, deferred from migration 026
-- until models/document.ts#create() actually populates it on every insert
-- (this migration ships alongside that change, in the same story/PR).
-- Migration: 028-set-workspace-id-not-null-on-documents.sql

ALTER TABLE
    documents
ALTER COLUMN
    workspace_id SET NOT NULL;

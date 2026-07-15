-- Create link_view_pages table (per-page time-on-page breakdown)
-- Migration: 009-create-link-view-pages.sql

CREATE TABLE link_view_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- deleting the underlying view (e.g. share link revoked and cascaded) drops its page breakdown too
    link_view_id UUID NOT NULL REFERENCES link_views(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    time_on_page_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    -- bumped when a later report for the same view+page accumulates more time
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    -- one row per page per view; repeat reports for the same page accumulate time via upsert
    UNIQUE (link_view_id, page_number)
);

-- speeds up the per-link page-breakdown aggregation query
CREATE INDEX link_view_pages_link_view_id_idx ON link_view_pages (link_view_id);

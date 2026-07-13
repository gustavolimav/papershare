-- Create link_views table
-- Migration: 007-create-link-views.sql

CREATE TABLE link_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- revoking a link cascades to its view history
    share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
    -- hash computed client-side (e.g. SHA-256 of browser signals); never raw PII
    viewer_fingerprint VARCHAR(64),
    ip_address INET,
    -- ISO 3166-1 alpha-2; resolution from ip_address is a future story, NULL for now
    country_code CHAR(2),
    user_agent TEXT,
    time_on_page INTEGER,
    pages_viewed INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    -- bumped when a within-window view is deduplicated into an existing row
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX link_views_share_link_id_idx ON link_views (share_link_id);
CREATE INDEX link_views_created_at_idx ON link_views (created_at);
-- speeds up the 30-minute dedup lookup in models/linkView.ts#recordView
CREATE INDEX link_views_dedup_idx ON link_views (share_link_id, viewer_fingerprint, created_at);

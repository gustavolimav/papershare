CREATE TABLE share_link_allowed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- revoking/deleting the link cascades to its allow-list
    share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
    email VARCHAR(254) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX share_link_allowed_emails_share_link_id_idx ON share_link_allowed_emails (share_link_id);
-- case-insensitive uniqueness per link, matching the LOWER(email) comparison
-- convention used everywhere else in this codebase
CREATE UNIQUE INDEX share_link_allowed_emails_unique_idx ON share_link_allowed_emails (share_link_id, LOWER(email));

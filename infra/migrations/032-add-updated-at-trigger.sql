-- Reusable trigger function that keeps `updated_at` current on every row
-- update, so application code no longer has to remember to set
-- `updated_at = NOW()` in every UPDATE statement (models/*.ts previously
-- did this by hand in 13 places across 8 files — easy to forget on a new
-- one). Applied to every table that has an `updated_at` column today:
-- users, sessions, documents, share_links, link_views, link_view_pages,
-- workspaces, subscriptions, feature_flags. Tables without one
-- (workspace_members, password_reset_tokens, document_chunks,
-- ai_usage_log, share_link_allowed_emails) are untouched — a future
-- table that adds `updated_at` should attach this same trigger in its
-- own creation migration.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON share_links
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON link_views
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON link_view_pages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON feature_flags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

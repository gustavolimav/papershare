ALTER TABLE
  documents
ADD COLUMN
  ai_insight TEXT,
ADD COLUMN
  ai_insight_suggestions JSONB,
ADD COLUMN
  ai_insight_generated_at TIMESTAMPTZ,
-- Snapshot of the analytics data the cached insight was generated from —
-- compared against current values on each request to decide whether the
-- cache is still valid, instead of re-calling the Claude API every time.
ADD COLUMN
  ai_insight_total_views INTEGER,
ADD COLUMN
  ai_insight_last_viewed_at TIMESTAMPTZ;

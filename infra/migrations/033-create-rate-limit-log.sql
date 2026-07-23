-- Shared store for infra/rate-limit.ts, replacing an in-memory Map that
-- was a no-op outside NODE_ENV=production specifically because it
-- doesn't survive multiple instances (e.g. Vercel serverless functions,
-- where each invocation can land on a different, short-lived process
-- with its own empty Map). Same shape and query pattern as
-- ai_usage_log/models/aiUsage.ts's existing Postgres-backed limiter: one
-- row per request, counted within a rolling window — no new
-- infrastructure needed, consistent with this project's no-extra-infra
-- approach.
CREATE TABLE rate_limit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX rate_limit_log_key_created_at_idx ON rate_limit_log (key, created_at);

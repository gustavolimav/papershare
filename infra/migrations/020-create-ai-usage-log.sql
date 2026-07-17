-- Shared rate-limit backstop for every cost-incurring AI feature (summary
-- regeneration, analytics insight regeneration, follow-up email drafts) —
-- one row per call, counted within a rolling window at the model layer.
-- `subject_id` is whatever dimension a given feature is limited by (a user
-- id for summary regeneration/follow-up emails, a document id for insight
-- regeneration) — deliberately not a foreign key, since it points at
-- different tables depending on `feature`.
CREATE TABLE ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    feature VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX ai_usage_log_subject_feature_created_at_idx ON ai_usage_log (subject_id, feature, created_at);

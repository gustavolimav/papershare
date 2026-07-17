ALTER TABLE
  documents
ADD COLUMN
  ai_summary TEXT,
ADD COLUMN
  ai_summary_generated_at TIMESTAMPTZ;

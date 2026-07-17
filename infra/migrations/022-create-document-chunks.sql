-- One row per page of extracted text, used for keyword-based retrieval in
-- the RAG viewer chat (US-16). Page granularity (rather than fixed-size
-- token windows) keeps chunking simple and gives the citation ("Baseado na
-- página X") for free — no separate page-to-chunk mapping needed.
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX document_chunks_document_id_page_number_idx ON document_chunks (document_id, page_number);

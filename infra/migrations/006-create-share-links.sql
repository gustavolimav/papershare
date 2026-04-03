CREATE TABLE
  share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid (),
    document_id UUID NOT NULL REFERENCES documents (id),
    user_id UUID NOT NULL REFERENCES users (id),
    label VARCHAR(255),
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
  );

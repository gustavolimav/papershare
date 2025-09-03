-- Create sessions table
-- Migration: 003-create-sessions.sql
-- Based on original migration: 1755042294422_create-sessions.js

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- why 96 characters? facebook uses 96 characters for their session tokens
    token VARCHAR(96) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    -- why timestamptz instead of timestamp? https://justatheory.com/2012/04/postgres-use-timestamptz/
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

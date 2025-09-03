-- Create users table
-- Migration: 001-create-users.sql
-- Based on original migration: 1746749128804_create-create-users.js

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- for reference github uses 39 characters
    username VARCHAR(30) NOT NULL UNIQUE,
    -- why 72 characters? https://security.stackexchange.com/q/39849
    password VARCHAR(72) NOT NULL,
    -- why 254 characters? https://stackoverflow.com/a/1199238
    email VARCHAR(254) NOT NULL UNIQUE,
    -- why timestamptz instead of timestamp? https://justatheory.com/2012/04/postgres-use-timestamptz/
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update users table timestamps and password length
-- Migration: 002-update-users.sql
-- Based on original migration: 1748710097388_create.js

-- Update default timestamps to use UTC
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT timezone('utc', now());
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

-- Altering the password column to have a length of 60 characters
-- This is a common length for bcrypt hashed passwords
ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(60);

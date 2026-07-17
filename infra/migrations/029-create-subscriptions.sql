-- Create subscriptions table
-- Migration: 029-create-subscriptions.sql
--
-- One row per workspace, only inserted once that workspace starts a real
-- Stripe checkout — a workspace with no row here is on the Free plan, so
-- there is no backfill for existing workspaces (see docs/plans/
-- 2026-07-17-monetization-design.md).

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id),
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    -- 'pro' or 'business' — never 'free'; Free is the absence of a row.
    plan VARCHAR(20) NOT NULL,
    -- 'active' / 'past_due' / 'canceled' / 'incomplete'
    status VARCHAR(20) NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

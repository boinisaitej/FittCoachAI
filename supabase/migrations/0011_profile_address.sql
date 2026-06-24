-- =============================================================================
-- FitCoachAI — Add billing address to profiles
-- Shown on invoices + editable on /account.
-- Safe to re-run.
-- =============================================================================

alter table profiles
  add column if not exists address text;

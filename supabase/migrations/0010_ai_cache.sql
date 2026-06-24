-- =============================================================================
-- FitCoachAI — Per-todo AI response cache
--   The "Why this assigned?" popover already has a text column (ai_reason).
--   This migration adds `ai_recipe` JSONB so cooking recipes are cached too.
--   Both endpoints check the column first and only invoke Gemini on a miss.
-- Safe to re-run.
-- =============================================================================

alter table daily_plan_items
  add column if not exists ai_recipe jsonb;

create index if not exists daily_plan_items_has_recipe_idx
  on daily_plan_items ((ai_recipe is not null));

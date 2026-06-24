---
name: schema-diff
description: Detect drift between local migration files and the live Supabase schema. Use when the user asks "are my migrations applied?", "is the schema in sync?", or "/sync-schema".
---

# Schema Diff

## When to use
- Before running E2E tests against a fresh environment.
- When the user reports "table not found" or "column does not exist" errors.
- After git pull / merge that touched `supabase/migrations/`.

## Steps
1. List all `supabase/migrations/*.sql` files.
2. Run `npx supabase migration list` (user must be `supabase login`-ed).
3. Diff applied vs local. Surface any:
   - Local files that haven't been pushed yet → run `npm run db:push`.
   - Applied migrations missing from local → user has pulled from another env; investigate, don't fix automatically.
4. After push, run `npm run db:types` to regenerate `types/database.ts`.
5. Run `npm run typecheck` to verify no TS regressions.

## Safety
- Never run `supabase db reset` without explicit user confirmation — it wipes all data.
- Never apply pending migrations to a project marked `production` in `.env`.

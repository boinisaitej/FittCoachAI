---
name: seed-demo
description: Seed the FitCoachAI Supabase project with a realistic demo gym — 1 owner, 3 trainers, 12 clients, sample plans, todos, BMI logs, photos. Run when the user asks for "demo data", "sample data", "fill the db", or "/seed-demo".
---

# Seed Demo Data

## When to use
- "seed demo data" / "add sample clients" / "/seed-demo"
- The user just spun up a fresh Supabase project and wants something to look at.

## What this skill does
1. Verifies `.env.local` has Supabase service-role key.
2. Runs `npm run seed` which executes `scripts/seed-demo.ts`.
3. Reports counts of inserted users, plans, todos, BMI logs.

## Steps
1. **Check env**: read `.env.local` for `SUPABASE_SERVICE_ROLE_KEY`. If missing, instruct user to add it (see `docs/SETUP.md`) and stop.
2. **Check existing state**: ask user before reseeding if there are already > 5 clients (to avoid duplicates).
3. **Run seed**:
   ```bash
   npm run seed
   ```
4. **Verify**: query `profiles` and report:
   - `<N>` owners
   - `<N>` trainers
   - `<N>` clients
   - `<N>` daily plans for today

## Safety
- Skill only operates against the project's configured Supabase URL.
- Never seed in production unless the user explicitly confirms.

## See also
- `scripts/seed-demo.ts` — the actual seed script.
- `demo.txt` A26 — demo tools feature ledger.

---
description: Seed the local Supabase project with a demo gym (1 owner, 3 trainers, 12 clients, sample plans, todos, BMI logs).
---

Run `npm run seed` and report what was inserted. Verify by listing recently created profiles via Supabase. If the seed script doesn't exist yet, scaffold it at `scripts/seed-demo.ts` following the demo-spec in `demo.txt` section A26.

Stop and ask the user before reseeding if the database already has more than 5 client rows.

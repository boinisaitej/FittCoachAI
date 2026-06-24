---
description: Apply pending Supabase migrations and regenerate TypeScript DB types.
---

1. List files in `supabase/migrations/`, compare to what's already applied (use `supabase migration list` if logged in).
2. Run `npm run db:push`.
3. Run `npm run db:types`.
4. Show a diff summary of any changes in `types/database.ts`.

If the user is not logged in to the Supabase CLI, instruct them to run `npx supabase login` first and stop.

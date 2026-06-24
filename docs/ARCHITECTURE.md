# FitCoachAI — Architecture

## Layered design (one-way imports)

```
app/        ─ routes, server actions, API handlers
  ↓
components/ ─ UI primitives + composites (most are "use client")
  ↓
lib/        ─ pure logic + provider wrappers (supabase, ai, email, pdf, push)
  ↓
types/      ─ shared type defs (no runtime imports)
```

Rules:
- `lib/` never imports from `app/` or `components/`.
- `components/` never imports from `app/`.
- `lib/supabase/server.ts` and `lib/auth.ts` are server-only (use `cookies()` / `service-role`); never import them in a `"use client"` file.

## Three tenants of trust

| Layer | Who can read what |
|---|---|
| **Postgres RLS** | Enforced by Supabase. Owners see their gym. Trainers see their assigned clients. Clients see their own data. |
| **Server actions / API routes** | Must call `requireUser()` / `requireRole()` from `lib/auth.ts`. Use `createClient()` (auth-aware) for queries; reach for `createServiceClient()` only for admin-create-user paths. |
| **Client components** | Use `createClient()` from `lib/supabase/client.ts`. RLS still applies — never trust client-side filters as security boundaries. |

## Data flow: a typical request

1. Browser → `middleware.ts` (`lib/supabase/middleware.ts`)
   - Refreshes session cookies, redirects unauthenticated users, enforces role-based routing.
2. Page (Server Component) calls `requireRole("owner")` from `lib/auth.ts`.
3. Page renders `<AppShell>` and queries Supabase via `createClient()`.
4. Interactive widgets (`"use client"`) mutate via:
   - **Server Actions** for form submissions (preferred — fewer round-trips).
   - **API routes** (`/api/...`) for AJAX / non-form interactions (e.g. water +1, todo complete).
5. Mutations trigger:
   - DB triggers in `0003_functions.sql` (`award_points_on_todo`, `handle_new_user`).
   - Realtime broadcasts on `notifications` and `chat_messages` tables.

## AI architecture

```
lib/ai/
├── gemini.ts        Singleton ChatGoogleGenerativeAI instances (flash + pro).
├── prompts.ts       All prompt strings, one function per scenario.
├── index.ts         High-level wrappers: generateDietDay, generateWorkoutWeek,
│                    healthRemedy, chat, etc. Each wraps safeAi(...) with a
│                    deterministic fallback so the app never breaks.
├── client-context.ts Builds the personalization context from Supabase
│                    (profile, prefs, BMI, injuries, festivals).
├── kb.ts            Nutrition KB search (LIKE fallback, pgvector when enabled).
└── image.ts         Food scanner via Gemini Pro vision.
```

API routes under `/api/ai/*` are thin adapters: collect inputs, build context, call a `lib/ai/*` wrapper, persist the result.

## Background jobs

```
/api/cron/tick                   every minute   announcements + sleep-low + sub expiry
/api/cron/auto-progression       Mon 06:00      AI weekly progression proposals
/api/cron/weekly-reports         Sun 18:00      Pro client weekly reports
```

All cron handlers call `assertCron(req)` which checks `Authorization: Bearer ${CRON_SECRET}` or `?secret=...`. Vercel cron sends the bearer header.

## Tenancy

Currently single-tenant per Supabase project. The schema already carries `gym_id` on every domain table, so multi-tenancy is a routing + signup flow change away (see `demo.txt` Part B4).

## Performance levers

- **RSC** by default — most pages stream from Supabase server-side, no client fetch.
- **Realtime** is used only where it matters: notifications, chat, broadcast.
- **`safeAi`** isolates AI latency; if Gemini takes > 30s, the user sees a fallback.
- **`recompute_streak`** runs as a Postgres function, not in JS — single round-trip.

## File-by-file map

See `CLAUDE.md` for the canonical folder layout and conventions.

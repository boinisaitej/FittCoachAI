# FitCoachAI — Engineering guide for Claude

Read this file fully before touching code in this repo.

## What this repo is
A Next.js 14 (App Router) + TypeScript SaaS for **three roles**: gym Owner, Trainer, Client. Backend is Supabase (Postgres + Auth + Storage + Realtime + RLS). AI is Gemini via `@langchain/google-genai`.

The full feature ledger lives in `demo.txt`. The build is in progress — see `docs/STATUS.md` if present.

## Architecture invariants

1. **One-way imports.** `app/` → `components/` → `lib/`. Never the reverse.
2. **Server-only modules live in `lib/`**. Anything that uses `createServiceClient`, `nodemailer`, `web-push`, `razorpay`, or `@react-pdf/renderer` MUST NOT be imported by `"use client"` files.
3. **RLS is the source of truth.** Every domain table has policies in `supabase/migrations/0002_rls.sql`. Add new tables → add new policies in the same file (or a follow-up migration). Never bypass RLS by using the service client in code paths that handle untrusted input.
4. **Auth flow.** `getUser()` / `requireUser()` / `requireRole()` in `lib/auth.ts` are the only ways to read the current user inside server code. Don't read `auth.uid()` from JS — pull the profile.
5. **AI fallbacks always present.** Every AI call in `lib/ai/index.ts` wraps `safeAi(...)` and returns a deterministic fallback if `GOOGLE_API_KEY` is missing. The app must function (with degraded AI features) when `GOOGLE_API_KEY === ""`.
6. **Cron-protected endpoints.** Any handler under `/api/cron/*` must call `assertCron(req)`.
7. **Don't hardcode secrets.** Everything reads from `lib/env.ts`. Add a new key there + in `.env.example` + in `docs/SETUP.md`.

## Folder layout

```
app/
├── (auth)/                    login / signup / forgot / reset
├── owner/                     owner role pages
├── trainer/                   trainer role pages
├── client/                    client role pages
├── account/                   shared profile / change-password
├── notifications/             shared notifications inbox
└── api/
    ├── ai/                    AI endpoints (diet, workout, why, chat, scanner)
    ├── cron/                  Scheduled jobs
    ├── webhooks/              External webhooks
    └── ...                    Domain APIs (bmi, water, sleep, junk, todo, etc.)

components/
├── ui/                        shadcn-style primitives
├── shell/                     AppShell + sidebar + topbar
├── animations/                Framer Motion wrappers
└── chat/                      Three-pane chat shell

lib/
├── supabase/                  server.ts (RSC), client.ts (browser), middleware.ts
├── ai/                        Gemini wrappers + prompts + KB + image
├── email/                     Nodemailer + template registry
├── pdf/                       @react-pdf/renderer documents
├── push/                      web-push helper
├── auth.ts                    Session helpers (requireUser/Role, adminCreateUser)
├── env.ts                     Zod-validated env access
└── utils.ts                   Pure helpers (cn, formatDate, classifyBmi, etc.)

supabase/migrations/           SQL — apply with `supabase db push` or paste in editor.
tests/e2e/                     Playwright suites.
.claude/                       Project-scoped skills, commands, agents, hooks.
```

## Conventions

- **Server Actions** live next to the page that uses them as `actions.ts`.
- **API routes** live under `app/api/<feature>/route.ts`.
- **Client components** with side effects use the `"use client"` directive at top.
- **Forms** use plain React state + `startTransition` (no react-hook-form in most places — keep it lean).
- **Toasts** are `sonner`; import `toast` from `"sonner"`.
- **Icons** are `lucide-react`.
- **Animations** are `framer-motion`; prefer `<FadeIn>` / `<Stagger>` from `components/animations/fade-in`.
- **Charts** are `recharts`.

## Common tasks

- **Add a new table:** add SQL to a new migration file `supabase/migrations/00NN_*.sql`, add a row to `types/database.ts`, regenerate types with `npm run db:types`.
- **Add an AI feature:** new prompt in `lib/ai/prompts.ts` + a wrapper in `lib/ai/index.ts` (use `safeAi` + a fallback). Surface it via an `app/api/ai/<name>/route.ts`.
- **Add a cron job:** `app/api/cron/<name>/route.ts` + entry in `vercel.json`. Always `assertCron(req)`.
- **Add a notification kind:** extend `notification_kind` enum in `0001_schema.sql` + `types/domain.ts` + `types/database.ts`.

## Don't

- Don't reach into `auth.users` from RLS policies (use `profiles` helpers in `0002_rls.sql`).
- Don't store JWTs or service-role keys in the browser bundle. `lib/supabase/server.ts` is server-only.
- Don't commit `.env*.local`. `.env.example` is the public template; `.env.local` is your secret store.
- Don't bypass `recompute_streak` — call it whenever a `todo_completion` is inserted with `status='completed'`.

## Project-scoped Claude config

See `.claude/README.md` for skills, commands, agents, and hooks specific to this repo.

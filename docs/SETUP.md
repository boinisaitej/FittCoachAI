# FitCoachAI — Setup guide

This walks you from "fresh clone" to "running locally with AI + Supabase + Playwright" in about 20 minutes.

## 0. Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | ≥ 20 LTS | Next.js 14 |
| **npm** | ≥ 10 | comes with Node |
| **Supabase CLI** | latest | applies migrations + generates types |
| **Git** | any | clone the repo |
| **A browser** | modern | Chrome / Edge / Safari |

Install Supabase CLI:
```bash
# macOS
brew install supabase/tap/supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm (works everywhere):
npm install --global supabase
```

## 1. Clone + install

```bash
git clone <your-repo-url> fitcoachai
cd fitcoachai
npm install
npx playwright install   # downloads chromium for E2E
```

## 2. Create a Supabase project

1. Go to <https://supabase.com/dashboard>, click **New project**.
2. Pick a region close to you. Choose a strong DB password — you'll paste it below.
3. Wait ~1 min for provisioning.

## 3. Get your keys

In your Supabase project: **Settings → API**. Copy:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`  ⚠️ **never expose to browser**
- **Reference ID** (in URL) → `SUPABASE_PROJECT_ID`

## 4. Get a Google AI Studio API key (for Gemini)

1. Go to <https://aistudio.google.com/app/apikey>.
2. Click **Create API key** → pick or create a project.
3. Copy the key → `GOOGLE_API_KEY`.

The free tier of Gemini Flash is generous; no card required.

## 5. Configure `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in **at minimum**:

```ini
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
SUPABASE_PROJECT_ID="<project-ref>"
SUPABASE_DB_PASSWORD="<the-db-password-you-set>"

GOOGLE_API_KEY="<your-google-ai-studio-key>"

CRON_SECRET="<paste a long random string here>"
```

Generate `CRON_SECRET` with: `openssl rand -hex 24`

Optional providers (skip unless you need them):
- **Email** — `MAIL_ENABLED=1` + SMTP_* (SendGrid recommended)
- **Razorpay** — `RAZORPAY_ENABLED=1` + `RAZORPAY_*` keys
- **Twilio** — for SMS / WhatsApp
- **Web Push** — `VAPID_*` keys (generate via `npx tsx scripts/generate-vapid.ts`)

> ⚠️ `.env.example` is committed to git as a template. `.env.local` is gitignored — never check in real secrets.

## 6. Apply the database schema

```bash
npx supabase login           # one-time, opens a browser
npx supabase link --project-ref <your-project-ref>
npm run db:push              # applies supabase/migrations/*.sql
```

If `db:push` fails because `pgcrypto`/`uuid-ossp` extensions aren't enabled, run them from the Supabase SQL editor first:
```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

### Alternative: paste SQL by hand
If you don't want to use the CLI, open Supabase **SQL Editor** and paste each file in order:
1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_functions.sql`
4. `supabase/migrations/0004_seed.sql`
5. `supabase/migrations/0005_storage.sql`

## 7. (Optional) Generate types from your live DB

```bash
npm run db:types
```

This regenerates `types/database.ts` to match your live schema. The committed file is hand-written and works out of the box, but `db:types` is the source of truth if you customize the schema.

## 8. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>.

## 9. Create your first account

1. Click **Get started**.
2. Fill the signup form — **the first user automatically becomes the gym Owner**.
3. Confirm your email (Supabase sends a magic link by default; click it).
4. Sign in. You'll land at `/owner`.

## 10. Add trainers + clients

From `/owner/users`:

1. Click **New user** → Trainer tab → fill name, email, specialization → create.
2. Click **New user** → Client tab → fill name, email, BMI fields → assign a plan → create.
3. Both receive a welcome email (or a console log if `MAIL_ENABLED=0`).

Then `/owner/assignments` → **Auto-match all** to pair clients with trainers by gender + plan.

## 11. Seed demo data (optional)

To skip manual setup and get a populated demo gym:

```bash
npm run seed
```

This creates 1 owner, 3 trainers, 12 clients, BMI history, and active subscriptions. Logins:
- `owner@fitcoach.demo` / `Owner@123`
- `trainer1..3@fitcoach.demo` / `Trainer@123`
- `client1..12@fitcoach.demo` / `Client@123`

## 12. (Optional) Test the AI features

Log in as a client → `/client/ai-diet` → click **Today's plan**. If your `GOOGLE_API_KEY` is set, you'll get a real Gemini-generated meal plan. If it's missing, the app falls back to deterministic placeholders (you'll see "Oats with banana & milk" etc.).

## 13. Run Playwright E2E

```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # watch it click around
npm run test:e2e:ui       # interactive UI mode
```

For role-based tests, create test accounts and set:
```ini
E2E_OWNER_EMAIL=owner@fitcoach.demo
E2E_OWNER_PASSWORD=Owner@123
E2E_CLIENT_EMAIL=client1@fitcoach.demo
E2E_CLIENT_PASSWORD=Client@123
```

## 14. Set up Storage buckets

The `0005_storage.sql` migration creates the buckets, but if you applied SQL manually you may need to verify them in **Storage** in the Supabase UI:

| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | yes | profile photos |
| `gym-logos` | yes | gym branding |
| `progress-photos` | no | private client photos |
| `invoices` | no | PDF storage |
| `reports` | no | weekly report PDFs |

## 15. Deploy to Vercel (recommended)

1. Push the repo to GitHub.
2. <https://vercel.com/new> → import your repo.
3. Add **all** the env vars from your `.env.local` (Vercel Settings → Environment Variables). Mark service-role + AI keys as **secret**.
4. Deploy.
5. In **Vercel → Settings → Cron Jobs**, the `vercel.json` config will register three cron schedules automatically.
   - `* * * * *` /api/cron/tick
   - `0 6 * * 1` /api/cron/auto-progression
   - `0 18 * * 0` /api/cron/weekly-reports

   Vercel sends `Authorization: Bearer <CRON_SECRET>` — ensure that env var matches your `.env.local`.

6. Set the production Supabase **Site URL** to your Vercel domain so password reset emails work.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `column does not exist` errors | Re-run `npm run db:push` and `npm run db:types` |
| Signup works but no profile is created | The `handle_new_user` trigger in `0003_functions.sql` didn't apply — re-run it from SQL editor |
| AI features return placeholders | `GOOGLE_API_KEY` is missing or invalid |
| Welcome email never arrives | `MAIL_ENABLED=0` — set to `1` and configure SMTP_* (recommend SendGrid) |
| Middleware redirects in a loop | Make sure `profiles.must_change_password` defaults to `false` for normal signups |
| `Permission denied for table` on a query | RLS policy missing — check `0002_rls.sql` and add a policy for the new table |
| Storage upload returns 400 | Run `0005_storage.sql` to create buckets + policies |
| Playwright tests time out | Set `PORT=3000` and ensure dev server is reachable; on Windows, run `npx playwright install` first |

## What's next?

- Wire **real SMTP** (SendGrid recommended) — set `MAIL_ENABLED=1`.
- Wire **Razorpay** — see `lib/razorpay/` and `app/api/webhooks/razorpay/`.
- Wire **Twilio / Gupshup** for SMS — see `lib/sms/`.
- Read **`docs/ARCHITECTURE.md`** and **`CLAUDE.md`** before extending the codebase.

Welcome to FitCoachAI 🚀

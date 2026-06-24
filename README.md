# FitCoachAI

AI-powered SaaS platform for gyms, trainers, and clients. Built with Next.js 14, Supabase, Gemini, TailwindCSS, and Framer Motion.

## Quick start

```bash
# 1) Install
npm install

# 2) Configure keys (see docs/SETUP.md for full walkthrough)
cp .env.example .env.local
# edit .env.local with your Supabase + Google AI keys

# 3) Apply database schema
npx supabase db push       # or paste supabase/migrations/*.sql into Supabase SQL editor

# 4) Run
npm run dev
```

Visit `http://localhost:3000`. The first signup becomes the gym Owner.

## Features

Three roles — Owner, Trainer, Client — sharing one app:

- Role-based dashboards with live KPIs
- AI diet, AI workout, AI chat, AI food scanner (Gemini)
- Daily plan / todos with completion tracking + calendar
- BMI logging, progress photos, water/sleep/junk-food trackers
- Health-issue reporting with AI remedy generator
- Three-pane chat (Trainer/Client/Owner/AI) with sessions + broadcasts
- Notifications, web push, email templates, PDF invoices/reports
- Gamification (points, streaks, milestone rewards)
- Festival-aware veg enforcement + animated slogan banner
- Razorpay billing scaffolding (webhook-driven)

See `demo.txt` for the full feature ledger and roadmap.

## Stack

- **Next.js 14** (App Router, Server Actions, RSC)
- **TypeScript**
- **Supabase** (Postgres, Auth, Storage, Realtime, RLS)
- **Gemini** via `@langchain/google-genai`
- **TailwindCSS** + **shadcn/ui** + **Framer Motion**
- **Playwright** for E2E tests
- **@react-pdf/renderer** for PDFs
- **web-push** for browser notifications
- **Razorpay**, **Twilio**, **Nodemailer** (optional providers)

## Project layout

```
fitcoachai/
├── app/                  Next.js routes (owner/, trainer/, client/, api/)
├── components/           UI + animations + dashboard widgets
├── lib/                  supabase/, ai/, razorpay/, email/, pdf/
├── hooks/                React hooks
├── types/                Generated DB types + domain types
├── supabase/             Migrations + seed data
├── tests/e2e/            Playwright suites
├── scripts/              seed-demo, cron-tick, ai-eval
├── .claude/              Project-scoped skills, commands, agents, hooks
└── docs/                 SETUP, ARCHITECTURE, API
```

## Docs

- [docs/SETUP.md](docs/SETUP.md) — get every key, apply migrations, deploy
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries + data flow
- [docs/API.md](docs/API.md) — REST endpoints + webhook contracts
- [.claude/README.md](.claude/README.md) — project-scoped Claude config

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TS without emit |
| `npm run test:e2e` | Playwright E2E suite |
| `npm run db:push` | Apply Supabase migrations |
| `npm run db:types` | Regenerate TS DB types |
| `npm run seed` | Seed demo gym + users |
| `npm run cron:tick` | Manually trigger scheduler |

## License

MIT — see LICENSE

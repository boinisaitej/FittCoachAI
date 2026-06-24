# FitCoachAI — Build status

Snapshot of what's shipped in this scaffold vs. what's deferred to follow-up sessions.

## ✅ Shipped (Part A core)

### Infrastructure
- Next.js 14 (App Router) + TypeScript strict
- Supabase (Postgres + Auth + Storage + RLS) — 5 migration files
- Gemini via `@langchain/google-genai` with graceful fallbacks
- TailwindCSS + 12+ shadcn/ui primitives
- Framer Motion animations (FadeIn, Stagger, Float, marquee slogan strip)
- Dark mode (system + manual)
- Playwright E2E test suite with role-based fixtures
- VAPID web-push scaffold + service worker
- @react-pdf/renderer for invoices + weekly reports
- Vercel cron config (3 schedules) with `assertCron` protection

### Auth
- First-user-becomes-Owner trigger
- Login / Signup / Forgot / Reset / First-login password change
- Role-based middleware (`/owner`, `/trainer`, `/client` enforced)
- Deactivated-account guard
- Service-role admin-create-user with welcome email + temp password

### Owner
- Console with KPIs (clients, trainers, active subs, revenue)
- Numbered step-by-step onboarding cards
- Create trainer / create client modals
- Reset password / activate / deactivate
- Plan editor (Basic + Pro pricing + duration)
- Subscription actions: extend +7/+30/+90, discount
- Assignments page with auto-match (gender + plan rules) + manual select
- Trainer-load table
- Invoice issuance (sequential FY-aware numbering, GST, PDF)
- Announcements (audience, immediate or scheduled, optional email)
- Slogans (owner adds + AI generate)

### Trainer
- Dashboard with KPIs, today's clients, alerts inbox
- Client list grid (search)
- Client deep page (Today / Overview / History / Notes)
- Daily plan builder (animated row drag/edit/remove + AI suggest)
- Cheat day grant
- Weekly summary notes
- Broadcast (chat thread + bell to all clients)
- Alerts inbox with resolve action

### Client
- Dashboard (streak, BMI, water, plan end, BMI trend chart, water widget, quick AI actions)
- Today's plan with checkable todos + per-row "why?" AI popover
- Calendar with green/yellow/red day cells
- BMI logging + history + chart
- AI Diet (day + week, meal cards with recipes)
- AI Workout (day + week, injury-aware)
- Grocery list generator from saved diet plans (categorized + INR + checklist mode)
- Nutrition KB (RAG search, fallback ILIKE, history sidebar)
- Health issues (AI remedy: foods + exercises + tips, severe → trainer alert)
- Injuries (active list, future workouts auto-exclude)
- Progress photos (Before / Progress / After + side-by-side compare)
- Sleep tracker (< 6h raises trainer alert)
- Junk-food log (5+ in 7d raises alert)
- Invoice list

### Cross-cutting
- Three-pane chat (people + AI tabs) with realtime via Supabase channels
- AI chat session sidebar + Basic plan daily quota (10/day, Pro unlimited)
- Right-click bubble → copy / delete (own messages only)
- Notifications bell with live unread count + dropdown toast
- /notifications page (mark all read + clear)
- Web push subscribe API + sw.js
- Animated slogan strip on every authenticated page (22 defaults + AI + owner-added)
- Festival-aware veg lock banner (today's `festivals` row)
- Gamification triggers (Postgres):
  - `award_points_on_todo` — 10/4/0 pts
  - `recompute_streak` — current + longest + 7/30/90 milestone rewards
  - Auto subscription extension on milestone
- Cron handlers: scheduled announcements, sleep monitor, sub expiry, AI auto-progression, Pro weekly reports

### Demo + tooling
- `scripts/seed-demo.ts` — 1 owner + 3 trainers + 12 clients + plans + BMI logs
- `scripts/generate-vapid.ts` — VAPID keypair
- `.claude/` — settings, hooks, 4 skills, 4 slash commands, 3 specialized agents
- Comprehensive `CLAUDE.md`, `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `docs/API.md`

## 🚧 Deferred (Part B — production polish)

These are scoped but not yet implemented. Each has notes / placeholders in code.

| Area | Status |
|---|---|
| Razorpay full flow | env vars + types only; webhook + checkout pending |
| SendGrid + open/click tracking | basic nodemailer wired; need inbound webhook |
| Twilio / WhatsApp OTP | env vars only |
| Multi-tenancy slug routing | schema already supports `gym_id`; routing pending |
| Bulk CSV import | UI not built |
| PWA install + offline shell | sw.js exists; manifest needs install prompt |
| 2FA TOTP | not started |
| Audit log | not started |
| Cookie consent / GDPR / DPDP banner | not started |
| Smartwatch sync | not started |
| Photo body-fat estimator | not started |
| Voice AI coach (Whisper + TTS) | not started |
| Food scanner UI | API done at `lib/ai/image.ts`; UI page pending |
| Eval harness `scripts/ai-eval.ts` | spec written in `.claude/skills/ai-eval/`; script pending |
| Database types generation | hand-written `types/database.ts`; regenerate via `npm run db:types` after applying migrations |

## ⚠️ Before you ship

1. **Apply migrations** — `npm run db:push` (or paste SQL by hand).
2. **Set `CRON_SECRET`** to something random — `vercel.json` cron jobs require it.
3. **Set `GOOGLE_API_KEY`** for AI features (or accept deterministic fallbacks).
4. **Enable `MAIL_ENABLED=1` + SMTP** before going live, otherwise welcome / invoice emails just log to console.
5. **Storage buckets** — confirm `0005_storage.sql` ran and the four buckets exist.
6. **Site URL** — set the production app URL in Supabase Auth settings so password-reset emails work.

See `docs/SETUP.md` for the full walkthrough.

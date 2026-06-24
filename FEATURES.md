# FitCoachAI — Feature Status

A complete map of what's shipped, what's half-built, what's missing from `demo.txt`, and a curated list of **new features worth adding next**.

Legend: ✅ done end-to-end · 🟡 partial / scaffold present · ❌ not built

Last updated: 2026-05-17

---

## At a glance

| Phase | ✅ Done | 🟡 Partial | ❌ Not started |
|---|---:|---:|---:|
| Part A — Core gym SaaS | 71 | 11 | 4 |
| Part B — Production polish | 34 | 9 | 47 |
| Cross-cutting infra | 8 | 0 | 0 |
| **Totals** | **113** | **20** | **51** |

**≈ 113 features live, 20 partial, 51 still to build.**

---

# ✅ Implemented (live in the app today)

## Accounts, roles, auth
- 3-role system (Owner / Trainer / Client) with RLS on every table
- First-time signup → first user becomes Owner (DB trigger)
- Login / Logout / Change password / Forgot + Reset
- Force-change-password on first sign-in (middleware redirect)
- Owner creates Trainer / Client accounts (full profile + plan + availability)
- Owner activates / deactivates non-owner accounts
- Bulk CSV import for trainers + clients (with credentials CSV export)
- Welcome email on account creation (SMTP optional; console fallback)

## Plans & subscriptions
- Owner assigns Basic / Pro plan (default 30-day window)
- Owner extends subscription by N days
- Owner applies discount %
- Auto-extend on 7 / 30 / 90 day streaks (+2 / +7 / +14 days)
- Fiscal-year-aware GST-compliant invoice numbering (`INV-2025-26-00001`)
- Invoice preview + download as PDF (Bill-to, trainer panel, age, joined date, GST split, paid/issued dates)

## Client ↔ Trainer matching
- Auto-match by gender + plan kind (female→female, pro→personal)
- Manual reassign (history kept, partial unique-index enforces single active assignment)
- Live trainer-load table
- Client dashboard shows assigned trainer
- Trainer can update client BMI for monthly check-ins
- Trainer sees client allergies / injuries / chronic conditions

## Client experience
- Daily plan (food / exercise / water / sleep rows) built by trainer
- "AI suggest entire plan" one-click for the trainer
- Client checks off todos (Completed / Partial / Skipped) with points (10 / 4)
- "Why is this in my plan?" AI popover per row, **cached** in `daily_plan_items.ai_reason`
- Trainer-granted cheat day
- BMI logging + history line chart + auto-classification
- Health-issue submit → AI returns foods/exercises/tips
- Injury reporter (severity + notes) → future workouts auto-exclude conflicts
- Progress photos (Before / Progress / After) + side-by-side compare card
- Water tracker (+1 / -1 with weekly bar)
- Sleep tracker with low-sleep alert (< 6 h)
- Junk-food log with weekly trend + threshold alert
- Festival-aware diet banner + forced-veg lock
- Animated slogan banner (22 defaults + AI-generated)
- **Daily AI motivation banner** on dashboard, IST-day cached (1 LLM call / user / day)
- Calendar — month grid, green/yellow/red dots, Sunday-first, IST
- 7-day streak strip + milestone celebrations
- PWA install prompt + offline shell

## AI features
- AI Diet (single day + full week, 4 meal cards) with vegetarian / allergy / injury context
- AI Workout (single day + full week)
- AI Food Scanner (Pro) — photo → calories / macros / health flags
- AI Recipe on demand with response cache in `ai_recipe` JSONB → identical request returns instantly
- AI auto-progression cron every Monday 06:00 IST
- AI weekly summary paragraph (trainer view) per client
- AI motivation pings
- AI health remedy generator
- **Multi-key Gemini pool** with round-robin + 60 s park-on-quota auto-rotation
- LLM-only outputs (no hardcoded fallback strings) — errors bubble up honestly
- AI streaming chat (tokens appear as generated)
- AI chat quota: Pro = unlimited, Basic = 10/day, resets midnight IST
- AI health diagnostic endpoint (Owner-only)

## Chat & notifications
- Three-pane chat shell with role-aware sidebar
- Trainer ↔ Client + Owner ↔ anyone (auto-thread)
- Real-time delivery via Supabase Realtime (no refresh)
- Copy / delete bubble actions (always-visible icons + right-click)
- Names shown for trainer / client / owner (service-role peer lookup + fallback)
- IST timestamps + tooltip with exact date
- Notification on incoming message → click → deep-link to thread
- AI tab with session sidebar + history persistence
- Trainer broadcast to all clients
- Owner announcement (audience + scheduled) — bell + email

## Owner monetisation tooling
- KPI console + step-by-step onboarding cards
- **Owner analytics** (`/owner/analytics`) — MRR, churn, new clients, top trainers, expiring subs
- **Group-class scheduler** (`/owner/classes`) — capacity, trainer assignment, status
- **Client class booking** (`/client/classes`) — auto-promotes waitlist on cancel
- **Trainer rating leaderboard** (`/owner/leaderboard`) — avg rating + count + load (🥇🥈🥉)
- **Trainer payroll export** (`/owner/payroll`) — 30 % commission on last-30-day paid invoices, CSV
- **Lead pipeline** (`/owner/leads`) — Kanban (walk-in → trial → paid), drag-drop, convert-to-client
- **Specializations CRUD** (`/owner/specializations`) — add / rename / remove with cascade re-tag
- **Trainer availability** captured at create-time (days + start/end + note)

## Security & compliance
- Secrets only via `lib/env.ts` (no hardcoded keys)
- RLS on every domain table
- CSRF via Server Actions + Supabase token
- HTTPS cookies (Secure + HttpOnly + SameSite)
- **Audit log** (`audit_log` table + RLS + viewer at `/owner/audit` + writes on user-create / activate / trainer-assign / invoice-issue / class-create / class-cancel)
- Privacy Policy (`/privacy`) — Indian DPDP wording
- Terms of Service (`/terms`)

## Mobile & UX
- Responsive layout (phone / tablet / laptop / TV up to 3xl)
- Mobile slide-out drawer + hamburger
- Touch-friendly tap targets (min 40 px)
- Fluid typography via `clamp()`
- Sidebar collapse + Ctrl+B shortcut
- Dark mode (auto + manual)
- Framer Motion animations (FadeIn, Stagger, layoutId pills, AnimatePresence)

## Background jobs
- Every-minute scheduler for announcements + trainer notifications
- Monday 06:00 auto-progression proposals
- Sleep / junk / stale-todo / weekly-report monitors
- Weekly adherence PDF emailed to Pro clients

## Tooling & infra
- TypeScript strict
- Tailwind + shadcn/ui + Framer Motion + recharts (lazy-loaded)
- Supabase Postgres + Auth + Storage + Realtime
- Playwright E2E suite
- `.claude` project config (skills / agents / hooks / commands)
- `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/STATUS.md`
- Seed-demo script (`npm run seed`)

---

# 🟡 Partial — scaffold present, polish pending

| Feature | What's there | What's missing |
|---|---|---|
| Calendar day-modal | grid + dots | click → day detail modal |
| Auto-progression UI tab | cron writes alerts | dedicated trainer-side review page |
| Send ad-hoc client report | weekly PDF cron | manual "send report now" button |
| 5-second live refresh on dashboards | Realtime on chat + notifications | extend to BMI / streak / todos |
| AI motivational banner | ✅ live | translate per `language` preference |
| AI Recipe button on diet cards | API + cache ready | wire UI button |
| FAISS RAG search | ILIKE fallback + pgvector schema | embed knowledge base + index warm-up |
| Grocery list history | list shown | rename / duplicate / delete actions |
| Trainer-side injury resolve | client resolves themselves | trainer override toggle |
| Ratings UI | `/api/ratings` exists | weekly prompt modal |
| Trainer recurring notifications | immediate works | recurring cron entries |
| Web push (browser) | VAPID keys + sw.js | UI prompt-to-subscribe button |
| email_log tracking | status logged on send | open / click / bounce webhook |
| Owner signup wizard | basic gym row | logo / brand color / currency / timezone / language picker |
| Self-serve 14-day trial | signup works | trial gate + auto-deactivate |
| Twilio | env vars present | actual SMS send wired |
| Strict CSP header | basic headers in `next.config.mjs` | nonce-based strict-dynamic |
| Brute-force lockout | Supabase default | custom per-IP throttle on `/auth/login` |
| Eval harness on every deploy | `.claude/skills/ai-eval/` spec | CI hook to run it |
| Background worker | Vercel cron | Docker + RQ/Celery option for self-host |
| Vercel deploy | `vercel.json` cron schedules | actual deploy + custom domain wired |
| Redis cache | in-memory caches (slogan, profile, role) | swap to Upstash Redis for multi-instance |

---

# ❌ Not implemented (from demo.txt + production needs)

### Payments — Razorpay
- Orders API integration
- Razorpay Checkout JS SDK on `/client/invoices`
- Webhook `/webhooks/razorpay` (payment.captured / failed)
- Subscriptions API for auto-renewal
- Payment Links via SMS / WhatsApp
- Auto-deactivate on payment failure
- Refund flow
- Trainer commission report tied to actual settled payments

### SMS + WhatsApp
- OTP login via SMS (alternative to email/password)
- WhatsApp invite when an account is created
- Plan-assigned WhatsApp confirmation
- Missed-workout nudge SMS
- Payment-due reminder
- Owner SMS broadcast
- Gupshup / MSG91 alternative driver

### Multi-tenancy / white-label
- Subdomain routing `<slug>.fitcoach.ai`
- Custom domain + Let's Encrypt automation
- Per-tenant business hours / holidays / sender-email
- Cross-tenant audit log (super-admin view)
- Super-admin console (you)
- Multi-branch under one owner

### Security & compliance
- 2FA TOTP (Owner mandatory, others optional)
- Soft-delete + GDPR/DPDP "delete my data" pipeline
- Cookie consent banner (EU/DPDP-compliant)
- Error tracking (Sentry / GlitchTip)
- Encrypted DB backup → S3
- OWASP ZAP scan in CI
- HIPAA-style data retention policy

### AI / ML upgrades
- Voice-input AI coach (Whisper-in + TTS-out)
- Progress-photo body-fat estimator
- Smartwatch sync (Google Fit / HealthKit / Fitbit)
- Plateau detector (weight / strength flat-line alert)
- AI form-check from a 5 s phone video
- Personalised supplement guidance with disclaimers
- Multilingual AI coach (EN / HI / TE / TA output)
- Regenerate single meal with user feedback

### Deployment / ops
- Docker + docker-compose for self-host gyms
- `/healthz` endpoint + uptime monitor (UptimeRobot ping)
- GitHub Actions CI (lint + typecheck + Playwright)
- Auto-deploy on `main` push
- Blue-green / zero-downtime release
- Log aggregation (Logtail / Better Stack)
- Metrics dashboard (Grafana / built-in)

### Growth / marketing
- Lead capture page per gym (`/g/<slug>/join`)
- Referral program (client invites friend → both get bonus)
- Affiliate program (trainer / gym affiliates)
- Email + WhatsApp drip campaigns (Day 0 / 3 / 7 / 14)
- Product tour (Shepherd.js) for new owners
- Marketing pages: `/pricing`, `/demo`, `/contact`

### Mobile extras
- iOS push via APNS
- i18n (EN / HI / TE / TA — chip + AI output)
- QR-code kiosk attendance (gym entrance iPad)
- Biometric login (Face ID / fingerprint)

### Owner monetisation (more)
- Attendance heatmap (peak hours per branch)
- Inventory + POS-lite for supplements, towels, etc.
- Locker / equipment booking
- Diet-pack add-on sales (e.g., "30-day high-protein bundle")

---

# 💡 New feature ideas worth adding (not in demo.txt)

These are net-new ideas that would meaningfully differentiate the product. Roughly ranked by impact-per-effort.

## High impact / low effort (1 day or less)

### 🎯 1. Trainer focus mode — daily worklist
A single page that tells a trainer everything they need to do today, in order: clients with red alerts → clients whose plan is empty → clients with overdue check-ins → group classes they're teaching. Replaces dashboard scrolling.

### 🎯 2. "Today's celebrity" widget on client dashboard
The client who completed the most todos in the gym yesterday gets called out. Drives daily-active engagement (gamification carrot for the whole gym, not just streaks).

### 🎯 3. Workout timer + rest-period buzzer (PWA)
Inline timer on each exercise row in `/client/today`. Plays a soft chime + vibration when rest is over. Zero backend changes — pure client.

### 🎯 4. Quick log via Telegram bot
Bind a Telegram chat to your client account → DM "ate 2 rotis + dal" → it logs to junk_log / food log. Cheaper than building a mobile app, very Indian-user-friendly.

### 🎯 5. Meal photo → "is this on plan?" verdict
Client snaps the meal they're about to eat → AI compares against today's plan items → gives traffic-light answer (✅ on-plan / 🟡 close enough / ❌ off-plan, here's why). Reuses the food scanner.

### 🎯 6. Trainer client-load balancer
Owner button "rebalance trainers" → shows the variance in client count per trainer + a one-click move recommendation. Half-day to build.

### 🎯 7. Birthday / anniversary auto-greetings
Cron at 07:00 IST checks `dob` and subscription `created_at` → sends a personalised AI-written greeting + 10 % off coupon code. Zero marketing-team needed.

### 🎯 8. Client check-in pulse (1-tap mood)
"How are you feeling today?" 4 buttons on the dashboard — Energetic / Okay / Tired / Sore. Trainer's overview page now shows a 7-day mood strip. Drives plan adjustments without a chat.

### 🎯 9. Calorie deficit / surplus tracker
Compare estimated kcal from food log vs target → simple bar saying "−420 kcal today, on track for 0.5 kg / week".

### 🎯 10. "Skip today, I'm sick" button
Client taps it → plan is auto-shifted by a day, trainer gets a notification, the streak isn't broken. Tiny QoL feature that prevents discouragement.

## Medium effort (2–4 days)

### 11. AI-generated weekly recap reel
Every Sunday, generate a short Insta-Story-style card for each client (calories burnt, kg lost, top exercise, streak count, motivational quote) → downloadable PNG. Free user-acquisition via shares.

### 12. Trainer marketplace inside the platform
Trainer can offer "extra services" beyond their plan (1-on-1 PT session, custom diet pack, posture check video review). Client pays in-app. Owner takes 20 % commission. Razorpay-gated.

### 13. Habit-stack builder
"After I drink my morning water (existing habit) → I will do 10 squats (new habit)". Wires a `habit_chains` table to BJ Fogg's tiny-habits idea. Surprisingly few competitors do this.

### 14. Workout buddy matchmaker
Match two clients with similar goals + similar gym timings → they get nudged to "buddy up" for accountability. Increases retention by 30–40 % per published research.

### 15. Form-check via short video upload
Client uploads ≤ 10 s clip → Gemini 1.5 Pro multimodal returns form notes ("knees caving in on rep 3"). Already have multi-key pool ready.

### 16. AI coach for the trainer
"Suggest 3 progression options for this client" → AI reads client's last 4 weeks of plans + adherence + injuries → outputs 3 different next-week plans with pros/cons. Cuts plan-building time by 70 %.

### 17. Smart re-engagement workflow
Client misses 5 days → bell notification "we miss you". Misses 14 days → AI-written WhatsApp from the trainer. Misses 21 days → owner gets a "at-risk client" alert. Tiered drip.

### 18. Hindi / regional-language UI (i18n)
Add a `language` chip at signup → wraps Tailwind classes + AI prompt directive. Indian Tier-2 / Tier-3 gyms desperately need this.

### 19. Equipment-aware AI workout
Owner inputs gym equipment inventory once (dumbbells up to 30 kg, no treadmill, etc.) → all AI workouts are constrained to that list. Sales hook for low-budget gyms.

### 20. Vital signs integration
Plug a smart-scale or BP monitor (Bluetooth → companion app → Supabase). Auto-flag if BP > 140 / 90 on logging. Liability-mitigating.

## Higher effort but distinctive (1+ week)

### 21. Live-class streaming
Embed Daily.co or 100ms → owner schedules a class, clients tap "Join". Plays in the PWA. Pro-only revenue lever.

### 22. Voice-first onboarding
Owner taps mic, says "Add a new client called Priya, female, 32, vegetarian, ₹2000 Pro plan starting today". AI parses → all fields filled. Indian gym owners hate forms.

### 23. AR posture coach (mobile only)
WebAR / MediaPipe pose detection → shows real-time skeleton overlay during an exercise. Frame-by-frame analysis. Hugely differentiating but is 2 weeks of work.

### 24. Owner WhatsApp Business assistant
Owner can WhatsApp the FitCoachAI number → "show me trainers with empty slots tomorrow" → bot replies. Same for clients: "what's my plan today?". Replaces app-opening for 80 % of needs.

### 25. Federated learning per gym
The AI tunes its recommendations from this gym's own outcomes (clients who lost weight on which plans) without leaking PII. Subtle moat-builder.

### 26. Insurance integration
Partner with HDFC Ergo / Niva Bupa → clients who hit a 90-day streak get insurance premium discount. Real business moat.

### 27. Gym social feed (Strava-lite)
Clients can post a "completed workout" card with auto-stats → others in the same gym can 👏 react. Drives the social-proof loop.

### 28. Trainer skill assessments
Owner sends trainer a 10-question CPT-style quiz. Score logged. Used as a tiebreaker for auto-matching.

---

# 🛠️ Migrations to apply

In Supabase SQL editor, run in order:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_functions.sql
supabase/migrations/0004_seed.sql
supabase/migrations/0005_storage.sql
supabase/migrations/0006_trainer_extras.sql
supabase/migrations/0007_chat_notify.sql
supabase/migrations/0008_profiles_gym_visibility.sql
supabase/migrations/0009_leads.sql
supabase/migrations/0010_ai_cache.sql
supabase/migrations/0011_profile_address.sql
supabase/migrations/0012_classes_audit.sql   ← group classes + audit_log
```

---

# 🎯 Recommended next sprint (suggested order)

1. **Razorpay end-to-end** — Orders + Checkout + Webhook + auto-deactivate. Unlocks self-serve revenue.
2. **WhatsApp Business integration** (one-way first) — birthday greetings + payment reminders + missed-workout nudges. India-critical.
3. **Trainer focus mode** — daily worklist page. Visible polish, half-day build.
4. **Workout timer + rest buzzer** — pure-client, half-day, big QoL.
5. **Subdomain multi-tenancy** — `<slug>.fitcoach.ai`. Lets you sell to multiple gyms without redeploys.
6. **2FA TOTP for owners** — enterprise check-box, half-day.
7. **Hindi i18n MVP** — one-language proof-of-concept. Opens Tier-2 / Tier-3 market.

Total: ≈ 1 week of focused work to ship 7 high-leverage features.

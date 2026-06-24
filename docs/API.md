# FitCoachAI — API reference

All routes live under `/api/`. Auth is via Supabase session cookies (set by `lib/supabase/middleware.ts`).

## Authentication
Every route except `/api/webhooks/*` and `/api/cron/*` requires a logged-in user. Cron routes require `Authorization: Bearer ${CRON_SECRET}`.

## AI

| Route | Method | Body | Role | Returns |
|---|---|---|---|---|
| `/api/ai/diet` | POST | `{ scope: "day"\|"week", date?, clientId? }` | client/trainer | `{ ok, data: AiDietDayPlan \| AiDietWeek }` |
| `/api/ai/workout` | POST | `{ scope, date?, clientId? }` | client/trainer | `{ ok, data: AiWorkoutDayPlan \| AiWorkoutWeek }` |
| `/api/ai/why` | POST | `{ title, kind, description? }` | any | `{ ok, data: string }` |
| `/api/ai/chat` | POST | `{ sessionId?, message }` | any | `{ sessionId, reply, quota }` |
| `/api/ai/grocery` | POST | `{ from, to }` (dates) | client | `{ data: { categories, totalInr } }` |
| `/api/ai/suggest-plan` | POST | `{ clientId }` | trainer | `{ items: TodoItem[] }` |
| `/api/kb/search` | POST | `{ query }` | any | `{ hits, vectorLive }` |

## Domain

| Route | Method | Body | Role | Side effects |
|---|---|---|---|---|
| `/api/bmi` | POST | `{ height_cm, weight_kg }` | client | Inserts bmi_logs row + updates profile |
| `/api/water` | POST | `{ glasses }` | client | Upserts today's water_logs |
| `/api/sleep` | POST | `{ hours, notes? }` | client | Upserts sleep_logs + raises sleep_low alert if < 6h |
| `/api/junk` | POST | `{ item, quantity? }` | client | Inserts junk_food_logs + raises junk_excess alert if 5+ in 7 days |
| `/api/todo/complete` | POST | `{ itemId, status }` | client | Upserts todo_completions + calls `recompute_streak()` |
| `/api/health/report` | POST | `{ problem, severity }` | client | Inserts health_issues + AI remedy + severe_health alert |
| `/api/health/injury` | POST/PATCH | `{ tag, severity }` / `{ id, resolve }` | client | Manages injuries (workout filtering) |
| `/api/ratings` | POST | `{ rateeId, stars, comment? }` | any | Upserts weekly rating |
| `/api/notifications/bulk` | POST | `{ action: "mark_all_read"\|"clear" }` | any | Bulk-update own notifications |

## Trainer

| Route | Method | Body | Role |
|---|---|---|---|
| `/api/trainer/alerts/resolve` | POST | `{ id }` | trainer |
| `/api/trainer/weekly-report/:clientId` | GET | — | trainer |

## Owner

Most owner mutations are Server Actions colocated with their pages (`app/owner/*/actions.ts`):

- `createUserAction` — create trainer or client
- `setActiveAction` — activate/deactivate user
- `resetPasswordAction` — trigger reset email
- `assignTrainerAction` / `autoMatchAllAction` — pair trainers ↔ clients
- `updatePlanAction` / `extendSubscriptionAction` / `discountSubscriptionAction`
- `issueInvoiceAction`
- `createAnnouncementAction`
- `addSloganAction` / `generateAiSlogansAction`

## Push notifications

| Route | Method | Body |
|---|---|---|
| `/api/push/subscribe` | POST | `{ subscription: PushSubscription, ua? }` |

## PDF

| Route | Method | Returns |
|---|---|---|
| `/api/invoices/:id/pdf` | GET | `application/pdf` (owner or client owner of invoice) |
| `/api/trainer/weekly-report/:clientId` | GET | `application/pdf` (trainer) |

## Cron

All under `/api/cron/*` — require `Authorization: Bearer $CRON_SECRET`.

| Route | Method | Schedule |
|---|---|---|
| `/api/cron/tick` | GET | every minute |
| `/api/cron/auto-progression` | GET | Mon 06:00 |
| `/api/cron/weekly-reports` | GET | Sun 18:00 |

## Webhooks (planned)

| Route | Method | Sender | Verification |
|---|---|---|---|
| `/api/webhooks/razorpay` | POST | Razorpay | HMAC SHA256 of body with `RAZORPAY_WEBHOOK_SECRET` |
| `/api/webhooks/sendgrid` | POST | SendGrid | (planned — for open/click/bounce events) |

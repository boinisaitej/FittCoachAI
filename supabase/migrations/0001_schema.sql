-- =============================================================================
-- FitCoachAI — Core Schema
-- All domain tables, indexes, foreign keys.
-- RLS policies live in 0002_rls.sql, helper functions in 0003_functions.sql.
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Role enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('owner', 'trainer', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_kind as enum ('basic', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sub_status as enum ('active', 'expired', 'cancelled', 'grace');
exception when duplicate_object then null; end $$;

do $$ begin
  create type todo_kind as enum ('food', 'exercise', 'water', 'sleep', 'note');
exception when duplicate_object then null; end $$;

do $$ begin
  create type todo_status as enum ('pending', 'completed', 'partial', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type severity as enum ('mild', 'moderate', 'severe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_kind as enum ('before', 'progress', 'after');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_thread_kind as enum ('trainer_client', 'owner_client', 'owner_trainer', 'broadcast');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_kind as enum ('sleep_low', 'severe_health', 'injury', 'junk_excess', 'missed_workout', 'stale_todos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_kind as enum (
    'welcome', 'plan_assigned', 'plan_extended', 'invoice', 'report',
    'announcement', 'broadcast', 'todo_reminder', 'streak_reward',
    'alert', 'message', 'system'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Gyms (tenant)
-- ---------------------------------------------------------------------------
create table if not exists gyms (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text unique,
  address         text,
  logo_url        text,
  primary_color   text default '#22c55e',
  currency        text default 'INR',
  timezone        text default 'Asia/Kolkata',
  language        text default 'en',
  owner_user_id   uuid,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  gym_id          uuid references gyms(id) on delete set null,
  role            user_role not null default 'client',
  full_name       text,
  email           text,
  phone           text,
  avatar_url      text,
  gender          text check (gender in ('male','female','other')),
  dob             date,
  height_cm       numeric,
  weight_kg       numeric,
  specialization  text,
  trainer_type    text check (trainer_type in ('general','personal','specialized')),
  active          boolean default true,
  must_change_password boolean default false,
  language        text default 'en',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists profiles_gym_idx on profiles(gym_id);
create index if not exists profiles_role_idx on profiles(role);

do $$ begin
  alter table gyms
    add constraint gyms_owner_fk
    foreign key (owner_user_id) references profiles(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Plans (catalog) and subscriptions
-- ---------------------------------------------------------------------------
create table if not exists plans (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid references gyms(id) on delete cascade,
  kind            plan_kind not null,
  name            text not null,
  price_cents     integer not null default 0,
  duration_days   integer not null default 30,
  features        jsonb default '{}'::jsonb,
  active          boolean default true,
  created_at      timestamptz default now()
);

create table if not exists subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  plan_id         uuid not null references plans(id),
  start_date      date not null default current_date,
  end_date        date not null,
  discount_pct    integer default 0 check (discount_pct between 0 and 100),
  status          sub_status not null default 'active',
  razorpay_subscription_id text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists subs_client_idx on subscriptions(client_id);
create index if not exists subs_end_idx on subscriptions(end_date);

-- ---------------------------------------------------------------------------
-- Trainer ↔ Client assignments (with history)
-- ---------------------------------------------------------------------------
create table if not exists trainer_clients (
  id              uuid primary key default uuid_generate_v4(),
  trainer_id      uuid not null references profiles(id) on delete cascade,
  client_id       uuid not null references profiles(id) on delete cascade,
  assigned_at     timestamptz default now(),
  ended_at        timestamptz,
  is_active       boolean generated always as (ended_at is null) stored
);
create index if not exists tc_trainer_idx on trainer_clients(trainer_id) where ended_at is null;
create index if not exists tc_client_idx on trainer_clients(client_id) where ended_at is null;
create unique index if not exists tc_active_uq on trainer_clients(client_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- Client preferences
-- ---------------------------------------------------------------------------
create table if not exists client_preferences (
  client_id            uuid primary key references profiles(id) on delete cascade,
  exercise_types       text[] default array[]::text[],
  is_vegetarian        boolean default false,
  ai_diet_enabled      boolean default true,
  ai_workout_enabled   boolean default true,
  water_goal_glasses   integer default 8,
  dietary_restrictions text[],
  allergies            text[],
  updated_at           timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Daily plans + todo items + completions + cheat days
-- ---------------------------------------------------------------------------
create table if not exists daily_plans (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  trainer_id      uuid references profiles(id) on delete set null,
  plan_date       date not null,
  ai_generated    boolean default false,
  created_at      timestamptz default now(),
  unique (client_id, plan_date)
);

create table if not exists daily_plan_items (
  id              uuid primary key default uuid_generate_v4(),
  daily_plan_id   uuid not null references daily_plans(id) on delete cascade,
  kind            todo_kind not null,
  title           text not null,
  description     text,
  quantity        text,
  ai_reason       text,
  position        integer default 0,
  created_at      timestamptz default now()
);
create index if not exists dpi_plan_idx on daily_plan_items(daily_plan_id);

create table if not exists todo_completions (
  id              uuid primary key default uuid_generate_v4(),
  daily_plan_item_id uuid not null references daily_plan_items(id) on delete cascade,
  client_id       uuid not null references profiles(id) on delete cascade,
  status          todo_status not null,
  note            text,
  completed_at    timestamptz default now(),
  unique (daily_plan_item_id, client_id)
);

create table if not exists cheat_days (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  trainer_id      uuid references profiles(id) on delete set null,
  cheat_date      date not null,
  reason          text,
  created_at      timestamptz default now(),
  unique (client_id, cheat_date)
);

-- ---------------------------------------------------------------------------
-- BMI
-- ---------------------------------------------------------------------------
create table if not exists bmi_logs (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  height_cm       numeric not null,
  weight_kg       numeric not null,
  bmi             numeric generated always as (round((weight_kg / ((height_cm/100.0)*(height_cm/100.0)))::numeric, 2)) stored,
  logged_at       timestamptz default now()
);
create index if not exists bmi_client_idx on bmi_logs(client_id, logged_at desc);

-- ---------------------------------------------------------------------------
-- Health issues
-- ---------------------------------------------------------------------------
create table if not exists health_issues (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  problem         text not null,
  severity        severity not null default 'mild',
  ai_foods        jsonb,
  ai_exercises    jsonb,
  ai_tips         jsonb,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Injuries (affect workout filtering)
-- ---------------------------------------------------------------------------
create table if not exists injuries (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  tag             text not null,
  severity        severity not null default 'mild',
  notes           text,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);
create index if not exists injuries_client_idx on injuries(client_id) where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Trackers: water / sleep / junk food
-- ---------------------------------------------------------------------------
create table if not exists water_logs (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  log_date        date not null default current_date,
  glasses         integer not null default 0,
  updated_at      timestamptz default now(),
  unique (client_id, log_date)
);

create table if not exists sleep_logs (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  log_date        date not null default current_date,
  hours           numeric not null,
  notes           text,
  created_at      timestamptz default now(),
  unique (client_id, log_date)
);

create table if not exists junk_food_logs (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  log_date        date not null default current_date,
  item            text not null,
  quantity        text,
  created_at      timestamptz default now()
);
create index if not exists junk_client_idx on junk_food_logs(client_id, log_date);

-- ---------------------------------------------------------------------------
-- Progress photos
-- ---------------------------------------------------------------------------
create table if not exists progress_photos (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  kind            photo_kind not null,
  storage_path    text not null,
  notes           text,
  taken_at        timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Chat (people-to-people)
-- ---------------------------------------------------------------------------
create table if not exists chat_threads (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid references gyms(id) on delete cascade,
  kind            chat_thread_kind not null,
  participant_ids uuid[] not null,
  title           text,
  created_at      timestamptz default now()
);
create index if not exists chat_threads_participants_idx on chat_threads using gin (participant_ids);

create table if not exists chat_messages (
  id              uuid primary key default uuid_generate_v4(),
  thread_id       uuid not null references chat_threads(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null,
  deleted_at      timestamptz,
  created_at      timestamptz default now()
);
create index if not exists chat_messages_thread_idx on chat_messages(thread_id, created_at desc);

-- ---------------------------------------------------------------------------
-- AI Chat (sessions + messages)
-- ---------------------------------------------------------------------------
create table if not exists ai_chat_sessions (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  title           text default 'New chat',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists ai_sessions_client_idx on ai_chat_sessions(client_id, updated_at desc);

create table if not exists ai_chat_messages (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references ai_chat_sessions(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  created_at      timestamptz default now()
);

-- daily counter for basic-plan AI chat quota
create table if not exists ai_chat_daily_usage (
  client_id       uuid not null references profiles(id) on delete cascade,
  usage_date      date not null default current_date,
  count           integer not null default 0,
  primary key (client_id, usage_date)
);

-- ---------------------------------------------------------------------------
-- AI generated plans (diet / workout)
-- ---------------------------------------------------------------------------
create table if not exists ai_diet_plans (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  scope           text not null check (scope in ('day','week')),
  start_date      date not null,
  plan            jsonb not null,
  applied_to_todos boolean default false,
  created_at      timestamptz default now()
);
create index if not exists adp_client_idx on ai_diet_plans(client_id, start_date desc);

create table if not exists ai_workout_plans (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  scope           text not null check (scope in ('day','week')),
  start_date      date not null,
  plan            jsonb not null,
  applied_to_todos boolean default false,
  created_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Nutrition KB (FAISS replaced by pgvector if available; falls back to LIKE)
-- ---------------------------------------------------------------------------
create table if not exists nutrition_kb_docs (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  content         text not null,
  source          text,
  created_at      timestamptz default now()
);
-- Optional: add pgvector column when extension is enabled.
-- alter table nutrition_kb_docs add column embedding vector(768);

create table if not exists nutrition_kb_queries (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  query           text not null,
  results         jsonb,
  vector_live     boolean default false,
  created_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Grocery lists
-- ---------------------------------------------------------------------------
create table if not exists grocery_lists (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  title           text not null,
  date_from       date not null,
  date_to         date not null,
  items           jsonb not null,
  checked         jsonb default '[]'::jsonb,
  total_inr       numeric default 0,
  created_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid not null references gyms(id) on delete cascade,
  client_id       uuid not null references profiles(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  invoice_number  text not null,
  fiscal_year     text not null,
  amount_cents    integer not null,
  gst_cents       integer default 0,
  total_cents     integer not null,
  currency        text default 'INR',
  status          text default 'issued' check (status in ('issued','paid','cancelled','refunded')),
  pdf_path        text,
  razorpay_payment_id text,
  issued_at       timestamptz default now(),
  paid_at         timestamptz,
  unique (gym_id, invoice_number)
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists weekly_reports (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  week_start      date not null,
  adherence_pct   numeric default 0,
  total_points    integer default 0,
  ai_summary      text,
  pdf_path        text,
  created_at      timestamptz default now(),
  unique (client_id, week_start)
);

create table if not exists trainer_summaries (
  id              uuid primary key default uuid_generate_v4(),
  trainer_id      uuid not null references profiles(id) on delete cascade,
  week_start      date not null,
  body            text not null,
  created_at      timestamptz default now(),
  unique (trainer_id, week_start)
);

-- ---------------------------------------------------------------------------
-- Notifications + announcements + email log + push subs + trainer alerts
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id              uuid primary key default uuid_generate_v4(),
  recipient_id    uuid not null references profiles(id) on delete cascade,
  kind            notification_kind not null,
  title           text not null,
  body            text,
  link            text,
  read_at         timestamptz,
  scheduled_for   timestamptz,
  recurrence      text,
  sent_at         timestamptz default now(),
  created_at      timestamptz default now()
);
create index if not exists notifs_recipient_idx on notifications(recipient_id, read_at, created_at desc);
create index if not exists notifs_scheduled_idx on notifications(scheduled_for) where scheduled_for is not null and sent_at is null;

create table if not exists announcements (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid not null references gyms(id) on delete cascade,
  author_id       uuid references profiles(id) on delete set null,
  title           text not null,
  body            text not null,
  audience        jsonb default '{}'::jsonb,
  scheduled_for   timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz default now()
);

create table if not exists email_log (
  id              uuid primary key default uuid_generate_v4(),
  recipient_email text not null,
  subject         text not null,
  template        text,
  status          text default 'queued',
  provider_msg_id text,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  bounced_at      timestamptz,
  error           text,
  created_at      timestamptz default now()
);

create table if not exists push_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  endpoint        text not null,
  p256dh          text not null,
  auth            text not null,
  ua              text,
  created_at      timestamptz default now(),
  unique (user_id, endpoint)
);

create table if not exists trainer_alerts (
  id              uuid primary key default uuid_generate_v4(),
  trainer_id      uuid not null references profiles(id) on delete cascade,
  client_id       uuid not null references profiles(id) on delete cascade,
  kind            alert_kind not null,
  payload         jsonb,
  resolved_at     timestamptz,
  created_at      timestamptz default now()
);
create index if not exists alerts_trainer_idx on trainer_alerts(trainer_id, resolved_at, created_at desc);

-- ---------------------------------------------------------------------------
-- Gamification
-- ---------------------------------------------------------------------------
create table if not exists points_log (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  points          integer not null,
  reason          text not null,
  todo_completion_id uuid references todo_completions(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists points_client_idx on points_log(client_id, created_at desc);

create table if not exists streaks (
  client_id       uuid primary key references profiles(id) on delete cascade,
  current_streak  integer default 0,
  longest_streak  integer default 0,
  last_completion_date date,
  updated_at      timestamptz default now()
);

create table if not exists rewards (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references profiles(id) on delete cascade,
  milestone       integer not null,
  extension_days  integer not null,
  granted_at      timestamptz default now(),
  unique (client_id, milestone)
);

-- ---------------------------------------------------------------------------
-- Ratings (weekly mutual)
-- ---------------------------------------------------------------------------
create table if not exists ratings (
  id              uuid primary key default uuid_generate_v4(),
  week_start      date not null,
  rater_id        uuid not null references profiles(id) on delete cascade,
  ratee_id        uuid not null references profiles(id) on delete cascade,
  stars           integer not null check (stars between 1 and 5),
  comment         text,
  created_at      timestamptz default now(),
  unique (week_start, rater_id, ratee_id)
);

-- ---------------------------------------------------------------------------
-- Slogans (animated banner)
-- ---------------------------------------------------------------------------
create table if not exists slogans (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid references gyms(id) on delete cascade,
  text            text not null,
  source          text default 'default' check (source in ('default','ai','owner')),
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Festivals (force veg banner)
-- ---------------------------------------------------------------------------
create table if not exists festivals (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  festival_date   date not null,
  country_code    text default 'IN',
  is_veg_only     boolean default true,
  unique (festival_date, name)
);

-- ---------------------------------------------------------------------------
-- updated_at touchers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'gyms','profiles','subscriptions','client_preferences',
      'ai_chat_sessions','streaks'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%I_uat on %I;
       create trigger trg_%I_uat before update on %I
       for each row execute function set_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;

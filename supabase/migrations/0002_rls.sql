-- =============================================================================
-- FitCoachAI — Row Level Security
-- Every domain table is RLS-enabled. Helpers in 0003_functions.sql.
-- Pattern: row visible to owner of same gym, owner sees everything in their gym,
-- trainer sees their assigned clients, client sees own data.
-- =============================================================================

-- Helper: current user's profile fields ---------------------------------------
create or replace function current_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select auth.uid();
$$;

-- Note: we intentionally do NOT define a `current_role()` helper because
-- that name is a reserved Postgres keyword. is_owner() / is_trainer() below
-- already cover the role-check use cases.

create or replace function current_gym_id() returns uuid
language sql stable security definer set search_path = public as $$
  select gym_id from profiles where id = auth.uid();
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from profiles where id = auth.uid()), false);
$$;

create or replace function is_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'trainer' from profiles where id = auth.uid()), false);
$$;

create or replace function trainer_sees_client(p_client uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trainer_clients
    where client_id = p_client and trainer_id = auth.uid() and ended_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table gyms                  enable row level security;
alter table profiles              enable row level security;
alter table plans                 enable row level security;
alter table subscriptions         enable row level security;
alter table trainer_clients       enable row level security;
alter table client_preferences    enable row level security;
alter table daily_plans           enable row level security;
alter table daily_plan_items      enable row level security;
alter table todo_completions      enable row level security;
alter table cheat_days            enable row level security;
alter table bmi_logs              enable row level security;
alter table health_issues         enable row level security;
alter table injuries              enable row level security;
alter table water_logs            enable row level security;
alter table sleep_logs            enable row level security;
alter table junk_food_logs        enable row level security;
alter table progress_photos       enable row level security;
alter table chat_threads          enable row level security;
alter table chat_messages         enable row level security;
alter table ai_chat_sessions      enable row level security;
alter table ai_chat_messages      enable row level security;
alter table ai_chat_daily_usage   enable row level security;
alter table ai_diet_plans         enable row level security;
alter table ai_workout_plans      enable row level security;
alter table nutrition_kb_docs     enable row level security;
alter table nutrition_kb_queries  enable row level security;
alter table grocery_lists         enable row level security;
alter table invoices              enable row level security;
alter table weekly_reports        enable row level security;
alter table trainer_summaries     enable row level security;
alter table notifications         enable row level security;
alter table announcements         enable row level security;
alter table email_log             enable row level security;
alter table push_subscriptions    enable row level security;
alter table trainer_alerts        enable row level security;
alter table points_log            enable row level security;
alter table streaks               enable row level security;
alter table rewards               enable row level security;
alter table ratings               enable row level security;
alter table slogans               enable row level security;
alter table festivals             enable row level security;

-- ---------------------------------------------------------------------------
-- GYMS
-- ---------------------------------------------------------------------------
drop policy if exists gyms_select on gyms;
create policy gyms_select on gyms
  for select using (id = current_gym_id() or is_owner());
drop policy if exists gyms_owner_write on gyms;
create policy gyms_owner_write on gyms
  for update using (id = current_gym_id() and is_owner());
drop policy if exists gyms_insert_first on gyms;
create policy gyms_insert_first on gyms
  for insert with check (true);  -- guarded by app logic (only allow if no gym exists yet for this user)

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
  for select using (
    id = auth.uid()
    or (is_owner() and gym_id = current_gym_id())
    or (is_trainer() and gym_id = current_gym_id())
  );
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (id = auth.uid() or (is_owner() and gym_id = current_gym_id()));
drop policy if exists profiles_owner_insert on profiles;
create policy profiles_owner_insert on profiles
  for insert with check (
    -- self-created (signup trigger) or owner-created
    id = auth.uid() or is_owner()
  );

-- ---------------------------------------------------------------------------
-- PLANS, SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
drop policy if exists plans_gym_read on plans;
create policy plans_gym_read on plans for select using (gym_id = current_gym_id());
drop policy if exists plans_owner_write on plans;
create policy plans_owner_write on plans for all using (is_owner() and gym_id = current_gym_id()) with check (is_owner() and gym_id = current_gym_id());

drop policy if exists subs_self on subscriptions;
create policy subs_self on subscriptions for select using (
  client_id = auth.uid() or is_owner() or trainer_sees_client(client_id)
);
drop policy if exists subs_owner_write on subscriptions;
create policy subs_owner_write on subscriptions for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------------
-- TRAINER_CLIENTS
-- ---------------------------------------------------------------------------
drop policy if exists tc_read on trainer_clients;
create policy tc_read on trainer_clients for select using (
  trainer_id = auth.uid() or client_id = auth.uid() or is_owner()
);
drop policy if exists tc_owner_write on trainer_clients;
create policy tc_owner_write on trainer_clients for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------------
-- CLIENT_PREFERENCES
-- ---------------------------------------------------------------------------
drop policy if exists prefs_rw on client_preferences;
create policy prefs_rw on client_preferences for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner());

-- ---------------------------------------------------------------------------
-- DAILY PLANS + ITEMS + COMPLETIONS + CHEAT DAYS
-- ---------------------------------------------------------------------------
drop policy if exists dp_read on daily_plans;
create policy dp_read on daily_plans for select using (
  client_id = auth.uid() or trainer_id = auth.uid() or trainer_sees_client(client_id) or is_owner()
);
drop policy if exists dp_write on daily_plans;
create policy dp_write on daily_plans for all
  using (trainer_sees_client(client_id) or client_id = auth.uid() or is_owner())
  with check (trainer_sees_client(client_id) or client_id = auth.uid() or is_owner());

drop policy if exists dpi_rw on daily_plan_items;
create policy dpi_rw on daily_plan_items for all
  using (exists (
    select 1 from daily_plans dp
    where dp.id = daily_plan_id and (
      dp.client_id = auth.uid() or trainer_sees_client(dp.client_id) or is_owner()
    )
  ))
  with check (exists (
    select 1 from daily_plans dp
    where dp.id = daily_plan_id and (
      dp.client_id = auth.uid() or trainer_sees_client(dp.client_id) or is_owner()
    )
  ));

drop policy if exists tcomp_rw on todo_completions;
create policy tcomp_rw on todo_completions for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner());

drop policy if exists cheat_rw on cheat_days;
create policy cheat_rw on cheat_days for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (trainer_sees_client(client_id) or is_owner());

-- ---------------------------------------------------------------------------
-- TRACKERS (BMI, water, sleep, junk, injuries, health, photos)
-- ---------------------------------------------------------------------------
do $$
declare tbl text;
begin
  for tbl in select unnest(array[
    'bmi_logs','health_issues','injuries','water_logs','sleep_logs',
    'junk_food_logs','progress_photos'
  ])
  loop
    execute format('drop policy if exists %1$s_rw on %1$s;', tbl);
    execute format(
      'create policy %1$s_rw on %1$s for all
        using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
        with check (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner());',
      tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- CHAT
-- ---------------------------------------------------------------------------
drop policy if exists chat_threads_rw on chat_threads;
create policy chat_threads_rw on chat_threads for all
  using (auth.uid() = any(participant_ids) or is_owner())
  with check (auth.uid() = any(participant_ids) or is_owner());

drop policy if exists chat_messages_rw on chat_messages;
create policy chat_messages_rw on chat_messages for all
  using (exists (
    select 1 from chat_threads t
    where t.id = thread_id and (auth.uid() = any(t.participant_ids) or is_owner())
  ))
  with check (sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- AI CHAT
-- ---------------------------------------------------------------------------
drop policy if exists ai_sess_rw on ai_chat_sessions;
create policy ai_sess_rw on ai_chat_sessions for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists ai_msg_rw on ai_chat_messages;
create policy ai_msg_rw on ai_chat_messages for all
  using (exists (select 1 from ai_chat_sessions s where s.id = session_id and s.client_id = auth.uid()))
  with check (exists (select 1 from ai_chat_sessions s where s.id = session_id and s.client_id = auth.uid()));

drop policy if exists ai_usage_rw on ai_chat_daily_usage;
create policy ai_usage_rw on ai_chat_daily_usage for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- AI PLANS, KB, GROCERY
-- ---------------------------------------------------------------------------
do $$
declare tbl text;
begin
  for tbl in select unnest(array['ai_diet_plans','ai_workout_plans','nutrition_kb_queries','grocery_lists'])
  loop
    execute format('drop policy if exists %1$s_rw on %1$s;', tbl);
    execute format(
      'create policy %1$s_rw on %1$s for all
        using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
        with check (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner());',
      tbl
    );
  end loop;
end $$;

drop policy if exists kb_docs_read on nutrition_kb_docs;
create policy kb_docs_read on nutrition_kb_docs for select using (auth.uid() is not null);
drop policy if exists kb_docs_owner_write on nutrition_kb_docs;
create policy kb_docs_owner_write on nutrition_kb_docs for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------------
-- INVOICES + REPORTS
-- ---------------------------------------------------------------------------
drop policy if exists invoices_rw on invoices;
create policy invoices_rw on invoices for all
  using (client_id = auth.uid() or is_owner())
  with check (is_owner());

drop policy if exists reports_rw on weekly_reports;
create policy reports_rw on weekly_reports for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (trainer_sees_client(client_id) or is_owner());

drop policy if exists tsum_rw on trainer_summaries;
create policy tsum_rw on trainer_summaries for all
  using (trainer_id = auth.uid() or is_owner())
  with check (trainer_id = auth.uid() or is_owner());

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS / ANNOUNCEMENTS / EMAIL / PUSH / ALERTS
-- ---------------------------------------------------------------------------
drop policy if exists notifs_rw on notifications;
create policy notifs_rw on notifications for all
  using (recipient_id = auth.uid() or is_owner())
  with check (recipient_id = auth.uid() or is_owner() or is_trainer());

drop policy if exists ann_rw on announcements;
create policy ann_rw on announcements for all
  using (gym_id = current_gym_id())
  with check (is_owner() and gym_id = current_gym_id());

drop policy if exists email_log_read on email_log;
create policy email_log_read on email_log for select using (is_owner());

drop policy if exists push_rw on push_subscriptions;
create policy push_rw on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists alerts_rw on trainer_alerts;
create policy alerts_rw on trainer_alerts for all
  using (trainer_id = auth.uid() or is_owner())
  with check (trainer_id = auth.uid() or is_owner() or trainer_sees_client(client_id));

-- ---------------------------------------------------------------------------
-- GAMIFICATION + RATINGS
-- ---------------------------------------------------------------------------
drop policy if exists points_rw on points_log;
create policy points_rw on points_log for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (true);

drop policy if exists streaks_rw on streaks;
create policy streaks_rw on streaks for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (true);

drop policy if exists rewards_rw on rewards;
create policy rewards_rw on rewards for all
  using (client_id = auth.uid() or trainer_sees_client(client_id) or is_owner())
  with check (true);

drop policy if exists ratings_rw on ratings;
create policy ratings_rw on ratings for all
  using (rater_id = auth.uid() or ratee_id = auth.uid() or is_owner())
  with check (rater_id = auth.uid() or is_owner());

-- ---------------------------------------------------------------------------
-- SLOGANS, FESTIVALS
-- ---------------------------------------------------------------------------
drop policy if exists slogans_read on slogans;
create policy slogans_read on slogans for select using (gym_id is null or gym_id = current_gym_id());
drop policy if exists slogans_owner_write on slogans;
create policy slogans_owner_write on slogans for all using (is_owner()) with check (is_owner());

drop policy if exists festivals_read on festivals;
create policy festivals_read on festivals for select using (auth.uid() is not null);

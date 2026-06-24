-- =============================================================================
-- FitCoachAI — Triggers, computed helpers, signup hook
-- =============================================================================

-- ---------------------------------------------------------------------------
-- handle_new_user — creates profile + first-owner gym on signup.
-- The very first user becomes Owner of a freshly created gym. All other
-- users must be created via the Owner's /owner/users flow (which sets gym_id
-- and role explicitly via the service-role admin API).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing_owner uuid;
  v_gym_id uuid;
  v_role user_role;
  v_full_name text;
  v_gym_name text;
  v_meta_role text;
begin
  -- Use metadata if explicitly provided by service-role insert.
  v_meta_role := new.raw_user_meta_data->>'role';
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_gym_id    := nullif(new.raw_user_meta_data->>'gym_id','')::uuid;
  v_gym_name  := coalesce(new.raw_user_meta_data->>'gym_name', 'My Gym');

  if v_meta_role is not null then
    v_role := v_meta_role::user_role;
  else
    -- First-time signup gates: if no owner exists, this user becomes Owner.
    select id into v_existing_owner from profiles where role = 'owner' limit 1;
    if v_existing_owner is null then
      v_role := 'owner';
    else
      v_role := 'client';
    end if;
  end if;

  -- IMPORTANT ORDERING: profile must exist BEFORE we set gyms.owner_user_id,
  -- because gyms.owner_user_id has a FK -> profiles.id.
  -- So: 1) insert profile with NULL gym_id, 2) insert gym pointing at the
  -- profile, 3) update profile.gym_id.

  insert into profiles (id, gym_id, role, full_name, email)
  values (new.id, v_gym_id, v_role, v_full_name, new.email);

  -- Owner with no gym yet → create gym now that the profile row exists.
  if v_role = 'owner' and v_gym_id is null then
    insert into gyms (name, slug, owner_user_id)
    values (v_gym_name, lower(regexp_replace(v_gym_name, '[^a-zA-Z0-9]+', '-', 'g')), new.id)
    returning id into v_gym_id;

    update profiles set gym_id = v_gym_id where id = new.id;

    -- Seed default Basic + Pro plans for this gym.
    insert into plans (gym_id, kind, name, price_cents, duration_days)
    values
      (v_gym_id, 'basic', 'Basic', 99900, 30),
      (v_gym_id, 'pro',   'Pro',   199900, 30)
    on conflict do nothing;
  end if;

  return new;
exception when others then
  -- Surface the real error to Postgres logs (visible in Supabase Logs)
  -- so future bugs are easier to diagnose than "Database error saving new user".
  raise warning 'handle_new_user failed for %: % / %', new.email, sqlstate, sqlerrm;
  raise;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- award_points_on_todo — runs when a todo completion lands.
-- Completed = 10 pts, Partial = 4 pts, Skipped = 0.
-- ---------------------------------------------------------------------------
create or replace function public.award_points_on_todo()
returns trigger language plpgsql as $$
declare v_pts integer;
begin
  if new.status = 'completed' then v_pts := 10;
  elsif new.status = 'partial' then v_pts := 4;
  else v_pts := 0;
  end if;
  if v_pts > 0 then
    insert into points_log(client_id, points, reason, todo_completion_id)
    values (new.client_id, v_pts, new.status::text, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_award_points on todo_completions;
create trigger trg_award_points
after insert on todo_completions
for each row execute function public.award_points_on_todo();

-- ---------------------------------------------------------------------------
-- recompute_streak — call from server after todo completion. Returns new streak.
-- A "completed day" = at least one completed item on that date.
-- 7/30/90-day milestones trigger automatic subscription extensions.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_streak(p_client uuid)
returns table(current_streak int, longest_streak int, milestone_hit int)
language plpgsql security definer set search_path = public as $$
declare
  v_today date := current_date;
  v_streak int := 0;
  v_check date := v_today;
  v_has boolean;
  v_longest int;
  v_milestone int := 0;
  v_extension int;
begin
  -- Walk backwards from today as long as the client had a completed item.
  loop
    select exists(
      select 1 from todo_completions tc
      where tc.client_id = p_client
        and tc.status = 'completed'
        and tc.completed_at::date = v_check
    ) into v_has;
    if not v_has then exit; end if;
    v_streak := v_streak + 1;
    v_check := v_check - 1;
  end loop;

  insert into streaks(client_id, current_streak, longest_streak, last_completion_date)
  values (p_client, v_streak, v_streak, case when v_streak > 0 then v_today else null end)
  on conflict (client_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = greatest(streaks.longest_streak, excluded.current_streak),
        last_completion_date = excluded.last_completion_date,
        updated_at = now();

  -- Milestone rewards
  if v_streak in (7, 30, 90) then
    v_milestone := v_streak;
    v_extension := case v_streak when 7 then 2 when 30 then 7 when 90 then 14 end;
    insert into rewards(client_id, milestone, extension_days)
    values (p_client, v_streak, v_extension)
    on conflict (client_id, milestone) do nothing;

    -- Extend active subscription
    update subscriptions
      set end_date = end_date + v_extension
      where client_id = p_client and status = 'active';
  end if;

  select longest_streak into v_longest from streaks where client_id = p_client;
  return query select v_streak, v_longest, v_milestone;
end;
$$;

-- ---------------------------------------------------------------------------
-- next_invoice_number — sequential per gym + fiscal year
-- ---------------------------------------------------------------------------
create or replace function public.next_invoice_number(p_gym uuid)
returns table(invoice_number text, fiscal_year text)
language plpgsql security definer set search_path = public as $$
declare
  v_fy text;
  v_count int;
  v_year int := extract(year from now())::int;
  v_month int := extract(month from now())::int;
begin
  -- Indian fiscal year: Apr-Mar. Adjust if needed.
  if v_month >= 4 then
    v_fy := v_year::text || '-' || lpad(((v_year+1) % 100)::text, 2, '0');
  else
    v_fy := (v_year-1)::text || '-' || lpad((v_year % 100)::text, 2, '0');
  end if;
  select count(*) into v_count from invoices where gym_id = p_gym and fiscal_year = v_fy;
  return query select format('INV-%s-%s', v_fy, lpad((v_count + 1)::text, 5, '0')), v_fy;
end;
$$;

-- ---------------------------------------------------------------------------
-- adherence_pct — completed/total over a date range
-- ---------------------------------------------------------------------------
create or replace function public.adherence_pct(p_client uuid, p_from date, p_to date)
returns numeric language sql stable as $$
  select case when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where tc.status = 'completed') / count(*), 1)
  end
  from daily_plan_items dpi
  join daily_plans dp on dp.id = dpi.daily_plan_id
  left join todo_completions tc on tc.daily_plan_item_id = dpi.id and tc.client_id = p_client
  where dp.client_id = p_client and dp.plan_date between p_from and p_to;
$$;

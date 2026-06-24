-- =============================================================================
-- FitCoachAI — Group classes, bookings, and an owner audit log.
-- Safe to re-run.
-- =============================================================================

do $$ begin
  create type class_status as enum ('scheduled','live','done','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('confirmed','waitlist','cancelled','attended','no_show');
exception when duplicate_object then null; end $$;

-- Group classes (Zumba slot, HIIT slot, Yoga slot, etc.)
create table if not exists gym_classes (
  id            uuid primary key default uuid_generate_v4(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  trainer_id    uuid references profiles(id) on delete set null,
  title         text not null,
  category      text default 'general',
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  capacity      integer not null default 12 check (capacity > 0),
  status        class_status not null default 'scheduled',
  notes         text,
  created_at    timestamptz default now()
);
create index if not exists gym_classes_when_idx on gym_classes(gym_id, start_at);

create table if not exists class_bookings (
  id            uuid primary key default uuid_generate_v4(),
  class_id      uuid not null references gym_classes(id) on delete cascade,
  client_id     uuid not null references profiles(id) on delete cascade,
  status        booking_status not null default 'confirmed',
  created_at    timestamptz default now(),
  unique (class_id, client_id)
);
create index if not exists class_bookings_class_idx on class_bookings(class_id, status);

-- Audit log — owner sees every privileged action.
create table if not exists audit_log (
  id            uuid primary key default uuid_generate_v4(),
  gym_id        uuid references gyms(id) on delete set null,
  actor_id      uuid references profiles(id) on delete set null,
  action        text not null,
  target_kind   text,
  target_id     uuid,
  payload       jsonb,
  created_at    timestamptz default now()
);
create index if not exists audit_log_gym_idx on audit_log(gym_id, created_at desc);

-- RLS
alter table gym_classes     enable row level security;
alter table class_bookings  enable row level security;
alter table audit_log       enable row level security;

drop policy if exists classes_gym_read on gym_classes;
create policy classes_gym_read on gym_classes
  for select using (gym_id = current_gym_id());

drop policy if exists classes_owner_write on gym_classes;
create policy classes_owner_write on gym_classes
  for all using (is_owner() and gym_id = current_gym_id())
  with check (is_owner() and gym_id = current_gym_id());

drop policy if exists bookings_rw on class_bookings;
create policy bookings_rw on class_bookings
  for all using (
    client_id = auth.uid()
    or is_owner()
    or exists (select 1 from gym_classes c where c.id = class_id and c.trainer_id = auth.uid())
  )
  with check (
    client_id = auth.uid()
    or is_owner()
    or exists (select 1 from gym_classes c where c.id = class_id and c.trainer_id = auth.uid())
  );

drop policy if exists audit_log_read on audit_log;
create policy audit_log_read on audit_log
  for select using (is_owner() and gym_id = current_gym_id());
drop policy if exists audit_log_insert on audit_log;
create policy audit_log_insert on audit_log
  for insert with check (
    (gym_id is null or gym_id = current_gym_id())
    and (actor_id is null or actor_id = auth.uid())
  );

-- =============================================================================
-- FitCoachAI — Lead pipeline
--   A simple CRM: walk-ins and inbound leads move through stages until they
--   become paying clients (or are marked lost).
-- =============================================================================

do $$ begin
  create type lead_stage as enum ('new', 'trial', 'paid', 'lost');
exception when duplicate_object then null; end $$;

create table if not exists leads (
  id            uuid primary key default uuid_generate_v4(),
  gym_id        uuid not null references gyms(id) on delete cascade,
  full_name     text not null,
  email         text,
  phone         text,
  source        text default 'walkin',
  notes         text,
  stage         lead_stage not null default 'new',
  -- When the lead becomes a client we link the profile so the trainer sees
  -- their full journey.
  converted_client_id uuid references profiles(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists leads_gym_stage_idx on leads(gym_id, stage, updated_at desc);

alter table leads enable row level security;

drop policy if exists leads_owner_rw on leads;
create policy leads_owner_rw on leads
  for all using (is_owner() and gym_id = current_gym_id())
  with check (is_owner() and gym_id = current_gym_id());

drop trigger if exists trg_leads_uat on leads;
create trigger trg_leads_uat before update on leads
  for each row execute function set_updated_at();

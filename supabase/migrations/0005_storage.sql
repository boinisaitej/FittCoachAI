-- =============================================================================
-- FitCoachAI — Storage buckets + policies
-- Run in Supabase SQL editor OR via supabase db push.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('progress-photos', 'progress-photos', false),
  ('invoices', 'invoices', false),
  ('reports', 'reports', false),
  ('gym-logos', 'gym-logos', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Public read on avatars + logos
-- ---------------------------------------------------------------------------
do $$ begin
  drop policy if exists "Public avatar read" on storage.objects;
  create policy "Public avatar read" on storage.objects
    for select using (bucket_id in ('avatars','gym-logos'));
exception when others then null; end $$;

-- Authenticated upload of own avatar
do $$ begin
  drop policy if exists "User avatar upload" on storage.objects;
  create policy "User avatar upload" on storage.objects
    for insert with check (
      bucket_id = 'avatars' and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when others then null; end $$;

-- Progress photos — client uploads to /<user-id>/...
do $$ begin
  drop policy if exists "Photos: owner-only read" on storage.objects;
  create policy "Photos: owner-only read" on storage.objects
    for select using (
      bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
  drop policy if exists "Photos: client upload" on storage.objects;
  create policy "Photos: client upload" on storage.objects
    for insert with check (
      bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when others then null; end $$;

-- Invoices + reports: clients read their own, owners read their gym's
do $$ begin
  drop policy if exists "Invoice read self" on storage.objects;
  create policy "Invoice read self" on storage.objects
    for select using (
      bucket_id in ('invoices','reports')
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception when others then null; end $$;

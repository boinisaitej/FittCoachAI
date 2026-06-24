-- =============================================================================
-- FitCoachAI — Chat realtime + auto-notification
--   1. Enable Realtime publication on chat_messages + notifications so the
--      browser receives INSERT events without polling/refresh.
--   2. Trigger: when someone sends a message, drop an in-app notification
--      for every other participant in the thread.
-- Safe to re-run.
-- =============================================================================

-- 1. Realtime publication ------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table chat_messages;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; when others then null; end $$;

-- 2. Notify trigger ------------------------------------------------------------
create or replace function public.notify_on_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_other_ids uuid[];
  v_sender_name text;
  v_thread_kind text;
  v_role text;
  v_link_path text;
  v_preview text;
begin
  -- Lookup thread participants and the sender's display name.
  select participant_ids, kind into v_other_ids, v_thread_kind
  from chat_threads where id = new.thread_id;
  v_other_ids := array(select unnest(v_other_ids) except select new.sender_id);
  if v_other_ids is null or array_length(v_other_ids, 1) is null then
    return new;
  end if;

  select coalesce(full_name, split_part(coalesce(email,'someone'),'@',1))
    into v_sender_name from profiles where id = new.sender_id;

  v_preview := left(coalesce(new.body,''), 140);

  -- Insert one notification per recipient, link points to their role's chat page.
  insert into notifications (recipient_id, kind, title, body, link)
  select
    rid,
    'message'::notification_kind,
    coalesce(v_sender_name,'New message') || ' sent you a message',
    v_preview,
    '/' || coalesce(p.role::text, 'client') || '/chat?thread=' || new.thread_id::text
  from unnest(v_other_ids) as rid
  join profiles p on p.id = rid;

  return new;
exception when others then
  raise warning 'notify_on_chat_message failed: % / %', sqlstate, sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_chat_notify on chat_messages;
create trigger trg_chat_notify
after insert on chat_messages
for each row execute function public.notify_on_chat_message();

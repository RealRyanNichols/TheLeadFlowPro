-- PostgREST upsert needs a full unique constraint. PostgreSQL still permits
-- multiple NULL external IDs, so draft outbound messages remain unaffected.
drop index if exists public.content_messages_platform_external_unique;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_messages_thread_external_unique'
      and conrelid = 'public.content_messages'::regclass
  ) then
    alter table public.content_messages
      add constraint content_messages_thread_external_unique
      unique (thread_id, external_message_id);
  end if;
end;
$$;

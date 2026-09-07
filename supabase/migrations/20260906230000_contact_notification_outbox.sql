-- Save the contact alert in the same transaction as its message. Old messages
-- are not backfilled: this must not unexpectedly email historical inquiries.
-- Rollback after reverting application: drop trigger, function, then table.
begin;
create table public.contact_notifications (
  message_id uuid primary key references public.messages(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and pg_column_size(snapshot) <= 32768),
  email_payload jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 7),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  check (email_payload is null or (jsonb_typeof(email_payload) = 'object' and pg_column_size(email_payload) <= 32768)),
  check (last_error is null or char_length(last_error) <= 300),
  check (provider_message_id is null or char_length(provider_message_id) <= 200),
  check ((status = 'sent' and sent_at is not null and provider_message_id is not null and last_error is null)
    or (status <> 'sent' and sent_at is null and provider_message_id is null))
);
create index contact_notifications_pending on public.contact_notifications(next_attempt_at) where status = 'pending';
alter table public.contact_notifications enable row level security;
revoke all on public.contact_notifications from public, anon, authenticated;
grant select on public.contact_notifications to authenticated;
grant all on public.contact_notifications to service_role;
create policy "contact alerts staff read" on public.contact_notifications for select to authenticated
  using ((select public.is_admin()) or (select public.can_access_sales_pipeline()));

create function public.enqueue_contact_notification() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.sender = 'visitor' and new.thread_profile_id is null and coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), ''
  ) = 'service_role' then
    insert into public.contact_notifications(message_id, snapshot) values (new.id,
      jsonb_build_object('visitor_name', new.visitor_name, 'visitor_email', new.visitor_email, 'body', new.body));
  end if;
  return new;
end; $$;
revoke all on function public.enqueue_contact_notification() from public, anon, authenticated;
grant execute on function public.enqueue_contact_notification() to service_role;
create trigger contact_notification_after_insert after insert on public.messages
for each row execute function public.enqueue_contact_notification();
comment on table public.contact_notifications is 'Private durable contact-owner alerts; sent means accepted by the email provider, not confirmed inbox delivery.';
commit;

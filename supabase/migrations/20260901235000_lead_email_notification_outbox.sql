-- Durable owner-alert and applicant-welcome emails for lead-intake API inserts.
--
-- The trigger is the transactional boundary: if the lead commits, its email
-- jobs commit in the same transaction. Existing leads are deliberately not
-- backfilled because replaying an "immediate" welcome to an old lead would be
-- a duplicate contact, not recovery.

begin;

create table if not exists public.lead_email_notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  notification_type text not null check (
    notification_type = any (array['owner_alert'::text, 'lead_welcome'::text])
  ),
  lead_snapshot jsonb not null check (
    jsonb_typeof(lead_snapshot) = 'object'
    and pg_column_size(lead_snapshot) <= 32768
  ),
  status text not null default 'pending' check (
    status = any (array['pending'::text, 'sent'::text, 'failed'::text])
  ),
  attempt_count integer not null default 0 check (
    attempt_count >= 0 and attempt_count <= 20
  ),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text check (
    provider_message_id is null or char_length(provider_message_id) <= 200
  ),
  last_error text check (
    last_error is null or char_length(last_error) <= 1000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, notification_type),
  constraint lead_email_notifications_state_check check (
    (
      status = 'pending'
      and sent_at is null
      and provider_message_id is null
    )
    or (
      status = 'sent'
      and sent_at is not null
      and last_error is null
    )
    or (
      status = 'failed'
      and sent_at is null
      and provider_message_id is null
      and last_error is not null
    )
  ),
  constraint lead_email_notifications_timestamp_check check (
    updated_at >= created_at
    and next_attempt_at >= created_at
    and (last_attempt_at is null or last_attempt_at >= created_at)
    and (sent_at is null or sent_at >= created_at)
  )
);

comment on table public.lead_email_notifications is
  'Transactional outbox for the immediate new-lead owner alert and applicant welcome email.';
comment on column public.lead_email_notifications.next_attempt_at is
  'Retry schedule and short claim lease. attempt_count compare-and-swap prevents concurrent delivery.';
comment on column public.lead_email_notifications.lead_snapshot is
  'Immutable minimum lead fields used to keep retries idempotent even if the CRM lead is edited.';

create index if not exists lead_email_notifications_retry_idx
  on public.lead_email_notifications (next_attempt_at, created_at)
  where status = 'pending';
create index if not exists lead_email_notifications_lead_idx
  on public.lead_email_notifications (lead_id, created_at desc);

alter table public.lead_email_notifications enable row level security;

revoke all on table public.lead_email_notifications from public, anon, authenticated;
grant select on table public.lead_email_notifications to authenticated;
grant select, insert, update, delete, references
  on table public.lead_email_notifications to service_role;

drop policy if exists "lead email notifications staff read"
  on public.lead_email_notifications;
create policy "lead email notifications staff read"
  on public.lead_email_notifications
  for select to authenticated
  using (
    (select public.is_admin())
    or (select public.can_access_sales_pipeline())
  );

create or replace function public.enqueue_lead_email_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lead_snapshot jsonb;
begin
  -- This is a server-owned delivery pipeline. Public clients may submit leads
  -- through the application API, but a direct anon/authenticated database
  -- insert must never be able to enqueue arbitrary outbound email.
  if coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  ) <> 'service_role' then
    return new;
  end if;

  -- Only the public website intake and the verified Meta intake stamp this
  -- server-controlled marker. Other workflows also create CRM leads and own
  -- their specialized transactional messages; do not duplicate those here.
  if coalesce(new.diagnostic ->> 'notification_pipeline', '') <> 'lead_intake_v1' then
    return new;
  end if;

  lead_snapshot := jsonb_build_object(
    'full_name', new.full_name,
    'email', new.email,
    'phone', new.phone,
    'business_name', new.business_name,
    'interest', new.interest,
    'goals', new.goals,
    'current_platform', new.current_platform,
    'timeline', new.timeline,
    'source', new.source,
    'sms_consent', new.sms_consent,
    'funnel', new.diagnostic ->> 'source'
  );

  insert into public.lead_email_notifications (lead_id, notification_type, lead_snapshot)
  values (new.id, 'owner_alert', lead_snapshot)
  on conflict (lead_id, notification_type) do nothing;

  -- Meta sentinel addresses and genuinely missing addresses must never be
  -- sent to. The owner still receives an alert for those leads.
  if char_length(btrim(new.email)) between 3 and 200
     and position('@' in new.email) > 1
     and position('@no-email.' in lower(new.email)) = 0 then
    insert into public.lead_email_notifications (lead_id, notification_type, lead_snapshot)
    values (new.id, 'lead_welcome', lead_snapshot)
    on conflict (lead_id, notification_type) do nothing;
  end if;

  return new;
end;
$$;

comment on function public.enqueue_lead_email_notifications() is
  'Queues idempotent owner-alert and welcome-email jobs in the lead insert transaction.';

revoke all on function public.enqueue_lead_email_notifications()
  from public, anon, authenticated;
grant execute on function public.enqueue_lead_email_notifications()
  to service_role;

drop trigger if exists lead_email_notifications_enqueue_after_insert
  on public.leads;
create trigger lead_email_notifications_enqueue_after_insert
  after insert on public.leads
  for each row execute function public.enqueue_lead_email_notifications();

commit;

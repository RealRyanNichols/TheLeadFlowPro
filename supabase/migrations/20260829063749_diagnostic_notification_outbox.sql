-- Durable internal alerts for Business Growth Diagnostic saves and submits.
--
-- The public browser never reads or writes this table. The server creates one
-- idempotent outbox row per diagnostic event, attempts delivery immediately,
-- and a protected Vercel Cron retries transient failures. Admin and sales
-- users may read delivery state from the CRM, but only service_role may write.

create table if not exists public.diagnostic_notifications (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references public.business_growth_diagnostics(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null check (
    event_type = any (array['draft_saved'::text, 'submitted'::text])
  ),
  status text not null default 'pending' check (
    status = any (array['pending'::text, 'sent'::text, 'failed'::text])
  ),
  payload jsonb not null default '{}'::jsonb check (
    jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384
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
  unique (diagnostic_id, event_type),
  constraint diagnostic_notifications_state_check check (
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
  constraint diagnostic_notifications_timestamp_check check (
    updated_at >= created_at
    and next_attempt_at >= created_at
    and (last_attempt_at is null or last_attempt_at >= created_at)
    and (sent_at is null or sent_at >= created_at)
  )
);

comment on table public.diagnostic_notifications is
  'Server-only transactional outbox for internal Business Growth Diagnostic alerts.';
comment on column public.diagnostic_notifications.payload is
  'Bounded snapshot used to retry the same internal alert without relying on mutable lead fields.';
comment on column public.diagnostic_notifications.next_attempt_at is
  'Retry schedule and short claim lease. Optimistic attempt_count updates prevent concurrent sends.';

create index if not exists diagnostic_notifications_retry_idx
  on public.diagnostic_notifications (next_attempt_at, created_at)
  where status = 'pending';
create index if not exists diagnostic_notifications_lead_idx
  on public.diagnostic_notifications (lead_id, created_at desc);

alter table public.diagnostic_notifications enable row level security;

revoke all on table public.diagnostic_notifications from public, anon, authenticated;
grant select on table public.diagnostic_notifications to authenticated;
grant select, insert, update, delete, references
  on table public.diagnostic_notifications to service_role;

drop policy if exists "diagnostic notifications admin read"
  on public.diagnostic_notifications;
create policy "diagnostic notifications admin read"
  on public.diagnostic_notifications
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "diagnostic notifications sales read"
  on public.diagnostic_notifications;
create policy "diagnostic notifications sales read"
  on public.diagnostic_notifications
  for select to authenticated
  using ((select public.can_access_sales_pipeline()));

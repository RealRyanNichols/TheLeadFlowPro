-- Give the 30-day nurture sender a durable state between its initial Resend
-- request and any retry. Existing lead_emails rows are completed history and
-- therefore backfill to sent. Other email flows keep that default unchanged.
alter table public.lead_emails
  add column if not exists delivery_status text not null default 'sent',
  add column if not exists first_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists provider_message_id text,
  add column if not exists last_error text;

alter table public.lead_emails
  drop constraint if exists lead_emails_delivery_status_check;

alter table public.lead_emails
  add constraint lead_emails_delivery_status_check
  check (delivery_status in ('pending', 'sent', 'failed'));

alter table public.lead_emails
  drop constraint if exists lead_emails_attempt_count_check;

alter table public.lead_emails
  add constraint lead_emails_attempt_count_check
  check (attempt_count >= 0);

create index if not exists lead_emails_pending_delivery_idx
  on public.lead_emails (delivery_status, first_attempt_at)
  where delivery_status = 'pending';

comment on column public.lead_emails.delivery_status is
  'Provider delivery state. The 30-day nurture sender retains pending claims while retrying with one Resend idempotency key.';

comment on column public.lead_emails.first_attempt_at is
  'Start of the provider idempotency window. Automated nurture retries stop before 24 hours.';

comment on column public.lead_emails.provider_message_id is
  'Resend message id returned after an accepted nurture delivery.';

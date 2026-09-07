-- Durable per-message acceptance, without storing recipient/contact/body.
-- Rollback: deploy code without deliverPaymentEmail first, then drop this table.
create table if not exists public.payment_email_deliveries (
  delivery_key text primary key,
  stripe_session_id text not null,
  purpose text not null,
  payload_hash text not null,
  first_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_message_id text
);
alter table public.payment_email_deliveries enable row level security;
revoke all on public.payment_email_deliveries from public, anon, authenticated;
grant select, insert, update on public.payment_email_deliveries to service_role;
comment on table public.payment_email_deliveries is 'Server-only durable receipt acceptance ledger. Uncertain deliveries older than 23 hours require review.';

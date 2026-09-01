-- Idempotency marker for the paid-seat confirmation email, written only after
-- the mail provider accepts the message so a failure keeps the Stripe event
-- retryable.
alter table public.event_registrations
  add column if not exists confirmation_sent_at timestamptz;

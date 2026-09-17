-- Company OS stack: sequences module. Enrollments and sends. A send row
-- carries a unique dedupe key, which is what makes a retried scheduler
-- run safe: the second insert fails and nothing goes out twice.

create table if not exists public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  sequence_id text not null,
  enrolled_at timestamptz not null default now(),
  next_step integer not null default 0 check (next_step >= 0),
  ended_at timestamptz,
  ended_reason text,
  replied_at timestamptz,
  unique (person_id, sequence_id, enrolled_at)
);
create index if not exists sequence_enrollments_open_idx on public.sequence_enrollments (sequence_id) where ended_at is null;

create table if not exists public.sequence_sends (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.sequence_enrollments(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  step integer not null,
  channel text not null check (channel in ('sms', 'email')),
  template_id text not null,
  dedupe_key text not null unique,
  send_at timestamptz not null,
  sent_at timestamptz,
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists sequence_sends_due_idx on public.sequence_sends (send_at) where sent_at is null and error is null;

alter table public.sequence_enrollments enable row level security;
alter table public.sequence_sends enable row level security;
revoke all on table public.sequence_enrollments, public.sequence_sends from anon, authenticated;
-- Members do not see the scheduler. The owner sees it through the app (service role).

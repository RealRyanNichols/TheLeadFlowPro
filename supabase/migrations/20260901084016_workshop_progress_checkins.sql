-- Paid-attendee progress loop. Check-ins are written only through a Next.js
-- route that re-verifies the paid Stripe session and registration. No public
-- or authenticated Data API role can read or write this table directly.

create table if not exists public.workshop_progress_checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.workshop_events(id) on delete cascade,
  registration_id uuid not null references public.workshop_registrations(id) on delete cascade,
  checkin_type text not null default 'seven_day'
    check (checkin_type in ('before_class', 'seven_day', 'thirty_day')),
  progress_summary text,
  blocked_by text,
  next_action text,
  implementation_help_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, checkin_type),
  check (progress_summary is null or char_length(progress_summary) <= 2000),
  check (blocked_by is null or char_length(blocked_by) <= 2000),
  check (next_action is null or char_length(next_action) <= 1000)
);

create index if not exists workshop_progress_checkins_event_created_idx
  on public.workshop_progress_checkins (event_id, created_at desc);

alter table public.workshop_progress_checkins enable row level security;

revoke all on table public.workshop_progress_checkins from public, anon, authenticated;
grant select, insert, update on table public.workshop_progress_checkins to service_role;

comment on table public.workshop_progress_checkins is
  'Service-managed attendee progress reports tied to a verified paid workshop registration.';

-- Company OS stack: core schema. Applied to the CLIENT's own Supabase
-- project. One person is one row; every other table hangs off people.id.
-- RLS is on everywhere. The app talks through the service role; the portal
-- reads through a signed-in member scoped to their own person row.

create extension if not exists pgcrypto;

create or replace function public.stack_touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function public.stack_touch_updated_at() from public, anon, authenticated;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text,
  email text,
  status text not null default 'lead'
    check (status in ('lead', 'customer', 'member', 'past', 'do_not_contact')),
  first_source text not null default 'manual',
  consent_sms boolean not null default false,
  consent_email boolean not null default false,
  stopped_at timestamptz,
  tags text[] not null default '{}',
  -- The portal login for this person, when they have one.
  auth_user_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create unique index if not exists people_phone_idx on public.people (phone) where phone is not null;
create unique index if not exists people_email_idx on public.people (lower(email)) where email is not null;
create index if not exists people_status_idx on public.people (status);
drop trigger if exists people_touch on public.people;
create trigger people_touch before update on public.people for each row execute function public.stack_touch_updated_at();

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email', 'call', 'note', 'form', 'system')),
  direction text not null check (direction in ('in', 'out', 'internal')),
  body text not null default '',
  actor text not null default 'system',
  -- Idempotency for anything automated: a key can be recorded once.
  dedupe_key text unique,
  provider_id text,
  created_at timestamptz not null default now()
);
create index if not exists interactions_person_idx on public.interactions (person_id, created_at desc);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  granted boolean not null,
  source text not null,
  evidence text,
  created_at timestamptz not null default now()
);
create index if not exists consents_person_idx on public.consents (person_id, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  person_id uuid references public.people(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.interactions enable row level security;
alter table public.consents enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.people, public.interactions, public.consents, public.audit_events from anon, authenticated;

-- A signed-in member reads their own person row and their own history. Nothing else.
grant select (id, name, phone, email, status, consent_sms, consent_email, created_at) on public.people to authenticated;
grant select on public.interactions, public.consents to authenticated;

drop policy if exists "people self read" on public.people;
create policy "people self read" on public.people
  for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists "interactions self read" on public.interactions;
create policy "interactions self read" on public.interactions
  for select to authenticated using (person_id in (select id from public.people where auth_user_id = (select auth.uid())));

drop policy if exists "consents self read" on public.consents;
create policy "consents self read" on public.consents
  for select to authenticated using (person_id in (select id from public.people where auth_user_id = (select auth.uid())));

-- Company OS stack: payments module. A ledger of what the client's own
-- Stripe account reported, plus the wall of applied event ids. No card
-- data is ever stored; provider ids only.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete set null,
  provider text not null default 'stripe',
  provider_id text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null check (status in ('pending', 'paid', 'refunded', 'failed')),
  description text not null default '',
  last_event_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_id)
);
create index if not exists payments_person_idx on public.payments (person_id, updated_at desc);
drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments for each row execute function public.stack_touch_updated_at();

create table if not exists public.payment_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
revoke all on table public.payments, public.payment_events from anon, authenticated;
grant select (id, person_id, amount_cents, currency, status, description, updated_at) on public.payments to authenticated;

drop policy if exists "payments self read" on public.payments;
create policy "payments self read" on public.payments
  for select to authenticated using (person_id in (select id from public.people where auth_user_id = (select auth.uid())));

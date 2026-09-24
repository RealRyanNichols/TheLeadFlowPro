-- Chase Sheet: the open-quote follow-up engine sold at /chase-sheet.
--
-- Three tables, all multi-tenant by the buyer's email. Nothing here touches
-- the existing lead pipeline or the HQ plugin tables.
--
-- Access model: service role only. The browser never reads or writes these
-- tables; every request goes through /api/chase-sheet/*, which verifies a
-- signed identity cookie (or a signed-in account with the same email) and
-- then filters by account_email in code. Row level security is enabled with
-- no policies as the backstop, and every privilege is revoked from anon and
-- authenticated so a stray publishable-key query returns nothing.
--
-- Rollback:
--   drop table if exists public.chase_sheet_touches;
--   drop table if exists public.chase_sheet_quotes;
--   drop table if exists public.chase_sheet_accounts;
--   drop function if exists public.chase_sheet_touch_updated_at();

create table if not exists public.chase_sheet_accounts (
  email text primary key,
  plan text not null check (plan in ('monthly', 'lifetime')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  -- The checkout session that created or last upgraded the account.
  stripe_session_id text,
  current_period_end timestamptz,
  cancel_at timestamptz,
  -- Stripe delivers out of order and retries; only a newer event may win.
  stripe_event_at bigint not null default 0,
  -- business, owner, phone, tradeId, tone, window, timezone (lib/chaseSheet/types.ts).
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chase_sheet_accounts_customer_idx on public.chase_sheet_accounts (stripe_customer_id);

create table if not exists public.chase_sheet_quotes (
  id uuid primary key default gen_random_uuid(),
  account_email text not null references public.chase_sheet_accounts(email) on delete cascade,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  job text not null default '',
  amount_cents integer not null default 0 check (amount_cents >= 0),
  sent_on date not null,
  urgency text not null default 'planned' check (urgency in ('urgent', 'soon', 'planned')),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'archived')),
  done integer not null default 0 check (done between 0 and 20),
  next_on date,
  last_touch_on date,
  notes text not null default '',
  won_on date,
  lost_on date,
  lost_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chase_sheet_quotes_sheet_idx on public.chase_sheet_quotes (account_email, status, next_on);
create index if not exists chase_sheet_quotes_created_idx on public.chase_sheet_quotes (account_email, created_at desc);

create table if not exists public.chase_sheet_touches (
  id uuid primary key default gen_random_uuid(),
  account_email text not null references public.chase_sheet_accounts(email) on delete cascade,
  quote_id uuid not null references public.chase_sheet_quotes(id) on delete cascade,
  step integer not null check (step between 1 and 20),
  role text not null,
  channel text not null check (channel in ('text', 'call', 'email')),
  outcome text not null check (outcome in ('sent', 'no_answer', 'replied', 'skipped')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists chase_sheet_touches_quote_idx on public.chase_sheet_touches (quote_id, created_at desc);
create index if not exists chase_sheet_touches_account_idx on public.chase_sheet_touches (account_email, created_at desc);

create or replace function public.chase_sheet_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.chase_sheet_touch_updated_at() from public, anon, authenticated;

drop trigger if exists chase_sheet_accounts_touch on public.chase_sheet_accounts;
create trigger chase_sheet_accounts_touch before update on public.chase_sheet_accounts
  for each row execute function public.chase_sheet_touch_updated_at();
drop trigger if exists chase_sheet_quotes_touch on public.chase_sheet_quotes;
create trigger chase_sheet_quotes_touch before update on public.chase_sheet_quotes
  for each row execute function public.chase_sheet_touch_updated_at();

alter table public.chase_sheet_accounts enable row level security;
alter table public.chase_sheet_quotes enable row level security;
alter table public.chase_sheet_touches enable row level security;

revoke all on table public.chase_sheet_accounts, public.chase_sheet_quotes, public.chase_sheet_touches
  from anon, authenticated;

-- Baseline for public.purchases.
--
-- Why this file exists: the live project already has public.purchases (it was
-- created by hand when Stripe checkout first shipped), but no migration in this
-- repo creates it. 20260831230000_operatoros_verified_cash_ledger.sql attaches
-- the purchases_refresh_operator_cash trigger to it, and later scoreboard
-- migrations select from it, so a fresh database cannot replay the migration
-- history. This file is timestamped 20260831220000 so it sorts before the
-- cash-ledger migration and the table exists by the time that trigger is
-- created.
--
-- On the live project this migration is pending but is a no-op, with two
-- exceptions: it drops the unused default on purchases.kind and adds the new
-- purchases.lead_id column (plus its index). Every other statement is guarded
-- with "if not exists" and matches the live definition column-for-column.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text,
  kind text default 'learn_it',
  amount_cents integer,
  stripe_session_id text unique,
  status text default 'paid'
);

-- The create above keeps kind default 'learn_it' so a fresh table matches the
-- live one before any alter runs. The Learn It library is retired
-- (20260903020500) and the Stripe webhook always writes kind explicitly, so
-- nothing relies on the default. Drop it in both environments.
alter table public.purchases alter column kind drop default;

-- The inline "unique" on stripe_session_id already creates this index on a
-- fresh database; on the live project it exists under the same generated name.
create unique index if not exists purchases_stripe_session_id_key
  on public.purchases (stripe_session_id);

create index if not exists purchases_email_lower_idx
  on public.purchases (lower(email));

alter table public.purchases
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists purchases_lead_id_idx
  on public.purchases (lead_id);

comment on table public.purchases is
  'Stripe checkout ledger written only by the Stripe webhook; status is one of paid, refunded, disputed, payment_failed.';

-- Row level security is intentionally not touched here. We cannot confirm the
-- live RLS state of public.purchases from the repo, and enabling it blindly
-- could cut off the webhook or admin reads. A follow-up migration should check
-- pg_class.relrowsecurity for 'public.purchases'::regclass before enabling RLS
-- and adding policies.

-- Post Creator (/post-creator): paid accounts, the AI request ledger (no draft
-- text is ever stored), the shared daily AI spend ledger, and durable rate
-- limits. Service role only, like chase_sheet: every request goes through
-- /api/post-creator/*, which verifies a signed cookie and filters by email in
-- code. RLS is enabled with no policies as the backstop, and every privilege is
-- revoked from anon and authenticated. Days and months are America/Chicago,
-- taken from the database clock. Applying this file is Ryan's action
-- (docs/decisions-needed.md item 85).
--
-- Rollback:
--   drop function if exists public.post_creator_hit(text, integer, integer);
--   drop function if exists public.post_creator_usage(text);
--   drop function if exists public.post_creator_settle(uuid, text, boolean, text, bigint, text, integer, integer, integer, integer, text, boolean);
--   drop function if exists public.post_creator_reserve(text, uuid, integer, integer, integer, integer, integer, bigint, bigint, bigint, text);
--   drop function if exists public.post_creator_record_purchase(text, text, text, text, text, bigint);
--   drop table if exists public.post_creator_rate_limits;
--   drop table if exists public.post_creator_spend_daily;
--   drop table if exists public.post_creator_generations;
--   drop table if exists public.post_creator_accounts;
--   drop function if exists public.post_creator_accounts_guard();

create table if not exists public.post_creator_accounts (
  email text primary key check (email = lower(email) and char_length(email) between 3 and 200),
  plan text not null check (plan in ('monthly', 'lifetime')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  -- The checkout that created the row. Write-once (trigger below). The claim
  -- route signs a browser in only when it equals the session it holds.
  first_session_id text not null
    check (first_session_id ~ '^(cs_[A-Za-z0-9_]{8,200}|manual:[a-z0-9_-]{1,60})$'),
  last_session_id text,
  -- Set once, by the first successful claim. Write-once.
  first_claimed_at timestamptz,
  -- In every cookie. Bumped by any later checkout on this email; only goes up.
  access_epoch integer not null default 0 check (access_epoch >= 0),
  current_period_end timestamptz,
  cancel_at timestamptz,
  -- Stripe delivers out of order and retries; only a newer event may win.
  stripe_event_at bigint not null default 0,
  stripe_synced_at timestamptz,
  -- lib/postCreator/profile.ts BrandProfile.
  profile jsonb not null default '{}'::jsonb
    check (jsonb_typeof(profile) = 'object' and pg_column_size(profile) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists post_creator_accounts_customer_idx on public.post_creator_accounts (stripe_customer_id);

create table if not exists public.post_creator_generations (
  id uuid primary key default gen_random_uuid(),
  account_email text not null references public.post_creator_accounts (email) on delete cascade,
  request_id uuid not null,
  status text not null default 'reserved' check (status in ('reserved', 'delivered', 'failed', 'expired')),
  outcome text check (outcome is null or char_length(outcome) <= 40),
  day date not null,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  platforms smallint not null check (platforms between 1 and 3),
  requested_model text not null,
  served_model text,
  reserved_micro_usd bigint not null check (reserved_micro_usd > 0),
  cost_micro_usd bigint check (cost_micro_usd is null or cost_micro_usd >= 0),
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  stop_reason text,
  fell_back boolean not null default false,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (account_email, request_id)
);
create index if not exists post_creator_generations_month_idx on public.post_creator_generations (account_email, month);
create index if not exists post_creator_generations_open_idx on public.post_creator_generations (created_at) where status = 'reserved';

create table if not exists public.post_creator_spend_daily (
  day date primary key,
  reserved_micro_usd bigint not null default 0 check (reserved_micro_usd >= 0),
  spent_micro_usd bigint not null default 0 check (spent_micro_usd >= 0),
  calls integer not null default 0 check (calls >= 0),
  cap_hits integer not null default 0 check (cap_hits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_creator_rate_limits (
  bucket text not null check (bucket ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create or replace function public.post_creator_accounts_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.first_session_id is distinct from old.first_session_id then
    raise exception 'post_creator_accounts.first_session_id is write-once';
  end if;
  if old.first_claimed_at is not null and new.first_claimed_at is distinct from old.first_claimed_at then
    raise exception 'post_creator_accounts.first_claimed_at is write-once';
  end if;
  if new.access_epoch < old.access_epoch then
    raise exception 'post_creator_accounts.access_epoch only goes up';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.post_creator_accounts_guard() from public, anon, authenticated;
drop trigger if exists post_creator_accounts_guard on public.post_creator_accounts;
create trigger post_creator_accounts_guard before update on public.post_creator_accounts
  for each row execute function public.post_creator_accounts_guard();

-- A paid checkout, idempotent per session. A new email gets a row created by
-- this session. A later checkout on an existing email applies the plan rules
-- (lifetime never downgrades) and bumps access_epoch, signing every device out.
create or replace function public.post_creator_record_purchase(
  p_email text, p_plan text, p_session_id text, p_customer_id text, p_subscription_id text, p_event_at bigint
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.post_creator_accounts%rowtype;
  v_created boolean := false;
begin
  if p_email is null or p_email <> lower(p_email) or char_length(p_email) not between 3 and 200
     or p_plan is null or p_plan not in ('monthly', 'lifetime')
     or p_session_id is null or p_session_id !~ '^cs_[A-Za-z0-9_]{8,200}$'
     or coalesce(p_event_at, -1) < 0 then
    raise exception 'post_creator_invalid_purchase';
  end if;
  insert into public.post_creator_accounts
    (email, plan, status, stripe_customer_id, stripe_subscription_id, first_session_id, last_session_id, stripe_event_at)
  values
    (p_email, p_plan, 'active', p_customer_id, case when p_plan = 'monthly' then p_subscription_id end,
     p_session_id, p_session_id, p_event_at)
  on conflict (email) do nothing
  returning * into v_row;
  if found then
    v_created := true;
  else
    select * into v_row from public.post_creator_accounts where email = p_email for update;
    if v_row.last_session_id is distinct from p_session_id and v_row.first_session_id is distinct from p_session_id then
      update public.post_creator_accounts set
        plan = case when p_plan = 'lifetime' then 'lifetime' else plan end,
        status = case when p_plan = 'lifetime' or plan = 'monthly' then 'active' else status end,
        current_period_end = case when p_plan = 'lifetime' then null else current_period_end end,
        cancel_at = case when p_plan = 'lifetime' or plan = 'monthly' then null else cancel_at end,
        stripe_subscription_id = case when p_plan = 'monthly' then coalesce(p_subscription_id, stripe_subscription_id) else stripe_subscription_id end,
        stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
        stripe_event_at = greatest(stripe_event_at, p_event_at),
        last_session_id = p_session_id,
        access_epoch = access_epoch + 1
      where email = p_email
      returning * into v_row;
    end if;
  end if;
  return jsonb_build_object('created', v_created,
    'created_by_this_session', v_row.first_session_id = p_session_id,
    'account', to_jsonb(v_row));
end $$;

-- Reserve one AI write: per-account limits, the per-account monthly cost
-- ceiling, and the shared daily spend cap, under one lock.
create or replace function public.post_creator_reserve(
  p_email text, p_request_id uuid, p_platforms integer,
  p_per_day integer, p_per_month integer, p_tries_per_day integer, p_tries_per_month integer,
  p_account_month_cap_micro bigint, p_reserve_micro bigint, p_cap_micro bigint, p_model text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day date := (clock_timestamp() at time zone 'America/Chicago')::date;
  v_month text := to_char(clock_timestamp() at time zone 'America/Chicago', 'YYYY-MM');
  v_existing public.post_creator_generations%rowtype;
  v_used_day integer;
  v_used_month integer;
  v_tries_day integer;
  v_tries_month integer;
  v_cost_month bigint;
  v_spend public.post_creator_spend_daily%rowtype;
  v_id uuid;
begin
  if p_email is null or p_email <> lower(p_email) or p_request_id is null
     or coalesce(p_platforms, 0) not between 1 and 3
     or coalesce(p_per_day, -1) < 0 or coalesce(p_per_month, -1) < 0
     or coalesce(p_tries_per_day, -1) < 0 or coalesce(p_tries_per_month, -1) < 0
     or coalesce(p_account_month_cap_micro, 0) <= 0
     or coalesce(p_reserve_micro, 0) <= 0 or coalesce(p_cap_micro, 0) <= 0
     or char_length(coalesce(p_model, '')) not between 1 and 64 then
    raise exception 'post_creator_invalid_reserve';
  end if;

  -- One lock for reserve and settle: simple, no deadlocks, fast at this volume.
  perform pg_advisory_xact_lock(hashtext('post_creator_ai'));

  -- A reservation older than five minutes belongs to a killed request: charge
  -- it in full to its day and never count it against the buyer.
  with stale as (
    update public.post_creator_generations
       set status = 'expired', outcome = 'expired', cost_micro_usd = reserved_micro_usd, settled_at = v_now
     where status = 'reserved' and created_at < v_now - interval '5 minutes'
     returning day, reserved_micro_usd
  ), by_day as (
    select day, sum(reserved_micro_usd)::bigint as amount from stale group by day
  )
  update public.post_creator_spend_daily s
     set reserved_micro_usd = greatest(0, s.reserved_micro_usd - b.amount),
         spent_micro_usd = s.spent_micro_usd + b.amount,
         updated_at = v_now
    from by_day b
   where s.day = b.day;

  if not exists (select 1 from public.post_creator_accounts where email = p_email) then
    return jsonb_build_object('result', 'no_account');
  end if;

  select * into v_existing from public.post_creator_generations
   where account_email = p_email and request_id = p_request_id;
  if found then
    return jsonb_build_object('result', 'duplicate', 'status', v_existing.status);
  end if;

  if exists (select 1 from public.post_creator_generations where account_email = p_email and status = 'reserved') then
    return jsonb_build_object('result', 'busy');
  end if;

  select count(*) filter (where day = v_day and status in ('reserved', 'delivered')),
         count(*) filter (where status in ('reserved', 'delivered')),
         count(*) filter (where day = v_day),
         count(*),
         coalesce(sum(coalesce(cost_micro_usd, reserved_micro_usd)), 0)
    into v_used_day, v_used_month, v_tries_day, v_tries_month, v_cost_month
    from public.post_creator_generations
   where account_email = p_email and month = v_month;

  if v_used_month >= p_per_month then
    return jsonb_build_object('result', 'monthly_limit', 'used_day', v_used_day, 'used_month', v_used_month,
      'tries_day', v_tries_day, 'tries_month', v_tries_month, 'day', v_day, 'month', v_month);
  end if;
  if v_used_day >= p_per_day then
    return jsonb_build_object('result', 'daily_limit', 'used_day', v_used_day, 'used_month', v_used_month,
      'tries_day', v_tries_day, 'tries_month', v_tries_month, 'day', v_day, 'month', v_month);
  end if;
  if v_tries_day >= p_tries_per_day or v_tries_month >= p_tries_per_month then
    return jsonb_build_object('result', 'attempt_limit', 'used_day', v_used_day, 'used_month', v_used_month,
      'tries_day', v_tries_day, 'tries_month', v_tries_month, 'day', v_day, 'month', v_month);
  end if;
  if v_cost_month + p_reserve_micro > p_account_month_cap_micro then
    return jsonb_build_object('result', 'account_cost_limit', 'used_day', v_used_day, 'used_month', v_used_month,
      'tries_day', v_tries_day, 'tries_month', v_tries_month, 'day', v_day, 'month', v_month);
  end if;

  insert into public.post_creator_spend_daily (day) values (v_day) on conflict (day) do nothing;
  select * into v_spend from public.post_creator_spend_daily where day = v_day for update;
  if v_spend.spent_micro_usd + v_spend.reserved_micro_usd + p_reserve_micro > p_cap_micro then
    update public.post_creator_spend_daily set cap_hits = cap_hits + 1, updated_at = v_now where day = v_day;
    return jsonb_build_object('result', 'spend_cap', 'first_hit', v_spend.cap_hits = 0);
  end if;

  update public.post_creator_spend_daily
     set reserved_micro_usd = reserved_micro_usd + p_reserve_micro, calls = calls + 1, updated_at = v_now
   where day = v_day;
  insert into public.post_creator_generations
    (account_email, request_id, day, month, platforms, requested_model, reserved_micro_usd)
  values (p_email, p_request_id, v_day, v_month, p_platforms, p_model, p_reserve_micro)
  returning id into v_id;
  return jsonb_build_object('result', 'reserved', 'id', v_id,
    'used_day', v_used_day + 1, 'used_month', v_used_month + 1,
    'tries_day', v_tries_day + 1, 'tries_month', v_tries_month + 1, 'day', v_day, 'month', v_month);
end $$;

-- Settle a reservation once. p_cost_micro null = unknown (timeout, dropped
-- connection): the full reservation is charged.
create or replace function public.post_creator_settle(
  p_id uuid, p_email text, p_delivered boolean, p_outcome text, p_cost_micro bigint, p_served_model text,
  p_input_tokens integer, p_output_tokens integer, p_cache_read_tokens integer, p_cache_write_tokens integer,
  p_stop_reason text, p_fell_back boolean
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.post_creator_generations%rowtype;
begin
  if p_id is null or p_email is null or p_delivered is null
     or char_length(coalesce(p_outcome, '')) not between 1 and 40
     or (p_cost_micro is not null and p_cost_micro < 0) then
    raise exception 'post_creator_invalid_settle';
  end if;
  perform pg_advisory_xact_lock(hashtext('post_creator_ai'));
  update public.post_creator_generations set
    status = case when p_delivered then 'delivered' else 'failed' end,
    outcome = p_outcome,
    cost_micro_usd = coalesce(p_cost_micro, reserved_micro_usd),
    served_model = left(p_served_model, 64),
    input_tokens = p_input_tokens, output_tokens = p_output_tokens,
    cache_read_tokens = p_cache_read_tokens, cache_write_tokens = p_cache_write_tokens,
    stop_reason = left(p_stop_reason, 40),
    fell_back = coalesce(p_fell_back, false),
    settled_at = clock_timestamp()
  where id = p_id and account_email = p_email and status = 'reserved'
  returning * into v_row;
  if not found then
    return jsonb_build_object('result', 'noop');
  end if;
  update public.post_creator_spend_daily set
    reserved_micro_usd = greatest(0, reserved_micro_usd - v_row.reserved_micro_usd),
    spent_micro_usd = spent_micro_usd + v_row.cost_micro_usd,
    updated_at = clock_timestamp()
  where day = v_row.day;
  return jsonb_build_object('result', 'settled');
end $$;

create or replace function public.post_creator_usage(p_email text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_day date := (now() at time zone 'America/Chicago')::date;
  v_month text := to_char(now() at time zone 'America/Chicago', 'YYYY-MM');
  v jsonb;
begin
  select jsonb_build_object('day', v_day, 'month', v_month,
    'used_day', count(*) filter (where day = v_day and status in ('reserved', 'delivered')),
    'used_month', count(*) filter (where status in ('reserved', 'delivered')),
    'tries_day', count(*) filter (where day = v_day),
    'tries_month', count(*))
    into v
    from public.post_creator_generations where account_email = p_email and month = v_month;
  return v;
end $$;

create or replace function public.post_creator_hit(p_bucket text, p_window_seconds integer, p_limit integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_start timestamptz;
  v_hits integer;
begin
  if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$'
     or coalesce(p_window_seconds, 0) not between 1 and 86400 or coalesce(p_limit, 0) < 1 then
    raise exception 'post_creator_invalid_hit';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  delete from public.post_creator_rate_limits where window_start < now() - interval '2 days';
  insert into public.post_creator_rate_limits (bucket, window_start, hits) values (p_bucket, v_start, 1)
  on conflict (bucket, window_start) do update set hits = public.post_creator_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

alter table public.post_creator_accounts enable row level security;
alter table public.post_creator_generations enable row level security;
alter table public.post_creator_spend_daily enable row level security;
alter table public.post_creator_rate_limits enable row level security;
revoke all on table public.post_creator_accounts, public.post_creator_generations,
  public.post_creator_spend_daily, public.post_creator_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.post_creator_accounts, public.post_creator_generations,
  public.post_creator_spend_daily, public.post_creator_rate_limits to service_role;

revoke all on function public.post_creator_record_purchase(text, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.post_creator_reserve(text, uuid, integer, integer, integer, integer, integer, bigint, bigint, bigint, text) from public, anon, authenticated;
revoke all on function public.post_creator_settle(uuid, text, boolean, text, bigint, text, integer, integer, integer, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.post_creator_usage(text) from public, anon, authenticated;
revoke all on function public.post_creator_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.post_creator_record_purchase(text, text, text, text, text, bigint) to service_role;
grant execute on function public.post_creator_reserve(text, uuid, integer, integer, integer, integer, integer, bigint, bigint, bigint, text) to service_role;
grant execute on function public.post_creator_settle(uuid, text, boolean, text, bigint, text, integer, integer, integer, integer, text, boolean) to service_role;
grant execute on function public.post_creator_usage(text) to service_role;
grant execute on function public.post_creator_hit(text, integer, integer) to service_role;

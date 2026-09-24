-- TLFP Credits: a closed-loop credit ledger. 1 credit = $1 of LeadFlow Pro
-- services. Credits are earned (course completion, workshop attendance, a
-- referral that buys), bought in packs through Stripe, and spent at checkout.
-- They have no cash value, are not transferable, and can only be redeemed with
-- The LeadFlow Pro. A balance never reaches $2,000 (FinCEN closed-loop line),
-- so tlfp_post caps any award that would cross it.
--
-- Identity is the lowercased email, the same key public.purchases uses, so a
-- buyer who never logs in still accumulates a balance and sees it the first
-- time they log in with that email. user_id is attached when known.
--
-- Every movement is a ledger row with a unique `ref`, which is the idempotency
-- key (a Stripe session id, a credential id, an event registration id). A
-- retried webhook or a double click cannot post twice. Balances are never
-- edited by hand: an adjustment is another row.
--
-- Rollback: drop trigger tlfp_event_attended on public.event_registrations;
-- drop the tlfp_* functions; drop table public.tlfp_ledger; drop table
-- public.tlfp_accounts. Export the ledger first: it is the record of what
-- clients are owed.

create table if not exists public.tlfp_accounts (
  email text primary key
    check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  user_id uuid references auth.users(id) on delete set null,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists tlfp_accounts_user_key
  on public.tlfp_accounts(user_id) where user_id is not null;

create table if not exists public.tlfp_ledger (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.tlfp_accounts(email) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in (
    'pack_purchase', 'pack_refund', 'pack_restore',
    'course_completed', 'event_attended', 'referral_purchase',
    'redeem', 'admin_grant', 'admin_adjust'
  )),
  -- Idempotency key. One row per real-world cause, ever.
  ref text not null unique,
  -- posted: counts. held: reserved for a checkout that has not paid yet, still
  -- counts against the balance. released: the checkout expired, does not count.
  status text not null default 'posted' check (status in ('posted', 'held', 'released')),
  memo text,
  amount_cents integer,
  stripe_session_id text,
  actor text not null default 'system',
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists tlfp_ledger_email_idx on public.tlfp_ledger(email, created_at desc);
create index if not exists tlfp_ledger_session_idx
  on public.tlfp_ledger(stripe_session_id) where stripe_session_id is not null;
create index if not exists tlfp_ledger_held_idx
  on public.tlfp_ledger(created_at) where status = 'held';

alter table public.tlfp_accounts enable row level security;
alter table public.tlfp_ledger enable row level security;
revoke all on public.tlfp_accounts from public, anon, authenticated;
revoke all on public.tlfp_ledger from public, anon, authenticated;
grant select, insert, update on public.tlfp_accounts to service_role;
grant select, insert, update on public.tlfp_ledger to service_role;

-- A logged-in person reads their own account and ledger, matched on the
-- login email the same way purchases are. Admins read everything. Nobody
-- but the service role writes.
grant select on public.tlfp_accounts to authenticated;
grant select on public.tlfp_ledger to authenticated;

drop policy if exists tlfp_accounts_own_read on public.tlfp_accounts;
create policy tlfp_accounts_own_read on public.tlfp_accounts
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and lower(p.email) = tlfp_accounts.email
    )
  );

drop policy if exists tlfp_ledger_own_read on public.tlfp_ledger;
create policy tlfp_ledger_own_read on public.tlfp_ledger
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and lower(p.email) = tlfp_ledger.email
    )
  );

-- Balance = everything posted plus everything still held. Released rows are
-- history only. security_invoker so the caller's RLS applies to the view.
create or replace view public.tlfp_balances
  with (security_invoker = true) as
  select
    a.email,
    a.user_id,
    a.referral_code,
    coalesce(sum(l.delta) filter (where l.status in ('posted', 'held')), 0)::integer as balance,
    coalesce(-sum(l.delta) filter (where l.status = 'held'), 0)::integer as held,
    a.created_at
  from public.tlfp_accounts a
  left join public.tlfp_ledger l on l.email = a.email
  group by a.email, a.user_id, a.referral_code, a.created_at;
revoke all on public.tlfp_balances from public, anon;
grant select on public.tlfp_balances to authenticated, service_role;

-- Referral codes: 8 characters from an alphabet with no 0/O or 1/I. Randomness
-- comes from gen_random_uuid() (core Postgres), not pgcrypto, so the function
-- does not depend on which schema an extension was installed in.
create or replace function public.tlfp_referral_code()
returns text language plpgsql volatile set search_path = public, pg_temp as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  i integer;
begin
  for i in 0..7 loop
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  return v_code;
end $$;
revoke all on function public.tlfp_referral_code() from public, anon, authenticated;

-- Find or create the account for an email. Attaches the user id when one is
-- supplied and the account has none. Never lowers an existing link.
create or replace function public.tlfp_ensure_account(p_email text, p_user_id uuid default null)
returns public.tlfp_accounts language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.tlfp_accounts%rowtype;
  v_attempt integer := 0;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'tlfp_invalid_email';
  end if;
  select * into v_row from public.tlfp_accounts where email = v_email;
  if not found then
    loop
      begin
        insert into public.tlfp_accounts(email, user_id, referral_code)
          values (v_email, p_user_id, public.tlfp_referral_code())
          returning * into v_row;
        exit;
      exception
        when unique_violation then
          -- Either the code collided (retry) or a concurrent insert won (read it).
          select * into v_row from public.tlfp_accounts where email = v_email;
          if found then exit; end if;
          v_attempt := v_attempt + 1;
          if v_attempt > 5 then raise; end if;
      end;
    end loop;
  end if;
  if p_user_id is not null and v_row.user_id is null then
    update public.tlfp_accounts set user_id = p_user_id where email = v_email and user_id is null
      returning * into v_row;
  end if;
  return v_row;
end $$;
revoke all on function public.tlfp_ensure_account(text, uuid) from public, anon, authenticated;
grant execute on function public.tlfp_ensure_account(text, uuid) to service_role;

-- Post a movement. Idempotent on p_ref: a second call with the same ref returns
-- the existing row and changes nothing. A positive delta is capped so the
-- balance never passes 1999 (an award that would cross the line is cut to
-- what fits and the memo says so; if nothing fits, nothing is inserted). A
-- negative delta with p_require_funds true is refused when the available
-- balance is short (spending). Refunds and admin adjustments pass false and
-- may take a balance negative, because that is the truth of the account.
create or replace function public.tlfp_post(
  p_email text,
  p_delta integer,
  p_reason text,
  p_ref text,
  p_memo text default null,
  p_amount_cents integer default null,
  p_stripe_session_id text default null,
  p_actor text default 'system',
  p_status text default 'posted',
  p_require_funds boolean default true
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_account public.tlfp_accounts%rowtype;
  v_existing public.tlfp_ledger%rowtype;
  v_balance integer;
  v_delta integer := p_delta;
  v_memo text := p_memo;
  v_row public.tlfp_ledger%rowtype;
  v_cap constant integer := 1999;
begin
  if p_ref is null or length(trim(p_ref)) < 3 then raise exception 'tlfp_ref_required'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'tlfp_delta_required'; end if;
  if p_status not in ('posted', 'held') then raise exception 'tlfp_bad_status'; end if;

  v_account := public.tlfp_ensure_account(p_email);
  -- Serialize per account so two awards or a spend and an award cannot race
  -- past the cap or the floor.
  perform 1 from public.tlfp_accounts where email = v_account.email for update;

  select * into v_existing from public.tlfp_ledger where ref = p_ref;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'applied', v_existing.delta,
      'status', v_existing.status, 'id', v_existing.id);
  end if;

  select coalesce(sum(delta), 0) into v_balance
    from public.tlfp_ledger where email = v_account.email and status in ('posted', 'held');

  if v_delta > 0 and v_balance + v_delta > v_cap then
    v_delta := greatest(v_cap - v_balance, 0);
    v_memo := concat_ws(' ', v_memo, format('(capped: %s of %s applied, balance limit %s)', v_delta, p_delta, v_cap));
    if v_delta = 0 then
      return jsonb_build_object('ok', false, 'error', 'balance_cap', 'applied', 0, 'balance', v_balance);
    end if;
  end if;

  if v_delta < 0 and p_require_funds and v_balance + v_delta < 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'applied', 0, 'balance', v_balance);
  end if;

  insert into public.tlfp_ledger(email, delta, reason, ref, status, memo, amount_cents, stripe_session_id, actor, settled_at)
    values (v_account.email, v_delta, p_reason, p_ref, p_status, v_memo, p_amount_cents, p_stripe_session_id,
      coalesce(p_actor, 'system'), case when p_status = 'posted' then now() else null end)
    returning * into v_row;

  return jsonb_build_object('ok', true, 'duplicate', false, 'applied', v_delta, 'requested', p_delta,
    'status', v_row.status, 'id', v_row.id, 'balance', v_balance + v_delta, 'referral_code', v_account.referral_code);
end $$;
revoke all on function public.tlfp_post(text, integer, text, text, text, integer, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.tlfp_post(text, integer, text, text, text, integer, text, text, text, boolean) to service_role;

-- Settle a hold. 'posted' when Stripe reports the checkout paid, 'released'
-- when it expired. Idempotent. A hold that was released and then paid late is
-- posted anyway: the credits were spent, so the ledger says so even if the
-- balance dips below zero for a moment.
create or replace function public.tlfp_settle_hold(p_ref text, p_outcome text, p_stripe_session_id text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.tlfp_ledger%rowtype;
begin
  if p_outcome not in ('posted', 'released') then raise exception 'tlfp_bad_outcome'; end if;
  select * into v_row from public.tlfp_ledger where ref = p_ref for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'hold_missing'); end if;
  if v_row.status = 'posted' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'posted', 'delta', v_row.delta);
  end if;
  if v_row.status = 'released' and p_outcome = 'released' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'released', 'delta', v_row.delta);
  end if;
  update public.tlfp_ledger
    set status = p_outcome,
        settled_at = now(),
        stripe_session_id = coalesce(p_stripe_session_id, stripe_session_id),
        memo = case when p_outcome = 'released' then concat_ws(' ', memo, '(checkout expired, credits returned)')
                    when v_row.status = 'released' then concat_ws(' ', memo, '(paid after release, posted anyway)')
                    else memo end
    where id = v_row.id
    returning * into v_row;
  return jsonb_build_object('ok', true, 'duplicate', false, 'status', v_row.status, 'delta', v_row.delta, 'email', v_row.email);
end $$;
revoke all on function public.tlfp_settle_hold(text, text, text) from public, anon, authenticated;
grant execute on function public.tlfp_settle_hold(text, text, text) to service_role;

-- Stripe Checkout sessions expire after 24 hours. A hold older than that whose
-- webhook never came is returned to the balance. Called before a new hold is
-- placed and from the dashboard read, so a stuck hold never blocks a client.
create or replace function public.tlfp_release_stale_holds(p_older_than interval default interval '26 hours')
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  update public.tlfp_ledger
    set status = 'released', settled_at = now(),
        memo = concat_ws(' ', memo, '(checkout expired, credits returned)')
    where status = 'held' and created_at < now() - p_older_than;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.tlfp_release_stale_holds(interval) from public, anon, authenticated;
grant execute on function public.tlfp_release_stale_holds(interval) to service_role;

-- Workshop attendance is marked by an admin from the browser, so the award
-- lives here: when a registration becomes 'attended', its email earns the
-- attendance credits once. Number must match TLFP_EARN_RULES.event_attended in
-- lib/tlfpCredits.ts (tests/tlfp-credits.test.ts checks). Never blocks the
-- status change: a failure is a warning, not an error.
create or replace function public.tlfp_on_event_attended()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'attended' and (old.status is distinct from 'attended') and new.email is not null then
    begin
      perform public.tlfp_post(
        lower(new.email), 25, 'event_attended', 'event_attended:' || new.id::text,
        'Showed up at a workshop', null, null, 'trigger', 'posted', false);
    exception when others then
      raise warning 'tlfp_on_event_attended skipped for %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end $$;
revoke all on function public.tlfp_on_event_attended() from public, anon, authenticated;

drop trigger if exists tlfp_event_attended on public.event_registrations;
create trigger tlfp_event_attended
  after update of status on public.event_registrations
  for each row execute function public.tlfp_on_event_attended();

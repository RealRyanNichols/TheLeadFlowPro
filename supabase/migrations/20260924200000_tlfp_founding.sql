-- TLFP Credits: Founding 100. The first 100 distinct emails whose first
-- qualifying paid purchase clears get a numbered seat and a one-time founding
-- bonus in credits. Seat holders earn a standing rebate on every paid
-- purchase, and an Operations Partner month pays a monthly bonus. Every one
-- of those is a tlfp_ledger row posted through tlfp_post, so the 1,999 cap,
-- the per-account lock, and ref idempotency all still hold.
--
-- The seat counter is this table. seat_no is 1..100 and never reissued, so
-- the 101st claim is refused by the database itself, not only by the app.
-- The numbers must match TLFP_FOUNDING in lib/tlfpCredits.ts
-- (tests/tlfp-founding.test.ts checks).
--
-- It also closes a gap in tlfp_post that the founding awards would lean on:
-- the cap was checked against posted plus held credits, so an award posted
-- while a checkout hold was open could lift the balance past 1,999 once that
-- hold was released. The cap is now checked against posted credits alone,
-- which is the most the balance can ever be.
--
-- Rollback: drop function public.tlfp_founding_claim(text, text, text, integer, text);
-- drop table public.tlfp_founding_seats; put tlfp_post back to its body in
-- 20260923000000_tlfp_credits.sql; then put the tlfp_ledger reason check back
-- to the list there after exporting and removing the founding_* ledger rows
-- (they are credits clients are owed).

-- New ledger reasons. founding_reversed takes a founding award back when the
-- purchase behind it is refunded or disputed; founding_restored puts it back
-- when a dispute closes in our favour.
alter table public.tlfp_ledger drop constraint if exists tlfp_ledger_reason_check;
alter table public.tlfp_ledger add constraint tlfp_ledger_reason_check check (reason in (
  'pack_purchase', 'pack_refund', 'pack_restore',
  'course_completed', 'event_attended', 'referral_purchase',
  'redeem', 'admin_grant', 'admin_adjust',
  'founding_bonus', 'founding_monthly', 'founding_rebate',
  'founding_reversed', 'founding_restored'
));

-- tlfp_post, same contract as 20260923000000_tlfp_credits.sql, one change: a
-- positive delta is capped against posted credits only (held rows are
-- checkout reservations that may come back), so releasing a hold can never
-- lift a balance past 1,999. The spend check still uses posted plus held,
-- so held credits cannot be spent twice.
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
  v_posted integer;
  v_delta integer := p_delta;
  v_memo text := p_memo;
  v_row public.tlfp_ledger%rowtype;
  v_cap constant integer := 1999;
begin
  if p_ref is null or length(trim(p_ref)) < 3 then raise exception 'tlfp_ref_required'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'tlfp_delta_required'; end if;
  if p_status not in ('posted', 'held') then raise exception 'tlfp_bad_status'; end if;

  v_account := public.tlfp_ensure_account(p_email);
  perform 1 from public.tlfp_accounts where email = v_account.email for update;

  select * into v_existing from public.tlfp_ledger where ref = p_ref;
  if found then
    return jsonb_build_object('ok', true, 'duplicate', true, 'applied', v_existing.delta,
      'status', v_existing.status, 'id', v_existing.id);
  end if;

  select coalesce(sum(delta) filter (where status in ('posted', 'held')), 0),
         coalesce(sum(delta) filter (where status = 'posted'), 0)
    into v_balance, v_posted
    from public.tlfp_ledger where email = v_account.email;

  if v_delta > 0 and v_posted + v_delta > v_cap then
    v_delta := greatest(v_cap - v_posted, 0);
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

create table if not exists public.tlfp_founding_seats (
  seat_no integer primary key check (seat_no between 1 and 100),
  email text not null unique references public.tlfp_accounts(email) on delete cascade,
  tier text not null check (tier in ('build', 'learn', 'operations')),
  -- The Stripe checkout session or invoice id of the purchase that claimed the seat.
  ref text not null,
  bonus_applied integer not null default 0,
  claimed_at timestamptz not null default now()
);

alter table public.tlfp_founding_seats enable row level security;
revoke all on public.tlfp_founding_seats from public, anon, authenticated;
grant select, insert, update on public.tlfp_founding_seats to service_role;
grant select on public.tlfp_founding_seats to authenticated;

-- A logged-in person reads their own seat; admins read every seat. Nobody but
-- the service role writes.
drop policy if exists tlfp_founding_seats_own_read on public.tlfp_founding_seats;
create policy tlfp_founding_seats_own_read on public.tlfp_founding_seats
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and lower(p.email) = tlfp_founding_seats.email
    )
  );

-- Claim a seat for an email and post its one-time bonus, in one transaction.
-- Idempotent: an email that already holds a seat gets that seat back and
-- nothing posts (the bonus ref is one per email, ever). When all 100 seats are
-- taken the answer is sold_out and nothing is written. Seats are handed out
-- under a transaction-scoped advisory lock, so two purchases clearing at the
-- same moment can never both take seat 100.
create or replace function public.tlfp_founding_claim(
  p_email text,
  p_tier text,
  p_ref text,
  p_bonus integer default 0,
  p_memo text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_account public.tlfp_accounts%rowtype;
  v_seat public.tlfp_founding_seats%rowtype;
  v_next integer;
  v_limit constant integer := 100;
  v_post jsonb;
begin
  if p_tier not in ('build', 'learn', 'operations') then raise exception 'tlfp_bad_tier'; end if;
  if p_ref is null or length(trim(p_ref)) < 3 then raise exception 'tlfp_ref_required'; end if;
  if p_bonus is null or p_bonus < 0 then raise exception 'tlfp_bad_bonus'; end if;

  v_account := public.tlfp_ensure_account(p_email);
  perform pg_advisory_xact_lock(hashtext('public.tlfp_founding_seats'));

  select * into v_seat from public.tlfp_founding_seats where email = v_account.email;
  if found then
    return jsonb_build_object('ok', true, 'claimed', false, 'seat_no', v_seat.seat_no,
      'tier', v_seat.tier, 'ref', v_seat.ref, 'bonus_applied', v_seat.bonus_applied);
  end if;

  select coalesce(max(seat_no), 0) + 1 into v_next from public.tlfp_founding_seats;
  if v_next > v_limit then
    return jsonb_build_object('ok', false, 'error', 'sold_out', 'seats', v_limit);
  end if;

  insert into public.tlfp_founding_seats(seat_no, email, tier, ref)
    values (v_next, v_account.email, p_tier, left(p_ref, 200))
    returning * into v_seat;

  if p_bonus > 0 then
    v_post := public.tlfp_post(
      v_account.email, p_bonus, 'founding_bonus', 'founding_bonus:' || v_account.email,
      coalesce(p_memo, format('Founding seat %s of %s', v_next, v_limit)), null, left(p_ref, 200), 'webhook', 'posted', false);
    update public.tlfp_founding_seats
      set bonus_applied = coalesce((v_post->>'applied')::integer, 0)
      where seat_no = v_next
      returning * into v_seat;
  end if;

  return jsonb_build_object('ok', true, 'claimed', true, 'seat_no', v_seat.seat_no, 'tier', v_seat.tier,
    'ref', v_seat.ref, 'bonus_applied', v_seat.bonus_applied, 'post', v_post);
end $$;
revoke all on function public.tlfp_founding_claim(text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.tlfp_founding_claim(text, text, text, integer, text) to service_role;

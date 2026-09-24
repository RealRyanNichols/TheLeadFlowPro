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
-- Rollback: drop function public.tlfp_founding_claim(text, text, text, integer, text);
-- drop table public.tlfp_founding_seats; then put the tlfp_ledger reason
-- check back to the list in 20260923000000_tlfp_credits.sql after exporting
-- and removing the founding_* ledger rows (they are credits clients are owed).

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

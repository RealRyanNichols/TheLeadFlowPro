-- Five paid clients, with capacity reserved before any payable Stripe URL exists.
-- Expired wall-clock holds are NOT released without Stripe confirmation: a paid
-- session's webhook can arrive after its nominal expiry. Every active row owns
-- one of five unique slots, so even concurrent requests cannot oversell.
-- Rollback: disable this offer's routes, then drop the four functions and table
-- below only after exporting/reconciling all paid reservations with Stripe.

create table if not exists public.september_special_reservations (
  id uuid primary key,
  slot smallint not null check (slot between 1 and 5),
  status text not null default 'creating' check (status in ('creating','open','paid','expired')),
  prospect jsonb not null check (jsonb_typeof(prospect) = 'object'),
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  lead_id uuid references public.leads(id),
  check (expires_at > created_at)
);
create unique index if not exists september_special_active_slot
  on public.september_special_reservations(slot) where status <> 'expired';
create unique index if not exists september_special_active_email
  on public.september_special_reservations(lower(prospect->>'email')) where status <> 'expired';
create index if not exists september_special_lead
  on public.september_special_reservations(lead_id);
alter table public.september_special_reservations enable row level security;
revoke all on public.september_special_reservations from anon, authenticated;
grant select, insert, update on public.september_special_reservations to service_role;

create or replace function public.september_special_reserve(p_request_id uuid, p_prospect jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.september_special_reservations%rowtype;
  v_slot integer;
  v_now timestamptz := clock_timestamp();
begin
  perform pg_advisory_xact_lock(149700, 20260922);
  v_now := clock_timestamp();
  if v_now < '2026-09-22T23:00:00Z'::timestamptz then
    return jsonb_build_object('error','upcoming');
  end if;
  if v_now >= '2026-09-24T23:00:00Z'::timestamptz then
    return jsonb_build_object('error','expired');
  end if;
  if p_request_id is null or jsonb_typeof(p_prospect) is distinct from 'object'
    or length(coalesce(p_prospect->>'email','')) not between 3 and 254
    or coalesce(p_prospect->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(coalesce(p_prospect->>'full_name','')) not between 1 and 160
    or length(coalesce(p_prospect->>'business_name','')) not between 1 and 200
    or length(coalesce(p_prospect->>'business_city','')) not between 1 and 160
    or p_prospect->>'offer_terms_accepted' is distinct from 'true'
    or p_prospect->>'within_service_area' is distinct from 'true' then
    raise exception 'invalid_intake';
  end if;
  select * into v_row from public.september_special_reservations where id = p_request_id;
  if found then
    if lower(v_row.prospect->>'email') <> lower(p_prospect->>'email') then
      return jsonb_build_object('error','request_conflict');
    end if;
    return to_jsonb(v_row);
  end if;
  if exists (select 1 from public.september_special_reservations
    where lower(prospect->>'email') = lower(p_prospect->>'email') and status <> 'expired') then
    return jsonb_build_object('error','existing_checkout');
  end if;
  select n into v_slot from generate_series(1,5) n where not exists (
    select 1 from public.september_special_reservations r where r.slot = n and r.status <> 'expired'
  ) order by n limit 1;
  if v_slot is null then return jsonb_build_object('error','sold_out'); end if;
  insert into public.september_special_reservations(id,slot,prospect,created_at,expires_at)
    values(p_request_id,v_slot,p_prospect,v_now,date_trunc('second',v_now) + interval '30 minutes 10 seconds')
    returning * into v_row;
  return to_jsonb(v_row);
end $$;

create or replace function public.september_special_attach(p_id uuid,p_session_id text,p_expires_at timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.september_special_reservations%rowtype;
begin
  select * into v_row from public.september_special_reservations where id=p_id for update;
  if not found or v_row.status='expired' or p_session_id is null or p_session_id not like 'cs\_%'
    or (v_row.stripe_session_id is not null and v_row.stripe_session_id<>p_session_id)
    or p_expires_at is distinct from v_row.expires_at then raise exception 'reservation_mismatch'; end if;
  update public.september_special_reservations set stripe_session_id=p_session_id,
    status=case when status='paid' then 'paid' else 'open' end where id=p_id;
end $$;

-- Call only after Stripe reports the exact session expired, or rejects creation
-- definitively. A network timeout is never sufficient to release a slot.
create or replace function public.september_special_expire(p_id uuid,p_session_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.september_special_reservations%rowtype;
begin
  select * into v_row from public.september_special_reservations where id=p_id for update;
  if not found then raise exception 'reservation_missing'; end if;
  if v_row.status='paid' then return; end if;
  if v_row.stripe_session_id is distinct from p_session_id then raise exception 'reservation_mismatch'; end if;
  update public.september_special_reservations set status='expired' where id=p_id;
end $$;

create or replace function public.september_special_paid(
  p_id uuid,p_session_id text,p_amount integer,p_currency text,p_customer_email text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.september_special_reservations%rowtype;
  v_lead uuid;
  v_email text;
begin
  select * into v_row from public.september_special_reservations where id=p_id for update;
  if not found or p_amount is distinct from 149700 or p_currency is distinct from 'usd'
    or v_row.status='expired' or p_session_id is null or p_session_id not like 'cs\_%'
    or (v_row.stripe_session_id is not null and v_row.stripe_session_id<>p_session_id)
    then raise exception 'payment_reservation_mismatch'; end if;
  if v_row.status='paid' then return v_row.lead_id; end if;
  v_email := lower(coalesce(nullif(trim(p_customer_email),''),v_row.prospect->>'email'));
  insert into public.leads(full_name,email,phone,business_name,website_url,interest,goals,
    best_contact_method,status,source,utm_source,utm_medium,utm_campaign,
    marketing_email_consent,sms_consent,consent_at,external_id,diagnostic,
    priority,expected_value_cents,close_probability)
  values(v_row.prospect->>'full_name',v_email,v_row.prospect->>'phone',
    v_row.prospect->>'business_name',v_row.prospect->>'website_url','done_for_you',
    'September special paid: $1,497 total, including $500 ad budget and $997 services. Schedule onboarding and the local video session.',
    'email','won','september_special',v_row.prospect->>'utm_source',v_row.prospect->>'utm_medium',
    coalesce(v_row.prospect->>'utm_campaign','september_special_2026'),
    coalesce((v_row.prospect->>'marketing_email_consent')::boolean,false)
      and lower(v_row.prospect->>'email')=v_email,false,
    case when v_row.prospect->>'marketing_email_consent'='true'
      and lower(v_row.prospect->>'email')=v_email then v_row.created_at else null end,
    'stripe_checkout:'||p_session_id,
    jsonb_build_object('source','september_special','offer','september_special_2026','paid',true,
      'reservation_id',p_id,'business_city',v_row.prospect->>'business_city',
      'offer_terms_accepted_at',v_row.created_at,'stripe_session_id',p_session_id,
      'total_cents',149700,'ad_budget_cents',50000,'services_cents',99700,
      'next_action','Schedule onboarding. Confirm location within 50 miles of Longview before booking the two-hour commercial shoot.'),
    'hot',149700,100) returning id into v_lead;
  insert into public.purchases(email,kind,amount_cents,stripe_session_id,status)
    values(v_email,'september_special_2026',149700,p_session_id,'paid')
    on conflict(stripe_session_id) do update set status='paid';
  insert into public.lead_tasks(lead_id,title,priority,task_type)
    values(v_lead,'Schedule September special onboarding and verify the 50-mile video service area','hot','call');
  insert into public.lead_activity(lead_id,kind,detail)
    values(v_lead,'system','September special payment verified. $1,497 one time: $500 ads + $997 services.');
  update public.september_special_reservations set status='paid',stripe_session_id=p_session_id,
    paid_at=now(),lead_id=v_lead where id=p_id;
  return v_lead;
end $$;

revoke all on function public.september_special_reserve(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.september_special_attach(uuid,text,timestamptz) from public,anon,authenticated;
revoke all on function public.september_special_expire(uuid,text) from public,anon,authenticated;
revoke all on function public.september_special_paid(uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.september_special_reserve(uuid,jsonb) to service_role;
grant execute on function public.september_special_attach(uuid,text,timestamptz) to service_role;
grant execute on function public.september_special_expire(uuid,text) to service_role;
grant execute on function public.september_special_paid(uuid,text,integer,text,text) to service_role;

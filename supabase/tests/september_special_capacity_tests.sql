-- Run through the trusted SQL connection. Synthetic rows are always rolled back.
-- Refuse to run once real reservations exist.
begin;
do $$
declare
  v_id uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_result jsonb;
  v_prospect jsonb;
  v_lead uuid;
  v_second_lead uuid;
  v_expiry timestamptz := date_trunc('second',now()) + interval '30 minutes 10 seconds';
  v_rejected boolean;
  n integer;
begin
  if exists(select 1 from public.september_special_reservations) then
    raise exception 'Run on an empty test database or before launch only';
  end if;
  if has_table_privilege('anon','public.september_special_reservations','SELECT')
    or has_function_privilege('anon','public.september_special_reserve(uuid,jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.september_special_paid(uuid,text,integer,text,text)','EXECUTE') then
    raise exception 'private reservation data or mutation is publicly accessible';
  end if;
  v_prospect := jsonb_build_object('full_name','Synthetic Test','email','rollback-special@example.invalid',
    'business_name','Synthetic business','business_city','Longview','phone','9035550100',
    'offer_terms_accepted',true,'within_service_area',true,'marketing_email_consent',false);
  v_result := public.september_special_reserve(v_id,v_prospect);
  if now() < '2026-09-22T23:00:00Z'::timestamptz then
    if v_result->>'error' <> 'upcoming' then raise exception 'Prelaunch checkout accepted'; end if;
    insert into public.september_special_reservations(id,slot,prospect,expires_at)
      values(v_id,1,v_prospect,v_expiry);
  elsif now() < '2026-09-24T23:00:00Z'::timestamptz then
    if v_result->>'id' <> v_id::text then raise exception 'Valid reservation failed'; end if;
    v_expiry := (v_result->>'expires_at')::timestamptz;
    v_result := public.september_special_reserve(v_id,v_prospect);
    if v_result->>'id' <> v_id::text then raise exception 'Retry duplicated reservation'; end if;
    v_result := public.september_special_reserve(v_other,v_prospect);
    if v_result->>'error' <> 'existing_checkout' then raise exception 'Duplicate email used another spot'; end if;
  else
    if v_result->>'error' <> 'expired' then raise exception 'Expired checkout accepted'; end if;
    insert into public.september_special_reservations(id,slot,prospect,expires_at)
      values(v_id,1,v_prospect,v_expiry);
  end if;
  for n in 2..5 loop
    insert into public.september_special_reservations(id,slot,prospect,expires_at)
      values(case when n=2 then v_other else gen_random_uuid() end,n,
      v_prospect || jsonb_build_object('email','rollback-special-'||n||'@example.invalid'),v_expiry);
  end loop;
  v_rejected := false;
  begin
    insert into public.september_special_reservations(id,slot,prospect,expires_at)
      values(gen_random_uuid(),1,v_prospect || '{"email":"sixth@example.invalid"}'::jsonb,v_expiry);
  exception when unique_violation then v_rejected:=true; end;
  if not v_rejected then raise exception 'Sixth active slot accepted'; end if;
  if now() >= '2026-09-22T23:00:00Z'::timestamptz and now() < '2026-09-24T23:00:00Z'::timestamptz then
    v_result := public.september_special_reserve(gen_random_uuid(),v_prospect || '{"email":"sixth@example.invalid"}'::jsonb);
    if v_result->>'error' <> 'sold_out' then raise exception 'Capacity RPC accepted sixth buyer'; end if;
  end if;
  perform public.september_special_attach(v_id,'cs_test_rollback_special_one',v_expiry);
  v_rejected:=false;
  begin
    perform public.september_special_paid(v_id,'cs_test_rollback_special_one',149699,'usd',null);
  exception when raise_exception then v_rejected:=true; end;
  if not v_rejected then raise exception 'Wrong payment amount accepted'; end if;
  v_lead := public.september_special_paid(v_id,'cs_test_rollback_special_one',149700,'usd',null);
  v_second_lead := public.september_special_paid(v_id,'cs_test_rollback_special_one',149700,'usd',null);
  if v_lead is distinct from v_second_lead then raise exception 'Webhook retry duplicated fulfillment'; end if;
  if (select count(*) from public.lead_tasks where lead_id=v_lead)<>1 then raise exception 'Onboarding task missing or duplicated'; end if;
  if not exists(select 1 from public.leads where id=v_lead and status='won' and marketing_email_consent=false and sms_consent=false) then
    raise exception 'Paid CRM state or consent incorrect';
  end if;
  perform public.september_special_expire(v_id,'cs_test_rollback_special_one');
  if not exists(select 1 from public.september_special_reservations where id=v_id and status='paid') then
    raise exception 'Delayed expiry released paid capacity';
  end if;
  perform public.september_special_attach(v_other,'cs_test_rollback_special_two',v_expiry);
  v_rejected:=false;
  begin
    perform public.september_special_expire(v_other,'cs_test_wrong_session');
  exception when raise_exception then v_rejected:=true; end;
  if not v_rejected then raise exception 'Wrong session released capacity'; end if;
  perform public.september_special_expire(v_other,'cs_test_rollback_special_two');
  v_rejected:=false;
  begin
    perform public.september_special_paid(v_other,'cs_test_rollback_special_two',149700,'usd',null);
  exception when raise_exception then v_rejected:=true; end;
  if not v_rejected then raise exception 'Late payment reused released reservation'; end if;
  insert into public.september_special_reservations(id,slot,prospect,expires_at)
    values(gen_random_uuid(),2,v_prospect || '{"email":"replacement@example.invalid"}'::jsonb,v_expiry);
  if (select count(*) from public.september_special_reservations where status<>'expired')<>5 then
    raise exception 'Released capacity cannot be safely reused';
  end if;
end $$;
rollback;
select 'passed: capacity, payment idempotency, late expiry, private grants, consent, and rollback' as result,
  (select count(*) from public.september_special_reservations) as remaining_reservations;

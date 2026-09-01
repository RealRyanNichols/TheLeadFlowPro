-- The OUT column seat_number collided with the table column inside the
-- max() lookup. Rename the OUT column and qualify the table reference.
drop function if exists public.claim_event_seat(uuid, text, integer);

create function public.claim_event_seat(
  p_registration_id uuid,
  p_stripe_session_id text default null,
  p_amount_cents integer default null
)
returns table (seat_status text, assigned_seat integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg public.event_registrations%rowtype;
  v_capacity integer;
  v_taken integer;
  v_seat integer;
  v_status text;
begin
  select * into v_reg
  from public.event_registrations
  where id = p_registration_id
  for update;
  if not found then
    raise exception 'registration_not_found' using errcode = '22023';
  end if;

  if v_reg.status in ('paid', 'attended', 'no_show', 'overbooked') then
    return query select v_reg.status, v_reg.seat_number;
    return;
  end if;

  select capacity into v_capacity from public.events where id = v_reg.event_id for update;

  select count(*) into v_taken
  from public.event_registrations
  where event_id = v_reg.event_id and status in ('paid', 'attended', 'no_show');

  if v_capacity is not null and v_taken >= v_capacity then
    v_status := 'overbooked';
    v_seat := null;
  else
    v_status := 'paid';
    select coalesce(max(r.seat_number), 0) + 1 into v_seat
    from public.event_registrations r
    where r.event_id = v_reg.event_id;
  end if;

  update public.event_registrations
  set status = v_status,
      seat_number = v_seat,
      stripe_session_id = coalesce(p_stripe_session_id, stripe_session_id),
      amount_paid_cents = coalesce(p_amount_cents, amount_paid_cents),
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = v_reg.id;

  return query select v_status, v_seat;
end;
$$;

revoke all on function public.claim_event_seat(uuid, text, integer) from public;
grant execute on function public.claim_event_seat(uuid, text, integer) to service_role;

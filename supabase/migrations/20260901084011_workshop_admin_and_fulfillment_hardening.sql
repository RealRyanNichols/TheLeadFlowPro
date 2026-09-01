-- Route workshop private details through a verified Next.js admin boundary.
-- These SECURITY DEFINER functions are callable only with the server-side
-- service role. The application route separately authenticates the user and
-- verifies profiles.role = 'admin' before calling either RPC.

alter table public.workshop_registrations
  add column if not exists confirmation_sent_at timestamptz;

create or replace function public.workshop_admin_get_event_details(
  p_event_id uuid default null
)
returns table (
  event_id uuid,
  exact_address text,
  arrival_notes text,
  recording_consent_text text,
  cancellation_policy text,
  seat_transfer_policy text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_only' using errcode = '42501';
  end if;

  return query
  select
    d.event_id,
    d.exact_address,
    d.arrival_notes,
    d.recording_consent_text,
    d.cancellation_policy,
    d.seat_transfer_policy,
    d.created_at,
    d.updated_at
  from private.workshop_event_details d
  where p_event_id is null or d.event_id = p_event_id
  order by d.created_at;
end;
$$;

create or replace function public.workshop_admin_update_event_details(
  p_event_id uuid,
  p_exact_address text,
  p_arrival_notes text default null,
  p_recording_consent_text text default null,
  p_cancellation_policy text default null,
  p_seat_transfer_policy text default null
)
returns table (
  event_id uuid,
  exact_address text,
  arrival_notes text,
  recording_consent_text text,
  cancellation_policy text,
  seat_transfer_policy text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_exact_address text := btrim(coalesce(p_exact_address, ''));
  v_arrival_notes text := nullif(btrim(coalesce(p_arrival_notes, '')), '');
  v_recording_consent_text text := nullif(btrim(coalesce(p_recording_consent_text, '')), '');
  v_cancellation_policy text := nullif(btrim(coalesce(p_cancellation_policy, '')), '');
  v_seat_transfer_policy text := nullif(btrim(coalesce(p_seat_transfer_policy, '')), '');
  v_sales_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_only' using errcode = '42501';
  end if;

  select e.sales_status
    into v_sales_status
  from public.workshop_events e
  where e.id = p_event_id
  for update;

  if not found then raise exception 'workshop_not_found'; end if;
  if char_length(v_exact_address) < 1 or char_length(v_exact_address) > 500 then
    raise exception 'invalid_exact_address';
  end if;
  if v_arrival_notes is not null and char_length(v_arrival_notes) > 2000 then
    raise exception 'arrival_notes_too_long';
  end if;
  if v_recording_consent_text is not null and char_length(v_recording_consent_text) > 4000 then
    raise exception 'recording_policy_too_long';
  end if;
  if v_cancellation_policy is not null and char_length(v_cancellation_policy) > 4000 then
    raise exception 'cancellation_policy_too_long';
  end if;
  if v_seat_transfer_policy is not null and char_length(v_seat_transfer_policy) > 4000 then
    raise exception 'transfer_policy_too_long';
  end if;
  if v_sales_status = 'open' and (
    v_recording_consent_text is null
    or v_cancellation_policy is null
    or v_seat_transfer_policy is null
  ) then
    raise exception 'workshop_terms_required';
  end if;

  insert into private.workshop_event_details (
    event_id,
    exact_address,
    arrival_notes,
    recording_consent_text,
    cancellation_policy,
    seat_transfer_policy
  ) values (
    p_event_id,
    v_exact_address,
    v_arrival_notes,
    v_recording_consent_text,
    v_cancellation_policy,
    v_seat_transfer_policy
  )
  on conflict (event_id) do update set
    exact_address = excluded.exact_address,
    arrival_notes = excluded.arrival_notes,
    recording_consent_text = excluded.recording_consent_text,
    cancellation_policy = excluded.cancellation_policy,
    seat_transfer_policy = excluded.seat_transfer_policy;

  return query
  select
    d.event_id,
    d.exact_address,
    d.arrival_notes,
    d.recording_consent_text,
    d.cancellation_policy,
    d.seat_transfer_policy,
    d.created_at,
    d.updated_at
  from private.workshop_event_details d
  where d.event_id = p_event_id;
end;
$$;

revoke execute on function public.workshop_admin_get_event_details(uuid)
  from public, anon, authenticated;
revoke execute on function public.workshop_admin_update_event_details(uuid, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.workshop_admin_get_event_details(uuid)
  to service_role;
grant execute on function public.workshop_admin_update_event_details(uuid, text, text, text, text, text)
  to service_role;

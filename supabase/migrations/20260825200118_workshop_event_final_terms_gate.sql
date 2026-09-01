-- Require finalized workshop terms before paid sales can open.
--
-- Private arrival details remain outside the exposed schema. Authenticated
-- admins use narrowly scoped RPCs to read and update them. Public event pages
-- receive only complete buyer-facing policy text through a service-role-only
-- RPC, never the exact street address.

alter table public.workshop_registrations
  add column if not exists terms_accepted_at timestamptz;

alter table public.workshop_registrations
  add column if not exists terms_snapshot jsonb;

comment on column public.workshop_registrations.terms_accepted_at is
  'Time the buyer acknowledged the displayed workshop policies before checkout.';
comment on column public.workshop_registrations.terms_snapshot is
  'Immutable first-acceptance snapshot of the recording, cancellation, and seat-transfer policies.';

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
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
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
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  select e.sales_status
    into v_sales_status
  from public.workshop_events e
  where e.id = p_event_id
  for update;

  if not found then
    raise exception 'workshop_not_found';
  end if;
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

-- The public page calls this only from a trusted server runtime. It omits the
-- exact address and returns no row until all buyer-facing policies are final.
create or replace function public.workshop_checkout_terms(p_event_id uuid)
returns table (
  recording_consent_text text,
  cancellation_policy text,
  seat_transfer_policy text
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select
    d.recording_consent_text,
    d.cancellation_policy,
    d.seat_transfer_policy
  from private.workshop_event_details d
  where d.event_id = p_event_id
    and nullif(btrim(d.exact_address), '') is not null
    and nullif(btrim(d.recording_consent_text), '') is not null
    and nullif(btrim(d.cancellation_policy), '') is not null
    and nullif(btrim(d.seat_transfer_policy), '') is not null;
$$;

create or replace function private.enforce_workshop_sales_terms()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.sales_status = 'open' then
    if not new.is_published then
      raise exception 'workshop_open_requires_publication' using errcode = '23514';
    end if;
    if new.starts_at is null or new.starts_at <= now() then
      raise exception 'workshop_open_requires_future_date' using errcode = '23514';
    end if;
    if new.price_usd is null or new.price_usd <= 0 then
      raise exception 'workshop_open_requires_positive_price' using errcode = '23514';
    end if;
    if new.capacity is null or new.capacity <= 0 then
      raise exception 'workshop_open_requires_positive_capacity' using errcode = '23514';
    end if;
    if not exists (
      select 1
      from private.workshop_event_details d
      where d.event_id = new.id
        and nullif(btrim(d.exact_address), '') is not null
        and nullif(btrim(d.recording_consent_text), '') is not null
        and nullif(btrim(d.cancellation_policy), '') is not null
        and nullif(btrim(d.seat_transfer_policy), '') is not null
    ) then
      raise exception 'workshop_open_requires_final_terms' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_open_workshop_detail_terms()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event_id uuid;
  v_sales_status text;
begin
  if tg_op = 'DELETE' then
    v_event_id := old.event_id;
  else
    v_event_id := new.event_id;
  end if;

  select e.sales_status
    into v_sales_status
  from public.workshop_events e
  where e.id = v_event_id;

  if v_sales_status = 'open' then
    if tg_op = 'DELETE' then
      raise exception 'close_workshop_sales_before_removing_terms' using errcode = '23514';
    end if;
    if nullif(btrim(new.exact_address), '') is null
      or nullif(btrim(new.recording_consent_text), '') is null
      or nullif(btrim(new.cancellation_policy), '') is null
      or nullif(btrim(new.seat_transfer_policy), '') is null then
      raise exception 'close_workshop_sales_before_removing_terms' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.enforce_workshop_hold_terms()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE'
    and old.terms_accepted_at is not null
    and (
      new.terms_accepted_at is distinct from old.terms_accepted_at
      or new.terms_snapshot is distinct from old.terms_snapshot
    ) then
    raise exception 'workshop_terms_acceptance_is_immutable' using errcode = '23514';
  end if;

  if new.status = 'hold' and (
    new.terms_accepted_at is null
    or new.terms_snapshot is null
    or jsonb_typeof(new.terms_snapshot) <> 'object'
  ) then
    raise exception 'workshop_terms_not_accepted' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Close any legacy-open workshop that does not yet meet the final gate. This
-- migration does not publish or open any event.
update public.workshop_events e
set sales_status = 'draft'
where e.sales_status = 'open'
  and (
    not e.is_published
    or e.starts_at is null
    or e.starts_at <= now()
    or e.price_usd <= 0
    or e.capacity <= 0
    or not exists (
      select 1
      from private.workshop_event_details d
      where d.event_id = e.id
        and nullif(btrim(d.exact_address), '') is not null
        and nullif(btrim(d.recording_consent_text), '') is not null
        and nullif(btrim(d.cancellation_policy), '') is not null
        and nullif(btrim(d.seat_transfer_policy), '') is not null
    )
  );

drop trigger if exists workshop_events_require_final_terms on public.workshop_events;
create trigger workshop_events_require_final_terms
before insert or update on public.workshop_events
for each row execute function private.enforce_workshop_sales_terms();

drop trigger if exists workshop_event_details_keep_open_terms on private.workshop_event_details;
create trigger workshop_event_details_keep_open_terms
before insert or update or delete on private.workshop_event_details
for each row execute function private.enforce_open_workshop_detail_terms();

drop trigger if exists workshop_registrations_require_terms_for_hold on public.workshop_registrations;
create trigger workshop_registrations_require_terms_for_hold
before insert or update on public.workshop_registrations
for each row execute function private.enforce_workshop_hold_terms();

-- This wrapper is the only service-role registration entry point after this
-- migration. It records the exact policies the buyer acknowledged.
create or replace function public.workshop_register_with_terms(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_business_name text default null,
  p_notes text default null,
  p_terms_acknowledged boolean default false
)
returns table (registration_id uuid, registration_status text, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_registration_id uuid;
  v_registration_status text;
  v_hold_expires_at timestamptz;
  v_terms_snapshot jsonb;
begin
  if p_terms_acknowledged is not true then
    raise exception 'workshop_terms_not_accepted';
  end if;

  select jsonb_build_object(
    'recording_consent_text', d.recording_consent_text,
    'cancellation_policy', d.cancellation_policy,
    'seat_transfer_policy', d.seat_transfer_policy
  )
    into v_terms_snapshot
  from private.workshop_event_details d
  where d.event_id = p_event_id
    and nullif(btrim(d.exact_address), '') is not null
    and nullif(btrim(d.recording_consent_text), '') is not null
    and nullif(btrim(d.cancellation_policy), '') is not null
    and nullif(btrim(d.seat_transfer_policy), '') is not null;

  if v_terms_snapshot is null then
    raise exception 'workshop_terms_missing';
  end if;

  select r.registration_id, r.registration_status, r.hold_expires_at
    into v_registration_id, v_registration_status, v_hold_expires_at
  from public.workshop_register(
    p_event_id,
    p_full_name,
    p_email,
    p_phone,
    p_business_name,
    p_notes
  ) r;

  update public.workshop_registrations wr
  set
    terms_accepted_at = coalesce(wr.terms_accepted_at, now()),
    terms_snapshot = coalesce(wr.terms_snapshot, v_terms_snapshot)
  where wr.id = v_registration_id
    and wr.event_id = p_event_id;

  return query
  select v_registration_id, v_registration_status, v_hold_expires_at;
end;
$$;

-- Private details are now reachable by authenticated admins only through the
-- checked RPCs above. Existing RLS remains as defense in depth.
revoke all on private.workshop_event_details from authenticated;

revoke all on function public.workshop_admin_get_event_details(uuid)
  from public, anon, authenticated;
revoke all on function public.workshop_admin_update_event_details(uuid, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.workshop_checkout_terms(uuid)
  from public, anon, authenticated;
revoke all on function public.workshop_register_with_terms(uuid, text, text, text, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.workshop_register(uuid, text, text, text, text, text)
  from service_role;
revoke all on function private.enforce_workshop_sales_terms()
  from public, anon, authenticated;
revoke all on function private.enforce_open_workshop_detail_terms()
  from public, anon, authenticated;
revoke all on function private.enforce_workshop_hold_terms()
  from public, anon, authenticated;

grant execute on function public.workshop_admin_get_event_details(uuid)
  to authenticated;
grant execute on function public.workshop_admin_update_event_details(uuid, text, text, text, text, text)
  to authenticated;
grant execute on function public.workshop_checkout_terms(uuid)
  to service_role;
grant execute on function public.workshop_register_with_terms(uuid, text, text, text, text, text, boolean)
  to service_role;

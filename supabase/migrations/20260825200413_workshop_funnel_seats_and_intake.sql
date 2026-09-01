-- Workshop funnel: paid-seat events, capacity enforcement, and attendee intake.
alter table public.events
  add column if not exists internal_title text,
  add column if not exists subtitle text,
  add column if not exists instructor_name text not null default 'Ryan Nichols',
  add column if not exists timezone text not null default 'America/Chicago',
  add column if not exists address_line text,
  add column if not exists address_visibility text not null default 'after_payment',
  add column if not exists price_note text,
  add column if not exists cancellation_policy text,
  add column if not exists recording_notice text,
  add column if not exists clinic_enabled boolean not null default false,
  add column if not exists registration_closed boolean not null default false,
  add column if not exists date_confirmed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass and conname = 'events_address_visibility_check'
  ) then
    alter table public.events
      add constraint events_address_visibility_check
      check (address_visibility in ('public', 'after_payment'));
  end if;
end $$;

comment on column public.events.address_visibility is
  'public = street address shown on the funnel; after_payment = shown only on the confirmation page and in the confirmation email.';
comment on column public.events.date_confirmed is
  'False until the instructor locks the date.';

alter table public.event_registrations
  add column if not exists access_token text,
  add column if not exists seat_number integer,
  add column if not exists amount_paid_cents integer,
  add column if not exists stripe_session_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists attended_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists transferred_at timestamptz,
  add column if not exists transferred_to_email text,
  add column if not exists bottleneck text,
  add column if not exists bottleneck_submitted_at timestamptz,
  add column if not exists next_move_use_case text,
  add column if not exists next_move_tool text,
  add column if not exists next_move_action text,
  add column if not exists next_move_sent_at timestamptz,
  add column if not exists hot_seat boolean not null default false,
  add column if not exists recording_consent boolean not null default false,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists review_requested_at timestamptz,
  add column if not exists review_completed_at timestamptz,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default now();

update public.event_registrations
  set access_token = encode(gen_random_bytes(24), 'hex')
  where access_token is null;

alter table public.event_registrations
  alter column access_token set default encode(gen_random_bytes(24), 'hex');
alter table public.event_registrations
  alter column access_token set not null;

create unique index if not exists event_registrations_access_token_key
  on public.event_registrations (access_token);
create unique index if not exists event_registrations_stripe_session_key
  on public.event_registrations (stripe_session_id)
  where stripe_session_id is not null;
create unique index if not exists event_registrations_seat_key
  on public.event_registrations (event_id, seat_number)
  where seat_number is not null;
create index if not exists event_registrations_event_status_idx
  on public.event_registrations (event_id, status);

update public.event_registrations set status = 'pending' where status = 'registered';
update public.event_registrations set status = 'paid' where status = 'confirmed';

alter table public.event_registrations
  drop constraint if exists event_registrations_status_check;
alter table public.event_registrations
  add constraint event_registrations_status_check
  check (status in (
    'pending', 'paid', 'attended', 'no_show',
    'cancelled', 'transferred', 'refunded', 'overbooked'
  ));
alter table public.event_registrations alter column status set default 'pending';

create or replace function public.event_availability(p_slug text)
returns table (
  event_id uuid,
  capacity integer,
  seats_taken integer,
  seats_remaining integer,
  sold_out boolean,
  registration_open boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.capacity,
    coalesce(t.taken, 0)::integer,
    case when e.capacity is null then null
         else greatest(e.capacity - coalesce(t.taken, 0), 0)::integer end,
    case when e.capacity is null then false
         else coalesce(t.taken, 0) >= e.capacity end,
    (not e.registration_closed)
      and (e.capacity is null or coalesce(t.taken, 0) < e.capacity)
  from public.events e
  left join lateral (
    select count(*) as taken
    from public.event_registrations r
    where r.event_id = e.id
      and r.status in ('paid', 'attended', 'no_show')
  ) t on true
  where e.slug = p_slug
    and (e.is_published or public.is_admin());
$$;

create or replace function public.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_business_name text default null,
  p_notes text default null,
  p_bottleneck text default null,
  p_recording_consent boolean default false,
  p_marketing_consent boolean default false,
  p_utm jsonb default '{}'::jsonb
)
returns table (
  registration_id uuid,
  access_token text,
  price_usd numeric,
  seats_remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_taken integer;
  v_token text;
  v_id uuid;
begin
  select * into v_event from public.events where id = p_event_id and is_published;
  if not found then
    raise exception 'event_not_available' using errcode = '22023';
  end if;
  if v_event.registration_closed then
    raise exception 'registration_closed' using errcode = '22023';
  end if;
  if coalesce(btrim(p_full_name), '') = '' or coalesce(btrim(p_email), '') = '' then
    raise exception 'missing_contact' using errcode = '22023';
  end if;
  if p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select count(*) into v_taken
  from public.event_registrations
  where event_id = v_event.id and status in ('paid', 'attended', 'no_show');

  if v_event.capacity is not null and v_taken >= v_event.capacity then
    raise exception 'sold_out' using errcode = '22023';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.event_registrations (
    event_id, full_name, email, phone, business_name, notes, bottleneck,
    bottleneck_submitted_at, recording_consent, marketing_consent,
    access_token, status, utm_source, utm_medium, utm_campaign, utm_content
  ) values (
    v_event.id,
    left(btrim(p_full_name), 200),
    lower(left(btrim(p_email), 200)),
    nullif(left(btrim(coalesce(p_phone, '')), 50), ''),
    nullif(left(btrim(coalesce(p_business_name, '')), 200), ''),
    nullif(left(btrim(coalesce(p_notes, '')), 1000), ''),
    nullif(left(btrim(coalesce(p_bottleneck, '')), 1000), ''),
    case when coalesce(btrim(p_bottleneck), '') = '' then null else now() end,
    coalesce(p_recording_consent, false),
    coalesce(p_marketing_consent, false),
    v_token,
    'pending',
    nullif(left(p_utm ->> 'source', 120), ''),
    nullif(left(p_utm ->> 'medium', 120), ''),
    nullif(left(p_utm ->> 'campaign', 120), ''),
    nullif(left(p_utm ->> 'content', 120), '')
  )
  returning id into v_id;

  return query
    select
      v_id,
      v_token,
      v_event.price_usd,
      case when v_event.capacity is null then null
           else greatest(v_event.capacity - v_taken, 0)::integer end;
end;
$$;

create or replace function public.claim_event_seat(
  p_registration_id uuid,
  p_stripe_session_id text default null,
  p_amount_cents integer default null
)
returns table (seat_status text, seat_number integer)
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
    select coalesce(max(seat_number), 0) + 1 into v_seat
    from public.event_registrations
    where event_id = v_reg.event_id;
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

create or replace function public.event_registration_by_token(p_token text)
returns table (
  registration_id uuid,
  event_slug text,
  event_title text,
  first_name text,
  seat_status text,
  seat_number integer,
  has_bottleneck boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    e.slug,
    e.title,
    split_part(r.full_name, ' ', 1),
    r.status,
    r.seat_number,
    r.bottleneck is not null
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  where r.access_token = p_token
    and length(p_token) >= 24;
$$;

create or replace function public.submit_event_bottleneck(p_token text, p_bottleneck text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(btrim(p_bottleneck), '') = '' or length(coalesce(p_token, '')) < 24 then
    return false;
  end if;

  update public.event_registrations
  set bottleneck = left(btrim(p_bottleneck), 1000),
      bottleneck_submitted_at = now(),
      updated_at = now()
  where access_token = p_token
    and status in ('pending', 'paid', 'attended')
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function public.event_availability(text) from public;
revoke all on function public.register_for_event(
  uuid, text, text, text, text, text, text, boolean, boolean, jsonb) from public;
revoke all on function public.claim_event_seat(uuid, text, integer) from public;
revoke all on function public.event_registration_by_token(text) from public;
revoke all on function public.submit_event_bottleneck(text, text) from public;

grant execute on function public.event_availability(text) to anon, authenticated;
grant execute on function public.register_for_event(
  uuid, text, text, text, text, text, text, boolean, boolean, jsonb) to anon, authenticated;
grant execute on function public.event_registration_by_token(text) to anon, authenticated;
grant execute on function public.submit_event_bottleneck(text, text) to anon, authenticated;
grant execute on function public.claim_event_seat(uuid, text, integer) to service_role;

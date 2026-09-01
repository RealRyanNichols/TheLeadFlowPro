-- Reproducible, capacity-safe commerce tables for LeadFlow Pro workshops.
--
-- `public.events` is already a LeadFlow analytics compatibility view in the
-- canonical migration history. Workshop commerce therefore uses explicit
-- `workshop_*` names and never grants anonymous callers direct write access.

create schema if not exists private;

create table if not exists public.workshop_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    char_length(slug) between 3 and 120
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 4000),
  venue text check (venue is null or char_length(venue) <= 300),
  city text check (city is null or char_length(city) <= 200),
  starts_at timestamptz,
  duration_minutes integer not null default 90 check (duration_minutes between 15 and 720),
  price_usd numeric(10,2) not null default 0 check (price_usd between 0 and 1000000),
  capacity integer not null default 10 check (capacity between 1 and 10000),
  is_published boolean not null default false,
  sales_status text not null default 'draft' check (sales_status = any (array[
    'draft'::text,
    'waitlist'::text,
    'open'::text,
    'sold_out'::text,
    'completed'::text,
    'cancelled'::text
  ])),
  instructor_name text not null default 'Ryan Nichols' check (
    char_length(btrim(instructor_name)) between 1 and 200
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.workshop_events(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 200),
  email text not null check (
    char_length(btrim(email)) between 3 and 200
    and position('@' in email) > 1
  ),
  phone text check (phone is null or char_length(phone) <= 50),
  business_name text check (business_name is null or char_length(business_name) <= 200),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'registered' check (status = any (array[
    'registered'::text,
    'hold'::text,
    'confirmed'::text,
    'attended'::text,
    'no_show'::text,
    'cancelled'::text,
    'transferred'::text,
    'payment_review'::text
  ])),
  payment_status text not null default 'unpaid' check (payment_status = any (array[
    'unpaid'::text,
    'checkout_pending'::text,
    'paid'::text,
    'payment_review'::text,
    'expired'::text,
    'failed'::text,
    'refunded'::text
  ])),
  hold_token uuid,
  hold_started_at timestamptz,
  hold_expires_at timestamptz,
  stripe_checkout_session_id text check (
    stripe_checkout_session_id is null or char_length(stripe_checkout_session_id) <= 200
  ),
  stripe_payment_intent_id text check (
    stripe_payment_intent_id is null or char_length(stripe_payment_intent_id) <= 200
  ),
  amount_paid_cents integer check (amount_paid_cents is null or amount_paid_cents >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshop_registration_hold_shape check (
    (status = 'hold' and hold_token is not null and hold_started_at is not null and hold_expires_at is not null)
    or
    (status <> 'hold' and hold_token is null and hold_started_at is null and hold_expires_at is null)
  )
);

create table if not exists private.workshop_event_details (
  event_id uuid primary key references public.workshop_events(id) on delete cascade,
  exact_address text not null check (char_length(btrim(exact_address)) between 1 and 500),
  arrival_notes text check (arrival_notes is null or char_length(arrival_notes) <= 2000),
  recording_consent_text text check (
    recording_consent_text is null or char_length(recording_consent_text) <= 4000
  ),
  cancellation_policy text check (
    cancellation_policy is null or char_length(cancellation_policy) <= 4000
  ),
  seat_transfer_policy text check (
    seat_transfer_policy is null or char_length(seat_transfer_policy) <= 4000
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workshop_events_public_schedule_idx
  on public.workshop_events (is_published, starts_at);
create index if not exists workshop_registrations_event_status_idx
  on public.workshop_registrations (event_id, status);
create index if not exists workshop_registrations_active_holds_idx
  on public.workshop_registrations (event_id, hold_expires_at)
  where status = 'hold';
create unique index if not exists workshop_registrations_active_email_uidx
  on public.workshop_registrations (event_id, lower(btrim(email)))
  where status = any (array[
    'registered'::text,
    'hold'::text,
    'confirmed'::text,
    'attended'::text,
    'payment_review'::text
  ]);
create unique index if not exists workshop_registrations_stripe_session_uidx
  on public.workshop_registrations (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function private.touch_workshop_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_workshop_updated_at() from public, anon, authenticated;

drop trigger if exists workshop_events_touch_updated_at on public.workshop_events;
create trigger workshop_events_touch_updated_at
before update on public.workshop_events
for each row execute function private.touch_workshop_updated_at();

drop trigger if exists workshop_registrations_touch_updated_at on public.workshop_registrations;
create trigger workshop_registrations_touch_updated_at
before update on public.workshop_registrations
for each row execute function private.touch_workshop_updated_at();

drop trigger if exists workshop_event_details_touch_updated_at on private.workshop_event_details;
create trigger workshop_event_details_touch_updated_at
before update on private.workshop_event_details
for each row execute function private.touch_workshop_updated_at();

-- Copy a legacy workshop table only when the relation has the complete
-- workshop shape. In the canonical repo `public.events` is an analytics view,
-- so this block safely skips it. Dynamic SQL prevents missing legacy columns
-- from being resolved before the guard runs.
do $migration$
declare
  legacy_events_ready boolean;
  legacy_registrations_ready boolean;
begin
  select count(*) = 12
    into legacy_events_ready
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'events'
    and column_name = any (array[
      'id', 'slug', 'title', 'description', 'venue', 'city', 'starts_at',
      'duration_minutes', 'price_usd', 'capacity', 'is_published', 'created_at'
    ]);

  if legacy_events_ready then
    execute $copy_events$
      insert into public.workshop_events (
        id, slug, title, description, venue, city, starts_at,
        duration_minutes, price_usd, capacity, is_published, sales_status, created_at, updated_at
      )
      select
        id,
        lower(btrim(slug)),
        left(btrim(title), 200),
        case when description is null then null else left(description, 4000) end,
        case when venue is null then null else left(venue, 300) end,
        case when city is null then null else left(city, 200) end,
        starts_at,
        greatest(15, least(720, coalesce(duration_minutes, 90))),
        greatest(0, least(1000000, coalesce(price_usd, 0))),
        greatest(1, least(10000, coalesce(capacity, 10))),
        coalesce(is_published, false),
        case
          when coalesce(is_published, false) and starts_at is not null and starts_at > now() then 'open'
          else 'draft'
        end,
        coalesce(created_at, now()),
        now()
      from public.events
      where id is not null
        and nullif(btrim(slug), '') is not null
        and lower(btrim(slug)) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        and char_length(btrim(slug)) between 3 and 120
        and nullif(btrim(title), '') is not null
      on conflict do nothing
    $copy_events$;
  end if;

  -- Seed the known unpublished founding workshop on a fresh database. A
  -- migrated live row with this ID or slug wins and remains untouched.
  insert into public.workshop_events (
    id, slug, title, description, venue, city, starts_at,
    duration_minutes, price_usd, capacity, is_published, instructor_name
  ) values (
    '44a7f680-1693-48f2-9ba6-0555645878fc',
    'east-texas-ai-operator-workshop',
    'East Texas ChatGPT Operator Workshop',
    'A hands-on ChatGPT workshop for business owners. Bring a laptop and one real business bottleneck.',
    'The LeadFlow Pro at Longview Training Center',
    'Longview, TX',
    null,
    90,
    97,
    10,
    false,
    'Ryan Nichols'
  ) on conflict do nothing;

  select count(*) = 9
    into legacy_registrations_ready
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'event_registrations'
    and column_name = any (array[
      'id', 'event_id', 'full_name', 'email', 'phone',
      'business_name', 'notes', 'status', 'created_at'
    ]);

  if legacy_registrations_ready then
    execute $copy_registrations$
      insert into public.workshop_registrations (
        id, event_id, full_name, email, phone, business_name, notes,
        status, payment_status, created_at, updated_at
      )
      select
        r.id,
        r.event_id,
        left(btrim(r.full_name), 200),
        left(lower(btrim(r.email)), 200),
        case when r.phone is null then null else left(btrim(r.phone), 50) end,
        case when r.business_name is null then null else left(btrim(r.business_name), 200) end,
        case when r.notes is null then null else left(r.notes, 1000) end,
        case
          when r.status = 'confirmed' then 'confirmed'
          when r.status = 'attended' then 'attended'
          when r.status = 'no_show' then 'no_show'
          when r.status = 'cancelled' then 'cancelled'
          when r.status = 'transferred' then 'transferred'
          else 'registered'
        end,
        case when r.status in ('confirmed', 'attended') then 'payment_review' else 'unpaid' end,
        coalesce(r.created_at, now()),
        now()
      from public.event_registrations r
      join public.workshop_events e on e.id = r.event_id
      where r.id is not null
        and nullif(btrim(r.full_name), '') is not null
        and nullif(btrim(r.email), '') is not null
        and position('@' in r.email) > 1
      on conflict do nothing
    $copy_registrations$;

    -- Do not change legacy grants in this additive migration. Production must
    -- deploy the RPC-backed routes before a follow-up cutover migration revokes
    -- the old anonymous registration path.
  end if;
end
$migration$;

insert into private.workshop_event_details (event_id, exact_address, arrival_notes)
select
  id,
  '2800 Gilmer Road, Suite 106, Longview, TX',
  'Exact arrival instructions are shared only after a paid seat is confirmed.'
from public.workshop_events
where slug = 'east-texas-ai-operator-workshop'
on conflict (event_id) do nothing;

alter table public.workshop_events enable row level security;
alter table public.workshop_registrations enable row level security;
alter table private.workshop_event_details enable row level security;

drop policy if exists workshop_events_public_read on public.workshop_events;
create policy workshop_events_public_read on public.workshop_events
  for select to anon, authenticated
  using (is_published and starts_at is not null and starts_at > now());

drop policy if exists workshop_events_admin_all on public.workshop_events;
create policy workshop_events_admin_all on public.workshop_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists workshop_registrations_admin_all on public.workshop_registrations;
create policy workshop_registrations_admin_all on public.workshop_registrations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists workshop_event_details_admin_all on private.workshop_event_details;
create policy workshop_event_details_admin_all on private.workshop_event_details
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.workshop_events from public, anon, authenticated;
revoke all on public.workshop_registrations from public, anon, authenticated;
revoke all on private.workshop_event_details from public, anon, authenticated;

grant select on public.workshop_events to anon;
grant select, insert, update, delete on public.workshop_events to authenticated;
grant select, insert, update, delete on public.workshop_registrations to authenticated;
grant usage on schema private to authenticated, service_role;
grant select, insert, update, delete on private.workshop_event_details to authenticated;
grant all on public.workshop_events to service_role;
grant all on public.workshop_registrations to service_role;
grant all on private.workshop_event_details to service_role;

create or replace function private.release_expired_workshop_holds(p_event_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  update public.workshop_registrations
  set
    status = 'registered',
    payment_status = 'expired',
    hold_token = null,
    hold_started_at = null,
    hold_expires_at = null
  where event_id = p_event_id
    and status = 'hold'
    and hold_expires_at <= now();
$$;

revoke all on function private.release_expired_workshop_holds(uuid) from public, anon, authenticated;

create or replace function public.workshop_register(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_business_name text default null,
  p_notes text default null
)
returns table (registration_id uuid, registration_status text, hold_expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.workshop_events%rowtype;
  v_registration public.workshop_registrations%rowtype;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'invalid_full_name';
  end if;
  if char_length(v_email) < 3 or char_length(v_email) > 200 or position('@' in v_email) <= 1 then
    raise exception 'invalid_email';
  end if;

  select * into v_event
  from public.workshop_events
  where id = p_event_id
  for update;

  if not found or not v_event.is_published or v_event.sales_status <> 'open' then
    raise exception 'workshop_not_open';
  end if;
  if v_event.starts_at is null or v_event.starts_at <= now() then
    raise exception 'workshop_date_not_confirmed';
  end if;
  if v_event.price_usd <= 0 then
    raise exception 'workshop_not_payable';
  end if;

  perform private.release_expired_workshop_holds(v_event.id);

  select * into v_registration
  from public.workshop_registrations
  where event_id = v_event.id
    and lower(btrim(email)) = v_email
    and status = any (array[
      'registered'::text,
      'hold'::text,
      'confirmed'::text,
      'attended'::text,
      'payment_review'::text
    ])
  order by created_at desc
  limit 1
  for update;

  if found then
    return query select v_registration.id, v_registration.status, v_registration.hold_expires_at;
    return;
  end if;

  insert into public.workshop_registrations (
    event_id, full_name, email, phone, business_name, notes
  ) values (
    v_event.id,
    left(v_name, 200),
    v_email,
    nullif(left(btrim(coalesce(p_phone, '')), 50), ''),
    nullif(left(btrim(coalesce(p_business_name, '')), 200), ''),
    nullif(left(btrim(coalesce(p_notes, '')), 1000), '')
  ) returning * into v_registration;

  return query select v_registration.id, v_registration.status, v_registration.hold_expires_at;
end;
$$;

create or replace function public.workshop_hold_seat(
  p_event_id uuid,
  p_registration_id uuid,
  p_email text
)
returns table (
  registration_id uuid,
  registration_status text,
  seat_hold_token uuid,
  seat_hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.workshop_events%rowtype;
  v_registration public.workshop_registrations%rowtype;
  v_occupied integer;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into v_event
  from public.workshop_events
  where id = p_event_id
  for update;

  if not found or not v_event.is_published or v_event.sales_status <> 'open' then
    raise exception 'workshop_not_open';
  end if;
  if v_event.starts_at is null or v_event.starts_at <= now() then
    raise exception 'workshop_date_not_confirmed';
  end if;
  if v_event.price_usd <= 0 then
    raise exception 'workshop_not_payable';
  end if;

  perform private.release_expired_workshop_holds(v_event.id);

  select * into v_registration
  from public.workshop_registrations
  where id = p_registration_id
    and event_id = v_event.id
    and lower(btrim(email)) = v_email
  for update;

  if not found then
    raise exception 'registration_mismatch';
  end if;
  if v_registration.status in ('confirmed', 'attended') then
    raise exception 'seat_already_confirmed';
  end if;
  if v_registration.status = 'payment_review' then
    raise exception 'payment_review_required';
  end if;
  if v_registration.status not in ('registered', 'hold') then
    raise exception 'registration_not_payable';
  end if;

  if v_registration.status = 'hold' and v_registration.hold_expires_at > now() then
    return query select
      v_registration.id,
      v_registration.status,
      v_registration.hold_token,
      v_registration.hold_expires_at;
    return;
  end if;

  select count(*) into v_occupied
  from public.workshop_registrations r
  where r.event_id = v_event.id
    and r.id <> v_registration.id
    and (
      r.status in ('confirmed', 'attended', 'payment_review')
      or (r.status = 'hold' and r.hold_expires_at > now())
    );

  if v_occupied >= v_event.capacity then
    raise exception 'workshop_sold_out';
  end if;

  update public.workshop_registrations
  set
    status = 'hold',
    payment_status = 'checkout_pending',
    hold_token = gen_random_uuid(),
    hold_started_at = now(),
    hold_expires_at = now() + interval '30 minutes',
    stripe_checkout_session_id = null,
    stripe_payment_intent_id = null,
    amount_paid_cents = null,
    paid_at = null
  where id = v_registration.id
  returning * into v_registration;

  return query select
    v_registration.id,
    v_registration.status,
    v_registration.hold_token,
    v_registration.hold_expires_at;
end;
$$;

create or replace function public.workshop_attach_checkout(
  p_event_id uuid,
  p_registration_id uuid,
  p_email text,
  p_hold_token uuid,
  p_stripe_checkout_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event_id uuid;
  v_updated_id uuid;
begin
  select id into v_event_id
  from public.workshop_events
  where id = p_event_id
  for update;
  if not found then raise exception 'workshop_not_found'; end if;

  update public.workshop_registrations
  set stripe_checkout_session_id = left(btrim(p_stripe_checkout_session_id), 200)
  where id = p_registration_id
    and event_id = v_event_id
    and lower(btrim(email)) = lower(btrim(coalesce(p_email, '')))
    and status = 'hold'
    and hold_token = p_hold_token
    and hold_expires_at > now()
  returning id into v_updated_id;

  if v_updated_id is null then raise exception 'seat_hold_not_attachable'; end if;
  return true;
end;
$$;

create or replace function public.workshop_confirm_paid(
  p_event_id uuid,
  p_registration_id uuid,
  p_email text,
  p_hold_token uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_paid_cents integer
)
returns table (registration_status text, payment_status text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.workshop_events%rowtype;
  v_registration public.workshop_registrations%rowtype;
  v_occupied integer;
  v_expected_cents integer;
  v_review boolean := false;
begin
  select * into v_event
  from public.workshop_events
  where id = p_event_id
  for update;
  if not found then raise exception 'workshop_not_found'; end if;

  -- The event-row lock serializes all capacity-changing RPCs for one event.
  perform private.release_expired_workshop_holds(v_event.id);

  select * into v_registration
  from public.workshop_registrations
  where id = p_registration_id
    and event_id = v_event.id
    and lower(btrim(email)) = lower(btrim(coalesce(p_email, '')))
  for update;
  if not found then raise exception 'registration_mismatch'; end if;

  if v_registration.status = 'confirmed'
    and v_registration.payment_status = 'paid'
    and v_registration.stripe_checkout_session_id = p_stripe_checkout_session_id then
    return query select v_registration.status, v_registration.payment_status;
    return;
  end if;

  v_expected_cents := round(v_event.price_usd * 100)::integer;
  if p_amount_paid_cents is null or p_amount_paid_cents <> v_expected_cents then
    v_review := true;
  end if;
  if v_registration.status not in ('registered', 'hold') then
    v_review := true;
  end if;
  if v_registration.hold_token is not null and v_registration.hold_token <> p_hold_token then
    v_review := true;
  end if;
  if v_registration.stripe_checkout_session_id is not null
    and v_registration.stripe_checkout_session_id <> p_stripe_checkout_session_id then
    v_review := true;
  end if;

  select count(*) into v_occupied
  from public.workshop_registrations r
  where r.event_id = v_event.id
    and r.id <> v_registration.id
    and (
      r.status in ('confirmed', 'attended', 'payment_review')
      or (r.status = 'hold' and r.hold_expires_at > now())
    );
  if v_occupied >= v_event.capacity then
    v_review := true;
  end if;

  update public.workshop_registrations
  set
    status = case when v_review then 'payment_review' else 'confirmed' end,
    payment_status = case when v_review then 'payment_review' else 'paid' end,
    hold_token = null,
    hold_started_at = null,
    hold_expires_at = null,
    stripe_checkout_session_id = left(btrim(p_stripe_checkout_session_id), 200),
    stripe_payment_intent_id = nullif(left(btrim(coalesce(p_stripe_payment_intent_id, '')), 200), ''),
    amount_paid_cents = p_amount_paid_cents,
    paid_at = now()
  where id = v_registration.id
  returning * into v_registration;

  return query select v_registration.status, v_registration.payment_status;
end;
$$;

create or replace function public.workshop_release_hold(
  p_event_id uuid,
  p_registration_id uuid,
  p_hold_token uuid,
  p_stripe_checkout_session_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event_id uuid;
  v_updated_id uuid;
begin
  select id into v_event_id
  from public.workshop_events
  where id = p_event_id
  for update;
  if not found then return false; end if;

  update public.workshop_registrations
  set
    status = 'registered',
    payment_status = 'expired',
    hold_token = null,
    hold_started_at = null,
    hold_expires_at = null
  where id = p_registration_id
    and event_id = v_event_id
    and status = 'hold'
    and hold_token = p_hold_token
    and (
      p_stripe_checkout_session_id is null
      or stripe_checkout_session_id = p_stripe_checkout_session_id
    )
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;

-- The Supabase Data API does not need to expose the private schema. Paid
-- confirmation pages can fetch protected arrival details through this
-- service-role-only function after independently verifying the Stripe session.
create or replace function public.workshop_confirmation_details(p_event_id uuid)
returns table (
  exact_address text,
  arrival_notes text,
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
    d.exact_address,
    d.arrival_notes,
    d.recording_consent_text,
    d.cancellation_policy,
    d.seat_transfer_policy
  from private.workshop_event_details d
  where d.event_id = p_event_id;
$$;

revoke all on function public.workshop_register(uuid, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.workshop_hold_seat(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.workshop_attach_checkout(uuid, uuid, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.workshop_confirm_paid(uuid, uuid, text, uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.workshop_release_hold(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.workshop_confirmation_details(uuid)
  from public, anon, authenticated;

grant execute on function public.workshop_register(uuid, text, text, text, text, text)
  to service_role;
grant execute on function public.workshop_hold_seat(uuid, uuid, text)
  to service_role;
grant execute on function public.workshop_attach_checkout(uuid, uuid, text, uuid, text)
  to service_role;
grant execute on function public.workshop_confirm_paid(uuid, uuid, text, uuid, text, text, integer)
  to service_role;
grant execute on function public.workshop_release_hold(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.workshop_confirmation_details(uuid)
  to service_role;

comment on table public.workshop_events is
  'Public workshop catalog. Anonymous users can read only published future events.';
comment on table public.workshop_registrations is
  'Server-managed workshop registration, 30-minute seat hold, and Stripe payment state.';
comment on table private.workshop_event_details is
  'Paid-attendee and operator details such as the exact address and approved policies.';

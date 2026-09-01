-- pgcrypto lives in the extensions schema; the pinned search_path on the
-- security-definer functions cannot see it unqualified.
alter table public.event_registrations
  alter column access_token set default encode(extensions.gen_random_bytes(24), 'hex');

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

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

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

revoke all on function public.register_for_event(
  uuid, text, text, text, text, text, text, boolean, boolean, jsonb) from public;
grant execute on function public.register_for_event(
  uuid, text, text, text, text, text, text, boolean, boolean, jsonb) to anon, authenticated;

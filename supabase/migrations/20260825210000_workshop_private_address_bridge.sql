-- Bridge between the two workshop systems built on 2026-08-25.
--
-- Codex's migrations created private.workshop_event_details, which holds the
-- exact street address (kept out of the anon-readable events table on
-- purpose: the address is revealed only after payment). The private schema is
-- not exposed over PostgREST, so the application reaches it through the two
-- security-definer functions below:
--
--   event_exact_address(event_id)      service_role only; used by the Stripe
--                                      webhook to put the address in the paid
--                                      confirmation email.
--   event_confirmed_details(token)     anon-callable but token-gated: returns
--                                      the address only for a registration
--                                      that has actually paid.

create or replace function public.event_exact_address(p_event_id uuid)
returns table (exact_address text, arrival_notes text)
language sql
stable
security definer
set search_path = public, private
as $$
  select d.exact_address, d.arrival_notes
  from private.workshop_event_details d
  where d.event_id = p_event_id;
$$;

create or replace function public.event_confirmed_details(p_token text)
returns table (
  registration_id uuid,
  event_slug text,
  event_title text,
  first_name text,
  seat_status text,
  seat_number integer,
  has_bottleneck boolean,
  exact_address text,
  arrival_notes text
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    r.id,
    e.slug,
    e.title,
    split_part(r.full_name, ' ', 1),
    r.status,
    r.seat_number,
    r.bottleneck is not null,
    case when r.status in ('paid', 'attended') then d.exact_address end,
    case when r.status in ('paid', 'attended') then d.arrival_notes end
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  left join private.workshop_event_details d on d.event_id = e.id
  where r.access_token = p_token
    and length(p_token) >= 24;
$$;

revoke all on function public.event_exact_address(uuid) from public;
revoke all on function public.event_confirmed_details(text) from public;
grant execute on function public.event_exact_address(uuid) to service_role;
grant execute on function public.event_confirmed_details(text) to anon, authenticated;

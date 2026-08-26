-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- and authenticated directly, so "revoke ... from public" alone left these two
-- service-only functions callable through PostgREST. Revoke them explicitly:
-- claim_event_seat is the webhook's seat claim, event_exact_address reveals
-- the private street address.
revoke execute on function public.claim_event_seat(uuid, text, integer)
  from anon, authenticated;
revoke execute on function public.event_exact_address(uuid)
  from anon, authenticated;

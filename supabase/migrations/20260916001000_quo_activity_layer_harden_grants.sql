-- Close an unauthenticated path into the leads table.
--
-- NOT APPLIED. This one changes production behaviour and needs Ryan's approval
-- before it runs. It is separated from the reconciliation migration for exactly
-- that reason: that file is a no-op mirror, this file is a fix.
--
-- WHAT IS WRONG TODAY
-- Two SECURITY DEFINER functions are executable by PUBLIC, which includes the
-- `anon` role. `anon` is the role behind the publishable key that ships in
-- client-side JavaScript, so "executable by anon" means "executable by anyone
-- on the internet". Verified on 2026-09-16 against hpzpwfymwfgwspaixrxi:
--
--   has_schema_privilege('anon','public','USAGE')                        = true
--   has_function_privilege('anon','touch_lead_contact(uuid,timestamptz)') = true
--   has_function_privilege('anon','match_lead_by_phone(text)')            = true
--   prosecdef on both                                                     = true
--
-- Because they are SECURITY DEFINER, they run as the owner and ignore the RLS
-- policies on public.leads entirely. PostgREST exposes every public-schema
-- function at /rest/v1/rpc/<name>. The chain:
--
--   1. POST /rest/v1/rpc/match_lead_by_phone {"p":"903..."} returns the lead id
--      for that number, or null. That is an unauthenticated membership oracle:
--      it answers "is this person a lead of The LeadFlow Pro" for any phone
--      number an attacker cares to try, and it leaks the internal UUID.
--   2. POST /rest/v1/rpc/touch_lead_contact {"p_lead_id":"<that uuid>",
--      "p_when":"..."} then writes to public.leads: it stamps last_contacted_at
--      and advances status from 'new' to 'contacted'.
--
-- So an unauthenticated caller can enumerate whether a given phone number is in
-- the CRM, and can silently mark real leads as contacted. Marking a new lead
-- 'contacted' is not cosmetic. It is the field the follow-up queue ranks on, so
-- the damage is leads quietly falling out of the queue nobody worked.
--
-- The other three functions in this layer are already correct: anon has no
-- EXECUTE on ensure_lead_for_phone, log_quo_activity or apply_sms_opt_out.
--
-- WHAT THIS CHANGES
-- Revokes PUBLIC execute on the two SECURITY DEFINER functions and re-grants
-- only to service_role, matching the other three. normalize_phone and
-- is_sms_stop_word keep PUBLIC execute: both are IMMUTABLE, neither is SECURITY
-- DEFINER, and neither reads a table.
--
-- BLAST RADIUS, CHECK BEFORE APPLYING
-- Nothing in this repository calls either function from a browser context: both
-- are reached only through log_quo_activity, which runs as service_role inside
-- the edge function. Confirm that holds for anything outside this repo,
-- including the HQ plugin and any Fieldy or Codex job, before applying. If some
-- caller does rely on anon access, the fix is to give that caller a server-side
-- route, not to leave these open.

REVOKE EXECUTE ON FUNCTION public.touch_lead_contact(uuid, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_lead_contact(uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_lead_contact(uuid, timestamptz) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.touch_lead_contact(uuid, timestamptz) TO service_role;

REVOKE EXECUTE ON FUNCTION public.match_lead_by_phone(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_lead_by_phone(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_lead_by_phone(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.match_lead_by_phone(text) TO service_role;

-- Verification query to run after applying. All four must come back false.
--
--   SELECT
--     has_function_privilege('anon','public.touch_lead_contact(uuid, timestamptz)','EXECUTE'),
--     has_function_privilege('anon','public.match_lead_by_phone(text)','EXECUTE'),
--     has_function_privilege('authenticated','public.touch_lead_contact(uuid, timestamptz)','EXECUTE'),
--     has_function_privilege('authenticated','public.match_lead_by_phone(text)','EXECUTE');

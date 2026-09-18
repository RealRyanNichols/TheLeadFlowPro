-- TARGET ONLY: The LeadFlow Pro, project hpzpwfymwfgwspaixrxi.
-- Additive, aggregate-only read API. No contact rows or existing feeds are changed.
-- Ryan approved the "split by door" source map on 2026-09-17.
-- operator_prospects is deliberately excluded: those are outbound targets, not captured inquiries.
-- Rollback: DROP FUNCTION public.scoreboard_public_capture_coverage(integer);
CREATE OR REPLACE FUNCTION public.scoreboard_public_capture_coverage(days_back integer DEFAULT 30)
RETURNS TABLE(source text, records bigint, additional_emails bigint, start_day date, end_day date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  WITH bounds AS (
    SELECT (now() AT TIME ZONE 'America/Chicago')::date - least(greatest(coalesce(days_back,30),1),400) + 1 AS start_day,
           (now() AT TIME ZONE 'America/Chicago')::date AS end_day
  ), times AS (
    SELECT *, start_day::timestamp AT TIME ZONE 'America/Chicago' AS start_ts,
      (end_day+1)::timestamp AT TIME ZONE 'America/Chicago' AS end_ts FROM bounds
  ), public_leads AS (
    SELECT * FROM public.leads WHERE deleted_at IS NULL AND coalesce(is_test,false) = false
  ), primary_emails AS (
    SELECT DISTINCT lower(trim(email)) AS email FROM public.leads WHERE nullif(trim(email),'') IS NOT NULL
  ), event_emails AS (
    SELECT lower(trim(email)) AS email, min(created_at) AS first_seen FROM public.event_registrations
    WHERE trim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' GROUP BY lower(trim(email))
  )
  SELECT 'ad_lead_forms'::text,
    (SELECT count(*) FROM public_leads l WHERE l.created_at >= t.start_ts AND l.created_at < t.end_ts AND l.source = 'meta_lead_ad'),
    0::bigint, t.start_day, t.end_day FROM times t
  UNION ALL
  SELECT 'phone_line'::text,
    (SELECT count(*) FROM public_leads l WHERE l.created_at >= t.start_ts AND l.created_at < t.end_ts AND l.source IN ('quo_inbound','quo_call')),
    0::bigint, t.start_day, t.end_day FROM times t
  UNION ALL
  SELECT 'website_forms'::text,
    (SELECT count(*) FROM public_leads l WHERE l.created_at >= t.start_ts AND l.created_at < t.end_ts AND l.source = 'website'),
    0::bigint, t.start_day, t.end_day FROM times t
  UNION ALL
  SELECT 'other_leads'::text,
    (SELECT count(*) FROM public_leads l WHERE l.created_at >= t.start_ts AND l.created_at < t.end_ts AND coalesce(l.source,'') NOT IN ('meta_lead_ad','quo_inbound','quo_call','website')),
    0::bigint, t.start_day, t.end_day FROM times t
  UNION ALL
  SELECT 'event_registrations'::text,
    (SELECT count(*) FROM public.event_registrations e WHERE e.created_at >= t.start_ts AND e.created_at < t.end_ts),
    (SELECT count(*) FROM event_emails v WHERE v.first_seen >= t.start_ts AND v.first_seen < t.end_ts
      AND NOT EXISTS (SELECT 1 FROM primary_emails p WHERE p.email = v.email)),
    t.start_day, t.end_day FROM times t;
$function$;
REVOKE ALL ON FUNCTION public.scoreboard_public_capture_coverage(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scoreboard_public_capture_coverage(integer) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.scoreboard_public_capture_coverage(integer) IS 'Public source record counts only. Lead slices are disjoint subsets of public.leads, so their additional_emails are always 0. Event registration additional emails are distinct valid addresses absent from primary lead history. Outbound prospecting is excluded. Never add overlapping source record counts as unique people.';

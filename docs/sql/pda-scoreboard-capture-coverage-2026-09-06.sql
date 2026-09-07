-- TARGET ONLY: Premier Dental Academy, project lmbsuwslsycukynzpzik.
-- Additive, aggregate-only read API. No contact rows or existing feeds are changed.
-- Ryan authorized both named businesses' aggregate proof on 2026-09-06.
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
  ), primary_emails AS (
    SELECT DISTINCT lower(trim(email)) AS email FROM public.leads WHERE nullif(trim(email),'') IS NOT NULL
  ), subscriber_emails AS (
    SELECT lower(trim(email)) AS email, min(created_at) AS first_seen FROM public.subscribers
    WHERE trim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' GROUP BY lower(trim(email))
  ), enrollment_emails AS (
    SELECT lower(trim(email)) AS email, min(created_at) AS first_seen FROM public.enrollment_forms
    WHERE trim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' GROUP BY lower(trim(email))
  )
  SELECT 'leads'::text,
    (SELECT count(*) FROM public.leads WHERE created_at >= t.start_ts AND created_at < t.end_ts),
    0::bigint, t.start_day, t.end_day FROM times t
  UNION ALL
  SELECT 'subscribers'::text,
    (SELECT count(*) FROM public.subscribers WHERE created_at >= t.start_ts AND created_at < t.end_ts),
    (SELECT count(*) FROM subscriber_emails s WHERE first_seen >= t.start_ts AND first_seen < t.end_ts
      AND NOT EXISTS (SELECT 1 FROM primary_emails p WHERE p.email=s.email)),
    t.start_day,t.end_day FROM times t
  UNION ALL
  SELECT 'enrollment_forms'::text,
    (SELECT count(*) FROM public.enrollment_forms WHERE created_at >= t.start_ts AND created_at < t.end_ts),
    (SELECT count(*) FROM enrollment_emails e WHERE first_seen >= t.start_ts AND first_seen < t.end_ts
      AND NOT EXISTS (SELECT 1 FROM primary_emails p WHERE p.email=e.email)
      AND NOT EXISTS (SELECT 1 FROM subscriber_emails s WHERE s.email=e.email)),
    t.start_day,t.end_day FROM times t;
$function$;
REVOKE ALL ON FUNCTION public.scoreboard_public_capture_coverage(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scoreboard_public_capture_coverage(integer) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.scoreboard_public_capture_coverage(integer) IS 'Public source record counts only. Additional emails are distinct valid addresses absent from primary lead history; enrollment supplementary emails also exclude subscriber history. Never add overlapping source record counts as unique people.';

-- TARGET ONLY: RealRyanNichols.com, project rpchhzncxigczfojfdtc.
-- Additive, aggregate-only read API. No contact rows or existing feeds are changed.
-- No case, legal, political, family, or evidence fields are read or returned.
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
    SELECT lower(trim(email)) AS email FROM public.book_email_signups WHERE nullif(trim(email),'') IS NOT NULL
    UNION SELECT lower(trim(email)) FROM public.notify_signups WHERE nullif(trim(email),'') IS NOT NULL
    UNION SELECT lower(trim(email)) FROM public.poll_unlocks WHERE nullif(trim(email),'') IS NOT NULL
    UNION SELECT lower(trim(contact)) FROM public.chat_escalations
      WHERE trim(contact) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ), other_emails AS (
    SELECT lower(trim(email)) AS email, min(first_seen) AS first_seen FROM public.leads
    WHERE trim(email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' GROUP BY lower(trim(email))
  )
  SELECT 'book_email_signups'::text,
    (SELECT count(*) FROM public.book_email_signups WHERE created_at >= t.start_ts AND created_at < t.end_ts),
    0::bigint,t.start_day,t.end_day FROM times t
  UNION ALL
  SELECT 'notify_signups'::text,
    (SELECT count(*) FROM public.notify_signups WHERE created_at >= t.start_ts AND created_at < t.end_ts),
    0::bigint,t.start_day,t.end_day FROM times t
  UNION ALL
  SELECT 'poll_unlocks'::text,
    (SELECT count(*) FROM public.poll_unlocks WHERE created_at >= t.start_ts AND created_at < t.end_ts),
    0::bigint,t.start_day,t.end_day FROM times t
  UNION ALL
  SELECT 'chat_escalations'::text,
    (SELECT count(*) FROM public.chat_escalations WHERE contact IS NOT NULL AND contact<>'' AND created_at >= t.start_ts AND created_at < t.end_ts),
    0::bigint,t.start_day,t.end_day FROM times t
  UNION ALL
  SELECT 'leads'::text,
    (SELECT count(*) FROM public.leads WHERE first_seen >= t.start_ts AND first_seen < t.end_ts),
    (SELECT count(*) FROM other_emails o WHERE first_seen >= t.start_ts AND first_seen < t.end_ts
      AND NOT EXISTS (SELECT 1 FROM primary_emails p WHERE p.email=o.email)),
    t.start_day,t.end_day FROM times t;
$function$;
REVOKE ALL ON FUNCTION public.scoreboard_public_capture_coverage(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scoreboard_public_capture_coverage(integer) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.scoreboard_public_capture_coverage(integer) IS 'Public source record counts only. Additional emails are distinct valid addresses in the contact table absent from primary signup/contact history. Phone-only or anonymous rows are not treated as additional email contacts.';

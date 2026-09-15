-- Quo activity layer: reconcile production into git.
--
-- WHY THIS FILE EXISTS
-- Eight database objects that the live inbound pipeline depends on exist only
-- in production. They were applied by six migrations dated 2026-09-15 that have
-- no .sql file in this repository:
--
--   quo_activity_logging_core            20260915174510
--   ... through ...
--   log_quo_activity_honor_stop          20260915181629
--
-- The practical consequence: applying this repo's migrations to a fresh
-- database produces a schema on which the live edge function throws at runtime.
-- log_quo_activity does ON CONFLICT (provider_id) against a UNIQUE index on
-- lead_messages.provider_id that the repo migration creating that table
-- (20260812120000_lead_crm_messaging_and_delete.sql:52) never declares, and it
-- writes to public.lead_calls, which no repo migration creates at all.
--
-- WHAT THIS FILE IS
-- A faithful mirror of what production already has, captured verbatim from
-- pg_get_functiondef and information_schema on 2026-09-16. Every statement is
-- IF NOT EXISTS or CREATE OR REPLACE, so applying it to production is a no-op
-- and applying it to a fresh database reproduces the live pipeline.
--
-- WHAT THIS FILE IS NOT
-- It is not a fix. It changes no behaviour. The known defects in this layer are
-- reproduced here exactly as they run today, because the point of this file is
-- to make the current state reviewable, not to quietly alter it. Each is marked
-- DEFECT below and each is addressed in a separate, approval-gated migration.
--
-- NOT YET APPLIED to hpzpwfymwfgwspaixrxi. It should be a no-op there; verify
-- that claim before trusting it.

-- ---------------------------------------------------------------- helpers ---

CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $fn$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10)
$fn$;

CREATE OR REPLACE FUNCTION public.is_sms_stop_word(p_body text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $fn$
  select regexp_replace(lower(coalesce(p_body,'')), '[^a-z]', '', 'g')
         in ('stop','stopall','unsubscribe','cancel','end','quit','optout','remove')
$fn$;

CREATE OR REPLACE FUNCTION public.match_lead_by_phone(p text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  select l.id
  from public.leads l
  where l.deleted_at is null
    and public.normalize_phone(p) <> ''
    and public.normalize_phone(l.phone) = public.normalize_phone(p)
  order by coalesce(l.is_test, false) asc, l.created_at desc
  limit 1
$fn$;

-- Consent flags are FALSE on creation, deliberately. Inbound contact is not
-- consent: see the active compliance hold. The notes string is part of that
-- record and is not decoration.
CREATE OR REPLACE FUNCTION public.ensure_lead_for_phone(p_phone text, p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare
  v_lead_id uuid;
  v_digits  text := public.normalize_phone(p_phone);
begin
  if v_digits = '' then
    return null;
  end if;

  v_lead_id := public.match_lead_by_phone(p_phone);
  if v_lead_id is not null then
    return v_lead_id;
  end if;

  insert into public.leads (
    full_name, email, phone, status, source, interest, priority,
    marketing_email_consent, sms_consent, is_test,
    notes
  ) values (
    coalesce(nullif(trim(coalesce(p_name,'')), ''),
             'Unknown ' || '(' || substr(v_digits,1,3) || ') ' || substr(v_digits,4,3) || '-' || substr(v_digits,7,4)),
    'quo+' || v_digits || '@unknown.invalid',
    p_phone,
    'new', 'quo_inbound', 'unsure', 'normal',
    false, false, false,
    'Auto-created from Quo activity on ' || to_char(now(), 'YYYY-MM-DD') || '. No consent captured; do not add to email or SMS automation without one.'
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$fn$;

CREATE OR REPLACE FUNCTION public.apply_sms_opt_out(p_lead_id uuid, p_when timestamp with time zone)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  update public.leads
     set sms_unsubscribed_at = coalesce(sms_unsubscribed_at, p_when),
         sms_consent = false
   where id = p_lead_id;
$fn$;

-- DEFECT (reproduced as-is, fixed separately): log_quo_activity calls this on
-- every event including an inbound STOP, so a person whose only interaction was
-- opting out is recorded as status='contacted'.
CREATE OR REPLACE FUNCTION public.touch_lead_contact(p_lead_id uuid, p_when timestamp with time zone)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  update public.leads
     set last_contacted_at = greatest(coalesce(last_contacted_at, p_when), p_when),
         status = case when status = 'new' then 'contacted' else status end
   where id = p_lead_id;
$fn$;

-- ------------------------------------------------------------- lead_calls ---
-- Created in production only. 33 columns, captured verbatim.

CREATE TABLE IF NOT EXISTS public.lead_calls (
  id                         uuid        NOT NULL DEFAULT gen_random_uuid(),
  lead_id                    uuid        NOT NULL,
  provider_id                text        NOT NULL,
  conversation_id            text,
  direction                  text        NOT NULL,
  status                     text        NOT NULL DEFAULT 'completed'::text,
  outcome                    text        NOT NULL DEFAULT 'unknown'::text,
  from_number                text,
  to_number                  text,
  phone_number_id            text,
  user_id                    text,
  started_at                 timestamptz NOT NULL,
  answered_at                timestamptz,
  completed_at               timestamptz,
  duration_seconds           integer,
  voicemail_url              text,
  recording_url              text,
  recording_duration_seconds integer,
  summary                    text,
  next_steps                 text[]      NOT NULL DEFAULT '{}'::text[],
  transcript                 jsonb,
  source                     text        NOT NULL DEFAULT 'quo'::text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  participant_phone          text,
  contact_name               text,
  contact_company            text,
  scope_status               text        NOT NULL DEFAULT 'company'::text,
  relevance_score            integer     NOT NULL DEFAULT 50,
  relevance_reason           text,
  quo_deep_link              text,
  recording_path             text,
  voicemail_path             text,
  CONSTRAINT lead_calls_pkey PRIMARY KEY (id),
  CONSTRAINT lead_calls_provider_id_key UNIQUE (provider_id),
  CONSTRAINT lead_calls_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT lead_calls_direction_check CHECK (direction = ANY (ARRAY['incoming'::text, 'outgoing'::text])),
  CONSTRAINT lead_calls_outcome_check CHECK (outcome = ANY (ARRAY['answered'::text, 'missed'::text, 'voicemail'::text, 'no_answer'::text, 'completed'::text, 'unknown'::text])),
  CONSTRAINT lead_calls_source_check CHECK (source = ANY (ARRAY['quo'::text, 'fieldy'::text, 'manual'::text])),
  CONSTRAINT lead_calls_scope_status_check CHECK (scope_status = ANY (ARRAY['company'::text, 'review'::text, 'noise'::text, 'excluded'::text])),
  CONSTRAINT lead_calls_relevance_score_check CHECK (relevance_score >= 0 AND relevance_score <= 100),
  CONSTRAINT lead_calls_duration_seconds_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT lead_calls_recording_duration_seconds_check CHECK (recording_duration_seconds IS NULL OR recording_duration_seconds >= 0),
  CONSTRAINT lead_calls_summary_check CHECK (summary IS NULL OR char_length(summary) <= 12000),
  CONSTRAINT lead_calls_contact_name_size_check CHECK (contact_name IS NULL OR char_length(contact_name) <= 300),
  CONSTRAINT lead_calls_contact_company_size_check CHECK (contact_company IS NULL OR char_length(contact_company) <= 300),
  CONSTRAINT lead_calls_participant_phone_size_check CHECK (participant_phone IS NULL OR char_length(participant_phone) <= 50),
  CONSTRAINT lead_calls_relevance_reason_size_check CHECK (relevance_reason IS NULL OR char_length(relevance_reason) <= 2000),
  CONSTRAINT lead_calls_transcript_check CHECK (transcript IS NULL OR (jsonb_typeof(transcript) = 'array'::text AND pg_column_size(transcript) <= 1048576))
);

CREATE INDEX IF NOT EXISTS lead_calls_lead_id_started_at_idx
  ON public.lead_calls USING btree (lead_id, started_at DESC);

ALTER TABLE public.lead_calls ENABLE ROW LEVEL SECURITY;

DO $policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_calls' AND policyname='lead_calls_sales_select') THEN
    CREATE POLICY lead_calls_sales_select ON public.lead_calls FOR SELECT TO authenticated
      USING ((SELECT is_admin()) OR (scope_status = 'company'::text AND (SELECT can_access_sales_pipeline())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_calls' AND policyname='lead_calls_admin_insert') THEN
    CREATE POLICY lead_calls_admin_insert ON public.lead_calls FOR INSERT TO authenticated
      WITH CHECK ((SELECT is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_calls' AND policyname='lead_calls_admin_update') THEN
    CREATE POLICY lead_calls_admin_update ON public.lead_calls FOR UPDATE TO authenticated
      USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_calls' AND policyname='lead_calls_admin_delete') THEN
    CREATE POLICY lead_calls_admin_delete ON public.lead_calls FOR DELETE TO authenticated
      USING ((SELECT is_admin()));
  END IF;
END
$policies$;

-- --------------------------------------------- lead_messages unique index ---
-- log_quo_activity's ON CONFLICT (provider_id) depends on this. Production has
-- it; the repo migration that creates lead_messages declares a bare
-- `provider_id text` with no constraint.
--
-- Production also carries a second, redundant partial index
-- (lead_messages_provider_id_uidx) covering the same column. It is left in
-- place here rather than dropped, because dropping it is a change and this file
-- makes none.
CREATE UNIQUE INDEX IF NOT EXISTS lead_messages_provider_id_key
  ON public.lead_messages USING btree (provider_id);

-- ------------------------------------------------------ the ingest contract ---
-- The single entry point for all call and text activity. Both the deployed edge
-- function and any backfill go through this, not their own inserts.
--
-- DEFECT (reproduced as-is, fixed separately): the lead is created BEFORE the
-- stop word is evaluated. public.leads carries an AFTER INSERT trigger
-- (lead_email_notifications_enqueue_after_insert) whose purpose is to enqueue
-- outbound email. A STOP does not currently queue one only because
-- ensure_lead_for_phone never sets diagnostic->>'notification_pipeline', which
-- that trigger checks for. That is an accident, not a guard. Anyone who later
-- adds that marker to ensure_lead_for_phone turns an opt-out into an outbound
-- email with no warning. The comment below reading "STOP wins" describes an
-- intent the ordering does not deliver.
CREATE OR REPLACE FUNCTION public.log_quo_activity(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare
  v_kind        text        := payload->>'kind';
  v_provider_id text        := nullif(payload->>'provider_id', '');
  v_participant text        := payload->>'participant_phone';
  v_raw_dir     text        := lower(coalesce(nullif(payload->>'direction',''), ''));
  v_is_out      boolean     := v_raw_dir in ('out','outgoing','outbound');
  v_body        text        := coalesce(payload->>'body','');
  v_occurred    timestamptz := coalesce(nullif(payload->>'occurred_at','')::timestamptz, now());
  v_existing    uuid;
  v_lead_id     uuid;
  v_created     boolean     := false;
  v_opted_out   boolean     := false;
begin
  if v_provider_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing provider_id');
  end if;

  v_existing := public.match_lead_by_phone(v_participant);
  v_lead_id  := coalesce(v_existing, public.ensure_lead_for_phone(v_participant, payload->>'contact_name'));
  v_created  := v_existing is null and v_lead_id is not null;

  if v_lead_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no usable phone number');
  end if;

  -- STOP wins. Clear consent before anything else touches this lead.
  if v_kind = 'message' and not v_is_out and public.is_sms_stop_word(v_body) then
    perform public.apply_sms_opt_out(v_lead_id, v_occurred);
    v_opted_out := true;
  end if;

  if v_kind = 'call' then
    insert into public.lead_calls (
      lead_id, provider_id, conversation_id, direction, status, outcome,
      from_number, to_number, phone_number_id, user_id,
      started_at, answered_at, completed_at, duration_seconds,
      voicemail_url, recording_url, summary,
      participant_phone, contact_name, source
    ) values (
      v_lead_id, v_provider_id, nullif(payload->>'conversation_id',''),
      case when v_is_out then 'outgoing' else 'incoming' end,
      nullif(payload->>'status',''),
      case when lower(coalesce(payload->>'outcome','')) in
                ('answered','missed','voicemail','no_answer','completed')
           then lower(payload->>'outcome') else 'unknown' end,
      nullif(payload->>'from_number',''), nullif(payload->>'to_number',''),
      nullif(payload->>'phone_number_id',''), nullif(payload->>'user_id',''),
      v_occurred,
      nullif(payload->>'answered_at','')::timestamptz,
      nullif(payload->>'completed_at','')::timestamptz,
      nullif(payload->>'duration_seconds','')::int,
      nullif(payload->>'voicemail_url',''), nullif(payload->>'recording_url',''),
      left(nullif(payload->>'summary',''), 12000),
      left(v_participant, 50), left(nullif(payload->>'contact_name',''), 300),
      case when lower(coalesce(payload->>'source','')) in ('quo','fieldy','manual')
           then lower(payload->>'source') else 'quo' end
    )
    on conflict (provider_id) do update set
      status           = coalesce(excluded.status, lead_calls.status),
      outcome          = case when lead_calls.outcome = 'unknown' then excluded.outcome else lead_calls.outcome end,
      duration_seconds = coalesce(excluded.duration_seconds, lead_calls.duration_seconds),
      recording_url    = coalesce(excluded.recording_url, lead_calls.recording_url),
      voicemail_url    = coalesce(excluded.voicemail_url, lead_calls.voicemail_url),
      summary          = coalesce(excluded.summary, lead_calls.summary),
      completed_at     = coalesce(excluded.completed_at, lead_calls.completed_at),
      lead_id          = coalesce(lead_calls.lead_id, excluded.lead_id),
      updated_at       = now();

  elsif v_kind = 'message' then
    insert into public.lead_messages (
      lead_id, direction, channel, body, author, delivered, provider_id, created_at
    ) values (
      v_lead_id,
      case when v_is_out then 'out' else 'in' end,
      case when lower(coalesce(payload->>'channel','')) in ('sms','email','note')
           then lower(payload->>'channel') else 'sms' end,
      left(v_body, 3000),
      left(nullif(payload->>'author',''), 200),
      coalesce(nullif(payload->>'delivered','')::boolean, true),
      v_provider_id, v_occurred
    )
    on conflict (provider_id) do update set
      delivered = coalesce(excluded.delivered, lead_messages.delivered),
      lead_id   = coalesce(lead_messages.lead_id, excluded.lead_id);

  else
    return jsonb_build_object('ok', false, 'reason', 'unknown kind: ' || coalesce(v_kind,'null'));
  end if;

  perform public.touch_lead_contact(v_lead_id, v_occurred);

  return jsonb_build_object(
    'ok', true, 'lead_id', v_lead_id,
    'lead_created', v_created, 'sms_opted_out', v_opted_out
  );
end;
$fn$;

-- ------------------------------------------------------------------ grants ---
-- Mirrors production exactly. See the companion hardening migration: three of
-- these are SECURITY DEFINER and executable by PUBLIC, which is a live
-- privilege-escalation path and is NOT fixed here.
REVOKE ALL ON FUNCTION public.log_quo_activity(jsonb) FROM public;
REVOKE ALL ON FUNCTION public.ensure_lead_for_phone(text, text) FROM public;
REVOKE ALL ON FUNCTION public.apply_sms_opt_out(uuid, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.log_quo_activity(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_lead_for_phone(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_sms_opt_out(uuid, timestamptz) TO service_role;

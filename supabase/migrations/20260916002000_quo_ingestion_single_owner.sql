-- Task 0: one owner for lead creation on inbound Quo traffic.
--
-- NOT APPLIED. Changes production behaviour, needs approval.
-- Apply AFTER 20260916000000_quo_activity_layer_reconciliation.sql.
--
-- THE DECISION
-- public.log_quo_activity owns lead creation for every inbound Quo event.
-- /api/quo-inbound stops creating anything and becomes a thin authenticated
-- forwarder into this same function. The Supabase edge function already only
-- calls this function. So both doors converge on one path, and it stops
-- mattering which endpoint Quo is registered against, which is the one fact
-- nobody could read from the repo, the database or Vercel.
--
-- Double delivery is then idempotent at the row level: both writes use
-- ON CONFLICT (provider_id) against real unique indexes.
--
-- FOUR BEHAVIOUR CHANGES
--
-- 1. STOP is evaluated BEFORE any lead is created, not after.
--    Previously the lead was created first, and public.leads carries an
--    AFTER INSERT trigger whose purpose is to enqueue outbound email. A STOP
--    did not queue one only because ensure_lead_for_phone never sets
--    diagnostic->>'notification_pipeline'. That was an accident, not a guard.
--    Now a STOP never reaches an INSERT on leads at all.
--
-- 2. A STOP from an unknown number is recorded, in public.sms_suppressions.
--    Previously it was recorded nowhere: /api/quo-inbound wrapped the whole
--    opt-out write in `if (lead)`, so an unknown number that texted STOP got a
--    200 and no record, and the next time they texted a lead was created for
--    them with no memory that they had already said stop.
--    The suppression list is keyed on the normalized phone and is independent
--    of leads on purpose. Consent currently lives on the leads row, so deleting
--    or merging a lead silently loses the opt-out. This survives that.
--
-- 3. touch_lead_contact no longer runs on a STOP.
--    It advances status from 'new' to 'contacted'. Someone whose only
--    interaction with this business was opting out is not a contacted lead,
--    and that status is what the follow-up queue ranks on.
--
-- 4. An inbound text grants sms_consent. Ryan's call, 2026-09-16, and it
--    reverses the previous rule. Scoped exactly to what was asked, which was
--    "a stranger texts the line":
--      inbound message, not STOP, not suppressed  -> sms_consent TRUE
--      inbound call or voicemail                  -> FALSE, they called
--      any outbound event                         -> FALSE
--      inbound message from a suppressed number   -> FALSE, stays suppressed
--    marketing_email_consent stays FALSE throughout: they gave no email.
--    An explicit STOP is never undone by a later text. Re-consent after an
--    opt-out is a human action, not something an inbound message does.
--
-- THE NOTION COMPLIANCE HOLD SAYING "INBOUND CONTACT IS NOT CONSENT" IS NOW
-- STALE and must be amended to match, or the next agent reads it and reverts
-- change 4.

-- ------------------------------------------------------- suppression list ---

CREATE TABLE IF NOT EXISTS public.sms_suppressions (
  phone_norm   text        NOT NULL,
  first_stop_at timestamptz NOT NULL DEFAULT now(),
  last_stop_at  timestamptz NOT NULL DEFAULT now(),
  stop_count   integer     NOT NULL DEFAULT 1,
  last_body    text,
  source       text        NOT NULL DEFAULT 'quo_inbound',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_suppressions_pkey PRIMARY KEY (phone_norm),
  CONSTRAINT sms_suppressions_phone_norm_check CHECK (phone_norm <> ''),
  CONSTRAINT sms_suppressions_stop_count_check CHECK (stop_count >= 1),
  CONSTRAINT sms_suppressions_last_body_size_check CHECK (last_body IS NULL OR char_length(last_body) <= 500),
  CONSTRAINT sms_suppressions_source_check CHECK (source = ANY (ARRAY['quo_inbound'::text, 'manual'::text, 'import'::text]))
);

COMMENT ON TABLE public.sms_suppressions IS
  'Do-not-text list keyed on normalize_phone. Independent of leads on purpose: consent lives on the leads row, so deleting or merging a lead would lose the opt-out. This survives that. A row here means never send, whatever any leads row says.';

ALTER TABLE public.sms_suppressions ENABLE ROW LEVEL SECURITY;

DO $p$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sms_suppressions' AND policyname='sms_suppressions_admin_select') THEN
    CREATE POLICY sms_suppressions_admin_select ON public.sms_suppressions FOR SELECT TO authenticated
      USING ((SELECT is_admin()));
  END IF;
END
$p$;

-- ------------------------------------------- auto-reply claim ledger --------
-- Claim the row first, then call the API, never the reverse. Matches the
-- established idempotency convention. Keyed on the phone, not the lead id:
-- duplicate lead rows for one person already exist in production, and a
-- per-lead guard lets the same human get the reply twice.

CREATE TABLE IF NOT EXISTS public.sms_auto_replies (
  phone_norm text        NOT NULL,
  lead_id    uuid,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz,
  attempts   integer     NOT NULL DEFAULT 0,
  CONSTRAINT sms_auto_replies_pkey PRIMARY KEY (phone_norm),
  CONSTRAINT sms_auto_replies_phone_norm_check CHECK (phone_norm <> ''),
  CONSTRAINT sms_auto_replies_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.sms_auto_replies IS
  'One row per phone number that has been sent, or is being sent, the inbound auto-reply. Insert claims the right to send. sent_at stamps success. A claim with a null sent_at that was never stamped means the send failed and the claim should be released so a later inbound message can retry.';

ALTER TABLE public.sms_auto_replies ENABLE ROW LEVEL SECURITY;

DO $p$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sms_auto_replies' AND policyname='sms_auto_replies_admin_select') THEN
    CREATE POLICY sms_auto_replies_admin_select ON public.sms_auto_replies FOR SELECT TO authenticated
      USING ((SELECT is_admin()));
  END IF;
END
$p$;

CREATE OR REPLACE FUNCTION public.is_sms_suppressed(p_phone text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  select exists (
    select 1 from public.sms_suppressions
    where phone_norm = public.normalize_phone(p_phone)
      and public.normalize_phone(p_phone) <> ''
  )
$fn$;

-- ------------------------------------------------ lead creation, 3-arg -------
-- The 2-arg signature is kept and delegates with consent FALSE, so any caller
-- outside this repo keeps the conservative behaviour it has today.

CREATE OR REPLACE FUNCTION public.ensure_lead_for_phone(p_phone text, p_name text, p_sms_consent boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
declare
  v_lead_id uuid;
  v_digits  text    := public.normalize_phone(p_phone);
  v_consent boolean := coalesce(p_sms_consent, false);
begin
  if v_digits = '' then
    return null;
  end if;

  v_lead_id := public.match_lead_by_phone(p_phone);
  if v_lead_id is not null then
    return v_lead_id;
  end if;

  -- A suppressed number never gets consent, whatever the caller asked for.
  if v_consent and public.is_sms_suppressed(p_phone) then
    v_consent := false;
  end if;

  insert into public.leads (
    full_name, email, phone, status, source, interest, priority,
    marketing_email_consent, sms_consent, is_test,
    consent_at, notes
  ) values (
    coalesce(nullif(trim(coalesce(p_name,'')), ''),
             'Unknown ' || '(' || substr(v_digits,1,3) || ') ' || substr(v_digits,4,3) || '-' || substr(v_digits,7,4)),
    'quo+' || v_digits || '@unknown.invalid',
    p_phone,
    'new', 'quo_inbound', 'unsure', 'normal',
    false, v_consent, false,
    case when v_consent then now() else null end,
    case when v_consent
      then 'Auto-created from an inbound text on ' || to_char(now(), 'YYYY-MM-DD') ||
           '. They texted this line first, which is the consent event for SMS. No email address and no email consent.'
      else 'Auto-created from Quo activity on ' || to_char(now(), 'YYYY-MM-DD') ||
           '. No consent captured; do not add to email or SMS automation without one.'
    end
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$fn$;

CREATE OR REPLACE FUNCTION public.ensure_lead_for_phone(p_phone text, p_name text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
  select public.ensure_lead_for_phone(p_phone, p_name, false)
$fn$;

-- --------------------------------------------------- the ingest contract ----

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
  v_norm        text        := public.normalize_phone(payload->>'participant_phone');
  v_raw_dir     text        := lower(coalesce(nullif(payload->>'direction',''), ''));
  v_is_out      boolean     := v_raw_dir in ('out','outgoing','outbound');
  v_body        text        := coalesce(payload->>'body','');
  v_occurred    timestamptz := coalesce(nullif(payload->>'occurred_at','')::timestamptz, now());
  v_is_msg_in   boolean;
  v_is_stop     boolean;
  v_suppressed  boolean;
  v_grant       boolean;
  v_existing    uuid;
  v_lead_id     uuid;
  v_created     boolean     := false;
  v_opted_out   boolean     := false;
  v_reply_ok    boolean     := false;
begin
  if v_provider_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing provider_id');
  end if;
  if v_norm = '' then
    return jsonb_build_object('ok', false, 'reason', 'no usable phone number');
  end if;

  v_is_msg_in := v_kind = 'message' and not v_is_out;
  v_is_stop   := v_is_msg_in and public.is_sms_stop_word(v_body);

  -- ============================ STOP, before anything creates a lead ========
  -- No INSERT on public.leads happens on this branch, so the AFTER INSERT
  -- trigger that enqueues outbound email is never reached. That is the point.
  if v_is_stop then
    insert into public.sms_suppressions (phone_norm, first_stop_at, last_stop_at, last_body, source)
    values (v_norm, v_occurred, v_occurred, left(v_body, 500), 'quo_inbound')
    on conflict (phone_norm) do update set
      last_stop_at = greatest(public.sms_suppressions.last_stop_at, excluded.last_stop_at),
      stop_count   = public.sms_suppressions.stop_count + 1,
      last_body    = excluded.last_body,
      updated_at   = now();

    -- Match only. Never create. Somebody whose only message is STOP does not
    -- become a CRM record.
    v_lead_id := public.match_lead_by_phone(v_participant);

    if v_lead_id is not null then
      perform public.apply_sms_opt_out(v_lead_id, v_occurred);
      v_opted_out := true;

      -- Keep the message in the timeline. The record that they said stop is
      -- the thing you would want to show a regulator.
      insert into public.lead_messages (
        lead_id, direction, channel, body, author, delivered, provider_id, created_at
      ) values (
        v_lead_id, 'in', 'sms', left(v_body, 3000),
        left(nullif(payload->>'author',''), 200), true, v_provider_id, v_occurred
      )
      on conflict (provider_id) do nothing;
    end if;

    -- Deliberately no touch_lead_contact: opting out is not being contacted.
    return jsonb_build_object(
      'ok', true, 'lead_id', v_lead_id, 'lead_created', false,
      'sms_opted_out', v_opted_out, 'suppressed', true, 'auto_reply_eligible', false
    );
  end if;

  -- ============================================== everything that is not STOP
  v_suppressed := public.is_sms_suppressed(v_participant);
  v_grant      := v_is_msg_in and not v_suppressed;

  v_existing := public.match_lead_by_phone(v_participant);
  v_lead_id  := coalesce(v_existing, public.ensure_lead_for_phone(v_participant, payload->>'contact_name', v_grant));
  v_created  := v_existing is null and v_lead_id is not null;

  if v_lead_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no usable phone number');
  end if;

  -- An existing lead who texts in grants consent too, unless they ever opted
  -- out. An explicit STOP is never undone by a later inbound message.
  if v_grant and not v_created then
    update public.leads
       set sms_consent = true,
           consent_at  = coalesce(consent_at, v_occurred)
     where id = v_lead_id
       and sms_unsubscribed_at is null
       and coalesce(sms_consent, false) = false;
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

  -- Whether the caller MAY consider an auto-reply. It is not permission to
  -- send: the caller still has to claim sms_auto_replies and the feature is
  -- still behind QUO_INBOUND_AUTOREPLY_ENABLED.
  v_reply_ok := v_is_msg_in
                and not v_suppressed
                and not exists (select 1 from public.sms_auto_replies where phone_norm = v_norm);

  return jsonb_build_object(
    'ok', true, 'lead_id', v_lead_id, 'lead_created', v_created,
    'sms_opted_out', false, 'suppressed', false,
    'auto_reply_eligible', v_reply_ok, 'phone_norm', v_norm
  );
end;
$fn$;

-- ------------------------------------------------------------------ grants ---

REVOKE ALL ON FUNCTION public.is_sms_suppressed(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_lead_for_phone(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_lead_for_phone(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_quo_activity(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_sms_suppressed(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_lead_for_phone(text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_lead_for_phone(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_quo_activity(jsonb) TO service_role;

REVOKE ALL ON public.sms_suppressions FROM PUBLIC, anon;
REVOKE ALL ON public.sms_auto_replies FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_suppressions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_auto_replies TO service_role;
GRANT SELECT ON public.sms_suppressions TO authenticated;
GRANT SELECT ON public.sms_auto_replies TO authenticated;

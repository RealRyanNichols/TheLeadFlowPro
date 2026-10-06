-- Serialize existing Quo phone ingestion; no tables, triggers or grants change.
-- Exact deployed definitions captured October 6, 2026. Abort on definition/ACL drift.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';

DO $quo_definition_guard$
BEGIN
  IF md5(pg_get_functiondef('public.ensure_lead_for_phone(text,text,boolean)'::regprocedure)) <> '312d4468a2040db553fe828554170fef' THEN
    RAISE EXCEPTION 'Quo function drift: public.ensure_lead_for_phone(text,text,boolean)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'public.ensure_lead_for_phone(text,text,boolean)'::regprocedure
    AND (pg_get_userbyid(proowner) <> 'postgres'
      OR coalesce(proacl::text, '') <> '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}')) THEN
    RAISE EXCEPTION 'Quo function ownership or privilege drift: public.ensure_lead_for_phone(text,text,boolean)';
  END IF;
  IF md5(pg_get_functiondef('public.log_quo_activity(jsonb)'::regprocedure)) <> '2441b71b4bc8687297ee894eb96f766e' THEN
    RAISE EXCEPTION 'Quo function drift: public.log_quo_activity(jsonb)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'public.log_quo_activity(jsonb)'::regprocedure
    AND (pg_get_userbyid(proowner) <> 'postgres'
      OR coalesce(proacl::text, '') <> '{postgres=X/postgres,service_role=X/postgres}')) THEN
    RAISE EXCEPTION 'Quo function ownership or privilege drift: public.log_quo_activity(jsonb)';
  END IF;
END
$quo_definition_guard$;

CREATE OR REPLACE FUNCTION public.ensure_lead_for_phone(p_phone text, p_name text, p_sms_consent boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lead_id uuid;
  v_digits  text    := public.normalize_phone(p_phone);
  v_consent boolean := coalesce(p_sms_consent, false);
begin
  if v_digits = '' then
    return null;
  end if;

  -- Serialize all Quo ingestion for this phone before lookup, STOP or lead creation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('leadflow-quo-phone:' || v_digits, 0)
  );

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
$function$;

CREATE OR REPLACE FUNCTION public.log_quo_activity(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Serialize all Quo ingestion for this phone before lookup, STOP or lead creation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('leadflow-quo-phone:' || v_norm, 0)
  );

  v_is_msg_in := v_kind = 'message' and not v_is_out;
  v_is_stop   := v_is_msg_in and public.is_sms_stop_word(v_body);

  -- STOP, before anything creates a lead. No INSERT on public.leads happens on
  -- this branch, so the AFTER INSERT trigger that enqueues outbound email is
  -- never reached. That is the point.
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

  -- Whether the caller MAY consider an auto-reply. Not permission to send.
  v_reply_ok := v_is_msg_in
                and not v_suppressed
                and not exists (select 1 from public.sms_auto_replies where phone_norm = v_norm);

  return jsonb_build_object(
    'ok', true, 'lead_id', v_lead_id, 'lead_created', v_created,
    'sms_opted_out', false, 'suppressed', false,
    'auto_reply_eligible', v_reply_ok, 'phone_norm', v_norm
  );
end;
$function$;

DO $quo_definition_guard$
BEGIN
  IF md5(pg_get_functiondef('public.ensure_lead_for_phone(text,text,boolean)'::regprocedure)) <> '58b9196cc58abfbf02c9e63a0c1d8cbf' THEN
    RAISE EXCEPTION 'Quo function drift: public.ensure_lead_for_phone(text,text,boolean)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'public.ensure_lead_for_phone(text,text,boolean)'::regprocedure
    AND (pg_get_userbyid(proowner) <> 'postgres'
      OR coalesce(proacl::text, '') <> '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}')) THEN
    RAISE EXCEPTION 'Quo function ownership or privilege drift: public.ensure_lead_for_phone(text,text,boolean)';
  END IF;
  IF md5(pg_get_functiondef('public.log_quo_activity(jsonb)'::regprocedure)) <> 'a0d5b117b139cfab5aa72e38b8eb14ca' THEN
    RAISE EXCEPTION 'Quo function drift: public.log_quo_activity(jsonb)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE oid = 'public.log_quo_activity(jsonb)'::regprocedure
    AND (pg_get_userbyid(proowner) <> 'postgres'
      OR coalesce(proacl::text, '') <> '{postgres=X/postgres,service_role=X/postgres}')) THEN
    RAISE EXCEPTION 'Quo function ownership or privilege drift: public.log_quo_activity(jsonb)';
  END IF;
END
$quo_definition_guard$;

COMMIT;

# Lead Flow Pro Analytics Event Taxonomy

## Purpose

Lead Flow Pro has two analytics streams:

1. Anonymous Vercel Web Analytics events for public-site behavior, quiz flow friction, and conversion movement.
2. Identified Supabase application events for consented lead operations, partner review, exports, privacy requests, and scoring governance.

The split is intentional. Vercel receives no names, emails, phone numbers, raw answers, buyer notes, free-text responses, profile ids, identity ids, or partner account ids. Supabase stores identified events only when there is a legitimate application context, provenance, tenant boundary, and RLS policy.

## Implementation Files

- `src/lib/analytics-taxonomy.ts`: canonical event names, allowed properties, URL/query redaction helpers, Vercel drain record sanitizer.
- `src/components/site/LeadFlowVercelAnalytics.tsx`: Vercel `Analytics` uses `leadFlowAnalyticsBeforeSend` from a client boundary.
- `src/app/layout.tsx`: mounts the LeadFlow Vercel Analytics wrapper and Speed Insights.
- `src/app/api/analytics/vercel-drain/route.ts`: signed Vercel Web Analytics Drain receiver for anonymous reporting.
- `supabase/migrations/20260701000000_leadflow_consent_data_platform.sql`: identified events table `leadflow.behavioral_events`.

## Core Rules

- Do not send emails, phone numbers, names, profile ids, identity ids, raw answer text, or raw free-text fields to Vercel.
- Use answer buckets, score bands, category keys, consent scopes, and step ids instead of raw answers.
- Redact tokens, order ids, auth codes, session ids, Stripe session ids, and sensitive route parameters before analytics leaves the browser.
- Treat Vercel drains as anonymous reporting input. Do not stitch Vercel `sessionId` or `deviceId` to identified lead profiles.
- Store identified events in Supabase only when tied to `partner_account_id` and, where applicable, `identity_id`, `profile_id`, `consent_ledger_id`, `export_id`, or `dsar_request_id`.
- Use `leadflow.scoreable_profiles` for scoring jobs so ADMT opt-outs are excluded.

## Stream 1: Anonymous Vercel Web Analytics

Vercel event names use the `lf_` prefix and only carry low-risk properties.

### Shared Vercel Properties

- `route`: route pattern or sanitized path.
- `path`: sanitized path with sensitive sections collapsed.
- `quiz_key`: stable quiz id such as `problem_intake` or `vehicle_builder`.
- `vertical`: `local_business`, `real_estate`, `mortgage_refi`, `ecommerce`, `b2b_saas`, `consumer_shopping`, or `general`.
- `entry_surface`: `hero`, `sticky_cta`, `marketplace_card`, `share_link`, `embedded_widget`, or `direct`.
- `utm_source`, `utm_medium`, `utm_campaign`: campaign values after length and character cleanup.
- `viewport_bucket`: `mobile`, `tablet`, `desktop`, or `wide`.
- `source_family`: `direct`, `google`, `facebook`, `x`, `instagram`, `tiktok`, `linkedin`, `youtube`, `referral`, or `internal`.

Never include `answer_text`, `free_text`, `email`, `phone`, `name`, `url`, `token`, `profile_id`, `identity_id`, `partner_account_id`, or `buyer_partner_account_id`.

### Vercel Event Inventory

- `lf_page_view`: anonymous page view or client-side route transition.
  Properties: `route`, `path`, `source_family`, `device_type`, `viewport_bucket`.

- `lf_quiz_started`: visitor starts an intake quiz or problem-solving flow.
  Properties: `route`, `quiz_key`, `vertical`, `entry_surface`, `utm_source`, `utm_medium`, `utm_campaign`.

- `lf_question_answered`: question step completed.
  Properties: `quiz_key`, `question_key`, `question_type`, `step_index`, `branch_key`, `answer_bucket`.

- `lf_branch_entered`: visitor enters a branch or vertical path.
  Properties: `quiz_key`, `branch_key`, `vertical`, `trigger_question_key`, `step_index`.

- `lf_dropoff_point`: visitor abandons at a known step.
  Properties: `quiz_key`, `step_key`, `step_index`, `completion_percent`, `time_on_step_bucket`.

- `lf_consent_viewed`: consent language becomes visible.
  Properties: `quiz_key`, `consent_scope`, `notice_version`, `surface`.

- `lf_consent_accepted`: visitor accepts a permission mode.
  Properties: `quiz_key`, `consent_scope`, `notice_version`, `permission_mode`, `seller_count_bucket`.

- `lf_seller_selected`: named seller option selected.
  Properties: `quiz_key`, `vertical`, `permission_mode`, `seller_category`, `seller_count_bucket`.

- `lf_form_completed`: quiz or lead form completes.
  Properties: `quiz_key`, `vertical`, `completion_type`, `step_count_bucket`, `intent_score_bucket`.

### Vercel Custom Event Examples

```ts
import { track } from "@vercel/analytics";

track("lf_quiz_started", {
  route: "/problem-intake",
  quiz_key: "problem_intake",
  vertical: "consumer_shopping",
  entry_surface: "hero",
  utm_source: "facebook",
  utm_medium: "paid",
  utm_campaign: "vehicle-fit-test",
});

track("lf_question_answered", {
  quiz_key: "vehicle_builder",
  question_key: "vehicle_timeline",
  question_type: "single_select",
  step_index: 4,
  branch_key: "family_suv",
  answer_bucket: "0_30_days",
});

track("lf_form_completed", {
  quiz_key: "home_preference_builder",
  vertical: "real_estate",
  completion_type: "lead_ready",
  step_count_bucket: "8_12",
  intent_score_bucket: "high",
});
```

## Stream 2: Identified Supabase Application Events

Supabase events are stored in `leadflow.behavioral_events`. This is the identified application trail used by admin dashboards, scoring audits, partner review, export logs, DSAR handling, and consent governance.

### Shared Supabase Fields

- `partner_account_id`: source tenant that owns the questionnaire/lead.
- `identity_id`: set only when the identity exists and retention/consent permits.
- `anonymous_id`: allowed before identity stitching.
- `session_id`: first-party app session id, not Vercel drain session id.
- `event_name`: canonical event name.
- `event_type`: normalized event category.
- `sales_channel`: `web_quiz`, `embedded_widget`, `partner_site`, `marketplace`, `api`, `crm_import`, `manual_admin`, `webhook`, or `paid_media`.
- `vertical`: vertical enum.
- `page_url`: only sanitized internal URL.
- `path`: sanitized path.
- `target`: internal object reference or action target.
- `value`: numeric value only when meaningful.
- `event_payload`: structured object with ids, scopes, bands, and workflow state. No raw PII or raw free text.
- `provenance`: request id, notice version, question version, actor type, source component, and consent pointer.

### Supabase Event Inventory

- `lead_reviewed`
  Type: `lead_reviewed`.
  Required payload: `partner_account_id`, `actor_user_id`, `profile_id`, `identity_id`, `review_stage`, `score_band`.
  Purpose: prove an authorized user reviewed a lead.

- `lead_exported`
  Type: `lead_exported`.
  Required payload: `partner_account_id`, `buyer_partner_account_id`, `export_id`, `export_type`, `row_count`, `entitlement_ids`.
  Purpose: track movement of consented data products.

- `delete_request_submitted`
  Type: `delete_request_submitted`.
  Required payload: `partner_account_id`, `identity_id`, `dsar_request_id`, `request_type`, `verification_status`.
  Purpose: privacy operations and deletion workflow.

- `admt_opt_out_submitted`
  Type: `admt_opt_out_submitted`.
  Required payload: `partner_account_id`, `identity_id`, `dsar_request_id`, `scope`, `verification_status`.
  Purpose: scoring governance and ADMT exclusion.

Recommended Supabase-only mirrors for quiz work:

- `quiz_started_identified`
- `question_answered_identified`
- `branch_entered_identified`
- `consent_viewed_identified`
- `consent_accepted_identified`
- `seller_selected_identified`
- `form_completed_identified`

Those can reference `questionnaire_id`, `question_version_id`, `answer_id`, `consent_ledger_id`, and `profile_id`. Raw answers stay in `leadflow.answers`, not `behavioral_events`.

### Supabase Insert Examples

Lead reviewed:

```sql
insert into leadflow.behavioral_events (
  partner_account_id,
  identity_id,
  event_name,
  event_type,
  sales_channel,
  vertical,
  path,
  target,
  event_payload,
  provenance
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000001',
  'lead_reviewed',
  'lead_reviewed',
  'marketplace',
  'consumer_shopping',
  '/dashboard/leads/[id]',
  'profile:20000000-0000-0000-0000-000000000001',
  '{
    "profile_id": "20000000-0000-0000-0000-000000000001",
    "review_stage": "qualified",
    "score_band": "critical"
  }',
  '{
    "actor_type": "partner_user",
    "source_component": "buyer_console",
    "request_id": "req_01"
  }'
);
```

Question answered without raw text:

```sql
insert into leadflow.behavioral_events (
  partner_account_id,
  identity_id,
  event_name,
  event_type,
  sales_channel,
  vertical,
  path,
  target,
  event_payload,
  provenance
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000001',
  'question_answered_identified',
  'question_answered',
  'web_quiz',
  'consumer_shopping',
  '/problem-intake',
  'question:vehicle_timeline',
  '{
    "questionnaire_id": "40000000-0000-0000-0000-000000000001",
    "question_version_id": "41000000-0000-0000-0000-000000000001",
    "answer_id": "50000000-0000-0000-0000-000000000001",
    "question_key": "vehicle_timeline",
    "answer_bucket": "0_30_days",
    "branch_key": "family_suv"
  }',
  '{
    "notice_version": "lfp-notice-2026-07",
    "source_component": "problem_intake_quiz"
  }'
);
```

ADMT opt-out:

```sql
insert into leadflow.behavioral_events (
  partner_account_id,
  identity_id,
  event_name,
  event_type,
  sales_channel,
  vertical,
  path,
  target,
  event_payload,
  provenance
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000005',
  'admt_opt_out_submitted',
  'admt_opt_out_submitted',
  'web_quiz',
  'consumer_shopping',
  '/privacy-center/admt-opt-out',
  'dsar:90000000-0000-0000-0000-000000000001',
  '{
    "dsar_request_id": "90000000-0000-0000-0000-000000000001",
    "scope": "admt_opt_out",
    "verification_status": "verified"
  }',
  '{
    "actor_type": "consumer",
    "source_component": "privacy_center",
    "notice_version": "lfp-notice-2026-07"
  }'
);
```

## Vercel Web Analytics Drains

Configure a Web Analytics Drain in Vercel:

- Destination: `https://www.theleadflowpro.com/api/analytics/vercel-drain`
- Format: JSON or NDJSON.
- Data type: Web Analytics.
- Signature secret: store in Vercel as `VERCEL_DRAIN_SIGNATURE_SECRET`.
- Recommended sampling: 100% during launch and funnel tests, then reduce if volume becomes noisy or expensive.

The endpoint:

- Requires `x-vercel-signature`.
- Uses HMAC SHA-1 with the configured secret.
- Accepts JSON array, JSON object, or NDJSON.
- Sanitizes path, route, query params, referrer, and custom event data.
- Logs only structured counts, event names, and redacted paths.
- Does not log raw payloads.
- Does not stitch Vercel session/device ids to Supabase identities.

Drain fields expected from Vercel include:

- `schema`: `vercel.analytics.v2`
- `eventType`: `pageview` or `event`
- `eventName`
- `eventData`
- `timestamp`
- `projectId`
- `ownerId`
- `sessionId`
- `deviceId`
- `origin`
- `path`
- `referrer`
- `queryParams`
- `route`
- country/device/browser fields

## Drop-Off Logic

Emit `lf_dropoff_point` when one of these happens:

- The visitor closes or leaves after answering at least one question.
- A quiz step remains active beyond the timeout bucket.
- A required consent module is viewed but no accept/decline action occurs.
- A form validation error repeats twice on the same step.
- A visitor returns to a previous branch and exits without completing.

Allowed buckets:

- `time_on_step_bucket`: `0_15s`, `16_45s`, `46_120s`, `2_5m`, `5m_plus`.
- `completion_percent`: integer bucket rounded to nearest 10.

## KPI Layer

Primary KPIs:

- Quiz activation rate: `lf_quiz_started / lf_page_view` for eligible intake routes.
- Form completion rate: `lf_form_completed / lf_quiz_started`.
- Permissioned lead rate: `lf_consent_accepted / lf_quiz_started`.

Drivers:

- Question completion by step.
- Branch conversion by vertical.
- Seller selection rate.
- Drop-off rate by step and consent surface.

Guardrails:

- Raw PII leakage to Vercel must remain zero.
- Buyer export count must never exceed active consented entitlement count.
- ADMT opt-out profile count in `scoreable_profiles` must remain zero.
- Drain parse/signature failures should be monitored weekly.

## QA Checklist

- Verify `Analytics beforeSend` redacts token, email, phone, order, and session query params.
- Verify `/admin`, `/api`, `/dashboard`, `/login`, `/signup`, `/onboarding`, and `/profile` paths are not sent as detailed Vercel URLs.
- Verify custom Vercel events only use `lf_` anonymous event names.
- Verify Supabase `behavioral_events` insert policies still require source/admin access.
- Verify Vercel drain endpoint rejects missing or invalid `x-vercel-signature`.
- Verify no raw answer text appears in Vercel Events, Vercel Drains, runtime logs, or `behavioral_events.event_payload`.

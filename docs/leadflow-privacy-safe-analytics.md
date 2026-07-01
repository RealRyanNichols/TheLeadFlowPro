# LeadFlow Privacy-Safe Analytics

The LeadFlow Pro analytics rule is simple: track funnel movement, not raw people.

All frontend events must go through `trackLeadFlowEvent` or `trackEvent` from `src/lib/events`. The helper sanitizes the event name and properties before sending anything to Vercel Analytics or the internal `/api/leadflow/events` endpoint.

## Tracked Funnel Events

- Homepage: `homepage_viewed`, `hero_cta_clicked`, `buyer_lane_clicked`, `system_lane_clicked`, `submit_source_lane_clicked`
- Marketplace: `marketplace_viewed`, `marketplace_filter_changed`, `listing_card_clicked`, `listing_preview_opened`, `sample_request_started`, `sample_request_submitted`, `access_request_started`, `access_request_submitted`, `watchlist_added`
- Tools: `tools_hub_viewed`, `tool_card_clicked`, `questionnaire_started`, `questionnaire_step_completed`, `questionnaire_completed`, `result_viewed`, `consent_given`, `contact_request_submitted`
- Submit source: `submit_source_viewed`, `source_submission_started`, `source_submission_step_completed`, `source_file_uploaded`, `source_submission_completed`, `source_submission_flagged`
- Buyer portal: `buyer_login_started`, `buyer_login_completed`, `buyer_dashboard_viewed`, `buyer_profile_updated`, `buyer_request_viewed`, `buyer_export_started`, `buyer_export_completed`
- Admin: `admin_dashboard_viewed`, `admin_table_filtered`, `admin_profile_reviewed`, `admin_source_reviewed`, `admin_buyer_request_reviewed`, `admin_export_created`, `admin_suppression_resolved`

## Allowed Properties

Allowed properties are operational only:

- `route`
- `cta`
- `listing_id`
- `profile_id`
- `source_id`
- `buyer_request_id`
- `vertical`
- `category`
- `score_range`
- `confidence`
- `status`
- `tool_slug`
- `step_number`
- `request_type`
- `user_role`
- `access_level`

Short scalar values are allowed when they are useful for funnel analysis and are not personal, sensitive, or raw answer text.

## Blocked Properties

The sanitizer strips keys that include:

- `email`
- `phone`
- `name`
- `first_name`
- `last_name`
- `address`
- `street`
- `ssn`
- `dob`
- `raw_answer`
- `message`
- `notes`
- `medical`
- `health`
- `race`
- `religion`
- `sexual_orientation`
- `exact_income`
- `bank_account`
- `credit_card`
- `password`
- `token`

The sanitizer also drops long free-text strings, email-like values, phone-like values, address-like values, SSN-like values, card-like values, and token-like values.

## Persistence

Vercel Analytics receives sanitized custom events for lightweight product telemetry.

Supabase receives the same sanitized event through `/api/leadflow/events`, which writes into `leadflow.events`. The server route sanitizes again, resolves `user_role` when possible, stores a harmless anonymous session envelope, and does not store raw form answers or raw lead records.

The admin funnel summary lives at `/dashboard/analytics` and reads from `leadflow.events`.

## Database Rules

The additive migration `20260701220000_leadflow_privacy_safe_funnel_events.sql` adds:

- `route`
- `auth_user_id`
- `user_role`
- route, role, and JSON indexes
- a stricter public insert policy for `leadflow.events`
- explicit grants for Data API access

Detailed event rows stay internal. Public users do not get a public read policy.

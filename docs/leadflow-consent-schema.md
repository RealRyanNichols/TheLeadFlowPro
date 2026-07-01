# Lead Flow Pro Consent Data Schema

Migrations:

- `supabase/migrations/20260701000000_leadflow_consent_data_platform.sql`
- `supabase/migrations/20260701002500_leadflow_add_admt_opt_out_scope.sql`
- `supabase/migrations/20260701003000_leadflow_rls_consent_hardening.sql`

Tests:

- `supabase/tests/leadflow_rls_consent_policy_tests.sql`

Related architecture:

- `docs/leadflow-analytics-event-taxonomy.md`
- `docs/leadflow-predictive-models.md`
- `docs/leadflow-marketplace-routing.md`
- `docs/leadflow-compliance-copy.md`

## Scope

This schema creates a private `leadflow` schema for a consent-based questionnaire and lead-routing platform. It separates anonymous telemetry, identified profiles, consent, seller entitlements, scoring, exports, suppression, and DSAR workflows.

The security model assumes first-party intake with explicit permission modes:

- Single-seller routing.
- Named multi-seller routing.
- Anonymous or aggregate insights.
- Source/admin operations.
- Suppression, deletion, do-not-contact, do-not-sell/share, and ADMT opt-out.

## Tables

- `partner_accounts`: tenant accounts for quiz owners, lead buyers, and named sellers.
- `identities`: anonymous and known identities, including anonymous-to-known stitching and merge tracking.
- `profiles`: normalized first-party preference profiles.
- `consent_ledger`: append-first consent records by scope, seller, channel, notice, and provenance.
- `questionnaires`: tenant-owned questionnaire definitions.
- `question_versions`: versioned question schemas and consent-copy snapshots.
- `answers`: answer records with provenance, consent pointer, source context, and retention metadata.
- `behavioral_events`: anonymous and identified product telemetry.
- `derived_features`: engineered features derived from answers and events.
- `score_runs`: scoring job metadata.
- `scores`: predictive scores with feature snapshots and explainability payloads.
- `partner_entitlements`: explicit buyer access grants for routed leads.
- `suppression_requests`: do-not-contact, do-not-sell/share, ADMT opt-out, and revocation records.
- `dsar_requests`: privacy requests for access, deletion, correction, ADMT opt-out, sale/share opt-out, and do-not-contact.
- `audit_log`: redacted append-only audit trail.
- `exports`: tracked exports with entitlement references and checksums.
- `webhooks`: partner webhook endpoints.

## RLS Policy Model

All leadflow tables have RLS enabled, forced, and no `anon` grants. `authenticated` grants are explicit and still require a matching RLS policy.

Policy groups:

- Platform admins: `leadflow.is_platform_admin()` checks Supabase JWT `app_metadata`, not user-editable metadata. Admins can inspect operational rows across tenants.
- Source partner users: `leadflow.can_access_partner()` limits access to the partner owner or team members.
- Buyer partner users: buyer access requires active `partner_entitlements` plus active named consent in `consent_ledger`.
- Raw answers: `answers` is source/admin only. Buyers get profile and score summaries, not raw answer rows.
- Suppression: buyer lead/profile/score access is blocked when an active identity, email-hash, or phone-hash suppression exists.
- ADMT opt-out: scoring writes and the `scoreable_profiles` view are blocked when a DSAR, suppression row, or revoked ADMT consent indicates opt-out, even when the scoring row only includes `profile_id`.
- Deletes: partner-facing views exclude `deleted_at`, `hard_deleted_at`, and suppressed profiles. Platform admins can still inspect soft-deleted operational rows until hard deletion.
- Deny-by-default: there are no public policies and no partner-facing `delete` policies.

## Views

- `leadflow.exclusive_leads`: `security_invoker = true`; active exclusive single-seller entitlements only.
- `leadflow.named_partner_leads`: `security_invoker = true`; active named-partner entitlements only.
- `leadflow.scoreable_profiles`: `security_invoker = true`; scoring jobs should read from this to exclude deleted, suppressed, and ADMT-opted-out profiles.
- `leadflow.aggregated_insights`: aggregate-only insight view with a minimum k-threshold of five profiles. It intentionally exposes no identity ids, profile ids, raw answers, or raw event payloads.

Production note: for a marketplace-grade aggregate product, prefer a generated aggregate table or materialized view with its own entitlement policies. The current view is useful for MVP validation but should be reviewed before broad Data API exposure.

## Helper Functions

The hardening migration uses small boolean helper functions for entitlement, consent, suppression, and ADMT checks.

Most helpers are `security invoker`. A few suppression/consent predicates are `security definer` so RLS can answer yes/no questions without exposing suppression, DSAR, consent, or entitlement rows to buyer partners. Those functions live in the non-public `leadflow` schema, default routine access is revoked, and execute grants are added explicitly for `authenticated` and `service_role`.

## Index Strategy

The migration includes:

- Tenant and stage indexes on identity/profile records.
- Partial unique indexes for active anonymous id, email, and phone per partner.
- Consent lookup indexes by partner, identity, scope, buyer, and effective date.
- GIN indexes on answer and event JSON payloads.
- Score indexes for latest/high-intent lookups.
- Entitlement indexes for buyer console and route enforcement.
- Suppression hash indexes for fast opt-out enforcement.
- DSAR due-date indexes for compliance queues.
- Audit object and partner-time indexes.

## Test Coverage

`supabase/tests/leadflow_rls_consent_policy_tests.sql` verifies:

- Named buyer can see consented named-partner leads.
- Unrelated partner cannot see identified lead/profile rows.
- Buyers cannot see raw answers.
- Source partner can see its own raw answers.
- K-thresholded aggregate insights are non-personal.
- Deleted routed profiles disappear from buyer views.
- Suppressed routed profiles disappear from buyer views and buyer scores.
- ADMT-opted-out profiles are excluded from scoring and profile-only score inserts.
- Platform admin can inspect cross-tenant operational rows.

## Retention Notes

Use row-level retention metadata:

- `retention_category`
- `retention_days`
- `deleted_at`
- `delete_after_at`
- `hard_deleted_at`

Recommended workflow:

1. Soft-delete first by setting `deleted_at`, lifecycle stage where present, and `delete_after_at`.
2. Stop routing/export immediately after `deleted_at` or suppression effective time.
3. Hard-delete child data before parent identities.
4. Keep `audit_log` redacted. Do not store raw answers, raw PII, or secrets in audit rows.
5. Keep suppression records longer than marketing data so opt-outs remain enforceable.
6. Treat ADMT opt-out as both a `dsar_requests` row and a consent/suppression state change.

## Deployment Notes

Apply this to a Supabase development branch first, then run:

- `supabase db advisors`
- `supabase migration list --linked`
- `psql "$SUPABASE_DB_URL" -f supabase/tests/leadflow_rls_consent_policy_tests.sql`

The local repo environment used to create these migrations did not have an authenticated Supabase CLI, `psql`, or a linked dev database available, so the SQL was statically validated locally but not executed against a live project.

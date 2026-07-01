# LeadFlow Pro Lead Signal Schema

Migration: `supabase/migrations/20260701100000_leadflow_lead_signal_system.sql`

This migration adds the canonical lead signal system on top of the existing
`leadflow` private schema. It is additive: existing consent-platform tables are
kept, and compatibility columns are added where older table names already exist.

## Access Model

| Table | Access class | Notes |
| --- | --- | --- |
| `anonymous_sessions` | Public insert-only | Browser can create anonymous session envelopes. No public read/update/delete policy. |
| `responses` | Public insert-only | Browser can create unscored, unidentified response envelopes. Raw answers are not public inserts. |
| `events` | Public insert-only | Anonymous event stream only. Policy rejects obvious PII keys such as `email`, `phone`, `name`, and `raw_answer`. |
| `marketplace_listings` | Buyer-visible summary | Authenticated buyers can read approved, unsuppressed listings. These are marketplace summaries, not raw profiles. |
| `buyer_accounts` | Buyer-owned | Buyers can read/update their own account. Admins can manage all. |
| `buyer_requests` | Buyer-owned | Buyers can create and manage their own sample/access requests. |
| `lead_profiles` | Entitlement-gated buyer-visible | Buyers can read only approved profiles covered by active entitlement, active consent when attached, and no suppression. |
| `lead_scores` | Entitlement-gated buyer-visible | Buyers can read approved score rows only when they can access the lead profile. |
| `source_proofs` | Entitlement-gated buyer-visible | Buyers can read approved source proof rows only when they can access the lead profile. |
| `partner_entitlements` | Buyer-visible own grants | Buyers can read only their active entitlements. Admins grant/revoke. |
| `exports` | Buyer-visible own exports | Buyers can read their own export records. Export creation remains admin/service controlled. |
| `answers` | Private by default | Buyers can read only if the answer row is `approved_for_buyer = true` and the entitlement has `raw_answers_approved = true`. |
| `identities` | Admin-only/private | Identity stitching and contact hashes are not buyer-facing. |
| `questionnaires` | Admin-only/private | Admin-managed tool definitions and review status. |
| `questionnaire_versions` | Admin-only/private | Versioned question and disclosure snapshots. |
| `questions` | Admin-only/private | Atomic question configuration, tags, and scoring hints. |
| `consent_ledger` | Admin-only/private | Permission proof. Buyer profile access uses it through RLS predicates, not direct buyer reads. |
| `suppression_requests` | Admin-only/private | Used by RLS predicates to block profile access and exports. |
| `audit_log` | Admin-only/private | Trigger-written audit trail for approvals, exports, suppressions, and buyer grants. |

## RLS Rules

- Every requested table has RLS enabled and forced.
- Admin policy uses `leadflow.is_platform_admin()` from JWT `app_metadata`.
- Public insert policies exist only for `anonymous_sessions`, `responses`, and `events`.
- Buyer policies require buyer account membership plus entitlement where profile-level data is involved.
- Raw answers require both row approval and entitlement approval.
- Suppressed profiles are excluded by `leadflow.lead_profile_has_active_suppression()`.

## Audit Events

The trigger `leadflow.audit_lead_signal_change()` writes to `leadflow.audit_log`
for:

- `lead_profile.approved`
- `export.created`
- `export.updated`
- `suppression.created`
- `suppression.updated`
- `buyer_access.granted`
- `buyer_access.updated`

## Data Separation

Anonymous analytics lives in `events` and `anonymous_sessions`.
Identified lead data lives in `identities`, `responses`, `answers`,
`lead_profiles`, `consent_ledger`, and related review tables.

Client analytics must not send emails, phone numbers, names, or raw free-text
answers into `events`.

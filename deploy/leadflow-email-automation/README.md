# LeadFlow email automation: disabled review package

This is a proposed DigitalOcean-local sender for one explicitly consented
30-message campaign. It is **not deployed, connected, activated, or sending**.
The local folder is a temporary build/review artifact. The intended runtime,
private records, logs and backups belong on the existing DigitalOcean droplet.

No package installation is needed: Python 3.11+ and its standard library.
No existing Meta, Quo, Mailgun, brain, CRM, Resend automation, DNS, Caddy, or
systemd configuration is changed by these files. `sequence.json` is review copy.

## What this package does

- SQLite holds only consent/enrollment, frozen message payload, delivery,
  suppression and audit records. It does not create a general CRM or copy the
  existing lead database. References retain the original source and lead ID.
- Import requires an allowlisted form, immutable source lead ID, explicit
  optional email consent covering one email daily for 30 days, exact reviewed
  notice, evidence ID/version and timestamp. No retrospective opt-in is inferred.
- Day 1 is at least 24 hours after enrollment. New steps run in the **10am hour
  America/Chicago**, at most one successful send per 24 hours, with no catch-up
  bursts. Schedule once per minute. Acceptance seconds can shift the next
  send slightly past 10:00. A missed window or spring DST can skip a date to
  preserve the 24-hour minimum. The sequence is 30 messages, not a guarantee
  that every calendar date receives a message.
- Each step freezes its full Resend request body and idempotency key before
  the first attempt. Atomic SQLite claims prevent overlapping workers from
  advancing the same step. Retry cadence is at least 30 minutes; attempts
  stop after 23 hours. Uncertain delivery then pauses for operator review.
- `accepted` means Resend accepted the API request, not inbox delivery.
  Absolute distributed exactly-once delivery cannot be guaranteed. The ledger
  plus Resend idempotency prevents automatic duplicate requests within the
  retry window; it never blindly retries ambiguous requests outside that window.
- The public GET unsubscribe route shows confirmation only; POST suppresses all
  enrollments for the address. Scanner visits do not unsubscribe a person.
- Resend event verification uses the unmodified body, Svix HMAC SHA256, constant
  time comparison, timestamp tolerance of five minutes, and durable event IDs.
  Permanent bounce, complaint, suppression and contact opt-out stop this series.
  A suppression removal never grants consent or resumes an enrollment.
- Reply, booking and purchase pauses are **authorized local CLI actions**.
  Automatic integrations for them are not installed. Existing brain `mail_reply`
  and `mail_event` tables belong to another workflow and are not queried here.
- Unsubscribe committed before a send wins. SQLite serializes the short provider
  attempt with suppression writes. An already in-flight email cannot be recalled.

## Review locally, without contacting anyone

Run from this directory:

```sh
python3 -m unittest -v test_worker.py test_meta_import.py
```

For the CLI, copy `config.example.json` to a separate private review config and
change only `sequence_path` to this folder's sequence.json and `db_path` to a
temporary empty review ledger. Keep `enabled: false` and all readiness flags
false. No real records are needed. Then:

```sh
python3 worker.py --config /absolute/path/review-config.json check
python3 worker.py --config /absolute/path/review-config.json preview /absolute/path/preview.json
python3 worker.py --config /absolute/path/review-config.json run
```

`preview` uses only a synthetic recipient and an unusable example.invalid opt-out
URL, requires no secrets, and sends nothing. `run` without `--send` reports
readiness/counts only. `check` outputs the sequence hash and remaining blockers.
The provided static `sequence-preview.html` is also safe to review offline.

## Required decisions before any activation

1. Inspect `/opt/brain`, `/opt/leadflow-intake`, and existing timers on the droplet.
   The repository audit was pinned to GitHub main
   `1f330d790f6539f62bb6ac3ca60cae327633dfe2`; that is not proof of the deployed
   release. Existing brain Mailgun sender is a separate business workflow.
2. Review the sequence and provide the correct business mailing address. Keep
   any Fieldy/Notion source summaries attributed, dated and separate from
   consent. Source notes never authorize messages.
3. The new draft ad's form is now **2206768963231960**,
   `LFP | Schools + Coaching + Events | Callback + Email Choice | v2`.
   Its exact optional question and affirmative label/key are pinned in
   `meta_import.py` and the example config from the verified Graph metadata.
   **Do not allowlist callback-only form
   1319841020086334**, change its consent flags, or import old leads. Preserve
   existing campaigns and provider automations.
4. Agree who initializes and schedules the disabled new-form importer and how
   lead/consent updates reach the ledger. It has no public enrollment endpoint,
   CRM importer or historical backfill. `form-registry.proposed.patch` is a
   separate, unapplied proposal for callback admission in the existing site;
   both inferred marketing and SMS permission remain false there. The new form
   is not added to the old thirty-day email allowlist.
5. Reconcile existing business email suppressions before enabling. The new local
   ledger is not yet a shared suppression service for every older sender.
6. The main operator confirmed the correct LeadFlow domain and delivered a
   provider-test email using the existing scoped send credential. The package
   still has `sender_verified: false` until its exact runtime is configured.
   Reuse that credential privately. Do not rotate it or
   print/copy it into chat. The worker includes a User-Agent for provider access.
7. Configure and verify a Resend webhook for `email.bounced`, `email.complained`,
   `email.suppressed`, `suppression.added`, and `contact.updated`. Events use
   `data.to` for email events and `data.email` for contact/suppression events;
   verify actual fixture shapes for the connected account before marking ready.
8. Arrange authorized reply/booking/purchase pauses. Do not claim this connection
   is automatic until the existing systems supply those pause commands safely.
9. Approve final copy first (`approved_for_sending: true`), then set the matching
   canonical sequence SHA256 in private config **before** importing live consent.
   Each enrollment freezes the exact sequence. Changing copy requires an explicit
   reviewed version; never silently replace payloads for an existing enrollment.

## Proposed private DigitalOcean staging/deployment

Stage a reviewed version under `/opt/leadflow-email-automation/releases/<version>`
without changing current services. Run the tests there. The proposed live symlink
is `/opt/leadflow-email-automation/current`; ledger path is
`/var/lib/leadflow-email-automation/ledger.sqlite3`. These are new proposed paths,
not claims that a current server installation exists.

Use a dedicated unprivileged `leadflowemail` account with access only to this
program and state directory. Directories 0700, files 0600, umask 0077; the database
contains email addresses and must not be publicly served. SQLite WAL files also
contain private data. Keep state on local disk, not a network filesystem. Use
SQLite's online backup API or stop both worker and webhook service before copying
the database and WAL; never treat a casual database-file copy as a valid backup.

Private config: `/etc/leadflow-email-automation/config.json`.
Private environment: `/etc/leadflow-email-automation/worker.env`, provided by an
authorized server operator using existing credentials and new local signing keys:

```text
RESEND_API_KEY=<existing LeadFlow send credential, supplied privately>
LFP_EMAIL_UNSUBSCRIBE_SECRET=<new stable random secret, minimum 32 characters>
RESEND_WEBHOOK_SECRET=<signing secret from this Resend webhook endpoint>
```

These are names/placeholders only. Never put real values in this repository.
Keep the unsubscribe key stable and backed up; key rotation requires a reviewed
verification key ring to preserve already delivered links. The package currently
supports one unsubscribe key, so do not rotate it casually.

The included systemd units are **templates only**. Do not install or enable them
as part of review. The worker requires both `run --send` and all readiness gates;
the default config still refuses to send even if the template is started.
The webhook service binds only `127.0.0.1:8817`. A separately reviewed Caddy
route would proxy `/automation-email/*` to that listener over existing HTTPS.
Confirm route/port ownership and external POST behavior before setting
`webhook_ready: true`. Do not expose an admin/import endpoint.

Enable only after confirming exactly one scheduler owns this campaign and all
readiness flags, consent records, source evidence and sequence hash are correct.
This campaign must not also enter the old app or Resend `free-build-lead` sender.
Disabling this worker must not disable the unsubscribe/webhook listener.

## Authorized local operations after installation

Commands act only on this ledger. Input files must stay private on the droplet.

```sh
python3 worker.py --config /etc/leadflow-email-automation/config.json import /private/verified-consent.json
python3 worker.py --config /etc/leadflow-email-automation/config.json pause ENROLLMENT_ID reply
python3 worker.py --config /etc/leadflow-email-automation/config.json pause ENROLLMENT_ID booking
python3 worker.py --config /etc/leadflow-email-automation/config.json pause ENROLLMENT_ID purchase
python3 worker.py --config /etc/leadflow-email-automation/config.json pause ENROLLMENT_ID consent_withdrawn
python3 worker.py --config /etc/leadflow-email-automation/config.json suppress /private/suppression.json
python3 worker.py --config /etc/leadflow-email-automation/config.json status
```

Consent input shape (illustrative only; the example is deliberately not allowed):

```json
{
  "source": "meta_lead_ad",
  "source_lead_id": "IMMUTABLE_PROVIDER_LEAD_ID",
  "email": "example@example.invalid",
  "first_name": "there",
  "consent": {
    "granted": true,
    "channel": "email",
    "daily_for_30_days": true,
    "form_id": "NEW_REVIEWED_FORM_ID",
    "notice_text": "EXACT_OPTIONAL_NOTICE_SHOWN",
    "notice_version": "v1",
    "evidence_id": "IMMUTABLE_SUBMISSION_OR_CONSENT_EVIDENCE_ID",
    "granted_at": "2026-09-28T10:00:00-05:00"
  }
}
```

Suppression input is `{"email":"example@example.invalid","reason":"prior_opt_out"}`.
There is deliberately no resume, unsuppress, force-send, or reset-history command.
Resolve ambiguous provider delivery by comparing provider message records to the
frozen ledger/key, never deleting the claim and trying again.

For rollback: disable the **new** send timer or set `enabled: false`; preserve
the ledger, sequence versions, signing key and unsubscribe/webhook listener.
No existing service is part of this rollback.

## Verification references

- Resend raw-body verification: https://resend.com/docs/webhooks/verify-webhooks-requests
- Svix manual algorithm and independent signature test vector: https://docs.svix.com/receiving/verifying-payloads/how-manual
- Resend event types: https://resend.com/docs/webhooks/event-types

Tests include the published Svix vector, not only signatures generated by our own
implementation. Tests use a temporary ledger and loopback HTTP, never Resend.

## New-form-only Meta importer (disabled)

The importer uses the existing `META_PAGE_ACCESS_TOKEN` only through private
environment configuration. It derives the Page token in memory when available,
checks Page identity and that the new form belongs to that Page, and fetches only
that form's lead records. It never calls subscription, ad, budget or write APIs.
No credential is copied into this package. Meta app subscription currently needs
the operator's asset-admin permission; the signed empty callback test establishes
route authentication only, not real lead delivery. Keep the ad draft until its
intake is verified.

Only these two exact representations count as affirmative consent:

- `Yes, email me the 30-day series.`
- `yes,_email_me_the_30-day_series.`

They must come from the exact verified question key. Missing, declined, unknown,
duplicate-field, multiple-answer, callback-only or pre-checkpoint submissions do
not enroll. No phone consent is inferred. No email is sent by import.

These proposed commands are deliberately separate:

```sh
# No fetch or import; reports the disabled configuration.
python3 meta_import.py --config /etc/leadflow-email-automation/config.json
# Authorized local initialization: records NOW, never a historical timestamp.
python3 meta_import.py --config /etc/leadflow-email-automation/config.json --initialize
# Explicit read-only provider fetch; counts only, no recipients printed.
python3 meta_import.py --config /etc/leadflow-email-automation/config.json --fetch
# Future authorized import, only after meta_import.enabled is deliberately true.
python3 meta_import.py --config /etc/leadflow-email-automation/config.json --fetch --apply
```

Configure `campaign_start_at` at activation. Both this timestamp and the immutable
initialization checkpoint apply, with the later one winning. A repeated init does
not reset history. Stop on an incomplete paginated response; no partial batch
enrolls. The current bounded importer reads at most five pages per run and does
not follow provider-supplied next URLs. Higher volume requires reviewed cursor
handling; do not increase limits or reset history to bypass a stopped import.

No importer timer is installed. A future one must be separately reviewed, use
only this ledger, and remain distinct from the legacy Meta callback/owner-alert
pipeline. Before live import, finalize sequence approval/hash; an enrollment
freezes the sequence version and cannot silently switch when copy changes.

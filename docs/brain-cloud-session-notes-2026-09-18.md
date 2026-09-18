# Central brain: what a cloud session can and cannot reach

Written September 18, 2026 after a Claude Code cloud session was handed
the droplet handoff and could not run it. Read this before pasting a
droplet handoff into a cloud session again.

## What the droplet handoff assumes

The handoff opens with `ssh -i ~/.ssh/leadflow_do root@<droplet>` and
then curls the brain's API on `127.0.0.1:3000`. That works from Ryan's
Mac, where the key lives. It does not work from a cloud session:

- The cloud container has no `ssh` binary and no key.
- Outbound HTTPS goes through an egress proxy. The brain's sslip.io host
  answered 403 (policy denial). The proxy README says not to retry or
  route around a policy denial.
- The `The_LeadFlow_Pro` MCP server in the cloud session is the plugin
  workspace for a test business ("Test Plumbing"). It is not the brain.

So a cloud session cannot read the brain's docs, its `/api/brief`, or
its `sync_run` table, and cannot deploy anything under `/opt/brain`.
Every item in the droplet build queue (Google Workspace, the Wholesale
Universe campaign, note push back, analytics collector, posting engine,
offers KPI, Build It Back, affiliates) is droplet work and must run
from a session that holds the key.

## What a cloud session can reach

- **Supabase MCP.** Both source projects the brain syncs from are
  visible by ref: Premier Dental Academy (`lmbsuwslsycukynzpzik`) and
  The LeadFlow Pro (`hpzpwfymwfgwspaixrxi`). Read and write SQL both
  work. The same connector also lists projects that are outside the
  brain's data boundary (legal and personal projects). Never query
  those from brain work.
- **Quo MCP.** Both lines: The LeadFlow Pro and Premier Dental Academy.
  Messages, call transcripts, missed calls, contacts and tasks. Call
  transcripts are the only record that shows whether an inbound call
  was actually answered (see the scoring finding below).
- **GitHub** for this repo, on the assigned branch only.

That is enough to rebuild the "who raised their hand" list from the
sources, verify it against the phone record, and put callbacks on the
right person's phone as Quo tasks. It is not enough to touch the brain.

## If cloud sessions should be able to read the brain

Ryan's decision, not a session's. Two changes would do it:

1. Add the brain's HTTPS host to the cloud environment's network
   allowlist (claude.ai environment settings). Once the
   `brain.theleadflowpro.com` A record exists, allow that host rather
   than the sslip.io name.
2. Provide the brain API token to the cloud environment as an
   environment variable. That token is a secret. Ryan pastes it; no
   session types it.

SSH from the cloud is not recommended. A private key in a cloud
environment is a production secret on a machine Ryan does not control.

## Finding: the brain marks answered calls as unanswered

On September 18 the brain's ranked list said four dental leads had
"reached out twice" with no callback. Checked against Quo transcripts:

- One had a five minute call with Amanda three days earlier, agreed to
  come in and pay a deposit, and then filed the full application.
- One had walked in for a tour two days earlier. Amanda answered her
  call from the parking lot.
- One was in a live text thread with Amanda the day before.
- Only one was genuinely owed a callback.

Root cause: PDA's `communications` table logs inbound calls as
`[Call]` with a null `duration_seconds`, even when the call was
answered and ran five minutes. Outbound calls do carry a duration. The
brain's sync reads that table and treats "inbound call, no duration,
no outbound after it" as unanswered.

Fix in two places:

- `/opt/brain/sync.js`: treat an inbound call as connected when Quo
  has a completed transcript for it, or when any outbound activity
  follows it within the same day. Quo's `fetch-call-transcripts`
  returns duration and transcript per call.
- PDA's Quo webhook: write `duration_seconds` on the call completed
  event, not only on call started.

Until both are fixed, verify every "nobody called back" claim against
Quo before putting it on someone's phone.

## Finding: LeadFlow Meta lead volume has no human first touch

As of September 18 the LeadFlow CRM held about forty Meta lead ad
submissions since September 7 with status `new`, no call, no text and
no note. Twelve arrived on September 17 alone. Every one chose text as
the best contact method. Only the automated email drip has gone out.

`sms_consent` is false on all of them because the Meta form has no
consent field, so no automation may text them. A personal one to one
text from the LeadFlow line in reply to a form that asked for text is a
human decision. It is not made here.

## What this session wrote, so it is not done twice

- Eight Quo tasks on September 18, four on each line, each with the
  verified timeline and a draft first text. Assigned to Ryan on the
  LeadFlow line and to Amanda on the PDA line.
- In the LeadFlow CRM: a `lead_notes` row with `author = 'brain'`, an
  open `lead_tasks` row, a priority flag and a same day
  `next_follow_up_at` on the three LeadFlow leads that were owed a
  human touch.
- Nothing was sent to any lead. No text, no email, no call.

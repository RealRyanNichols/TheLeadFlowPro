# Lanes: who builds what, so nothing is built twice

Written October 7, 2026, from a read of the brain repo, this repo's droplet
docs and unmerged branches, the Fieldy record (Sep 19 to Oct 5), Notion and
the live systems (read only). Every line is labeled the way the handoffs
are: FACT (a file, a commit, a database row), RYAN STATEMENT and PAT
STATEMENT (a recording, speaker from context), DOCUMENTED INFERENCE, NEEDS
AUTHENTICATION. Business content only.

This file is the one place both sides look before building. Pat's bots,
Ryan's other Claude sessions, and this build session each own lanes below.
A lane changes hands only by a pull request that edits this file.

## The rule Ryan set on October 7

RYAN STATEMENT (Oct 7, to the build session): the admin section on the
droplet "has been greatly updated since then... continue to build within
it, but do not delete anything that Pat has done. We just want to continue
building with what's already there in the DigitalOcean droplet, for the
command center on The LeadFlow Pro in the admin section."

What that means in practice:

1. The droplet checkout of this site (`/srv/sites/leadflow` on
   `leadflow-web`) is the base for `/admin/*`. Whatever it carries that
   GitHub does not is kept, line for line.
2. This build session's board (PR #121, PR #122, merged to `main` Oct 6)
   is layered on top of that base, never the other way around. Where the
   two changed the same file, the droplet's version wins and the board's
   panels are re-added as additions.
3. Nobody releases `origin/main` onto the droplet until the two are joined.
   A plain `leadflow-release` builds `origin/main`, which does not have the
   droplet's admin work, and would replace it. The runbook written Oct 6
   said to run it; that instruction is withdrawn until the join is done.

## Where things stand (FACT, checked Oct 7, read only)

| What | State |
| --- | --- |
| Live site `www.theleadflowpro.com` | `/api/health` reported `8f96f9ca` on Oct 7 and `dc124190cfe7ce3da6e30ae0c23f7edda4913fb2` by 00:55Z on Oct 8. Neither is on any branch or tag in this repository, and neither were `232976c` and `071f4c7` on Oct 6. Somebody is releasing local commits from the droplet checkout about daily. |
| `origin/main` | `922a7f3` (Picture Studio, Oct 6 evening), on top of `59119f0` (PR #122, the board and the cash ledger). |
| Open pull requests | #123 "Next actions" (another Claude session, PDA GitHub account, Oct 7): a read-only `/admin/sales/next-actions` page, follow-up plan, scripts, scorecard. Its own description says the same thing this file says: join the droplet copy first, then release. #119 (orphan-page QA, Oct 4). |
| The droplet's brain | `/opt/brain` (Call Desk at the root, `/command` dated Oct 3, `/ads`, `/fieldy`, a daily CRM sync). Its code is on no GitHub repository; `RealRyanNichols/brain` on GitHub is a different, Aug 29 application. The CRM sync writes a daily batch (newest event Oct 6 16:20Z); the reasoning cycle last ran Aug 29. |
| The LeadFlow Hub | `hub.165-227-248-110.sslip.io/hub/`, login-gated, droplet-only code, no named owner. |
| `leadflow-release` and its guard | Droplet-only. "Another session set this pipeline up" (CLAUDE.md). Whether Pat's Codex wrote it: NEEDS AUTHENTICATION. |
| Pat's GitHub identity | No commit or pull request in this repository is by a Pat-identified account. Pull requests from the `PremierDentalAcademyofLongview` account are Claude Code sessions on Ryan's or Amanda's side. |

## The first action, before anything else is built

Push the droplet checkout to GitHub so both sides can read it. As root on
`leadflow-web`, read only except for the push:

```bash
cd /srv/sites/leadflow
git status --short
git log --oneline -5
git diff --stat origin/main HEAD
git push origin HEAD:refs/heads/droplet/live
```

The live commit keeps moving (`232976c` and `071f4c7` on Oct 6, `8f96f9ca`
on Oct 7, `dc12419` by 00:55Z on Oct 8), so push whatever `HEAD` is at the
time rather than a sha from this file; every one of those commits was on
no GitHub ref when checked.

If the checkout has uncommitted changes, commit them first on the local
branch so the push carries everything, and say so in the announcement. Once
`droplet/live` exists on GitHub, the build session merges `main` into it,
keeping the droplet's version of every file both sides changed, re-adds the
board's panels as additions, builds, tests, and opens the pull request
that becomes the next release. Pat's bots review it before it merges.

## The lanes

Owner names: **Ryan** (owner, approves everything outward); **Pat**
(sales partner, root on the droplet, Workspace super admin); **Amanda**
(Premier Dental Academy); **build session** (Claude working in this
repository by pull request); **other Claude sessions** (Ryan's parallel
sessions, usually under the PDA GitHub account); **unknown** (droplet-only
code with no named maintainer).

| Lane | Owner | Lives at | Rule |
| --- | --- | --- | --- |
| The site's code on GitHub (`app/`, `lib/`, `supabase/`, `docs/`) | build session and other Claude sessions, by PR; Ryan merges | `RealRyanNichols/TheLeadFlowPro`, `main` | Every change reaches `main` by PR. Pat's bots propose by PR from a named GitHub account; nobody commits to `main` directly. |
| The droplet checkout of the site and its local commits | Pat (root) | `/srv/sites/leadflow` on `leadflow-web` | The base for `/admin/*` per Ryan's Oct 7 rule. Pushed to `droplet/live` so it can be read; from then on, work on it goes through PRs too. |
| Releases (`leadflow-release`, the guard, `site@leadflow`) | whoever holds root (Pat); the pipeline's author owns the files | `/usr/local/bin/leadflow-release`, `/usr/local/lib/leadflow-build-guard.sh` | Only a full sha that is on GitHub is released. Every release is announced with the sha, `leadflow-release --status` output and the `/api/health` commit afterward. The build session writes runbooks and never runs releases. |
| The command center on the site (`/admin/command-center`, `/admin/sales/board`) | build session (code), on the droplet base | this repo | Owns every CRM-derived number and every door to a write (switches, plan sheet, cash entry). Adds panels; never removes what the droplet version has. |
| The brain's Command page and Call Desk | unknown (droplet-only); Pat uses it | `/opt/brain`, `https://165-227-248-110.sslip.io/` and `/command` | Keeps its ingestion views and ranking; links to the site board for anything that writes. Nobody builds a second money number or lead pool there. |
| Call notes | build session (table and views); Pat and Ryan (entries) | `lead_notes` in the site's database | The one record of what happened on a call. Every screen that logs a call on a LeadFlow lead writes there under the signed-in person's name. The brain reads it through its read-only role; if the brain writes notes again, it mirrors into `lead_notes` with `author='brain'`. |
| The LeadFlow Hub | unknown (droplet-only); Pat on the allowlist | `hub.165-227-248-110.sslip.io/hub/` | The per-business console (DNS pages, posting receipts, schedule, finance). The site's "Every business" panel links to Hub pages; the planned per-client ROI card reads the site's own rows (leads, proposals, ledger, per-workspace ad spend) and links to the Hub for the rest. |
| Timers and crons on the droplet | droplet root (Pat or Ryan) | systemd on `leadflow-web`: `leadflow-cron-*`, `leadflow-autopull`, `brain-sync`, `brain-fieldy`, `ads-brain`, `leadflow-main-posting`, `repwatchr-cron-*` | The droplet side owns timer state and posts `systemctl list-timers --all --no-pager` output here after any change. The site is the only thing that writes `leads` and `lead_*` or sends to a lead; the brain reads. No `leadflow-cron-*` timer is enabled without Ryan's OK and that listing. |
| Google Workspace for theleadflowpro.com | Pat (super admin `pat@` and `setup@`); Ryan decides scopes and keys | Workspace (created Oct 4), service account in progress | Pat administers. The site gets a separate least-privilege credential that Ryan names. No Workspace key is committed, emailed, or read from a shared file. |
| Meta app, ad account, ads | Ryan (account, app, budgets); Pat (copy, audiences, forms); build session (`lib/metaInsights.ts`, `app/api/ads-brain/pull`) | ad account under the LeadFlow business portfolio | One Meta app issues one read token that both the site's reader and the Ads Brain consume. Ryan alone decides whether that token sits in `leadflow.env`. Nobody creates a second app or changes scopes outside this lane. Ad changes are Ryan's. |
| Quo and Sona | Ryan (account, Sona); Pat (the caller); build session (`lead_calls`, `lead_messages` views) | Quo, the `quo-webhook` function, the site's tables | `lead_calls` and `lead_messages`, fed by the one webhook, are the single Quo record. The thread view on the call card is built from them. Pat's bots read Quo through the same record. |
| Stripe, Square, invoices | Ryan (accounts); Pat (sends invoices with proposals); Amanda (PDA's Square) | `/admin/sales/invoices`, `app/api/sales/invoices`, the Stripe webhook | One invoice writer: the Sales Desk invoice route, which the cash ledger already reads. No second invoice path on the droplet. Square stays PDA. Ryan names which Stripe account bills LeadFlow. |
| The cash ledger and money in | build session (code); Ryan (entries, approval) | `operator_verified_cash_entries`, `/admin/operator/cash` | The one money-in record. The brain's Business dashboard shows bank and forecast and links to it. Pat reports a payment by a FOR AGENTS block (`record_type: payment`); Ryan or an admin records it. |
| The database (hosted Supabase today; Postgres on the droplet by decision) | Ryan decides each phase; no phase owner named | `hpzpwfymwfgwspaixrxi`; `deploy/droplet/db.sh`; `docs/infrastructure/database.md` | Nobody runs phase A or moves a table until Ryan restates the Supabase decision in writing with a date (CLAUDE.md says retire; Ryan said "keep as is" on Oct 4). The brain's sync owner is in the loop by name for the phase that moves the CRM. |
| DNS and Caddy | Ryan (GoDaddy); droplet root (Caddy) | GoDaddy; Caddy on `leadflow-web` | DNS changes are Ryan-only. Caddy edits are root-only and announced naming the block. The build session never writes a runbook step that changes either. |
| Content posting and replies | Ryan (the droplet posting worker, the autoresponder, Content Command approvals); Pat (his own reply desk, location unknown) | `/opt/leadflow-main-posting`; `app/admin/content-command` | One posting identity per channel, one approver (Ryan). Pat's reply desk stays Pat's until he records where it runs and what token it uses. The board adds no posting features. |
| Email sends | build session and Ryan (the app's Resend series on `main`); Pat's Codex (PR #100, disabled); brain mail sender (disabled) | `lib/contractorSeries.ts`, `app/api/cron/*`, `lead_emails` | One sender per audience, named by Meta form id in `lib/metaCampaignGuard.ts`. One suppression list in the site's database. PR #100 stays disabled unless Pat names a form only it owns. |
| Lead intake forms, the form registry, dedupe | Pat (questions, consent wording, follow-up groups); build session (registry file, intake routes); Ryan (publishing forms) | `lib/metaCampaignGuard.ts`, `app/api/meta-leads/route.ts` | Pat writes questions by email; only PRs edit the registry; Pat's bots read Meta Lead Center and never insert leads. Dedupe lives in the site. |
| Proposals, the proposal host, signed scope | Pat (content, two-call close, `sites.theleadflowpro.com`); Ryan reviews; build session (the signed-scope record) | `/srv/sites/leadflow-proposals`; this repo for the record | Pat owns proposal content and host. The site owns the signed-scope row and the pay link. DocuSign is built only after Ryan names the template and sender, and every signed-scope row links to Pat's proposal page. |
| Calendar booking for call two | Pat (Workspace); build session (the call-card button, planned) | LeadFlow Workspace calendar | Exactly one writer. Until Pat records that his agent books, the site's button creates the event with the credential Ryan names. If Pat's agent books, the site only displays the event. |
| The Fieldy archive | Ryan (owner-only); Pat has his own device | `/fieldy` on the brain | Ryan's archive stays Ryan-only. A lead links to a transcript by recording id inside the brain, client calls only; nothing from Pat's device is shared until that filter is agreed in writing. |
| Premier Dental Academy | Amanda | its own repo, database and Square | Pat's PDA admin access is recorded with Amanda's OK before use. The build session touches PDA only through that repo's PRs. |
| RepWatchr | Ryan | `site@repwatchr` on the droplet | Paused at Pat's request Oct 5. Restarted or moved only with Ryan's recorded OK; the free-memory figure after any change is posted here for the release guard. |
| Pat's bots | Pat | unknown hosts | Registered below before they act on anything shared. |

## Overlaps that were checked, and the rule each got

Sixteen overlap claims were tested through two lenses (refute, and "is it
complementary"). None is two people shipping the same screen today. Each
got a rule that keeps it that way.

1. **Release source.** The live site runs commits that are not on GitHub.
   Rule: one release source, GitHub. The droplet checkout is pushed; after
   that, `leadflow-release` runs only on a sha reachable from a pushed
   branch, and a release from anywhere else is reported, not hidden.
2. **Two command screens.** The brain's `/command` and the site's board are
   not duplicates until their section lists are laid side by side; until
   then the split is: the site owns CRM-derived numbers and writes, the
   brain owns ingestion views and links to the site.
3. **Call notes.** `lead_notes` is the one record; the brain reads it.
4. **Meta credentials.** One app, one read token, Ryan's placement rule.
5. **Invoices.** One writer (the Sales Desk route); routing by account named
   by Ryan.
6. **Email senders.** One sender per audience, by form id, one suppression
   list.
7. **Calendar.** No writer exists yet on either side; the open item is
   scope, not duplication. One writer when one is built.
8. **Cost per lead.** The site is the only Meta reader and owner of the ad
   arithmetic; the brain's `/ads` is the watchdog and history.
9. **Client views.** The click-into-a-client view both partners asked for
   is unbuilt; the site owns per-client numbers from rows it writes and
   links to the Hub for the rest.
10. **Transcripts on the lead.** Split in two: `lead_calls` summaries on
    the call card (repo lane); recordings stay in the brain (droplet lane).
11. **The Supabase decision.** Written one way in CLAUDE.md, said another
    way on Oct 4. Ryan writes one dated sentence in CLAUDE.md, then here.
12. **Timers.** Before any site timer is enabled, the droplet listing is
    posted and no droplet worker does the same job.
13. **The form registry.** Edited only by PR, one PR per form launch.
14. **Daily briefs.** Today the site sends the NEW LEAD alert, the Monday
    digest and the morning call sheet (off); the brain's brief endpoint and
    OperatorOS's brief are the other two. One brief per audience, named
    here before another is built.
15. **Posting identities.** Inventory every token that can post to the
    LeadFlow Page before the Meta app Pat asked for is created.
16. **Pat's sales surfaces.** Pat has three (Sales Desk, the Call Desk, the
    new board) and his last note in the site's CRM is Sep 14 (FACT). The
    board was built for him; which screen is his record is his to say.

## The handshake

- **The lane map is this file.** Prose table above, machine-readable block
  below. A lane is claimed, changed or released only by a PR that edits
  this file, titled `lanes: <lane> -> <owner>`. Ryan or his named approver
  merges it. Two claims on one lane make it `contested`, and nobody builds
  in a contested lane until Ryan decides.
- **Announcing work.** Every start, ship, release, pause or payment is an
  email to `pat@theleadflowpro.com` and `hello@theleadflowpro.com`, subject
  `[LANES] <lane>: <state>`, with a FOR AGENTS block (format below).
- **A release record** carries the full sha, the `--status` output and the
  `/api/health` commit afterward.
- **Bot registration.** Any agent that acts on a shared system (droplet,
  CRM, Quo, Meta, Workspace, Stripe or Square, email, social) is registered
  in the table below before it acts. Names used in conversation but found
  nowhere in the repos, the database or Notion (Odin, Astra, Muse) are
  registered or dropped.
- **Pat's bots need a GitHub identity.** Pat names one account (his own or
  a bot account) here, so their PRs are recognizable.
- **Build session boundary.** It never touches droplet-only lanes (no SSH,
  no edits to `/opt/brain`, the Hub, `leadflow-release`, the guard, timers,
  Caddy, DNS, `leadflow.env`, RepWatchr, PDA). It ships code behind
  switches and writes runbooks that name a full GitHub sha.
- **Pat's bots boundary.** They never edit `app/`, `lib/`, `supabase/`,
  `worker/` or `docs/` on `main` without a PR; never insert leads, notes or
  tasks into the CRM outside the site's own routes; never create a second
  integration in a lane the map gives to the site.
- **What each side may read.** The build session reads the droplet only
  through what the droplet side posts here (timer listings, `--status`
  output, the pushed branch). Pat's bots read the repo, the site's
  read-only endpoints and the brain. Neither reads the other's secrets.
- **Approval gates that stay with Ryan**, recorded as `approved_by` and
  `approved_at` in the block: production releases, any change to
  `leadflow.env` or other secrets, real sends (email, SMS, posts, replies),
  ad changes (budget, scopes, apps, forms), payments and invoice
  configuration, DNS, timers, database phases, anything that touches live
  data.
- **Weekly reconciliation.** Once a week one side posts a `lane_update` for
  every lane. A lane with no announcement for 14 days goes to `unknown`.

### FOR AGENTS block

One key per line between the markers. Keys: `record_type` (`lane_update`,
`release`, `payment`, `request`, `bot_registration`, `answer`), `lane`,
`state`, `owner`, `repo`, `branch`, `sha` (40 characters), `deploy_state`,
`needs_from_other_side`, `approved_by`, `approved_at`, `sends`,
`writes_to_live_data`, `secrets_in_this_message` (always `none`).

```
--- FOR AGENTS (machine-readable) ---
record_type: lane_update
lane: command-center-site
state: shipped
owner: build session
repo: RealRyanNichols/TheLeadFlowPro
branch: main
sha: 59119f08ab70bd0324afc4411886f8d23bab53fe
deploy_state: not released
needs_from_other_side: push /srv/sites/leadflow to droplet/live
approved_by:
approved_at:
sends: none
writes_to_live_data: none
secrets_in_this_message: none
--- END FOR AGENTS ---
```

## Bot registry

| Name | Operator | Host | Reads | Writes | Status |
| --- | --- | --- | --- | --- | --- |
| Build session (Claude Code, this repo) | Ryan | claude.ai cloud container | the repo, the site's read-only endpoints, the hosted database read-only, Fieldy exports (business only), Notion | the repo by PR; email to pat@ and hello@ | registered Oct 7 |
| Next-actions session (Claude Code, PDA GitHub account) | Ryan | claude.ai | the repo | the repo by PR (#123) | seen Oct 7; to confirm |
| Brain CRM sync (`brain-sync`) | unknown | `/opt/brain` on `leadflow-web` | the CRM through the read-only role | `tlfp_brain_events` (daily batch) | running; owner to confirm |
| Droplet posting worker (`leadflow-main-posting`) | Ryan | `/opt/leadflow-main-posting` | the content queue | the LeadFlow Page and X | running since Sep 29 (per the record); to confirm |
| Sona (Quo's AI) | Ryan | Quo | inbound texts | auto-replies on the business line | configured; which lines: to confirm |
| Pat's Codex sessions | Pat | the droplet (root) and Pat's machine | the droplet, the repo | local commits in `/srv/sites/leadflow`, releases | active (the live commits); to register |
| "Jet Boy" | Pat | unknown | unknown | unknown | PAT STATEMENT Sep 18; to register |
| Odin, Astra, Muse | named in conversation only | | | | not found anywhere; register or drop |

## Questions for Pat (answers go in a FOR AGENTS block with `record_type: answer`)

1. What are the live commits `8f96f9ca`, `071f4c7` and `232976c`: which
   files differ from `origin/main`, and will you push the checkout to
   `droplet/live` today?
2. Did you or your Codex write `leadflow-release` and the guard, and will
   you own that lane? Can a copy go into a private repo so runbooks stop
   guessing?
3. Which screen is your record of a call: the Call Desk, the Sales Desk, or
   the new `/admin/sales/board`?
4. Which of your bots exist and where do they run: Jet Boy, your Codex
   sessions, the agents that email Ryan's agents? What are Odin, Astra and
   Muse to you?
5. Who maintains `/opt/brain` today, what feeds `/command`, and why did the
   reasoning cycle stop Aug 29 while the CRM sync still runs daily?
6. Which timers are on right now (`systemctl list-timers --all`)?
7. Does the Sales Desk invoice builder work for you under
   `pat@theleadflowpro.com`, and which Stripe account does it bill?
8. Is the Workspace service account finished, where does its key live, and
   does any agent of yours create calendar events today?
9. Where does your X and Facebook reply desk run and post from, and which
   Meta app and token does it use?
10. From which GitHub account will your PRs come?

## What is still unknown

- The contents of the live commits and of `/opt/brain`, the Hub,
  `leadflow-release` and the guard: droplet-only until pushed or copied.
- Today's timer states (last recorded Sep 28: the site's timers off).
- The Supabase decision in force, and who restored the paused project on
  Oct 6.
- Which Stripe account is LeadFlow Pro's after the Sep 25 wrong-account
  charge, and whether any proposal from the Oct 2 to 5 leads has been
  signed or paid (nothing on the ledger as of Oct 6).
- Which Quo line Pat texts from, and whether Sona answers LeadFlow leads.

## Machine-readable lanes

```yaml
lanes:
  - lane: site-code-on-github
    owner: build session and other Claude sessions by PR; Ryan merges
    lives_at: RealRyanNichols/TheLeadFlowPro main
    state: active
    sha: 922a7f3c59591b42343b8bfe7fcc71a139907b00
  - lane: droplet-checkout-admin-base
    owner: Pat
    lives_at: /srv/sites/leadflow on leadflow-web
    state: base for /admin per Ryan Oct 7; push of HEAD to droplet/live requested
    sha: dc124190cfe7ce3da6e30ae0c23f7edda4913fb2 (live at 00:55Z Oct 8; moves daily)
  - lane: releases
    owner: root on the droplet (Pat); pipeline author owns the files
    lives_at: /usr/local/bin/leadflow-release
    state: active; plain leadflow-release withheld until the join
  - lane: command-center-site
    owner: build session
    lives_at: app/admin/command-center, app/sales/board
    state: on main 59119f0, not released; to be re-layered on droplet/live
  - lane: brain-command-and-call-desk
    owner: unknown (droplet-only); Pat uses
    lives_at: /opt/brain
    state: live; reads only
  - lane: call-notes
    owner: build session (table); Pat and Ryan (entries)
    lives_at: lead_notes
    state: one record
  - lane: hub
    owner: unknown (droplet-only)
    lives_at: hub.165-227-248-110.sslip.io
    state: live
  - lane: timers-and-crons
    owner: droplet root
    lives_at: systemd on leadflow-web
    state: unknown since Sep 28; listing requested
  - lane: google-workspace
    owner: Pat (admin); Ryan (scopes and keys)
    lives_at: Workspace theleadflowpro.com
    state: in progress
  - lane: meta-app-and-ads
    owner: Ryan; Pat (copy, forms); build session (read-only reader)
    lives_at: Meta business portfolio
    state: one app, one read token
  - lane: quo-and-sona
    owner: Ryan; Pat (caller); build session (views)
    lives_at: Quo, quo-webhook, lead_calls, lead_messages
    state: one record
  - lane: invoices
    owner: Ryan (accounts); Pat (sends); Amanda (Square for PDA)
    lives_at: app/sales/invoices
    state: one writer
  - lane: cash-ledger
    owner: build session (code); Ryan (entries)
    lives_at: operator_verified_cash_entries, /admin/operator/cash
    state: shipped Oct 6
  - lane: database
    owner: Ryan decides each phase
    lives_at: hosted Supabase hpzpwfymwfgwspaixrxi; deploy/droplet/db.sh
    state: frozen until the decision is restated in writing
  - lane: dns-and-caddy
    owner: Ryan (DNS); droplet root (Caddy)
    lives_at: GoDaddy; leadflow-web
    state: stable
  - lane: content-posting-and-replies
    owner: Ryan; Pat (his reply desk)
    lives_at: /opt/leadflow-main-posting; app/admin/content-command
    state: one identity per channel
  - lane: email-sends
    owner: build session and Ryan
    lives_at: lib/contractorSeries.ts, app/api/cron
    state: one sender per audience
  - lane: intake-forms-and-registry
    owner: Pat (questions); build session (file); Ryan (publishing)
    lives_at: lib/metaCampaignGuard.ts
    state: PR-only edits
  - lane: proposals-and-signed-scope
    owner: Pat (content, host); build session (record)
    lives_at: /srv/sites/leadflow-proposals; this repo
    state: DocuSign after Ryan names template and sender
  - lane: calendar-booking
    owner: Pat (Workspace); build session (button, planned)
    lives_at: LeadFlow Workspace calendar
    state: no writer yet; one writer when built
  - lane: fieldy-archive
    owner: Ryan
    lives_at: /fieldy on the brain
    state: owner-only
  - lane: premier-dental-academy
    owner: Amanda
    lives_at: its own repo and database
    state: Amanda's lane
  - lane: repwatchr
    owner: Ryan
    lives_at: site@repwatchr
    state: paused Oct 5
  - lane: pats-bots
    owner: Pat
    lives_at: unknown
    state: registration requested
```

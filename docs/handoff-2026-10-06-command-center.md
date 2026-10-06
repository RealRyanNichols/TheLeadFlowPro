# Command center handoff, October 6, 2026

Ryan asked, in one breath: go into the droplet, listen to every Fieldy
conversation with Pat and Amanda and the clients, tell me what I am missing,
and build the command center we actually need on top of what we have. We
have to start with The LeadFlow Pro. I have to start making sales.

This document is the answer and the record behind it. The build is on
branch `claude/dazzling-fermi-svd28t`. Nothing was deployed, sent, spent,
or changed on the droplet: this session has no SSH key, so the deploy
steps below are for Ryan or Pat to run in the console.

## What you are missing

You are not short on leads. You are short on a loop.

Ads bring people in. The software emails every one of them in minutes.
Then a person has to call, and nobody can see who is waiting, who promised
what, or what the ads cost today. So the call happens late or not at all,
the proposal goes out without a signed scope, and the money never moves.

The record says it five different ways.

September 20, from the database: 47 Meta leads in thirty days. 46 got the
email. 3 got a text from a person. 1 got a call. Purchases, ever: 0.

September 21 and 22, on tape: two leads paid a competitor $5,000 the same
day they filled out the Facebook form. The form worked. The phone did not
ring in time.

September 21, on tape: leads live in Meta Business Suite, in email, and in
HubSpot. You and Pat split the list by age and cannot see each other's call
attempts. Nobody can see one list.

October 1, on tape: "the LeadFlow's not even running, over a week." The
company that sells lead flow had no ads of its own for two weeks, and
nobody saw it because no screen showed it.

October 2, on tape, to Pat: "My command is not updated in eight days. I
can't see it." And then the spec, in your own words: "here's our KPIs, here's
all known cost, here's the money coming in, this is how much sales it would
take to cover all of these, and here's the live counter."

September 22, on tape: "Pat knows how to get on the phone and close these
people, but he needs to see all the data." Pat's alerts came in one batch at
5:30 in the morning, to Pat only.

October 2, on tape: "seventy five hundred before he pays, he's gotta sign a
contract. I've got to have it where he can just quick sign." There is no
signed-scope step between "wants a proposal" and "paid" anywhere in the
system.

So the five things missing, in money order:

1. One screen, phone first, that shows the lead-to-cash line and who to
   call right now. Built. It is the new `/admin/command-center`.
2. The same screen for Pat, with the reads his login allows. Built. It is
   `/admin/sales/board`.
3. Ad spend and cost per lead on that screen, read from Meta, so "ads off
   for two weeks" cannot go unnoticed. Built; it turns on when the server
   holds the read-only Meta token the Ads Brain already uses.
4. The live counter: costs, money in, clients to cover the month. Built; it
   turns on when you type the month's costs into one variable.
5. A signed scope before payment. Not built. It is a process and a
   DocuSign template, not a page, and it is the next thing to decide.

One more, and this one I could not check from here. On Sep 28 every one
of the site's scheduled-job timers on the droplet was off, and the Vercel
cron that used to run them stopped when the site moved. Those jobs are the
Meta lead poll every five minutes, the follow-up sends, and the call sheet
email. If they are still off, a lead can fill out the form on Facebook and
never land in the CRM at all. The Oct 2 Scott-ad leads did land, so
something was polling that day. Run the one-line timer check in the deploy
section before you trust any count, including this board's.

Everything below is the receipt.

## The record

Labels: FACT is a database or document fact. RYAN STATEMENT and PAT
STATEMENT are what was said on a Fieldy recording, as transcribed, with the
speaker identified from context (Fieldy labels every line "Unknown").
DOCUMENTED INFERENCE is a conclusion drawn from more than one source.
Nothing here is a court finding, and no personal, legal, family, or
financial-identifier material from the recordings is reproduced.

### The lead-to-cash gap

- FACT (docs/ceo-plan-2026-09-20.md, read from the production database on
  Sep 20): paid purchases ever 0; leads in 30 days 59, of which 47 from Meta
  lead ads; 45 of the last 56 still "new"; 46 of 47 Meta leads got the
  automated email; 3 were texted by a person; 1 was called.
- FACT (lib/callSheet.ts, lib/uncalled.ts): on Sep 22, 64 of 68 Meta leads
  had `last_contacted_at` set by the software's own first text, and 63 of
  them had never had an outbound call. That is why the board's "reached by a
  person" counts only a note, a call somebody had, or a text a person typed.
- RYAN STATEMENT (Sep 1, Notion ledger): "I'm fumbling" many waiting
  LeadFlow Pro leads because of court and the site rebuild.
- RYAN STATEMENT and PAT STATEMENT (Sep 21 16:59Z and 17:15Z; Sep 22
  01:31Z, raw archives): two leads, one brought by Pat, paid a competitor
  $5,000 the same day or the same morning they filled out the Facebook form.
- RYAN STATEMENT (Sep 21, 14:48Z): leads live in Meta Business Suite, email
  and HubSpot; Ryan and Pat split the list by age and cannot see each other's
  call attempts.
- PAT STATEMENT (Sep 22, 00:59Z and 01:00Z): "pull me the top 10 PDA leads
  from the droplet, the best opportunities"; update notes by voice after
  calls, never by clicking through a web page.
- RYAN STATEMENT to Amanda (Sep 21, 21:28Z): PDA calls each lead once and
  stops; about 400 September signups should get ten touches each.
- RYAN STATEMENT (Sep 20, 20:03Z): "on the follow-up is where I'm really
  lacking right now. I've got emails going out, but personalized follow-up
  is what I've got to really do."
- PAT STATEMENT (Sep 20, 01:18Z and 20:06Z): "are you seeing them on your
  side come through?" Pat could see one lead; a one-off run that afternoon
  emailed the rest to his address. FACT: `lib/leadNotify.ts` now sends the
  NEW LEAD email to both addresses on every lead.
- RYAN STATEMENT (Sep 19, 22:49Z): the dashboard called leads uncontacted
  that Amanda had reached on Messenger, Quo or email; nothing wrote those
  touches back. The board counts only touches the system can see (a note,
  a logged call, a text on the thread). A touch made outside the system
  still has to be logged on the lead, or it does not exist on any board.
- RYAN STATEMENT (Sep 19, 23:03Z): about $12,000 a month to run both
  businesses, old loans included. That is the kind of number the break-even
  counter is for; it is a spoken estimate, so type the real one.
- PAT STATEMENT (Sep 18, Notion ledger): sales slowed because nobody called.
- RYAN STATEMENT (Oct 1, raw archive, 23:15Z): "the LeadFlow's not even
  running... over a week." (Oct 2, 04:00Z): "I haven't had an ad during
  like two weeks."
- RYAN STATEMENT (Oct 2, 22:48Z, raw archive): "My command is not updated
  in eight days... I can't see it, and I don't know if I don't have the
  webhooks or whatever hooked up correctly."
- DOCUMENTED INFERENCE: the "command" Ryan was looking at on Oct 2 is the
  brain's Command page on the droplet (docs/infrastructure/call-closer-brain-link.md),
  which reads LeadFlow through a read-only database role, not the Next.js
  page in this repo. Its staleness is a droplet-side sync question for Pat;
  the board in this branch reads the site's own tables directly.

### What the command center should show, in their words

- RYAN STATEMENT (Oct 2, 22:48Z to 22:50Z): KPIs, all known cost, money
  coming in, how many sales cover the costs, a live counter, the profit
  zone, and a note that usage spend rises per client. "The dashboard that
  not only has the leads and our next action with our leads... but would
  also know our costs, and would tell us, hey, you need one more client."
- RYAN STATEMENT (Sep 22, 00:36Z): "I want it to be a full dashboard, and
  then I want you to open it up where I can see it, because I don't know how
  to even look through a droplet." "Pat knows how to get on the phone and
  close these people, but he needs to see all the data."
- RYAN STATEMENT (Sep 1, Notion ledger ACT-234): a rolling scoreboard from
  daily to 12 months of leads, ad spend, CPC, CPL, CPA, link clicks, site
  visits, views, with a shareable daily snapshot.
- PAT STATEMENT (Sep 18, Notion ledger): "offers out" is the key KPI on a
  live dashboard; proposals reviewed by Ryan before they go out.
- PAT STATEMENT (Sep 23, ACT-245): a central dashboard to click into each
  client's leads.
- RYAN STATEMENT (Sep 13 to 14, ACT-245): new-lead alerts reach only Pat
  and arrive in one batch around 5:30 a.m.; route them to both, instantly.
- FACT (lib/leadNotify.ts:154): the NEW LEAD email already goes to both
  hello@ and pat@. FACT (lib/speedToLead.ts): the instant text to both
  phones exists and sends only when `SPEED_TO_LEAD_ENABLED` is exactly
  "true". The board's Switches panel shows whether it is on.
- RYAN STATEMENT (Oct 3, ACT-330): the admin dashboard is "visually
  overlapping, hard to understand, and incomplete for September revenue."
- RYAN STATEMENT (Oct 2, 21:17Z): "it's one client... I need one client...
  I need ten, Lord. But why is it so hard to get one right now?" PAT
  STATEMENT, same call: "we casted a wide net to begin with, and now... we
  ain't got a client."
- PAT STATEMENT (Sep 30 to Oct 2, raw archives), how Pat works a lead: call
  within minutes of the form, text if no answer, a two-call close (never
  money on call one), research the prospect's zip code before call two,
  close the next day at a set time; position "$500 per job", never cost
  per lead. The board's call-now rows, promises list and proposal list
  follow that order on purpose.
- PAT STATEMENT (Oct 2, 21:04Z): "Where does it say on the form about the
  $7,000?" The live lead form had lost his budget question; both Oct 2
  leads came in without it. FACT (Oct 2 Scott ad report): the v3 form with
  all four questions went live at 4:25 PM that day.
- PAT STATEMENT (Sep 30, 19:56Z to 20:00Z): Ryan is not getting Quo
  notifications; Pat cannot sign in on the phone and only sees a thread by
  tapping a notification.

### The offer and the contract

- FACT (COMMERCIAL_DECISIONS.md, Oct 3; lib/site/managedPlans.ts): the live
  offer is one managed acquisition campaign, $7,500 minimum upfront, up to 90
  days, ad allocation included, farm/ag target 15 acquired jobs, no automatic
  renewal. Smaller product projects are quoted separately.
- RYAN STATEMENT (Oct 2, 01:38Z): "it's hard to contract out on something
  you don't even know what the offer is yet." PAT STATEMENT (Oct 2, 01:41Z):
  "seventy five hundred is the new five hundred."
- RYAN STATEMENT (Oct 2, 22:31Z): "Are we charging $7,500 to start and then
  going down on a price per month, or are we saying $7,500 per month?" The
  public page answered this on Oct 3 (upfront, up to 90 days). The written
  proposal still has to say what the ad allocation is.
- RYAN STATEMENT (Oct 2, 20:05Z): "he's gotta sign a contract and
  everything... a quick DocuSign." FACT: no signed-scope state exists in the
  lead record or the proposal flow (lib/proposals, app/admin/proposals).
- RYAN STATEMENT (Oct 1): "$500 people" cost more than they pay. Randall's
  $500 took two hours of calls and delayed the ad launch. "I can't take five
  hundred dollar people on."

### Clients and prospects on the record (business only)

| Who | Stage on the recordings | Money | Next |
| --- | --- | --- | --- |
| Scott, O-L Guy Farms | Active client, month 2 started Oct 1; a bet on two jobs over $8,000 by about Oct 31 | $500 month 1 plus ads; $850 check Oct 1 (reported, not reconciled to the bank) | Ads back on under the LeadFlow card; second testimonial clip |
| Lawrence and Blake | Scott-ad leads, Oct 2, both "ready right away" | $7,500 offer | Pat's second call with the opportunity research |
| Randall, concrete | Paid $500; site built; $300 ad; text and email only until his first job | $500 paid | Deliver leads; no more hours until he pays |
| Garrison, oilfield product | Exploratory $2,500 / $5,000 / $7,500 proposals; nothing accepted | Unpriced product build | Scope the first revenue path in writing before any number |
| Juan, Revive Bath | Went quiet near signing, voicemail full (Sep 18 to 22) | $7,500 | Follow up or close out |
| Bison Concrete | Facebook prospecting pilot, LFP-1 (Oct 4) | $7,500 for 90 days proposed | Pat reviews; first batch of local-group prospects |
| Longview mortgage officer | Last try this week; vertical dropped otherwise | $1,000 to $1,500 per lead economics | Yes or no |
| Premier Dental Academy | Client tenant; over a thousand leads sat unworked, intake turned off Sep 28, ads back on about Sep 29 | about $3,000 per enrollment | Amanda's daily call list |

Every amount is a participant statement unless a document says otherwise.

## What shipped in this branch

`/admin/command-center`, rebuilt as a lead-to-cash board, phone first:

- The bottleneck line: one sentence that names where the money stopped
  this window (replies owed, then untouched leads, then proposals without a
  payment, then an empty window).
- The money line over 7 or 28 days (`?window=28`): leads in by source;
  reached by a person and how many inside 24 hours; waiting on a person
  (replies owed plus untouched); proposals out with the dollar value typed on
  them; paid, from Stripe records; ad spend with cost per lead.
- Call now: the first six rows of today's call sheet with Call and Text
  (consent and no STOP only) and the call card, plus Start calling.
- You said you would call: promises due today, overdue first.
- Money on the table: open proposals, quietest first.
- The number: known monthly costs (owner typed), paid in the last 28 days,
  clients at the campaign price to cover the month.
- Ads, last 7 or 28 days: spend, link clicks, Meta-counted leads, cost per
  lead by Meta's count and by our own records, per campaign with its live
  status and daily budget. Read only, cached ten minutes, bounded to eight
  seconds so Meta can never hold the page.
- Every business: LeadFlow Pro from this database, each plugin client from
  its HQ workspace, Premier Dental Academy as a door (its own database).
- Doors: Uncalled, Sales desk, Business dashboard, LeadFlow Hub, Call Desk,
  Fieldy archive (owner only), Meta Ads Manager, Content Command.
- Switches: instant new-lead texts, automatic first text, morning call
  sheet email, Meta reporting, Business dashboard sign-in, each on or off.
- Last 24 hours and the human stopline, kept from the old page. The RN-1
  trading desk panel closes the page instead of opening it.

`/admin/sales/board`, for Pat: the same money line, promises and proposals,
read with his own login. What his role cannot read (owner notes) is marked
"not counted", never zero. No ad spend, no Fieldy archive.

Gone: the flow score, the eight imaginary agents, the mission game, the
proof snapshot. Every number left is a row that exists.

Files: `lib/commandCenter.ts` (the arithmetic, pure), `lib/commandCenterServer.ts`
(the reads), `lib/metaInsights.ts` (Meta, shared with the Ads Brain pull),
`lib/commandCenterSwitches.ts`, `lib/operatorLinks.ts`,
`app/admin/command-center/*`, `app/sales/board/page.tsx`. Tests:
`tests/command-center-board.test.ts`, `tests/command-center-access.test.ts`,
`tests/command-center-switches.test.ts`.

## What it reads, and what it never does

Reads, with the signed-in person's own client: `leads`, `lead_notes`,
`lead_calls`, `lead_messages`, `purchases`, `lead_activity`. With the
service client, after the admin check: `approval_queue` (service only by
design) and `hq_workspaces` / `hq_leads` (member-read tables, counted for
the owner). Meta Graph, GET only, with the `ads_read` token.

Never: sends a text or email, changes an ad, charges a card, writes a
lead. A tap on Call or Text hands off to the phone's own dialer. No new
Supabase table, function or policy, and nothing on Vercel.

## Getting it onto the droplet

This session could not reach the droplet (no SSH key here; Pat has root).
The full runbook, with the read-only checks, the guard, the optional
settings and the rollback, is `docs/infrastructure/command-center-deploy-2026-10-06.md`.
The short version, as root in the DigitalOcean console:

One check to run first, whatever else happens. On Sep 28 every
`leadflow-cron-*` timer on the droplet was off, and Vercel's cron stopped
when the site left Vercel. Those timers are the Meta lead poll (every five
minutes), the follow-up sends and the call sheet email. If they are still
off, leads can arrive in Meta and never reach the CRM, and no board can
show what never lands:

```bash
systemctl list-timers --all --no-pager | grep -E 'leadflow-cron|brain-fieldy|ads-brain'
```

Facts from `CLAUDE.md`: the live site is `site@leadflow` on 127.0.0.1:3109
from `/var/lib/leadflow-releases/current`; `leadflow-release` builds a
commit and switches only after a check on port 3129; its guard needs
5.5 GiB of memory and 12 GiB of disk free, which the 8 GB droplet did not
have on Sep 28 to 29; `leadflow-release` fetches only `main`, so a branch
must be fetched first.

```bash
# 1. Bring the branch in where leadflow-release can see it.
cd /srv/sites/leadflow
git fetch origin claude/dazzling-fermi-svd28t
git log --oneline -1 origin/claude/dazzling-fermi-svd28t   # note the sha

# 2. Make sure the guard will pass (free memory and disk).
free -h; df -h /

# 3. Build and switch that exact commit. It checks the new build first.
leadflow-release <sha from step 1>
leadflow-release --status

# 4. Prove it on a phone: sign in, open
#    https://www.theleadflowpro.com/admin/command-center
#    and, as Pat, https://www.theleadflowpro.com/admin/sales/board

# 5. If anything is wrong, go back one release.
leadflow-release --rollback
```

Optional, each one the owner's call, in `/srv/site-env/leadflow.env` then
`systemctl restart site@leadflow`:

- `COMMAND_CENTER_MONTHLY_COSTS_USD` turns on the live counter.
- `META_ADS_READ_TOKEN` (ads_read only; the Ads Brain's token) turns on the
  ad panel.
- `LEADFLOW_BRAIN_ORIGIN` and `LEADFLOW_HUB_URL` only when the sslip.io
  addresses change.

Do not run `deploy/droplet/deploy.sh` on this droplet (CLAUDE.md).

## Decisions only Ryan can make

1. The signed scope. One DocuSign template for the $7,500 campaign (scope,
   ad allocation, counted outcome, 90-day review, no automatic renewal), sent
   from the proposal page, before the pay link. Say yes and it is the next
   build.
2. Turn on the instant alerts (`SPEED_TO_LEAD_ENABLED`) and, when
   comfortable, outbound texting. The board shows both switches.
3. Type the month's known costs so the counter is real.
4. Put the Ads Brain read token in the site's env so spend shows on the
   board; until then Ads Manager is the only place it lives. One caveat
   from `docs/infrastructure/ads-brain-digitalocean.md`: that token was meant
   to stay off the shared droplet. The site now runs on the droplet, so the
   token sits in `/srv/site-env/leadflow.env`, readable by root (Pat). It is
   `ads_read` only and can change nothing, but it is your call.
5. HubSpot or the droplet as the system of record (ACT-330). This board
   reads the site's own tables either way, but two systems of record means
   two queues, and the queue is the problem.

## Next builds, in order

1. Signed scope before payment (DocuSign template, a `scope_signed` note on
   the lead, the pay link only after).
2. "Where did you see us" on every intake, and dedupe by phone and email
   so repeat submitters are one record (ACT-245).
3. Per-client ROI card on the client workspace: spend, leads, quotes, jobs,
   client profit, as Scott's month one was counted on Oct 1.
4. The daily brief email (ACT-234) from the same board math.
5. Quo threads on the lead's call card for both logins, and the second
   call booked straight onto the LeadFlow Google Workspace calendar from
   the call card (Pat's two asks on Sep 30 and Oct 2).
6. Fieldy and Quo transcripts linked to the lead they concern, in the Hub.

## Coverage

Read for this handoff: the Sep 20 plan and Sep 24 Call Closer handoff;
the Oct 3 release notes and commercial decisions; the Oct 2 Scott ad report
and Oct 4 Bison pilot email to Pat; the Notion Current Command Center page
(Oct 5), the Fieldy decisions ledger (25 Tasks & Decisions items), and the
Aug 25 to Sep 18 conversation ledgers; the raw Fieldy archives for Sep 19
through Oct 5 (one reader per archive, business content only); the Fieldy
manifest (736 archived recordings, 198 classified as LeadFlow business by
title). Not read: 116 older recordings the manifest has not reconciled, and
two long Sep 15 to 16 transcripts whose business content reached the
decisions ledger. No audio exists; Fieldy deletes it after transcription.

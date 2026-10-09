# Next actions handoff, October 7, 2026

Ryan asked for one place that says what to do next on every lead: "we have an
algorithm set up and a plan and a process set up for going after leads," "to
know they are on their eighth out of 60th email and third out of their 25th
call," with "our KPIs set up within the command center," "here's what you're
doing right, here's what you're doing wrong, this is what you should do more
of, this is what you should do less of."

This document is the record of what was built for that, what a run against
the real leads showed, and what still needs a person. The work is on branch
`claude/next-action-engine` (pull request #123). **Nothing is deployed.
Nothing was sent. No lead, ad, message or setting was changed.**

## What is built

A read-only page, **Next actions**, at `/admin/sales/next-actions`. The owner
and the sales desk open the same page. It is linked from the back office menu
("Calls and leads") and from the sales desk bar.

| File | What it holds |
| --- | --- |
| `lib/followUpPlan.ts` | The plan: 25 calls over 90 days (full), 9 over 21 (standard), 3 over 3 (light), calling hours, the email series lengths, the proposal follow-up days |
| `lib/nextAction.ts` | The rules: for each open lead, the one next thing, when it is due, and "Calls 3 of 25 · Emails 8 of 81 · Day 7" |
| `lib/nextActionTemplates.ts` | 29 scripts: call openers, voicemails, texts, personal emails, checklists |
| `lib/growthSignals.ts` | The scorecard: the numbers, and fix / less / more / keep / watch |
| `lib/nextActionServer.ts` | The reads, with the signed-in person's own access. No writes |
| `lib/metaAdLevel.ts` | Ad spend and leads per ad, read-only, owner only |
| `app/sales/next-actions/` | The page |
| `docs/lead-follow-up-sop.md` | The plan in plain words, for Ryan and Pat to change |

No new table, no migration, no new package, no environment variable. It
reads tables that already exist. Ad numbers show for the owner once the
read-only Meta token that the command center already uses
(`META_ADS_READ_TOKEN`) is set on the server; without it the page says "not
read" and shows no ad number at all.

## The first run against the real leads

Read-only, October 7 at 2:10 PM Central, with numbers in place of names. The
database rows were checked against the copy by checksum before the run.

125 leads on record (the oldest from August). 113 open and reachable.

| What the board showed | Count |
| --- | --- |
| Due today, in order | 18 |
| Backlog (more than a week late) | 73 |
| Unknown callers to name or close | 16 |
| Past the end of the plan | 6 |
| Left off: test records 6, lost 5, won 1 | 12 |

Today's 18, top down: one lead five minutes old; three people who reached out
with no reply on the record (one from an unknown number asking for a
scheduling link the morning before); one promised call back, due that
morning; two proposals with no follow-up on the record; eleven first calls
with no call on the record, the Priority leads first.

The scorecard for the last 7 days:

| Number | Value |
| --- | --- |
| Leads in | 15, plus 15 unknown numbers the phone line saved, not counted |
| Called inside 5 minutes | 0 of 14 on the record |
| Leads with a call on the record | 1 of 14 |
| Priority leads, from the form answers | 3 of 9 |
| At proposal | 2 |
| Ad spend, Meta's count, Oct 1 to 7 (read at about 1 PM) | $576, 11 leads |
| Automatic emails sent | 302 |
| Delivered emails with an open on record | 6 of 110, tracking one day old |

Read those with one thing in mind. **The board only knows the record.** The
sales calls that week were made from a cell phone and recorded on Fieldy, so
almost none of them are on the lead. "0 of 14 called inside 5 minutes" is a
statement about what was logged. It is the number to fix first, and the fix
is where the calls are logged, not a claim about who called whom.

## What the real run changed in the rules

The first version passed every test and still put the wrong things on top.
Each fix below has a test built from the real shape, with made-up names.

1. **The backlog.** 58 leads shared one follow-up date, stamped in a batch
   two weeks earlier. Each read as "you said you would call" and outranked
   that week's proposals and new leads. Due work more than 7 days old now
   sits under today's list. Somebody waiting on a reply is never filed there.
2. **Unknown callers.** The phone line saves every unknown number as a lead
   named "Unknown". 14 of the 30 records from the week were these: 13 calls
   somebody had picked up, and one text. By their call summaries, 11 of the 13
   calls were the same sales robocall about a Google listing, and two had no
   summary to go by. They read as "talked to 13 of 30 leads" and as 13 rows
   of "set the next step". They are now listed apart, to be named or closed,
   and are left out of every number. A script never says "Unknown".
3. **Texts that ask for nothing.** A STOP, a "Thanks!" and a Zoom opt-in
   prompt each showed as "answer them now". The opt-out word, a short closing
   word and a machine's message are no longer a reply owed. A lead who
   texted STOP says so on its row.
4. **A call written down in words.** One call had been brought in from a
   recording as a line on the lead, with no outcome tapped. The lead showed
   "no call on the record" and its promised call back was ignored. A call a
   person wrote down now counts.
5. **The first call is due at once.** A lead two minutes old was listed under
   "coming up" until its fifth minute. It is now due the moment the form
   lands, and a lead inside its first hour is the top row on the page.

Also from the run: opens are measured against delivered emails and only after
a week of tracking (six opens against a week of sends read as 2%, with one
day of tracking behind it); a wait to the first call is not called "typical"
on three logged calls out of sixty-six; and every sentence says "on the
record", never "nobody called".

## Checked

- `npx tsc --noEmit`: clean.
- The full test suite: 2,522 pass, 0 fail. 79 of them are for this work.
- `npm run build`: passes, with the price, fact, tool, visual and social
  checks that run before it.
- The page was rendered with made-up leads at phone width (390) and desktop
  (1280): no sideways scroll, no page error.
- The page test now pins the clock. Before that, "2 due" and "Day 1" would
  have changed with the hour the test happened to run.

Not checked: the page on the live server, with a real sign-in, because it is
not deployed. The Meta read on the server was not exercised (no token here).
The filter that picks the email events out of the timeline was not run
against the real API; if it is refused, the page says opens were not read
and shows no open count, and everything else still loads.

Known limit: each history table is read up to 4,000 rows, newest first. At
today's volume the automatic-email history reaches that in about six weeks.
Past it, the email count on the oldest leads can run low, and the page says
that some history came back cut short. The call history is read on its own
so that email volume can never crowd it out.

## Not deployed, and why it cannot simply be released

The live site reports commit `8f96f9c` at `/api/health` (checked again at
2:55 PM on October 7). That commit is not on any GitHub branch. The live back
office (the dark workspace, the Hub frame, Special Effects) exists only on the
droplet. Releasing this branch by itself would replace that with an older
site.

**Update, October 8, 8:35 PM.** The live site now reports `b3b9306`. It was
`dc12419` the evening before, per `docs/lanes.md`. Neither is on GitHub. The
live code is being re-released from the droplet about daily, so the commit
named above is already two releases old. Step 1 below now saves whatever the
droplet checkout holds at the time, the same way `docs/lanes.md` does. Do not
use the earlier line that named `8f96f9c`: it would save an old copy, and the
join would be built on it.

There is a second catch. This branch is built on GitHub `main`, and `main`
has work the live copy does not (the October 6 lead-to-cash board is one
piece: the live `/admin/command-center` is still the older page). So merging
this branch onto the live code also brings in everything on `main` that the
live copy lacks. That is a real merge, with likely conflicts where both sides
changed the back office shell (`app/admin/backOfficeNav.ts`,
`app/sales/layout.tsx`). It should be done once, in the open, with the tests
and the build run on the result.

### One join, not two (added 3:25 PM, after a note on pull request #123)

The session that built the October 6 board wrote the same first step into
`docs/lanes.md` (draft pull request #124) and says there that it will do the
join: `main` layered onto the droplet's code, the droplet's version kept
wherever both changed a file. Two sessions doing that merge would be the
duplicate work that file exists to prevent. So unless Ryan says otherwise,
this session leaves the join to that one, and Next actions rides in through
pull request #123. The branch name below is the one `docs/lanes.md` uses.
At 3:25 PM on October 7 no `droplet/` branch was on GitHub yet, and none on
October 8 at 8:35 PM.

### The safest order

1. **Save the live code to GitHub.** In the droplet console. It changes
   nothing on the server:

   ```
   cd /srv/sites/leadflow
   git status --short
   git rev-parse HEAD
   git log origin/main..HEAD --oneline | tail -20
   git push origin HEAD:refs/heads/droplet/live
   ```

   `git rev-parse HEAD` should print the same commit that
   `www.theleadflowpro.com/api/health` reports. If it does not, stop and ask
   whoever released last. If `git status --short` lists files, those changes
   are in no commit yet and the push would leave them behind: commit them on
   the droplet first, as `docs/lanes.md` says.

   The repository is public. Look at that list of commits first, and do not
   push if any of them carries a key, a token or a customer's details.
2. **Merge and test off the server.** With the live code on GitHub, the join
   is done in a pull request: conflicts resolved, the full test suite and
   `npm run build` run on the result. The Next actions page itself only adds
   files, one menu entry, one link and two ad ids, so it merges after the
   join or along with it.
3. **Release the tested commit.** Check memory and disk first (the build
   guard needs 5.5 GiB and 12 GiB free), then:

   ```
   cd /srv/sites/leadflow
   git fetch origin <the merged branch>
   curl -s https://www.theleadflowpro.com/api/health
   git merge-base --is-ancestor <the commit that line printed> FETCH_HEAD && echo "ok: the merged code contains what is live" || echo "STOP: the live code has work the merged code lacks"
   leadflow-release <the merged sha>
   leadflow-release --status
   ```

   The check before the release matters because the live code moves about
   daily. If somebody released from the droplet after step 1, the merged code
   no longer contains what is live, and releasing it would undo that work. On
   "STOP", run step 1 again and have the join redone on top of it.

   `leadflow-release --rollback` goes back one release.

These commands are untested: this session cannot open the droplet console.
Another session set the release pipeline up and owns it. Coordinate with
whoever that is before running step 3.

To take the page back out after a release: remove the two links. Nothing else
depends on it.

## Decisions waiting on Ryan and Pat

| Decision | Why it matters |
| --- | --- |
| Where a call gets logged: the call card, the LeadFlow line, or both with Leads Center | Until calls land on the record, the scorecard cannot tell a missed lead from a called one |
| The calls brought in from Fieldy: have them carry an outcome (booked, call back, no answer) | Then the call card, the call sheet and this page all read them the same way |
| The 16 unknown-caller records | Closing them changes live records, so it needs a yes. Until then they sit in their own list |
| Whether an unknown number should make a lead at all | 14 were made in two days, at least 11 of them by one robocall campaign |
| The instant text alert to your phones (`SPEED_TO_LEAD_ENABLED`) | 36 alerts were queued and never sent. It is the fastest way to make the five-minute call |
| Who owns the first call, the daily plan and the proposal follow-ups | Section 10 of the SOP has the names blank |
| The plan's numbers (25 calls, 90 days, the days themselves) | They are a proposal. Change them in `lib/followUpPlan.ts` |
| The 58 batch follow-up dates from Sep 23 | Work them, or clear the date so they fall back onto the plan |

## What this does not do

- It sends nothing. A person dials, texts and emails from their own phone and
  mail app. A text button shows only with consent on file and no STOP.
- It does not send call results to Meta. Leads Center already does that when
  a stage is moved there, and a second sender would count each one twice.
- It does not know about a call nobody logged.
- It promises no result. The targets are the plan's own, not industry
  figures.

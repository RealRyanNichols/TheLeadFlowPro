# Lead follow-up plan (SOP)

Written October 7, 2026, at Ryan's request: "an SOP for how many times and
what we do when a lead comes in, to know they are on their eighth out of 60th
email and third out of their 25th call."

**Status: proposed.** The emails below already run. The call plan, the
voicemails, the texts, the personal emails and the proposal follow-ups are
new, and they are Ryan's and Pat's to change. Every number on the Next actions
page comes from `lib/followUpPlan.ts`; change it there and the page, the
scripts and this document's tables follow (a test fails if the tables here
drift from that file).

**Checked against the real leads on October 7, 2026** (a read-only run at
2:10 PM Central, 125 leads, numbers only). Five rules changed because of what
that run showed. They are marked "from the first real run" below.

Nothing in this plan is sent by software except the emails that were already
automatic. A person dials, a person leaves the voicemail, a person presses
send on a text or a personal email.

## The short version

For a lead from the contractor form (the Scott video ads):

| What | How many | Over | Who does it |
| --- | --- | --- | --- |
| Call attempts | 25 | 90 days | A person |
| Voicemails | 6 | with calls 2, 4, 9, 12, 16 and 25 | A person |
| Texts | up to 5 | with calls 2, 5, 9, 13 and 20 | A person, and only with texting consent on file |
| Personal emails | 4 | with calls 2, 7, 12 and 25 | A person |
| Automatic emails | 81 | 180 days (a welcome, then 80) | The software, already running |

So on any day the board can say, for example, "Call 3 of 25 · Emails 8 of 81 · Day 7".

## 1. The minute a lead comes in

1. **Automatic, already running:** the lead is saved, the owner alert email
   goes to hello@ and pat@, and the welcome email goes to the lead.
2. **A person, right away:** call. The first call is due the moment the form
   lands. Five minutes is the deadline, not a wait. A lead inside its first
   hour sits at the very top of the Next actions list, above everything else
   on it (from the first real run).
3. **No answer:** call straight back (the double dial). Still no answer:
   leave voicemail 1, send text 1 if texting is allowed, and send personal
   email 1 ("Tried to call you just now").
4. **Same day, a few hours later:** call 3.

The first call never talks price. One question: "How many more jobs do you
want on the board this month?" Then listen, and book the second call before
hanging up. That is Pat's process from the recordings (Sep 30 to Oct 2).

## 2. Who gets which plan

| Plan | Who | Calls | Days |
| --- | --- | --- | --- |
| Full | Anyone who answered the contractor form, and any lead marked high or hot | 25 | 90 |
| Standard | Every other open lead | 9 | 21 |
| Light | A fit check (an employee, or someone hiring a contractor) and anything marked low | 3 | 3 |

Pat's follow-up groups come from the form answers and decide the order
inside each list: Priority first (owner or manager, yes to the investment,
wants jobs soon), then Funding review, then Standard, then Fit check.

## 3. The full plan, call by call

Calls go out Monday to Saturday, 9:00 AM to 7:00 PM Central. Never Sunday. A
step that lands on a Sunday moves to Monday. This is a conservative choice,
not a statement of what the law allows. A time a person promised a lead
always wins over the plan.

<!-- plan:full -->
| Call | Day | When | What | If no answer, leave |
| --- | --- | --- | --- | --- |
| 1 | Day 0 | right away | First call, inside five minutes | nothing |
| 2 | Day 0 | right away | Call straight back, then leave word three ways | voicemail, text, email |
| 3 | Day 0 | a few hours later | Same day, a few hours on | nothing |
| 4 | Day 1 | morning | Next morning | voicemail |
| 5 | Day 1 | afternoon | Next afternoon | text |
| 6 | Day 2 | afternoon | Day 2 | nothing |
| 7 | Day 3 | morning | Day 3 | email |
| 8 | Day 4 | afternoon | Day 4 | nothing |
| 9 | Day 5 | morning | Day 5, end of week one | voicemail, text |
| 10 | Day 7 | afternoon | Week two | nothing |
| 11 | Day 9 | morning | Week two | nothing |
| 12 | Day 11 | afternoon | Week two | voicemail, email |
| 13 | Day 14 | morning | Week three | text |
| 14 | Day 17 | afternoon | Week three | nothing |
| 15 | Day 21 | morning | Week four | nothing |
| 16 | Day 24 | afternoon | Week four | voicemail |
| 17 | Day 28 | morning | Week five | nothing |
| 18 | Day 35 | afternoon | Week six | nothing |
| 19 | Day 42 | morning | Week seven | nothing |
| 20 | Day 49 | afternoon | Week eight | text |
| 21 | Day 56 | morning | Week nine | nothing |
| 22 | Day 63 | afternoon | Week ten | nothing |
| 23 | Day 70 | morning | Week eleven | nothing |
| 24 | Day 77 | afternoon | Week twelve | nothing |
| 25 | Day 90 | morning | Last call | voicemail, email |
<!-- /plan:full -->

A lead with no call for a few days is not asked for nine calls in one
afternoon. It owes the next call now, and the one after that as far behind it
as the plan put them.

### The standard plan

<!-- plan:standard -->
| Call | Day | When | What | If no answer, leave |
| --- | --- | --- | --- | --- |
| 1 | Day 0 | right away | First call, inside five minutes | nothing |
| 2 | Day 0 | right away | Call straight back, then leave word three ways | voicemail, text, email |
| 3 | Day 1 | morning | Next morning | nothing |
| 4 | Day 2 | afternoon | Day 2 | voicemail |
| 5 | Day 4 | morning | Day 4 | text |
| 6 | Day 7 | afternoon | Week two | nothing |
| 7 | Day 10 | morning | Week two | voicemail, email |
| 8 | Day 14 | afternoon | Week three | nothing |
| 9 | Day 21 | morning | Last call | voicemail, email |
<!-- /plan:standard -->

### The light plan

<!-- plan:light -->
| Call | Day | When | What | If no answer, leave |
| --- | --- | --- | --- | --- |
| 1 | Day 0 | right away | First call, inside five minutes | nothing |
| 2 | Day 1 | morning | Next morning | voicemail, email |
| 3 | Day 3 | afternoon | Last call | email |
<!-- /plan:light -->

## 4. Texts

- A text goes only to a lead with texting consent on file and no STOP since.
  The Next actions page shows no text button and no text script otherwise.
- The contractor form says "Our team will call or email you." It does not
  ask for permission to text, so most leads from it cannot be texted until
  they text us first or say yes on a call. On Oct 7, 2026 none of the ten
  leads from that form had texting consent on file.
- Text 1 carries "Reply STOP to opt out." A STOP is honored everywhere, at
  once, and is never undone by software.
- No links in a text.

## 5. Emails

- **Automatic (already running):** the welcome on day 0, then the contractor
  series: daily through day 30, every 2 days to day 60, every 3 days to day
  120, every 4 days to day 180. 81 in all. Each one carries a one-click
  unsubscribe. The series stops on its own when the lead is booked, gets a
  proposal, is won or lost, or unsubscribes. A reply or a phone call does not
  stop it.
- **Personal (new, by hand):** four short notes from the person making the
  calls, sent from their own mail app. They go only to a real address that
  has not unsubscribed.

## 6. After somebody picks up

1. Save the outcome on the call card before doing anything else: booked,
   wants a proposal, call back, or not a fit. Without a next step saved, the
   board cannot bring the lead back to you.
2. Call two is the numbers call. Before it: read the notes, look at their
   area, work the numbers, and have Scott's result ready in his own words.
3. **After a proposal goes out:** five follow-ups, on days 1, 3, 5, 7 and 14.
   Then it is a decision: yes, no, or parked for 30 days with one date set.

## 7. Where to log it

One place: the call card (the owner) or the lead page on the sales desk. Tap
the outcome after every call, answered or not. That is what moves "Call 3 of
25" to "Call 4 of 25".

Until the two are joined, also move the lead in Meta's Leads Center. Meta
uses those stages (Initial Call Made, Qualified, Converted) to look for more
people like the best leads.

**The board only knows the record.** A call made from a personal cell phone is
on no record at all, so the page says "no call is on the record" and never
"nobody called". On Oct 7, 2026 the calls on the newest leads had been made
from a cell phone and recorded on Fieldy. One of them was on the lead as a
line of words, and the rest were not on it at all. Call from the LeadFlow
line, or log it.

What the board counts as a call we placed:

- an outgoing call on the LeadFlow line;
- an outcome tapped on the call card or the sales desk lead page;
- a call a person wrote down in words on the lead, such as "Name: Call ...
  answered, rescheduled to tomorrow" (from the first real run: the lead it
  was on showed "no call on the record" and its promised call back was
  ignored). When the words do not say whether anybody picked up, it counts as
  an attempt and no conversation is claimed.

A note written by software (a recording review, a sync) is history. It is not
a call and it is not follow-up.

## 7a. How the list is ordered (from the first real run)

1. **A lead inside its first hour.**
2. **Somebody who reached out and has no reply on the record.** Never filed
   under old work, however long it has been.
3. **A call you promised**, then **proposals**, then **first calls**, then
   **set the next step**, then **the next attempt on the plan**. Inside each,
   Priority leads first, and the freshest first.
4. **The backlog:** anything more than 7 days past due. It is real work, and
   it sits under today's list instead of on top of it. On Oct 7, 58 leads
   shared one follow-up date that had been stamped in a batch two weeks
   earlier, and they outranked that week's proposals until this rule.

Three kinds of text are not "they reached out":

- the opt-out word itself (STOP, unsubscribe);
- a short closing word (thanks, OK, a thumbs up, a tapback);
- a machine's own message ("Reply Y to receive msgs", a login code).

A lead who texted STOP stays on the call and email plan. No text goes to
them, and their row says so.

**Unknown callers.** The phone line saves a lead record for every number it
does not know, and names it "Unknown". On Oct 7 fourteen of the thirty
"leads" from the week were these. Thirteen were calls somebody had picked up:
by their call summaries, eleven were the same sales robocall about a Google
listing, and two had no summary to go by. They are listed apart, for one
decision each: put a name on it, or close it. They are not due, they get no
script, and they are not counted as leads or as people talked to. One
exception: an unknown number that texts or calls with nobody answering is
still "they reached out". The fourteenth was exactly that: a text asking for
a scheduling link.

## 8. When to stop

- They say stop, in any words: stop. Mark it. Texts and emails stop too.
- Not a fit: close it as lost, with the reason in their words.
- 25 attempts and no conversation: stop calling. The automatic emails carry
  on to day 180, and the record stays open in case they reply.
- A lead that sat past the end of its plan without a single call is not put
  back at "call 1, weeks overdue". It is listed apart, for one decision: call
  once, or close it.

## 9. The scorecard

The Next actions page prints these for the last 7 or 28 days, and says in
plain words what to fix, do less of, do more of, or keep.

| Number | The plan's target |
| --- | --- |
| Called inside 5 minutes | Every lead that arrives in calling hours |
| Call attempts in the first two days | 5 (three on day 0, two on day 1) |
| Talked to | Counted, no target yet |
| Priority leads (from the form answers) | Counted, no target yet |
| At proposal | Counted |
| Ad spend, spend per priority lead, spend per proposal | Owner only, read from Meta |

These targets are the plan's own. They are not industry statistics, and
nothing here promises a result.

Small numbers do not get verdicts:

- An ad needs 10 leads before its cost is compared with another ad's.
- 8 form answers are needed before the board says who the ad is pulling.
- A wait to the first call is only called typical with at least 3 calls on
  the record, on at least half the leads. Three logged calls out of sixty-six
  say the calls are not being logged, not that they are slow.
- The share of emails opened is measured against delivered emails, never
  against emails sent, and gets a verdict only after 50 delivered emails and
  7 days of tracking. Delivery and open events began recording on Oct 6,
  2026; before this rule, six opens against a week of sends read as 2%.
- Unknown callers are left out of every number, and get a line of their own
  once 5 pile up in the window.

## 10. Who owns what

| Job | Owner |
| --- | --- |
| First call inside five minutes | Not assigned in writing yet |
| Working the plan each day | Not assigned in writing yet |
| Proposal follow-ups | Not assigned in writing yet |
| Changing a number in this plan | Ryan |

On the recordings Pat makes the sales calls and Ryan reviews proposals before
they go out. That is context, not an assignment. Write the names in here.

## 11. What is automatic, and what is switched off (read Oct 7, 2026)

- Running: the owner alert email, the welcome email, the automatic email
  series (64 automatic emails went out that morning, 7 of them to contractor
  leads).
- Off: the instant text alert to the team's phones and the automatic first
  text to the lead. 36 of each were queued and never sent, which is what the
  queue looks like when the switch (`SPEED_TO_LEAD_ENABLED`) is not on.
- Not on the record: any answer, automatic or typed, to a text that came in
  on the LeadFlow line on Oct 6. No outgoing text of any kind is on record
  after it. Whether the automatic "got your text" answer is switched off or
  failing was not checked.
- Not built: any automatic text or call cadence. This plan adds none.

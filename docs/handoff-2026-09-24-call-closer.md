# Call Closer handoff, September 24, 2026

The September 20 plan found the gap that keeps revenue at zero: the ads
bring people in, the software emails them within minutes, and then nobody
calls. The call sheet fixed the list. The Call Closer fixes what happens
next. Every call becomes a recorded outcome in two taps. Every promise
("call me Thursday") comes back on the right morning. When someone says yes,
the published pay link is on the screen for Ryan to send from his own phone.

Nothing in this change sends a message, charges a card, or needs a database
migration or an environment variable.

## What changed

| Surface | Before | Now |
| --- | --- | --- |
| Call sheet rows | "Open and log the call" went to the full lead page, where the only tool was a free-text note | "Open call card" goes to a phone-first card for that one call |
| Call sheet tiers | Reply owed, answer now, still waiting, follow up | Adds "You said you would call": a lead whose promised time has come, with the last note quoted |
| Call sheet header | Counts only | Adds one line from your own records: how many of the last seven days' new leads a person reached out to within 24 hours |
| After a call | Write a note, remember the rest | Tap what happened; the card shows exactly what will be saved before you save it |
| When they say yes | Find the link yourself | The card shows the published pay link and a message you send yourself |
| Proposals | "Pay the deposit on the Website Launch link" with no link | Prints the real link for each offer, says "no payment is due" for a free build, and has a "Mark the proposal sent" button that sets the two-day follow-up |
| Sales Desk (Pat) | "Log completed call" stamped a date the call sheet never read | The same outcome panel, so Pat's calls clear Ryan's sheet and set the same callback |
| Lead page | Draft proposal, create invoice, copy pay link | Adds "Log a call" |

## How a call flows

1. 7:30 AM: open `/admin/call-sheet` and tap "Open call card" on the first row.
2. The card shows who they are, a big Call button, a Text button only if they
   consented and never replied STOP, an Email button only for a real address
   (and says why when a button is missing), their own words, and the last notes.
3. Tap Call. After the call, pick one of seven outcomes:
   - **Booked the sit-down**: pick the day and time. It becomes the next follow-up and a meeting task.
   - **Wants a proposal**: pick the offer. A proposal task lands on the next Tuesday or Thursday, the plan's proposal slots, and "Draft the proposal now" opens it with that offer.
   - **Ready to pay now**: pick what they are paying for. The card shows the pay link and the message to send.
   - **Talked, call back later**: pick a time. The lead comes back then.
   - **No answer** or **Left a voicemail**: nothing about the lead's stage changes, because nobody talked. The retry comes back the next business day, then two, then four. The time of day alternates between morning and afternoon, and after several misses the card suggests a text or email instead.
   - **Not a fit**: pick a reason. The lead closes.
4. The "When you save" box lists exactly what saving writes, and it always ends
   with "Nothing is sent to <name>." Save.
5. The lead leaves the sheet until the time you set, then comes back under
   "You said you would call".

Times are Central and correct across the November 1 clock change. Weekends
are skipped. Holidays are not; pick a date by hand around them.

## What gets written, and what never does

A save writes, in order, through the signed-in person's own permissions:
the lead's stage (forward only), last-contacted time (only when you talked),
and next follow-up; a note in plain English; a task when there is one; and a
timeline entry. It never writes a call record (the public scoreboard counts
those), never contacts the lead, and never uses the service key.

A double tap or a retry after a dropped connection does not save twice. If
part of a save fails, the card says exactly what saved and what did not, and
keeps what you typed.

Every price and link comes from `lib/site/offers.ts`, `lib/site/prices.ts`,
and `lib/site/external-links.ts`. An offer with no published price
(the agency services) never shows an amount and cannot be sent as a pay link
until the number is in writing.

## Try it without touching real data

- `/admin/call-sheet/sample`: the call card on a fictional lead. Every outcome
  previews, and Save is disabled.
- `/admin/proposals/sample-build?offers=website_launch`: a proposal with the
  real deposit link and the "Mark the proposal sent" preview.
- `npm run call-closer:demo`: the whole loop in the terminal, with no sign-in
  and no database: the sample card, a Friday afternoon miss coming back Monday,
  a voicemail across the clock change, a yes on the phone with its pay-link
  message, the proposal's acceptance lines, and a call sheet keeping a promise.

## How it was tested

- 192 new unit tests (1,514 in the suite, all passing), covering every outcome,
  the Central-time math across both clock changes, who may save (signed out,
  wrong role, a forged author), repeated saves, partial failures, and the
  database rules a sales user is held to.
- A three-round adversarial review: six reviewers (business rules and time,
  security, data integrity, facts and copy, phone use, regressions) raised 69
  candidate problems. Two independent skeptics checked each one. The 49 that
  held up are fixed with tests. The review also found and closed an open
  redirect in the sign-in return path that predates this change.
- A scripted walk-through of nine journeys on a 390 by 844 phone screen, in the
  real app, against a local fake database of fictional leads: sample card,
  no answer, proposal then marked sent, ready to pay, double save, a forced
  save failure, the Sales Desk, and signed-out access. The layout problems it
  found are fixed and re-checked.
- Type check, lint, the facts gate, the link check, the calculation gate, and
  the full production build all pass.

## Rollback

Revert the merge commit on `main`. There is no migration and no environment
change to undo. Notes and follow-up dates written while it was live stay on
the leads and remain readable in the normal lead page.

## Needs Ryan

Items 70 to 77 in `docs/decisions-needed.md`. The first one is the only one
that blocks: look at the sample card on the preview and approve the merge.

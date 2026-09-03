# DA L07: Diagnose the Change

## What you will finish

Move from what changed to where, why, confidence, and the next test. When you are done you will have written one diagnostic memo on a real change in your own numbers, with the calculation checked, the change located in one segment, causes ranked by evidence, and the smallest next check named.

## Why this matters

The dashboard is going to show you a drop. That is its job. The danger is what happens in the next ten minutes, when someone says "it is the new ad," everyone nods, and the real cause goes unlooked at for a month.

Here is the scene. A realtor in Marshall sees leads fall from 14 to 6 in a week. She doubles the ad budget. Leads stay at 6, because the drop was a broken form on the landing page and the ad was fine. She paid double for a week to learn what a five-minute check would have told her.

Most metric changes are one of three things. The number is wrong. One segment moved and the rest did not. Or something real happened. Diagnosis is walking those three in order and refusing to skip to the story.

The scoreboard makes this faster because the windows are fixed and the sources are known. Bring the metric card from lesson two and the source map from lesson three for the number that moved. You will need both.

## The lesson

### 1. Verify the number

Before you explain a change, prove it happened. Four checks, in this order.

Window check. Did the window shift? A seven-day window ending yesterday moves every day, so a big weekend rolling out of the window looks like a drop. Write out both windows with dates and compare the same seven days against the prior seven.

Definition check. Did anybody change the card? A new exclusion, a dedupe rule applied for the first time, a source picklist cleaned up. Any of those changes the count without changing the business. Look at the dictionary's change notes.

Source check. Did the source report? Look at the quality strip. If page_events stopped writing on Tuesday because a deploy broke the script, views drop to nothing and it is not a marketing story. If Search Console is three days behind, the last three days are missing, not low.

Recount check. Pull the raw rows and count them, by hand or with one query. If the tile says 6 and the table says 6, the number is real. Write down the query.

What good looks like: a memo whose first section is four lines. Window same. Definition unchanged. Sources reporting. Recount matches.

The mistake is skipping this because the drop feels real. Feeling real is exactly how a broken tracking script gets blamed on Google.

### 2. Segment the change

A total hides the location. Split the number by the dimensions on its card: source (paid, unpaid, direct, referral), page, campaign, device, day of week, and business if you run more than one.

For each segment write the previous window, the current window, and the difference. Then contribution: how much of the total change this segment explains. If leads fell by 8, paid leads fell by 8, and unpaid held, paid explains 100 percent of the drop. You now know where to look and, just as important, where not to.

Keep going one level down inside the segment that moved. Paid leads fell. By campaign? One campaign went to zero on Wednesday. By landing page? All on one page. Now the where is precise: one campaign, one page, one day.

Watch for a segment moving the opposite direction. If unpaid rose while paid fell, the total hides a shift, not a loss, and the diagnosis is different.

What good looks like: a short table of segments with contributions that add up to the total change.

The mistake is segmenting by everything at once and drowning. Source first, then page, then time. Three cuts find most problems.

Example: a home cleaning company in Henderson saw clicks fall 35 percent. By device, mobile fell and desktop held. By page, only the home page. The where was a mobile call button that had slipped below a new banner. Nothing to do with demand.

### 3. Separate evidence from hypothesis

Now, and only now, list the causes. For each one write what evidence you have, what evidence you would expect to see if it were true, and whether you have looked.

"Ad set stopped delivering: evidence, Ads Manager shows spend ended Wednesday, observed." That is a fact. "A competitor started advertising: evidence, none yet; would expect a higher cost per result in Ads Manager; not checked." That is a hypothesis. Both go in the memo, labeled.

Rank them by evidence, not by how good the story sounds. Facts on top. Hypotheses with a cheap check next. Hypotheses that would take a month to test at the bottom.

Then name the smallest useful next check. Not "run an experiment." "Open Ads Manager, confirm the ad set status, and read the reason." Ten minutes. If that confirms it, the memo ends with a fix. If it does not, the next-cheapest check moves up.

Say what you do not know. A confidence line, in plain words: "High confidence the drop is the stopped ad set. Low confidence on why it stopped." Never write "the drop was caused by" unless you observed the mechanism. Correlation on a week of small numbers is not a cause, and small numbers are what a local business has.

What good looks like: a one-page memo. What changed, with numbers. Verified. Where it changed, with contribution. Causes ranked with evidence status. Confidence. Next check, owner, date. Store it in Notion or the Diagnostic memo section of the workbook.

The mistake is the memo that argues for one cause from the first line. If you already know the answer, you are not diagnosing.

One more habit. When the change is good, run the same memo. A jump in leads that came from a spam wave will hurt you later if you scaled the ad because of it.

## Worked example

Piney Woods Realty in Marshall is a fictional example, and every number here is invented for the walkthrough. Broker Dana runs two agents and a Meta campaign for a new subdivision.

Leads fell from 14 to 6 week over week on the scoreboard. Dana ran this with the two windows, leads by source, the campaign list, and the quality strip pasted in:

"Diagnose this metric change: [leads 14 to 6, both windows with dates, leads by source and campaign, the quality strip]. Verify calculation, compare periods, segment by source and cohort, identify contribution, list plausible causes, rank by evidence, and recommend the next check. Do not claim causation without evidence."

Example output:

```text
Verified: windows Aug 18 to 24 vs Aug 25 to 31; definition unchanged; page_events and leads table reporting; recount 14 and 6, matches.
Segment by source: paid 9 to 1 (100 percent of the drop); unpaid 5 to 5.
Segment paid by campaign: Ridgeview subdivision 9 to 1; last lead Aug 26.
Causes ranked: (1) ad set stopped delivering, observed in Ads Manager, spend ended Aug 26; (2) lead form webhook failing, not yet checked; (3) audience fatigue, no evidence.
Confidence: high that the drop is the stopped campaign; unknown why it stopped.
Next check: open the ad set and read the status reason, then check the webhook log for Aug 26 to 31.
```

Review against the pass standard: the diagnosis shows calculations, distinguishes fact from hypothesis, and identifies the smallest useful next check. The calculations were there. The evidence labels were there. The next check was two checks, not one.

The one revision: Dana split it. The smallest check was the ad set status, because delivery was already observed as stopped and the reason was one click away. It read "campaign ended, lifetime budget reached." Ten minutes. The webhook check moved to the follow-up list in case leads did not recover after the restart. Memo approved. Budget was not doubled.

## Exact working prompt

```text
Diagnose this metric change: [paste data and context]. Verify calculation, compare periods, segment by source and cohort, identify contribution, list plausible causes, rank by evidence, and recommend the next check. Do not claim causation without evidence.
```

## Guided practice

1. Pick the biggest change on your dashboard this week and write out the two windows with dates.
2. Run the four verification checks and write one line for each.
3. Split the number by source, then page, then day, and write the contribution for each.
4. Paste the numbers and context into the prompt and label every cause observed or hypothesis.
5. Write the smallest next check, do it, and record the result in the Diagnostic memo section of the workbook.

## Assignment and evidence

Write one metric diagnostic from current business data.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

The diagnosis shows calculations, distinguishes fact from hypothesis, and identifies the smallest useful next check.

## Common mistakes

- Explaining before verifying. Fix: window, definition, source, recount, in that order.
- Diagnosing the total. Fix: segment until one slice explains most of the change.
- Writing "caused by" from a week of data. Fix: label it a hypothesis and name the check.
- Ten next steps. Fix: one, the cheapest, then the next only if needed.
- Skipping the memo on good news. Fix: same process; a spike can be spam.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** What-where-why-next ladder.
**Screen recording:** Show the leads tile dropping on the scoreboard, split the leads table by medium in the Supabase SQL editor to isolate the paid segment, then open Ads Manager and read the ad set status as the observed fact.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Diagnostic memo.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

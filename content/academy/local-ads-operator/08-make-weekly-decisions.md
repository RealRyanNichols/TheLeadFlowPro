# AD L08: Make Weekly Decisions

## What you will finish

Separate facts from noise and choose keep, pause, fix, or test actions. When you are done you will have a one-page weekly decision note that checks the data first, reads the numbers in order against your guardrails, and logs exactly one approved change with a review date.

## Why this matters

Same week, same account, two opposite mistakes. I turned off one ad after nineteen cents of spend, six impressions, four people reached. It had not lost. It had never run, because four ads were sharing one budget and Meta picked a favorite in the first hour. That was a flinch, not a decision, and it threw away untested creative.

The other ad spent $58 of the $110, more than half, for 13 clicks and nothing else. It should have been paused sooner. Too fast on one, too slow on the other, both from reading numbers without a rule written down first.

Then the week I sat on my hands. A new offer had been live 90 minutes with maybe $10 on it and zero leads. The note said: hold, no changes, first soft look tomorrow evening, no restructure before 48 to 72 hours or $70 to $105 on the new offer. That is what a decision looks like. It has a rule, a number, and a date.

This is the last lesson, and the one you repeat every week for as long as the ads run. Bring all of it: the brief, the budget sheet, the matrix, the tracker, the page, the measurement map, and the launch folder with its screenshots.

## The lesson

### 1. Check data quality

Before you read a single result, check that the numbers are real. Every week, in this order, yes or no next to each.

Does the lead count in Meta's form library equal the count in your table? If Meta says nine and you have four, stop. The decision this week is fix the sync. Did form success fire once per lead? Does Meta's spend match the card charge? Are test rows still counted? Was any ad paused or in review for part of the window? Is every lead's status real, or is there a "new" that somebody already met with on a video call and never updated? That one cost me a week of wrong conclusions.

If tracking is broken, there is no creative decision to make. Judging an ad on broken data is worse than not judging it.

Then check whether there is enough data at all. My floor is 48 to 72 hours of delivery and roughly $70 to $105 of spend on a single offer before any structural change. An ad with under five dollars on it has not been tested. It has been ignored by the algorithm. Write "insufficient" next to it and move on.

Watch frequency too. In a small service area it climbs fast. At 1.3 on day two I know cost per click will drift up inside a week. That is a creative rotation problem, not a broken ad.

What good looks like: six yes or no lines at the top of the note before any number appears.

The mistake: opening Ads Manager and reading the cost per result column first.

### 2. Compare to guardrails

Now pull out the budget sheet from lesson two. The daily cap, the total cap, the target range, the stop rules. Report the stages from the measurement map in order, top to bottom, and put the guardrail next to each one.

Spend against the daily and total cap. Delivery: impressions, reach, frequency, cost per thousand. Clicks: rate and cost. Form opens against form submits. Leads, then qualified leads, then appointments, then sales. Cost per qualified lead against the target range. Cost per appointment. Cost per sale if there is one. Confidence: low, medium, or high, based on how many of each you actually have.

Then the decision tree I use in my own account.

Qualified leads arriving inside the target range: keep. Raise the daily budget no more than 20 percent, once, if capacity allows.

Clicks arriving, no leads: fix. That is the form or the page, not the ad and not the audience. Go back to lesson five and fix the first question.

Very few clicks at a high cost per thousand: test. Either the offer or the audience is off, and in my account the offer was the variable every time, so test a new offer before you touch targeting.

Spend at the cap with results below the conservative case: pause, and write up why.

Creative findings go under that. Which ad is carrying the campaign and what it has that the others do not. Mine had a real place, other people, and a question. Which ad is being starved and needs its own ad set.

What good looks like: every number sits next to the guardrail it is being judged against, and the confidence line is honest.

The mistake: declaring a winner on 200 impressions, or comparing an ad that got $39 to one that got nineteen cents as if they had a fair fight.

### 3. Change one major variable

Keep, pause, fix, or test. One major change per week. Offer, or creative, or audience, or page. Not two. Change the offer and the audience in the same week and you will never know which one moved the result.

Log it: date, what changed, why, what you expect, next review date. New creative goes into its own ad set with its own budget. Then the 72 hour clock starts again.

Pausing a leak is not restructuring. Turning off the ad that ate half the budget for nothing is a pause, fine on day three. Rebuilding the campaign around a theory is a restructure, and it waits for the floor.

One more thing, because it happens more than any ad problem. When leads come in and nobody closes them, the ads are not the problem. Follow-up is. My first eight real leads turned into five real conversations, four verbal offers, and zero closes, and every one of those gaps was a follow-up gap. That is The Follow-Up Engine, FU L01 onward. If you want the messages written for you, the $197 Follow-Up Campaign at /go/lead-follow-up is the cheapest real fix I sell.

What good looks like: one line in the change log this week, with a review date.

The mistake: two changes in one week, or the ad blamed for a lead nobody called.

Here is the finish line. You now have a campaign brief, a budget sheet with stop rules, a five angle matrix, nine labeled assets with proof, a page that matches the ad, a measurement map with a passed test click, a launch folder with screenshots, and a weekly note that decides one thing at a time. That is a local ads operation. Most businesses your size do not have one.

What to do with it: run week two, then week three. When the first offer has a stable read, run the second offer through the same eight steps. It goes faster the second time.

Next is Business Dashboard and Analytics, OA09, where this weekly note becomes a dashboard you read in two minutes instead of a page you write in thirty. Bring the note to DA L01.

## Worked example

Rabbit Creek Plumbing in Kilgore is a fictional example, and every number here is invented for the walkthrough. First review, 72 hours after launch.

Marisol pasted this above the prompt: spend $103. Reach 2,140, frequency 1.4. Clicks 61. Form opens 22, form submits 5. Meta form library count 5, table count 5. Qualified 3, appointments 2, sales 0 yet. By ad: A2 video $71, 44 clicks, 4 submits. A1 video $29, 15 clicks, 1 submit. A1 still $3, 2 clicks, 0. A2 still and both text versions under $1 each. Guardrails: daily cap $35, total cap $500, base target $77 per qualified lead, stop at 40 clicks and zero submits.

"Analyze this weekly campaign data: [the numbers above]. First check tracking quality. Then report spend, delivery, click, landing-page conversion, qualified leads, appointments, sales, cost metrics, creative findings, and confidence. Recommend keep, pause, fix, or test with reasons and limits."

Example output:

```text
Tracking: form count matches table, events once per lead, no test rows. Data quality OK.
Spend: $103 of $500 cap over 3 days, under the daily cap each day.
Qualified leads: 3 at about $34 each, inside the conservative target. Confidence low, three leads.
Appointments: 2. Sales: 0, not yet due.
Creative: A2 video carries delivery and submits. A1 video secondary. Four assets under $3 of spend.
Recommendation: keep A2 video, pause A1 video, pause the four low-spend assets as losers.
```

Review against the pass standard. Do the decisions use qualified business outcomes? Yes, it reads qualified leads and appointments, not clicks. Do they respect the budget rules? Yes. Do they avoid declaring winners from insufficient data? No. It called four assets losers at under three dollars each, and it paused A1 video at $29 with one submit, which is a read, not a verdict.

The one revision: keep A2 video, keep A1 video through the next review, and move the A2 still into its own ad set at $10 a day for a fair read. One change, logged, review date Oct 13, 7 PM. The two text versions stay off and are marked "not yet tested," not "lost."

## Exact working prompt

```text
Analyze this weekly campaign data: [paste]. First check tracking quality. Then report spend, delivery, click, landing-page conversion, qualified leads, appointments, sales, cost metrics, creative findings, and confidence. Recommend keep, pause, fix, or test with reasons and limits.
```

## Guided practice

1. Reconcile Meta's form count against your table and write the result at the top of the note.
2. Pin the date range to the review window and pull spend, reach, frequency, clicks, form opens, submits, qualified, appointments, and sales.
3. Run the exact prompt with the numbers and your guardrails pasted in.
4. Mark every ad under $5 of spend as insufficient, not lost.
5. Choose one change, log it with date, reason, expectation, and next review, and close Ads Manager.

## Assignment and evidence

Write the weekly decision note and log approved changes.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Decisions use qualified business outcomes, respect the budget rules, and avoid declaring winners from insufficient data.

## Common mistakes

- Reading results before checking tracking. Fix: reconcile counts first, every week, and stop if they do not match.
- Calling a starved ad a loser. Fix: under $5 is insufficient, so give it its own ad set.
- Deciding on clicks. Fix: qualified, appointment, sale, in that order.
- Two changes in one week. Fix: one major variable, logged, then 72 hours of nothing.
- Blaming the ads for leads nobody called. Fix: the follow-up clock from FU L01 before you touch a campaign.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Keep-pause-fix-test matrix.
**Screen recording:** Ads Manager with the date range pinned to the 72 hour window and columns set to spend, reach, frequency, cost per click, form opens, and form submits, then the weekly note being filled in and the one change being logged.
**Course map:** the course visual below anchors where this lesson sits.

![The Local Ads Operator course visual](/images/academy/local-ads-operator.svg)

## Downloadable

[Open the Local Ads Operator workbook](/downloads/operator-academy/local-ads-operator-workbook.pdf)

Workbook section: OA08 Ads Workbook, Weekly decision report.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

# WC L08: Improve From Behavior

## What you will finish

Use first-party events and buyer feedback to make one controlled improvement at a time. When you are done you will have a baseline for your main page, the one drop in the path that matters most, and one experiment card that says what you are changing, for how long, and how you will know if it worked.

## Why this matters

The site is live. Now the temptation starts. Your cousin says the button should be green. A customer says the page is too long. And you change things every week with no idea whether any of it helps, because you never wrote down the numbers before you touched it.

Here is the scene. A mobile detailer in Gilmer redesigns his booking page three times in two months. The data says the page is fine: most people who reach the form book. The problem is that hardly anyone reaches the page, because the link in his Google Business Profile still points at the old homepage. Three redesigns to fix a problem that was one link.

First-party behavior means what visitors actually did on your site, recorded by tools you control. Page views, button taps, form starts, form submits, thank-you views, calls. You set the success events up in lesson one and made sure they fire in lesson seven. Now you read them.

One change at a time, measured against a baseline, for a set window. That is the whole discipline. It is slower than guessing, and it is the only way to know.

## The lesson

### 1. Establish a baseline

Bring the page-job briefs from lesson one. The success event on each brief is your decision metric. Open Vercel Analytics, Google Analytics, or the Supabase leads table from lesson six, which is the truest count you have. And bring buyer feedback: what real people said about the page, or did while you watched them use it.

A baseline is what the numbers look like before you change anything. Without it, you cannot tell if a change helped, hurt, or did nothing.

Pick the main page, the one with the biggest entry point. For the last two to four weeks, write down views, form starts or call taps, submits, thank-you views, and how many became a real conversation. That last one comes from your lead record, not from the website.

Write the source of each number next to it. "Views: Vercel Analytics. Submits: Supabase leads table. Conversations: the conversation log from FU L06." If two tools disagree, and they will, pick one per number.

If the site is new and the numbers are tiny, write them down anyway. A baseline of 40 views and 3 submits is still a baseline.

What good looks like: five or six numbers with sources, dated, saved in the workbook. The mistake is trusting your memory. Memory rounds up.

### 2. Find the largest useful drop

Lay the numbers out as a path, the same path from lesson two. Views, form starts, submits, thank-you, conversations. Between each pair there is a drop, and some drop is normal at every step. You are looking for the biggest drop you can actually do something about on this page.

Say 400 people viewed the page, 60 started the form, 50 submitted, 48 saw the thank-you page, and 20 became a conversation. The biggest drop is views to form starts: 340 people looked and did nothing. That is where the page is losing. The form itself is fine, 50 of 60 finished it. Fixing the form would be working on the wrong step.

"Useful" means decision-relevant. If the drop is before the page, like the detailer's broken link, the fix is upstream and the test happens there.

Separate facts from hypotheses. A fact: 340 of 400 left without starting the form. A hypothesis: the first screen does not match the ad they clicked. Another: the button is below the first screen on phones. Write facts in one column and guesses in another. The prompt below does this when you paste in the numbers and the feedback, and proposes tests.

Buyer feedback fills in what the numbers cannot. Watch one person use the page. Hand a customer or a friend your phone and say "book a detail." Do not help. Where they hesitate is a hypothesis with a face on it.

What good looks like: one named drop, a fact line, and two or three hypotheses ranked by evidence. The mistake is picking the drop that is easiest to change instead of the one that is largest.

### 3. Test one change

One variable. Change the headline, or the button position, or the first screen photo. Not all three. If you change three things and it gets better, you do not know which one did it, and you cannot repeat it on the next page.

Write the experiment card. The workbook has the layout. Hypothesis: what you think is wrong and why. The change: one thing, exactly what will be different. Decision metric: the success event from the page-job brief, here form starts or call taps per hundred views. Baseline: the number from step one. Window: usually two to four weeks, or long enough to see a real difference. Success threshold: the number at which you keep the change. Stop threshold: the number at which you put the old version back early because it is clearly worse.

The prompt returns three tests ranked by effort and evidence. Pick the one with the most evidence that you can ship this week. Not the most interesting one.

Then leave it alone for the window. Do not peek on day two and declare victory. Small numbers swing. When the window closes, compare to the baseline, write the result on the card, and decide: keep, revert, or run longer.

Be honest with yourself. If your page gets 40 views a week, a change from 3 submits to 4 is noise, not a result. Sometimes the right answer is "not enough traffic to test, work on the entry points first," and OA08 Local Ads Operator is where that gets fixed.

What good looks like: one card, one variable, one metric tied to the page job, a window with dates, and both thresholds written before the test starts. The mistake is writing the success threshold after you see the result.

Example: one headline change so the first screen repeats the ad's offer, form starts per 100 views, three weeks, keep at 20 or higher, stop below 12 for a full week.

Here is where you stand at the end of the course. What you have now: page-job briefs, a site path, an annotated wireframe, human copy, a page in your own GitHub account running on Vercel, a form that writes to a Supabase table you own with source and consent on every row, a QA record, a baseline, and an experiment card. That is a website that runs your business instead of sitting there, on accounts in your name.

What to do with it: run the loop once a month. Baseline, drop, one card. Every new offer page goes through lessons one through seven before it goes live. OA08 Local Ads Operator covers the ads that feed the site, and OA09 turns these numbers into a weekly review.

Next course: OA07, AI Agents for Business. The record you just built is what an agent works from, with a human approving anything that matters.

## Worked example

Gilmer Mobile Detail is a fictional example. One owner and a van. Booking page for a full interior reset, live for six weeks after the Google Business Profile link was fixed.

The owner ran the lesson prompt with four weeks of numbers and the feedback he had collected:

"Analyze this page performance data: views 410, call taps 22, form starts 58, submits 47, thank-you 46, conversations 31, over four weeks. Feedback: two customers unsure of service area, one tester scrolled past the button twice. Separate facts from hypotheses, identify the largest decision-relevant drop, propose three tests, rank by effort and evidence, and define success and stop thresholds."

Example output:

```text
Facts: 410 views, 80 took an action (22 calls, 58 form starts), 47 submitted. Largest drop: views to action, 330 of 410 did nothing.
Hypotheses: service area unclear in the first screen; main button not visible without scrolling on phones; no price range so people leave to compare.
Test A: add "Serving Gilmer, Longview, and Big Sandy" under the headline. Low effort, two feedback items support it.
Test B: move the button into the first screen on mobile. Low effort, one observation supports it.
Test C: add a price range. Medium effort, no direct evidence.
Ranking: A, B, C. Decision metric: actions per 100 views, baseline 19.5. Window: three weeks. Success: 24 or higher. Stop: below 15 for a full week.
```

Review against the pass standard. Does the test change one main variable? Test A changes one line of text. Defined window? Three weeks, with start and end dates on the card. Decision metric tied to the page job? Actions per hundred views, the success event from the page-job brief. It passes.

The one revision: the first draft of the card set the success threshold as "more bookings." Not a number, and not the page metric. We changed it to 24 actions per 100 views, written on the card before the headline changed, so the owner could not talk himself into a win later.

## Exact working prompt

```text
Analyze this page performance data: [paste metrics and feedback]. Separate facts from hypotheses, identify the largest decision-relevant drop, propose three tests, rank by effort and evidence, and define success and stop thresholds.
```

## Guided practice

1. Pull two to four weeks of numbers for your main page and write each one with its source.
2. Lay them out as a path and circle the largest drop you can affect from this page.
3. Run the prompt with the numbers and any buyer feedback pasted in.
4. Pick the highest-evidence test you can ship this week and fill in the experiment card, with success and stop thresholds as numbers before you change anything.

## Assignment and evidence

Choose one test, record the baseline, and write the experiment card.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The test changes one main variable, has a defined window, and uses a decision metric tied to the page job.

## Common mistakes

- Changing the page with no baseline. Fix: write the numbers down, with sources, before you touch anything.
- Fixing the easiest step instead of the biggest drop. Fix: rank drops by size and by whether this page can affect them.
- Three changes at once. Fix: one variable per card.
- Deciding on day two. Fix: set the window in advance and wait for it.
- A success threshold written after the result. Fix: numbers on the card before the test starts.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Baseline to test loop.
**Screen recording:** Show four weeks of numbers in Vercel Analytics and the Supabase leads table, lay them out as a path in the workbook, run the prompt, and fill in the experiment card live with the thresholds written before anything changes.
**Course map:** the course visual below anchors where this lesson sits.

![The Website Conversion System course visual](/images/academy/website-conversion-system.svg)

## Downloadable

[Open the Website Conversion System workbook](/downloads/operator-academy/website-conversion-system-workbook.pdf)

Workbook section: OA06 Website Workbook, Experiment card.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

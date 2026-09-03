# DA L08: Run the Weekly Review

## What you will finish

Use a fixed meeting rhythm to record decisions, owners, and follow-through. When you are done you will have run one thirty-minute weekly review from your dashboard and published a decision log that says what you decided, why, who owns it, and when it is due.

## Why this matters

Everything you built in this course is worthless if nobody reads it on a schedule. A dashboard nobody opens is a monthly bill with a nicer face.

Here is the scene. The owner looks at the numbers when something feels off. That means the numbers get looked at when it is already late. A fixed thirty minutes every Monday moves the look ahead of the problem, and it is the only way the thresholds you set in lesson one ever get acted on.

The other thing a weekly review does is leave a record. Six weeks from now you will not remember why you paused that ad or why you added the Saturday crew. The decision log remembers. It also tells you which decisions worked, so the thresholds get smarter.

This is the last lesson. It ties the register, the dictionary, the source map, the scorecard, the funnel, the dashboard, and the diagnostic memo into one repeating loop. Bring all of them.

## The lesson

### 1. Review exceptions

Thirty minutes. Same day, same time, same page. Phones down. If you are solo, it is a calendar block with yourself, and you keep it.

Minutes zero to three: data quality. Read the quality strip at the top of the dashboard. Any source unavailable, any failed check. If a critical source is down, say so out loud and mark every decision that depends on it as deferred. You do not decide on a number you cannot trust.

Minutes three to ten: major changes. Which tiles crossed a threshold. Which trend line moved more than usual. If a change is big, someone gets assigned the diagnostic memo from lesson seven. Do not diagnose in the meeting. Assign it.

Minutes ten to seventeen: funnel exceptions. The exception table from lesson six. Leads over 24 hours with no contact, read the names. Estimates over seven days. Invoices past due. These are not discussion items. Each one gets a name and a today or a tomorrow.

Minutes seventeen to twenty-two: cash and capacity. Cash collected, cash expected, booked jobs against crew capacity for the next two weeks. This is where you decide whether to push marketing or pull it.

What good looks like: a meeting that reads the page in order and never scrolls back up.

The mistake is starting with the interesting number. Quality first, then exceptions. Interesting comes last, if there is time.

### 2. Choose actions

Minutes twenty-two to twenty-eight: decisions. For each exception and each crossed threshold, the register already says what the action is. Read it. "Paid leads under 4 for two weeks. Action: pause the ad set." The meeting is not for inventing actions. It is for confirming them, or for writing down why you are overriding the rule this week.

Every action gets an owner, a due date, and the metric that will show whether it worked. "Marcus pauses the Ridgeview ad set today. Watch: paid leads, next two windows." Three or four actions is a good week. Ten means nothing gets done.

Overriding is allowed. The register is a rule you wrote when you were calm. If you break it, write the reason. "Keeping the ad set despite the threshold because two large estimates from it are still open." Next week you will see whether that was right.

What good looks like: actions you could text to someone who missed the meeting, and they would know what to do.

The mistake is actions with no owner, or an owner named "team." One name.

Example: a fence company in Gilmer had a weekly review that produced twelve action items and completed two. We cut it to four. They completed four. The number that matters is the second one.

### 3. Record the decision

Minutes twenty-eight to thirty: the log. One row per decision: date, decision, reason, owner, due date, metric to watch, review date. Then the follow-up part. Read last week's rows and mark each one done, not done, or changed. Not done needs a reason and a new date, or it gets dropped on purpose.

Keep the log where the work lives. A Notion database, a ClickUp list, or a Decisions tab in the same Google Sheet as the dashboard. Not a chat thread. Not memory.

Publish it. Solo, that means it is saved where you will see it next Monday. With a team, it goes to everyone who owns an action, the same day. Publishing is what makes the owner column real.

After four weeks, read the log top to bottom. Which thresholds fired and were right. Which fired and were wrong. Adjust the register. This is how the numbers you picked in lesson one become the numbers you trust in month three.

What good looks like: a log where every "done" points to the number that moved, or did not.

The mistake is a log that records decisions and never checks them. The check is the whole point.

Here is the finish line. You now have a decision register that says what you decide and when. A metric dictionary two people can compute the same way. A source map with one home per number. A quality scorecard that runs weekly. A funnel that reconciles to Stripe. A one-page dashboard with thresholds and flags. A diagnostic memo for when something moves. And a thirty-minute rhythm that turns all of it into actions with names on them.

That is an owned analytics system. No monthly reporting tool required. The entry version runs in Google Sheets. The full version is a Supabase view and one page on Vercel, and it is the same design.

What to do with it: run it four Mondays in a row before you change anything. Then build the next layer. The Company OS Blueprint, OA10, takes this same discipline and applies it to the whole business: records, workflows, roles, approvals, and a control center where this dashboard becomes one panel beside the work queues. The decision log you start today is the first record in that system. Bring it to OS L01.

Run the meeting this week.

## Worked example

Henderson Home Cleaning Co. is a fictional example, and every number here is invented for the walkthrough. Owner Lisa runs four cleaning teams and does the review Monday at 7:30 with her scheduler.

Lisa ran this with her dashboard wireframe, the register, and the last two weeks of decision log rows pasted in:

"Create a thirty-minute weekly business review agenda using this dashboard: [the wireframe, the register, and the last two weeks of log rows]. Include data quality, major changes, funnel exceptions, cash and capacity, decisions, owners, due dates, and follow-up on prior actions."

Example output:

```text
0:00 Data quality: read the quality strip; defer any decision that depends on an unavailable source
0:03 Major changes: tiles over threshold; assign a diagnostic memo, do not diagnose here
0:10 Funnel exceptions: uncontacted leads over 24h, estimates over 7 days, past-due invoices; name and date each one
0:17 Cash and capacity: collected 30d, expected 14d, booked hours vs team capacity for the next 2 weeks
0:22 Decisions: read the register action for each crossed threshold; confirm it or record the override
0:28 Log and follow-up: one row per decision; mark last week's rows done, not done, or changed
```

Lisa ran it. The Quo export was unavailable, so the missed call decision was deferred and logged as deferred. Leads held. Three uncontacted leads got names. Booked hours were at 94 percent of capacity for the next two weeks, over the 90 percent threshold, and the register said pause the recurring Meta ad.

Review against the pass standard: the meeting ends with specific actions, owners, due dates, and a record of why each decision was made. The actions had owners and dates. But the log row for the ad pause said "over capacity" and nothing else, and it had no metric to watch.

The one revision: the row became "Pause the recurring Meta ad. Reason: booked hours at 94 percent of capacity next 14 days, threshold 90. Owner: Lisa. Due: today. Watch: booked hours and unpaid leads, next two windows. Review: Sept 14." Now next Monday can check whether the call was right. Log published to the team. Meeting approved.

## Exact working prompt

```text
Create a thirty-minute weekly business review agenda using this dashboard: [paste]. Include data quality, major changes, funnel exceptions, cash and capacity, decisions, owners, due dates, and follow-up on prior actions.
```

## Guided practice

1. Put a thirty-minute block on the calendar at the same time every week and invite everyone who owns an action.
2. Paste your dashboard and register into the prompt and trim the agenda to six timed blocks.
3. Run the meeting once, reading the page top to bottom, quality strip first.
4. Write one log row per decision with reason, owner, due date, metric to watch, and review date.
5. Publish the log where the team works and read it aloud at the start of next week's review.

## Assignment and evidence

Run the meeting once and publish the decision log.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The meeting ends with specific actions, owners, due dates, and a record of why each decision was made.

## Common mistakes

- Diagnosing in the meeting. Fix: assign the memo, decide next week.
- Deciding on an unavailable source. Fix: defer it and log the deferral.
- Twelve actions. Fix: three or four, each with a name and a date.
- Reason column left blank. Fix: one sentence with the number and the threshold.
- Never reading last week's rows. Fix: the last two minutes are follow-up, every week.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Metrics to decision loop.
**Screen recording:** Run a timed review against the scoreboard page at double speed with a visible countdown, then fill the decision log rows in a Notion database and mark last week's rows done or not done.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Weekly review.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

# DA L02: Define the Metrics

## What you will finish

Write unambiguous formulas, dimensions, windows, and exclusions. When you are done you will have a metric dictionary of twelve cards, each one clear enough that your office manager and your bookkeeper get the same number from the same export.

## Why this matters

"Leads" is the most argued-over word in small business. The ad guy counts every form fill, including the spam. The office counts people who answered the phone. The owner counts jobs he thinks came from the internet. Three people, three numbers, one meeting that goes nowhere.

A metric without a formula is an opinion. Once it is written down, the argument moves from "your number is wrong" to "the definition says this," and that argument is fixable.

My scoreboard at /scoreboard has this problem baked in as a lesson. "Paid leads" could mean leads from paid ads or leads who paid me. On my site it means leads whose source is a paid channel. That is written on the card, so nobody has to guess.

Bring the decision register from lesson one. Every metric in it gets a card here. Lesson three then goes looking for the data each card needs, so the cards have to be exact first.

## The lesson

### 1. Name numerator and denominator

Every metric is either a count or a ratio. A count has one part: leads in a window. A ratio has two: leads divided by views. Most confusion lives in ratios, because people change the bottom number without saying so.

Write the formula like a sentence a stranger could follow. "Lead rate equals the number of lead records created in the window, divided by the number of view events in the same window, for the same business." Then write the grain: is this one row per business per day, or one number for the whole company per week? Grain decides what you can add up later.

Take the five scoreboard metrics as your starter set. Views: count of rows in page_events where event_type is view. Clicks: count of rows where event_type is click and the target is call, text, or form. Leads: count of distinct rows in the leads table created in the window, after the dedupe rule. Paid leads: leads where medium is paid. Unpaid leads: leads minus paid leads, so the two always add up to the total.

Notice the trap in "clicks." Google Search Console also reports clicks, and it means something different: people clicking your listing on Google. My "clicks" means people tapping the call button on my page. Two real numbers, two names. Call the Search Console one "search clicks" on its own card.

What good looks like: a formula you could hand to someone with a SQL editor or a Google Sheet and they could build it without asking a question.

The mistake is a word in the formula that is itself undefined. "Qualified leads" is not a formula input until "qualified" has its own card.

### 2. Set the time window

A number with no window is not a number. "We got 30 leads" means nothing until you say which seven days.

I use rolling windows on the scoreboard: the last seven completed days and the last thirty completed days, ending yesterday at midnight Central. Not including today. Today is a partial day, and it drags every number down at nine in the morning.

Write the window on every card with three parts: length, end point, and time zone. "Seven completed days ending yesterday, America/Chicago." That one sentence is the difference between two people getting the same result and two people arguing.

Also write what you compare it to. Last seven days against the seven days before. Last thirty against the prior thirty. A number alone is a fact. A number next to its previous window is a trend, and trends are what the decision register was asking for.

What good looks like: a school director in Tyler says "tours booked, last 30 completed days ending yesterday, versus prior 30," and everyone in the room knows exactly which rows count.

The mistake is mixing windows on one page. Leads by calendar month next to views by rolling seven days. They will not line up, and someone will build a story on the gap.

### 3. Document exclusions

Exclusions are the rows you deliberately leave out. Write them down, or your number quietly changes every time someone remembers a new one.

The usual list: test submissions from you and your team, obvious spam, duplicates of the same person inside thirty days, traffic from your own office network, bot views, refunded payments, cancelled jobs. Each one goes on the card with the rule that identifies it. "Exclude leads where the email domain is our own." "Exclude view events from the known bot list." "Count one lead per normalized phone number per 30 days."

Then add the misuse warning. This is the line that keeps the metric honest. "Search clicks are not site visits; use views for that." "Lead count rises when the form gets easier, not only when marketing improves." "Paid leads means source, not payment status."

Finish the card with source, owner, and refresh. Source is the table or export. Owner is who defends the definition, usually the decision owner from lesson one. Refresh is how often the number updates: page_events is live, Search Console lags about two days, a Google Sheet updates when somebody types.

What good looks like: a card that survives a new hire reading it cold.

The mistake is keeping the exclusion in your head and applying it inconsistently, so the July number and the August number were built two different ways and nobody knows.

If you are starting in Google Sheets, that is fine. One tab called Metrics, one row per card, ten columns matching the prompt. On Supabase, the card becomes a comment on the SQL view, and the view is the formula. Either way, the card is the contract and the tool obeys it.

Twelve cards is the assignment. Five from the scoreboard, seven from your decision register. If your register needs more than twelve, you have too many decisions for week one. Cut to what you will actually look at.

## Worked example

East Texas Dental Assisting School in Tyler is a fictional example. Director Renee tracks inquiries, tours, and enrollments for a twelve-week program.

Renee listed twelve metrics from her decision register, including "tour show rate," and ran this in Claude:

"Create a metric dictionary for inquiries, tours booked, tour show rate, enrollments, paid leads, unpaid leads, and the six others on my list. For each give business meaning, exact formula, grain, time window, dimensions, exclusions, source, owner, refresh, and warning about misuse."

Example output:

```text
Metric: Tour show rate
Business meaning: share of booked tours where the person actually arrived
Formula: tours with status attended, divided by tours with a scheduled date in the window, excluding cancellations made more than 24 hours ahead
Grain: one row per tour; reported per week
Window: 7 completed days ending yesterday, America/Chicago; compare to prior 7
Dimensions: source (paid, unpaid), campaign, day of week
Exclusions: staff test bookings; duplicates of the same phone within 30 days
Misuse warning: a week with 3 tours makes this rate swing wildly; read the count next to it
```

Review against the pass standard: two people using the definition calculate the same result from the same data. Renee and her admissions coordinator each ran it on the same Supabase export of tours. Renee got 71 percent. The coordinator got 63 percent. Fail.

The gap was the denominator. The coordinator counted tours by the date they were booked. Renee counted by the date they were scheduled to happen. The card said "scheduled date," but the export had both columns with similar names.

The one revision: the formula now names the exact column, scheduled_for, and adds "not created_at" as a note. They reran it. Both got 71 percent. Card approved and moved to the dictionary.

## Exact working prompt

```text
Create a metric dictionary for [list of metrics]. For each give business meaning, exact formula, grain, time window, dimensions, exclusions, source, owner, refresh, and warning about misuse.
```

## Guided practice

1. Pull the input metrics column from your decision register and add views, clicks, leads, paid leads, and unpaid leads.
2. Paste the prompt with your list and read every formula for a word that is itself undefined.
3. Write the window on each card as length, end point, and time zone.
4. Hand one card and the same export to another person and compare results.
5. Fix the card, not the person, until the numbers match, then move it to the Metric dictionary section of the workbook.

## Assignment and evidence

Approve definitions for twelve core metrics.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Two people using the definition calculate the same result from the same data.

## Common mistakes

- Using "qualified" or "good" inside a formula without its own card. Fix: define the word first or drop it.
- Including today in a rolling window. Fix: end every window at yesterday midnight in your time zone.
- Two metrics both named "clicks." Fix: call Search Console clicks "search clicks" and keep button clicks as "clicks."
- Exclusions living in someone's head. Fix: every exclusion gets a written rule on the card.
- Rates with no count beside them. Fix: always show the numerator and denominator next to the ratio.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Metric definition card.
**Screen recording:** Fill in one metric card on screen for "leads," then open the same export in Google Sheets twice and show two different totals until the dedupe exclusion is added and they match.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Metric dictionary.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

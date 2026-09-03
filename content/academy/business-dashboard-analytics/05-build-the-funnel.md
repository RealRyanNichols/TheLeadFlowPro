# DA L05: Build the Funnel

## What you will finish

Trace attention through leads, qualified opportunities, sales, delivery, and retention. When you are done you will have a funnel sheet for one full period, with every stage defined, every count reconciled back to the source records, and a conversion rate between each pair of stages that follows the same group of people top to bottom.

## Why this matters

The funnel is where the numbers start telling a story, and where a bad definition tells the wrong one. A plumber sees 40 leads and 8 jobs and calls it 20 percent. But three of those jobs came from leads in the prior month, and six of the 40 leads were the same two people. The real number is different, and the decision he makes from it is different too.

Here is the scene. The phone rings during a job. The office logs it. The customer also fills out the website form that night. The next morning a Meta lead form fires for the same person. Three leads, one human. If the funnel counts three, every stage below it is inflated.

The scoreboard already holds the top of the funnel: views, clicks, leads, paid and unpaid. This lesson extends it down through qualified, sold, delivered, and retained, using the clean sources from lesson four.

The funnel is also what the dashboard in lesson six draws. Get the stages right here or you will redraw the page.

## The lesson

### 1. Define every stage

Six stages. Attention, leads, qualified, sales, delivery, retention. Each one needs an entry event, an exit event, an owner, and a source table.

Attention: someone saw the business. Entry event is a view row in page_events, or an impression in Search Console or Meta. Exit is a click. Owner is whoever runs marketing. Source: page_events for views, Search Console and Ads Manager for impressions, kept on separate cards because they do not add together.

Leads: a person you can contact. Entry event is a row in the leads table, from a form, a call, a text, or a Meta form. Exit is first contact logged. Owner is whoever answers the phone. Source: leads table.

Qualified: a real, reachable job in your area. Entry event is status set to qualified by a human after a conversation. Exit is an estimate sent or a booking. Write the rule: in service area, wants something you sell, reached at least once. "Qualified" needs its own card from lesson two, not a gut call.

Sales: they said yes and money moved. Entry event is a paid deposit in Stripe or a signed estimate. Exit is the job scheduled. Source: Stripe, joined on stripe_customer_id.

Delivery: the work got done. Entry event is the job marked complete in ClickUp. Exit is final payment. Retention: they came back. Entry event is a second paid job or a maintenance plan within twelve months. Source: Stripe plus the jobs board.

What good looks like: a stage table where a new hire could read the entry event and find the exact rows.

The mistake is stages that overlap. If "qualified" and "quoted" both mean the estimate went out, you have one stage with two names, and the counts will double.

### 2. Use stable identifiers

Every stage counts people, not events. A person can generate three lead events. They are one lead. The identifier that holds that together is the lead id from Supabase, backed by the normalized phone.

The dedupe rule from lesson four applies at the leads stage: one lead per phone per 30 days. Then that lead id rides down the funnel. The Stripe customer carries the lead id. The ClickUp task carries the lead id. When you count sales, you count distinct lead ids with a payment, not payments.

Now the cohort rule, the part most people get wrong. Conversion means "of the people who entered stage A in the window, how many reached stage B, ever." Not "stage B this week divided by stage A this week." Those are different people. If you had a slow lead week and a strong closing week from last month's leads, the second formula says closing got better when it did not.

So pick a cohort window, thirty completed days of lead creation, and follow that exact group forward. Some will still be open. Write them as open, not lost. Give each stage a cycle time: median days from lead created to qualified, qualified to sold, sold to delivered. Cycle time tells you when a cohort is old enough to judge.

What good looks like: every count on the sheet is a count of distinct lead ids.

The mistake is counting events. Forty form submissions is not forty leads, and eleven invoices is not eleven customers.

### 3. Separate volume from conversion

Two different questions live in a funnel. How many came in, and what share moved forward. Show both, side by side, always.

Volume answers "did marketing bring people." Conversion answers "did we do our job with the people who came." When leads drop and conversion holds, the problem is upstream. When leads hold and conversion drops, the problem is the phone, the follow-up, or the offer. Mixing them into one number hides which one broke.

Write the conversion formula on each pair: leads to qualified, qualified to sold, sold to delivered, delivered to retained. Numerator: distinct lead ids in the cohort that reached the later stage. Denominator: distinct lead ids that entered the earlier stage in the cohort window. Show the count next to every rate, because 2 out of 3 is 67 percent and it is also nothing.

Then name the leakage at each stage. Attention to lead leaks on pages with views and no clicks. Lead to qualified leaks at missed calls and slow callbacks. If you want a dollar figure on that one, run /tools/missed-call-calculator with your own average job value. Qualified to sold leaks at estimates that never got a follow-up. Sold to delivered leaks at scheduling. Delivered to retained leaks at no review request and no maintenance offer.

Finally, reconcile. The leads count in the cohort must equal the count of distinct lead ids in the leads table for that window after dedupe. Sales in the cohort must match distinct paying customers in Stripe with a lead id in that window. If the funnel says 38 and the table says 41, find the three. Usually it is the dedupe rule applied in one place and not the other.

What good looks like: a funnel whose bottom rows trace to named invoices.

The mistake is a funnel drawn from memory. Every count comes from a query or a filtered sheet you can reopen.

Start in Google Sheets if that is where you are: one Funnel tab, one row per stage, columns for cohort count, conversion from the prior stage, median days, and source. On Supabase, it is one view per stage joined on lead_id.

## Worked example

Big Cypress Plumbing in Longview is a fictional example, and every number here is invented for the walkthrough. Owner Marcus runs three trucks and gets leads from the site, Quo, and a spring Meta campaign.

Marcus ran this, then built the cohort for leads created in the thirty completed days ending yesterday:

"Design a business funnel for Big Cypress Plumbing, a three-truck residential plumbing company in Longview with leads from the website, Quo calls and texts, and a spring Meta campaign. Define each stage, entry event, exit event, owner, source table, dedupe rule, conversion formula, cycle time, and common leakage."

Example output:

```text
Stage: Leads | Entry: row in leads table (form, call, text, Meta form) | Exit: first contact logged | Owner: office | Source: leads | Dedupe: one per phone_e164 per 30 days
Stage: Qualified | Entry: status qualified after a conversation, in service area | Exit: estimate sent | Owner: Marcus | Source: leads.status | Formula: distinct lead ids qualified divided by distinct lead ids in cohort
Stage: Sales | Entry: deposit paid in Stripe | Exit: job scheduled | Owner: Marcus | Source: Stripe payments joined on lead_id | Cycle time: median 4 days from qualified
Common leakage: leads with no contact within 24 hours; estimates over 7 days with no follow-up
```

Marcus ran the period. Leads 41 after dedupe, from 53 raw rows. Qualified 26. Sold 14. Delivered 12. Retained still open. Leads to qualified 63 percent. Qualified to sold 54 percent.

Review against the pass standard: stages are mutually understandable, conversions use consistent cohorts, and totals reconcile. The stages read clean. The cohort held. But sales showed 14 in the funnel and Stripe showed 16 paying customers in the window. Fail on reconciliation.

The one revision: the two extra payments were customers from the prior cohort who paid this month. Right customers, wrong cohort. Marcus added a column for "paid this window, prior cohort," so cash matched Stripe and the conversion rate stayed honest. Totals reconciled. Funnel approved.

## Exact working prompt

```text
Design a business funnel for [business]. Define each stage, entry event, exit event, owner, source table, dedupe rule, conversion formula, cycle time, and common leakage.
```

## Guided practice

1. Paste the prompt with your business and list the six stages it returns with entry and exit events.
2. Pick a cohort window of thirty completed days and pull the distinct lead ids created in it.
3. Follow that exact group through each stage and write counts of people, not events.
4. Compare your leads count and sales count to the leads table and Stripe, and find every difference.
5. Fill the Funnel builder section of the workbook with counts, rates, cycle times, and the leakage at each stage.

## Assignment and evidence

Calculate one full period and reconcile stage totals to source records.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Stages are mutually understandable, conversions use consistent cohorts, and totals reconcile.

## Common mistakes

- Dividing this week's sales by this week's leads. Fix: follow one cohort of lead ids forward.
- Counting events instead of people. Fix: distinct lead id at every stage.
- Adding Search Console impressions to page views. Fix: separate cards; they measure different things.
- Calling open leads lost. Fix: an open column until the cycle time has passed.
- A funnel from memory. Fix: every count comes from a saved query or a filtered sheet.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Attention to retained customer funnel.
**Screen recording:** Build the six-row Funnel tab in Google Sheets from a leads export, show the dedupe with COUNTUNIQUE on the phone column, then show the sales row not matching Stripe and the prior-cohort column that fixes it.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Funnel builder.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

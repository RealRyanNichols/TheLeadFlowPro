# DA L03: Map the Source Data

## What you will finish

Trace every metric to an owned table, system, export, or verified source. When you are done you will have a source map for your top five metrics: the exact table or export each one comes from, the fields it needs, the ID that connects it to the next system, how fresh it is, who owns it, and what is missing.

## Why this matters

A number on a dashboard is a claim. The source map is the receipt. Without it, the first time a number looks wrong you have no way to check it, and the dashboard loses trust in one meeting.

Here is the scene. A lawn care owner in Gilmer has leads in four places: the website form, Meta lead forms, texts to his cell, and a notepad in the truck. His "leads this month" depends on which of those he remembered to count. That is not a data problem. It is a source problem.

On my scoreboard every number has a home. Views and clicks come from a page_events table in Supabase that my own pages write to. Leads come from the leads table. Search clicks come from a Google Search Console export. If a source has not reported, the tile says "unavailable," because a made-up zero is worse than an honest blank.

Bring the metric dictionary from lesson two. Each card named a source. This lesson proves the source exists, names its fields, and writes down how it joins to the next one. Lesson four then checks whether the data inside those sources is any good.

## The lesson

### 1. Inventory systems

List every system that holds a fact about a customer, a lead, a visit, or a dollar. Do not filter yet. Website form. Supabase tables. Google Search Console. Meta Ads Manager. Quo call and text log. Resend email log. Stripe. Whatever the bookkeeper uses. ClickUp or Notion job board. Google Business Profile. The truck notepad. Your phone's recent calls.

For each system write three things: what records it holds, whether you can export it, and whether you own it. Owned means you control the data and can get it out any time, like a Supabase table or a Google Sheet you built. Rented means a vendor holds it and you get what their export button gives you. Search Console is rented but trustworthy. A tool that shows a chart with no export is a source you cannot map, and now you know that.

What good looks like: a list of eight to fifteen systems with an honest note next to each, like "export: yes, CSV, manual" or "export: no."

The mistake is forgetting the informal ones. The notepad and the personal phone are where the missed leads live. Put them on the list so you can retire them on purpose.

Example: a plumber in Hallsville found nine systems. Three held leads. None held all of them. That was the finding.

### 2. Choose the source of truth

For each kind of record, pick one home. One place that is right when two systems disagree. Leads live in the Supabase leads table, or in the Leads tab of the Google Sheet if you are starting there. Payments live in Stripe. Jobs live in ClickUp. Search performance lives in Search Console. Views and clicks live in page_events.

Everything else becomes a feeder. Meta lead forms feed the leads table. Quo texts get logged to the leads table. The notepad gets typed into the Sheet by six o'clock. If you built the one lead record in the Lead Capture System (LC L07), this is the same rule: one record, many doors in.

Now write the required fields for each metric. For "leads, last 7 days" you need lead id, business id, created_at, source, medium, and status. For "paid leads" you need the field that says paid or not, whether that is medium, a source picklist, or a Meta form id. If the field does not exist in the source of truth, write it as a known gap. That gap is a build task, not a dashboard task.

Add the classification. Public: search impressions. Internal: views and clicks. Personal: names, phones, and emails in the leads table. Sensitive: anything touching payment details. Personal and sensitive fields get access rules and a decision on how long you keep them. Have your attorney review it. Then move on.

What good looks like: one row per metric with one source and no "or."

The mistake is picking the prettiest source instead of the most complete one. Meta's dashboard shows leads nicely, but the leads table is where the callback gets logged, so the table wins.

### 3. Document join keys

A join key is the field that lets one system point at a record in another. Without one, you can count leads and count payments, but you cannot say which leads paid.

The keys that actually work for a small business: a lead id you generate in Supabase, a normalized phone number in E.164 format like +19035551234, a Stripe customer id, a job id from ClickUp, and a UTM campaign name spelled the same everywhere.

For each pair of systems write the key and where it lives on both sides. Leads to Stripe: stripe_customer_id stored on the lead record when the invoice is created. Leads to jobs: lead_id stored on the ClickUp task as a custom field. Page events to leads: session_id written into the form as a hidden field, so the lead knows which visit made it. Search Console to page_events: the page URL with tracking parameters trimmed off.

Then write freshness for every source. page_events: live, seconds. Leads table: live. Stripe: live. Search Console: lags about two days, so a seven-day window ending yesterday really ends three days ago on that card. Google Sheet: whenever somebody types. Write the lag on the card so nobody reads a Search Console dip on Monday as a real drop.

What good looks like: a drawing. Metric on the right, source table on the left, the key written on the arrow between them. The workbook has the Data lineage section for exactly this.

The mistake is using a person's name as a key. Two Mike Johnsons in Longview, one typo, and your paid leads are wrong forever. Phone or id, never name.

For the scoreboard build, the simple version is a Supabase view called scoreboard_daily with one row per business per day: views, clicks, leads, paid_leads, unpaid_leads. The page on Vercel reads that view for the last seven and thirty days. If a day has no page_events rows for a site that normally gets some, the view leaves that day null and the page prints "unavailable." That rule belongs in the source map, not the page design.

Finish with the top five metrics drawn end to end. Source, fields, key, freshness, owner, gaps. Five is enough to see the pattern. The rest follow it.

## Worked example

Gilmer Lawn and Land is a fictional example. Owner Travis mows about 140 yards a week, runs a Meta ad in spring, and takes most leads by text.

Travis listed his systems (website form on Vercel, Supabase leads table, Meta Ads Manager, Quo, Stripe, ClickUp, Search Console, a notepad) and his top five metrics from the dictionary, then ran this:

"Build a source map for these metrics and systems: [the two lists above]. Return source of truth, required fields, IDs, join keys, freshness, owner, known gaps, and data classification."

Example output:

```text
Metric: Leads, last 7 days
Source of truth: Supabase table leads
Required fields: id, business_id, created_at, source, medium, status
IDs and join keys: phone_e164 (dedupe), session_id (to page_events), stripe_customer_id (to Stripe), clickup_task_id (to jobs)
Freshness: live; Quo texts logged by 6 pm daily by Travis
Owner: Travis
Known gaps: notepad leads not entered; Meta lead form not writing medium
Classification: personal (name, phone), internal (source fields)
```

Review against the pass standard: every displayed number has a source, join path, refresh expectation, and owner. Four of five metrics passed. "Paid leads" failed. The Meta lead form was feeding the leads table with no medium field, so paid and unpaid could not be separated. The number on the dashboard would have been a guess.

The one revision: Travis added a medium field to the Meta form integration so every Meta lead arrives with medium set to paid. He also added a rule that any lead with a blank medium counts as unpaid and gets flagged for review. Now paid leads has a real path, and the gap is closed instead of hidden.

## Exact working prompt

```text
Build a source map for these metrics and systems: [paste]. Return source of truth, required fields, IDs, join keys, freshness, owner, known gaps, and data classification.
```

## Guided practice

1. List every system that holds a lead, visit, job, or payment, including the informal ones.
2. Paste the list and your top five metrics into the prompt.
3. For each metric, circle one source of truth and cross out the rest.
4. Write the join key between each pair of connected systems, phone or id, never a name.
5. Draw the five lineages in the Data lineage section of the workbook and mark every known gap.

## Assignment and evidence

Draw the source-to-metric lineage for the top five metrics.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Every displayed number has a source, join path, refresh expectation, and owner.

## Common mistakes

- Two sources of truth for leads. Fix: pick the one where the follow-up gets logged and make the other feed it.
- Joining on names. Fix: normalized phone or a generated id.
- Ignoring lag. Fix: write the delay on the card; Search Console runs about two days behind.
- Hiding a gap. Fix: write "known gap" and show "unavailable" until it is fixed.
- Mapping all twelve metrics at once. Fix: five first; the rest follow the pattern.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Source to metric pipeline.
**Screen recording:** Open the Supabase table editor on a leads table and a page_events table with the session_id and phone_e164 columns visible, then open a Search Console performance export beside them and point at the date lag.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Data lineage.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

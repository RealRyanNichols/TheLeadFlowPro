# DA L04: Clean and Validate

## What you will finish

Find duplicates, missing values, invalid categories, broken dates, and impossible states. When you are done you will have run a quality check on one real export, logged every issue with a severity and an owner, and decided which numbers are good enough to show and which ones get a warning label.

## Why this matters

Dirty data does not announce itself. It shows up as a lead count that is 20 percent high because the same customer filled the form three times. Or a paid leads tile that reads zero because the source field says "Facebook" in one row, "facebook" in another, and "FB" in a third.

Picture a gym in Longview. The manager pulls a member export to count trial passes that turned into memberships. Forty rows have no phone. Twelve have a start date before the lead existed. Six are the owner testing the form. She does not know any of that, so she reports the number, the owner makes a decision on it, and the decision is wrong for a reason nobody can see.

My scoreboard rule is real numbers only, or say "unavailable." Validation is how you earn the right to show a number. If a critical field fails its check, the tile gets a flag or goes blank. It does not get a confident-looking wrong number.

You mapped the sources in lesson three. This lesson tests what is inside them, before lesson five stacks them into a funnel where every error compounds down the stages.

## The lesson

### 1. Profile the data

Profiling means looking at the shape of the data before you judge it. Export one table. The leads table is the best first candidate because it feeds the most decisions.

Open it in Google Sheets, or query it in Supabase. For every column write five things: how many rows are blank, how many distinct values there are, the smallest and largest value, the most common value, and one example that looks odd.

Do it with a helper. Paste the column headers and twenty sample rows into ChatGPT or Claude with the prompt at the bottom of this lesson, and it will build the checklist for you. Do not paste customer names and phones into a tool you have not cleared for personal data. Replace them with placeholders first.

What you are looking for falls into six dimensions. Completeness: is the field filled in. Uniqueness: is the same person in here twice. Validity: does the value belong to the allowed list, like source being one of paid, organic, referral, or direct. Consistency: does the same fact agree across fields, like status won but no paid date. Timeliness: is the newest row as recent as you expect. Integrity: does every lead id referenced in the jobs table actually exist in leads.

What good looks like: a one-page profile per table with a number on every column.

The mistake is scrolling and eyeballing. Eyes miss twelve rows out of eight hundred. Counts do not.

Example: a detailer in Kilgore profiled 640 leads and found created_at blank on 31 rows, all imported from an old spreadsheet. Those rows can never land in a rolling window. Now he knows why his thirty-day count looked low.

### 2. Apply explicit rules

A rule is a check that returns pass or fail for every row, written so a stranger could run it. Not "phone looks wrong." "phone_e164 must be +1 followed by ten digits."

Write one rule per field that matters, and mark each rule critical or minor. Critical means the metric cannot be trusted if the rule fails. created_at, business_id, source, medium, and phone are critical for the scoreboard. Minor is a nice-to-have like a missing last name.

Give each rule an acceptance threshold. Not every rule has to hit 100 percent. "Source is valid on at least 98 percent of rows in the window." "Zero duplicate phones within 30 days." "Newest page_events row is under 24 hours old." When a critical rule misses its threshold, the dashboard shows the number with a flag, or shows "unavailable." That is the whole link between this lesson and the tiles.

Then fix at the source, not in the report. If Meta writes "Facebook" and the form writes "facebook," fix the form and the integration so both write the same value. Cleaning the export by hand every week is a job you will stop doing in month two.

For dedupe, the rule I use is one lead per normalized phone per 30 days. Keep the earliest row, mark the others as duplicates with a pointer to the original, and do not delete them. Deleting destroys the evidence that the person came back.

What good looks like: a rules list of ten to twenty lines, each with field, rule, severity, threshold, and where the fix happens.

The mistake is writing rules for every column. Check what the decisions depend on. The rest can wait.

### 3. Record exceptions

Every failed check goes in an issue log. Rows affected, the rule it broke, severity, what you think caused it, who fixes it, and by when. This is the Quality scorecard section of the workbook.

Some issues you fix now. Test rows from your own email get excluded by rule. Duplicates get marked. Some issues you cannot fix. The 31 rows with no created_at are gone for good unless somebody remembers the dates. Those get a permanent note on the metric card: "31 historical leads excluded from all windows, imported without dates."

Then run the scorecard every week, not once. A count of failures per rule takes five minutes in a Sheet or one query in Supabase. If it passes, the dashboard shows clean numbers. If a critical rule fails, the dashboard says so before anybody reads a tile. Lesson six puts that flag on the page itself.

What good looks like: an issue log where every line has an owner and a date, and the ones nobody can fix are marked accepted with a label the dashboard shows.

The mistake is a big cleanup weekend followed by nothing. Data gets dirty at the rate people type. The check has to run at the same rate.

Two more things I learned the hard way. Bots and your own team are the biggest source of fake views and clicks. Exclude known bot user agents and your office network before counting anything. And impossible states are the best bug reports you will ever get. A lead marked won with no payment, or a job dated before the lead existed, is usually a broken integration. Finding it here is cheaper than finding it in the funnel.

## Worked example

Longview Iron Gym is a fictional example. Manager Kayla runs the front desk and wants a reliable count of trial passes that turned into memberships.

Kayla exported the leads table, 812 rows, replaced names and phones with placeholders, and ran this with the column list and twenty rows pasted in:

"Create a data quality plan for this schema or sample: [the columns and twenty placeholder rows]. Include completeness, uniqueness, validity, consistency, timeliness, referential integrity, outliers, severity, remediation owner, and acceptance threshold."

Example output:

```text
Data quality plan (excerpt)
Completeness: phone_e164 blank on 44 rows (5.4 percent). Critical. Threshold: 98 percent filled. Owner: Kayla. Fix: make phone required on the trial form.
Uniqueness: 27 phones appear more than once within 30 days. Critical. Threshold: zero. Fix: dedupe rule, keep earliest, mark the rest.
Validity: source has 9 distinct values including IG, instagram, Insta. Critical. Threshold: 98 percent valid. Fix: picklist of paid, organic, referral, direct, walk-in.
Consistency: 6 rows with status member and membership_start before created_at. Critical. Fix: check the import script.
Timeliness: newest row is 3 hours old. Pass.
Outliers: one lead with 14 visits in a day. Minor. Likely staff testing.
```

Review against the pass standard: critical fields meet thresholds or the dashboard clearly labels the limitation. Phone completeness was 94.6 percent against a 98 percent threshold. Fail. Source validity was 83 percent. Fail.

The one revision: Kayla merged the nine source spellings into five picklist values with a mapping table, which pushed validity to 99 percent. The phone gap could not be backfilled, so she wrote the limitation on the trial conversion card: "44 leads without phone excluded from conversion; count shown separately." Both critical fields now either pass or carry a visible label. Scorecard approved.

## Exact working prompt

```text
Create a data quality plan for this schema or sample: [paste]. Include completeness, uniqueness, validity, consistency, timeliness, referential integrity, outliers, severity, remediation owner, and acceptance threshold.
```

## Guided practice

1. Export your leads table or Leads tab and replace names, phones, and emails with placeholders.
2. Paste the columns and twenty rows into the prompt and read the plan it returns.
3. Run the critical checks on the full export in Sheets or Supabase and write the counts.
4. Log every failure with severity, owner, and date in the Quality scorecard section of the workbook.
5. Write a limitation note on any metric card whose critical field missed its threshold.

## Assignment and evidence

Run the checks on one export and create an issue log.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Critical fields meet thresholds or the dashboard clearly labels the limitation.

## Common mistakes

- Cleaning the export instead of the source. Fix: fix the form or integration so next week's data arrives clean.
- Deleting duplicates. Fix: mark them and point to the original so the history survives.
- Pasting real customer data into an AI tool. Fix: placeholders first.
- Checking once. Fix: a weekly five-minute scorecard with the same rules every time.
- Showing zero when the data is missing. Fix: show "unavailable" and a flag.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Six dimensions of data quality.
**Screen recording:** Open a leads export in Google Sheets, add COUNTBLANK and COUNTIF on the phone column, then show the same checks as one query in the Supabase SQL editor and the failing rows it returns.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Quality scorecard.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

# DA L06: Design the Operator Dashboard

## What you will finish

Show current state, target, trend, exception, and next action without clutter. When you are done you will have a one-page wireframe of your operator dashboard, every element tied to a decision from your register, and a list of the charts you cut because nobody would act on them.

## Why this matters

A dashboard is not a report. A report tells you what happened. A dashboard tells you what to do next, and it has to do that in the five minutes you have before the crew leaves.

Here is the scene. An owner opens a reporting tool with fourteen charts. He scrolls. He sees a line going up and a line going down. He closes it. Nothing changed. That tool bills him every month and it has never once made a decision.

My scoreboard at /scoreboard is deliberately small. Per business, five numbers, seven-day and thirty-day windows, each next to its previous window. When a source is stale the tile says "unavailable." I can read it on my phone in the truck. That is the standard. If you cannot find the exception and the next action in five minutes, the page has failed.

Bring the decision register from lesson one, the metric cards from lesson two, and the funnel from lesson five. The dashboard is those three things laid out in the order you need them, plus the quality flags from lesson four so you know when to trust it.

## The lesson

### 1. Lead with the decision

The top of the page is not a logo and a date picker. It is the questions you decide on Monday, in order of money. Do I keep the ad. Who needs a callback. Am I over capacity. Is cash coming in.

Group the page by those questions. Under each one, only the metrics from the register that feed it. If a metric feeds no question, it is not on this page. It might live on a detail page. It does not live here.

Each metric gets a KPI tile with five things: the current value for the window, the threshold from the register, the previous window, a direction arrow, and the next action if the line is crossed. "Leads, last 7 days: 9. Prior 7: 14. Threshold: under 10 while ads run. Action: check tracking, then the landing page." The tile says what to do. That is the difference between a dashboard and a chart.

What good looks like: a top row of four to six tiles that answer the four biggest decisions.

The mistake is tiles with no threshold. A number with no line to compare against is decoration.

Example: an HVAC owner in Hallsville had twelve tiles. We asked what he would do if each one moved. Seven had no answer. Seven came off.

### 2. Use the right visual

Match the shape of the visual to the question. A tile answers "where are we right now." A trend line answers "is it getting better." A funnel answers "where do people leak." A table answers "which ones exactly." An exception list answers "what needs me today."

So the page has four bands. Band one: tiles. Band two: two or three trend lines, twelve weeks each, for the numbers that move slowly, like leads per week, sales per week, and views per week. Band three: the funnel from lesson five as six plain bars with counts and rates. Band four: exceptions as a simple table. Leads with no contact over 24 hours. Estimates over 7 days without follow-up. Invoices past due. Ad sets over their guardrail from AD L02. Each exception row links to the record in Supabase or ClickUp, so the action is one click away.

Filters are few. Business, if you run more than one, and the window, seven or thirty days. That is it. Every extra filter is a way to look at the wrong number by accident.

No pie charts. No gauges. No two axes on one chart. If you have to explain a visual, replace it with a table.

For the build, start where you are. In Google Sheets, one tab called Dashboard: tiles as big cells with conditional formatting against the threshold, sparklines for trends, a filtered range for exceptions. On Supabase plus a page: the scoreboard_daily view from lesson three and one route on Vercel that renders tiles and a table. Claude or ChatGPT can write that page from your wireframe in an afternoon. The wireframe comes first either way.

What good looks like: a page that reads top to bottom in one scroll on a phone.

The mistake is building the page before the wireframe. You will spend the afternoon on colors and end up with the fourteen-chart tool you were trying to escape.

### 3. Show data quality

Every dashboard lies sometimes. The honest ones tell you when. Put a quality strip at the very top, above the tiles, one line per source. page_events: last row 2 hours ago, pass. Leads table: weekly scorecard passed Monday. Search Console: data through three days ago, lag normal. Quo export: not loaded this week, unavailable.

Then every tile that depends on a source with a failed check shows a flag next to the number. Every tile whose source did not report shows "unavailable" instead of a value. Never zero. Zero is a claim that nothing happened, and the truth is you do not know.

Add exclusions in small text under any tile where they matter. "Excludes 44 leads without phone." The reviewer should never be surprised by a footnote later.

What good looks like: a reviewer who can glance at the strip and know whether to trust the page before reading a number.

The mistake is hiding quality problems to make the page look finished. The first time someone catches a bad number without a flag, they stop reading the dashboard. With a flag, they trust it more, not less.

Last step, the cut. Go through the wireframe one element at a time and ask the register question: what decision does this feed, and what happens when it crosses the line. No answer, remove it. Write the removed items in a list at the bottom of the workbook page. You will be tempted to add them back. The list is there so you remember why they left.

Then the test that matters. Hand the wireframe to someone who was not in the room, give them five minutes, and ask two questions. What needs attention. What would you do first. If they answer both from the page, it passes.

## Worked example

Big Cypress Plumbing in Longview, the fictional example from lesson five, now needs the page Marcus reads every Monday morning.

Marcus ran this with his decision register, the twelve metric cards, and the six-stage funnel pasted in:

"Design a one-page operator dashboard for these decisions and metrics: [the register, the cards, and the funnel]. Group by question, recommend KPI cards, trends, funnels, tables, filters, alerts, quality indicators, and drill-downs. Explain why each visual fits."

Example output:

```text
Row 0, quality strip: page_events (live, pass), leads (scorecard pass), Stripe (live), Search Console (3-day lag), Quo (unavailable this week)
Row 1, tiles: Leads 7d vs prior 7d, threshold 10; Missed calls 7d, threshold 5; Booked jobs next 14 days vs capacity, threshold 90 percent; Cash collected 30d vs prior 30d
Row 2, trends: leads per week and sales per week, 12 weeks, one line each
Row 3, funnel: leads, qualified, sold, delivered, retained, with count and rate, 30-day cohort
Row 4, exceptions: leads over 24h with no contact; estimates over 7 days; invoices past 14 days; each row links to the record
Removed: sessions by device, average time on page, follower count (no decision attached)
```

Review against the pass standard: a weekly reviewer can spot exceptions and identify the next action in under five minutes. Marcus handed the wireframe to his office manager with a stopwatch. She found the exceptions in ninety seconds. Then she stalled on the ad decision, because the leads tile showed a count but not whether it was paid or unpaid.

The one revision: the leads tile split into paid and unpaid, each with its own prior window, and the ad decision got its action text on the paid tile: "under 4 paid leads for two weeks, pause the ad set." She reran it in four minutes with a clear first action. Wireframe approved.

## Exact working prompt

```text
Design a one-page operator dashboard for these decisions and metrics: [paste]. Group by question, recommend KPI cards, trends, funnels, tables, filters, alerts, quality indicators, and drill-downs. Explain why each visual fits.
```

## Guided practice

1. Paste your register, metric cards, and funnel into the prompt and read the layout it proposes.
2. Draw the four bands on paper or in Figma: quality strip and tiles, trends, funnel, exceptions.
3. Write the threshold and the next action on every tile.
4. Cut every element with no decision behind it and list the cuts at the bottom of the Dashboard wireframe section.
5. Give the wireframe to someone else for five minutes and record what they found first.

## Assignment and evidence

Build the wireframe and remove any chart with no decision use.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

A weekly reviewer can spot exceptions and identify the next action in under five minutes.

## Common mistakes

- Building before wireframing. Fix: paper first, page second.
- Tiles with no threshold or action. Fix: current, prior, threshold, arrow, action on every tile.
- Zero instead of unavailable. Fix: a blank plus a flag when the source did not report.
- Too many filters. Fix: business and window only.
- Charts for looks. Fix: if you cannot name the decision, cut it and log the cut.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Dashboard information hierarchy.
**Screen recording:** Sketch the four bands in Figma from the prompt output, then open /scoreboard on a phone and point at a tile reading "unavailable" and the quality strip above it.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Dashboard wireframe.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

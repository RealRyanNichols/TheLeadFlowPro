# OS L06: Design the Control Center

## What you will finish

Bring work queues, approvals, exceptions, health, and decisions into one operator view. When you are done you will have a one-screen wireframe of your control center, every panel labeled with its source and its action, tested by a five-minute walkthrough with the person who runs your mornings.

## Why this matters

Here is how most owners start the day. Facebook inbox. Email. The phone app. The CRM. ClickUp. Stripe. The calendar. A group text with the crew. Eight tabs, thirty minutes, and not one decision made, because the thing that needed attention was buried under forty things that were fine.

The dashboard you built in DA L06 answers "how are we doing." That is a different question. The control center answers "what needs a human right now, and where do I click to handle it." A business needs both, and it gets confused when it tries to make one screen do both jobs.

Skip this and the workflows from lesson four run in the dark. Failures happen, and nobody sees them until a customer calls. Approvals from lesson five wait in someone's inbox. And the alerts you set up in lesson seven have nowhere to land.

Bring the workflow specifications and the role matrix. Every failure state and every approval on them becomes a row on this screen.

## The lesson

### 1. Show what needs attention

In the systems I build, the control center is the home page of the admin back office. It reads from the same Supabase tables as everything else, so it is never out of date and it never needs its own copy of anything.

The top of the screen is today's queue: leads with no first response, tasks due, approvals waiting. The middle is money and delivery risk: open pipeline, jobs close to their date and missing something. The bottom is health: when the last form submission came in, whether the last payment webhook succeeded, when the scheduled jobs last ran, how many leads are missing a phone number. Notion or ClickUp hold the queue cards the humans work from, and the control center shows the counts and the overdue ones with a link to each.

The prompt gives you ten panels: daily queue, approvals, overdue work, revenue pipeline, delivery risk, customer issues, system health, data quality, alerts, and decision log. For each one, write two things. The source, meaning which table or system and which filter. The action, meaning what the operator does when they see a row.

"Daily queue. Source: leads where status is new and created more than fifteen minutes ago. Action: open the lead, send the first response, status changes to contacted, row disappears." That is a panel. It has a source, an action, and a way to go empty.

The default view shows only what needs a human today. If it is fine, it does not appear. An empty control center is a good morning.

What good looks like: every panel can go to zero, and when it does, that means something true.

The mistake is putting metrics on it. Revenue this month, leads this week, conversion rate. Those belong on the dashboard from OA09. A control center is a to-do list built from records, not a wall of charts. The moment you add a chart, the operator starts admiring it instead of clearing the queue.

### 2. Prioritize exceptions

An exception is anything outside the rule. A lead older than fifteen minutes with no response. A job installing in three days with no deposit. A payment that failed. A website form that has not submitted anything in forty-eight hours, which usually means the form is broken, not that nobody wants you.

Order the screen by the cost of ignoring it. Customer-facing first, money second, internal third. Within each panel, sort by age, oldest at the top. Show counts and age in plain numbers. Do not rely on colors alone, because red means nothing after the third day of seeing it.

Write every threshold down. Fifteen minutes, three days, forty-eight hours, whatever yours are. They come straight from the failure states in your workflow specifications. If a threshold is not written, it is not a rule, it is a mood.

What good looks like: the top row on the screen is the most expensive thing to ignore today, and the operator did not have to hunt for it.

The mistake is alerting on everything. When everything is urgent, the operator learns to ignore the whole screen, and you are back to eight tabs.

Example: a realtor in Longview puts "showing feedback not sent to seller within 24 hours" above "new lead from the open house sign-in," because the seller is a client today and the lead might be one someday. Both are on the screen. The order is the decision.

### 3. Link to the source record

Every row opens the authoritative record from lesson two. Not a copy, not a summary, the record. The action happens there, and the control center refreshes. Nobody retypes anything.

This is the difference between a control center and a report. A report tells you three leads are waiting. A control center puts the first one in front of you with a button.

Add the decision log as its own small panel. Date, decision, who made it, why, and a link to the record it was about. It is the answer to "why did we do that" six months from now, and it is the one panel that grows instead of clearing.

Then draw it. Paper is fine. Figma is fine if you use it. Boxes with a label, a source, and an action written inside each one. That is the wireframe.

Run the five-minute walkthrough. Sit the person who runs your mornings in front of the wireframe and have them narrate. "I open it. I see three leads waiting. I click the first one." Watch for the moment they reach for another tab. That is a missing panel. Add it and run it again.

What good looks like: the walkthrough ends with the queue cleared in the story and no other tab opened.

The mistake is a control center that shows a number you cannot click. The operator sees "3 overdue," opens the CRM, searches, and you have built the ninth tab.

Run the prompt with your business in the bracket. Copy the thresholds from your workflow failure states onto the matching panels before you draw anything.

## Worked example

Caddo Custom Cabinets in Marshall is a fictional example. The owner is Renee. She has a shop foreman, a designer, and installs booked six weeks out. Her mornings are a phone, a Gmail tab, ClickUp, and a walk to the shop floor.

Renee runs the prompt:

"Design an operations control center for Caddo Custom Cabinets, custom kitchen and bath cabinetry, design to install in six weeks. Include daily queue, approvals, overdue work, revenue pipeline, delivery risk, customer issues, system health, data quality, alerts, and decision log. Define source and action for every panel."

Example output:

```text
Panel: revenue this month, bar chart by week. Source: orders. Action: none.
Panel: daily queue. Source: leads, status new, older than 15 minutes. Action: open lead, send first response.
Panel: approvals. Source: opportunities where quote differs from price sheet. Action: approve or send back with note.
Panel: overdue work. Source: tasks past due. Action: open task.
Panel: system health. Source: last form submission timestamp, last Stripe webhook. Action: check form if older than 48 hours.
Panel: decision log. Source: decisions table. Action: add entry.
```

Renee runs the walkthrough with her foreman. It goes fine until he says "then I open ClickUp to see which installs are about to miss their date." He reached for another tab. The wireframe had no delivery risk panel, and it had a revenue chart at the top doing nothing.

She checks the pass standard. Does the control center reveal the most important exceptions and open the authoritative record for action? The most expensive exception in her shop is an install ten days out with no final measurements or no deposit, and it was not on the screen at all.

The one revision: the chart goes to the OA09 dashboard where it belongs. In its place, a delivery risk panel: projects installing within ten days that are missing final measurements, deposit, or materials confirmed, each row opening the project record. She reruns the walkthrough. The foreman clears the screen in the story without leaving it. That passed.

## Exact working prompt

```text
Design an operations control center for [business]. Include daily queue, approvals, overdue work, revenue pipeline, delivery risk, customer issues, system health, data quality, alerts, and decision log. Define source and action for every panel.
```

## Guided practice

1. Run the prompt with your business in the bracket and read the ten panels.
2. In the Control-center wireframe section of the workbook, draw a box for each panel and write its source and action inside.
3. Copy the thresholds from your workflow failure states onto the matching panels.
4. Cross out anything that is a metric instead of an action and move it to your OA09 dashboard.
5. Run the five-minute walkthrough with the person who runs your mornings and add any panel they reached for.

## Assignment and evidence

Build the wireframe and run a five-minute operator walkthrough.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The control center reveals the most important exceptions and opens the authoritative record for action.

## Common mistakes

- Charts on the control center. Fix: charts go on the dashboard, and the control center shows rows that need a click.
- Everything is urgent. Fix: order by cost of ignoring, and set thresholds so the screen can go empty.
- Numbers you cannot click. Fix: every row opens the authoritative record.
- Thresholds in someone's head. Fix: write every one on the wireframe, taken from the workflow failure states.
- Skipping the walkthrough. Fix: watch a real operator narrate a morning and add whatever they reached for.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Operating cockpit layout.
**Screen recording:** The admin back office home page with a test lead appearing in the daily queue, clicking through to the lead record, sending the first response, and returning to see the row gone, then the paper wireframe beside it.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Control-center wireframe.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

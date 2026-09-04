# OS L03: Design the Core Data Model

## What you will finish

Connect people, companies, leads, opportunities, orders, projects, tasks, messages, and evidence. When you are done you will have a drawn data model on the canvas page, nine boxes with the lines between them, tested against five real stories from your own business.

## Why this matters

You do not need to be a database designer. You do need to be able to draw the boxes, because the boxes are the business.

Here is what goes wrong without it. A commercial cleaning company in Tyler stores the facility manager's name inside the building's record. She takes a job across town. Now her whole history, every call and every complaint she ever made, is stuck on a building she no longer works in, and the new building has a stranger with no history. Nobody designed that. It happened one field at a time.

Every workflow you write in lesson four updates a record. Every panel in the control center in lesson six reads one. The agent you built in OA07 and the metrics from OA09 count from these tables. If the model is wrong, every one of those becomes a patch on a patch.

Bring the source-of-truth matrix from lesson two. This lesson is where the entities on it get their shape.

## The lesson

### 1. Name entities

This is the skeleton of every system I ship. In Supabase it becomes tables with these names: people, companies, leads, opportunities, orders, projects, tasks, messages, evidence. The website writes leads into it. The admin back office edits all of it. The client portal shows one person their own projects, orders, messages, and files. The dashboards count from the same tables. Notion or ClickUp hold the work queue, and every card carries the ID of the record it is about.

You can draw it on paper first. Most of my clients do. The point of this lesson is the drawing, not the database.

Take the nine and write one line for each: what it is, its ID, and the statuses it moves through. The statuses matter more than people expect, because they are what the control center and the dashboard will watch.

A person is a human with contact details. A company is a business a person belongs to. A lead is a request from a person that has not turned into money: new, contacted, qualified, converted, or closed. An opportunity is a specific deal with a value: open, quoted, won, or lost. An order is money agreed or paid: pending, paid, refunded. A project is delivery work: scheduled, in progress, on hold, complete. A task is one unit of work for one owner with a due date: open, done, cancelled. A message is any communication, in or out, on any channel. Evidence is anything that proves something happened: a photo, a signed form, a screenshot, a receipt.

Every record gets the same audit fields. ID, created at, updated at, created by, owner, status, deleted at. Boring, and it is what makes the rest possible.

What good looks like: nine boxes, each with an ID and a short status list, and nothing on the page that is not one of the nine.

The mistake is making "customer" its own box. A customer is a person or company with at least one paid order. It is a status you can look up, not a table. Give it a table and you will copy the same person twice, which is the exact thing lesson two told you not to do.

### 2. Define relationships

Now draw the lines. A company has many people. A person can belong to more than one company over time, so the line between them is a small link record with a role and a start and end date. That link is what saves the facility manager's history when she changes jobs.

A lead belongs to one person. A person can have many leads. An opportunity belongs to a person, and to a company when there is one. An order belongs to an opportunity. A project belongs to an order, or stands alone for work you did not sell. A task belongs to a project, or to a lead, or to an order, whatever it is about. A message belongs to a person and links to whatever it was about. Evidence links to any record, with a note about what it proves.

Put each fact once, where it belongs. The service address goes on the project. The billing address goes on the company or the person. The phone number goes on the person, and only there. Consent to text and email goes on the person too, with the source and the timestamp, the way you set it up in LC L04.

Then classify the sensitive fields. Phone, email, and address are personal data. Card numbers are never stored; Stripe holds them. Anything medical, any bank or account number, and anything like a Social Security number does not get a field, because you do not collect it. One sentence on that and we move on.

What good looks like: every line has "one" or "many" written at each end, and every field appears on exactly one box.

The mistake is the address that lives on the person, the company, the lead, and the project. Four copies, three of them stale by spring.

Example: a roofing company in Gilmer puts the property address on the project, the homeowner's phone on the person, and the insurance claim number on the opportunity. When the homeowner calls about a second property, that is a second project under the same person, and nothing gets retyped.

### 3. Preserve history

Never overwrite what happened. When a status changes, do not just change the field. Write an event: record type, record ID, old status, new status, who, when, why. That event history is what lets the dashboard from DA L06 tell you how long leads sit, and it is what lets you answer "who changed this" six months later.

Messages are append-only. Evidence is append-only. You add, you do not edit.

Deletion is a rule, not a button. Use a deleted-at date so records disappear from the screen but not from the history. When a person asks to be removed, you clear their personal fields and keep the fact that an order existed, because the books need it. Have your attorney review your deletion behavior once and move on.

Then test the model against five real stories. Pick real ones from last month. "Maria called on Tuesday, got a quote, hired us, moved offices, then referred her brother." Walk each story through the boxes. Every noun should land in an entity and every step should be a status change or a message. If a story cannot be told with your boxes, the model is missing something, and you found it on paper instead of in production.

What good looks like: five stories, each one traced through the boxes in pencil, with the breaks marked and fixed.

The mistake is skipping the stories because the drawing looks right. The drawing always looks right. The stories are the test.

Run the prompt with your business in the bracket. Read the tradeoffs section carefully. That is where it tells you what it left out and why.

## Worked example

Brightline Commercial Cleaning in Tyler is a fictional example. The owner is Keisha. She cleans office buildings and dental offices on recurring contracts, sells one-time deep cleans, and her crews send her photos by text when a job is done.

Keisha runs the prompt:

"Design a conceptual data model for Brightline Commercial Cleaning, recurring commercial cleaning contracts and one-time deep cleans, three crews. Include entities, primary identifiers, relationships, lifecycle status, event history, consent, ownership, audit fields, sensitive-data classification, and deletion behavior. Explain tradeoffs in plain language."

Example output:

```text
Entities: person, company, customer, lead, opportunity, contract (order), job (project), task, message, photo (evidence).
Relationship: person belongs to one company. Company has many contracts. Contract has many jobs.
Evidence: photo belongs to job. Required before job status can be set to complete.
History: status changes logged to an events table with actor and timestamp.
Deletion: soft delete with deleted_at; personal fields cleared on request, order history retained.
Tradeoff: tying a person to a single company keeps the model simple but loses history when a contact changes employers.
```

Keisha tests it against five stories. Stories one through three pass. Story four breaks it: a facility manager left one building for another and, in this model, her history goes with the wrong company. Story five breaks it too: a customer complaint arrived as an email with a photo, and evidence could only attach to a job.

She checks the pass standard. Can the model represent the current work without copying the same truth into multiple records? Not yet. The separate customer table is a copy of person and company, and the single-company rule forces a second person record to hold the new history.

The one revision: drop the customer table and make customer a status you can look up. Link person and company through a roles record with start and end dates. Give evidence a generic "about" link so a photo can attach to a job, a message, or a complaint. She redraws the canvas and reruns story four. The facility manager keeps her history, and the new building gets it too. That passed.

## Exact working prompt

```text
Design a conceptual data model for [business]. Include entities, primary identifiers, relationships, lifecycle status, event history, consent, ownership, audit fields, sensitive-data classification, and deletion behavior. Explain tradeoffs in plain language.
```

## Guided practice

1. In the Data model canvas section of the workbook, draw the nine boxes and write the ID and statuses inside each.
2. Run the prompt with your business in the bracket and compare its entities to your boxes.
3. Draw the lines, writing "one" or "many" at each end.
4. Write five real stories from last month and walk each one through the boxes, marking where it breaks.
5. Fix the breaks, redraw, and photograph the canvas as version one.

## Assignment and evidence

Draw the model and test it against five real business stories.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The model can represent the current work without copying the same truth into multiple records.

## Common mistakes

- Making customer a table. Fix: customer is a status on a person or company with a paid order.
- Storing the address in four places. Fix: service address on the project, billing on the company, phone on the person, once.
- Overwriting status. Fix: write an event for every change, with who, when, and why.
- Attaching evidence to only one kind of record. Fix: give evidence a generic link so it can prove anything.
- Skipping the five stories. Fix: the stories are the test, so run them before you call it done.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Customer-to-delivery entity map.
**Screen recording:** The nine tables in the Supabase table editor with one person's record followed through lead, opportunity, order, project, task, message, and evidence, then the paper canvas with the same lines drawn by hand.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Data model canvas.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

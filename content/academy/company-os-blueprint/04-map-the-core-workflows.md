# OS L04: Map the Core Workflows

## What you will finish

Document triggers, steps, owners, tools, records, approvals, outcomes, and failures. When you are done you will have five written workflow specifications, one page each, for the five processes that most affect your revenue and your customers' trust.

## Why this matters

A workflow that lives in someone's head leaves with them.

Say a roofing company in Gilmer gets hit with a hailstorm. Sixty leads in three days. The process for turning a storm lead into a signed contract lives in the head of the one estimator who has done it for six years, and he is on a roof. The new hire answers the phone and does her best. Half the leads get a next step. The other half get a promise nobody wrote down.

Skip this lesson and three things stay broken. Customers get a different experience depending on who picked up. You cannot automate a step you have not written, so the agent from OA07 has nothing to follow. And you cannot measure a process that has no defined steps, so the funnel from DA L05 shows you a number with no story.

Bring the data model from lesson three. Every step in a workflow updates a record, and those are the records. Lesson five will assign owners and approvals, so this is where the steps get named.

## The lesson

### 1. Start at the trigger

A workflow specification is one page. Trigger at the top, outcome at the bottom, and every step in between with an owner, a tool, a record that changes, and what happens when it fails. That is the whole format. The prompt gives you the exact fields.

In the systems I build, the trigger is almost always one of four things. A row gets inserted or a status changes in Supabase. A Stripe webhook fires because money moved. Quo reports a missed call or a new text. A date passes, caught by a scheduled job. Human triggers show up as a card in Notion or ClickUp. Your tools can be different. The shape is the same.

Name the event that starts the workflow, exactly. Not "when a customer calls." That is two triggers: the call you answered and the call you missed, and they need different workflows. "Website form submitted" is a trigger. "Lead status changed to qualified" is a trigger. "Deposit paid" is a trigger. "Three days passed with no reply" is a trigger.

Write the preconditions next. What has to be true for the workflow to run? The lead has a phone number. Consent to text is recorded. The opportunity has a value. If a precondition fails, that is your first failure path, and you have not even reached step one.

Then list the steps in order. Each step gets one owner, one tool, and one record it updates. "Step 2. Owner: office manager. Tool: admin back office. Record: lead status set to contacted, first message logged."

What good looks like: someone who has never done the job could read the page and do the first three steps.

The mistake is starting in the middle. People write "call the customer back" as step one and forget that the call has to come from somewhere, land somewhere, and create something before anyone can call it back.

### 2. Separate human and system work

Go through every step and ask: is this a person deciding, or a system doing?

System work is creating a record, sending a confirmation, assigning by a rule, notifying someone, calculating a total, logging what happened. Human work is judgment. Pricing outside the standard. Deciding whether to take the job. Anything that costs money to get wrong.

Write the business rule in plain English right on the step. "If the quote is under $500, the tech can price it on site. Over that, the office manager approves before it goes to the customer." That is an illustrative number. Use yours. The rule is what lets a system do the routing and a human do the deciding.

Write the notifications too. Who hears about this step, and where? A Quo text to the customer, sent by a person, inside quiet hours, to someone who opted in. An email through Resend. A card in ClickUp for the estimator. A row in the control center you will design in lesson six.

What good looks like: humans decide, systems copy. No human is retyping a phone number from one screen to another.

The mistake runs both ways. Automating judgment, so the system approves a discount nobody looked at. Or asking a human to do copying, so the office manager spends her morning moving names between tabs.

Example: a detailer in Hallsville marks "send the booking confirmation" as system work through Resend, and "decide whether to take the boat job" as human work for the owner, with a rule that anything over twenty feet gets a phone call first.

### 3. Design the failure path

This is the step most people skip, and it is where customers get lost.

For every step, write what happens when it does not work. No reply within fifteen minutes: the lead escalates to the owner's phone. Payment fails: the order stays pending, the customer gets one plain message, a task is created for follow-up. Tech does not upload the photos: the project cannot move to complete, and the queue shows it stuck. Adjuster does not show: the inspection is rescheduled, the lead status does not change, and the owner is notified.

Each failure gets a recovery. Who fixes it, and how. Then write the audit evidence: what proves the step happened at all? A timestamp on the status event. A message record with the text that was sent. A photo in the evidence table. If you cannot point to the proof, the step did not happen as far as the system knows.

State the expected outcome in one line at the bottom. "Signed contract, deposit paid, project created, install scheduled."

What good looks like: every failure state has a name, an owner, and a way back to the happy path.

The mistake is writing the happy path only, because it is the one you know. The happy path is where you make money. The failure path is where you keep the customer.

Pick your five. For most businesses they are: lead to first response, first response to booked, quote to paid, paid to delivered, delivered to review and referral. The first two are the trigger map from FU L01 and the first response from FU L02, now written as full specifications. If yours are different, use yours. Run the prompt once per process, with the process name in the bracket, and paste in the relevant slice of your data model so it uses your record names.

## Worked example

Pine Ridge Roofing in Gilmer is a fictional example. The owner is Cody. He runs three crews and does most of the estimating himself. The workflow he picks first is storm lead to signed contract, because that is where the money is and where the chaos is.

Cody runs the prompt with his lead, opportunity, order, and project entities pasted under it:

"Create a workflow specification for storm lead to signed contract. Include trigger, preconditions, steps, owner, tool, record updated, business rule, approval, notification, expected outcome, failure state, recovery, and audit evidence."

Example output:

```text
Trigger: lead created with source "storm" from website form, missed call, or door hanger QR code.
Precondition: lead has phone number and property address.
Step 3. Owner: estimator. Tool: admin back office. Record: opportunity created, status "inspection scheduled." Notification: text to homeowner with date, sent by office manager from Quo.
Step 5. Owner: estimator. Rule: if price differs from the standard sheet, note required. Approval: owner. Record: opportunity status "quoted."
Failure: adjuster no-show. Recovery: reschedule task created, homeowner texted, lead status unchanged, owner notified.
Outcome: opportunity "won," order created with deposit, project scheduled.
```

Cody reads it against the pass standard. Does every step have an owner and a record update, and are failures and approvals explicit? Mostly. But the first version he got had two gaps he only saw when he read it out loud to his newest hire. The adjuster no-show had no failure state at all, and the price change said "Cody decides" with nothing recorded anywhere.

The one revision: he added the no-show failure path you see above, with a reschedule task and a text, and he moved the price approval into the opportunity record with a required note, so the reason is on the record instead of in his head. His new hire read the revised page and could tell him what step three was without asking. That passed.

## Exact working prompt

```text
Create a workflow specification for [process]. Include trigger, preconditions, steps, owner, tool, record updated, business rule, approval, notification, expected outcome, failure state, recovery, and audit evidence.
```

## Guided practice

1. Write down the five workflows that most affect revenue or customer trust, one line each, in the Workflow specification section of the workbook.
2. Run the prompt for the first one with the process name in the bracket and your record names pasted under it.
3. Go step by step and mark each one H for human or S for system.
4. For every step, write one failure state and one recovery in the margin.
5. Read the page to someone who has never done the job and fix whatever they cannot follow.

## Assignment and evidence

Document the five workflows that most affect revenue or customer trust.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Every step has an owner and record update, while failures and approvals are explicit.

## Common mistakes

- Starting in the middle. Fix: name the exact trigger and the record it creates before step one.
- One workflow for answered and missed calls. Fix: two triggers, two specifications.
- Humans doing the copying. Fix: any step that moves data between screens becomes system work.
- Happy path only. Fix: every step gets a failure state, a recovery, and an owner.
- Approvals that live in the owner's head. Fix: the approval is a field on the record, with a note.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Trigger to outcome swimlane.
**Screen recording:** A test lead submitted on the website form, then followed through the Supabase leads table, the ClickUp queue card, the confirmation email in Resend, and the status event log, side by side with the swimlane drawn on paper.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Workflow specification.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

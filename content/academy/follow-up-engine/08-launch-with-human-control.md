# FU L08: Launch With Human Control

## What you will finish

Automate safe delivery and reminders while keeping approval around sensitive or consequential messages. You will have a launch checklist with every action classified as automatic, review before send, or human only, written approval gates, and a test run with screenshots proving the stop and opt-out logic works.

## Why this matters

This is the finish line for the course, and the one lesson where getting it wrong hurts people other than you. An automation that emails a checklist to someone who asked for it is a convenience. An automation that texts a person who said stop is a broken promise, and depending on the rules, a lot worse. The difference is not the tool. It is the decision about what runs on its own.

I have watched owners flip on "full automation" because a demo made it look easy, then spend a Saturday apologizing to customers who got four texts in a day. I have also watched owners refuse to automate anything, so the checklist download waits for a human on Monday and the lead is gone by then. Both are avoidable.

The rule is simple. Automation handles delivery and reminders. Humans handle anything sensitive or consequential, and humans send the texts. This lesson draws that line, puts a gate at every crossing, and proves the stop switch works before a real lead goes through it. Lessons one through seven built the parts. This is where they get wired together and turned on.

## The lesson

### 1. Classify safe automation

List every action in your workflow. Not the messages, the actions: "send touch one email," "create callback reminder," "send touch four text," "update status to quoted." Your trigger map and sequence planner already hold most of this.

Now put each action in one of three buckets.

Automatic: runs with no human. Actions that deliver what was asked, confirm what happened, or remind a human. The download link. The purchase receipt. The first email confirmation. The callback task in ClickUp. Moving status to "closed, no response" after the close-the-loop email. Low stakes, high volume, content approved once and never changed per lead.

Review before send: the automation drafts it, a human reads it and hits send. Anything that mentions a price, a specific promise, a date the business has to keep, or that goes to a lead who has objected. Objection cards. Revised quotes. Touch six with a real deadline.

Human only: no automation touches it. Texts, all of them, sent from Quo by a person, to people who opted in, inside quiet hours. Calls. Anything after a complaint, a dispute, a refund, or a cancellation. Anything where the lead said "call me" or "don't text me."

Why texts stay human: automated texting carries consent and carrier rules that email does not, and getting them wrong gets a number blocked or worse. A human reading the record before each text is the cheapest safeguard there is. When volume makes that painful, do the carrier registration properly with your provider.

What good looks like: each action has exactly one bucket and a one-line reason. The mistake: classifying by convenience. "Automate the text because I'm busy" is the wrong reason. Classify by what happens if it goes out wrong.

### 2. Create approval gates

A gate is where a human says yes before something moves. For each one, write what stops there, who approves, and how long it can wait.

The gates I build for most clients:

Gate one, content approval. Every template (seven touches, three no-response messages, ten objection cards) is read and approved by the owner before the automation is turned on. Only approved versions can send. Change a template and it goes back through the gate.

Gate two, the send queue. Review-before-send messages land in a queue: a ClickUp list, a Notion view, or a Supabase table with a status of "pending review." One person owns the queue and clears it twice a day.

Gate three, consent. Before any send, automatic or human, the system checks the consent field for that channel. Email consent no: no email. Text consent no: the human's reminder says "call, do not text." It is a condition in Resend or a filter in your query, written on the task too.

Gate four, the sensitive flag. A field on the record. When a lead complains, mentions a dispute, or says anything that makes you pause, a human flips the flag and every automated send for that record stops. Only a human can clear it.

Gate five, the record. Every send, automatic or human, writes a line to the record: what was sent, which channel, when, and by whom or by what. If a customer says "you texted me at 9 pm," you open the record and know whether it happened.

What good looks like: a written list of gates with names next to them, in the Automation guardrails section. The mistake: gates that exist in your head or in a tool setting nobody else can see. The person running this in six months might not be you.

### 3. Test stop and opt-out logic

Nothing goes live until you have proven the brakes with test records. This is the assignment, so I will be specific.

Make three test records in your lead table, using your own email and phone or a team member's. Give them different consent settings: one with email and text yes, one with email yes and text no, one with everything no except the request itself.

Run the sequence on all three. Confirm the second record never produces a text reminder, and the third gets nothing but the requested delivery. Screenshot the record after each touch.

Then test the stops on record one, resetting it between each. Reply to touch two by email: touches three through seven cancel. Click unsubscribe on touch three: the email consent field flips to no and nothing else sends. Send STOP to the business line from the test phone: the text consent field flips to no and the human reminder changes to "do not text." Mark it booked: the sequence ends. Flip the sensitive flag: everything halts.

Screenshot each one for your submission. A failed test is good news: you found it with your own phone, not a customer's.

Then quiet hours: schedule a touch for 6 am and confirm the email goes and the human task does not appear until 8. Then trace one send backward to its record line, template version, and gate. If you cannot, fix that before launch.

What good looks like: a launch checklist with every gate ticked, every stop test passed, screenshots attached, and the date you turned it on. The mistake: testing on a real lead because you were in a hurry. Test records only.

Then turn it on. What you have now: a trigger map, first responses in three channels, a seven-touch sequence, no-response messages, objection cards, a logging habit, a scorecard, and a launch with gates. That is a follow-up engine you own, on your Resend account, your Quo line, and your Supabase table.

What to do with it: run it for two weeks, review the scorecard every Friday, change one thing at a time. If you would rather build it alongside us, that is the Follow-Up Campaign at /go/lead-follow-up, $197.

Next course: OA06, The Website Conversion System. A follow-up engine only works if the website sends it leads worth following up on.

## Worked example

Pine Ridge Roofing in Gilmer is a fictional example, the same company from lesson one. Workflow: five triggers, the quote sequence, no-response messages, objection cards, a Supabase record, Resend for email, Quo for texts and calls, ClickUp for reminders.

The owner pasted the full workflow into the prompt:

"Audit this follow-up workflow for automation risk: [full workflow pasted]. Classify each action as automatic, review before send, or human only. Explain privacy, consent, reputation, and business risks. Return a launch checklist."

Example output (excerpt):

```text
Automatic: touch 1 quote confirmation email; storm checklist delivery; booking receipt; callback reminder creation; status to "closed, no response" after touch 7.
Review before send: touch 3 photo email (names a specific past job); touch 6 (states a schedule window the crew must honor); all objection cards.
Human only: all texts; all calls; any record with the sensitive flag; the missed-call callback.
Risk: touch 4 currently texts anyone with a phone number on file. The consent field is not checked. Reclassify as human only and add the consent check.
Launch checklist: 1. Templates approved and versioned. 2. Consent check on every send path. 3. Sensitive flag halts all sends. 4. Three test records through every stop case, with screenshots. 5. Quiet hours confirmed. 6. Every send writes to the record.
```

Review against the pass standard. Opt-outs stop future sends: the audit caught that touch four never checked consent. Sensitive messages require review: yes, after the reclassification. Every send traceable: the checklist said "writes to the record" without saying what gets written, so nothing enforced it.

The one revision: the owner moved touch four's text to a human reminder in ClickUp that reads "call first; text from Quo only if text consent is yes," and made every Resend send and every Quo message write a row with channel, time, and template version. Then he ran the three test records, sent STOP from his own phone, watched the consent field flip, and took the screenshot. Launched the following Monday.

## Exact working prompt

```text
Audit this follow-up workflow for automation risk: [paste workflow]. Classify each action as automatic, review before send, or human only. Explain privacy, consent, reputation, and business risks. Return a launch checklist.
```

## Guided practice

1. List every action in your workflow, one per line, from the trigger map and sequence planner.
2. Run the exact prompt with the workflow pasted in and sort every action into the three buckets.
3. Write your five gates, with an owner's name on each, in the Automation guardrails section.
4. Create three test records with different consent settings and run every stop test, screenshotting the record each time.
5. Fix every failure, rerun, then set the launch date and turn it on.

## Assignment and evidence

Run the sequence with test records and document every approval gate.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Opt-outs stop future sends, sensitive messages require review, and every send is traceable.

## Common mistakes

- Automating texts because it was easy. Fix: humans send texts from Quo; automation sends email and reminders.
- Gates that live in a tool setting nobody documented. Fix: write every gate with an owner in the guardrails section.
- An opt-out that stops email but not the human reminder. Fix: the consent field drives both the send and the task text.
- No send log. Fix: every send writes a line to the record with channel, time, and template version.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Automatic versus approval-gated workflow.
**Screen recording:** Screen record the three test records in Supabase, a STOP reply arriving in Quo and the text consent column flipping to no, the Resend log showing no further sends, and the launch checklist being ticked.
**Course map:** the course visual below anchors where this lesson sits.

![The Follow-Up Engine course visual](/images/academy/follow-up-engine.svg)

## Downloadable

[Open the Follow-Up Engine workbook](/downloads/operator-academy/follow-up-engine-workbook.pdf)

Workbook section: OA05 Follow-Up Workbook, Automation guardrails.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

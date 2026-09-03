# FU L01: Map the Follow-Up Moment

## What you will finish

Choose the right next message based on what the lead actually requested. When you are done you will have a one-page trigger map: five lead events down the left side, and for each one the first response, channel, timing, owner, stop condition, and record update on the right.

## Why this matters

Most follow-up fails before anyone writes a word. It fails because nobody decided what a form submission means, so it sits. It fails because a missed call gets the same generic "thanks for reaching out" as a paid booking. The lead asked for something specific and got a message that ignored it.

Here is the scene I see over and over. A roofer in Gilmer gets a quote request at 2:10 on a Tuesday. He is on a roof. The form goes to an inbox his office manager checks on Thursdays. By then the homeowner has signed with the company that called back in twenty minutes. Nothing was wrong with his work. The moment passed.

A trigger map fixes that. It decides, in advance, what every kind of lead gets and when, so the response does not depend on who is busy.

This comes first because everything in this course hangs on it. Lesson two writes the first response for each trigger. Lesson three builds the sequence behind it. Lesson eight automates the safe parts. If the map is wrong, all of that is wrong too.

## The lesson

### 1. Name the trigger

A trigger is the exact event that starts a follow-up. Not "a lead came in." The specific thing they did.

Open the lead record you built in the Lead Capture System (LC L07). Look at the source column. Every distinct source is a trigger candidate. Most local businesses run on five: a form submission, a purchase, a missed call, a quote you sent, and a download.

For each one, write down what the person expects right now. Someone who filled out a quote form expects a quote, or at least a human telling them when the quote is coming. Someone who downloaded your checklist expects the checklist. Someone who called and got voicemail expects a call back, today. Someone who paid expects a receipt and a "here is what happens next."

Write the expectation in their words, not yours. "I want to know if you can fix this before the weekend" beats "lead is interested in service."

What good looks like: one line per trigger, plain English, no jargon. The mistake I see: businesses lump everything into one trigger called "new lead" and send everyone the same message. That is how a paying customer gets a "thanks for your interest" email. Name the trigger and the right message becomes obvious.

Example: a quote request from the website form. Expectation: "Tell me roughly what this costs and when you can come look."

### 2. Match the channel

Now decide how you answer. The answer depends on two things: what the person asked for, and what they agreed to.

Go back to your consent checklist from LC L04. You separated requested access from optional marketing email, calls, and texts. That separation drives this step. A person who requested a quote can get a reply about that quote. That is the conversation they started. A person who did not check the text box does not get marketing texts, no matter how good the offer is.

Here is where I have to be honest about texting, because I get asked about it every week. Automated text messaging runs on consent rules and carrier rules. The carriers want business numbers registered before they will deliver bulk traffic, and the rules around consent and opt-out are real. I am not your attorney. Have your attorney review your consent wording once, then move on.

My house rule, and the default I build for clients: a human sends every text, from Quo, from the registered business line, only to people who opted in, and only inside quiet hours. My quiet hours are 8 am to 8 pm local. Automation sends email through Resend and creates reminders for the human. That keeps the fast, personal channel in human hands and lets the machine handle what it is good at.

So the channel matching goes like this. Missed call: call back first, then a personal text from Quo if they opted in, then an email if the call fails. Form submission: email confirmation automatically within a minute, then a human call within the hour during business hours. Download: email delivery, automatic. Quote sent: email with the quote, then a call two days later. Purchase: email receipt and next steps, automatic, plus a personal note from the owner.

The mistake: picking the channel you like instead of the channel they used. If they texted you, text back. If they emailed at midnight, email is fine and a 7 am call is not.

Also set the timing and the owner. Timing means "within 15 minutes" or "next business morning," not "soon." Owner means one name. If two people own it, nobody owns it.

### 3. Set a stop condition

Every follow-up needs a rule for when it ends. Without one, you become the company that sends the eighth "just checking in" email to someone who bought from you last week.

Stop conditions are simple. The follow-up for a trigger stops when they reply, they book, they buy, they opt out, they say not now, or the sequence runs out. Any one of those ends it. Write the stop condition next to every trigger.

Then write the record update. What field changes in the lead record when this trigger fires, and when it stops? At minimum: status, last touch date, next action, and next action due. If someone opts out, the consent field changes to no, and that change has to happen in the record, not in somebody's memory.

What good looks like: you can hand the map to a new hire and they can run it without asking you a question. The mistake: stop conditions that live in someone's head. If it is not in the record, the next automation or the next person will not know.

Example: quote sent. Stop when they accept, decline, or ask for changes, or after touch seven. Record update: status to "quoted," next action "call Thursday," owner "Ryan." If they decline, status to "closed, no," and no more messages.

Before you leave this lesson, run your missed calls through /tools/missed-call-calculator. It puts a number on the trigger most owners ignore.

## Worked example

Pine Ridge Roofing in Gilmer is a fictional example. Two-truck crew, owner on the roof most days, office manager part time. Five triggers: website quote form, missed call to the office line, storm damage checklist download, inspection booking paid online, and written quote sent by email.

The owner ran the lesson prompt for the missed call trigger:

"Map the follow-up for this trigger: missed call. Return the lead expectation, first response, channel, timing, owner, stop condition, and required record update."

Example output:

```text
Lead expectation: a call back today from a person, not a form.
First response: return the call. If no answer, leave a 20-second voicemail naming the business and the callback number.
Channel: phone first. Text from the business line if the caller has opted in to texts.
Timing: within 30 minutes during business hours; first thing next morning after hours.
Owner: office manager, owner as backup.
Stop condition: reached by phone, booked, or caller says not now.
Record update: create lead with source "missed call," status "callback due," next action "call back," due today.
```

Review against the pass standard. Real trigger: yes. Stop condition: yes. Documented consent: no. The output said a text was fine "if the caller has opted in," but a missed caller has never seen a consent box. Nothing in the record says yes to texts, so that line would have sent a text on an assumption.

The one revision: no automated text to a missed caller, ever. The office manager returns the call. If it goes to voicemail, she may send one personal text from Quo that identifies the business and asks how to help, nothing more. On the call, she asks whether texting is fine for scheduling and records the answer in the consent field with the date. The map now reads: missed call, phone, 30 minutes, office manager, stop on contact or not now, text consent asked and recorded on the call.

## Exact working prompt

```text
Map the follow-up for this trigger: [form, purchase, missed call, quote, or download]. Return the lead expectation, first response, channel, timing, owner, stop condition, and required record update.
```

## Guided practice

1. List your five triggers and write one line for what the person expects, in their own words.
2. Next to each, mark which channels they have consented to, using the consent fields from LC L04.
3. Run the exact prompt for one trigger and paste the result into the Trigger map section of the workbook.
4. Add timing, owner, and stop condition by hand wherever the output was vague.
5. Write the record update as field names from your lead record.

## Assignment and evidence

Create a trigger-to-next-action map for five common lead events.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Every message is connected to a real trigger, documented consent, and a stop condition.

## Common mistakes

- One "new lead" bucket for everything. Fix: split it into the five triggers and write the expectation for each.
- Channel chosen by preference, not by what they used or agreed to. Fix: read the consent fields before picking the channel.
- "Soon" as a timing. Fix: write minutes, or a specific next business morning.
- Stop conditions that live in someone's head. Fix: write the field that changes and who changes it.
- Automated texts to people who never opted in. Fix: humans send texts, automation sends email and reminders.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Signal to action timeline.
**Screen recording:** Screen record the lead table in Supabase (or your sheet) with the source and consent columns visible, then the workbook Trigger map being filled in row by row for the missed call trigger.
**Course map:** the course visual below anchors where this lesson sits.

![The Follow-Up Engine course visual](/images/academy/follow-up-engine.svg)

## Downloadable

[Open the Follow-Up Engine workbook](/downloads/operator-academy/follow-up-engine-workbook.pdf)

Workbook section: OA05 Follow-Up Workbook, Trigger map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

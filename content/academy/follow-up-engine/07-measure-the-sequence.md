# FU L07: Measure the Sequence

## What you will finish

Use delivery, replies, qualified conversations, bookings, sales, and opt-outs to improve follow-up. You will have a one-page weekly scorecard with ten defined metrics, one week of real baseline numbers in it, and one variable chosen to change next week.

## Why this matters

You cannot fix a sequence you are not measuring, and most owners measure the wrong thing. The email tool shows an open rate. It looks like a real number. It is not. Mail apps preload images and count as opens whether a human looked or not. An open rate tells you almost nothing about whether anyone is talking to you.

What matters is behavior. Did the message arrive? Did a person reply? Was the reply positive? Did it become a real conversation, a booking, a sale? Did anyone opt out or complain? How long did it take you to answer? Those are the numbers that map to decisions.

Picture the gym from lesson three. After a month of the starter plan sequence, the owner looks at the email dashboard and sees an open rate near fifty percent. Feels great. Then she counts replies: four. Bookings: one. Opt-outs: nine. The sequence that looked healthy was quietly burning the list. The open rate hid it.

You built the sequence in lesson three and the record in lesson six. Every metric in this lesson comes from that record. If the record is dirty, the scorecard lies. That is why data quality is a metric on the card.

## The lesson

### 1. Choose behavior metrics

Ten metrics. Each one defined in a sentence and tied to a decision. If a number does not change what you do, it comes off the card.

Delivery: how many sends arrived. Resend reports bounces and failures; Quo shows delivered texts. Decision: if delivery drops, fix the list or the domain setup before touching the copy.

Reply: how many people wrote or called back. Any reply. Decision: a weak reply count on touch two means the first response did not land.

Positive reply: replies that move forward. "Yes, Thursday." "Send me the chain link version." Not "stop." Decision: replies that are mostly negative mean the ask is wrong, not the timing.

Qualified conversation: a reply that turned into a real exchange with a stated need and a next action, logged the way lesson six taught. Decision: this is the number that tells you the sequence is producing work for a human.

Booking: an appointment, estimate, or session on the calendar. Purchase: money in. Decision: these two decide whether the whole thing is worth the time.

Opt-out: unsubscribes, "stop" texts, "take me off the list." Complaint: anything stronger than an opt-out, including spam reports. Decision: these are the brakes. A rising opt-out count means cut touches, not add them.

Time-to-first-response: minutes from the trigger to the first human or automated response. Decision: if this is over an hour during business hours, fix that before anything else in this course.

Data quality: how many records this week had a missing consent field, missing next action, or missing owner. Decision: if this is high, the other nine numbers cannot be trusted.

Define each one on the card in your own words. Count them by hand the first week if you have to. A tally in the workbook beats a dashboard you do not understand.

What good looks like: every row has a metric, a definition, a number, and a decision. The mistake: opens and clicks on the card. Leave them off. Opens are unreliable, and clicks only matter if the click led to a reply or a booking, which you are already counting.

### 2. Segment by trigger

One total number hides the problem. Split every metric by the trigger from lesson one.

Say the combined reply count looks fine. Split it and you find the download sequence gets replies and the missed-call sequence gets none. Those are two different problems. The download sequence might be done. The missed-call sequence might have a first response that arrives too late, or a voicemail nobody can understand.

So the scorecard has a section per trigger: form, purchase, missed call, quote, download. Only the ones you actually have. For each trigger, the ten numbers. It is more rows, but they are small numbers for a local business, and they are the only way to see where the leak is.

Then look at one more split: by touch. Which touch produced the replies? Which touch produced the opt-outs? If touch five is where people leave, touch five has a problem. The value column from lesson three is the first place to look.

Where the numbers come from: the lead record has trigger, stage, consent, and last touch. Resend has delivery and bounces per email. Quo has replies and calls. Your calendar has bookings. Stripe or your invoicing has purchases. One person pulls them Friday afternoon into the scorecard. Fifteen minutes.

What good looks like: you can point to one trigger and one touch and say "that is where we lose them." The mistake: averaging across triggers and deciding the whole sequence is fine, or broken, when only one part is.

### 3. Change one variable

Now you have baseline numbers. Next week, change exactly one thing, and measure again.

One. Not the subject line and the timing and the channel. If you change three things and replies go up, you do not know which one did it, and you will never be able to repeat it.

Pick the change from the worst number that has a decision attached. Time-to-first-response too long: make the first email automatic and set a 30-minute callback reminder. Opt-outs on touch five: rewrite touch five's value or cut it. Replies fine but bookings weak: change the call to action on touch four from "want to book?" to two specific times. Positive replies low on the quote trigger: try the objection card from lesson five as touch three.

Write the change on the scorecard before the week starts. Write what you expect to move. Then run the week and compare. Small local numbers bounce around, so do not declare victory on one week with six leads. Two or three weeks pointing the same way is a real signal.

What good looks like: a short log on the scorecard, one line per week, what changed and what happened. The mistake: changing nothing because the numbers are small, or changing everything because one week looked bad. Small numbers, one change, patience.

If you want a dollar figure to put next to the time-to-first-response row, /tools/missed-call-calculator gives you one for the missed call trigger.

## Worked example

Rose City Fitness in Tyler is a fictional example, the same gym from lesson three. The sequence has run for one full week on the starter plan download trigger. The owner ran the prompt:

"Design a weekly follow-up scorecard for the starter plan download sequence, seven touches, email plus a human call on touch four. Include delivery, reply, positive reply, qualified conversation, booking, purchase, opt-out, complaint, time-to-first-response, and data quality. Define each metric and the decision it supports."

Example output (three rows, condensed):

```text
Reply: any inbound email, text, or call from a lead in the sequence this week. Decision: if touch two draws almost no replies, rewrite the first response before touching anything else.
Opt-out: unsubscribe clicks plus any "stop" or "remove me" reply. Decision: any rise week over week means cut the weakest touch before adding anything.
Data quality: records in the sequence missing consent, owner, or next action. Decision: above zero, fix the records before trusting the other rows.
```

Then she entered the baseline. Example numbers: 31 downloads, 30 delivered on touch one, 5 replies, 3 positive, 2 qualified conversations, 1 booking, 0 purchases, 2 opt-outs, 0 complaints, time-to-first-response 1 minute automated and 26 hours to the first human call, and 4 records missing an owner.

Review against the pass standard. Metrics tied to decisions: yes. Vanity opens separated from outcomes: not at first. The draft had an "open rate" row the model added on its own. She deleted it.

The one revision: the 26-hour human response was the worst number with a clear decision behind it. The change for next week: a ClickUp reminder fires 20 minutes after the download for whoever is on the floor to make the call that day, instead of waiting for touch four. Nothing else changes. She wrote the expected effect, "qualified conversations up," at the bottom of the card and closed the laptop.

## Exact working prompt

```text
Design a weekly follow-up scorecard for [sequence]. Include delivery, reply, positive reply, qualified conversation, booking, purchase, opt-out, complaint, time-to-first-response, and data quality. Define each metric and the decision it supports.
```

## Guided practice

1. Bring your sequence planner from lesson three and your lead record with at least one week of activity.
2. Run the exact prompt with your sequence described in one line.
3. Delete any row about opens or clicks and rewrite any definition you could not count by hand.
4. Pull one week of numbers per trigger from the record, Resend, Quo, your calendar, and your payment tool.
5. Circle the worst number that has a decision attached and write one change for next week.

## Assignment and evidence

Build the scorecard and enter one week of baseline data.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Metrics connect to decisions and separate vanity opens from meaningful outcomes.

## Common mistakes

- Open rate on the card. Fix: delete it and count replies and bookings instead.
- One total for all triggers. Fix: a section per trigger, then a look per touch.
- Three changes in one week. Fix: one variable, written down before the week starts.
- Reacting to one week of six leads. Fix: wait for two or three weeks to point the same way.
- Trusting numbers from dirty records. Fix: data quality is a row, and you fix it first when it is above zero.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Follow-up conversion funnel.
**Screen recording:** Screen record the Resend delivery view, the Quo inbox reply count, and the lead table filtered by trigger, then the workbook scorecard being filled in with the week's baseline and the one change written at the bottom.
**Course map:** the course visual below anchors where this lesson sits.

![The Follow-Up Engine course visual](/images/academy/follow-up-engine.svg)

## Downloadable

[Open the Follow-Up Engine workbook](/downloads/operator-academy/follow-up-engine-workbook.pdf)

Workbook section: OA05 Follow-Up Workbook, Sequence scorecard.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

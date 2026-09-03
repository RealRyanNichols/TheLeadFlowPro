# LC L08: Test the Whole Funnel

## What you will finish

Verify the form, mobile experience, record creation, delivery, and routing before promotion. When you are done you will have two documented test runs, one clean and one broken on purpose, a list of every issue you found, and a funnel you can send traffic to without wincing.

## Why this matters

This is the finish line, and it is the lesson people skip. The form looks right. The page looks right. The table exists. So they put money into a Meta ad and find out on day four that the delivery email has been going to spam, the SMS box was pre-checked on mobile, and the table has two rows for every person.

Here is the scene. A plumber in Marshall launches his water heater check. Twenty-two submissions the first week. Then he opens the table. Phone numbers with letters in them, because the field was set to text. Six duplicates. Every consent_sms value true, including the ones from people who left the box empty. He cannot text any of them, because he does not know who actually said yes. Twenty-two leads, and he has to start over.

Every one of those was findable in thirty minutes with a phone and a checklist. That is this lesson. Not a technical audit. A walk through your own funnel as a stranger, once clean, once trying to break it, writing down what you see.

You have built a lot in seven lessons. A micro result, a lead magnet, a lean form, real consent, a thank-you path, three routing questions, and one record. Now we prove it works before anyone else touches it.

## The lesson

### 1. Run a clean-device test

A clean device is a phone that is not yours, or your phone in a private browser window, on cellular data instead of the office Wi-Fi, logged out of everything. You want to see what a stranger sees, including what your own browser has been quietly autofilling for you.

Run the prompt first, with your funnel described in two or three sentences. It gives you a checklist covering everything from required fields to analytics. Print it. Then go through it in order on the clean device.

The clean run: open the landing page from the exact link you will put in the ad, with the UTM parameters on it. Fill out the form with a real email you control and a test phone. Leave both consent boxes empty. Submit. Land on the thank-you page. Tap the download. Wait for the email. Open it. Tap its link. Then check that the owner notification arrived, by Quo text, email, or ClickUp task.

Write down every step and what happened, including the seconds between submit and email. What good looks like: every step does what lesson five promised, the email arrives in under a minute from your own domain, and you never once wondered what to do next. The mistake people make: testing on their own laptop, logged in, with autofill, and calling it done.

Example: the Marshall plumber's clean test caught the phone field accepting letters. One setting in the form builder, phone type instead of text. His laptop would have autofilled a real number and hidden it.

### 2. Inspect the database record

Now open the leads table, Supabase or the sheet, and find the row you just created. Go column by column against what you typed. This step catches the quiet failures.

Name split correctly. Email exact. Phone stored as digits. source, lead_magnet, and landing_page filled. The UTM columns show the values from the link, not blanks. consent_email_marketing and consent_sms are both false, because you left the boxes empty, and their timestamps are empty too. consent_wording_version has the number. status is new. owner is filled by the routing rule. next_action has something in it.

Then do a second clean submission with both boxes checked and one qualification answer changed. The consent columns should now be true with timestamps. The routing should have sent it somewhere different, per your rules from lesson six. Then submit the same email a third time. You should have two rows total, not three, and the notes on the updated row should say a resubmission happened.

What good looks like: three submissions, two rows, and every column matches what the form showed. The mistake people make: checking that a row exists and stopping there. A row that exists with the wrong consent values is worse than no row.

Example: a Longview bookkeeper found utm_campaign blank on every row. The form tool needed the hidden field named exactly utm_campaign, and hers was named "campaign." Renamed, retested, filled.

### 3. Test every failure state

Now try to break it. Every failure needs to end in a message a stranger can recover from, not a spinner or a silent nothing.

Submit with the email empty. Submit with "notanemail" in the email field. Submit with a phone number that is too short. Each one should stop, point at the field, and say what to fix. Double-tap the submit button fast. One row, not two. Walk to the back of the shop where the signal is bad and submit. It should either work or tell you it did not, not sit there.

Then the after-submit failures. Delete the delivery email and use the thank-you page's "did not get it" path. Click unsubscribe in the marketing email from your second test. Does do_not_contact flip to true in the table? If you send texts, reply STOP to a test text and confirm the record shows it. Last, check analytics. Whatever you use, Vercel Analytics, Google Analytics, or the Meta Pixel, confirm the submission shows up as one lead event, once, not on every page view.

Write every issue in one list with three columns: what broke, what should happen, fixed or not. Fix what you can today. Do not promote until the fixed column is full.

What good looks like: every failure gives a recoverable message, opt-outs land in the record, and the analytics count matches the table. The mistake people make: assuming the form tool handles errors. Some show a green check and drop the submission on the floor.

Example: the Marshall plumber's double-tap test made two rows. He turned on duplicate protection in the form builder and set email to unique in Supabase. One row.

That is the whole system, and you own every piece of it: the magnet, the form, the consent, the page, the routing, and the record. Send it a little traffic first. A post, a text to ten past customers who said yes to texts, a QR code on the counter. Watch ten real submissions land and get handled. Ads come later, in OA08, Local Ads Operator.

Before ads, though, the record needs a follow-up engine. A lead that lands in the table and gets one email is a lead you paid for and let go. That is OA05, The Follow-Up Engine: the first response, the seven-touch sequence, what to do when nobody answers, and how to log every conversation back into this same record. If you would rather have the first campaign built for you while you learn, the Follow-Up Campaign at /go/lead-follow-up is $197.

## Worked example

Caddo Lake Plumbing in Marshall is a fictional example, the same business from lesson one. They are ready to launch the Water Heater Age and Risk Check: landing page, form with two consent boxes, thank-you page with the download and one booking button, three routing questions, Supabase leads table, owner text through Quo.

The owner ran the lesson prompt with the bracket filled in:

"Create an end-to-end QA checklist for this lead funnel: a landing page with a form for a water heater checklist, email delivery through Resend, a thank-you page with the download, a Supabase leads table, and an owner text notification through Quo. Cover desktop, mobile, required fields, consent, duplicate submission, slow network, confirmation, record creation, notifications, unsubscribe, and analytics."

Example output:

```text
Mobile, cellular, private window: form readable without zoom, consent boxes unchecked on load, submit works with both empty.
Required fields: empty email blocked with a message at the field; bad email format blocked; phone accepts digits only.
Duplicate: same email twice creates one row plus a note.
Slow network: submit shows a pending state, then confirms or reports failure.
Record: every column matches the form, consent values and timestamps match the boxes, UTM present.
Delivery: email from the business domain within 60 seconds; download works on the page.
Notifications: owner text arrives with name, need, and timeline.
Unsubscribe and STOP flip do_not_contact to true; analytics shows one lead event per submission.
```

Review against the pass standard. Clean test: the checklist arrived in 40 seconds, the record was complete, and consent matched the empty boxes. Error test: the bad-email case gave a clear message at the field. The double-tap case failed with two rows.

The one revision that made it better: the owner set email to unique in Supabase and turned on duplicate protection in the form. Retest: one row. He logged five issues, fixed four that afternoon, and left an analytics double-count as an open item with a date. Then he texted the link to ten past customers who had checked the box and watched the first real rows land.

## Exact working prompt

```text
Create an end-to-end QA checklist for this lead funnel: [describe funnel]. Cover desktop, mobile, required fields, consent, duplicate submission, slow network, confirmation, record creation, notifications, unsubscribe, and analytics.
```

## Guided practice

1. Run the exact prompt with your funnel described in two or three sentences, and print the checklist.
2. On a clean device on cellular, submit once with both consent boxes empty, and follow the whole path through delivery and notification.
3. Open the leads table and check every column of that row against what you typed.
4. Submit again with a bad email, an empty required field, a double-tap, and the same email twice, and record what each one did.
5. Log every issue in the Launch QA section of the workbook, then fix everything you can today.

## Assignment and evidence

Run two test submissions, one clean and one error case, then document every issue.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The promised result arrives, the record is complete, consent matches the choices, and failures give a recoverable message.

## Common mistakes

- Testing on your own laptop with autofill. Fix: a clean device, private window, cellular.
- Checking that a row exists and stopping. Fix: every column against what you typed, consent included.
- Never trying to break it. Fix: bad email, empty fields, double-tap, same email twice, bad signal.
- Ignoring the opt-out path. Fix: unsubscribe and STOP have to flip do_not_contact in the record.
- Promoting with open issues. Fix: the fixed column is full before the first ad runs.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Lead funnel test matrix.
**Screen recording:** A phone in a private window submitting the Caddo Lake form, the Supabase row appearing beside it on the laptop, then the double-tap producing two rows and the fix producing one.
**Course map:** the course visual below anchors where this lesson sits.

![The Lead Capture System course visual](/images/academy/lead-capture-system.svg)

## Downloadable

[Open the Lead Capture System workbook](/downloads/operator-academy/lead-capture-system-workbook.pdf)

Workbook section: OA04 Lead Capture Workbook, Launch QA.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

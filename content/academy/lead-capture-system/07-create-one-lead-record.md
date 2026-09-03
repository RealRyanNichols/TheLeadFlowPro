# LC L07: Create One Lead Record

## What you will finish

Store source, consent, status, and next action in one owned record. When you are done you will have a leads table, in Supabase or a simple sheet you control, with every form field mapped to a column and nothing on the form that has nowhere to land.

## Why this matters

Ask a business owner where their leads are and you get a list. Some in the form tool. Some in email. Some in the phone. Some on a notepad in the truck. Some in a CRM they pay for monthly and opened twice. Five places, and none of them is the truth.

Here is what that costs. A lead comes in Tuesday through the form. Wednesday they call the office and talk to someone who has never heard of them. Thursday the owner sends a follow-up email that starts at the beginning. The buyer feels like three different companies are talking to them. That is not a follow-up problem. It is a record problem.

The second cost is quieter. Someone asks to stop getting texts. It gets handled in the phone app. Six weeks later the email tool, which never heard, sends them a promotion, and now you are the business that does not listen. Consent lives in one place or it does not live anywhere.

One record. You own it. Every form field lands in it, every consent choice is stamped on it, and it says who is handling it and what happens next. That record is the fuel for everything in OA05, the Follow-Up Engine. Build it now, while the funnel is small enough to get it right.

## The lesson

### 1. Define the source of truth

Pick one place. Two good choices for version one.

Choice one, a Supabase table. This is what I build on. Open the project, click Table Editor, click New table, name it leads, and add the columns below. It is a real database you own, it exports to a file any time you want, and your website form can write to it directly. If you got a site through /free-build, this is already how it is wired.

Choice two, a Google Sheet named Leads with the same columns as headers. Less powerful, but you own it, you can export it, and your form tool can append a row to it. For a business doing a handful of leads a week, a sheet is fine to start. What is not fine is the form tool's own dashboard as your only copy. You do not own that.

Then run the prompt with your business filled in. It returns a schema with identity, source, UTM, consent timestamps, qualification, status, owner, next action, notes, marked sensitive fields, and retention limits. Here is the shape I use on real builds:

- Identity: id, created_at, first_name, last_name, email, phone
- Source: source (form, download, missed call, quote, purchase), lead_magnet, landing_page, utm_source, utm_medium, utm_campaign
- Consent: consent_email_marketing, consent_email_marketing_at, consent_sms, consent_sms_at, consent_wording_version, do_not_contact
- Qualification: q_need, q_timeline, q_fit, or whatever your three fields from lesson six are called
- Work: status, owner, next_action, next_action_at, last_activity_at, notes

What good looks like: one table, one row per person, every column with a purpose. The mistake people make: starting with forty columns because the CRM template had forty. Start with these and add a column only when a real action needs it.

Example: a photographer in Henderson had leads in Instagram messages, a Wix inbox, and a notes app. She built the sheet, moved the last thirty conversations in by hand, and saw for the first time that eleven of them were waiting on her.

### 2. Preserve consent evidence

The consent boxes from lesson four arrive in the record as more than a yes or no. Each one gets three things: the value, the time it was checked, and which version of the wording they saw.

That last one matters. When you change the consent text next spring, the people who agreed to the old wording agreed to the old wording. Keep a short numbered list of your wording versions in the workbook, and write the number into consent_wording_version on every submission. Most form tools also record the submission time and page URL. Keep those.

Then the exit. do_not_contact is its own column, and every tool checks it before sending anything. When someone replies STOP, clicks unsubscribe, or says "please stop calling" on the phone, that column flips to true the same day. One column, one place.

Retention is the last piece. Decide how long a lead that never became a customer stays in the table. Write the number down, something like twelve or twenty-four months with no activity, put the same number in your privacy policy, and put a recurring task in ClickUp or Notion to clear or anonymize old rows. The prompt will suggest limits. Pick one you will actually follow.

What good looks like: you can open any row and say who agreed to what, when, in which words. The mistake people make: the form tool stores the consent, the sheet stores a yes, and a year later nobody can match them.

Example: a Longview bookkeeper found her sheet said "SMS: yes" for eighteen people who had left the box empty. The form tool was exporting the label, not the value. She fixed the mapping, checked all eighteen against the form tool's own log, and set them to false.

### 3. Assign status and owner

A record without a status is a pile. Give status a short fixed list and do not let anyone type their own. New, contacted, qualified, booked, won, lost, do not contact. Seven states. Every lead is in exactly one.

Owner is a person's name. Not "sales." Not blank. When the routing rule from lesson six fires, it fills this column. If you are the only person, it is your name, and that is fine. A lead with no owner is a lead nobody is going to call.

Next action and next action date are the two columns that make the record work. "Call about replacement quote, Thursday." If next_action is empty, the lead is stuck. Every morning, sort the table by next_action_at. That is your call list. No dashboard needed yet.

Now the mapping. Take every field on the form, in order, and write which column it lands in. Name splits to first_name and last_name. The three qualification fields to their q columns. Each consent box to its three columns. The hidden UTM fields to the utm columns. If a form field has no column, one of two things is true: it needs a column, or it needs to come off the form. Usually the second.

Duplicates, last. Before your form inserts a row, check whether the email already exists. If it does, update that row and add a line to notes: "Submitted again on [date] for [lead magnet]." One person, one record. In Supabase, make the email column unique so a second insert becomes an update. In a sheet, sort by email once a week and merge by hand. Small funnel, small problem, as long as you do it.

What good looks like: every form field has a destination, every row has a status, an owner, and a next action, and searching an email finds one row. The mistake people make: two rows for one person, two different next actions, two different people calling them.

Example: the Kilgore welding academy's form had "preferred contact method" with no column and no rule. They removed it. The consent boxes already say how the person is willing to be reached.

## Worked example

Ledger and Lantern Bookkeeping in Longview is a fictional example. One owner, one part-time assistant. They give away a "Quarter-End Books Checklist" and sell a monthly bookkeeping service. After lessons three through six, the form has name, email, phone (optional), two consent boxes, and three questions: business type, monthly transactions as a range, and how soon.

The owner ran the lesson prompt with the bracket filled in:

"Design a simple lead record schema for a bookkeeping service in Longview, Texas, serving small businesses. Include identity, source, UTM, consent timestamps, qualification, status, owner, next action, and notes. Mark sensitive fields and recommend retention limits."

Example output:

```text
Identity: id, created_at, first_name, last_name, email (unique), phone (sensitive)
Source: source, lead_magnet, landing_page, utm_source, utm_medium, utm_campaign
Consent: consent_email_marketing, consent_email_marketing_at, consent_sms, consent_sms_at, consent_wording_version, do_not_contact
Qualification: q_business_type, q_transaction_range, q_timeline
Work: status (new, contacted, qualified, booked, won, lost, do_not_contact), owner, next_action, next_action_at, last_activity_at, notes (sensitive, free text)
Retention: clear or anonymize rows with no activity for 24 months; review quarterly.
```

Review against the pass standard. Provenance: the source and UTM columns say where every lead came from. Consent: value, time, and wording version for each box, plus do_not_contact. Duplicates: email is unique, and a second submission updates the row. Next action: its own column with a date.

The one revision that made it better: the mapping exercise found the form's "preferred contact method" field had no column. The owner removed it from the form. Then she made the notes field on the form short and optional instead of a wide-open box, because that column was the one place a stranger could type something she did not want to store.

## Exact working prompt

```text
Design a simple lead record schema for [business]. Include identity, source, UTM, consent timestamps, qualification, status, owner, next action, and notes. Mark sensitive fields and recommend retention limits.
```

## Guided practice

1. Pick your source of truth, a Supabase leads table or a Google Sheet named Leads, and create it.
2. Run the exact prompt with your business filled in and compare its schema to the column list above.
3. Add the columns, with status as a fixed list and email set to unique or checked before insert.
4. Map every form field to a column in the Lead record map section of the workbook, and remove any field with nowhere to land.
5. Submit your own form once and confirm the row shows the right consent values and timestamps.

## Assignment and evidence

Map every form field to the lead record and remove any field with no destination.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The record preserves provenance and consent, avoids duplicates, and supports the next action.

## Common mistakes

- The form tool's dashboard is the only copy. Fix: a table or sheet you own and can export.
- Consent stored as a bare yes. Fix: value, timestamp, and wording version for each box.
- Opt-outs handled in one tool. Fix: one do_not_contact column that every tool checks.
- Status typed free-form. Fix: a fixed list of seven states.
- Two rows for one person. Fix: unique email, and a second submission updates the row.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** One customer, one record blueprint.
**Screen recording:** Supabase Table Editor with the leads table being created column by column, then a test submission landing as one row with consent timestamps, then the same row in a Google Sheet for the no-code lane.
**Course map:** the course visual below anchors where this lesson sits.

![The Lead Capture System course visual](/images/academy/lead-capture-system.svg)

## Downloadable

[Open the Lead Capture System workbook](/downloads/operator-academy/lead-capture-system-workbook.pdf)

Workbook section: OA04 Lead Capture Workbook, Lead record map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

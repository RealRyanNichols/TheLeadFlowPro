# AD L06: Install Measurement

## What you will finish

Record spend, visits, form success, qualified leads, appointments, sales, and source quality. When you are done you will have a one-page measurement map that says, for every stage from ad to sale, where it is recorded and who records it, and a test click that proved each stage works.

## Why this matters

For weeks my lead emails failed silently. The form returned a 200. The row landed in the database. Nobody got an email, because the sending key belonged to an old account and the error was swallowed on purpose so the lead would still save. A 200 and a row prove the database half works. They prove nothing about the email. I only found it because leads were coming in and nothing was going out.

Then the other direction. My CRM said "new" on four leads that had been called, texted, and met with on video. The person working them did the work by phone and email and never moved the status. Any report off that table said the pipeline was dead. It was not. The work was real and invisible.

Both are measurement failures, and both make you decide wrong. One makes you think the ads are broken. The other makes you think the follow-up is. Neither was true.

One rule before we start: no names, phone numbers, or emails in a URL. Ever. Bring the page from lesson five and the labeled creative from lesson four. Their names are about to become fields in your lead record from LC L07.

## The lesson

### 1. Define the event

Write the stages as a list, top to bottom, and next to each one write where it is recorded and who records it.

Spend and impressions: Meta, automatic. Click: Meta, automatic. Landing page view: your page, automatic. Form success: your thank-you page or the form's completion screen, fires once. Lead created: a row in your table. Qualified: a human flips a field to yes, no, or pending, with a reason. Appointment: a date on the row. Sale: an invoice number and amount on the row. Refund: an amount and a date.

Form success is where people get it wrong. Fire it when the thank-you page loads, or when your form handler returns success. Not on the button click. Button clicks fire on validation errors, on double taps, on the person who changed their mind. Test it by submitting the same test twice. You want one row and one event.

Instant form leads on Meta live in Meta's Leads Center until you move them. I pull mine into my own table with a system user token and a poll every five minutes, and every lead carries an external id that starts with "meta:" so a webhook and a poll cannot create the same person twice. If you are not technical, a connector tool or a daily export does the job. The point is one table you own, where every lead lands regardless of platform.

Google Local Services leads come as phone calls. Your office logs them by hand: source LSA, the date, the recording link. Search ads land on your page and use the same events as Meta.

What good looks like: nine stages, nine places, nine owners, on one page.

The mistake: "we track everything in Meta." Meta stops at the form. Your business starts there.

### 2. Preserve campaign identifiers

UTM parameters on every link. Source, medium, campaign, content. utm_source is meta. utm_medium is paid. utm_campaign is the campaign name from your naming scheme. utm_content is the ad's file name from lesson four. Meta lets you build URL parameters with placeholders that fill in the campaign, ad set, and ad names automatically, so the labels you wrote ride along on every click.

Nothing personal goes in a URL. No email, no phone, no name, no lead id that decodes back to a person. If you need to tie a thank-you page to a submission, use a random request id that means nothing outside your table.

Then the lead record. These are the fields on the row: source, medium, campaign, ad set, ad, form id, external id, landing page path, first touch timestamp, consent flags, qualified, qualified reason, appointment date, sale amount, refund, status. The UTMs get copied from the URL into hidden form fields and saved with the row. Instant form leads carry the ad id and form id in Meta's payload. Save those too.

Name things in Meta like sentences. Business, offer, format, area, with a separator between them. Then the source column in your table reads like English instead of "Campaign 3 copy."

What good looks like: you open any lead row and can name the ad that produced it without opening Ads Manager.

The mistake: every row says "facebook" because the form had one hidden field and somebody typed the value in by hand. Or a redirect strips the UTMs before the page loads. Test it. Paste a link with UTMs, land, look at the address bar.

### 3. Verify each stage

Before you spend, run the test procedure. Open the ad preview and click it yourself. Watch the address bar and confirm the UTMs survived. Submit the form with a test name your office will recognize. Then check every stage, in order.

A row exists with the right source, campaign, and ad fields. The form success event fired once. The notification email arrived, and you checked the email provider's dashboard, not the form's response. The text back arrived, if you send one. You can set qualified, appointment, and sale on the row. Then flag the test row so it never counts.

Weekly, do one reconciliation. The lead count in Meta's form library must equal the count in your table. If Meta says nine and your table says four, five people are waiting on nobody. That check takes two minutes and it has found every broken sync I have ever had.

Appointments and sales can go back to Meta as offline outcomes, so it learns to find buyers instead of form fillers. Meta hashes the matching fields on upload. Do not send anything sensitive, nothing about health, finances, or a protected trait, and have your attorney review your privacy policy once before you turn that on. Then move on.

What good looks like: a dated note that says "test click passed" with a screenshot of the row, the event count, and the email dashboard.

The mistake: trusting the platform's lead number as the business number. Meta counts submissions. You count qualified, appointment, and sale. Those are the numbers lesson eight decides on.

## Worked example

Rabbit Creek Plumbing in Kilgore is a fictional example. Marisol's stack: an instant form on Meta, a thank-you page on her site, a lead table in Supabase, email through Resend, calls through Quo. If yours is a spreadsheet and a phone, the map is the same.

She pasted the stage list, her naming scheme, the form id, the fields her table already has, and the rule about no personal data in URLs.

"Design a privacy-aware measurement plan for Rabbit Creek water heater campaign, Kilgore, October. Include ad identifiers, landing page events, form success, lead record fields, qualification, appointment, sale, refunds, offline outcome upload considerations, and test procedure."

Example output:

```text
Ad identifiers: campaign, ad set, and ad names via URL placeholders; form id and leadgen id stored on the row as external id.
Landing page events: page view; form success on thank-you load, once, deduped by request id.
Lead record fields: source, medium, campaign, ad set, ad, form id, external id, landing path, first touch, consent call, consent marketing, qualified, qualified reason, appointment date, sale amount, refund.
Thank-you URL: /thanks?phone=[number] to prefill the booking widget.
Offline outcomes: upload appointment and sale weekly, hashed match keys only.
Test procedure: preview click, UTM check, test submission, row check, event count, email dashboard check, text check, flag test row.
```

Review against the pass standard. Do events fire once? Yes, deduped by request id. Do source fields persist? Yes, through hidden fields and Meta's payload. Can outcomes be joined without exposing sensitive data? No. The thank-you URL carries the customer's phone number in plain text, which means it lands in browser history, server logs, and anything that reads a referrer.

The one revision: the thank-you URL became /thanks?r=[random request id], and the booking widget reads the phone from the row by that id on the server. Then the test click ran end to end: UTMs survived, one row, one event, one email in the Resend dashboard, one text, test row flagged. She dated the note and saved the screenshots.

## Exact working prompt

```text
Design a privacy-aware measurement plan for [campaign]. Include ad identifiers, landing page events, form success, lead record fields, qualification, appointment, sale, refunds, offline outcome upload considerations, and test procedure.
```

## Guided practice

1. Write the stage list with a "recorded where" and a "recorded by whom" next to each stage.
2. Build the UTM template with your naming scheme and check that nothing personal is in it.
3. Add the source, campaign, ad, form id, external id, qualified, appointment, and sale fields to your lead table.
4. Run the exact prompt with all of that pasted above it.
5. Do the test click end to end, check the email provider's dashboard, and flag the test row.

## Assignment and evidence

Run a test click and verify each first-party record without using personal data in URLs.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Events fire once, source fields persist, and business outcomes can be joined without exposing sensitive data.

## Common mistakes

- Firing form success on the button click. Fix: fire on the thank-you load or the success response, and test with a double submit.
- Trusting the 200. Fix: check the email provider and the phone, not the form's response.
- Personal data in the URL. Fix: a random request id and a server side lookup.
- One hidden field that says "facebook." Fix: hidden fields for source, medium, campaign, and content, filled from the URL.
- Never reconciling. Fix: weekly, Meta's form count equals your table's count, or you go find the gap.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Spend to sale trace.
**Screen recording:** The Meta URL parameters field with the campaign, ad set, and ad placeholders, then a test submission landing as a row in the Supabase lead table with every source field filled and the Resend dashboard showing the one delivered email.
**Course map:** the course visual below anchors where this lesson sits.

![The Local Ads Operator course visual](/images/academy/local-ads-operator.svg)

## Downloadable

[Open the Local Ads Operator workbook](/downloads/operator-academy/local-ads-operator-workbook.pdf)

Workbook section: OA08 Ads Workbook, Measurement map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

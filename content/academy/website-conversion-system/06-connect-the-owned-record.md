# WC L06: Connect the Owned Record

## What you will finish

Send form and checkout outcomes into the correct lead, customer, or order record. When you are done, a form submitted on your site lands in a table you own in Supabase, with the source and the consent saved next to the name and phone, and nothing secret sitting in the browser.

## Why this matters

A form that emails you is not a system. Email gets buried, deleted, or sits in a spam folder for a week. And it holds nothing you can sort, count, or route. The lead that sat in an inbox for four days is the most common story I hear, and it is not a follow-up problem. It is a record problem.

The record is the thing you own. A row in a database with the name, the phone, when it came in, where it came from, what they agreed to, and its status. Once you have that, the follow-up from OA05 has something to fire from, the dashboard from OA09 has something to count, and you can leave a rented CRM whenever you want.

Skip the server and here is what happens. The page writes straight to the database with a key pasted into the browser, and anyone who views the source has that key. Spam bots fill the table. Rows with no phone number get saved. Consent never gets recorded. One small piece in the middle avoids all of it: a server function that checks everything before it saves anything.

Lesson five built the form and left the send as a placeholder. This lesson connects it.

## The lesson

### 1. Validate on the server

Bring the page from lesson five, plus the lead record map from LC L07 and the consent checklist from LC L04 if you did OA04. If not, write down the fields the record needs and what the consent checkbox will say.

The shape is simple. Browser to server to database. The form sends the fields to a small server function. The function checks the data, adds the source and the consent, writes one row to Supabase, and tells the browser "ok" or "here is what went wrong."

On Vercel that server function is called an API route. You do not write it by hand. ChatGPT or Claude designs the contract with the prompt below, then writes the route from it, and you check the result against the contract.

The browser check from lesson five is for the visitor's convenience. It is not security, because anyone can skip the page and send whatever they want straight to your server. So the server checks everything again, and the server gets to say no.

Ask for the rules in plain terms. Required fields present. Phone looks like a phone number. Email looks like an email. Text fields have a maximum length so nobody sends a novel. Unknown fields ignored. If anything fails, the server rejects the request, says which field, and saves nothing.

Then the mapping, form field to record column. "Tell us about the job" goes to "message." Status and timestamp are set by the server, never by the form. Nobody can submit a lead already marked "won."

Now the part that keeps you safe. The server function needs a key to write to Supabase. That key is stored as an environment variable in the Vercel project settings, and the function reads it at run time. It never goes in the page. It never goes in GitHub. If you ever see a database key in your page code or a committed file, treat it as leaked and generate a new one in Supabase.

In Supabase, turn on Row Level Security for the leads table so the public key the browser can see cannot read or write it. The only path in is the server function. It is a toggle in the dashboard plus one policy, and the AI will write the policy if you ask.

What good looks like: a submission with no phone number comes back rejected and nothing appears in the table. The mistake is trusting the browser check and skipping the server one.

### 2. Preserve source and consent

Every row needs to remember where it came from. Page path. UTM parameters from the ad or the text link. The referrer. Which form. Without that, lesson eight has nothing to work with and you can never tell which entry point produces leads.

The browser reads this from the page address when the visitor arrives and sends it with the form. Ask for it explicitly: "Capture utm_source, utm_medium, utm_campaign, referrer, and page path from the browser and store them with the record."

Consent is the other thing the row has to remember: exactly what the visitor agreed to, in the words on the screen, and when. If the form had a checkbox for text messages, the row stores true or false, the checkbox text as it read that day, and the timestamp. If you did LC L04, the consent checklist has your wording. Have your attorney review the consent language once, then store it the same way every time.

Dedupe. Someone submits twice in five minutes, and you do not want two leads. The usual rule: the same email or phone within the last day updates the existing row and bumps a submissions count instead of inserting a new one. Say which fields count as a match.

What good looks like: every row has its source columns filled and a consent column with a timestamp. The mistake is storing "consent: yes" with no record of what they consented to.

Example: a lead from the missed-call text link shows utm_campaign "missed-call," sms_consent true, the checkbox wording, and the time. Six months later you can still show what that person agreed to.

### 3. Return a safe response

When the save works, the server tells the browser one thing: it worked. "ok: true" and maybe a short reference code. Not the whole record, not the row ID, nothing about how the database is built. The browser then shows the success state from lesson five or sends the visitor to the thank-you page.

When something fails, the server sends a plain message the visitor can act on. "Please enter a phone number." Not the database error, nothing that tells a stranger how your system works. The browser shows the error state and keeps what they typed.

Logging: one line per attempt, accepted or rejected, with the time, the outcome, and the reason, and no personal details. Vercel shows you these logs, so when someone says "I submitted your form and never heard back," you can look.

Abuse controls: a hidden honeypot field that real people never see and bots always fill in, rejected on the server. A rate limit so one address cannot submit fifty times a minute. If spam still gets through, add a challenge like Cloudflare Turnstile.

Then the notification: have the server text you through Quo or email you through Resend after the row is saved. That is a notification, not the record. If it fails, the row is still there.

Test it with two records. The good one appears in the table with source, consent, and status "new." The bad one is rejected. Screenshot both.

What good looks like: the browser only ever sees "ok" or a plain error. The mistake is a success message that shows before the save happened, or an error message that leaks how the database is set up.

## Worked example

Lone Pine Fence Company in Henderson is a fictional example, the same quote form built in lesson five. Fields: name, phone, email, address, fence length, message, and a checkbox that reads "Text me about my quote." Destination: a "leads" table in Supabase, with a text to the owner when a lead lands.

The owner ran the lesson prompt:

"Design the server-side intake for this form: name, phone, email, address, fence length, message, sms consent checkbox, destination Supabase leads table with owner text notification. Return validation rules, field mapping, consent capture, dedupe approach, record status, success response, error response, logging, and abuse controls."

Example output:

```text
Validation: name 2 to 80 characters, valid US phone, email optional but valid if present, message max 1,000 characters, unknown fields dropped.
Mapping: form fields to columns, plus server-set created_at, status "new," source_form "quote."
Consent: sms_consent true or false, sms_consent_text stored verbatim, sms_consent_at timestamp.
Dedupe: match on phone within 24 hours, update the row and increment submission_count.
Success: ok true and a short reference code. Error: field name and a plain message only.
Logging: one line per attempt, no personal details. Abuse: honeypot field, rate limit 5 per 10 minutes per address.
Secrets: Supabase service key read from a Vercel environment variable, never in the page.
```

Review against the pass standard. Does the server reject invalid data? We sent a submission with no phone and got back "Please enter a phone number," and the table did not change. Does it store consent and source? The good test row shows sms_consent true, the checkbox text, a timestamp, utm_source "meta," and the page path. Secrets in the browser? We viewed the page source and searched for "supabase" and "key." Nothing. It passes.

The one revision: the first version of the route returned the full saved row to the browser, including the internal ID and the owner's notification phone number. We trimmed the response to "ok" and a reference code. Nothing the visitor does not need leaves the server now.

## Exact working prompt

```text
Design the server-side intake for this form: [fields and destination]. Return validation rules, field mapping, consent capture, dedupe approach, record status, success response, error response, logging, and abuse controls.
```

## Guided practice

1. Write your field list, your consent checkbox text, and the name of the Supabase table.
2. Run the prompt and read the contract it returns, line by line, against your lead record map.
3. Ask ChatGPT or Claude to write the API route from that contract, with the key read from an environment variable.
4. Add the key in Vercel project settings, turn on Row Level Security in Supabase, and deploy.
5. Submit one bad record and one good record, and screenshot the table and the logs.

## Assignment and evidence

Document the full form-to-record contract and run two test records.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

The server rejects invalid data, stores consent and source, and never exposes secrets to the browser.

## Common mistakes

- Writing to the database straight from the page. Fix: browser to server to database, always.
- A key in the page code or in GitHub. Fix: environment variable in Vercel, and replace any key that was ever exposed.
- Consent stored as a yes with no wording or timestamp. Fix: store the exact text and the time.
- No source columns. Fix: capture UTM, referrer, and page path with every submission.
- Returning the whole record to the browser. Fix: "ok" and a reference code, nothing more.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Browser to server to database flow.
**Screen recording:** Show the Vercel environment variable screen with the key hidden and the empty Supabase leads table, then submit a bad record and a good record from a phone and watch one row appear with source and consent filled while the Vercel log shows both attempts.
**Course map:** the course visual below anchors where this lesson sits.

![The Website Conversion System course visual](/images/academy/website-conversion-system.svg)

## Downloadable

[Open the Website Conversion System workbook](/downloads/operator-academy/website-conversion-system-workbook.pdf)

Workbook section: OA06 Website Workbook, Form-to-record map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

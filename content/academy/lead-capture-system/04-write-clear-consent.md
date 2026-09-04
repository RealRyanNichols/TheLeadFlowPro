# LC L04: Write Clear Consent

## What you will finish

Separate requested access from optional marketing email, calls, and text consent. When you are done you will have a form with a plain delivery statement, two unchecked optional boxes, and a privacy link, plus a screenshot of it saved with your evidence.

## Why this matters

Here is the mistake I see on almost every small business form. One checkbox, already checked, that says "I agree to receive communications." Sometimes there is no box at all, just a phone field, and the owner starts texting people the next day.

That is a problem for two reasons. First, those people did not agree to anything. They wanted a checklist. A text about a spring special feels like a stranger walking into their kitchen. Second, texting people who did not clearly opt in is exactly the kind of thing that gets a business number blocked by the carriers and gets owners into trouble they did not see coming.

The practice is simple. Delivering the thing they asked for is one transaction. Marketing to them later is a separate decision they make, and they make it by checking an empty box.

This comes right after the field audit because the form is now settled. We know we ask for name, email, phone, and up to three questions. Now we say, in plain words, what happens to each of those.

## The lesson

### 1. Describe the immediate transaction

The immediate transaction is: you give me an email, I send you the thing. Say exactly that, right at the form. "Enter your email and we will send the Ten-Minute Truck Paint Check to it."

That sentence does a lot of work. It tells the buyer what the email field is for. It sets the expectation that one email is coming. It makes clear that the delivery email is part of what they asked for, not marketing.

If you ask for a phone number, the same rule applies. Say what it is for in the transaction. "Phone, optional: only if you want us to text you the download link instead." If the phone has no job in the transaction, it should be optional, and it needs its own consent box before you ever call or text it for anything else.

What good looks like: the buyer can tell, without reading fine print, what will land in their inbox in the next sixty seconds. The mistake people make: leaving delivery unsaid, then burying it in a paragraph of legal text that also covers marketing. Keep the transaction sentence short and by itself.

Example: the welding academy's form button said "Submit." Now it says "Send me the fit check," and under the email field it says "We will email your results to this address."

### 2. Use unchecked optional consent

Now two boxes. Both empty by default. Both optional. Access to the lead magnet does not depend on either one.

Box one is marketing email. "Yes, send me occasional tips and offers from [business] by email. Unsubscribe any time."

Box two is calls and texts. "Yes, [business] may call or text me at this number about its services. Message frequency varies. Message and data rates may apply. Reply STOP to stop and HELP for help." Some form tools let you split this into a call box and a text box. That is fine, and often cleaner.

Three rules. The boxes start unchecked, every time, on every device. The submit button works whether they are checked or not. A phone number typed into the phone field is not a yes to box two. If box two is empty, that number gets used for the transaction you described in step one and nothing else.

Even when the box is checked, my house rule is that a human sends the text, from the business line in Quo, inside business hours. Automation sends email. That keeps the personal channel personal.

Here is why this matters on the practical side. A list of people who checked the box on purpose is small and responds. A list of people who did not know they were on a list is large and complains. You want the small list.

What good looks like: two plain boxes, empty, under the fields and above the button, each one readable in one breath. The mistake people make: the form builder's default is a pre-checked box, and nobody notices for a year. Check your builder's default and change it.

Example: a roofer in Tyler collected 300 phone numbers through a "free hail inspection" form with no text consent box, then sent one blast text. Dozens of replies said "who is this." He rebuilt the form with the two boxes. The next list was a third the size, and it answered.

### 3. Link privacy information

Under the boxes, one line with a link: "See our privacy policy for how we store and use your information." If you have a terms page, link that too. Keep it to one line.

This is not decoration. The privacy policy is where you say how long you keep records and how someone gets removed. Lesson seven gives you a lead record with consent timestamps and a retention limit, and your privacy page should match what that record actually does. Write what you do, do what you wrote.

Then put an unsubscribe statement wherever it fits. In the email box text, "unsubscribe any time." In the SMS box text, "Reply STOP to stop." On the thank-you page, one line on how to be removed. When someone opts out, it has to work the same day, and it has to land on their lead record.

What good looks like: the form, the privacy page, and the lead record all tell the same story. The mistake people make: a privacy policy copied from a template that talks about cookies on a website the business does not have.

Example: the Kilgore school's privacy page said nothing about text messages. They added one paragraph: what they text, how often, and how to stop. The form links to it.

Now run the prompt with your lead magnet name filled in. It returns the delivery statement, the email box, the call and text box, frequency and rates language, an unsubscribe line, and a short list of items flagged for counsel. Paste the wording into your form. I am not your attorney. Have your attorney review the wording once, then move on.

## Worked example

Rose City Roofing in Tyler is a fictional example. Three crews, an office manager, storm season is the whole year. They give away the "Hail Season Roof Check," a one-page walk-around checklist. The form has name, email, phone (optional), and one question: roof age, best guess. The old form had a single pre-checked box.

The owner ran the lesson prompt with the bracket filled in:

"Draft plain-language form disclosures for access to the Hail Season Roof Check. Include the immediate delivery statement, optional marketing email consent, optional call and SMS consent, message frequency and rates language where relevant, and an unsubscribe statement. Do not give legal advice; flag items for counsel review."

Example output:

```text
Delivery statement: "Enter your email and we will send the Hail Season Roof Check to it right away."
Phone helper text: "Optional. Only used to text you the link if you prefer that."
Email consent (unchecked): "Yes, send me occasional roofing tips and offers from Rose City Roofing by email. Unsubscribe any time."
Call and text consent (unchecked): "Yes, Rose City Roofing may call or text me at this number about its services. Message frequency varies. Message and data rates may apply. Reply STOP to stop, HELP for help."
Privacy line: "See our privacy policy for how we store and use your information."
Flag for counsel: confirm the SMS wording, the frequency statement, and whether a separate terms link is needed.
```

Review against the pass standard. Is access conditioned on promotional consent? No. The button sends the checklist with both boxes empty. Does phone collection silently equal SMS consent? No. The phone field has its own helper text, and any text beyond the download link needs the second box.

The one revision that made it better: the form builder had the phone field marked required, left over from the old form. The owner made it optional, because the transaction only needs email. Then she took the screenshot for her evidence folder.

## Exact working prompt

```text
Draft plain-language form disclosures for access to [lead magnet]. Include the immediate delivery statement, optional marketing email consent, optional call and SMS consent, message frequency and rates language where relevant, and an unsubscribe statement. Do not give legal advice; flag items for counsel review.
```

## Guided practice

1. Write the one-sentence delivery statement and put it at the top of your form.
2. Run the exact prompt with your lead magnet name filled in.
3. Add two separate consent boxes, marketing email and calls and texts, and confirm both start unchecked on desktop and on your phone.
4. Submit the form with both boxes empty and confirm the lead magnet still arrives.
5. Add the privacy link, send the flagged items out for review, and save a screenshot of the finished form.

## Assignment and evidence

Add separate consent controls and save a screenshot of the final form.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Access is not conditioned on optional promotional consent, and phone collection does not silently equal SMS consent.

## Common mistakes

- A pre-checked consent box. Fix: find the default in your form builder and set it to unchecked.
- One box that covers email, calls, and texts. Fix: separate boxes, each optional.
- Treating a typed phone number as permission to text. Fix: the phone field gets a purpose line, and marketing texts need the box.
- Requiring the box to get the download. Fix: the submit button works with both boxes empty.
- A privacy page that never mentions texting. Fix: add what you send, how often, and how to stop.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Access versus marketing consent split.
**Screen recording:** The Rose City form in the editor, the pre-checked box being switched to unchecked, the two consent boxes and privacy line added, then a test submission with both boxes empty and the delivery email arriving.
**Course map:** the course visual below anchors where this lesson sits.

![The Lead Capture System course visual](/images/academy/lead-capture-system.svg)

## Downloadable

[Open the Lead Capture System workbook](/downloads/operator-academy/lead-capture-system-workbook.pdf)

Workbook section: OA04 Lead Capture Workbook, Consent checklist.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

# LC L03: Ask for the Right Data

## What you will finish

Collect only the contact and qualification fields the next action truly needs. When you are done you will have a final field list for your form, with a written reason next to every field, and nothing on it you cannot explain to the person filling it out.

## Why this matters

Every field on a form is a small tax on the person filling it out. Ask for ten things and a lot of people quit at field six. Ask for the wrong things and the people who finish are annoyed before you ever talk to them.

Here is the scene. A trade school in Kilgore had a "request info" form with fourteen fields. Date of birth. Social Security number, because the financial aid office wanted it "for later." Current employer. Household income. It was a lead form that looked like a loan application. The director wondered why the ad clicks were not turning into calls.

There is a second cost people forget. Everything you collect, you have to protect. A spreadsheet with birthdates and Social Security numbers in it is a liability sitting in your Google Drive. You do not want that data. You want a name, a way to reach them, and enough context to know what to do next.

This comes before the consent lesson because you cannot write clear consent for fields you have not decided on. Settle the list first. Then we write the words around it.

## The lesson

### 1. Separate required from optional

Start with what you have. If you already have a form, paste every field into the prompt. If you do not, write the list you were planning to ask for. Be honest. Put down the fields you were going to add "just in case."

Now sort every field into three buckets. Required: the next action cannot happen without it. Optional: it helps, but the next action can happen without it. Remove: nobody downstream uses it.

The next action is the test. For a lead magnet, the next action is delivery plus one follow-up. Delivery needs an email address. Follow-up needs a name so you do not write "Hi there." That is two required fields. Phone is required only if your next action is a call or a text, and we handle what that means in lesson four.

What good looks like: two or three required fields, up to three optional qualification fields, and a remove list that is longer than you expected. The mistake people make: marking everything required because "we might need it." Might is not a next action.

Example: a bookkeeping consultant in Longview had "company website" as a required field. Nobody on her team ever opened a single one. Removed. More people finished the form, and nothing downstream broke.

### 2. Explain why data is requested

For every field you keep, write one sentence that says what you will do with it. Not for the lawyer. For you, and for the buyer.

"Email: so we can send you the checklist." "Name: so the follow-up email is addressed to you." "What are you working on: so we send the right example instead of a generic one." If you cannot write that sentence, the field goes to the remove bucket.

Then put a short version of that sentence on the form itself, as helper text under the field. People fill out forms faster when they know why you are asking. It also keeps you honest. If the helper text would be embarrassing to print, you should not be asking.

What good looks like: every field has a purpose written in your notes and a plain reason visible on the form. The mistake people make: writing the reason as marketing. "So we can serve you better" is not a reason. "So we can text you the quote" is a reason.

Example: a roofer's form asked for street address. The written reason was "so we can look at the roof on satellite before the visit." That is a real reason, and it went under the field. Nobody balked, because now the ask made sense.

### 3. Minimize sensitive collection

Some things do not belong on a lead form. Ever. Date of birth. Social Security number. Driver's license or any government ID. Bank or card details. Health conditions or medications. Income. Anything about race, religion, disability, or family status. If a real part of your business needs one of those later, like a school that needs a birthdate at enrollment, collect it at that step, inside a secure system built for it, not on the form that hands out a free checklist.

Here is the line I use: collect what the next action needs, and not one field more. The less you hold, the less you can lose.

Watch the free-text fields too. A big "tell us anything" box invites people to type their medical history or their neighbor's name. If you keep a notes box, make it short and label it: "Anything about the job we should know?"

And keep the door open. Access to the free thing never depends on the buyer agreeing to marketing. The form gets separate, optional boxes for that in lesson four. Today, make sure the required list is only what delivery and one follow-up truly need.

What good looks like: a form a stranger would fill out without hesitating. The mistake people make: copying a competitor's form, sensitive fields and all, because it looked professional.

Example: the Kilgore trade school moved date of birth and Social Security number to the enrollment packet, dropped income entirely, and kept "when do you want to start" with three choices. Fourteen fields became six.

Now run the prompt with your fields pasted in. You get a label on every field, the business need, the privacy risk, the effect on completion, and a shorter recommended form. Compare it against your own three buckets. Where they disagree, the field is usually optional, and you already knew it.

## Worked example

East Texas Welding Academy in Kilgore is a fictional example. Twelve-week night program, one director who also teaches. The lead magnet from lesson two is a diagnostic: "Is a welding program right for me? A ten-question fit check." The director pasted the school's existing fourteen-field form into the lesson prompt:

"Audit this lead form: full name, email, phone, date of birth, Social Security number, street address, city, current employer, household income, highest grade completed, when do you want to start, have you welded before, day or night classes, how did you hear about us. For every field, label required, optional, or remove. Explain the business need, privacy risk, and effect on conversion. Then return a shorter recommended form."

Example output:

```text
Full name: required. Needed to address follow-up. Low risk.
Email: required. Delivers the fit check. Low risk.
Phone: optional. Only needed if the applicant wants a call. Moderate risk, state its use.
Date of birth: remove. Not needed before enrollment. High risk. Collect at enrollment.
Social Security number: remove. Never on a lead form. Severe risk.
Household income: remove. Financial aid step only. High risk, hurts completion.
Current employer: remove. No downstream use. Hurts completion.
Recommended form: name, email, phone (optional), when do you want to start, have you welded before, day or night classes.
```

Review against the pass standard. Every field on the recommended form has a documented purpose: delivery, follow-up, or routing. Is consent separate from access? Not yet. The old form had one pre-checked box that said "I agree to be contacted." That fails, and lesson four fixes it.

The one revision that made it better: the director changed "have you welded before" from a free-text box to three choices, never, some, and on the job. Now the answer can route a lead in lesson six instead of sitting in a text field nobody reads.

## Exact working prompt

```text
Audit this lead form: [paste fields]. For every field, label required, optional, or remove. Explain the business need, privacy risk, and effect on conversion. Then return a shorter recommended form.
```

## Guided practice

1. Write down every field on your current or planned form, including the ones you were adding "just in case."
2. Sort each one into required, optional, or remove, using the next action as the test.
3. Run the exact prompt with your fields pasted in and compare its labels to yours.
4. Write one plain sentence of purpose for each field you keep, and put a short version under the field on the form.
5. Move any sensitive field to the step that truly needs it, or remove it.

## Assignment and evidence

Finalize a form with name, email, phone, and no more than three relevant qualification fields.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Every field has a documented purpose and consent is separate from access.

## Common mistakes

- Marking every field required. Fix: required means the next action cannot happen without it.
- Asking for sensitive data on a lead form. Fix: move it to the secure step that needs it, or drop it.
- No reason next to the field. Fix: one plain sentence of purpose, on the form, under the field.
- One big free-text box. Fix: a short, labeled box about the job, or none at all.
- Copying a competitor's form. Fix: build yours from your own next action.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Data minimization funnel.
**Screen recording:** The fourteen-field form on screen, the prompt output labeling each field, then the six-field version being built in the form editor with helper text typed under each field.
**Course map:** the course visual below anchors where this lesson sits.

![The Lead Capture System course visual](/images/academy/lead-capture-system.svg)

## Downloadable

[Open the Lead Capture System workbook](/downloads/operator-academy/lead-capture-system-workbook.pdf)

Workbook section: OA04 Lead Capture Workbook, Field audit.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

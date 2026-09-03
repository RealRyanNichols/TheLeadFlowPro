# WC L01: Give Each Page One Job

## What you will finish

Define the visitor, question, action, and success event for every important page. When you are done you will have a one-page brief for each page that matters, and anyone who touches your site can read it and know exactly what that page is supposed to make happen.

## Why this matters

Most small business websites are a pile of pages that all try to do everything. The homepage has the phone number, a contact form, a newsletter box, three service blurbs, a Facebook feed, and a map. A visitor lands, looks for ten seconds, and leaves, because nothing told them what to do.

Here is the scene. A roofer in Longview pays for Facebook ads that send people to his homepage. The ad said "free storm damage inspection." The homepage says "Quality Roofing Since 2009" and shows a slideshow. The visitor came with one question, "how do I get the inspection," and the page never answers it. The ad money is gone and the roofer decides ads do not work.

A page with one job fixes that. One visitor type, one question, one action, one way to know it worked. When every important page has a job, you can measure the site instead of guessing about it.

This lesson comes first because everything after it depends on it. The site path in lesson two, the wireframe in lesson three, the copy in lesson four, and the events you track in lesson eight all come out of these briefs. Get the job right and the rest of the build gets easier.

## The lesson

Three steps. Name where the visitor comes from, decide the one question the page answers, and pick the one event that counts as success. You write those into a page-job brief, one per page.

If you finished OA03 The Offer Engine, bring the offer page wireframe from OE L07. If you finished OA04 The Lead Capture System, bring the thank-you wireframe from LC L05 and the lead record map from LC L07. If you did not, you can still do this lesson. You just need to know who you sell to and what you want them to do.

### 1. Name the traffic source

Every page gets visitors from somewhere specific. Your homepage gets people who typed your name into Google after a referral, or who tapped your Google Business Profile. Your offer page gets people from an ad, an email, or a text you sent. Your thank-you page gets exactly one kind of visitor: someone who just filled out the form.

Write down where each page's visitors actually come from. Not where you wish they came from. Open Google Analytics, Vercel Analytics, or your Google Business Profile insights and look. If you have no data yet, write down where you plan to send them, and label it as a plan.

The source tells you what the visitor already knows. Someone who came from a referral already trusts you a little and wants to confirm you are real. Someone who clicked an ad for a specific offer wants that offer, not a tour of your company.

What good looks like: "Visitors arrive from the Meta ad for the $99 drain special and from the text we send after a missed call." That is a source. "Everyone" is not a source.

The mistake I see most is writing the homepage brief for everyone. Nobody is everyone. Pick the most valuable visitor who actually lands there and write for that person.

### 2. Answer one primary question

A visitor lands on a page with a question in their head. The page's job is to answer that question well enough that the next action feels obvious.

For a service page, the question is usually "can these people fix my problem, and what happens if I reach out?" For an offer page, "is this worth the price, and is it for someone like me?" For a thank-you page, "did that work, and what happens now?"

Pick one primary question per page. Then list the proof that question needs. A homeowner asking "can I trust this plumber in my house" needs a real photo of the crew, a license number, and a couple of real reviews. A gym visitor asking "will I fit in" needs pictures of regular people, not competitors.

Once you know the question, you know what does not belong. If the page answers "how do I get a quote," your company history does not belong on it. Put it on the about page. Cutting is where most of the improvement comes from.

Say it out loud. "This page answers the question: how do I get my water heater replaced this week." If you cannot say it in one sentence, the page has two jobs. Split it.

### 3. Choose one success event

A success event is the thing that happens when the page did its job. It has to be something you can count. Form submitted. Call button tapped. Checkout completed. Booking confirmed. Thank-you page viewed.

Pick one main action and one success event for each page. Then pick one secondary action for the visitor who is not ready. "Call now" is the main action, "text us a photo" is the secondary action. The secondary action is a softer step, not a second button of equal weight fighting for attention.

The event is what you will measure in lesson eight, so it needs to be a real event a tool can record. "Visitor felt confident" is not an event. "Visitor tapped the call button" is. Google Analytics, Vercel Analytics, or your own leads table can count taps and submits once you tell them to.

If your main action is a call, know what a missed one costs you. The free missed-call calculator at /tools/missed-call-calculator does that math.

Now write the brief. Target visitor, arrival source, primary question, proof needed, main action, secondary action, success event, and what does not belong on the page. Eight lines. That is the whole brief.

Do the homepage, the offer page, and the thank-you page first. The thank-you page is the one people skip. Its job is to confirm the request and hand the visitor one next step, like "we will text you within one business hour, here is what to have ready." Its success event is usually a view of the page itself, or a tap on a booking link.

What good looks like: three briefs, each with one main action and one event you can count. The mistake is listing three main actions because you are afraid of losing someone. One action. The secondary action catches the rest.

## Worked example

Example business: Cypress Creek Plumbing in Marshall. The owner runs two trucks. He has a homepage, a water heater page, and a contact form that emails him. He is about to run a Meta ad for same-week water heater replacement.

Input: the ad copy, the current water heater page, and a note that most calls come from Google Business Profile and Facebook.

Prompt used: the exact working prompt below, with [page] replaced by "the water heater replacement page for Cypress Creek Plumbing in Marshall, arriving from a Meta ad for same-week replacement."

Example output:

- Target visitor: homeowner in Harrison County with a failed or leaking water heater who needs it fixed in days, not weeks.
- Arrival source: Meta ad promising same-week replacement, plus Google Business Profile.
- Primary question: can you replace mine this week, and what will it cost?
- Proof needed: photo of the crew and truck, license number, two recent reviews that mention speed, a plain price range.
- Main action: tap to call. Secondary action: text a photo of your unit for a quote.
- Success event: call button tapped or photo-quote form submitted.
- Does not belong: company history, full service list, blog links, newsletter signup.

Review against the pass standard: one primary action, yes. A measurable definition of success, yes, since call taps and form submits both count in analytics. It passes.

The one revision that made it better: the first draft listed the main action as "call or fill out the form." Two actions with equal weight. We made the call the main action because the owner answers his phone on the truck, and the photo form became the secondary action for after hours. Then we added one line to the brief: "after hours, the form becomes the main action." That one change told the copy and the layout exactly what to do.

## Exact working prompt

```text
Create a page-job brief for [page]. Include target visitor, arrival source, primary question, proof needed, main action, secondary action, success event, and what does not belong on the page.
```

## Guided practice

1. List every page on your site and cross out the ones that get no visitors or serve no job.
2. Pick the homepage, your main offer page, and the thank-you page.
3. Run the prompt for each, filling in [page] with the page name, the business, and the arrival source.
4. Cut every brief to one main action and one countable success event.
5. Write the "does not belong" line for each page and be honest about what has to move.

## Assignment and evidence

Complete page-job briefs for the homepage, offer page, and thank-you page.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Each page has one primary action and a measurable definition of success.

## Common mistakes

- Writing the homepage for "everyone." Fix: write it for the most valuable visitor who actually lands there.
- Two main actions with equal weight. Fix: one main action, one softer secondary action.
- A success event you cannot count, like "feels confident." Fix: pick a tap, a submit, a booking, or a page view.
- Skipping the thank-you page brief. Fix: give it a job, confirm the request and hand off one next step.
- Keeping everything on the page just in case. Fix: the "does not belong" line is a real list, so move that content elsewhere.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Page to event map.
**Screen recording:** Open a cluttered homepage mockup next to a blank page-job brief, run the prompt in ChatGPT, and fill in the eight lines on screen while crossing out what does not belong.
**Course map:** the course visual below anchors where this lesson sits.

![The Website Conversion System course visual](/images/academy/website-conversion-system.svg)

## Downloadable

[Open the Website Conversion System workbook](/downloads/operator-academy/website-conversion-system-workbook.pdf)

Workbook section: OA06 Website Workbook, Page-job brief.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

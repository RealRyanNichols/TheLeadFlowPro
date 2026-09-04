# WC L07: Test Speed, Accessibility, and Trust

## What you will finish

Catch slow media, broken layouts, inaccessible controls, missing disclosures, and unclear claims. When you are done you will have a completed launch QA checklist with a screenshot or a note for every item, pass or fail, and a page you would put your name on.

## Why this matters

Everything up to now happened on your phone and your laptop, on your Wi-Fi, with you knowing how the page is supposed to work. A visitor has none of that. She is on a three-year-old Android, on one bar of signal, in a truck, with her thumb. If the page takes eight seconds to load a hero photo straight off a camera, she is gone before the headline shows.

Here is the scene. A caterer in Marshall launches a good-looking site. The inquiry form works on the owner's iPhone. On Android, the date picker does not open, so nobody can choose an event date, so nobody can submit. The site runs for three weeks like that. The owner decides nobody wants catering in September.

QA is boring and it is where the money is. A broken page makes a good offer invisible. One pass through a checklist before launch catches the things you cannot see from your own chair.

This is also where trust gets checked. Every claim on the page has to match its source. Every disclosure, privacy policy, terms, consent wording, has to be there and reachable. You wrote honest copy in lesson four. This lesson proves it.

## The lesson

### 1. Test real devices

Bring the page from lessons five and six on its Vercel preview link, and the proof notes from lesson four. You will produce a QA plan with the prompt, then run it and record evidence.

Start with what you have. Your phone. A family member's phone on the other platform. If you are on iPhone, borrow an Android. A laptop. That is three devices and it catches most of what matters.

On each one, walk the main path from lesson two. Open the entry link. Read the first screen. Scroll. Tap the main button. Fill out the form badly, then correctly. Land on the thank-you page. At each step ask: does it fit, can I read it, can I tap it, did it do what it said?

Then the breakpoints, which just means widths. Narrow phone, wide phone, tablet, laptop. On the laptop, drag the browser window narrower and wider and watch for anything that overlaps, gets cut off, or jumps. Turn the phone sideways once.

Browsers: Safari on the iPhone, Chrome on the Android, Chrome and one other on the laptop. Forms and date pickers are where browsers disagree most, so test the form on every one.

Keyboard: on the laptop, click into the page and use only Tab, Shift plus Tab, Enter, and Space to get through the whole form and submit it. If you get stuck or lose track of where you are, that is a fail.

What good looks like: the main path works on all three devices with no surprises, and you have a screenshot from each. The mistake is testing only on your own phone, which is the one device where you already know it works.

### 2. Run automated checks

Free tools catch what your eyes miss. Two are enough.

Google PageSpeed Insights. Paste the page address. It scores speed and flags the biggest problems: oversized images, slow fonts, scripts that block the page. You do not need a perfect score. You need the page to load fast on a phone and the report to point at anything huge. If it names an image, that image is too big. Ask ChatGPT or Claude how to resize and compress it, or ask for the page to use a smaller version.

Lighthouse, built into Chrome. Right-click the page, choose Inspect, find the Lighthouse tab, run it for mobile. It scores accessibility too, and it will tell you about missing labels, low contrast text, images with no description, and buttons with no name. Every one of those is a visitor who cannot use your page.

Contrast means the text is dark enough against its background to read in sunlight. Light gray on white fails. If Lighthouse flags contrast, fix the colors. Do not argue with it.

Images: every real photo has a short description in the code, called alt text, for people using screen readers and for when the image fails to load. Decorative images are marked as decorative. Ask the AI to add descriptions and give it the list of photos.

Metadata: the page has a title that says what it is, a description for search results, and a preview image, so when someone texts the link it shows a card instead of a blank box. Text the link to yourself and look at the preview.

Analytics: the success event from lesson one fires when it should. Submit a test form, then open Vercel Analytics or Google Analytics and find the event. If it is not there, it is not being counted, and lesson eight will have nothing to read.

What good looks like: PageSpeed and Lighthouse run on mobile with no red items on the main path, and the success event shows up in analytics. The mistake is chasing a perfect score. Fix the red, fix anything touching the form, ship.

Example: Lighthouse flags the phone field as having no label. The label was there, but the AI had hidden it to look cleaner. Fix: make the label visible again. Cleaner is not the goal. Usable is.

### 3. Review claims and disclosures manually

No tool checks whether your page is telling the truth. You do.

Read the page on a screen with the proof notes next to it. Every number, every claim, every "licensed," every "since 2011," every review quote. Put your finger on the claim, then put your finger on the source. Review count matches the Google profile today. License number matches the state lookup. The photo of "our crew" is your crew. If a claim has no source, it comes off the page before launch, not after.

Disclosures. A privacy policy link in the footer that goes to a real page describing what you collect and what you do with it. Terms if you sell anything on the site. The consent wording next to the checkbox, matching what the server stores from lesson six. If any of that is unclear for your business, have your attorney review it once, then keep it consistent.

Then the rollback plan. Things break after launch. On Vercel, every deployment stays in the list, and you can put the previous one back live in a couple of clicks. Know where that button is before you need it. In GitHub, the old version of the code is still there too. Write one line in the QA plan: "If the site breaks, roll back to the previous Vercel deployment, then fix in a branch."

Record everything. Item, pass or fail, and the evidence: a screenshot, a score, a note. Failed items get fixed and retested, and the retest gets recorded too. The workbook checklist has the rows.

What good looks like: a list where every item has evidence and every fail has a fix noted. The mistake is a checklist with checkmarks and no evidence. A checkmark with no screenshot is a guess.

## Worked example

Caddo Lake Catering in Marshall is a fictional example. One-page site for event catering with an inquiry form: name, phone, email, event date, guest count, message. Built in lessons five and six, on a Vercel preview. Proof notes: a real review count of 37, a health permit number, six real event photos. Devices: the owner's iPhone, her son's Android, a laptop.

She ran the lesson prompt:

"Create a prelaunch website QA plan for the Caddo Lake Catering one-page site with an inquiry form. Include mobile breakpoints, browsers, keyboard, contrast, forms, images, metadata, performance, privacy, terms, claim verification, analytics, and rollback."

Example output:

```text
Devices: iPhone Safari, Android Chrome, laptop Chrome and Firefox. Walk the main path on each, screenshot each step.
Keyboard: Tab through the full form, submit with Enter, confirm visible focus on every control.
Contrast and labels: Lighthouse mobile accessibility, fix every red item.
Forms: date field opens on both phones, guest count shows a number keyboard, error and success states visible.
Images: six photos under 200 KB each with alt text, hero under 150 KB.
Metadata: title, description, preview image, tested by texting the link.
Claims: review count checked against Google today, permit number checked, photos confirmed as own events.
Privacy policy and consent wording present and matching the server. Analytics event fires on submit. Rollback: previous Vercel deployment.
```

Review against the pass standard. Do critical paths work on mobile and keyboard? The date field failed on Android, the same bug from the scene above. We had the AI replace the custom date picker with the plain browser date input, retested on both phones, pass. Do pages load acceptably? The hero photo was 4.1 MB. Resized to 140 KB, and the PageSpeed image item went from red to green on mobile. Do public claims match their sources? The page said "over 40 reviews." Google showed 37. Changed to 37. Everything else passed with screenshots attached.

The one revision: replacing the custom date picker. It looked nicer. It did not work on half the phones in Harrison County. Plain and working beats pretty and broken.

## Exact working prompt

```text
Create a prelaunch website QA plan for [site]. Include mobile breakpoints, browsers, keyboard, contrast, forms, images, metadata, performance, privacy, terms, claim verification, analytics, and rollback.
```

## Guided practice

1. Run the prompt for your site and paste the plan into the workbook checklist.
2. Walk the main path on your phone, a borrowed phone on the other platform, and a laptop, with screenshots.
3. Run PageSpeed Insights and Lighthouse on mobile and fix every red item touching the form or the first screen.
4. Check every claim on the page against its source and remove anything you cannot point at.
5. Find the rollback button in Vercel and write the rollback line into your plan.

## Assignment and evidence

Run the checklist and record evidence for every failed and passed item.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Critical paths work on mobile and keyboard, pages load acceptably, and public claims match their sources.

## Common mistakes

- Testing only on your own phone. Fix: borrow one on the other platform and test the form there first.
- Photos straight off the camera. Fix: resize and compress every image before it goes on the page.
- Checkmarks with no evidence. Fix: a screenshot, a score, or a note for every row.
- Claims that drifted from the source. Fix: check the number today and use the exact number.
- No rollback plan. Fix: know where the previous deployment is in Vercel before launch.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Website quality scorecard.
**Screen recording:** Run PageSpeed Insights and Lighthouse on the preview link, show a red image item and the fix, then hold an Android phone up to the camera and tap through the form while checking the claims list against the live Google review count.
**Course map:** the course visual below anchors where this lesson sits.

![The Website Conversion System course visual](/images/academy/website-conversion-system.svg)

## Downloadable

[Open the Website Conversion System workbook](/downloads/operator-academy/website-conversion-system-workbook.pdf)

Workbook section: OA06 Website Workbook, Launch QA.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

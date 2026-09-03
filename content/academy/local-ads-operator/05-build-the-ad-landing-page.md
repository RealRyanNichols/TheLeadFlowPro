# AD L05: Build the Ad Landing Page

## What you will finish

Match the ad promise to a fast page with one action and clear evidence. When you are done you will have a page, or the instant form screens that stand in for one, where the headline, the price, the first question, and the thank-you all say what the ad said, and a message-match audit that proves it line by line.

## Why this matters

Seventy one people clicked my ad. Zero filled out the form. The ad was fine. It pulled a 5.7 percent click rate at 68 cents a click, which is a good ad by any read. The break was after the click.

The ad said: tell me what you are running and I will tell you the first thing I would fix. The form's first and only required question was a price ladder. Which starting point fits you, with "$7,500 and up" on the screen. A stranger tapped a friendly question and got asked for a budget before anything was earned. The two questions that delivered what the ad promised were optional and came later.

That is message match, and it breaks more local campaigns than targeting ever has. A dentist in Tyler runs a $99 new patient exam ad and sends the click to a home page that says "Welcome to our practice." A roofer in Henderson promises a free inspection and the page asks for a deposit. The person came for one thing and found another, so they leave, and you paid for the visit.

On Meta I run instant form lead ads, so the form is my landing page and the site page comes after it. Everything in this lesson applies to both. Bring the angle brief from lesson three and the creative from lesson four. The page repeats what they say.

## The lesson

### 1. Repeat the message

The headline on the page is the promise from the ad, in the same words. Not a rewrite. If the ad says "quote within 24 hours," the page says "quote within 24 hours" above the fold, on a phone, before anyone scrolls. Same offer. Same price. Same boundary.

Then the first thing the page asks for is the thing the ad promised. My ad promised a look at what to fix first, so the first question should have been "where does your business leak the most?" not "what is your budget?" The budget question can come last and stay optional. Earn it.

What good looks like: you read the ad out loud, then the page headline and the first question out loud, and it sounds like one person talking.

The mistake: sending ad traffic to the home page. The home page is for everyone. The ad page is for the one person who clicked one promise.

Example: a lawn care company in Hallsville runs "first mow $35, no contract." The page headline is "First mow $35. No contract." The first form field is the address, because that is what the crew needs to say yes. Nothing about seasonal packages until after they submit.

### 2. Reduce distractions

One action. Not three buttons. No navigation bar, no footer full of links, no chat bubble bouncing in the corner. The page has one job.

Fast. On a phone, on cellular, under three seconds. Compress the images. No video that autoplays and buffers. If you build in the stack you own, a single page on Vercel does this out of the box. If you finished The Website Conversion System, you already have the page pattern from WC L03.

The sections, in order, and keep each one short: the headline, the ad's promise. The problem, in the buyer's words from the matrix. The outcome, what they get and when. Proof, real photos and reviews shown as written. Scope, what is included and what is not. The form. A consent line. Three or four FAQ answers pulled straight from the objection rows in the matrix. Limitations, plain. Then the thank-you.

The form: name, phone, one qualifying question. Every extra field costs you people. Email if you will actually use it. The consent line says plainly that you will call or text about this request, with a separate checkbox for anything marketing related, the way you built it in LC L04. Have your attorney review the wording once.

On an instant form, same rules. Intro text that matches this ad. One of my forms said "You watched the whole thing, let's build yours," and it was attached to a still picture ad. Nobody watched anything. First question is the promise. Contact fields. Then the optional questions. Meta will not let you edit a form that has collected leads, so duplicate it as version two and swap the ad over.

If you need a page and do not have a site to put it on, /free-build is where I build the first working version.

What good looks like: one thing to tap, and the page loads before the person's thumb leaves the screen.

The mistake: a form with nine fields because "we need to know." You need a name and a phone. Ask the rest on the call.

### 3. Confirm the next step

The thank-you screen is not a receipt. It is the next step.

Say what happens now, when, and from what number. "Marisol calls you from a 903 number within the hour, 7 to 7. Save this number so you know it is us." That one line raises answer rates more than anything else on the page, because people do not pick up numbers they do not recognize.

Then one soft next action. Add us to contacts. See what a replacement includes. On my own funnel, this is where I offer the lower first yes, the $197 Follow-Up Campaign at /go/lead-follow-up, instead of pushing the biggest thing I sell.

The thank-you page is also where the form success event fires, once, which is lesson six. Build the thank-you as a real page or a real screen, not a popup that disappears.

Before you call it done, sit with the ad on one phone and the page on another. Read the ad. Read the headline. Read the first question. Read the thank-you. If any of them would surprise the person who clicked, fix that one. That is the message-match audit in the workbook, one row per claim.

What good looks like: the thank-you names a person, a time window, and a phone number.

The mistake: "Thanks for submitting!" and nothing else. Or a thank-you that sends the person to a different, pricier offer than the one they clicked. Mine did that. The ad promised a free look and the completion button pushed a $297 package.

## Worked example

Rabbit Creek Plumbing in Kilgore is a fictional example. Angle 2, "nobody called me back," the walk video from lesson four. Marisol pasted the angle 2 brief, the video script, the offer from her brief, the proof files (a 30 day callback log and four Google reviews), and the office hours.

"Write an ad-specific landing page for angle 2, nobody called me back, and water heater replacement with a quote by phone within 24 hours. Include message-match headline, problem, outcome, proof, scope, form, consent, FAQ, limitations, and thank-you step. Keep one primary action."

Example output:

```text
Headline: Who called you back last time? We call back within the hour, 7 to 7.
Problem: You called at six. Nobody picked up. You called the next name.
Outcome: A real person calls you within the hour with a price. Install within three business days.
Proof: four reviews as written, callback log screenshot.
Scope: residential tank water heaters, Kilgore and 20 miles. Not commercial, not tankless.
Form: name, mobile, "What is the water heater doing right now?" Consent: we will call or text about this request.
FAQ: Is that the real price? Financing available? Do you do Overton?
Thank-you: "Got it. Marisol calls you from a 903 number within the hour, 7 to 7."
```

Review against the pass standard. Does the visitor see the same offer, language, and expectation from ad through confirmation? Nearly. The headline, first question, scope, and thank-you all match the ad. The FAQ answers "financing available" with a yes. Financing is not in the ad, and Marisol does not have a financing partner set up. That is a new expectation the page invented.

The one revision: that FAQ became "Do I pay before the work?" with "No. The price we quote on the phone is what you pay when the job is done." It answers the real objection from angle 3 of the matrix and claims nothing the business cannot deliver. The audit sheet now shows every claim on the page next to the line in the ad it came from.

## Exact working prompt

```text
Write an ad-specific landing page for [angle and offer]. Include message-match headline, problem, outcome, proof, scope, form, consent, FAQ, limitations, and thank-you step. Keep one primary action.
```

## Guided practice

1. Copy the ad's promise word for word and paste it as the page headline.
2. Write the first form question so it delivers what the ad promised, not what you want to know.
3. Run the exact prompt with the angle brief, the offer, and your proof files pasted above it.
4. Cut every link, button, and widget that is not the one action.
5. Write the thank-you with who calls, when, and from what number, then read the ad and the page aloud back to back.

## Assignment and evidence

Build or prototype the page and compare every claim to the ad.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

A visitor sees the same offer, language, and expectation from ad through confirmation.

## Common mistakes

- Sending the click to the home page. Fix: one page per angle, headline in the ad's words.
- Asking for budget first. Fix: the first question delivers the promise, budget last and optional.
- Three buttons and a nav bar. Fix: one action, nothing else clickable.
- A thank-you that pushes a different offer. Fix: same offer, plus who calls and when.
- Editing a live instant form in place. Fix: duplicate as version two and swap the ad.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Ad-to-page continuity map.
**Screen recording:** The ad on a phone beside the page on a phone, reading the headline and first question side by side, then the instant form editor dragging the promise question above the budget question.
**Course map:** the course visual below anchors where this lesson sits.

![The Local Ads Operator course visual](/images/academy/local-ads-operator.svg)

## Downloadable

[Open the Local Ads Operator workbook](/downloads/operator-academy/local-ads-operator-workbook.pdf)

Workbook section: OA08 Ads Workbook, Message-match audit.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

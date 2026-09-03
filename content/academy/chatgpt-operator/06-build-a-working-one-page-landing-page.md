# CG L06: Build a Working One Page Landing Page

## What you will finish

Use ChatGPT's working preview to build and revise a responsive one-page site with a clear offer and functional form states. When you are done you will have a one-page site you can open in a browser, tested at desktop and phone widths, with a form that shows loading, success, and error states and tells the truth about where it sends.

## Why this matters

Here is the pitch every business owner gets: "Landing pages are easy now." Then they pay a monthly fee for a page builder, drag some blocks around, and end up with a page that says four things, has a form that goes nowhere, and looks broken on a phone. The fee goes up next year.

A pressure washing company in Longview had a page like that. The form had no confirmation. People filled it out, saw nothing happen, and filled it out again, or called, or gave up. He had no idea which.

ChatGPT can build a real one-page site in its working preview. You describe the page, it writes the code, and you see the page render beside the chat. You can click the buttons. You can shrink it to phone width. You can fill out the form and watch it respond. That is a building you get to inspect before anyone walks in.

This is the second deliverable lesson. Lessons four and five gave you an image and a voice. This lesson puts an offer on one page and tests it. When you want the real thing live on your own domain, that is what /free-build is for. Here, you learn what a good page has so you can judge one.

## The lesson

### 1. Give the page one job

A landing page has one job. One offer, one action. The exact working prompt already made that decision for the practice build: a fictional company, Pine Ridge Pressure Washing in Longview, homeowners getting ready for spring, and one offer, a free driveway assessment.

Read the prompt and notice what it does. It names the audience. It names the single offer. It lists the sections in order: hero, three services, three-step process, trust section, FAQ, contact form. It names the form fields. It names every form state. It sets three colors. It requires mobile responsive and accessible. And it says the form must not claim to send anywhere unless a backend is connected.

That last line is the honesty rule, and it is the one most page builders break. A form that says "Thanks, we'll be in touch" while sending nothing is a lie to your customer. In the preview, nothing is connected, so the success message has to say so.

What good looks like: you can state the page's job in one sentence before you build it. "Get a Longview homeowner to request a free driveway assessment."

The mistake is stuffing a page with everything the business does. Five services, a gallery, a newsletter signup, a map, and a coupon. The reader does not know what to do, so they do nothing.

Example: for your own business, swap the fictional details, keep the structure, keep one offer.

### 2. Request a working responsive build

Open a new chat inside your project. Name it "Landing page build." Paste the exact working prompt. It asks for the build in the working preview, which is ChatGPT's canvas: a panel that opens beside the chat where it writes the page as a single HTML file and gives you a preview control to see it rendered.

If the code appears but the page does not, look for the preview control at the top of the canvas and switch to it. If your plan does not show a canvas, ask for the same page as one complete HTML file, copy it into a text editor, save it as index.html, and open it in your browser. Same test, one more step.

Responsive means the three services sit side by side on a wide screen and stack on a narrow one. Text stays readable without pinching. Buttons are big enough for a thumb. Accessible means the form fields have labels, the colors have enough contrast to read, and you can move through the page with the Tab key.

Read the copy it wrote. The hero should say what the offer is and who it is for in the first two lines. The trust section must be labeled as sample placeholders, not fake reviews with fake names. If it invented "Sarah M., five stars," that fails the prompt and fails your customer.

What good looks like: the page opens, it is obvious what to do, and nothing on it pretends to be real that is not.

The mistake is treating the first build as finished. It is a first draft that happens to load.

Example: a gym in Tyler runs this prompt with its own details and gets a page with a "Join now" button that scrolls nowhere. That is a test failure waiting for step three.

### 3. Test every interaction and state

Now test like a customer, not like the person who built it.

Desktop first. Scroll top to bottom. Click every button and every link. Does each one go somewhere or scroll to the form? Open the FAQ items.

Then phone width. Drag the preview narrow, or open the saved file on your phone. Do the sections stack? Is the hero text readable? Can you tap the form fields without zooming?

Then the form. Leave it empty and submit. You should see an error state that says which field is missing. Type a phone number with letters in it. Error. Fill it correctly and submit. You should see a loading state, then a success message. Read the success message. It must not claim the request was sent. "Demo form. Nothing was submitted." is honest. "We'll call you within an hour" is not, because nothing happened.

Tab through the page with the keyboard. Every field and button should get focus in order.

Write down what you found. Then make one revision, and make it evidence-based. "At phone width, the copper button text is hard to read on cream. Change the button text to the dark green." Not "make it look better." Run it, test that one thing again, and save the file with the download control on the canvas.

Save the final file, a desktop screenshot, a phone screenshot, and your test notes. That is your deliverable package.

What good looks like: you tried to break the form three ways and it told the truth every time.

The mistake is testing only the happy path. Real customers leave fields blank and type their email in the phone box. Your page has to handle that without lying.

Example: a roofer in Gilmer tests his version, finds the FAQ items do not open on his phone, and makes that his one revision.

## Worked example

Pine Ridge Pressure Washing is the fictional business written into the prompt, so the worked example uses it as is. The operator runs the prompt in a chat named "Pine Ridge landing page" inside a project set up for practice.

Example output:

```text
I built the page in the canvas as a single HTML file. Open the preview to see it rendered.
Sections: hero with the free driveway assessment offer, three services, three-step process, a trust section with three cards labeled "Sample placeholder, replace with a real review," a six-question FAQ, and the contact form.
Form: name, phone, email, service select. Empty required fields show an inline error. Submitting shows a loading state for about a second, then a success message.
Colors: deep forest green headings and buttons, warm cream background, copper accents.
Note: the form does not send anywhere. The success message says this is a demo and nothing was submitted.
```

Desktop test: everything scrolls and every button jumps to the form. Phone width: services stack correctly, but the copper text on the cream call-to-action button is faint. Form: empty submit shows "Please enter your phone number" under the right field. Bad phone shows an error. Good submit shows a spinner, then the demo message. Tab order works.

Review against the pass standard. Loads: yes. Responds to screen size: yes. Explains the fictional offer: the hero says "Free driveway assessment for Longview homeowners getting ready for spring." Labels examples: the trust cards say sample placeholder. Handles form interaction honestly: yes, the success message admits nothing was sent.

The one evidence-based revision: "The call-to-action button uses copper text on cream and is hard to read at phone width. Change the button text to deep forest green and keep everything else." Rerun, retest the button, download the file. The operator saves index.html, two screenshots, and the test notes in one folder, shares it as viewable by link, and submits.

## Exact working prompt

```text
Build a polished one-page landing page in the working preview for this fictional business: Pine Ridge Pressure Washing in Longview, Texas. Audience: homeowners preparing for spring. Offer: free driveway assessment. Include a strong hero, three services, three-step process, trust section with clearly labeled sample placeholders rather than invented reviews, FAQ, and contact form with name, phone, email, service, loading, success, and error states. Use deep forest green, warm cream, and copper. Make it mobile responsive and accessible. Do not claim the form sends anywhere unless a backend is connected.
```

## Guided practice

1. Open a new chat in your project named "Landing page build" and paste the exact working prompt as written.
2. Open the preview and scroll the whole page at desktop width, clicking every button and link.
3. Narrow the preview to phone width and check that sections stack and text stays readable.
4. Submit the form empty, with a bad phone number, and correctly, and read the success message for honesty.
5. Make one evidence-based revision, retest that one thing, and download the file with two screenshots and your notes.

## Assignment and evidence

Run the build, inspect desktop and mobile, test the form states, and make one evidence-based revision.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The page loads, responds to screen size, explains the fictional offer, labels examples, and handles form interaction honestly.

## Common mistakes

- Adding sections to the prompt until the page has five jobs. Fix: one offer, one action, and the sections listed.
- Accepting fake reviews in the trust section. Fix: every card is labeled as a sample placeholder until you have real permission.
- Testing only on a wide screen. Fix: narrow the preview and open the file on your phone.
- A success message that claims the request was sent. Fix: in a demo, say nothing was submitted.
- Asking for a general "make it better" revision. Fix: name the defect you saw, the width you saw it at, and the exact change.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Prompt to preview to test to revision loop.
**Screen recording:** Paste the prompt, open the canvas preview, scroll the rendered page, narrow it to phone width, submit the form empty and then correctly, read the demo success message, and make the button contrast revision.
**Course map:** the course visual below anchors where this lesson sits.

![The ChatGPT Operator course visual](/images/academy/chatgpt-operator.svg)

## Downloadable

[Open the ChatGPT Operator workbook](/downloads/operator-academy/chatgpt-operator-workbook.pdf)

Workbook section: OA01 ChatGPT Operator Workbook, Landing page brief and QA.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

# WC L05: Build the Interaction

## What you will finish

Create a responsive page with a working form, states, and accessible controls. When you are done you will have a real page at a preview link on Vercel, the code saved in your own GitHub account, and a form you can fill out on your phone and with a keyboard that tells the visitor when it is sending, when it worked, and what to fix when it did not.

## Why this matters

This is where the website stops being a document and becomes a thing that works. You have a brief, a path, a wireframe, and copy. Now you turn that into a page a stranger can use on a cracked phone screen in a parking lot.

Here is why the details matter. A fence company in Henderson had a good-looking page with a form. Tap Submit on an iPhone and nothing happened. No spinner, no message, nothing. So people tapped it four more times, then gave up. The form actually sent every time, five copies. The owner thought he had five hot leads and called the same person five times. That is a missing loading state, and it made him look careless.

You do not need to know how to code to get this right. You need to know what to ask for and what to check. ChatGPT or Claude writes the code, you test it the way a visitor would, the code lives in GitHub so you own it, and Vercel hosts it with a free preview link.

This lesson builds the page. Lesson six connects the form to a real record. Keep them separate on purpose. A page that looks like it saves but does not is worse than no page.

## The lesson

### 1. Start with semantic structure

Bring the wireframe from lesson three and the final copy from lesson four. Together they are the brief you paste into the prompt.

One-time setup. Make a free GitHub account. Make a free Vercel account and connect it to GitHub. When you put code in a GitHub repository, Vercel builds it and hands you a link. If you would rather have the first version built with you, /free-build is the free website build, and this lesson still applies to checking what comes back.

Semantic structure means the page is built from parts that say what they are. A header, a navigation area, a main area, sections with headings in order, a form with a real label on every field, real buttons, and a footer. Not a pile of generic boxes styled to look like those things.

Why should an owner care? Screen readers and keyboards work with a page that has real structure. Google understands real headings. And when you ask an AI to change something later, it can find the part you mean.

The prompt asks for semantic HTML and accessible labels. When the code comes back, you check it, and you do not need to read code to do that. Open the preview, click into the first field, then press the Tab key over and over. Focus should move through every field and button in order, and you should see where it is at every step. That visible outline is the "visible focus" in the prompt. If focus disappears or jumps around, tell the AI: "Focus is not visible on the email field and the submit button. Fix it."

Every field gets a label you can see, not placeholder text that vanishes when you start typing. "Phone number" above the box, and it stays there.

What good looks like: you can fill out and submit the form with the keyboard alone, and you always know where you are. The mistake: accepting the first pretty result without tabbing through it.

### 2. Design mobile first

Most of your visitors are on a phone. So the page gets designed for a phone screen first, then widened for a laptop, not the other way around.

Tell the AI that. "Mobile layout first, then a wider layout for desktop." Then open the Vercel preview on your actual phone, not a shrunken browser window. Can you read the headline without zooming? Is the main button reachable with your thumb? Does the form fit without sideways scrolling? Does the phone keyboard show numbers when you tap the phone field?

That last one is small and it matters. Ask for it: "Use the correct input types so phones show the right keyboard."

Keep the page light. No autoplaying video in the first screen. Photos sized for the web, not straight off the camera. Lesson seven measures this.

What good looks like: the whole page, top to bottom, works one-handed on your phone. The mistake is designing on a big monitor and hoping it squishes down.

Example: a plumber's page looks great on a laptop. On a phone the headline wraps to five lines and the call button sits below the first screen. Fix: shorter headline, button in the first screen, tested on the owner's own phone.

### 3. Handle loading, success, and error

A form has four states and the visitor needs to see all of them. Idle, before they do anything. Loading, after they tap Submit and before the server answers. Success, when it worked. Error, when something went wrong.

Loading: the button changes to "Sending..." and cannot be tapped again. That alone would have saved the fence company five duplicate leads.

Success: the form is replaced by a clear message. "Got it. We will text you within one business hour." Plus the one next action from the thank-you brief in lesson one, or the page sends them to the thank-you page.

Error: two kinds. A field error, like a missing phone number or a badly typed email, shows up next to that field, in words, before the form sends. That is the client-side validation in the prompt. A sending error, like the signal dropping, says what happened and keeps everything the visitor typed so they can try again. Never wipe the form on an error.

Now the most important line in the prompt: do not claim a backend exists unless connected. At this stage, nothing is connected, so the form has to be honest about that. Ask the AI to build it so that submitting runs the validation, shows the loading state, then shows success without sending anywhere, with a plain note in the code that the send is a placeholder until lesson six. A fake thank-you on a live site is how leads vanish into nothing.

One more rule. Nothing secret goes in the page. No API keys, no database passwords, no service tokens. Anyone who opens the page and views the source can read them. If an AI tool suggests pasting a key into the page code, the answer is no. Keys live on the server, and that is lesson six.

Put the code in GitHub, let Vercel build the preview, and test every state on your phone and keyboard.

What good looks like: the page state matrix in the workbook with every box checked on phone and on keyboard. The mistake: testing only the happy path. Break it on purpose. Type a bad email. Turn on airplane mode and tap Submit.

## Worked example

Lone Pine Fence Company in Henderson is a fictional example. One-page site for cedar privacy fences with a quote request form: name, phone, email, address, rough fence length, and a message. Name and phone required. Wireframe and copy from lessons three and four done.

The owner ran the lesson prompt with the brief pasted in and one line added:

"Build a responsive one-page site for Lone Pine Fence Company in Henderson, Texas from this brief: [wireframe and copy]. Include semantic HTML, accessible labels, visible focus, mobile layout, working client-side validation, loading, success, and error states. Do not claim a backend exists unless connected. The form send is a placeholder for now: show loading then success without sending anywhere, and mark that spot in the code."

Example output:

```text
Structure: header, main with sections matching the wireframe, form, footer.
Fields: every field has a visible label. Phone uses the phone input type, email uses the email type.
Submit: button reads "Get my quote," changes to "Sending..." and disables while pending.
Field errors: "Enter a phone number so we can reach you" appears under the phone field before sending.
Success: form replaced by "Got it. We will call or text within one business hour."
Send error: message shown, typed values kept, a "Try again" button.
Code note: PLACEHOLDER SEND. Connect to the server intake in lesson six.
```

Review against the pass standard. Does the primary action work? Yes. The form validates and reaches the success state. Is every field labeled? We tabbed through on a laptop and every field showed a label and a focus ring. Are all states visible and recoverable? Loading, success, and field errors, yes. The send error path is built but untested, because nothing sends yet. We noted that as pending for lesson six.

The one revision: on the owner's Android phone, the focus outline on the submit button was invisible against the dark blue button. We told the AI: "The submit button focus ring is not visible on a dark button. Make the focus state obvious." One sentence, one rebuild, fixed. The page went to Vercel as a preview link and the code sits in his GitHub account.

## Exact working prompt

```text
Build a responsive one-page site for [fictional or approved business] from this brief: [paste]. Include semantic HTML, accessible labels, visible focus, mobile layout, working client-side validation, loading, success, and error states. Do not claim a backend exists unless connected.
```

## Guided practice

1. Create a free GitHub account and a free Vercel account, and connect them.
2. Run the prompt with your wireframe and copy pasted in, and add the placeholder-send line.
3. Put the code in a new GitHub repository and let Vercel give you a preview link.
4. Open the link on your phone and fill out the form badly on purpose, then correctly.
5. On a laptop, click into the first field and Tab through the whole page, watching for visible focus.

## Assignment and evidence

Build the page in a preview environment and test keyboard navigation.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The primary action works, every field is labeled, and all states are visible and recoverable.

## Common mistakes

- No loading state. Fix: the button says "Sending..." and cannot be tapped twice.
- Placeholder text instead of labels. Fix: a visible label above every field that stays put.
- A fake success message on a form that sends nowhere. Fix: mark the send as a placeholder until lesson six connects it.
- Errors that clear the form. Fix: keep what they typed and say what to fix.
- A key or password pasted into the page code. Fix: never, it belongs on the server.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Page state matrix.
**Screen recording:** Run the build prompt, put the result in GitHub, open the Vercel preview on a phone held up to the camera, and walk through idle, loading, success, and error while tabbing through the form on the laptop.
**Course map:** the course visual below anchors where this lesson sits.

![The Website Conversion System course visual](/images/academy/website-conversion-system.svg)

## Downloadable

[Open the Website Conversion System workbook](/downloads/operator-academy/website-conversion-system-workbook.pdf)

Workbook section: OA06 Website Workbook, Build checklist.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

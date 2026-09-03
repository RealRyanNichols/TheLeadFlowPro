# CG L10: Design a Repeatable AI Workflow

## What you will finish

Turn a recurring business task into a documented input, processing, review, output, storage, and next-action workflow. When you are done you will have one workflow written on the workflow canvas, run twice with different inputs, with the instructions tightened where the two runs came out different.

## Why this matters

Everything so far has been one piece at a time. A kit, an image, a page, a document. That is how you learn. It is not how you run a business, because the same task comes back every week.

A fence company in Hallsville gets estimate requests through a website form. Every request needs the same thing: read the form, check the price sheet, draft a reply with a range and a time to come look, send it, log it. The owner did this from his truck between jobs. Some replies went out in an hour. Some went out in three days. Some never went out, and he did not know which, because nothing was written down. Run /tools/missed-call-calculator to see what that costs.

A workflow is that task written down once, with a trigger, an owner, the inputs it needs, the prompt that does the drafting, the review a human does before anything leaves, where the output gets saved, and what happens next. Once it is written, it runs the same way on a Tuesday afternoon as it does on a Friday night. And someone else can run it.

This opens the Expert level. The next lesson makes the workflow safe, and the capstone makes it complete. Build it now on a task you actually do every week.

## The lesson

### 1. Define the trigger and inputs

Pick one task that happens at least weekly and follows the same shape every time. Estimate replies. Review responses. The Monday crew text. Invoice reminders. Not "marketing." One task.

The trigger is what starts it. Be exact. "A submission arrives from the website form." "Monday at 8 a.m." "A Google review comes in with three stars or fewer." "A job is marked complete in the calendar." If you cannot name the trigger, you cannot tell when the workflow failed to run.

The owner is one named person. Not "the office."

The trusted inputs are the only things the workflow is allowed to use. The form fields. The current price sheet, by file name and date. The calendar. Your project instructions. List them. Anything not on the list is not an input, and that includes whatever ChatGPT remembers from other chats.

Then the exact working prompt below designs the whole thing with you. It asks for twelve parts: trigger, owner, trusted inputs, prompt or instructions, tools, output format, quality checks, approval gate, storage location, next action, failure state, and audit record. And it marks each step as automated, drafted, or human-only. Run it in a new chat in your project named for the workflow.

What good looks like: someone reading the trigger and input list could tell you whether the workflow should have run today and what it would have used.

The mistake is a vague trigger. "When I have time" is not a trigger. It is the reason replies took three days.

Example: the fence company trigger is the form submission. Inputs are the five form fields, the price sheet dated this quarter, and the calendar for the next ten days.

### 2. Separate creation from review

This is the line that keeps you out of trouble. ChatGPT creates. A human reviews. Nothing goes to a customer, gets posted, or gets paid without passing the review.

The creation step is the prompt you already know how to write from lesson two, saved word for word inside the workflow so it does not drift. Goal, context, output, boundaries. The workflow pastes the form fields into the context slot and runs it.

The review step is a checklist, short enough to actually use. For the estimate reply: is the price range inside the current sheet, is the visit date real and open on the calendar, is the customer's name spelled the way they typed it, does it make any promise about the final price, does it end with one next action. Five lines. The reviewer reads the draft against the five lines and marks pass or fix.

The approval gate is one person clicking send. Name who. If the reviewer is not available, the draft waits. It does not go out because it is late.

Mark honestly what is automated, what is drafted, and what stays human. Drafting the reply: drafted. Checking the price: human. Sending: human-only. Later courses automate more of this. Right now, the review is where your judgment lives.

What good looks like: the reviewer could be someone who has never talked to the customer and still catch the wrong price.

The mistake is letting the same person, in the same sitting, draft and approve without a checklist. That is not review. That is reading.

Example: a dental office in Kilgore drafts new-patient welcome emails from the intake form. The front desk lead reviews every one against four lines before it sends. Have your attorney review anything that touches patient information rules once, then run the workflow.

### 3. Save the output and decision

A workflow that does not save its work did not happen. Three things get saved every run.

The output. The final draft, in a place with a name. A Google Drive folder called "Estimate replies," a Notion page, a ClickUp task. Same place every time. Name the file the same way every time: 2026-09-14-lastname-estimate-reply.

The decision. Approved, revised, or rejected, by whom, and why if it was not a plain approval. One line in a log, a spreadsheet with a row per run.

The next action. What happens now that the output exists. "Calendar hold created for the site visit." "Follow-up reminder set for three days." If the next action is follow-up, the Follow-Up Campaign at /go/lead-follow-up is built for exactly that step.

Then the failure state. What happens when the input is missing. The form comes in without a phone number. The price sheet is out of date. The reviewer is out sick. Write what the workflow does in each case, because "I guess I'd figure it out" is how leads sit for four days.

And the audit record: the log row, the saved output, and the chat where the draft was made. Together they let anyone answer "what did we send this customer and who approved it."

Now run it twice with two different inputs. A simple request and a messy one. Compare the two outputs. Wherever they diverge in a way you did not want, the instructions have a gap. Tighten the prompt or the checklist and write down what you changed.

What good looks like: a second person can run it, review it, recover from a missing input, and find the record. That is the pass standard, word for word.

The mistake is running it once, seeing a good result, and calling it done. One good run proves nothing. Two runs show you where it wobbles.

## Worked example

Big Cypress Fence Co. in Hallsville is a fictional example. Owner Ray gets three to eight estimate requests a week through his website form. He opens a chat in his project named "Estimate reply workflow" and runs the exact working prompt with the task filled in.

Example output:

```text
Trigger: website form submission arrives by email. Owner: Ray.
Trusted inputs: form fields (name, phone, address, fence type, approximate length), price sheet dated Q3 2026, calendar for next ten days.
Creation (drafted): run the saved four-part prompt with the form fields as context; output is a reply with a price range, a proposed visit window, and one next action.
Quality checks (human): range inside price sheet, visit window open on calendar, name spelled as typed, no final-price promise, ends with one action.
Approval gate (human-only): Ray or Denise sends from the office email.
Storage: Drive folder "Estimate replies," file named by date and last name. Log row: date, customer, approved by, next action.
Failure state: missing phone, reply by email and ask for it; price sheet older than 90 days, stop and update before drafting.
```

Ray runs it on a simple request, a 120-foot cedar privacy fence with a full address. Clean. Then a messy one: "fence for backyard, not sure how long, call me." The draft invented a length and priced it. That is the divergence. He adds to the prompt: "If length or fence type is missing, do not give a range. Ask for both and offer a visit window." The second run of the messy input comes back with a question instead of a number.

Review against the pass standard. Could a second person run it? Denise runs it Thursday from the written canvas without asking him anything. Review the output: yes, the five-line checklist. Recover from failure: the missing-phone and stale-price cases are written. Find the saved record: the Drive folder and the log row.

The one revision that made it better was the missing-information rule. It turned an invented number into a question.

## Exact working prompt

```text
Design a repeatable AI-assisted workflow for [task]. Include trigger, owner, trusted inputs, prompt or instructions, tools, output format, quality checks, approval gate, storage location, next action, failure state, and audit record. Mark what is automated, what is drafted, and what remains human-only.
```

## Guided practice

1. Pick one task you do every week that follows the same shape, and write its trigger in one exact sentence.
2. Open a chat in your project named for the workflow and run the exact working prompt with the task filled in.
3. Copy the twelve parts onto the workflow canvas in the workbook and write the five-line review checklist yourself.
4. Run the workflow on one simple input and one messy input and mark where the outputs diverged.
5. Tighten the prompt or checklist where they diverged, save both runs and the log rows, and note what you changed.

## Assignment and evidence

Document one recurring workflow, run it twice with different inputs, and revise the instructions where the results diverge.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

A second person can run the workflow, review the output, recover from failure, and find the saved record.

## Common mistakes

- Picking "marketing" as the task. Fix: one task, weekly, same shape every time.
- A trigger you cannot name. Fix: a form, a time, a status change, or a message, stated exactly.
- Drafting and approving in the same breath. Fix: a written checklist and a named approver.
- No failure state. Fix: write what happens when the input is missing or the reviewer is out.
- One run and done. Fix: run a simple input and a messy one and fix where they differ.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Trigger-input-create-review-store-act sequence.
**Screen recording:** Run the design prompt in a project chat, show the twelve parts on the workflow canvas, run the estimate reply on a clean form and a messy form side by side, show the invented number, add the missing-information rule, and show the log row and Drive folder.
**Course map:** the course visual below anchors where this lesson sits.

![The ChatGPT Operator course visual](/images/academy/chatgpt-operator.svg)

## Downloadable

[Open the ChatGPT Operator workbook](/downloads/operator-academy/chatgpt-operator-workbook.pdf)

Workbook section: OA01 ChatGPT Operator Workbook, Workflow canvas.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

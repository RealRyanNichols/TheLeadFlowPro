# AG L04: Design the Tool Loop

## What you will finish

Plan observe, decide, act, verify, and record as separate steps. When you are done you will have a drawn loop for your workflow with every step labeled, every external write marked in red, and a safe failure state written next to each one.

## Why this matters

When an agent has tools, it can do things. Read a table, write a row, create a task, send a message. The danger is not that it can do things. The danger is doing them in the wrong order: acting before it has looked, writing before it has checked, retrying a failed write until there are six copies.

Here is the scene. A follow-up drafter creates a ClickUp task for each draft. One morning the ClickUp call times out. The agent retries. The first call actually went through. Now Tonya opens her queue and sees two tasks for every lead, and she cannot tell which one is real. She stops trusting the queue, which means she stops using it, which means the whole workflow is dead by Thursday.

That is a loop design problem, not a model problem. Separate observe from act. Verify after every write. Cap the retries. Record what happened. Those four habits are the difference between a workflow you trust and one you babysit.

You have the contract from lesson two and the context pack from lesson three. Now you draw how the run actually moves.

## The lesson

A tool loop is one pass through the work for one item. Observe: read what you need. Decide: pick what to do, or pick stop. Act: call the smallest tool that does it. Verify: read back and confirm it happened. Record: write the audit row. Then the next item. The prompt below asks for nine things per step. Three rules make those nine easy.

### 1. Observe before acting

The first step of every loop is read-only. Pull the lead row. Pull the template. Pull the last_contact date. Check whether a draft already exists for today. Nothing in the world changes during observe. (No approved follow-up templates yet? That is FU L03, or the Follow-Up Campaign at /go/lead-follow-up, $197, if you need them this week.)

The decide step comes next, and it is where the model earns its keep. It looks at what it observed and picks one of a short list of outcomes: draft with template A, draft with template B, or stop with a reason. Stop is a legitimate outcome. Half the value of the loop is that stop happens before act, not after.

Here is the mistake I see. People let the agent observe and act in one breath: "read the lead and create the task." When the read fails or returns something odd, the act still fires. Split them. Observe returns a small package of facts. Decide looks only at that package. If the package is missing a required field, decide returns stop, and act never runs.

Good looks like a decide step you can test on paper. Give it the facts and a person could predict the outcome. Example: lead has an email, address is in Rusk County, last_contact is 3 days ago, no draft today. Decision: draft, template "post-estimate check-in."

Duplicate protection lives here too. Before acting, observe checks for a record of this action already existing. Same lead, same day, same type. If it exists, stop. That single check would have saved Tonya's queue.

### 2. Use the smallest tool

Every act step uses the least powerful tool that gets the job done. If the job is "put the draft where Tonya can see it," the tool is "write one row to the drafts table." Not "run any SQL." Not "update the lead." One row, one table, one purpose.

This is where the build matters. When you have Claude Code or a developer write the workflow, each tool is a small function with a narrow name: write_draft, create_review_task, mark_escalated. The model can only call what exists. If there is no send_email function, no amount of confusion produces an email.

Then set the expected result for each tool call before you run it. Write_draft should return a new row ID. Create_review_task should return a task URL. If the result does not match the expectation, that is a failed act, and the loop goes to the failure state instead of pretending.

Retry limits go here. One retry for a timeout, then stop. Never retry a write without checking first whether the first attempt landed. That check is the verify step, which is next.

Approval requirement goes on the act step too. Internal writes (drafts table, review queue, audit log) run without approval. External writes (anything a customer, a vendor, or a bank sees) require a person to approve first. In the drawing, those external writes are the ones you mark in red. For most owner workflows in this course, the first version has zero red arrows, because a human sends everything. That is on purpose.

Example. The weekly report builder for a gym in Tyler. Observe: read the members table and the week's payment export. Decide: which sections have enough data. Act: write one report row to the reports table. That is the only write. No email, no post, no external anything. The owner reads it Monday and forwards it herself.

### 3. Verify after every mutation

A mutation is any write. After each one, read it back. Does the draft row exist with the text I sent? Does the ClickUp task show the right lead ID? Only then does the loop move on.

Verify is separate from act because the tool saying "OK" is not the same as the thing being true. Timeouts, partial writes, and duplicate submits all report strangely. Reading back is the only honest check.

Then record. Every loop pass writes one audit row: item ID, what was observed (summarized, not raw), the decision and its reason, the tool calls made, the verify result, and the final state: done, stopped, or failed. The audit row is what lesson seven turns into a full trail. Even now, it is how you answer "what did the agent do with lead 4471?"

The safe failure state is the last piece for each step. If observe fails, the item is skipped and logged, nothing written. If decide cannot pick, the item is escalated. If act fails, verify checks whether anything landed, then either cleans up or escalates with the details. If verify fails, the item is flagged "unverified" and the owner checks by hand. Every path ends in a state a person can see and recover from. None of them end in "try again forever."

Good looks like a drawn loop where I can put my finger on any box, ask "what if this fails?", and the answer is already on the page. The mistake is a happy-path drawing with no failure arrows. Real runs are half failure arrows.

Draw it on paper first. Boxes for observe, decide, act, verify, record. Red pen for anything that leaves your own systems. Then run the prompt and compare its table to your drawing.

## Worked example

Piney Woods Roofing in Henderson is a fictional example. Tonya's follow-up drafter, with the contract from lesson two and the context pack from lesson three. Tools available: read the Supabase leads table, read the Notion templates page, write to the drafts table, create a ClickUp task, write to agent_runs.

Tonya runs the prompt with the contract pasted in as the workflow description.

"Design a tool loop for the quiet-estimate follow-up drafter at Piney Woods Roofing. For each step show input, decision, tool call, expected result, validation, retry limit, approval requirement, audit record, and safe failure state."

Example output:

```text
Observe: input is one lead ID. Tools: read_lead, read_templates, check_existing_draft. Expected: one lead row with email, address, last_contact, consent; one template set; zero drafts today. Validation: all required fields present. Retry: 1. Approval: none. Failure state: skip item, log observe_failed.
Decide: input is the observed package. No tool call. Output: draft with template name, or stop with reason. Validation: template name must be in the template set. Failure state: escalate.
Act: write_draft (internal), then create_review_task (internal). Expected: row ID and task URL. Retry: 1, only after verify confirms nothing landed. Approval: none for internal writes. Failure state: mark act_failed, escalate with details.
Verify: read_draft by ID, read_task by URL. Expected: text matches, lead ID matches. Failure state: flag unverified.
Record: write one agent_runs row with item ID, decision, tool results, verify result, final state.
External writes in this loop: none. Sending the email is a human action after review.
```

Review against the pass standard. No external action occurs at all in version one, so nothing external happens without validation and authorization. Every step has a failure state. It passes.

The one revision: the first output retried create_review_task twice on timeout. Tonya changed it to "on timeout, verify first, retry once only if no task exists for this draft ID." That is the fix for the duplicate-task morning, written into the loop before it ever happens.

## Exact working prompt

```text
Design a tool loop for [workflow]. For each step show input, decision, tool call, expected result, validation, retry limit, approval requirement, audit record, and safe failure state.
```

## Guided practice

1. On the Tool-loop canvas in the workbook, draw five boxes in a row: observe, decide, act, verify, record.
2. Under act, list every write your workflow makes and circle in red the ones that leave your own systems.
3. Run the prompt with your contract pasted in and compare its steps to your drawing.
4. For every box, write one line that starts with "if this fails, then."
5. Add a duplicate check to observe: which record proves this item was already handled today?

## Assignment and evidence

Draw the complete loop and mark every external write in red for review.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

No external action occurs without validation, authorization, and a recoverable failure state.

## Common mistakes

- Observe and act in one step. Fix: observe returns facts, decide picks, act runs only after a decision.
- Retrying a write on timeout without checking. Fix: verify first, retry once only if nothing landed.
- One big tool that can do anything. Fix: small named functions, one purpose each, no send or delete in version one.
- No failure arrows on the drawing. Fix: every box gets an "if this fails" line before you build.
- Trusting the tool's "OK." Fix: read the record back and compare before moving on.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Observe-decide-act-verify cycle.
**Screen recording:** Draw the roofing loop in Figma or on a whiteboard, then open the agent_runs table in Supabase and walk through one real row box by box.
**Course map:** the course visual below anchors where this lesson sits.

![AI Agents for Business course visual](/images/academy/ai-agents-for-business.svg)

## Downloadable

[Open the AI Agents for Business workbook](/downloads/operator-academy/ai-agents-for-business-workbook.pdf)

Workbook section: OA07 Agent Workbook, Tool-loop canvas.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

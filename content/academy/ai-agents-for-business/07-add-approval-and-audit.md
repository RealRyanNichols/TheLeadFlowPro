# AG L07: Add Approval and Audit

## What you will finish

Make consequential actions reviewable before execution and reconstructable afterward. When you are done you will have one working approval record and one audit record, real ones, sitting in your queue and your log, that a reviewer can act on in under a minute.

## Why this matters

Up to now the agent has drafted and stopped. That was deliberate. Now we let it propose actions that matter, and a person decides. The whole safety of that setup rests on two things: the reviewer seeing enough to decide well, and the record being good enough to explain later.

Here is the scene. Tonya opens the review queue and sees "Approve follow-up for lead 4471?" with a yes button. What follow-up? Which lead? What did we quote them? Did they already reply this morning? She either clicks yes blind, which means the approval is theater, or she opens four tabs to find out, which means the agent saved her nothing.

Then there is the afterward. A customer calls, annoyed about an email. Carl asks what happened. If the answer is "the agent sent something and Tonya approved it, I think, on Tuesday maybe," you have no audit. If the answer is "here is the proposal, the evidence it used, who approved it at 8:14, and the message that went out at 8:15," you have a business.

The loop from lesson four marked external writes in red. This lesson is the gate every red arrow passes through. The evaluation suite from lesson six had a rollback case with no answer. This is where it gets one.

## The lesson

The prompt below asks for an approval system in seven parts: which actions need approval, reviewer context, approve, reject, or revise options, expiration, duplicate protection, audit fields, and post-action verification. Three moves.

### 1. Classify consequence

Not every action needs a person. Writing a draft to a table does not. Sending that draft to a customer does. The line is consequence: who outside the workflow sees or feels the result, and whether it can be undone.

I sort actions into three tiers. Tier one, internal and reversible: writing drafts, creating review tasks, logging. Runs without approval. Tier two, external but low stakes or reversible: labeling an email in a shared inbox, updating a lead's status field. Runs without approval but shows up in a daily digest the owner reads. Tier three, external and consequential: any message to a customer, any price, any payment, any deletion, anything to a vendor or a bank. Every one needs a named person to approve before it happens.

Write your actions into the three tiers. Most owner workflows have one or two tier three actions. The fewer red arrows, the faster the reviews.

Good looks like a tier list where the tier three actions are so specific that the build can enforce them: "send_email is a function that only runs when an approval record with status approved exists for this draft." The mistake is "the owner will review important stuff." Important is not a tier. Send is.

Example. The follow-up drafter has exactly one tier three action: the email going to the homeowner. Version one from lesson four had Tonya sending it herself. Version two lets the workflow send it through Resend, but only after her approval. Texts stay human, sent from Quo, same as FU L08.

### 2. Show the reviewer enough context

An approval request is a small page. It has to answer four questions without the reviewer leaving it: what is proposed, what evidence it rests on, what could go wrong, and what happens next.

So the approval record has these fields. The proposed action, exactly: "Send this email to the address on lead 4471." The full content, not a summary. The evidence: lead first name, estimate date and amount, last_contact date, the template used, the source register rows it relied on. The risk note: anything the agent flagged, such as "customer note mentions a neighbor's price." The expected effect: "customer receives one email, lead status changes to followed_up, next follow-up eligible in 5 days."

Then the three buttons. Approve: it runs. Reject: it does not, and the record stays with a reason. Revise: the reviewer edits the content, and the edited version runs, with both versions kept. Revise is the one people forget, and it is the one that gets used most. The draft is 90 percent right; Tonya fixes a word and approves.

Expiration matters. An approval is good for a window, say 24 hours. An email that was fine on Tuesday morning is not fine on Thursday after the customer called and booked. Past the window, the request closes itself and the loop re-observes.

Duplicate protection lives here too. Before an approval request is created, the workflow checks for an open or approved request for the same lead and action. If one exists, no new request. The reviewer never sees two of the same thing, which is the failure from lesson four showing up in a new place.

Where does the queue live? A ClickUp list with a status field works. A Notion database works. A page in your own dashboard that reads from a Supabase approvals table works best if you have one, because the approve button can write straight to the record. Pick what your owner already opens every morning.

Good looks like Tonya reading one card and deciding in thirty seconds. The mistake is a yes-or-no with a lead ID and nothing else.

### 3. Record the decision

The audit record is the approval record plus everything that happened after. One row per action, and once written it does not change.

Fields: action ID, workflow name, lead or item ID, proposed content, evidence snapshot (the source rows as they were at the time, or their IDs and versions), reviewer name, decision, revised content if any, decision timestamp, execution timestamp, tool result, and verification result.

That last one is post-action verification, and it closes the loop. After the email sends, the workflow reads back: does the send record exist for that address at that time? Did the lead's status change? If yes, the audit row says verified. If no, it says unverified, and the owner gets a flag. An approval that was executed but never verified is a gap, and gaps are where the annoyed phone call comes from.

Redaction from lesson five applies. The audit row references the lead ID and stores the message content, because the content is what was approved. It does not store the full customer row. Access to the audit table is the same as access to the approvals: owner and reviewer.

Rollback gets its answer here. An approved action that already ran cannot be unsent. What you can do is record a withdrawal: a new audit row that references the original, says who withdrew it and why, and triggers whatever follow-up is right, like a correction email that goes through its own approval. The trail shows both. That is what "reconstructable afterward" means.

Good looks like an audit table where I can pick any customer and read the whole story in order. The mistake is a log that says "sent" with a timestamp and nothing about who said yes.

Prototype both records this week. Real fields, real data from one lead, one approval clicked by the real reviewer. Then the launch in lesson eight has something to launch.

## Worked example

Piney Woods Roofing in Henderson is a fictional example. Tonya's follow-up drafter, version two. The one tier three action is sending the follow-up email through Resend after approval.

Tonya runs the prompt with the contract and the tool loop pasted in, and names the ClickUp list they already use as the queue.

"Create an approval system for the quiet-estimate follow-up drafter at Piney Woods Roofing. Queue lives in our ClickUp review list. Define which actions need approval, reviewer context, approve/reject/revise options, expiration, duplicate protection, audit fields, and post-action verification."

Example output:

```text
Needs approval: send_email. No approval: write_draft, create_review_task, update lead status after send, write audit.
Reviewer context: lead first name, estimate date and amount, last_contact, template name, full draft text, agent flags, expected effect.
Options: approve, reject with reason, revise then approve. Revised text stored alongside the original.
Expiration: 24 hours from request creation. Expired requests close and log "expired."
Duplicate protection: one open request per lead per action type. Check before create.
Audit fields: approval ID, lead ID, workflow, proposed text, final text, evidence IDs, reviewer, decision, decided_at, sent_at, send record ID, verified.
Post-action verification: read the send record by ID within 5 minutes, confirm address and timestamp, set verified true, else flag the owner.
```

Tonya prototypes it on one real lead, an estimate from Kilgore eleven days old. The approval card shows the draft, the estimate amount, and a flag: "customer note mentions insurance adjuster." She picks revise, removes a line that referenced the estimate amount, and approves. The email sends. The audit row fills in, verified true.

Review against the pass standard. Could a reviewer understand the proposed action, evidence, risk, and expected effect before approving? Yes. The flag is what made her revise, which is exactly the point.

The one revision: the first approval card showed last_contact as a raw date. Tonya changed it to "last contact: 11 days ago (Aug 22)." It cut her decision time in half, because the number she cares about is the gap, not the date.

## Exact working prompt

```text
Create an approval system for [workflow]. Define which actions need approval, reviewer context, approve/reject/revise options, expiration, duplicate protection, audit fields, and post-action verification.
```

## Guided practice

1. List every action in your tool loop and sort each one into tier one, two, or three.
2. Run the prompt with your contract and loop, and paste the reviewer context list into the Approval design section of the workbook.
3. Build one approval record by hand in your queue tool with every context field filled from one real item.
4. Have the real reviewer act on it and time how long it takes them to decide.
5. Write the matching audit row by hand, including who decided, when, and the verification result.

## Assignment and evidence

Prototype one approval record and one audit record.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

A reviewer can understand the proposed action, evidence, risk, and expected effect before approving it.

## Common mistakes

- Approval cards with an ID and a yes button. Fix: content, evidence, risk, and expected effect on one card.
- No revise option. Fix: let the reviewer edit and approve in one step, and keep both versions.
- Approvals that never expire. Fix: a window, then the request closes and the loop looks again.
- Execution without verification. Fix: read back the send record and set verified before the row is final.
- Audit rows that can be edited. Fix: append only; corrections are new rows that reference the old one.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Propose-review-act-record flow.
**Screen recording:** Open the ClickUp review queue, click into one approval card, use revise on the roofing draft, approve it, then switch to the Supabase audit table and show the row fill in with verified true.
**Course map:** the course visual below anchors where this lesson sits.

![AI Agents for Business course visual](/images/academy/ai-agents-for-business.svg)

## Downloadable

[Open the AI Agents for Business workbook](/downloads/operator-academy/ai-agents-for-business-workbook.pdf)

Workbook section: OA07 Agent Workbook, Approval design.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

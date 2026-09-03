# CG L09: Run a Quality Control and Revision Loop

## What you will finish

Use a repeatable audit, issue list, targeted revision, and final verification loop before delivering AI-assisted work. When you are done you will have one client deliverable audited against its brief and sources, an approved issue list, a revised version, and a second audit that shows the final is clean.

## Why this matters

Here is the failure that costs the most. Not a bad draft. A good-looking draft that went out with one wrong number in it. The proposal that quoted a lifetime warranty the manufacturer does not offer. The board brief with last year's player count. The email that promised a date nobody agreed to.

A roofer in Gilmer sent a church a proposal with the wrong square footage. He had read it. It read fine. The number was in the middle of a paragraph that sounded right, so his eye slid over it. The church caught it, and now every number he sends them gets a second look, which is fair.

Reading is not checking. Checking is comparing the work against the brief and the sources, line by line, and writing down what does not match. ChatGPT is good at this when you make it do only this. The trick is to stop it from fixing things while it audits, because a tool that fixes as it goes will change things you did not approve.

This is the third deliverable lesson and the last in the Professional level. It closes the loop on the last two lessons: research gave you sourced facts, files gave you a structured document, and this gives you the check that lets you sign your name to it.

## The lesson

### 1. Audit against requirements

Start with three things: the original brief, the sources, and the deliverable. If you did lesson eight, the brief is the reader and decision line, the sources are the files, and the deliverable is the document. Open a new chat in your project named for the audit, and either paste all three or attach them.

Run the exact working prompt. Read what it asks for. A table with requirement, evidence, status, severity, exact issue, and proposed fix. It checks eight things: factual support, missing content, contradictions, tone, accessibility, privacy, functionality, and unsupported claims. And the last two lines matter most: do not rewrite yet, wait for approval of the issue list.

The requirement column comes from the brief. Every promise the brief made is a row. The evidence column says where in the sources that requirement is met or not. Status is met, partly met, or not met. Severity is how bad it is if this ships. Exact issue quotes the problem. Proposed fix is one line.

What good looks like: every requirement in the brief has a row, including the boring ones like "includes the deposit terms," and every row points at evidence, not at a feeling.

The mistake is auditing without the brief. Then ChatGPT audits against its own idea of good, and you get twenty style notes and zero substance.

Example: a proposal for a church roof. Requirements from the brief: square footage, material, warranty as the manufacturer states it, deposit terms, schedule, and one page. Six rows before it looks at anything else.

### 2. Prioritize material defects

The audit will come back with a long list. Most of it is not material. Your job is to sort.

Material means one of five things. It would mislead the reader. It would break a function, like a form or a link. It exposes private information. It makes a claim you cannot support with a source. It leaves out something the brief required. Those get fixed before anything else.

Not material: word choice you would not have picked, a heading style, a sentence that could be shorter. Those can wait, or get skipped.

Go through the list and mark each row: fix now, fix later, or skip. Write that decision in the chat so it is on the record. "Approve rows 1, 2, 4, and 6. Skip 3 and 5, they are style. Row 7, change severity to low and fix later." That is your approved issue list, and it is what you submit alongside the versions.

What good looks like: a short approved list where every item would change what the reader believes or does.

The mistake is fixing everything. Fixing everything means fifteen changes, and fifteen changes means fifteen new places for something to go wrong, and you will not check all fifteen. Fix the ones that matter, check those hard.

Example: the roof proposal audit returns eleven rows. Four are material: the warranty claim, the missing deposit terms, the square footage contradiction, and a phone number typo. Seven are style. Four get approved.

### 3. Revise and verify the final version

Now, and only now, ask for the revision. Targeted. "Apply the approved fixes for rows 1, 2, 4, and 6 only. Change nothing else. Return the full revised document." The "change nothing else" line is doing real work. Without it, the tool will improve three paragraphs you did not ask about, and one of those improvements will be wrong.

Read the revised version against the approved list. Each approved row should be resolved exactly. Then look for collateral changes. If a paragraph you did not approve is different, ask why, or paste the original back.

Then run the audit again. Same prompt, same brief, same sources, on the final version. This is the step people skip because it feels redundant. It is the whole point. The second audit should come back with the material rows marked met and nothing new. If something new shows up, the revision caused it, and you loop once more.

Save the quality-control scorecard from the workbook with the first audit, the approved list, the revised document, and the second audit. That package is the deliverable for this lesson, and it is the evidence you show a client when they ask how you know the numbers are right.

What good looks like: the second audit is boring. Every material row is met. You can hand the document to the client and say every number was checked, and mean it.

The mistake is assuming the revision is correct because you asked for it correctly. Asking is not checking. Run it again.

Example: the roofer's second audit shows the four fixes applied and one new low item, a date format that changed. He leaves it and ships the proposal.

## Worked example

Piney Woods Roofing in Gilmer is a fictional example. Owner Travis is sending a replacement proposal to a church in Ore City. The brief: replace the sanctuary roof, architectural shingles, warranty stated exactly as the manufacturer states it, square footage from the inspection notes, 30 percent deposit with the balance on completion, ten-day schedule, one page. Sources: his inspection notes, the manufacturer spec sheet PDF, and the church's request email.

He opens a chat named "Church proposal audit," attaches the three sources and the proposal, and runs the exact working prompt.

Example output:

```text
Row 1. Requirement: warranty stated as manufacturer states. Evidence: spec sheet, page 2, 25-year limited. Status: not met. Severity: high. Issue: proposal says "lifetime warranty." Fix: replace with the spec sheet wording.
Row 2. Requirement: 30 percent deposit terms. Evidence: none in proposal. Status: not met. Severity: high. Issue: deposit terms missing. Fix: add the deposit line from the brief.
Row 3. Requirement: square footage from inspection notes. Evidence: notes say 8,400; proposal says 8,900. Status: not met. Severity: high. Issue: contradiction. Fix: use 8,400 and cite the notes.
Row 4. Requirement: one page. Evidence: proposal is one page. Status: met.
Row 5. Tone. Status: met. Note: "we are thrilled" in the opening reads salesy. Severity: low.
I have not rewritten anything. Please approve the issue list.
```

Travis approves rows 1, 2, and 3, plus a phone typo in row 7, not shown here. He skips the tone note; he will fix that himself. He asks for the targeted revision, change nothing else, and reads the result. All three fixes are exact. One paragraph in the schedule section is reworded without approval; he pastes the original back.

He runs the audit again on the final. Rows 1, 2, 3, and 7 come back met. Nothing new. Review against the pass standard: every requirement verified, material issues resolved, final version checked rather than assumed. He saves the scorecard, both audits, the approved list, and both versions in one folder, sets it to viewable by link, and submits.

The one revision that made it better was not in the document. It was adding "change nothing else" to the revision request after the first attempt reworded the schedule.

## Exact working prompt

```text
Audit this deliverable against the original brief and sources: [paste or attach]. Return a table with requirement, evidence, status, severity, exact issue, and proposed fix. Check factual support, missing content, contradictions, tone, accessibility, privacy, functionality, and unsupported claims. Do not rewrite yet. Wait for approval of the issue list.
```

## Guided practice

1. Pick one deliverable you made in lesson six or eight and gather its brief and sources.
2. Open a chat in your project named for the audit, attach all three, and run the exact working prompt.
3. Mark every row fix now, fix later, or skip, and write the approved list in the chat.
4. Request the revision for approved rows only with the words "change nothing else," then read for collateral changes.
5. Run the same audit on the final version and save both audits with the scorecard.

## Assignment and evidence

Audit one client deliverable, approve the issue list, revise it, and run the audit again on the final version.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

Every requirement is verified, material issues are resolved, and the final version is checked rather than assumed correct.

## Common mistakes

- Auditing without the brief. Fix: every requirement in the brief becomes a row before anything else is checked.
- Fixing all fifteen items. Fix: approve the material ones, skip or defer the style ones.
- Letting the audit rewrite as it goes. Fix: keep the "do not rewrite yet" line and approve the list first.
- Skipping the second audit. Fix: run the same prompt on the final and expect it to be boring.
- Ignoring paragraphs that changed without approval. Fix: paste the original back and ask why.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Brief-audit-fix-verify cycle.
**Screen recording:** Attach the brief, sources, and proposal in a project chat, run the audit and scroll the table, type the approval message, request the targeted revision with "change nothing else," and run the second audit on the final.
**Course map:** the course visual below anchors where this lesson sits.

![The ChatGPT Operator course visual](/images/academy/chatgpt-operator.svg)

## Downloadable

[Open the ChatGPT Operator workbook](/downloads/operator-academy/chatgpt-operator-workbook.pdf)

Workbook section: OA01 ChatGPT Operator Workbook, Quality-control scorecard.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

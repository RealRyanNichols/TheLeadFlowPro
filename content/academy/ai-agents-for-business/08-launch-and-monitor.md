# AG L08: Launch and Monitor

## What you will finish

Start with a narrow scope, watch failures and cost, and expand only after evidence. When you are done you will have run a dry-run batch, written the launch decision memo, and either turned the workflow on at a small scale with a kill switch in your hand or written down exactly why not yet.

## Why this matters

This is the finish line for the course, and it is the step people rush. The build works, the tests pass, and the temptation is to switch it on for everything Monday morning. Do not. An agent that handles five items a day badly is a bad afternoon. An agent that handles two hundred items a day badly is a bad month.

Here is the scene. A roofing office turns on the follow-up drafter across every quiet lead at once. It runs fine for two days. On day three the price sheet gets updated with a typo, and forty drafts land in the queue quoting a number that is off by a zero. Tonya catches it, but she spends her morning rejecting forty cards instead of running the office. Nobody got hurt. The trust did.

Staged rollout means the workflow earns its scope, one stage at a time, with numbers that have to hold before the next stage opens.

And a kill switch the owner can flip in ten seconds from her phone. If you cannot stop it in ten seconds, you are not ready to start it.

## The lesson

The prompt below builds a staged launch plan in ten parts. Three moves cover them.

### 1. Use a staged rollout

Stage one is the dry run. Take twenty to fifty old items and run the full loop with every external write turned off. Drafts go to a test table. Nothing reaches a customer. You read every output against what actually happened back then. That is the assignment, and it takes an afternoon.

Stage two is shadow mode. The workflow runs on live inputs every day, but a person still does the job the old way. At the end of each day, Tonya compares her follow-ups to the agent's. A week of that tells you more than any demo. If she would have sent the agent's version as-is most of the time, you are close. If she keeps rewriting, the contract or the context needs work. Go back before you go forward.

Stage three is limited production. Pick a narrow slice: leads from one county, or the first five per day, or one crew's jobs. The workflow proposes, the reviewer approves, the action runs. Everything else still goes the old way. Hold there for at least two weeks.

Expansion criteria are written before you start, not after. "Move from five per day to twenty when two weeks pass with a reject rate under 15 percent, zero unverified actions, zero missed injection escalations, and cost under budget." Numbers, not feelings.

Good looks like a plan with a date on every stage and a number that opens the next gate. The mistake is stage three on day one because the dry run looked great.

### 2. Track quality and cost

Pick three or four quality numbers and watch them every day. For a drafter: approve-as-is rate, revise rate, reject rate, and escalation rate. For a triage assistant: label accuracy on a daily sample of ten, and missed flags. For a report builder: corrections the owner had to make.

The review sample is how you check quality without reading everything forever. Every day the owner reads a fixed sample, say five items or ten percent, whichever is larger, and marks each one right or wrong. That number goes on a sheet. When it holds steady for two weeks, the sample can shrink. It never goes to zero.

Cost has two parts: model usage on ChatGPT or Claude, and anything the tools charge per use. Set a monthly cap in dollars before you launch, and set the workflow to stop when it hits the cap. A runaway loop that retries all night can spend a month's budget before breakfast. Your retry limits from lesson four are the first defense. The cap is the second.

I walked Longview Mall asking owners what they pay every month for tools they do not own. An agent with no cost cap is the same trap with a different name. Own the number.

Put the numbers where the owner already looks: a daily row in a Supabase table or a Notion database with a running total. DA L06 builds the full dashboard. For now a sheet is fine, as long as someone opens it.

Incident response is one paragraph. When something goes wrong: hit the kill switch, write down what happened and when, find every affected item from the audit table, fix each one by hand, find the cause, fix the cause, add an evaluation case for it, rerun the suite, and only then turn it back on. Print that paragraph. Tape it next to the switch.

Good looks like a daily sheet the owner fills in for two weeks without being reminded. The mistake is measuring nothing because "we would notice." You notice the bad ones. You do not notice the slow drift.

### 3. Keep a kill switch

The kill switch is a single flag the workflow checks at the start of every run and before every external action. If the flag says paused, the run exits and logs "paused." Nothing else happens.

Build it so the owner can flip it without a developer. A settings row in Supabase with a status column, and a button on a page she can open from her phone. Test it during the dry run. Flip it mid-batch and confirm the batch stops. If you have never flipped it, you do not have one.

Two levels are better than one. Pause: nothing new starts, open approvals stay open. Stop: nothing runs, open approvals expire. Most incidents want pause. A bad price sheet wants stop.

The owner is on the memo by name: the one who flips the switch, reads the daily sample, and decides on expansion. Same name as lesson one. It never changed, and that is the point.

Now write the launch decision memo. One page. What the workflow is (the contract). What it reads (the context pack). What it does (the loop). What it protects (the data review). What it passed (the evaluation suite, with the numbers). How it is gated (the approval prototype). What the dry run showed. The stages, the numbers, the cost cap, the switch, the owner. And the decision: launch to limited production on this date, or not yet, and what has to change first.

When that memo is signed, here is what you have: one workflow with a contract, a context pack, a drawn loop, a data review, a tested suite, an approval gate, and a switch. That is a system, not a demo. Run it in limited production for two weeks, then take the same eight documents and start your second workflow. The next course, OA08 The Local Ads Operator, is where the leads that feed this workflow come from. Do the two weeks first.

## Worked example

Piney Woods Roofing in Henderson is a fictional example. Tonya's follow-up drafter, version two, with the approval gate from lesson seven.

Tonya runs the prompt with the contract, the loop, and the evaluation results (ten of ten passing after the injection fix), then runs the dry run: 40 quiet leads from June, every external write turned off.

"Create a staged launch plan for the quiet-estimate follow-up drafter at Piney Woods Roofing. Contract, loop, and evaluation results attached. Include dry run, shadow mode, limited production, review sample, quality metrics, cost limits, incident response, kill switch, owner, and expansion criteria."

Example output:

```text
Dry run: 40 leads. 31 drafts would have been approved as-is, 6 revised, 3 escalated (2 missing email, 1 out of area). Zero drafts contained a dollar amount. Zero duplicates.
Shadow mode: 5 business days. Tonya drafts hers first, compares at 3 p.m. Target: she would send the agent's version as-is on 7 of 10.
Limited production: Rusk County leads only, maximum 5 approval requests per day, for 14 days.
Review sample: Tonya reads all 5 daily during limited production. Carl reads 2 per week.
Quality metrics: approve-as-is rate, revise rate, reject rate, escalations, unverified sends (must be zero).
Cost limits: model usage capped at a monthly dollar number Carl sets. Workflow stops at the cap.
Kill switch: workflow_settings row, status column, paused or stopped, button on the office page.
Expansion: all counties and 20 per day after 14 days with reject rate under 15 percent and zero unverified sends.
```

Review against the pass standard. Passed evaluations: yes, ten of ten after the injection fix. Within cost and error limits: the cap is set and the dry run had zero unverified writes. Can be paused immediately: Tonya flipped the switch mid-batch on lead 22, and the run stopped at 21. It passes.

The one revision: the first memo set the daily limit at 20. Carl cut it to 5. His reason was simple: "I want her reading every single one for two weeks, and she can read five." The memo says launch, limited production, Monday.

## Exact working prompt

```text
Create a staged launch plan for [workflow]. Include dry run, shadow mode, limited production, review sample, quality metrics, cost limits, incident response, kill switch, owner, and expansion criteria.
```

## Guided practice

1. Pull 20 to 50 old items and run the full loop with every external write turned off.
2. Read every output against what really happened and count approve, revise, reject, and escalate.
3. Flip your kill switch in the middle of the batch and confirm the run stops.
4. Run the prompt with your contract, loop, and evaluation results, and put a number on every expansion gate in the Launch scorecard.
5. Write the one-page launch decision memo and get the owner's name on it.

## Assignment and evidence

Run a dry-run batch and write the launch decision memo.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The workflow has passed evaluations, stays within cost and error limits, and can be paused immediately.

## Common mistakes

- Full scope on day one. Fix: dry run, shadow, limited, each with a number that opens the next.
- A kill switch that needs a developer. Fix: one flag, one button, owner's phone, tested before launch.
- No cost cap. Fix: a monthly dollar number the workflow enforces by stopping.
- A review sample that quietly drops to zero. Fix: a fixed daily count on a sheet with a name and a date.
- Turning it back on after an incident without a new evaluation case. Fix: every incident becomes a case, and the suite reruns first.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Dry run to controlled production.
**Screen recording:** Run the 40-lead dry run from the terminal with Claude Code, show the test drafts table filling in Supabase, flip the paused flag on the settings row mid-batch, and show the run stop.
**Course map:** the course visual below anchors where this lesson sits.

![AI Agents for Business course visual](/images/academy/ai-agents-for-business.svg)

## Downloadable

[Open the AI Agents for Business workbook](/downloads/operator-academy/ai-agents-for-business-workbook.pdf)

Workbook section: OA07 Agent Workbook, Launch scorecard.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

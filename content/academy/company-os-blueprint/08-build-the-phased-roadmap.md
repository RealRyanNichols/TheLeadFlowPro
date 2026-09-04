# OS L08: Build the Phased Roadmap

## What you will finish

Sequence quick wins, foundations, integrations, automation, and optimization by evidence and dependency. When you are done you will have a published roadmap in 30, 60, 90, and later phases, each with deliverables, owners, acceptance criteria, and stop rules, and the first two-week build cycle chosen and on the calendar.

## Why this matters

You now have seven documents that describe your business better than anything you have ever had. This lesson turns them into an order of operations, because a blueprint you cannot sequence is a folder.

Here is the failure I see most. An owner gets the blueprint and a free Saturday and starts building the control center first, because it is the exciting part. There is not a single clean table under it. Two weeks later it shows numbers from three spreadsheets, none of them match, and the team stops trusting it. The blueprint was right. The order was wrong.

The other failure is the opposite. Sixty days of planning, nothing live, and the team goes back to the whiteboard because the whiteboard works today.

This is the last lesson of the Operator Academy. Everything you built across ten courses gets sequenced here, and then you build it.

## The lesson

### 1. Fix the source of truth

Here is how I sequence every client build, from the dental assistant school to the mobile wash company to the media archive with 1,500 plus records. Source of truth first. Then the capture and the first response writing to it. Then the workflows, one at a time, with roles enforced. Then the control center on top. Then automation, and only then optimization. I have never regretted that order. I have regretted every shortcut around it.

Phase one is always the same, no matter what the business sells. One authoritative home for people and leads, with a real ID, from your matrix in lesson two. The capture form from LC L07 writing straight into it. The follow-up log from FU L06 writing to it. The security basics from lesson seven, MFA and a backup and a restore date, before anything else gets built on it.

Nothing else goes first. Not the agent, not the dashboard, not the portal. Every later phase reads from the source of truth, so it has to exist and be trusted first.

Quick wins are allowed in phase one on one condition. They cannot create a new copy of the truth. A missed-call text-back that logs to the lead table is a quick win. A new spreadsheet to "track this for now" is a new problem.

What good looks like: by day thirty, every new lead exists in one place with a status, and the team can see it.

The mistake is starting with the shiny thing on top of three spreadsheets. It looks like progress for about two weeks.

### 2. Deliver in usable phases

The prompt returns four phases. Here is what usually lands in each.

Days one to thirty: foundations. Source of truth, capture, first response, roles enforced in the login, security basics. Days thirty-one to sixty: the five workflows from lesson four running in the system, the client portal if it is part of your offer, the OA09 dashboard reading from real tables instead of exports. Days sixty-one to ninety: the control center from lesson six, automation for the safe steps from OA07, and the OA08 ads pointed at a funnel that now works end to end. Later: optimization and more integrations, the things that only make sense with ninety days of clean data.

Inside each phase, work in two-week cycles. One cycle, one deliverable, one owner, one acceptance test. Every cycle ships something a person on your team uses that week. If a cycle ends and nobody uses anything new, it did not ship.

Rank what goes first inside a phase by the six things in the prompt: value, risk, effort, dependency, data readiness, and adoption. Dependency and data readiness beat value every time. A high-value workflow that needs a table you do not have yet goes second.

What good looks like: someone reads the roadmap and can say what goes live in the next two weeks, who owns it, and how you will know it worked.

The mistake is phases labeled "design" for sixty days and "build" for thirty. Design is done. That is what this course was. Every two weeks, something goes live.

### 3. Set pass and fail gates

Every deliverable gets acceptance criteria you can measure, and you have already written most of them: the pass standards from every lesson in this academy. "Every lead created through the site has a first response logged in the messages table." "The foreman cleared the control center in the walkthrough without opening another tab."

Then the stop rules, which matter more. If the team is not using the new record after two weeks, stop. Find out why, fix the intake path, then continue. If a phase needs data that is not ready, do the cleanup from DA L04 first. If a deliverable misses its acceptance test twice, the plan is wrong, not the team.

Keep the same evidence trail you have kept all through the academy. It is what a reviewer looks at, and what you look at in a year when you wonder why you built it this way.

What good looks like: every deliverable has a yes-or-no test and a written rule for what happens on no.

The mistake is no stop rules, so a failing phase drags into the next one and the whole roadmap slides.

Run the prompt with your current-state map from lesson one pasted into the bracket, with the matrix and the workflow names under it. Read the 30-day phase first. If anything in it does not fix or protect the source of truth, move it.

Here is what you are holding now. A current-state map that tells the truth. A matrix with one home per record. A data model tested against real stories. Five workflows with failure paths. A role matrix your team has read. A control center on paper. A risk register with a test on the calendar. And a roadmap with a first cycle. That is a Company OS blueprint.

Three ways to build it from here. Build it yourself with what you learned in ten courses, using the free tools at /tools, the Tool Studio at /go/tools, and the free website build at /free-build if you need the front door. Build it with me: the System Map at /packages/system-map is $497. It is this course done with you in a working session: we take your map, matrix, and roadmap and turn them into a build plan you can hand to me or to any developer. You do not need it to finish. The workbook is enough if you do the work. Or hire the build done, which starts with a call.

There is no OA11. The next course is your first two-week cycle.

## Worked example

Sabine Valley Plumbing in Kilgore, the fictional example from lessons one and seven, is ready for the roadmap. Travis pastes the current-state map, the matrix, and the five workflow names into the prompt:

"Create a phased Company OS roadmap from this current-state map: [the Sabine Valley map from lesson one]. Rank opportunities by value, risk, effort, dependency, data readiness, and adoption. Return 30-day, 60-day, 90-day, and later phases with deliverables, owners, acceptance criteria, and stop rules."

Example output:

```text
30 days: build control center in admin back office. Owner: Travis. Deploy AI text agent for after-hours calls.
60 days: create leads table in Supabase with unique ID; connect website form and Quo missed calls.
90 days: dashboard reading from leads and orders tables. Restore test scheduled.
Acceptance, 30 days: control center live.
Stop rules: none listed.
```

Travis reads it against the pass standard. Does the roadmap start with foundations, ship useful increments, respect dependencies, and have measurable acceptance criteria? No. The control center is in the first thirty days and the leads table it reads from is in the second. The text agent goes live before consent is being captured. "Control center live" is not a test, it is a status. And there is not one stop rule.

The one revision is mostly reordering: days one to thirty become the leads table with a real ID, the website form and Quo missed calls writing to it, Dana entering after-hours calls into it instead of the notepad, MFA on every account, and the first restore test. Days thirty-one to sixty are the five workflows and the roles enforced. Days sixty-one to ninety are the control center and the text agent, now with consent recorded on every person. Acceptance for phase one: every lead from every source appears in the leads table within one business day, checked by Dana on a Friday. Stop rule: if after-hours calls are still on the notepad by day fourteen, stop and fix the intake path first.

First two-week cycle: the leads table and the website form writing to it. Owner: Travis. That passed.

## Exact working prompt

```text
Create a phased Company OS roadmap from this current-state map: [paste]. Rank opportunities by value, risk, effort, dependency, data readiness, and adoption. Return 30-day, 60-day, 90-day, and later phases with deliverables, owners, acceptance criteria, and stop rules.
```

## Guided practice

1. Run the prompt with your current-state map in the bracket and your matrix and workflow names under it.
2. Check the 30-day phase against one rule: does every item fix or protect the source of truth? Move anything that does not.
3. In the Phased roadmap section of the workbook, write one measurable acceptance test and one stop rule for every deliverable.
4. Publish the roadmap in Notion or ClickUp where the whole team can see it.
5. Pick the first two-week cycle, name the owner, and put the start and end dates on the calendar.

## Assignment and evidence

Publish the roadmap and select the first two-week build cycle.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The roadmap starts with foundations, ships useful increments, respects dependencies, and has measurable acceptance criteria.

## Common mistakes

- Control center before the tables. Fix: source of truth in phase one, always, and the cockpit in phase three.
- Sixty days of design. Fix: two-week cycles, each one shipping something a person uses that week.
- Acceptance criteria that are statuses. Fix: a yes-or-no test with a named checker and a day.
- No stop rules. Fix: write what happens on no, starting with "if nobody uses it in two weeks, stop and find out why."
- Quick wins that make new copies. Fix: a quick win logs to the source of truth or it waits.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Foundation to optimization roadmap.
**Screen recording:** The roadmap board in ClickUp with four phase columns, dragging the control center card from the 30-day column to the 90-day column and the leads table card to the top, then the first two-week cycle placed on the calendar with an owner.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Phased roadmap.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

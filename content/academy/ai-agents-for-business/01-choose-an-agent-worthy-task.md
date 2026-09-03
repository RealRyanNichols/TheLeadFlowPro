# AG L01: Choose an Agent-Worthy Task

## What you will finish

Select repeatable, bounded work where assistance creates value without unsafe autonomy. When you are done you will have a scored list of your own tasks with one of them circled, a written reason it qualifies, and a person's name next to it.

## Why this matters

Most owners meet AI agents the wrong way around. They see a demo of an agent booking flights and answering customers, and they ask "what could this do for me?" That is the wrong question. The right question is "what do I already do the same way forty times a month?"

Here is the scene. A roofing office in Henderson gets thirty emails a day. Half are supplier notices, a few are homeowners asking for estimates, one is the insurance adjuster, and one is a scam invoice. The office manager sorts them by hand every morning. It takes forty minutes, and the estimate requests still sit until she gets to them. That sort is agent-worthy. Deciding which roof to replace is not.

Picking the wrong task is how people get burned. They point an agent at something that needs judgment, it makes a bad call at 2 a.m., and now they are cleaning up a customer relationship instead of saving time.

This lesson comes first because everything after it depends on the task being bounded. The contract, the context, the tool loop, the approvals. You cannot write a boundary around a job you have not measured.

## The lesson

I score every candidate task on the same seven things: repetition, input quality, decision risk, action risk, reversibility, review cost, and business value. Then I put it in one of four buckets: assist, draft-only, approval-gated action, or human-only. Let me walk you through how I get there.

### 1. Measure repetition

Start with a count, not a feeling. Pull up last month and count how many times the task happened. Emails triaged. Quotes written. Follow-ups sent. Weekly reports built.

If a task happens fewer than ten times a month, do it by hand. The agent will cost you more setup time than it saves. Twenty-plus times a month with the same shape each time, now we are talking.

Then look at the inputs. Does the task start from something you can point at? A form submission in Supabase, an email in a shared inbox, a row in a ClickUp list. Or does it start from "whatever Dale remembers from the truck"? Reliable inputs are half the job. If the input lives in someone's head, fix that first. The Lead Capture System course (OA04) exists for that reason.

What good looks like: "We got 62 estimate requests last month through the website form. Every one has a name, phone, address, and a photo." What the mistake looks like: "We answer a lot of questions." That is not a task. That is a feeling about your week.

Quick example. A detailer in Tyler wants an agent to "handle customer service." I ask him to count. He gets 14 booking questions a week by text, all through Quo, all asking about price and availability for the same four packages. That is the task. Not customer service. Answering package questions.

If you are not sure where your repetition is, run the Business Growth Diagnostic at /diagnostic first. It will show you where the time goes.

### 2. Bound the decision

Now split the task into the decision and the action. The decision is the judgment call. The action is what touches the outside world.

Ask two questions. How bad is it if the decision is wrong? How bad is it if the action happens when it should not?

Labeling an email "estimate request" and being wrong costs you nothing. The person reads it anyway. Sending a quote with the wrong price costs you money or a customer. Charging a card is worse. Deleting a record is worse still.

Then ask about reversibility. Can you undo it in five minutes with no one noticing? A draft in a folder is fully reversible. A text message that went to a customer is not.

Now bound it. Write the task so it stops before the risky part. "Draft the quote" instead of "send the quote." "Sort the inbox and flag anything that looks like money" instead of "answer the inbox." "Build the weekly report from the exported numbers" instead of "decide what we do about the numbers."

This is where the four buckets come from. Assist means the agent helps a person who is doing the task live. Draft-only means the agent produces something and a person decides what to do with it. Approval-gated action means the agent can act, but only after a named person clicks approve. Human-only means keep AI out of it.

Here is how review cost fits. If checking the agent's work takes longer than doing the job yourself, the task fails no matter how repeatable it is. A quote drafter that produces a clean one-page draft you can check in ninety seconds is worth it. A drafter that produces four pages of filler you have to read line by line is not.

### 3. Keep a human owner

Every agent gets a name next to it. Not a department. A person.

The owner is the one who reviews the drafts, gets the escalation message, and can turn the thing off. If you cannot name the owner, the task is not ready. This is where most "set it and forget it" stories go wrong. Nobody owned it, so nobody noticed when it started doing the wrong thing.

Owner also means accountable for the output. If the follow-up drafter writes something rude, the owner's name is on it, same as if an employee wrote it. That is not a burden. That is what keeps the thing honest.

What good looks like: "Owner: Tonya, office manager. Reviews the follow-up queue in ClickUp at 8 a.m. and 3 p.m. Can pause the workflow by changing the status on the settings row." What the mistake looks like: "The team will keep an eye on it."

One more thing. The owner has to want it. If Tonya sees the agent as a threat to her job, she will find reasons it does not work. Frame it right: the agent does the sorting, Tonya does the deciding. Her judgment is the product.

Once you have a count, a bounded decision, and a name, you have an agent-worthy task. Run it through the prompt below and see if the scoring agrees with your gut. If it does not, trust the scoring and go look at why.

## Worked example

Gilmer Lawn and Landscape in Gilmer is a fictional example. Owner: Marcus. Two crews, one office phone, one shared Gmail inbox that Marcus checks from the truck.

Marcus lists six tasks he is sick of: sorting the inbox, writing mowing quotes from the website form, sending follow-up texts to people who asked for a quote and went quiet, building the Friday numbers for his bookkeeper, approving crew timesheets, and answering complaints.

He pastes the list into the prompt with a line of detail on each: how many times a month, where the input comes from, what happens if it goes wrong.

"Evaluate these business tasks for AI agent use: inbox sorting (about 400 emails a month, one shared inbox), mowing quotes from the website form (about 30 a month), follow-up texts to quiet quote requests, Friday numbers for the bookkeeper, crew timesheet approval, customer complaints. Score repetition, input quality, decision risk, action risk, reversibility, review cost, and business value. Recommend assist, draft-only, approval-gated action, or human-only."

Example output:

```text
Inbox sorting: repetition high, inputs reliable, decision risk low, action risk low if it only labels. Recommend draft-only. Label and summarize, never reply or delete.
Mowing quotes: repetition medium, inputs reliable, action risk medium because a wrong price reaches a customer. Recommend draft-only with owner review before sending.
Follow-up texts: repetition medium, action risk medium, not reversible once sent. Recommend approval-gated action, human sends.
Friday numbers: repetition low, high review cost if wrong. Recommend assist.
Timesheet approval: pay decisions. Recommend human-only.
Complaints: judgment and relationships. Recommend human-only.
```

Review against the pass standard. Inbox sorting repeats, has one reliable input, produces a reviewable output (labels and a morning summary), and Marcus is the owner. It passes. He picks it.

The one revision that made it better: the first output said "handle the inbox." Marcus rewrote it as "label every new email as estimate, customer, vendor, money, or junk, and write a five-line morning summary. Never reply, forward, or delete." Now the boundary is written down, and lesson two starts from it.

## Exact working prompt

```text
Evaluate these business tasks for AI agent use: [list]. Score repetition, input quality, decision risk, action risk, reversibility, review cost, and business value. Recommend assist, draft-only, approval-gated action, or human-only.
```

## Guided practice

1. Write down five tasks you or your office did more than ten times last month.
2. Next to each one, write where the input comes from and count last month's volume.
3. Paste the list into the prompt in ChatGPT or Claude and read the scores.
4. Pick the draft-only or assist task with the highest count and write the owner's name next to it.
5. Open /tools/missed-call-calculator and put a dollar figure on the delay that task causes today.

## Assignment and evidence

Select one low-risk workflow and write why it qualifies.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

The task repeats, has reliable inputs, produces a reviewable output, and has a named human owner.

## Common mistakes

- Picking the task you hate most instead of the one that repeats most. Fix: count first, then choose.
- Writing the task as "handle" or "manage" something. Fix: write the verb the agent does and the point where it stops.
- Starting with an action that touches customers. Fix: start with sorting, labeling, or drafting, and add actions only after lesson seven.
- Assigning the agent to "the team." Fix: one name, one review time, one way to turn it off.
- Skipping review cost. Fix: time yourself checking one output, and if it takes longer than doing the job, cut the task.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Value versus risk quadrant.
**Screen recording:** Paste the six-task list into Claude on screen, watch the scores come back, and place each task on the quadrant as its recommendation lands.
**Course map:** the course visual below anchors where this lesson sits.

![AI Agents for Business course visual](/images/academy/ai-agents-for-business.svg)

## Downloadable

[Open the AI Agents for Business workbook](/downloads/operator-academy/ai-agents-for-business-workbook.pdf)

Workbook section: OA07 Agent Workbook, Task scorecard.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

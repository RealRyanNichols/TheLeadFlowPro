# OS L01: Map the Business System

## What you will finish

See offers, channels, people, records, tools, and decisions as one connected system. When you are done you will hold a one-page current-state map of your business, built with the people who do the work, with every manual handoff, workaround, and unknown marked on it.

## Why this matters

Most owners have never seen their business on one page. They carry it in their head, and the head is full.

Here is what that looks like. A plumber in Kilgore is under a sink when the phone rings. It goes to voicemail. The office manager checks the Facebook inbox on Tuesdays. The invoice is in QuickBooks, the job notes are on a clipboard in the truck, and the customer's phone number is in three places and none of them match. Nobody is lazy. The system is invisible, so nobody can fix it.

If you skip this step, you build on top of the mess. You put the dashboard from OA09 on bad data. You automate a loop that was already broken. You buy a CRM to hold records that still live in four other tools. I have watched owners spend real money on tools that made the map worse.

This is the first lesson of the last course, and it comes first for a reason. Lesson two assigns one home for every kind of record. You cannot assign homes for records you have not found.

## The lesson

### 1. Inventory the work

Walk the business in the order money moves. Offers, customers, channels, leads, sales, delivery, support, money, people, software, documents, metrics, approvals, and pain points. That is the exact list in the prompt, and it is the order the interview will follow.

For each one, write three things. What exists, where it lives, and who touches it. "Leads: come in by phone, Facebook, and the website form. Phone leads live on a notepad. Facebook leads live in Messenger. Form leads go to an email inbox. Dana touches all three."

Do this with the people who perform the work. Not from memory in your truck. Sit with the dispatcher, the tech who has been there longest, and whoever sends the invoices. Ask them to show you their screen. The office manager has four spreadsheets you have never seen, and one of them is holding the business together.

Bring what you already built. The lead record from LC L07, the conversation log from FU L06, the agent contract from AG L02, and the metric definitions from DA L02 are all records. Put them on the map with everything else.

What good looks like: every tool you pay for is on the list with what it actually holds. Every document type. Every place a customer's name shows up, including the group text.

The mistake is inventorying the org chart instead of the work, or only the tools the owner uses. Say a lawn company in Henderson thinks it has two systems, QuickBooks and a calendar. Count the crew group text, the gate code spreadsheet, the quote template in Word, and the owner's camera roll full of before and after photos, and it is eleven.

### 2. Name the handoffs

A handoff is any place work moves from one person, tool, or record to another. Phone to voicemail. Voicemail to office manager. Office manager to CRM. CRM to estimator. Estimate to customer. Signed estimate to schedule. Schedule to crew. Crew to invoice. Invoice to bookkeeper.

Write each one the same way: from, to, how, when, and what can go wrong. Then mark whether a system does it or a person has to remember to do it. That one mark, system or person, is the most useful thing on the whole map.

Write it the way it worked last Tuesday, not the way it is supposed to work. Include the workaround. "Maria texts a photo of the estimate to Dave because the software does not sync to his phone." The workaround is not embarrassing. It is data. It tells you exactly where the system failed and a human patched it.

What good looks like: you can count the handoffs, and you know how many are manual. In most businesses I sit down with, it is more than half.

The mistake is drawing the clean version because someone might see it. Nobody is judging your business. The map is for you.

Example, fictional: a welding school in Marshall. Inquiry form to admissions email, manual. Admissions email to phone call, manual, same day if the director is not teaching. Phone call to enrollment record, manual. Enrollment to tuition payment, system, through the payment link. Payment to student portal access, system. Two of five are systems. Three depend on the director remembering.

### 3. Find the broken loops

A loop is closed when work comes back with evidence that it finished. A lead comes in, somebody replies, the reply is logged, and the lead has a next action with a date. That is closed.

A broken loop is where work goes in and nothing tells you whether it came out. The form nobody checks. The voicemail box. The "I will call them back next week" that lives in someone's head. Go down the handoff list and ask one question at each step: how would we know if this failed? If the answer is "the customer would call and complain," that loop is broken.

Rank the broken loops by what they cost. Missed lead, late invoice, unhappy customer, wasted crew day. If you want a number for the phone loop, run yours through the missed call calculator at /tools/missed-call-calculator. It is free and it takes two minutes.

Write down the unknowns too. "We do not know how many calls came from the Google Business Profile last month." "We do not know how many quotes are open right now." An unknown is a finding, not a failure. It goes on the map.

What good looks like: a short ranked list of broken loops, and a separate list of unknowns, both on the same page as the map.

The mistake is fixing while mapping. You will see something broken and want to fix it today. Do not. This map feeds lessons two, three, four, and eight. If you fix now, you fix in the wrong order, and you will do it twice. Write it down and keep going.

When you run the prompt, paste it into ChatGPT or Claude, put your business in the bracket, and answer one question at a time. Answer honestly. When you do not know, type "unknown." At the end, ask for the current-state system map and the open questions. Print both and walk them with your team.

## Worked example

Sabine Valley Plumbing in Kilgore is a fictional example. Six trucks, an owner named Travis, an office manager named Dana, and a dispatcher who is also Travis's nephew.

Travis and Dana sit at the shop after close with the prompt open in Claude:

"Interview me one question at a time to map Sabine Valley Plumbing, residential and light commercial plumbing, six trucks. Cover offers, customers, channels, leads, sales, delivery, support, money, people, software, documents, metrics, approvals, and pain points. Return a current-state system map and open questions."

It takes forty minutes. Travis answers "unknown" nine times.

Example output:

```text
Leads. Sources: Quo business line during hours, owner's cell after hours, website form (emails office@), Facebook Messenger, Google Business Profile messages.
Handoff: after-hours call to owner cell, written on a notepad, entered into the CRM by Dana on Monday. Manual. Lag up to three days.
Handoff: website form to office@ inbox, checked by Dana "when she can." Manual. No confirmation sent to the customer.
Broken loop: Google Business Profile messages. No owner. Last reply date unknown.
Broken loop: quotes sent by text from tech phones. No record of which are open.
Open question: how many after-hours calls are never written down?
```

They check it against the pass standard. Does the map reflect how work actually moves, including manual steps, workarounds, and unknowns? The first pass did not. Travis had described the process as "call comes in, goes in the CRM, dispatcher assigns it." Dana corrected him. After-hours calls go to his cell, he writes them on a notepad in the truck, and she enters what she can read on Monday.

The one revision: they added the notepad as a record on the map, marked the after-hours path as manual with a three-day lag, and wrote the open question at the bottom where it could not be ignored. That version told the truth. It passed.

## Exact working prompt

```text
Interview me one question at a time to map [business]. Cover offers, customers, channels, leads, sales, delivery, support, money, people, software, documents, metrics, approvals, and pain points. Return a current-state system map and open questions.
```

## Guided practice

1. Open the Current-state map section of the workbook and list every tool you pay for, with what it actually holds.
2. Paste the prompt into ChatGPT or Claude with your business in the bracket and answer one question at a time, typing "unknown" when you do not know.
3. Read the returned map out loud to one person who does the work and let them correct it.
4. Mark every manual handoff and every broken loop in a second color.
5. Save the map and the open questions as version one and date it.

## Assignment and evidence

Complete the current-state map with the people who perform the work.

Save the source material, the prompt, the first result, the final result, and your review notes. This is a designated deliverable lesson. Use the submission panel below to send the viewable link for review.

## Pass standard

The map reflects how work actually moves, including manual steps, workarounds, and unknowns.

## Common mistakes

- Mapping from the owner's memory. Fix: interview the three people who touch the most handoffs and let them correct you.
- Drawing the ideal process. Fix: describe last week, workarounds included.
- Leaving out the tools you do not pay for. Fix: text threads, notepads, and whiteboards are records, so put them on the map.
- Fixing while mapping. Fix: write it down, keep going, and fix in the order lesson eight gives you.
- Hiding the unknowns. Fix: "unknown" is a finding, so write it on the map where everyone can see it.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Company system landscape.
**Screen recording:** The Claude interview running one question at a time on the left half of the screen, the workbook Current-state map filling in on the right, ending on the finished map with every manual handoff circled.
**Course map:** the course visual below anchors where this lesson sits.

![The Company OS Blueprint course visual](/images/academy/company-os-blueprint.svg)

## Downloadable

[Open the Company OS Blueprint workbook](/downloads/operator-academy/company-os-blueprint-workbook.pdf)

Workbook section: OA10 Company OS Workbook, Current-state map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

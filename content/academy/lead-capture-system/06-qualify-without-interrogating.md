# LC L06: Qualify Without Interrogating

## What you will finish

Collect enough context to route a lead without making the form feel like an application for a mortgage. When you are done you will have three qualification fields on your form and a written routing rule for every answer, so each submission already knows where it goes and how fast.

## Why this matters

There are two ways to get this wrong. The first is asking nothing. Name, email, submit. Then every lead looks the same, the emergency and the tire-kicker sit in the same inbox, and the owner reads them at 9 pm and calls nobody.

The second is asking everything. A twelve-question form with budget, square footage, how did you hear about us, best time to call, and a paragraph about their goals. That form feels like a mortgage application, and people treat it like one. They leave.

Here is the scene. An HVAC company in Henderson gets a form submission at 2 pm on a Friday in July. "Interested in your services." No idea whether the AC is dead or they are pricing a replacement for next spring. The tech is on a job. The message sits until Monday. By Monday the lead has called someone else, because their house was 88 degrees all weekend.

One question would have fixed that. "What is going on?" with four choices. That is what qualification is. Not a profile. Just enough to know what to do next, and who should do it.

## The lesson

### 1. Ask only actionable questions

A question earns a place on the form only if the answer changes something. Routing: who gets it. Priority: how fast. Follow-up: what they receive. If the answer would not change any of those three, do not ask.

Run the prompt with your offer filled in. It returns five short questions, answer choices, the decision each answer affects, and which questions can wait until later. Read the "can wait" list carefully. Those go on the call, or the intake after they book, not the lead form.

The three that survive are usually some version of: what do you need, how soon, and one fit question specific to your business. Service area for a plumber. Day or night for a school. Home or business for a cleaning company.

What good looks like: three questions, each with a rule you can say out loud. "If they pick emergency, I get a text within five minutes." The mistake people make: asking "how did you hear about us" out of habit. The lead record in lesson seven captures that from the link they clicked. Do not make the buyer do your tracking for you.

Example: the Henderson HVAC company's five drafted questions included "square footage of your home." Nice to know. Changes nothing before the visit. Cut.

### 2. Use answer ranges

Never make the buyer type a number they have to think about. Give ranges, and give three or four choices, not eight.

Timeline: "Today, this week, this month, just planning." Budget, if you must ask, as a range: "Under $500, $500 to $2,000, over $2,000, not sure yet." Size: "1 to 5 employees, 6 to 20, more than 20." Every range is a tap, not a math problem.

Ranges protect the buyer and you. A budget range tells you which tier to talk about. An exact budget is a negotiation the buyer did not agree to have on a web form. And "not sure yet" is a real answer. Give them that option, always, so nobody lies to get past the field.

One plain rule for this whole lesson. The questions are about the job, never about the person. Nothing about age, family, health, personal income, religion, disability, or where they were born. If a question could be used to sort people instead of jobs, it goes.

What good looks like: every question answered with one tap on a phone. The mistake people make: a required free-text "describe your project." Free text cannot route. Use choices, then give an optional short notes box.

Example: a Longview bookkeeping coach asked "annual revenue" as a blank text field. She changed it to four ranges plus "prefer not to say." The field started getting answered instead of skipped.

### 3. Route based on declared need

Now write the rule for each answer. This is the part most people skip, and it is the whole point. A question without a routing rule is trivia.

Write it one line per answer. "What is going on: no cool air, routes to the on-call tech by text, priority now. Strange noise, routes to owner, priority today. Maintenance, routes to office email, priority this week. Replacement quote, routes to owner, priority this week, plus the replacement guide email."

Then the fit question. "Service area: inside the list, proceed. Outside, send the polite decline with the two companies we refer to." A decline with a referral is still good service, and it keeps your queue clean.

Where does the routing actually happen? For version one, it is you, reading the record from lesson seven every morning and following the rule. Later it can be an automation in the form tool, a Supabase trigger, or a ClickUp rule that assigns the task. Do not automate a rule you have not run by hand for two weeks. You will learn things.

What good looks like: every answer choice on the form appears in the routing table with a person and a speed next to it. The mistake people make: routing everything to the owner's phone, which is the same as routing nothing.

Example: the HVAC company's "just planning" answer used to hit the tech's phone right alongside emergencies. Now it goes to a three-email sequence about replacement timing, and the tech never sees it. Emergencies get the tech. Planners get the emails. Both get what they asked for.

Before you leave this lesson, run your own numbers through /tools/missed-call-calculator. The emergency answer is the one you cannot afford to route slowly, and that tool puts a number on it.

## Worked example

Henderson Home Comfort is a fictional example. AC repair, maintenance plans, and system replacement, two techs and an owner who also runs dispatch. Their lead magnet is the "Summer AC Health Check," a ten-minute walk-around with a score.

The owner ran the lesson prompt with the bracket filled in:

"Create five short qualification questions for AC repair and replacement in Rusk County. Each answer must change routing, priority, or follow-up. Provide answer choices, the decision each answer affects, and which questions can wait until later."

Example output:

```text
Q1. What is going on? No cool air / Strange noise or smell / Routine maintenance / Replacement quote. Affects: who is assigned and how fast.
Q2. How soon do you need this? Today / This week / This month / Just planning. Affects: priority and which follow-up they get.
Q3. Where is the home? Henderson / Kilgore / Tyler / Other. Affects: accept, or decline with a referral.
Q4. Do you own or rent? Affects: whether a landlord has to approve the work. Can wait until the call.
Q5. Approximate age of the system? Under 10 / 10 to 15 / Over 15 / Not sure. Affects: repair versus replace conversation. Can wait until the visit.
```

Review against the pass standard. Does every question change a real action? Questions one through three do. Four and five are useful but can wait, so they come off the form and onto the call sheet. Any sensitive or discriminatory profiling? None. Every question is about the job, the timing, or the address.

The one revision that made it better: the owner rewrote the routing rule for "No cool air" plus "Today." It had said "call them back." Now it says "text the on-call tech through Quo within five minutes, and the tech calls the customer within the hour." A rule with a person and a clock on it.

## Exact working prompt

```text
Create five short qualification questions for [offer]. Each answer must change routing, priority, or follow-up. Provide answer choices, the decision each answer affects, and which questions can wait until later.
```

## Guided practice

1. Run the exact prompt with your offer filled in.
2. Cross out every question whose answer would not change who gets the lead, how fast, or what they receive.
3. Turn each surviving question into three or four range choices, including "not sure yet" where it fits.
4. Write one routing line per answer choice: who, how fast, and what they receive.
5. Add the three fields to your form and put the routing table in the Qualification map section of the workbook.

## Assignment and evidence

Add three qualification fields and write the routing rule for each.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Every question changes a real action and avoids sensitive or discriminatory profiling.

## Common mistakes

- Asking questions that change nothing. Fix: if the answer does not change who, how fast, or what, cut it.
- Exact numbers instead of ranges. Fix: three or four choices plus "not sure yet."
- A required free-text project description. Fix: choices route, free text does not; make notes optional and short.
- Questions about the person instead of the job. Fix: job, timing, location, fit. Nothing else.
- Routing everything to the owner's phone. Fix: a person and a speed for each answer, and an email sequence for the planners.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Question to route map.
**Screen recording:** The five drafted questions on screen, two being crossed out, then the three-column routing table being filled in next to the live form fields.
**Course map:** the course visual below anchors where this lesson sits.

![The Lead Capture System course visual](/images/academy/lead-capture-system.svg)

## Downloadable

[Open the Lead Capture System workbook](/downloads/operator-academy/lead-capture-system-workbook.pdf)

Workbook section: OA04 Lead Capture Workbook, Qualification map.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

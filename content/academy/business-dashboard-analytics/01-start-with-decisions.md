# DA L01: Start With Decisions

## What you will finish

Choose metrics only after naming the decisions the dashboard must support. When you are done you will have a one-page decision register: ten decisions you already make every week, who makes each one, the number they look at, the line that triggers action, and where that number lives.

## Why this matters

Most dashboards get built backwards. Somebody opens an analytics tool, sees forty charts, and picks the ones that look impressive. Six weeks later nobody opens it, because none of those charts tell anyone what to do on Monday.

Here is the scene. A roofer in Marshall pays for a reporting tool. It shows sessions, bounce rate, time on page. His actual question is whether to keep the Meta ad running this week, and the tool cannot answer it. So he guesses, same as before, and keeps paying for the guess.

I run my own scoreboard at /scoreboard. Views, clicks, leads, paid leads, unpaid leads, per business, on rolling windows. It shows real numbers only, and when a source has not reported it says "unavailable." It has five numbers because it exists to answer a handful of questions, not to look busy.

That is why this lesson comes first. Lesson two writes formulas. Lesson three finds the data. If you skip the decisions, you will write formulas for numbers nobody needs. If you finished the Local Ads Operator, bring the weekly decision note from AD L08. Several of your decisions are already in it.

## The lesson

### 1. List recurring decisions

Start with the calendar, not the data. What do you decide every week whether or not you have numbers? Do I keep or pause the ad. Who gets called back first. Do I need another crew day. Do I chase the invoice. Which page on the site gets fixed next.

Do this out loud with ChatGPT or Claude. The prompt at the bottom of this lesson interviews you one question at a time. Answer like you are talking to me across the tailgate. "I pay for Meta ads and I never know if they are working." That is a decision waiting to be written down: keep, cut, or fix the ad this week.

What good looks like: ten decisions that actually happen. Not "grow revenue." That is a wish. "Decide Monday whether the ad set keeps its budget" is a decision.

The mistake is listing metrics instead of decisions. "Website traffic" is not a decision. If you cannot finish the sentence "when this number does X, I will do Y," it does not belong in the register yet.

Example: a lawn care owner in Gilmer listed "Instagram followers." I asked what he does differently when it goes up. Nothing. Cut. He replaced it with "do I add a mowing route on Thursdays," which depends on booked recurring customers, a number he can act on.

### 2. Name the owner

Every decision gets one name. Not "the office." Not "we." A person who looks at the number and either acts or explains why not.

For a solo operator that is you ten times. Fine. Write your name anyway, because in six months you will hand some of these off, and the register is the hand-off document.

The owner also sets the frequency. If the owner only sees the number monthly, it is a monthly decision. If the phone rings during a job and the callback has to happen within the hour, that decision is daily, and it probably belongs on somebody's phone, not a dashboard.

Next to every row, write the data source. Where will the owner actually look? The Supabase leads table. The Quo call log. The Search Console export. The Stripe dashboard. A Google Sheet. If you do not know yet, write "unknown." Lesson three fixes unknowns. Do not fake a source.

What good looks like: a name, a frequency, and a source on every row.

The mistake is assigning the decision to the person who is best at spreadsheets instead of the person who can act. The office manager can read the missed call count, but if only the owner can change the phone routing, the owner owns the decision.

### 3. Define the action threshold

This is the part everybody skips, and it is the whole point. A threshold is the line where the number stops being information and becomes an instruction.

Write it as a plain rule. "If missed calls in the last seven days is above five, turn on the missed-call text in Quo and call every one back the same day." "If unpaid leads in the last thirty days drops below ten, check the site tracking before touching anything else." "If booked jobs for the next two weeks are over ninety percent of crew capacity, pause the ad."

Two rules for good thresholds. First, use a window, not a single day. One bad Tuesday is noise. Seven days is a signal. Second, name the action and its first physical step. "Look into it" is not an action. "Open Ads Manager and pause the ad set" is.

You will not get the threshold exactly right the first time. Set it from what you know today. Say the average job is worth $400 as an example, so you care when leads drop by more than three in a week. Adjust after four weeks of real numbers.

The mistake is setting a threshold you would not actually act on. If the ad has to lose money for a month before you would pause it, write that. An honest threshold you follow beats a strict one you ignore.

If you want a shortcut to the money side, run the Business Growth Diagnostic at /diagnostic. It asks the same kinds of questions I am asking here and gives you starting numbers for capacity and follow-up.

When the ten rows are filled in, read them back as sentences. "Every Monday, Dale looks at qualified leads over the last seven days from the Supabase leads table. If it is under six while the ad is running, he pauses the ad set and checks the landing page." If every row reads like that, you are done.

## Worked example

Pine Ridge Roofing in Marshall is a fictional example. Owner Dale runs two crews, pays for Meta ads, and answers the phone from the roof.

Dale ran this in ChatGPT:

"Interview me one question at a time to identify the weekly decisions for Pine Ridge Roofing, a two-crew residential roofing company in Marshall, Texas. Then return a decision register with owner, frequency, input metrics, threshold, action, and data source."

He answered eleven questions. Two of his answers: "I never know if the ads are worth it" and "I lose calls when I am on a roof."

Example output:

```text
Decision register (excerpt)
1. Keep or pause the Meta ad set | Owner: Dale | Weekly, Monday | Metric: qualified leads, last 7 days, paid source | Threshold: under 4 for two weeks running | Action: pause the ad set, review the landing page | Source: Supabase leads table
2. Who gets called back first | Owner: Dale | Daily, 5 pm | Metric: leads with no contact over 24 hours | Threshold: any | Action: call before leaving the job site | Source: leads table, status field
3. Add a third crew day | Owner: Dale | Weekly | Metric: booked jobs next 14 days vs capacity | Threshold: over 90 percent | Action: schedule a Saturday crew | Source: ClickUp job board
4. Chase unpaid invoices | Owner: Dale | Weekly, Friday | Metric: invoices unpaid over 14 days | Threshold: any over $1,000 | Action: text, then call | Source: Stripe
7. Website traffic | Owner: Dale | Monthly | Metric: sessions | Threshold: none | Action: monitor | Source: unknown
```

Review against the pass standard: every metric is tied to a decision, owner, and action. Rows one through four pass. Row seven fails. "Monitor" is not an action, there is no threshold, and the source is unknown.

The one revision: Dale replaced row seven with "which page do I fix next." Metric: pages with views but zero clicks to call or form over 30 days. Threshold: any page over 50 views. Action: rewrite the call to action on that page. Source: page_events table. Now the number does something, and the register has ten rows that each end in a verb.

## Exact working prompt

```text
Interview me one question at a time to identify the weekly decisions for [business]. Then return a decision register with owner, frequency, input metrics, threshold, action, and data source.
```

## Guided practice

1. Open ChatGPT or Claude, paste the prompt, and replace [business] with your company name, town, and what you sell.
2. Answer every question with what you actually decide, not what you wish you tracked.
3. Read the register it returns and delete any row where the action is "monitor" or "review."
4. Add a threshold to every remaining row using a seven-day or thirty-day window.
5. Copy the ten rows into the Decision register section of the workbook.

## Assignment and evidence

Create a register of ten recurring decisions.

Save the source material, the prompt, the first result, the final result, and your review notes.

## Pass standard

Every metric is tied to a decision, owner, and action.

## Common mistakes

- Listing metrics first. Fix: start from what you decide on Monday, then find the number that decides it.
- "Monitor" as an action. Fix: write the physical first step, like "pause the ad set in Ads Manager."
- Thresholds on a single day. Fix: rolling seven-day or thirty-day windows, so one slow Tuesday triggers nothing.
- No owner. Fix: one name per row, even if every name is yours.
- Faking the data source. Fix: write "unknown" and carry it into lesson three.

## Recording plan

**Target runtime:** 5 to 8 minutes.
**Primary visual:** Decision before metric chain.
**Screen recording:** Run the interview prompt live in ChatGPT for the fictional roofer, paste the register into the workbook, and cross out the "monitor" row on camera before rewriting it.
**Course map:** the course visual below anchors where this lesson sits.

![Business Dashboard and Analytics course visual](/images/academy/business-dashboard-analytics.svg)

## Downloadable

[Open the Business Dashboard and Analytics workbook](/downloads/operator-academy/business-dashboard-analytics-workbook.pdf)

Workbook section: OA09 Analytics Workbook, Decision register.

## Lesson check

Complete the practice, mark the assignment, and score at least 80 percent on the objective lesson check. Retakes are allowed. Major builds and capstones require reviewer approval before the completion credential can be issued.

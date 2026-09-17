import type { Article } from "./articles";

export const DAILY_ARTICLES: Article[] = [
  {
    slug: "locksmith-after-hours-calls",
    title: "How much business does a locksmith lose after hours?",
    description:
      "Check your locksmith call log, separate urgent jobs from routine requests, and use the free calculator to plan after-hours coverage without promising more work.",
    publishedAt: "2026-09-07",
    readingMinutes: 7,
    ogImage: "/og/tools/after-hours-lead-calculator.jpg",
    tool: {
      slug: "after-hours-lead-calculator",
      heading: "Put a number on your after-hours gap",
      intro:
        "Use your own call records to compare a scenario. The calculator cannot tell you whether a locked-out caller will wait, whether a technician is available, or whether a job will be profitable.",
      steps: [
        {
          name: "Count genuine inquiries",
          text: "Use Total leads a month for unique customer requests, not every phone ring. For Share that come in after hours, count requests outside the hours someone can actually help. Separate repeat calls and spam first.",
        },
        {
          name: "Separate known losses from unanswered questions",
          text: "Of those, how many you lose today is a percentage of after-hours inquiries. A missed call alone does not prove a lost job. Mark outcomes you cannot confirm as unknown and try more than one estimate.",
        },
        {
          name: "Treat the auto-reply input as an assumption",
          text: "How many an instant auto-reply holds applies to the inquiries you estimated were lost. It is not a guaranteed success rate. Urgent lockouts may need a person immediately. Include a zero-effect case in your decision even though the slider begins above zero.",
        },
        {
          name: "Use matching job values and close rates",
          text: "For Value of a customer, use one completed job's collected revenue for this exercise. Use Close rate for the share of retained inquiries that become completed jobs. Mixing lifetime customer value with one-job revenue will inflate the result.",
        },
      ],
      readIt: [
        "The labels about recoverable revenue describe the scenario entered, not money already lost or guaranteed to return. The annual figure multiplies the monthly estimate by twelve.",
        "The result is revenue before labor, parts, travel, payment fees, and coverage costs. It is not profit or a reason by itself to buy software.",
        "A saved inquiry still needs a suitable service, an available technician, an agreed price, and a completed job. An automatic acknowledgment does not establish any of those.",
      ],
      formHeading: "Where does your after-hours handoff break?",
      formLead:
        "Tell us whether the problem is answering, scheduling, or keeping track of requests. Share totals and the process, not customer addresses, access codes, or private call recordings.",
      interest: "blueprint",
      industry: "Locksmith services",
    },
    faq: [
      {
        q: "Does every missed locksmith call count as lost revenue?",
        a: "No. A caller may ring twice, be outside your service area, need work you do not offer, or contact you again later. Record unique inquiries and confirmed outcomes before estimating revenue.",
      },
      {
        q: "Should a locksmith advertise 24-hour availability?",
        a: "Only when the business can actually provide the availability it describes. Explain when a person can answer, when technicians can attend, and how requests outside those hours are handled. Accepting a website request is not the same as dispatching a technician.",
      },
      {
        q: "Will an automatic reply keep an emergency caller waiting?",
        a: "Do not assume it will. Someone locked out may need immediate help. An acknowledgment can explain your current availability, but it cannot confirm a technician or arrival time that your team has not checked.",
      },
      {
        q: "What if I do not know my after-hours close rate?",
        a: "Start a short review log and mark unknown outcomes honestly. Compare a cautious scenario with a more optimistic one, including the possibility that a reply retains no additional jobs. Replace assumptions with observed outcomes as you learn.",
      },
    ],
    body: `A locksmith can miss a phone call without losing a job. A locksmith can also answer a call and still be unable to help.

I would start by finding out which problem you have. Before buying an answering service or another automation, review what happens when someone needs you after hours.

You will finish with a short call review, a realistic calculator example, and a handoff your team can follow. A notebook and the business records you already use are enough to begin.

## Start with the call, not a revenue promise

Look at one recent month. Count genuine requests that arrived outside your staffed hours. Treat repeated calls about the same job as one inquiry. Remove spam and unrelated calls.

Then separate urgent requests from work that can be scheduled. A person locked outside a vehicle tonight has a different problem from a property manager asking about rekeying next week.

For each inquiry, record whether someone answered, whether your business could serve it, what happened next, and whether a job was completed. Leave the outcome unknown when you do not have evidence.

This distinction matters. If nobody was available to attend, a faster reply alone would not have produced a completed job. If a routine request got buried in voicemail, a clear acknowledgment and an assigned callback might help. Those are different fixes.

## Try a small, fictional example

The following numbers are practice inputs, not locksmith industry averages or customer results. Replace them with your own records.

- Total leads a month: **40**.
- Share that come in after hours: **30%**.
- Of those, how many you lose today: **50%**.
- How many an instant auto-reply holds: **50%**.
- Value of a customer: **$150** collected for one completed job.
- Close rate: **40%** of retained inquiries become completed jobs.

Here is the calculation: 40 inquiries × 30% gives 12 after-hours inquiries. If half were lost, that is six. If a reply retained half of those six, you would have three additional conversations. A 40% close rate models 1.2 completed jobs, giving **$180 a month** in additional revenue before costs.

The fraction is a planning average, not a promise of part of a job. Multiplying $180 by twelve produces **$2,160 a year**, but only if the same assumptions hold every month.

The tool uses optimistic output labels such as “Recoverable every year.” Read those as a scenario. There is no evidence in this example that a reply actually retains half the inquiries. If it retains none, the additional revenue is zero.

{{TOOL}}

## Choose coverage you can actually deliver

Check three places together: your website, your voicemail greeting, and your public business hours. They should tell the same practical story.

Google lets businesses edit their main hours and set special hours for unusual schedules. Its instructions include the path through Edit profile and Hours. Use those controls to reflect your real schedule, rather than treating an always-open web form as proof that a technician is always available. [Google Business Profile: edit your business hours](https://support.google.com/business/answer/15300403?hl=en)

If you offer an evening callback but do not dispatch overnight, say that plainly. If an on-call technician must first confirm availability, your reply should explain that an inquiry is being reviewed. Do not insert an arrival time, price, or coverage promise that nobody has checked.

Give the next action to a named person or shift. “Somebody checks voicemail in the morning” is hard to inspect. “The opening dispatcher reviews unanswered requests before taking new bookings” is a process you can test.

## Copy this handoff checklist

Keep this inside your authorized business records. Use a reference number in any shared review document so you do not spread customer addresses or security details around.

\`\`\`text
AFTER-HOURS INQUIRY REVIEW

Inquiry reference:
Received date and time:
Urgent request or work that can be scheduled:
Service type and area confirmed:
Available technician confirmed: yes / no / not checked
What we actually told the customer:
Owner of the next action:
Next action and review time:
Outcome: completed / declined / customer went elsewhere / unknown
Collected revenue, if completed:
Contact preferences or do-not-contact restriction:

Before replying:
[ ] Check what has already been said.
[ ] Confirm the service and current availability.
[ ] Make no unsupported price or arrival-time promise.
[ ] Give one clear next step.
[ ] Save the outcome in the existing business record.
\`\`\`

A review time is a reminder to inspect the record. It is not an instruction to keep sending messages. Respect the person's preferences and any request to stop contact.

## Check whether the change helped

Try one change you can maintain: clearer hours, a staffed callback window, or a better handoff for routine requests. Review another comparable period using the same definitions.

Count completed jobs and collected revenue separately from inquiries and replies. Compare the extra work with the actual cost of providing coverage. A holiday week, weather event, or different ad schedule can change the mix of calls, so avoid attributing every difference to your new process.

You do not have to become a software expert to do this. Start with your own records, find the point where the request stalls, and fix that step first.

If the handoff needs help, [find your next business step](/start). If you want to run the numbers again later, save the [After-Hours Lead Calculator](/tools/after-hours-lead-calculator).
`,
  },
  {
    slug: "insurance-agent-lead-response",
    title: "How fast should an insurance agent respond to a lead?",
    description:
      "Review your insurance agency's first replies, find the handoff that stalls, and use a simple response template and calculator to plan a better process.",
    publishedAt: "2026-09-08",
    readingMinutes: 7,
    ogImage: "/og/tools/lead-response-time.jpg",
    tool: {
      slug: "lead-response-time",
      heading: "Explore a reply-time scenario",
      intro:
        "This calculator applies a fixed mathematical model to your inputs. It does not use insurance industry data or your agency's actual conversion history. Use it to explore a question, then check your records before making a decision.",
      steps: [
        {
          name: "Count distinct inquiries",
          text: "Leads per month means separate new-business inquiries for this exercise. Remove spam and repeat messages about the same request. Keep existing-customer service requests in a separate review.",
        },
        {
          name: "Measure a helpful reply",
          text: "For Hours before you usually reply, measure from receipt to a person reviewing the request and giving a useful next step. An automatic receipt is a different event. The slider uses whole hours, so keep exact minutes in your own log.",
        },
        {
          name: "Keep the value definition consistent",
          text: "Average job value is a generic field. For an agency scenario, use an estimate of revenue the agency retains per completed sale for a defined period. Do not enter a customer's premium as though all of it were agency revenue. Leave out future renewals you cannot support.",
        },
        {
          name: "Label an estimated close rate",
          text: "Your close rate when you do reply fast is an assumption unless you have comparable records. Use the same definition of a completed sale and the same period as your value input. Try more than one scenario if you do not know the rate.",
        },
      ],
      readIt: [
        "The tool's label Lost every year to slow replies is a modeled difference, not a measurement of money your agency lost. Its fixed curve cannot show what caused an actual outcome.",
        "Five minutes is the model's comparison point, not a verified insurance benchmark, required response deadline, or promise that a quick reply wins a customer.",
        "The result excludes staffing costs and other expenses. An automatic acknowledgment, a useful conversation, a quote, and a completed sale are separate steps.",
      ],
      formHeading: "Where does a new inquiry get stuck?",
      formLead:
        "Tell us whether the gap is seeing the message, assigning it, or making the next step clear. Describe the process without including policy numbers, applications, or private customer records.",
      interest: "blueprint",
      industry: "Insurance agencies",
    },
    faq: [
      {
        q: "Does the first reply have to include an insurance quote?",
        a: "No. A helpful first reply can confirm that a person reviewed the request and explain the next step. Do not rush an unverified price or coverage statement into a message to meet an internal response target.",
      },
      {
        q: "Should an automated acknowledgment count as a response?",
        a: "Track it separately from the first helpful human reply. A receipt can say that the message arrived, but it does not prove anyone reviewed the request, confirmed availability, or prepared a quote.",
      },
      {
        q: "What if one agent cannot watch the inbox all day?",
        a: "Choose realistic review windows and a named backup for times when the owner is unavailable. Set expectations around that schedule. A shared inbox still needs clear ownership so two people do not reply while another inquiry receives no response.",
      },
      {
        q: "Does a faster reply prove that more policies will be sold?",
        a: "No. The person's needs, available products, price, service, and other factors affect the outcome. Track response time and completed sales separately, and mark outcomes unknown when you cannot confirm them.",
      },
    ],
    body: `When someone asks your insurance agency for help, the first useful answer may be simple: your request reached a person, here is who is handling it, and here is what happens next.

That is a process you can improve without buying another system. I would start with three recent inquiries and look for the point where each one waited.

You do not need to be a technology expert. You need the received time, the first helpful reply, and a clear owner.

## Define the reply before you measure it

For this exercise, a helpful first reply means a person reviewed the request and gave a relevant next step. It might offer a time to talk or explain how to provide information through your agency's approved process.

It does not have to include a quote. It should not promise a price, eligibility, or coverage that has not been confirmed.

Track an automatic acknowledgment separately. “We received your message” can set an expectation, but it does not tell you whether a person has started helping. Record quote preparation and completed sales as later events, too.

Choose a response target your team can maintain during its stated working hours. Use your own staffing and inquiry records to set it. Do not borrow a five-minute slogan and turn it into a promise your office cannot keep.

## Read three fictional inquiry records

These practice records are invented to show the method. They are not customer results or an industry average. All three arrived during the same fictional office day.

- Inquiry A arrived at **9:10 a.m.** A helpful reply went out at **9:20 a.m.** The wait was **10 minutes**.
- Inquiry B arrived at **11:00 a.m.** A helpful reply went out at **12:20 p.m.** The wait was **80 minutes**.
- Inquiry C arrived at **2:30 p.m.** A helpful reply went out at **2:45 p.m.** The wait was **15 minutes**.

The total wait is 105 minutes. Divide by three and the average is **35 minutes**. Put the waits in order, 10, 15, 80, and the middle value is **15 minutes**.

Both numbers are correct, but neither explains the long wait. Open inquiry B's record and ask what happened. Was the message unseen? Was the owner unavailable? Did two people each think the other had it?

Do not count an unanswered inquiry as a zero-minute reply or quietly leave it out. Put it in an unanswered group with its current age. Keep after-hours inquiries separate so the review reflects when somebody could actually respond.

## Use the calculator as a question, not a verdict

The free calculator below compares a reply-time scenario with roughly five minutes. It applies the same fixed curve to every business. It has no evidence that this curve describes your agency.

For a fictional practice run, enter **20** leads, **2** hours, **$200** average job value, and a **25%** fast-reply close rate. The $200 is an invented agency-revenue input for the exercise, not a premium, commission estimate, or insurance recommendation.

Those inputs display about **$270 a month** and **$3,236 a year** in modeled difference. The annual display uses the unrounded monthly calculation, which explains why multiplying the rounded $270 by twelve gives a different total.

That is not money your agency has been shown to lose. A larger calculator number does not prove that staffing, software, or automatic replies will recover it. Your own records must answer whether the process change helped.

{{TOOL}}

## Give the inbox a person and a backup

Start with the system your team already uses. For an agency using Microsoft 365, Outlook shared mailboxes let a group monitor messages and reply from a shared address. An administrator must create the mailbox and add its members before they can use it. [Microsoft: open and use a shared mailbox in Outlook](https://support.microsoft.com/en-us/outlook/sharing/open-and-use-a-shared-mailbox-in-outlook)

Sharing access does not assign the work. Decide who owns each inquiry, when that person will review it, and who takes over if they are unavailable. Read the existing conversation before replying so the customer does not have to start over.

If you work alone, your backup can be a scheduled review window you can honestly maintain. Make your public hours and reply expectations match that reality.

## Copy this into your existing process

Use an inquiry reference in the handoff. Keep sensitive documents in the agency's approved system rather than pasting them into a shared checklist or AI prompt.

\`\`\`text
INQUIRY HANDOFF

Inquiry reference:
Received date and time:
Request in one sentence:
Owner:
Backup or next review window:
First helpful reply sent at:
Next action and due time:
Contact preference or stop-contact instruction:
Outcome: open / completed / declined / unknown

FIRST-REPLY STARTER

Hi [first name], thank you for reaching out about
[their request]. I'm [name], and I'll help with
the next step.

[One confirmed next step, such as an available
time to talk or your approved intake process.]

[If needed, state when you will check back.
Only include a time you can actually meet.]
\`\`\`

Fill in the brackets and review the message before sending. The template does not authorize a quote, confirm coverage, or replace your agency's review process.

At the end of the week, count unanswered inquiries, completed handoffs, and missed review times. Pick one gap to fix. You can improve a small process at any age and with the tools you already know.

For the next step, use the [inquiry ownership checklist](/articles/give-every-inquiry-an-owner-and-next-step). If your team needs help making that process work, [find your next business step](/start).
`,
  },
  {
    slug: "handyman-job-pricing",
    title: "How should a handyman price a job?",
    description:
      "Price one real handyman job from your own materials, hours, drive time, overhead, and profit with the free Job Price Calculator, then check the quote.",
    publishedAt: "2026-09-17",
    readingMinutes: 7,
    ogImage: "/og/tools/job-price-calculator.jpg",
    tool: {
      slug: "job-price-calculator",
      heading: "Price one real job with your own numbers",
      intro:
        "Pick a job you finished recently and enter what it actually took. The calculator builds a quote from your inputs. It cannot tell you what a customer will accept, what a competitor charges, or whether a job will go smoothly.",
      steps: [
        {
          name: "Enter the real materials, then the waste",
          text: "Materials cost is what you paid, including the extra trip to the supply house. Material waste and returns covers the offcuts, the wrong-size part, and the piece you bought twice. If you do not track it, start with a modest percentage and correct it after the next few jobs.",
        },
        {
          name: "Count crew hours and use the loaded cost",
          text: "Crew hours on the job is the time on site doing the work. Loaded cost per crew hour is what an hour of that person costs you with taxes, insurance, and workers comp included, not the wage you tell them. If you work alone, use what you need to earn for an hour of your own labor, not zero.",
        },
        {
          name: "Add the hours the customer never sees",
          text: "Drive and setup hours covers the trip there and back, unloading, protecting the floor, and cleanup. Handymen lose money here more than anywhere else because these hours are real and nobody writes them down.",
        },
        {
          name: "Set overhead and profit as separate lines",
          text: "Overhead you add to every job is the share of your truck, tools, phone, insurance, and software that this job has to carry. Profit you want on this job is a separate decision. Profit is what is left after every cost, including your own labor, so do not treat it as your pay.",
        },
      ],
      readIt: [
        "Quote this job at is a floor built from the numbers you entered. It is not a market price, and it is not proof that a customer will say yes.",
        "Effective rate divides the quote by the total hours, including drive and setup. Compare it with what you thought you were earning per hour. The gap is usually the hours you were not charging for.",
        "If the verdict warns that profit is under 10 percent, one bad afternoon on that job erases the profit. Fix the inputs or the scope before you fix the price.",
      ],
      formHeading: "Which part of your pricing do you not trust?",
      formLead:
        "Tell us whether it is materials, hours, overhead, or the profit line, and roughly what the calculator showed. Share totals and your process, not customer names, addresses, or invoices.",
      interest: "blueprint",
      industry: "Handyman services",
    },
    faq: [
      {
        q: "Should a handyman charge by the hour or by the job?",
        a: "Quote the job, price it by the hour. The customer wants one number for the work. You need to know what an hour has to earn so the number you give is not a loss. Build the job price from your hours and costs, then present the total with the scope.",
      },
      {
        q: "What counts as overhead for a one-person handyman business?",
        a: "Anything you pay whether or not you work this week: truck payment and fuel, insurance, phone, tools and their replacement, licenses, software, and the time you spend quoting and invoicing. Add those up for a month, divide by the job revenue you expect that month, and you have a starting overhead percentage.",
      },
      {
        q: "Should I charge for drive time?",
        a: "The customer is paying for it whether you show it or not. Most handymen fold drive and setup into the job price rather than listing it, and some use a minimum charge or trip fee for small jobs. Whichever you choose, count the hours in your price. Leaving them out is how a $50 an hour day turns into $30.",
      },
      {
        q: "What do I say when a customer says another handyman is cheaper?",
        a: "Nothing defensive. Restate the scope, what is included, and how you handle problems. Your price came from real costs and a profit you decided on. If the other quote is far below your cost, either they scoped less, they will not finish, or they are working for less than it costs them. None of those are reasons to price your own job at a loss.",
      },
    ],
    body: `Most handymen I talk to price a job the same way. They add up the materials, guess the hours, put a little on top, and find out at the end of the month that the work paid less than it should have.

The guess is the problem. Not the customer, not the market.

I want you to price one job the honest way, with your own numbers, and see what comes out. You will finish with a worked example, the calculator, and a short checklist you can use on the next quote.

## Start with a job you already finished

Pick a recent job you know well. Not your best one. A normal one.

Write down what you actually spent on materials, including the extra trip to the supply house. Write down the hours on site. Then write down the hours nobody paid for: the drive there and back, unloading, protecting the floor, cleanup, and the second trip for the part you forgot.

Now add what an hour of your labor costs. If you have a helper, use what that hour costs you loaded, with taxes and insurance, not the wage. If you work alone, decide what an hour of your own work has to earn. Zero is not an answer.

Most handymen who do this find the same thing. The materials were fine. The hours on site were close. The hours off the clock were the leak.

## Try a small, fictional example

These are practice inputs, not handyman industry averages or anyone's real job. Replace them with your own.

- Materials cost: **$300**.
- Material waste and returns: **10%**.
- Crew hours on the job: **6**.
- Loaded cost per crew hour: **$35**.
- Drive and setup hours: **1**.
- Overhead you add to every job: **15%**.
- Profit you want on this job: **20%**.

Here is the math the calculator runs. Materials with waste are $300 plus 10%, which is **$330**. Labor is 6 hours on site plus 1 hour of drive and setup, 7 hours at $35, which is **$245**. Together that is $575 of direct cost. Overhead at 15% adds about **$86**, so the true cost of the job is about **$661**.

Profit is priced in, not hoped for. To leave 20% profit on the price, the calculator divides the cost by 0.8. The quote comes out at **$827**, with about **$165** of profit in it and a gross margin of **20.0%**. The effective rate is **$118.08 per hour** across all 7 hours, including the drive.

The tool rounds to whole dollars on the display, so your hand math may differ by a dollar. That is rounding, not an error.

Now change one thing. Set the profit line to 8% and leave everything else alone. The quote drops to about **$719**, and the calculator warns you that under 10% profit, one bad day on this job wipes it out. That is the number a lot of handymen have been quoting without knowing it.

{{TOOL}}

## What to do with the number

If your quote came out above what you have been charging, you have three moves.

**Raise the price on the next quote, not the last one.** You do not go back to a finished job. You price the next one from the real numbers. Present the scope and the total. Never show the cost breakdown. Customers buy the finished work, not your overhead percentage.

**Charge for the hours you were giving away.** Drive time, setup, cleanup, and the second trip are labor. Fold them into the job price, or set a minimum charge so a forty-minute job does not cost you two hours. Either way, count them.

**Drop the jobs that never pencil.** Run three or four of your regular job types through the calculator. One of them is probably underwater at any price the customer will accept. Knowing that is worth more than a better quote on it.

## Copy this quote checklist

Keep this with your estimate template. Fill it in before you send the number, not after.

\`\`\`text
QUOTE CHECK

Job:
Materials, including the supply run:
Waste and returns allowance:
Hours on site:
Drive, setup, and cleanup hours:
Loaded cost per crew hour:
Overhead percentage for this job:
Profit percentage for this job:
Calculator quote:
Minimum charge applies: yes / no

Before sending:
[ ] Every hour is counted, including the ones off the clock.
[ ] Profit is its own line, not my pay.
[ ] The scope in writing matches the price.
[ ] The customer sees scope, warranty, and price. Not the math.
[ ] Effective rate is a number I would say out loud.
\`\`\`

## Check whether the change helped

Price the next ten jobs with the calculator and the checklist. At the end of the month, compare the effective rate on those ten with the rate on the ten before. Compare the close rate too. Most handymen find that a clear scope and a real price close about as often as a guess did, and pay better when they do.

If quotes are going out and not coming back, that is a different leak. [The money is in the follow-up](/articles/the-money-is-in-the-follow-up) walks through it. If pricing and quoting are eating your evenings, [find your next business step](/start).
`,
  },
  {
    slug: "pool-service-route-capacity",
    title: "How many pools can one service route actually handle?",
    description:
      "Find the real ceiling on a pool service route from your own techs, hours, and minutes per stop with the free Job Capacity Calculator, then fill it or fix it.",
    publishedAt: "2026-09-18",
    readingMinutes: 7,
    ogImage: "/og/tools/capacity-calculator.jpg",
    tool: {
      slug: "capacity-calculator",
      heading: "Find the ceiling on your route with your own numbers",
      intro:
        "Use last week's route, not the one you hope to run. The calculator turns techs, hours, and minutes per stop into a weekly ceiling and tells you what the open slots are worth. It cannot tell you whether a new pool is close enough to keep, or what a customer will pay.",
      steps: [
        {
          name: "Count the techs who actually run the route",
          text: "Crews, chairs, bays or techs is the number of people testing water on a normal day. The truck in the yard does not count, and neither do you if you spend the day quoting and chasing chemicals.",
        },
        {
          name: "Use gate-to-gate hours and the days you really run",
          text: "Productive hours per day is the time from the first gate to the last gate, minus lunch and the shop stop. Days per week is the days the route runs, not the days you are open. A Saturday catch-up day only counts if it happens every week.",
        },
        {
          name: "Put the drive inside the stop time",
          text: "Hours per job is the minutes one stop really takes, including the drive to the next gate. The tool moves in quarter hours, so a 30 minute stop is 0.5 and a 45 minute stop is 0.75. Pool routes go over their ceiling here more than anywhere else, because the drive grows every time a pool is added on the far side of town.",
        },
        {
          name: "Enter stops made and the value of one visit",
          text: "Jobs you actually do a week is the stops with a reading logged last week. Average job value is what one visit earns: the monthly rate divided by the visits in a month. Do not enter the monthly rate itself. That one mistake makes every result four times too big.",
        },
      ],
      readIt: [
        "The capacity percentage is stops made divided by the ceiling your inputs allow. Above 100 percent means the route only fits because somebody is finishing in the dark.",
        "Open slots a week times the value of a visit times 52 is the ceiling you are not using. It is a target for the route, not money you have earned.",
        "Run it twice: once with the stop time you quote yourself and once with the real one. The gap between those two results is the honest answer.",
      ],
      formHeading: "Is your route full, or just long?",
      formLead:
        "Tell us how many stops a week you run, what the calculator said your ceiling is, and whether summer or the drive is the problem. Share route totals and your process, not customer names, addresses, or gate codes.",
      interest: "blueprint",
      industry: "Pool cleaning and service",
    },
    faq: [
      {
        q: "How many pools can one tech service in a day?",
        a: "The only number that matters is yours, and it comes from minutes per stop and the drive between gates. A tight route of small residential pools and a spread-out route of large ones can both be full at very different counts. Take last week's gate-to-gate hours, divide by the stops made, and put that in the calculator. Do not borrow a number from a forum.",
      },
      {
        q: "Should drive time between pools count as part of the job?",
        a: "Yes. The customer is not paying for the drive, but the route is spending it. Count the time from one gate to the next as part of the stop. If you keep drive time out, the calculator will tell you there is room on a route that already runs past dark.",
      },
      {
        q: "How do I count biweekly pools, one-time cleanups, and repairs?",
        a: "Count what was actually done last week. A biweekly pool that was visited is one stop, and one that was skipped is zero. A green-to-clean or a pump swap is a job with its own hours, so either enter it at its real time or run those jobs separately. Mixing a two-hour repair into a thirty-minute stop average hides both problems.",
      },
      {
        q: "Should I keep adding pools in summer if the route is at capacity?",
        a: "Not without a plan for the minutes. Summer stops run longer, with more debris, more chemistry, and more traffic between gates, so a route that fit in April is over in July. Run the calculator with summer stop times before you say yes. If it is over 90 percent, the honest choices are a higher rate on new signups, letting a few far pools go, or adding a tech.",
      },
    ],
    body: `Every pool company I know grows the same way. Spring hits, the phone rings, and you say yes. Then it is July, your tech is testing water in the dark, the Thursday route spills into Friday, and a customer you have had for three years texts to ask why nobody came.

The route did not get busy. It went over its ceiling. You just found out at the customer's expense.

I want you to find that ceiling on paper, with your own numbers, before summer finds it for you. You will finish with a worked example, the calculator, and a short route check you can run every month.

## A route is minutes, not pools

Most pool guys count pools. Sixty on the route, room for a few more, sure, add them.

The route does not care how many pools are on it. It cares how many minutes each stop takes, gate to gate. The test, the brush, the skim, the basket, the chemicals, the note in the app, and the drive to the next gate. That last one is the part nobody counts, and it is the part that grows every time you add a pool on the far side of town.

So the honest math is simple. Techs on the route, times the productive hours in a day, times the days you run, divided by the real time per stop. That is your ceiling. Everything you book above it comes out of your evenings, your tech, or a customer.

## Start with a week you already ran

Pull up last week in whatever you use. Count the stops you actually made. Not the ones on the schedule. The ones with a chemical reading logged.

Then figure the real time per stop. Take the hours from the first gate to the last gate, subtract lunch and the shop stop, and divide by the stops. If that number is bigger than the twenty minutes you have been quoting yourself, that is the whole story right there.

Last, work out what one visit is worth. If a customer pays a monthly rate, divide it by the visits in a month. A monthly rate of $150 with four visits is about $38 a stop. Do not put the monthly rate in the calculator as the job value. That mistake makes every number four times too big.

## Try a small, fictional example

These are practice inputs, not pool industry averages or anyone's real route. Replace them with your own.

- Crews, chairs, bays or techs: **1**.
- Productive hours per day: **7**.
- Days per week: **5**.
- Hours per job: **0.5**, which is thirty minutes a stop.
- Jobs you actually do a week: **60**.
- Average job value: **$38**.

One tech with 7 productive hours over 5 days has 35 hours a week. At half an hour a stop, that is a ceiling of **70.0** stops a week. With 60 on the route, the calculator says you are running at **86%** of capacity, with **10.0** open slots a week. Those slots are worth about **$19,760** a year at $38 a visit. Your revenue ceiling on this route is **$138,320** a year against **$118,560** today.

The verdict says you have room, and that marketing makes sense right now. Fair enough. Ten more pools on this route is a real target.

Now be honest about the stop. Change hours per job to **0.75**, forty-five minutes, which is what a thirty-minute pool turns into once you count the drive between gates in summer traffic. Leave everything else alone.

The ceiling drops to **46.7** stops a week. You are running at **129%** of capacity with 60 on the route. Open slots go to **0.0**, and the verdict flips: you are nearly full, raise prices before you buy more leads, or add capacity first.

Read that again. Same route. Same sixty pools. The only thing that changed was telling the truth about the drive. That is why the route runs into the evening, and it is why the next ten pools you add will cost you a customer instead of earning one.

{{TOOL}}

## What to do with the number

**Under 90 percent with real stop times.** You have open slots, and the tool tells you what a year of them is worth. Fill them, but fill them close. A new pool two streets over adds a stop. A new pool across the county adds a stop and twenty minutes of drive to every week for as long as you keep it. Tighten the route before you spend a dollar on marketing.

**Over 90 percent, or over 100.** Stop adding pools this week. Either raise the monthly rate on the next signups and let a few of the far ones go, or add a tech and run the calculator again with two. In the example, a second tech at the honest forty-five minutes takes the route from 129% to **64%**, with **33.3** open slots a week to sell into. That is a hiring decision made with arithmetic instead of a gut feeling in July.

**The stop time is the lever.** Every five minutes you cut from an average stop is worth more than any ad. A tighter route, chemicals loaded the night before, and a gate code list that is actually current are where those minutes come from.

## Copy this route check

Run it once a month, and again the week the weather turns.

\`\`\`text
ROUTE CHECK

Week of:
Techs on the route:
Productive hours per day, first gate to last gate, minus breaks:
Days per week:
Stops actually made last week:
Minutes per stop, including the drive to the next gate:
Value of one visit (monthly rate divided by visits per month):
Calculator ceiling (stops per week):
Calculator capacity percentage:

Before adding a pool:
[ ] The stop time is the real one, not the one I quote myself.
[ ] The new pool is inside the route, not a drive away from it.
[ ] Summer stop times fit, not just spring ones.
[ ] If capacity is over 90 percent, the answer is price or a tech, not another pool.
\`\`\`

## Check whether the change helped

Run the check again in a month. Compare the minutes per stop and the last-gate time on the route. If the route finishes earlier with the same pools, the number moved for real. If the route was full and you raised the rate on new signups, count how many said yes. Most pool companies find that a clear price and a route that shows up on time close about as often as the cheap quote did.

If the phone is ringing and the calls go to voicemail while your tech is at a gate, that is a different leak. [Missed calls cost customers](/articles/missed-calls-cost-customers) walks through it. If the route and the office are eating your evenings, [find your next business step](/start).
`,
  },
];

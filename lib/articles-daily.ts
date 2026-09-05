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
];

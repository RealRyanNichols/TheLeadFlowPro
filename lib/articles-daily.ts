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
];

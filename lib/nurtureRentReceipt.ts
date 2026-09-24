// The Rent Receipt series. Thirty days, one email a day, for every lead that
// arrives after RENT_RECEIPT_SERIES_START, whichever admitted form they came
// through.
//
// WHY THIS FILE EXISTS: the Free Build series (lib/nurture.ts, steps 101-130)
// sells "I build your website free, you pay for the engine." Ryan retired that
// offer on Sep 15, 2026. The mall video ad now promises "no pitch, no catch,
// nothing to buy on the call," and its form asks two questions: what is
// costing you the most, and how soon do you want it fixed. Leads from that
// form were still getting thirty days of the offer they were told did not
// exist. This series answers the thing they picked and pushes toward one
// decision.
//
// STEP NUMBERS 501-530. Retired history owns 0-4, the Free Build campaign
// owns 101-130, the business diagnostic owns 200-206, the workshop countdown
// owns 201-204, the workshop follow-up owns 301-303, plugin onboarding owns
// 401-403. Never reuse any of them.
//
// TWO DIALS, read from the lead at send time (lib/nurtureContext.ts):
//   pain      what they said is costing them the most. Days 1 to 5 branch on
//             it: missed calls, no website, no follow up, monthly fees, or
//             the general track when they picked "something else" or came
//             through a form that never asked.
//   timeline  this week or this month is HOT. Everything else is COOL.
//             HOT emails close on the booking link, every day. COOL emails
//             close on the free tool or the proof that fits the email, with
//             the call offered as the door on days 7, 11, 15, 29 and 30.
//
// RULES FOR EVERY EMAIL IN HERE (same as lib/nurture.ts, plus two):
//   - No promise of leads, sales, revenue, ROAS, cost per lead, conversion
//     rate, or a position in Google. Ever. Not even softened.
//   - No dashes of any kind. Short lines. Say the thing and stop.
//   - SHORT. Most under 150 words. A daily email that runs long gets
//     unsubscribed from on day four.
//   - At least every third email is useful even if the person never buys.
//   - ONE link per email. The tests enforce it. The cron adds the signature
//     and the unsubscribe line.
//   - Nothing may promise an automated text. Inviting them to text us is fine.
//   - Every price and the phone number come from lib/site, never typed here.

import { bookingPage } from "@/lib/site/external-links";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import {
  isFreeWebsiteProgramNurtureLead,
  type FreeWebsiteNurtureCandidate,
  type NurtureStep,
} from "@/lib/nurture";
import { timelineWords, type NurtureContext, type NurturePain } from "@/lib/nurtureContext";

export const RENT_RECEIPT_CAMPAIGN = "rent_receipt";

/**
 * Leads created at or after this moment get this series. Leads created before
 * it finish the Free Build series they already started. Set it to the minute
 * the deploy goes live. The cron also refuses to move a lead that has already
 * received a Free Build step, so a late deploy cannot give anyone both.
 */
export const RENT_RECEIPT_SERIES_START = "2026-09-24T04:00:00Z";

export type RentReceiptCandidate = FreeWebsiteNurtureCandidate & {
  created_at?: unknown;
};

/**
 * Same admission as the Free Build campaign (consent plus an admitted form
 * or the owned website funnel), gated by creation time. Anything the Free
 * Build campaign would not take, this one does not take either.
 */
export function isRentReceiptSeriesLead(lead: RentReceiptCandidate): boolean {
  if (!isFreeWebsiteProgramNurtureLead(lead)) return false;
  const createdMs = typeof lead.created_at === "string" ? Date.parse(lead.created_at) : Number.NaN;
  if (!Number.isFinite(createdMs)) return false;
  return createdMs >= Date.parse(RENT_RECEIPT_SERIES_START);
}

// ---------------------------------------------------------------------------
// Links. One per email. Every link carries the day, the pain track and the
// hot or cool path in utm_content so the scoreboard can tell which email and
// which track actually moved somebody.

export const RENT_RECEIPT_PATHS = {
  rent: "/tools/rent-receipt",
  missedCall: "/tools/missed-call-calculator",
  textBack: "/tools/missed-call-textback-script",
  responseTime: "/tools/lead-response-time",
  quotes: "/tools/quote-follow-up-calculator",
  grader: "/tools/website-grader",
  afterHours: "/tools/after-hours-lead-calculator",
  reviewLink: "/tools/google-review-link",
  showcase: "/showcase",
  scoreboard: "/scoreboard",
  portfolio: "/portfolio",
  academy: "/academy",
  systemMap: "/packages/system-map",
  pricing: "/pricing",
  tools: "/tools",
  about: "/about",
  contact: "/contact",
} as const;

type PathKey = keyof typeof RENT_RECEIPT_PATHS;

function utm(day: number, c: NurtureContext): string {
  const content = `day${String(day).padStart(2, "0")}_${c.pain}_${c.hot ? "hot" : "cool"}`;
  return `utm_source=email&utm_medium=nurture&utm_campaign=${RENT_RECEIPT_CAMPAIGN}&utm_content=${content}`;
}

export function rentReceiptLink(path: PathKey, day: number, c: NurtureContext): string {
  return `${BUSINESS.siteUrl}${RENT_RECEIPT_PATHS[path]}?${utm(day, c)}`;
}

/** The booking page when Ryan has one set, otherwise the contact page. Never a dead CTA. */
export function rentReceiptCallLink(day: number, c: NurtureContext): string {
  const booking = bookingPage();
  return booking ? `${booking}?${utm(day, c)}` : rentReceiptLink("contact", day, c);
}

// The hot closers rotate so thirty emails do not end on the same sentence.
const HOT_LINES: ((c: NurtureContext) => string)[] = [
  () => "Pick a time and I call you. Twenty minutes, no pitch, nothing to buy on the call:",
  (c) => `You said ${timelineWords(c.timeline)}. Grab a slot and I call you at the minute you pick:`,
  () => "Twenty minutes on the phone settles this faster than twenty emails. Pick your time:",
  () => "I answer my own phone, but this way you pick the minute and I do the dialing:",
  () => "Book the call. I do the talking on what to fix first. You do the deciding:",
];

function hotClose(day: number, c: NurtureContext): string {
  const line = HOT_LINES[day % HOT_LINES.length](c);
  return `${line}\n${rentReceiptCallLink(day, c)}`;
}

/** Hot leads get the call. Cool leads get the tool or proof that fits the email. */
function close(day: number, c: NurtureContext, coolLine: string, coolPath: PathKey): string {
  if (c.hot) return hotClose(day, c);
  return `${coolLine}\n${rentReceiptLink(coolPath, day, c)}`;
}

/** The door days: everybody gets the call link, cool leads with a softer line. */
function doorClose(day: number, c: NurtureContext): string {
  if (c.hot) return hotClose(day, c);
  return `If you would rather talk than read, pick a time and I call you. Twenty minutes, no pitch, nothing to buy on the call:\n${rentReceiptCallLink(day, c)}`;
}

// ---------------------------------------------------------------------------
// The copy. Days 1 to 5 are written per pain. Days 6 to 30 are shared.

type Writer = (c: NurtureContext) => string;

type RentStep = {
  step: number;
  day: number;
  subject: string;
  subjectFor?: (c: NurtureContext) => string;
  write: Writer;
};

const SYSTEM_MAP = usd(PRICES.systemMap);
const WEBSITE_LAUNCH = usd(PRICES.websiteLaunchTotal);
const PHONE = BUSINESS.phone.display;

// ----- Week one, per pain -------------------------------------------------

const WEEK_ONE: Record<NurturePain, { subject: string; write: Writer }[]> = {
  missed_calls: [
    {
      subject: "📵 About the calls nobody returns",
      write: (c) => `${c.first},

You told me missed calls and texts nobody returns are costing you the most.

Here is the first thing I would do, and it takes four minutes.

Call your own business number from a phone that is not yours. Once at 12:15 on a weekday. Once at 5:45.

Write down exactly what happens. Straight to voicemail? Rings out? A greeting from three years ago?

That is what every new customer hears. Most owners have never heard it themselves.

Reply to this email with what you heard. I read every one.

${close(1, c, "Put a number on it while you wait for me. Two minutes, free:", "missedCall")}`,
    },
    {
      subject: "⏱️ A missed call is not a lost customer yet",
      write: (c) => `${c.first},

A missed call is not a lost customer. It is a customer who is currently deciding.

They called you and got nothing. Now they are looking at the next name on the list. You have minutes, not hours, before they dial it.

The businesses that win those minutes do not have better phones. They have one thing that happens on its own: a text goes out that says "This is Dale at Dale's Plumbing, I missed your call, what do you need?"

Simple. Human. Immediate. The customer stops scrolling and starts typing.

That message has to be written before the call is missed, not after.

${close(2, c, "Write yours in two minutes. It is free and it is yours to keep:", "textBack")}`,
    },
    {
      subject: "🔧 What the fix actually looks like",
      write: (c) => `${c.first},

Here is what the missed call fix looks like when it is built right. No jargon.

1. Every call that is not answered gets a text back in under a minute, from your number, in your words.
2. Their reply lands in one inbox you actually see. Not six apps.
3. Every one of those conversations is saved to a customer record you own, so nobody has to remember anything.

That is it. Three parts. The whole thing runs in accounts you own, and nothing about it depends on a monthly plan somebody else can raise.

I run that exact setup for my own businesses. You can look at it live, right now.

${close(3, c, "The Command Center is the system, running, in public:", "showcase")}`,
    },
    {
      subject: "🪜 I cannot answer every call",
      write: (c) => `${c.first},

The most common thing I hear from an owner who misses calls: "I cannot answer every call. I am on a ladder. I am with a customer."

Correct. You should not be answering every call. That is the point.

Answering every call is a job. Answering every missed call in sixty seconds is a system. Those are different things, and only one of them is affordable.

The owner who tries to do it with willpower loses a few calls a week forever. The owner who builds the system stops thinking about it.

Nothing about this requires you to change how you work. It requires one afternoon of setup, once.

${close(4, c, "See what an unanswered call runs your business in a year:", "missedCall")}`,
    },
    {
      subject: "🎯 Where I would start with you",
      write: (c) => `${c.first},

Four emails in. Here is where I would start with you, plainly.

Missed calls are the fastest thing to fix in any business I have looked at. The customer already wants you. The phone already rang. The only thing missing is the sixty seconds after.

On a call I ask you three things: what number people call, what happens when nobody picks up, and where a customer's message lands today. Then I tell you what it would take to fix it. No pitch, no catch, nothing to buy on the call.

${c.hot ? "You said you want it fixed fast. That call is the fastest path I know." : "Whenever you are ready, that call is the fastest path I know."}

${close(5, c, "Not ready for a call? Two of the ten courses are free with a signup, and the lead capture one is built for exactly this:", "academy")}`,
    },
  ],

  no_website: [
    {
      subject: "🌐 About the website that does nothing",
      write: (c) => `${c.first},

You told me no website, or one that does nothing, is costing you the most.

First thing, and it is free. Pull up your business on your own phone the way a stranger would. Type your business name into Google. Tap the first result. Time it.

Did it load in under three seconds? Is the phone number tappable? Is there one clear thing to do on the first screen?

If the answer is no to any of those, a stranger is not going to figure it out. They hit back and call the next listing.

A website that does nothing is not a website. It is a business card that costs money every month.

Reply and tell me what you saw. I read every reply.

${close(1, c, "Score it in two minutes, free, no signup:", "grader")}`,
    },
    {
      subject: "🧭 What a website is actually for",
      write: (c) => `${c.first},

Most business websites were built to look nice at a launch party. Then nobody looked at them again.

A website is for three things and only three:

1. Get found by someone who is already looking.
2. Get them to do one thing: call, text, book, or ask.
3. Catch that action somewhere you can see it and answer it.

If your site does the first two and not the third, the customer showed up and nobody knew. That is the most common problem I find, and it is invisible from the owner's side.

Everything else on a website is decoration. Fine to have. Not why it exists.

${close(2, c, "Here is one doing all three, in public, with the numbers showing:", "scoreboard")}`,
    },
    {
      subject: "🔧 What the fix looks like",
      write: (c) => `${c.first},

The fix for a website that does nothing is not a prettier website.

It is a site built around the one action you want, with every form landing in a customer record you own. Not on somebody's platform. On your domain, in your accounts, exportable any day you like.

For a real business that looks like this: five pages that load fast, one clear offer, a form that writes straight to your own database, and a message to you the second someone fills it in.

That is not a big project. It is a specific one.

I build all of mine that way. You can inspect the work instead of taking my word.

${close(3, c, "The work, with links, so you can click through the real sites:", "portfolio")}`,
    },
    {
      subject: "🏠 I already have a website",
      write: (c) => `${c.first},

"I already have a website" is the sentence I hear most, and it is usually true.

The question is not whether you have one. It is who owns it and what it does.

If it lives on a builder plan, the day you stop paying it disappears. Your pages, your photos, your reviews section, gone. That is not a website. That is a lease.

And if nobody can tell you how many people asked for a quote through it last month, it is not doing the job either.

You do not need to throw it out. You need two numbers: what it costs you a year to keep, and what it produced. Most owners know the first and not the second.

${close(4, c, "Add up what the site and the tools around it cost you a year:", "rent")}`,
    },
    {
      subject: "🎯 Where I would start with you",
      write: (c) => `${c.first},

Four emails in. Here is where I would start with you.

Not with a redesign. With one page and one form. The page says what you do, who it is for, and what to do next. The form lands in a record you own and pings your phone.

When that one page works, the rest of the site is a copy of it. Building it in the right place the first time is the whole trick, because moving later costs more than building right.

On a call I ask what you have, what you pay for it, and what you want people to do. Then I tell you what it would take. No pitch, no catch, nothing to buy on the call.

${close(5, c, "Not ready for a call? Two of the ten courses are free with a signup. Start with the offer one:", "academy")}`,
    },
  ],

  no_follow_up: [
    {
      subject: "📋 About the leads nobody followed up",
      write: (c) => `${c.first},

You told me leads that never get followed up are costing you the most.

Do this first. Open whatever holds your leads today. Your text messages, your email, a notebook, a Facebook inbox. Count the people from the last thirty days who asked about something and never heard back a second time.

Not the ones who said no. The ones who went quiet.

That number is your follow up gap. Nearly every owner who counts it is surprised, because those people did not leave. They just were not asked again.

Reply with the number. I read every reply, and I will not judge it.

${close(1, c, "See what those open conversations are worth, in two minutes:", "quotes")}`,
    },
    {
      subject: "✌️ The second touch",
      write: (c) => `${c.first},

In my experience the sale happens on the second or third contact. Most businesses stop after the first.

That is the whole follow up problem in two sentences.

The first reply is easy. The customer just asked, you are excited, you answer. Then three days pass, they did not respond, and following up feels like begging. So nobody does.

It is not begging. It is the job. A second message that says "Still want that quote? I can get you on the schedule this week" gets answers the first message never did.

The fix is not discipline. It is having the second and third message already written, and something that reminds you to send them.

${close(2, c, "Run the numbers on how fast you reply today and what a faster reply changes:", "responseTime")}`,
    },
    {
      subject: "🔧 What the fix looks like",
      write: (c) => `${c.first},

Follow up that works has three parts. None of them require you to remember anything.

1. Every lead lands in one list, no matter where it came from. Website, Facebook, a text, a call.
2. Each lead has a next step and a date on it. Not in your head. On the record.
3. The messages for step two, three, and four are written once, in your voice, and sent on schedule.

You still make the calls that matter. The system just makes sure nobody falls through the floor while you are busy.

I run this for my own businesses and you can watch it working.

${close(3, c, "The Command Center, live:", "showcase")}`,
    },
    {
      subject: "⏰ I do not have time to follow up",
      write: (c) => `${c.first},

"I do not have time to follow up" is true for every owner I have met. Including me.

That is exactly why it cannot depend on your time.

Here is the reframe that changes it: follow up is not a task you do. It is a message that already exists, waiting for a date. You wrote it once on a Tuesday when you had ten minutes. It goes out on Friday whether your Friday is good or bad.

The owner who has time writes more messages. The owner who does not builds the schedule. Both win. The one who does neither loses the customer to whoever answered second.

${close(4, c, "Two of the ten courses are free, and the lead capture one is written for this exact problem:", "academy")}`,
    },
    {
      subject: "🎯 Where I would start with you",
      write: (c) => `${c.first},

Four emails in. Here is where I would start with you.

One list. Every lead in it. That is day one, and it is the part most people skip because it feels like admin. It is not admin. It is the foundation the rest stands on.

Then the three messages, written in your words. Then the dates.

On a call I ask where your leads come from, where they go, and what happens after the first reply. Then I tell you what it would take to close the gap. No pitch, no catch, nothing to buy on the call.

${close(5, c, "Or start by seeing what the open quotes are worth:", "quotes")}`,
    },
  ],

  monthly_fees: [
    {
      subject: "🧾 About the monthly fees",
      write: (c) => `${c.first},

You told me paying monthly for tools you do not use is costing you the most.

First thing: get the real number. Not the one in your head. The one on the statement.

Open your bank or card statement and list every recurring charge with a software name on it. Website plan. Booking tool. Email tool. Review tool. The CRM seat. The plugin you forgot about.

Add it up. Then multiply by twelve.

That yearly number is what you pay to exist online. Most owners have never seen it in one place, and for most of them it is a car payment.

Reply with the number if you want. I read every reply.

${close(1, c, "Or let the calculator do it. Two minutes, free, and it prints your receipt:", "rent")}`,
    },
    {
      subject: "🏚️ Rent",
      write: (c) => `${c.first},

Here is the part that bothers me about those monthly fees.

It is not the money. It is what you get for it, which is nothing you keep.

Stop paying the website builder and the site is gone. Stop paying the email tool and the list is locked. Stop paying the booking tool and the calendar goes dark. Years of paying and you own none of it.

That is rent. And rent is fine for the edges of a business. It is a bad idea for the core: your site, your customer list, your bookings.

Own the core. Rent the edges. That one sentence is most of what I teach.

${close(2, c, "Here is the stack I own, running my own business, in public:", "showcase")}`,
    },
    {
      subject: "🔧 What the fix looks like",
      write: (c) => `${c.first},

The fix for monthly fees is not a cheaper subscription. It is owning the thing.

Concretely: your website lives in an account with your name on it, on hosting with your name on it, with a database with your name on it. The tools cost a few dollars a month at the vendor, and often nothing. No plan to cancel. No seat to pay for. No support ticket to ask for your own data.

The catch, because there is always one: someone has to build it once, properly. That is a project with a start and an end. It is not a subscription.

I have done it for my own businesses and for other people's. The results are public.

${close(3, c, "The sites and what they run on:", "portfolio")}`,
    },
    {
      subject: "💸 But the tools are cheap",
      write: (c) => `${c.first},

"The tools are cheap" is what everyone says, and each one is.

Twenty nine here. Forty nine there. Nineteen for the thing you tried once. None of them hurts. Together they are the most expensive employee you have, and the only one who never shows up.

The other cost is quieter. Six tools means six logins, six places a customer can fall through, and six companies who can raise the price on a Tuesday.

You do not fix this by canceling everything tomorrow. You fix it by deciding which three things you actually need, and owning those.

${close(4, c, "Line them up and see the year total:", "rent")}`,
    },
    {
      subject: "🎯 Where I would start with you",
      write: (c) => `${c.first},

Four emails in. Here is where I would start with you.

With the receipt. The list of what you pay, what each one does, and which ones you would keep if you owned the core. Half the time the answer is: keep two, replace three, cancel four.

Then the build, in your accounts, once.

On a call I ask what you pay, what you use, and what you are afraid of losing if you stop. Then I tell you what it would take. No pitch, no catch, nothing to buy on the call.

${close(5, c, `The written version of that conversation is the System Map, ${SYSTEM_MAP} one time. What you run, what it costs, what to fix first:`, "systemMap")}`,
    },
  ],

  other: [
    {
      subject: "❓ What is costing you the most?",
      write: (c) => `${c.first},

You asked for a straight answer on what it would take to fix the thing costing you the most. I need to know what it is.

Most owners I talk to land in one of four buckets:

1. Calls and texts nobody returns.
2. A website that does nothing.
3. Leads that go quiet after the first reply.
4. Monthly fees for tools nobody uses.

Reply to this email with a number, or with the actual thing if it is none of those. One line is plenty. I read every reply and I answer them myself.

${close(1, c, "While you think about it, the fastest picture of your situation is the receipt. Two minutes, free:", "rent")}`,
    },
    {
      subject: "📵 The one I would check first",
      write: (c) => `${c.first},

If you are not sure where the money is leaking, check the phone first.

Call your own business number from a phone that is not yours, at lunch and after five. Listen to what a stranger hears. Voicemail, a ring that never picks up, or a greeting from years ago.

I start there because it is the cheapest thing to fix and the most expensive thing to ignore. The customer already wanted you. The phone already rang.

${close(2, c, "Put a number on what unanswered calls cost in a year:", "missedCall")}`,
    },
    {
      subject: "🌐 The one that is invisible",
      write: (c) => `${c.first},

The second place I check is the website, and not for how it looks.

I check whether a stranger can tap the phone number, and whether a form on it lands anywhere a human sees. You would be surprised how many sites collect requests into an inbox nobody has opened in years.

A website that does nothing is a business card with a monthly fee.

${close(3, c, "Score yours in two minutes, free:", "grader")}`,
    },
    {
      subject: "📋 The one everyone is guilty of",
      write: (c) => `${c.first},

Third place: follow up.

Count the people from the last thirty days who asked about something and never heard from you a second time. Not the ones who said no. The ones who went quiet.

In my experience the sale happens on the second or third touch. Most businesses stop after the first. That gap is usually the biggest number in the whole building.

${close(4, c, "See what those open conversations are worth:", "quotes")}`,
    },
    {
      subject: "🧾 The one on your bank statement",
      write: (c) => `${c.first},

Last one: the monthly fees.

Website plan, booking tool, email tool, review tool, CRM seats. Each one is cheap. Together they are a car payment, and you own none of it. Stop paying and it all disappears.

Own the core. Rent the edges.

That is the four. If one of them is you, reply with the number. If you want it fixed fast, I would rather talk than write.

${close(5, c, "Add yours up. Two minutes, free:", "rent")}`,
    },
  ],
};

// ----- Days 6 to 30, shared ------------------------------------------------

const SPINE: { day: number; subject: string; write: Writer }[] = [
  {
    day: 6,
    subject: "🏗️ What I actually built",
    write: (c) => `${c.first},

I should show you what I am talking about instead of describing it.

I build businesses on a stack the owner keeps: the code in their own account, the site on their own hosting, the customers in their own database. Then I connect the ads, the forms, the follow up, and the phone so it runs without them watching it.

I did it for my own companies first, because I had to. Then for a dental academy in Longview and a handful of other owners. Every one of them is live and you can click through it.

No screenshots. Real sites, real numbers, in public.

${close(6, c, "The work:", "portfolio")}`,
  },
  {
    day: 7,
    subject: "❓ One week in. One question.",
    write: (c) => `${c.first},

A week ago you filled out a form that said what is costing you the most. Since then I have sent you what I would check first, what the fix looks like, and where I would start.

One question, and I want the honest answer: is this still the thing you want fixed?

If yes, the fastest move is a twenty minute call. If it has moved down the list, reply and tell me that, and I will stop the daily version of these.

Either answer is fine. Silence is the only one that costs you.

${doorClose(7, c)}`,
  },
  {
    day: 8,
    subject: "🧾 The Rent Receipt",
    write: (c) => `${c.first},

Here is the tool I would want if I were you, and it is free.

The Rent Receipt. You check off what you pay for: website builder, email tool, booking app, CRM seats, review software. It adds it up and shows you the yearly number nobody prints on a statement.

Two minutes. No signup. Runs in your browser. Print it or save it.

Owners tell me the number is the thing that finally made them do something. Not my emails. The number.

${c.hot ? "Bring it to the call, or I walk you through it in the first three minutes." : "Run it tonight. It is the fastest picture of your situation I know of."}

${close(8, c, "The Rent Receipt:", "rent")}`,
  },
  {
    day: 9,
    subject: "🔑 Own the core. Rent the edges.",
    write: (c) => `${c.first},

The whole philosophy in five words: own the core, rent the edges.

The core is your website, your customer list, and the place your bookings and requests land. Those live in accounts with your name on them, on tools that cost a few dollars a month or nothing. Nobody can raise the price. Nobody can lock you out.

The edges are everything else. Your accounting software. Your phone plan. A design tool. Rent those. They are cheap to leave.

The mistake almost every owner makes is renting the core. It feels cheap for years. Then the plan changes, the login fails, or the company sells, and the business is standing in the street.

${close(9, c, "Mine, running in public:", "showcase")}`,
  },
  {
    day: 10,
    subject: "📊 Real numbers from real accounts",
    write: (c) => `${c.first},

I do not promise numbers. I show them.

The Scoreboard is a public page where you can watch what happens after a site goes live: people arrive, take an action, and become a recorded request. It is pulled from the real accounts as they change, not typed in by a marketing person.

I put it in public because I got tired of agencies waving screenshots.

Look at it. Then decide whether the person asking for twenty minutes of your time has anything to show for his own.

${close(10, c, "The Scoreboard:", "scoreboard")}`,
  },
  {
    day: 11,
    subject: "📞 What happens on the call",
    write: (c) => `${c.first},

People do not book the call because they think it is a sales call. So here is the whole thing.

Minutes one to five: you tell me what is costing you the most and what you have tried.
Minutes five to fifteen: I ask what you run, what you pay, and where requests land today. I tell you what I would fix first and why.
Minutes fifteen to twenty: I tell you what it would take. If it is something you can do yourself, I say so. If it is something I would build, I tell you the range.

Nothing to buy on the call. No second call to get the price. You leave with your next three moves whether you ever hire me or not.

${doorClose(11, c)}`,
  },
  {
    day: 12,
    subject: "🚫 Who this is not for",
    write: (c) => `${c.first},

I would rather tell you now than waste your twenty minutes.

This is not for you if you want a ninety nine dollar template site and nothing else. That is renting with extra steps, and there are cheaper people for it.

It is not for you if you want a guarantee on leads or revenue. Nobody honest can give you one and I will not pretend.

It is not for you if you need somebody to run your whole marketing department by Friday.

It is for you if you want to own the thing that runs your business, you are willing to spend one afternoon getting it set up right, and you would rather look at real numbers than hear a pitch.

${close(12, c, "Who is on the other end of this:", "about")}`,
  },
  {
    day: 13,
    subject: "📸 The six photos",
    write: (c) => `${c.first},

Free advice that is worth more than most paid advice.

Take six photos of your actual work this week. Your truck, your shop, your hands doing the thing, a customer who said yes to being in one. Bad lighting is fine. Real beats polished every single time.

Put them on your site, your Google listing, and your Facebook page. Replace every stock photo you have.

Stock photos tell a stranger "this business has not been touched in a while." Real photos tell them "these are the people who will show up."

No tool, no purchase, one hour. It works better than most of what agencies sell.

${close(13, c, "While you are at it, make your Google review link. Free, thirty seconds:", "reviewLink")}`,
  },
  {
    day: 14,
    subject: "🔧 Two weeks. The mistake I see most.",
    write: (c) => `${c.first},

Two weeks in. Here is the mistake I see most, in businesses of every size.

They fix the pretty problem and leave the plumbing.

New logo, new site, new sign. Then a customer calls at 5:40, gets voicemail, fills out the contact form as a backup, and the form emails an address nobody checks. The pretty part worked. The plumbing failed. The customer left.

Before anything cosmetic, run water through the pipes. Call your number. Fill out your own form. Text your business line. See what actually happens to a customer.

${close(14, c, "Then see what the after hours leak costs in a year:", "afterHours")}`,
  },
  {
    day: 15,
    subject: "✅ Halfway. Three questions.",
    write: (c) => `${c.first},

Halfway through these. Three questions, and I only need one word each.

1. Is the thing you filled the form out about still costing you?
2. Do you know what it costs you a year? Yes or no. The number can come later.
3. If it were fixed in one afternoon, would that matter this quarter?

If you answered yes, no, yes, you are exactly who I built this for. Reply with those three words and I will tell you what I would do first.

${doorClose(15, c)}`,
  },
  {
    day: 16,
    subject: "🎯 What a pixel actually does",
    write: (c) => `${c.first},

Plain English on a thing everyone talks about and nobody explains.

A pixel is a tiny piece of code on your website that tells Facebook or Google "a person who came from your ad did this." Filled out a form. Called. Bought.

Why it matters: without it, the ad platform is guessing who to show your ad to. With it, the platform learns from every real customer and looks for more like them.

If you run ads and nobody can tell you whether your pixel fires when someone submits your form, you are paying full price for guesses.

You do not need to understand the code. You need to know whether yours works.

${close(16, c, "The website scorecard checks for it:", "grader")}`,
  },
  {
    day: 17,
    subject: "🏪 I am too small for this",
    write: (c) => `${c.first},

"I am too small for this" is the objection I take most seriously, because it is usually backwards.

A big company loses a lead and has forty more. You lose a lead and it was Tuesday's revenue.

The system I am describing is not a big company system. It is one page, one form, one place requests land, one follow up sequence, one text back. A one person shop needs those more than a fifty person shop, not less, because there is nobody else to catch the ball.

Small is exactly the size where owning the core pays off fastest. The costs are tiny and the leaks are personal.

${close(17, c, "The free courses were written for a one person shop:", "academy")}`,
  },
  {
    day: 18,
    subject: "📍 The Google listing",
    write: (c) => `${c.first},

The most valuable page you own is not your website. It is your Google Business listing, and most owners have not touched it since they set it up.

Do this today:
1. Confirm the hours are right. Wrong hours are the number one reason a customer drives to a locked door.
2. Add the six real photos from last week.
3. Make sure the phone number is the one that gets answered, or texted back.
4. Get your review link and put it where customers can see it.

That is twenty minutes and it moves the needle on being found more than anything on your website.

${close(18, c, "Your review link and QR code, free:", "reviewLink")}`,
  },
  {
    day: 19,
    subject: "🧱 The stack, in plain English",
    write: (c) => `${c.first},

People hear "your own stack" and picture a server room. Here is what it actually is, in four lines.

GitHub holds your code. Think of it as the vault. Free.
Vercel puts the site on the internet on your domain. Free for most small businesses.
Supabase holds your customers, forms, and orders. Free at the size most owners are.
Your domain is the address. Twelve to twenty dollars a year, in your name.

That is the core. It is not exotic. It is what real software companies run on, and the accounts are opened in your name in an afternoon.

You are not learning to code. You are learning to own.

${close(19, c, "Here is that stack running my own business, live:", "showcase")}`,
  },
  {
    day: 20,
    subject: "📬 The Sunday inbox",
    write: (c) => `${c.first},

Here is a thing that happens to owners who own their system, and it is small, but it is the whole point.

Sunday night. You open the one inbox where everything lands. Seven requests from the week. Every one has a reply next to it, a date on it, and a note about what happens next. Nothing is lost in a text thread. Nothing is sitting in a Facebook message nobody saw.

You did not work Sunday. The system did.

That is what the setup buys. Not more work. Less remembering.

${close(20, c, "The lead capture course walks through building that inbox, and it is one of the free ones:", "academy")}`,
  },
  {
    day: 21,
    subject: "📅 Three weeks",
    write: (c) => `${c.first},

Three weeks of these. Let me tell you what I have noticed about the people who actually fix the thing.

They do not wait until they understand everything. They pick the one leak that is costing the most and they fix that one first. Then the next.

The ones who never fix it are not lazy. They are waiting for a quiet week. The quiet week does not come.

If the thing you filled out the form about is still there, it is not going to leave on its own.

${close(21, c, `The written plan for which leak first is the System Map, ${SYSTEM_MAP} one time, credited toward the build if you do one:`, "systemMap")}`,
  },
  {
    day: 22,
    subject: "💵 What it costs",
    write: (c) => `${c.first},

You have not asked, so I will just tell you.

A twenty minute call is free. A written System Map is ${SYSTEM_MAP}, one time, credited toward the build if you do one. A five page site you own outright is ${WEBSITE_LAUNCH}. Bigger systems are scoped in writing before anyone starts, because a coffee shop and a three location service company are not the same build.

Nothing is monthly unless you ask me to keep running it for you, and that is optional.

What you are not paying for: a plan, a seat, a template, or my ability to hold your site hostage.

${close(22, c, "Every price on one page. No call required to see it:", "pricing")}`,
  },
  {
    day: 23,
    subject: "🏠 The Facebook page you do not own",
    write: (c) => `${c.first},

Quick one, because it comes up on almost every call.

You do not own your Facebook page. You rent it. The reach, the rules, the reviews on it, the messages in it, all live on their side. They can throttle it, restrict it, or close it, and there is no phone number to call.

It is still worth using. Most of my leads come from there. But it is the front porch, not the house.

The house is your site and your list. Every Facebook post should be walking people to the house.

${close(23, c, "Eighty six free tools, all built to run on your side of the fence:", "tools")}`,
  },
  {
    day: 24,
    subject: "✍️ Posting when you have nothing to say",
    write: (c) => `${c.first},

The reason most business pages go quiet is not laziness. It is that nobody told the owner what to post.

Here is a week, and you can repeat it forever:
Monday: a photo of a job from last week and one sentence about what the customer needed.
Wednesday: a question you get asked all the time, answered in three lines.
Friday: something you fixed, a before and after, or a thank you to a customer by first name.

Three posts. Real photos. No stock, no quotes over sunsets.

Consistent beats clever. Every post walks them to the site.

${close(24, c, "Two of the ten courses are free with a signup. Start there:", "academy")}`,
  },
  {
    day: 25,
    subject: "🤝 Why I will not promise you leads",
    write: (c) => `${c.first},

Every agency pitch you have heard promised a number. Leads a month, calls a week, a return on the spend.

I will not, and here is why. I have never met the person who can promise what your customers will do next month. Anyone who does is either guessing or planning to redefine the word later.

What I promise is the part I control: what gets built, where it lives, that it is yours, and that it works when a customer touches it. Then I show you the numbers in public as they happen.

If you want the promise, I am the wrong guy. If you want the receipt, keep reading.

${close(25, c, "The receipts:", "scoreboard")}`,
  },
  {
    day: 26,
    subject: "🔁 The follow up, explained in one email",
    write: (c) => `${c.first},

Everything I build rests on one idea, so here it is in full.

A customer raises a hand. Something answers in a minute, from your number, in your voice. Their reply lands in one list you own. That list has a next step and a date on every name. Messages two, three, and four are already written and go out on schedule. You call the ones worth calling.

That is the whole machine. It is not complicated. It is just built, once, in the right place.

Most businesses have none of it. A few have half of it in four apps. Almost nobody has all of it in one place they own.

${close(26, c, "Run the reply speed math on your own numbers:", "responseTime")}`,
  },
  {
    day: 27,
    subject: "🔑 The day you fire me",
    write: (c) => `${c.first},

The best thing about owning your system is the day you do not need me.

If I build it, it is in your accounts from the first day. The code, the hosting, the database, the domain. When it is done, you can hire anyone, learn it yourself, or leave it running for years untouched. There is nothing to hand over because it was never mine.

Agencies are built to be needed. I am built to be finished.

${close(27, c, "The finished ones:", "portfolio")}`,
  },
  {
    day: 28,
    subject: "🎓 The two free courses",
    write: (c) => `${c.first},

If you would rather learn it than hire it, that is a real path and I respect it.

Two of the ten Operator Academy courses are free with a signup. One is about building one clear offer. One is about lead capture: the form, the thank you page, and the record it lands in. Those two alone fix more than most paid packages.

Read at your own pace. Real workbooks. No technical background needed to start.

If after those two you want the whole system, the rest is one payment, and the price is on the page.

${close(28, c, "The academy:", "academy")}`,
  },
  {
    day: 29,
    subject: "⏳ Second to last",
    write: (c) => `${c.first},

This is the second to last of these. Tomorrow I stop the daily emails.

I am not going to invent urgency. There is no deadline on my end. The only clock is yours: the thing costing you money has been costing you money for the thirty days since you filled out that form.

If you want a straight answer on what it would take to fix it, twenty minutes gets you one. No pitch, no catch, nothing to buy on the call.

If not, no hard feelings. This is the end of the daily emails either way.

${doorClose(29, c)}`,
  },
  {
    day: 30,
    subject: "👋 Last one from me",
    write: (c) => `${c.first},

Last one.

Thank you for reading this far. I built this whole thing because I needed a system nobody could take from me, and then I found out most owners in East Texas needed the same thing and had been renting theirs for years.

If you ever want the straight answer, the door is open. Text or call ${PHONE}. I answer my own phone.

Own the core. Rent the edges. Keep the keys.

${doorClose(30, c)}`,
  },
];

// ---------------------------------------------------------------------------
// Assembly. Days 1 to 5 read the pain track at send time; the step number and
// the lead_emails row are the same whichever track renders, so a lead can
// never get two day threes.

export const RENT_RECEIPT_FIRST_STEP = 501;

const WEEK_ONE_STEPS: RentStep[] = [0, 1, 2, 3, 4].map((i) => ({
  step: RENT_RECEIPT_FIRST_STEP + i,
  day: i + 1,
  subject: WEEK_ONE.other[i].subject,
  subjectFor: (c) => WEEK_ONE[c.pain][i].subject,
  write: (c) => WEEK_ONE[c.pain][i].write(c),
}));

const SPINE_STEPS: RentStep[] = SPINE.map((s) => ({
  step: RENT_RECEIPT_FIRST_STEP + s.day - 1,
  day: s.day,
  subject: s.subject,
  write: s.write,
}));

const RENT_STEPS: RentStep[] = [...WEEK_ONE_STEPS, ...SPINE_STEPS];

function fallbackContext(first: string): NurtureContext {
  return { first, pain: "other", timeline: "unknown", hot: false };
}

/** The thirty steps in the shape the cron already speaks. */
export const RENT_RECEIPT_STEPS: NurtureStep[] = RENT_STEPS.map((s) => ({
  step: s.step,
  day: s.day,
  subject: s.subject,
  subjectFor: s.subjectFor,
  body: (first, c) => s.write(c ?? fallbackContext(first)),
}));

export const RENT_RECEIPT_LAST_STEP = RENT_RECEIPT_STEPS[RENT_RECEIPT_STEPS.length - 1].step;

/** Every step at or before this age, oldest first. Used to catch a lead up. */
export function rentReceiptStepsDueBy(ageInDays: number): NurtureStep[] {
  return RENT_RECEIPT_STEPS.filter((s) => s.day <= ageInDays);
}

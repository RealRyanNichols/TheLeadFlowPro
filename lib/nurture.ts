// The 30 day follow-up sequence. One email a day, thirty days, no gaps.
//
// WHY THIS FILE EXISTS: from August 17 to August 26 every lead that came
// through any door got exactly one welcome email and then silence forever. The
// old sequence lived inside a Resend automation nobody could read, was written
// for a retired offer, and was switched off by returning false from
// shouldEnrollInLegacyEmailSeries(). Paid traffic was landing in a bucket with
// no bottom.
//
// This version lives in the repo. Versioned, reviewable, sent from our own
// cron on our own schedule. Own your platform applies to us too.
//
// HOW IT RUNS: the welcome email fires instantly at lead capture from
// lib/leadNotify.ts. That is day zero and it is NOT in this file. Then
// /api/cron/nurture runs once a day and sends the one step that is due.
// Thirty steps, days 1 through 30, one per day, one per lead per run.
//
// STEP NUMBERS start at 101 on purpose. Steps 0 to 4 in lead_emails are
// history from the retired sequence. Never reuse them.
//
// RULES FOR EVERY EMAIL IN HERE:
//   - No promise of leads, sales, revenue, ROAS, cost per lead, conversion
//     rate, or a position in Google. Ever. Not even softened.
//   - No em dashes. Short lines. Say the thing and stop.
//   - SHORT. A daily email that runs long gets unsubscribed from on day four.
//     Most of these are under 150 words on purpose.
//   - At least every third email has to be useful even if the person never
//     buys anything. A daily sequence that only sells is a daily sequence
//     that gets marked as spam.
//   - Every email ends with a working unsubscribe, added by the cron.

export const NURTURE_CAMPAIGN = "free_build";

/** Where every link in this sequence points, with attribution attached. */
export function nurtureLink(day: number, path = "/free-build"): string {
  return (
    `https://www.theleadflowpro.com${path}` +
    `?utm_source=email&utm_medium=nurture&utm_campaign=${NURTURE_CAMPAIGN}&utm_content=day${day}`
  );
}

export type NurtureStep = {
  /** Row value in lead_emails.step. Never change one after it has shipped. */
  step: number;
  /** Days after the lead was created that this email becomes due. */
  day: number;
  subject: string;
  /** Body without the signature or the unsubscribe line: the cron adds both. */
  body: (firstName: string) => string;
};

export const NURTURE_STEPS: NurtureStep[] = [
  {
    step: 101,
    day: 1,
    subject: "The whole offer, in two lines",
    body: (first) => `${first},

Here it is with nothing around it.

I build your website for free.
You pay for the engine that makes it work.

The site is $0 at every tier. What you pay for is what runs behind it. Posts going out in your accounts. Follow-up that answers people while they still care. Leads landing somewhere you will actually see them.

From $197, one time. Nothing monthly, nothing to cancel.

${nurtureLink(1)}`,
  },
  {
    step: 102,
    day: 2,
    subject: "What free means, and what it does not",
    body: (first) => `${first},

Free means free. Not a trial that turns into $99 a month. Not a template you rent from me forever.

Built for you. Handed to you. On a domain in your name.

What it is not: a twelve page site with a blog and a store. No logo design. If you need to buy a domain, that is yours to buy, twelve to twenty dollars a year.

The catch is one sentence long. The engine is not free, and once I start writing it, it is not refundable.

That is the whole catch. I would rather you read it here than find it later.

${nurtureLink(2)}`,
  },
  {
    step: 103,
    day: 3,
    subject: "The three thousand dollar business card",
    body: (first) => `${first},

I watched a man pay three thousand dollars for a website.

Good looking site. No form that reached his phone. No pixel on it. Had not been touched in two years.

It never brought him one customer.

That is most small business websites. A business card nobody asked for.

So I quit charging for the part that sits there and started charging for the part that works.

${nurtureLink(3)}`,
  },
  {
    step: 104,
    day: 4,
    subject: "Five minutes",
    body: (first) => `${first},

Use this whether you ever hire me or not.

When somebody reaches out, the reply that goes back in the first five minutes does more work than the next five put together. Not because five is magic. Because at minute six they are already looking at the next name on the list.

You do not need software for this. You need one message already written, saved on your phone, so answering is a tap instead of a decision.

Write it tonight. Save it as a quick reply. That is a free fix and it takes ten minutes.

If you want that message written properly, in your words, that is the $197.

${nurtureLink(4)}`,
  },
  {
    step: 105,
    day: 5,
    subject: "You do not own your Facebook page",
    body: (first) => `${first},

Read that again.

You cannot export your followers. You cannot email them. You cannot take them anywhere.

You are renting your whole operation from a company that can change the rules on a Tuesday and never tell you.

I have been throttled and shut off. That is exactly why I build the way I build. Your domain. Your hosting. Your pixel. Your leads in your inbox.

Fire me tomorrow and you keep every bit of it. That is not a sales line. That is the design.

${nurtureLink(5)}`,
  },
  {
    step: 106,
    day: 6,
    subject: "$497, itemized. No mystery.",
    body: (first) => `${first},

The middle one, line by line.

Free, at $0: a two page site built for a phone first. A form that emails you the second somebody fills it in. Your Meta pixel installed. Click to call and click for directions. On a domain in your name. Twelve months of small changes free.

Paid, $497 one time: 42 posts, three a day for fourteen days, written in your voice. Scheduled inside your own Facebook, Instagram and X accounts through official partner access, so you never hand me a password. Plus a walkthrough of what is scheduled and where to find it.

One payment. Nothing renews on you in six months.

${nurtureLink(6)}`,
  },
  {
    step: 107,
    day: 7,
    subject: "One week in. One question.",
    body: (first) => `${first},

Seven emails. Here is the only question that matters this week.

When somebody calls your business and nobody picks up, what happens next?

If the honest answer is nothing, that is the cheapest hole in your business and you can plug it for $197.

If the honest answer is something, good. You are further along than most and we should talk about the next thing instead.

Either way, hit reply and tell me the answer. I read these myself.

${nurtureLink(7)}`,
  },
  {
    step: 108,
    day: 8,
    subject: "The missed call",
    body: (first) => `${first},

A missed call is not a lost customer yet. It is a customer who is currently deciding.

They are looking at their phone right now thinking about whether to try the next name. Anything that lands in that window keeps you in it. Nothing that lands ends it.

You do not need a phone system for this. You need a message ready and the habit of sending it.

Free fix: put a text draft in your notes app today that says who you are and when you can call back. Send it the next time you miss one.

${nurtureLink(8)}`,
  },
  {
    step: 109,
    day: 9,
    subject: "Why I will not promise you leads",
    body: (first) => `${first},

Somebody in your inbox this week promised you a number. Ten leads. Twenty. Guaranteed.

They cannot know that. Neither can I.

I do not know your market, your prices, whether you answer your phone, or what you are like on it. Anyone who promises you a lead count is either guessing or lying, and both should worry you.

What I will promise is the only thing that is actually inside my control: your site is live within ten business days of our call, or the engine you paid for costs you nothing and you keep the site anyway.

That is the whole guarantee. I would rather give you one I can keep.

${nurtureLink(9)}`,
  },
  {
    step: 110,
    day: 10,
    subject: "Numbers out of a real account",
    body: (first) => `${first},

Not a case study. An account I can open.

Premier Dental Academy of Longview runs on this exact stack. 455 first party leads since May 4. July ads at a 4.45 percent click through rate and 72 cents a click.

Premier Dental Academy and The LeadFlow Pro share common ownership. I tell you that up front, because it is the reason I can pull those numbers straight out of the account instead of describing them at you.

Everything else I have built and handed over is here, live and clickable, running on somebody else's domain:

https://www.theleadflowpro.com/portfolio?utm_source=email&utm_medium=nurture&utm_campaign=${NURTURE_CAMPAIGN}&utm_content=day10`,
  },
  {
    step: 111,
    day: 11,
    subject: "I already have a website",
    body: (first) => `${first},

Then bring it to the call and I will tell you straight which kind you have.

Most sites I see look fine and are dead behind the glass. No form that reaches anybody. No pixel. Nothing following up. Pretty, and doing nothing.

If yours is one of those, the free build becomes a second page you can point ads at, and the engine goes to work either way. Nothing gets torn down.

If yours is already working, I will tell you that too and we will talk about the engine only. I am not going to sell you a site you do not need.

${nurtureLink(11)}`,
  },
  {
    step: 112,
    day: 12,
    subject: "Six photos beat any stock image",
    body: (first) => `${first},

Whether we ever work together, do this.

Go take six pictures on your phone. Your truck. Your shop. Your hands doing the work. A finished job. Your crew. You.

Not staged. Just real.

Every stock photo on a small business site says the same thing to a customer: this could be anybody. Six real photos say: this is a person in my town who does this work.

That is a free upgrade and it takes twenty minutes.

If you want somewhere good to put them, that part I do for free too.

${nurtureLink(12)}`,
  },
  {
    step: 113,
    day: 13,
    subject: "Where does a lead actually land?",
    body: (first) => `${first},

Say it out loud and follow it.

Somebody fills in your form. Where does it go?

If the answer is an email address you check on Sundays, you do not have a lead system. You have a suggestion box.

The fix is not complicated. A form that emails and pings you inside seconds, and one place you actually look. That is included free in every build I do, because a form that does not reach you is not a feature, it is decoration.

${nurtureLink(13)}`,
  },
  {
    step: 114,
    day: 14,
    subject: "Two weeks. The mistake I see most.",
    body: (first) => `${first},

Two weeks of these. Here is the pattern I see more than any other.

People spend money at the front and nothing at the back. Ads, boosted posts, a new logo, another platform. Then the lead arrives and hits a business that answers when it can.

You cannot out-spend a leak at the back. You just pay more per hole.

Fix the back first. It is cheaper, it is faster, and it makes everything you already spend work harder.

That is why the cheapest thing I sell is the follow-up and not the website.

${nurtureLink(14)}`,
  },
  {
    step: 115,
    day: 15,
    subject: "Halfway. Three questions.",
    body: (first) => `${first},

Fifteen days. Here are the three I ask on every call.

One. When somebody calls and nobody picks up, what happens next?
Two. Where does a lead physically land, and who looks at it?
Three. If Facebook shut your page off tomorrow, what would you still own?

Most owners find one of those uncomfortable. The uncomfortable one is usually the cheapest thing to fix.

Want to walk your three answers with me? That is what the twenty minutes is for. No pitch deck, no slides.

${nurtureLink(15, "/book")}`,
  },
  {
    step: 116,
    day: 16,
    subject: "What a pixel actually does",
    body: (first) => `${first},

Nobody explains this in plain English, so here it is.

A pixel is a few lines of code on your website that tells Facebook, quietly, that a person visited. That is it. No names, no spying on your customers.

Why it matters: without it, when you run an ad, Facebook is guessing who might be interested. With it, Facebook can see which kind of person actually reads your page and go find more like them.

Running ads with no pixel is paying for a search party and refusing to give them a description.

It takes me four minutes to install and it is free in every build I do.

${nurtureLink(16)}`,
  },
  {
    step: 117,
    day: 17,
    subject: "I am too small for this",
    body: (first) => `${first},

That is the one I hear most, and it is usually backwards.

A big company can survive a missed call. It has four other people answering phones. You cannot. One missed call is a real percentage of your month.

Small is exactly who this is for. That is why the entry is $197 and not $3,000, and why the site is free instead of the thing you save up for.

If you are one truck and a phone, you are not too small. You are the whole point.

${nurtureLink(17)}`,
  },
  {
    step: 118,
    day: 18,
    subject: "The follow-up, explained in one email",
    body: (first) => `${first},

Five pieces. That is the entire thing.

One. The five minute first reply, so answering is a tap.
Two. A missed call message you save as a quick reply on your own phone.
Three. A five message email sequence for one offer, in your voice, spaced so the second and third add something instead of repeating the pitch.
Four. A review request paired with your direct Google link.
Five. A one page cheat sheet of what goes out when, for whoever answers the phone.

Written for your business, handed to you, yours to keep and reuse forever.

$197, and the website comes free with it.

${nurtureLink(18)}`,
  },
  {
    step: 119,
    day: 19,
    subject: "The ask you are not making",
    body: (first) => `${first},

You finish a job. Customer is happy. You drive off.

That was the moment. It does not come back.

Two days later they cannot remember your name well enough to type it into Google, and the review that would have brought you the next three customers never gets written.

Free fix, today: get your direct Google review link, save it in your phone as a contact note, and send it before you pull out of the driveway. Not tomorrow. Before you pull out.

That one habit is worth more than most of what people pay agencies for.

${nurtureLink(19)}`,
  },
  {
    step: 120,
    day: 20,
    subject: "The day you fire me",
    body: (first) => `${first},

Think about it, because I do.

The day you fire me, you keep the domain, because it is in your name. You keep the site, because it is on your hosting. You keep the pixel, because it is on your ad account. You keep every lead, because they went to your inbox. You keep the posts, because they were scheduled inside your accounts.

You revoke my access in one click and nothing breaks.

Most people build it the other way on purpose, so leaving costs you everything. That is not a service. That is a hostage situation with an invoice.

${nurtureLink(20)}`,
  },
  {
    step: 121,
    day: 21,
    subject: "Three weeks",
    body: (first) => `${first},

Three weeks of these, so I will tell you something true.

I built this whole thing because I needed a platform nobody could take away from me. I have been shut off, buried, and talked about by people who never asked me a question. When that happens, the only thing that holds is what you actually own.

That is not a marketing angle for me. It is the reason the work exists.

So when I tell you the domain goes in your name and the leads go to your inbox, understand that I am not being generous. I am building you the thing I wish somebody had built me.

${nurtureLink(21)}`,
  },
  {
    step: 122,
    day: 22,
    subject: "Why $197 and not $3,000",
    body: (first) => `${first},

Because $3,000 is where good work goes to die in a small business.

You save for it. You put it off. You finally do it, once, and then it sits for two years because another three grand is not happening.

$197 is a decision you can make on a Tuesday. It is also small enough that I have to be good, because nobody stays for a second thing they were not impressed by the first time.

The site being free is the same logic. I would rather be judged on the work than on the invoice.

${nurtureLink(22)}`,
  },
  {
    step: 123,
    day: 23,
    subject: "What I actually do in those ten days",
    body: (first) => `${first},

Day one. Twenty minutes on the phone. What you do, who you want calling, what you want them to do when they land.

Days two to five. I write and build. Your words, your photos, your offer. Not a template with your name dropped in.

Day five or six. Draft in your hands. You look at it on your phone, same as your customers will.

Days seven and eight. One round of changes. You mark what is wrong, I fix it.

Days nine and ten. Live on your domain, form tested, pixel firing, engine switched on, and a walkthrough of what is running and where.

That is the whole ten days. No mystery, no black box.

${nurtureLink(23)}`,
  },
  {
    step: 124,
    day: 24,
    subject: "The Sunday inbox",
    body: (first) => `${first},

Somebody filled in your form on a Wednesday.

You saw it Sunday night, sitting under forty other emails. You meant to reply Monday. Monday was busy.

They hired somebody Thursday.

That is not a discipline problem. It is a design problem. You built a system that requires you to be attentive on your worst day, and then blamed yourself when you were not.

Build one that does not need you at your best. That is the whole job.

${nurtureLink(24)}`,
  },
  {
    step: 125,
    day: 25,
    subject: "Posting when you have nothing to say",
    body: (first) => `${first},

Everybody freezes on this one, so here is the list I use.

The job you just finished. The question you got asked twice this week. The thing customers always get wrong. What you charge and why. What you will not do and why. The tool in your hand right now. A before and after. Why you started.

Eight prompts. Rotate them and you have a month.

You do not need to be clever online. You need to be visible and specific. Specific beats clever every single time.

If you would rather not think about it at all, that is what the $497 buys. Forty two of them, written in your voice, scheduled in your accounts.

${nurtureLink(25)}`,
  },
  {
    step: 126,
    day: 26,
    subject: "What another year of the same looks like",
    body: (first) => `${first},

Not a scare. Just straight.

If nothing changes, next August looks like this August. Same missed calls. Same leads gone cold because nobody followed up twice. Same monthly bills to four platforms for tools you do not own and cannot take with you.

Nothing dramatic happens. That is what makes it dangerous. It costs you quietly and never sends an invoice for it.

I made the build free so the price would stop being the reason people stay stuck.

The price is not the reason anymore.

${nurtureLink(26)}`,
  },
  {
    step: 127,
    day: 27,
    subject: "Exactly what happens on the call",
    body: (first) => `${first},

In case you are avoiding it because you think it is a pitch.

Twenty minutes. No slides, no deck, no screen share.

I ask what you do and who you want calling you. I ask what happens now when somebody reaches out. I tell you the fastest thing to fix, whether it is me or not.

If it is not me, I will say so and tell you what to do instead. That has happened plenty and I sleep fine.

If it is me, we start the ten day clock right there on the call.

${nurtureLink(27, "/book")}`,
  },
  {
    step: 128,
    day: 28,
    subject: "Who this is not for",
    body: (first) => `${first},

Worth saying out loud.

Not for you if you want twelve pages, a blog and a store. That is a different job and a bigger number.

Not for you if you want somebody to hand you a folder of drafts and disappear. I build it and switch it on, or I do not take it.

Not for you if you want me to promise you a lead count. I will not, and you should walk away from anyone who does.

Not for you if you are not going to answer your phone. Nothing I build fixes that.

Everything else, we can probably work with.

${nurtureLink(28)}`,
  },
  {
    step: 129,
    day: 29,
    subject: "Four a week, and why",
    body: (first) => `${first},

Four free builds a week. That is not a scarcity trick, it is arithmetic.

Each one is a call, a build, a revision round, a launch and a walkthrough, done by one person. Four is what fits in a week without the fifth one being worse than the first four.

When the week is full it rolls to Monday. Nobody gets bumped and nothing gets rushed.

If you have been circling this for a month, that is the only real reason to move now. Not a fake timer.

${nurtureLink(29)}`,
  },
  {
    step: 130,
    day: 30,
    subject: "Last one from me",
    body: (first) => `${first},

Thirty days. This is the last email in this sequence and I am not going to keep pushing.

If the timing is wrong, that is a real answer and I respect it. Keep my number: (903) 500-8898. Text it whenever, even a year from now, even if it is just a question you want a straight answer to. I will answer it either way.

If the timing is right, the offer has not changed and it is not going to. I build the site for free. You pay for the engine. From $197, one payment, live in ten business days from our call.

${nurtureLink(30)}

Thank you for reading this far. I built this whole thing because I needed a platform nobody could take from me. I would rather help you build yours than watch you rent one.

Ryan`,
  },
];

/**
 * True between 8am and 6pm America/Chicago. The only window we send in.
 *
 * The cron is scheduled at 16:00 UTC, which is already inside the window in
 * both halves of the year. This guard exists for the day somebody retimes the
 * cron, or Vercel runs a backlogged invocation late: a daily business email
 * landing at 2am reads as a machine that got loose, and it is the kind of
 * mistake that gets a sending domain marked as spam rather than merely
 * ignored. Central because that is where Ryan and the leads are.
 */
export function inSendWindow(now: Date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
  // Intl renders midnight as "24" in some ICU builds. Normalize it to 0 so an
  // overnight run is never mistaken for 2pm.
  const normalized = hour === 24 ? 0 : hour;
  return normalized >= 8 && normalized < 18;
}

/** The step due for a lead this many days old, or null. Highest due wins. */
export function stepDueOnDay(ageInDays: number): NurtureStep | null {
  let due: NurtureStep | null = null;
  for (const step of NURTURE_STEPS) {
    if (step.day <= ageInDays) due = step;
  }
  return due;
}

/** Every step at or before this age, oldest first. Used to catch a lead up. */
export function stepsDueBy(ageInDays: number): NurtureStep[] {
  return NURTURE_STEPS.filter((s) => s.day <= ageInDays);
}

export const NURTURE_FIRST_STEP = NURTURE_STEPS[0].step;
export const NURTURE_LAST_STEP = NURTURE_STEPS[NURTURE_STEPS.length - 1].step;

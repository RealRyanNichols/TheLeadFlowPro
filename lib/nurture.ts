// The 30 day follow-up sequence.
//
// WHY THIS FILE EXISTS: from August 17 to today, every lead that came through
// any door got exactly one welcome email and then silence forever. The old
// sequence lived inside a Resend automation nobody could read, was written for
// an offer that got retired, and was switched off by returning false from
// shouldEnrollInLegacyEmailSeries(). Paid traffic was landing in a bucket with
// no bottom.
//
// This version lives in the repo. It is versioned, reviewable, and it sends
// from our own cron on our own schedule. Own your platform applies to us too.
//
// HOW IT RUNS: /api/cron/nurture runs daily. For each live, consented,
// non-unsubscribed lead it works out how many days old the lead is, finds the
// step due on or before that day, and sends the highest unsent one. Every send
// is claimed in lead_emails (UNIQUE lead_id + step), so a lead can never get
// the same email twice even if two runs overlap.
//
// STEP NUMBERS start at 101 on purpose. Steps 0 to 4 in lead_emails are
// history from the retired sequence. Never reuse them.
//
// RULES FOR EVERY EMAIL IN HERE:
//   - No promise of leads, sales, revenue, ROAS, cost per lead, conversion
//     rate, or a position in Google. Ever. Not even softened.
//   - No em dashes. Short lines. Say the thing.
//   - Every email must carry a real reason to open the next one.
//   - Every email ends with a working unsubscribe. One click, no login.

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
    subject: "The actual offer, in two lines",
    body: (first) => `${first},

Here it is with nothing around it.

I build your website for free.
You pay for the engine that makes it work.

That is the whole trade. The site is $0 at every tier. What you pay for is the thing running behind it: posts going out in your accounts, follow-up that answers people while they still care, leads landing somewhere you will actually see them.

Three ways to start, from $197, one time. Nothing monthly and nothing to cancel.

${nurtureLink(1)}

If it is not live in 10 business days from our call, you keep the site and the engine costs you nothing.`,
  },
  {
    step: 102,
    day: 3,
    subject: "Why I quit charging for websites",
    body: (first) => `${first},

I watched a man pay three thousand dollars for a website.

It was a good looking website. It also did not have a form that reached his phone, did not have a pixel on it, and had not been touched in two years. He was proud of it and it had never once brought him a customer.

That is most small business websites. A business card nobody asked for.

So I stopped charging for the part that sits there and started charging for the part that works. Posting. Follow-up. Review asks. The engine.

The site comes free with it, because on its own the site is not worth your money.

${nurtureLink(3)}`,
  },
  {
    step: 103,
    day: 5,
    subject: "You are not losing leads at the ad",
    body: (first) => `${first},

Everybody blames the ad.

Almost nobody is losing people at the ad. They are losing them twenty minutes later, when the person who called got voicemail, or the form went to an inbox nobody opens, or the reply came back the next afternoon when they had already hired somebody else.

You already paid for that lead. The ad money is spent either way. The only question is whether anything answers.

That is what the follow-up engine is. The five minute first reply, the missed call message, a real sequence for one offer, and the review ask at the end of the job. Written in your words, handed to you, yours to keep.

$197 with the free build attached to it.

${nurtureLink(5)}`,
  },
  {
    step: 104,
    day: 8,
    subject: "You do not own your Facebook page",
    body: (first) => `${first},

Read that again.

You do not own your Facebook page. You do not own your Instagram followers. You cannot export the people who follow you, you cannot email them, and you cannot take them with you.

You are renting an audience from a company that can change the rules on a Tuesday and never tell you.

I know exactly what that feels like. I have been throttled, buried, and shut off. That is why every single thing I build for anybody lands in accounts with their name on them. Your domain. Your hosting. Your pixel. Your leads in your inbox.

If you fired me tomorrow you would keep all of it. That is not a sales line, it is the design.

${nurtureLink(8)}`,
  },
  {
    step: 105,
    day: 12,
    subject: "What $497 actually gets you",
    body: (first) => `${first},

No mystery. Here is the middle one, itemized.

Free, at $0:
A two page site built for a phone first. A form that emails you the second somebody fills it in. Your Meta pixel installed so your ads can learn. Click to call and click for directions. On a domain in your name. Twelve months of small changes free.

Paid, $497 one time:
42 posts. Three a day for fourteen days. Written in your voice, not spun out of a template with your name pasted in. Scheduled inside your own Facebook, Instagram and X accounts through official partner access, so you never hand me a password. Plus a walkthrough of exactly what is scheduled and where to find it.

That is it. One payment. No seat, no subscription, nothing that renews on you in six months.

${nurtureLink(12)}`,
  },
  {
    step: 106,
    day: 16,
    subject: "Numbers from a real account, not a case study",
    body: (first) => `${first},

I am not going to tell you what results you will get. Nobody honest can.

What I can do is show you an account.

Premier Dental Academy of Longview runs on this exact stack. 455 first party leads since May 4. July ads at a 4.45 percent click through rate and 72 cents a click. Premier Dental Academy of Longview and The LeadFlow Pro share common ownership, and I tell you that up front, because it is the reason I can pull those numbers straight out of the account instead of describing them at you.

Every other system I have built and handed over is listed here, live, clickable, and running on somebody else's domain:

https://www.theleadflowpro.com/portfolio?utm_source=email&utm_medium=nurture&utm_campaign=${NURTURE_CAMPAIGN}&utm_content=day16

Go click them. That is what proof is supposed to look like.`,
  },
  {
    step: 107,
    day: 21,
    subject: "The three questions I ask on every call",
    body: (first) => `${first},

Use these whether you ever hire me or not.

One. When somebody calls you and nobody picks up, what happens next?
If the answer is nothing, that is the cheapest hole in your business to plug.

Two. Where does a lead physically land?
If it lands in an inbox you check on Sundays, you do not have a lead system, you have a suggestion box.

Three. If Facebook shut your page off tomorrow, what would you still own?
If the honest answer is nothing, you are not building a business online. You are renting one.

Most owners find at least one of those uncomfortable. That is the point. The uncomfortable one is usually the cheapest thing to fix.

If you want me to walk your three answers with you, that is what the twenty minute call is.

${nurtureLink(21, "/book")}`,
  },
  {
    step: 108,
    day: 26,
    subject: "What another year of the same looks like",
    body: (first) => `${first},

I am not going to scare you. I am going to be straight.

If nothing changes, next August looks like this August. Same missed calls. Same leads that went cold because nobody answered them twice. Same monthly bills to four platforms for tools you do not own and cannot take with you.

Nothing dramatic happens. That is what makes it dangerous. It just costs you quietly, every month, and it never sends you an invoice for it.

The reason I made the build free is that I got tired of the price being the reason people stayed stuck. So the price is not the reason anymore.

From $197. One payment. Site free. Live in 10 business days from our call or the engine costs you nothing.

${nurtureLink(26)}`,
  },
  {
    step: 109,
    day: 30,
    subject: "Last one from me",
    body: (first) => `${first},

This is the last email in this sequence. I am not going to keep pushing.

If the timing is wrong, that is a real answer and I respect it. Keep my number: (903) 500-8898. Text it whenever, even if it is a year from now, even if it is just a question you want a straight answer to.

If the timing is right, the offer has not changed and it is not going to. I build the site for free. You pay for the engine. From $197, one payment, live in 10 business days from our call.

${nurtureLink(30)}

Either way, thank you for reading this far. I built this whole thing myself because I needed a platform nobody could take from me. I would rather help you build yours than watch you rent one.

Ryan`,
  },
];

/** The step due for a lead this many days old, or null. Highest due wins. */
export function stepDueOnDay(ageInDays: number): NurtureStep | null {
  let due: NurtureStep | null = null;
  for (const step of NURTURE_STEPS) {
    if (step.day <= ageInDays) due = step;
  }
  return due;
}

/** Every step at or before this age, oldest first. Used to backfill. */
export function stepsDueBy(ageInDays: number): NurtureStep[] {
  return NURTURE_STEPS.filter((s) => s.day <= ageInDays);
}

export const NURTURE_FIRST_STEP = NURTURE_STEPS[0].step;
export const NURTURE_LAST_STEP = NURTURE_STEPS[NURTURE_STEPS.length - 1].step;

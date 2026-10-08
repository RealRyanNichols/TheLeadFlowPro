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

import { LEADFLOW_META } from "@/lib/metaCampaignGuard";
import type { NurtureContext } from "@/lib/nurtureContext";
import { BUSINESS } from "@/lib/site/business";
import { eventWhen, featuredEvent, featuredEventStartMs } from "@/lib/site/events";
import { usd } from "@/lib/site/prices";
import { MANAGED_COMMERCIAL_TERMS, managedAdvertisingExplanation, managedAdditionalScopeExplanation } from "@/lib/site/managedPlans";

// Part of the send idempotency key (lib/nurtureDelivery.ts). Never rename it,
// even though the offer it was named for is retired.
export const NURTURE_CAMPAIGN = "free_build";
/** Immutable cutoff shared by the transactional welcome and v1 follow-ups. */
export const META_SALES_START = "2026-10-08T12:00:00.000Z";

// The free website build was retired on 2026-09-22 (its page is a 301 to
// /services). New leads get the Rent Receipt series (lib/nurtureRentReceipt.ts);
// only earlier leads or leads that already started this sequence finish it.
// Future sends describe current managed acquisition terms. Existing approved scopes,
// campaign keys, step IDs, recipient eligibility, and send history stay intact.
const CAMPAIGN_UPFRONT = usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd);
const CAMPAIGN_DAYS = MANAGED_COMMERCIAL_TERMS.initialCampaignDays;

/**
 * The business diagnostic has its own consent snapshot, submission clock, and
 * seven-day sequence. It must never fall into this general 30-day campaign.
 *
 * Keep this check tolerant of the two places attribution can live while old
 * and new lead writers coexist: the top-level leads.source column and the
 * structured leads.diagnostic payload.
 */
export const BUSINESS_DIAGNOSTIC_SOURCE = "business_growth_diagnostic";

export type NurtureLeadAttribution = {
  source?: unknown;
  diagnostic?: unknown;
};

export type FreeWebsiteNurtureCandidate = NurtureLeadAttribution & {
  interest?: unknown;
  marketing_email_consent?: unknown;
};

/**
 * Meta instant forms whose leads belong in this 30-day sequence. The v2 free
 * website form plus the Sep 2026 volume lanes that all sell the same flagship
 * offer: the $0 build, the services menu, and the scoreboard. The workshop
 * form is NOT here; it has its own short sequence below.
 */
export const FREE_BUILD_SEQUENCE_META_FORM_IDS: ReadonlySet<string> = new Set([
  LEADFLOW_META.formId,
  "2016689789051460", // Free Website: optional 30-day email checkbox
  "2043120369669082", // Free Build Volume: optional daily email checkbox
  "2235052820606054", // Time Back: separate optional marketing checkbox
  "1794058118689457", // Fix First: optional marketing checkbox
  "1602617814609528", // LFP Free Build NoQ v2
  "1001553739566746", // LFP Services Volume v1
  "1072145798524733", // LFP Scoreboard Volume v1
  "1075109702046952", // LFP | Qualified | Budget + Timeline (Amanda/PDA video ad)
  "3610264839155246", // LFP | Rent Receipt | Pain + Timeline v1 (mall video)
  "2349934135833664", // LFP Enrollment Gap Timeline v1 (schools)
]);

export const GENERAL_NURTURE_LOOKBACK_DAYS = 45;
export const RESTORED_FORM_RECOVERY_LOOKBACK_DAYS = 75;

/**
 * Two consented Free Build Volume leads had their first four steps accepted,
 * then their registered form disappeared from this admission list. Give this
 * restored form enough time to finish its original thirty steps, one per day.
 * Existing step history, opt-outs and delivery claims still govern every send.
 * Other general forms retain their original forty-five-day limit.
 */
export function generalNurtureLookbackDays(lead: NurtureLeadAttribution): number {
  if (lead.source !== "meta_lead_ad") return GENERAL_NURTURE_LOOKBACK_DAYS;
  const diagnostic = lead.diagnostic;
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    return GENERAL_NURTURE_LOOKBACK_DAYS;
  }
  return (diagnostic as Record<string, unknown>).form_id === "2043120369669082"
    ? RESTORED_FORM_RECOVERY_LOOKBACK_DAYS
    : GENERAL_NURTURE_LOOKBACK_DAYS;
}

/** LFP Workshop Sep 17 Volumev1 — enrolled in the workshop sequence instead. */
export const WORKSHOP_META_FORM_ID = "1749164796410610";

/**
 * The free-build sequence is an offer-specific campaign, not a general list.
 * Admit the owned website funnel, or a Meta lead from one of the admitted
 * instant forms above, and only when marketing_email_consent is true (a
 * checked box, or an inquiryOptIn form per lib/metaCampaignGuard).
 */
export function isFreeWebsiteProgramNurtureLead(
  lead: FreeWebsiteNurtureCandidate,
): boolean {
  if (lead.marketing_email_consent !== true) return false;
  if (!lead.diagnostic || typeof lead.diagnostic !== "object" || Array.isArray(lead.diagnostic)) {
    return false;
  }

  const diagnostic = lead.diagnostic as Record<string, unknown>;
  if (
    lead.source === "meta_lead_ad" &&
    typeof diagnostic.form_id === "string" &&
    FREE_BUILD_SEQUENCE_META_FORM_IDS.has(diagnostic.form_id)
  ) {
    return true;
  }
  return (
    lead.interest === "free_website_program" &&
    diagnostic.source === "free_build_funnel" &&
    lead.source === "website"
  );
}

/**
 * Workshop leads get the short seats-and-deadline sequence, never the 30-day
 * campaign. Same consent rule as above.
 */
export function isWorkshopNurtureLead(lead: FreeWebsiteNurtureCandidate): boolean {
  if (lead.marketing_email_consent !== true) return false;
  if (!lead.diagnostic || typeof lead.diagnostic !== "object" || Array.isArray(lead.diagnostic)) {
    return false;
  }
  const diagnostic = lead.diagnostic as Record<string, unknown>;
  return lead.source === "meta_lead_ad" && diagnostic.form_id === WORKSHOP_META_FORM_ID;
}

export function isBusinessDiagnosticLead(lead: NurtureLeadAttribution): boolean {
  if (lead.source === BUSINESS_DIAGNOSTIC_SOURCE) return true;
  if (!lead.diagnostic || typeof lead.diagnostic !== "object" || Array.isArray(lead.diagnostic)) {
    return false;
  }

  const diagnostic = lead.diagnostic as Record<string, unknown>;
  return (
    diagnostic.source === BUSINESS_DIAGNOSTIC_SOURCE ||
    diagnostic.campaign === BUSINESS_DIAGNOSTIC_SOURCE
  );
}

/** Where every link in this sequence points, with attribution attached. */
export function nurtureLink(day: number, path = "/services"): string {
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
  /**
   * A subject that depends on what the lead told us (the Rent Receipt series
   * writes days one to five per pain). Wins over subject when present.
   */
  subjectFor?: (context: NurtureContext) => string;
  /**
   * Body without the signature or the unsubscribe line: the cron adds both.
   * The context carries the form answers; the Free Build steps ignore it.
   */
  body: (firstName: string, context?: NurtureContext) => string;
};

export const NURTURE_STEPS: NurtureStep[] = [
  {
    step: 101,
    day: 1,
    subject: "🏗️ The current starting point",
    body: (first) => `${first},

Here it is with nothing around it.

Managed acquisition campaigns start at ${CAMPAIGN_UPFRONT} upfront for one campaign lasting up to ${CAMPAIGN_DAYS} days. The agreed build, onboarding, and advertising allocation are included in the written scope.

We agree the services, territory, acquisition target, and what counts before work starts. No automatic monthly renewal.

Smaller storefront and product builds have a separate written quote. Earlier approved agreements keep their own prices and deliverables; new work does not change anything already owed.

${nurtureLink(1, "/pricing")}`,
  },
  {
    step: 102,
    day: 2,
    subject: "What the campaign includes",
    body: (first) => `${first},

One campaign. A written scope before payment or work.

The first ${CAMPAIGN_DAYS} days start at ${CAMPAIGN_UPFRONT} upfront. We name the agreed build, onboarding, advertising allocation, outcome target, attribution, and your responsibilities.

A lead or appointment is not an acquired job or completed deal. We agree how outcomes are counted and use your closing records.

Your accounts stay in your name. Additional targets are agreed and paid upfront; nothing charges automatically when a job closes.

Earlier signed scopes retain their own terms.

${nurtureLink(2, "/pricing")}`,
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

The website needs to support the acquisition campaign, not just look finished. We define that work in the written scope.

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

If you want help with the follow up, we define that work inside the campaign scope before anything starts.

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
    subject: "💼 The campaign, itemized",
    body: (first) => `${first},

One managed acquisition campaign, starting at ${CAMPAIGN_UPFRONT} upfront, for up to ${CAMPAIGN_DAYS} days.

The agreed build, onboarding, and advertising allocation are included. We write down the services, territory, acquisition target, and what you own before you pay.

${managedAdvertisingExplanation()}

If the agreed target is reached early, new acquisition ends. Captured inquiries are still handed over. At day 90 we review results; there is no automatic extension.

Any next campaign needs a new written scope and price. Existing approved agreements keep their own terms.

${nurtureLink(6, "/pricing")}`,
  },
  {
    step: 107,
    day: 7,
    subject: "One week in. One question.",
    body: (first) => `${first},

Seven emails. Here is the only question that matters this week.

When somebody calls your business and nobody picks up, what happens next?

If the honest answer is nothing, start with a saved reply and a callback habit. Bring the follow-up problem into the campaign scope if you need help building it.

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

We agree the campaign scope, territory, outcome target, and timing before work starts. Existing approved builds retain their written timelines and deliverables.

No promise of leads, sales, revenue, ad return, or a Google position. I would rather give you a delivery target I can keep.

${nurtureLink(9)}`,
  },
  {
    step: 110,
    day: 10,
    subject: "📊 Proof you can inspect",
    body: (first) => `${first},

Premier Dental Academy of Longview runs on the larger version of this approach: public pages, forms, first-party lead records, follow-up, analytics, and an operating dashboard connected in accounts the business controls.

Premier Dental Academy and The LeadFlow Pro share common ownership. I tell you that up front because ownership is part of the source.

The live systems and current proof are here. Click them. Inspect them. Do not take my word for it:

https://www.theleadflowpro.com/portfolio?utm_source=email&utm_medium=nurture&utm_campaign=${NURTURE_CAMPAIGN}&utm_content=day10`,
  },
  {
    step: 111,
    day: 11,
    subject: "I already have a website",
    body: (first) => `${first},

Then bring it to the call and I will tell you straight which kind you have.

Most sites I see look fine and are dead behind the glass. No form that reaches anybody. No pixel. Nothing following up. Pretty, and doing nothing.

If yours is one of those, we define any replacement or campaign path in writing before work begins. Nothing gets torn down without approval.

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

If website work belongs in your campaign, those photos help make it specific to your business.

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

The fix starts with a form that reaches the agreed inbox and one place you actually look. We define and test that inquiry path in the campaign scope; a form that reaches nobody is decoration.

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

That is why follow up belongs in the acquisition campaign, alongside the website and advertising.

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

A pixel is tracking code that records approved website activity for measurement and ad optimization. It does not hand you a visitor's name, but it still requires clear disclosure, a lawful configuration, and the client's account ownership.

Why it matters: without it, when you run an ad, Facebook is guessing who might be interested. With it, Facebook can see which kind of person actually reads your page and go find more like them.

Running ads with no verified conversion signal makes the platform optimize with less information.

If Meta tracking belongs in the scope, it is installed in the client's account and tested there. It is never reused across clients.

${nurtureLink(16)}`,
  },
  {
    step: 117,
    day: 17,
    subject: "Am I ready for this campaign?",
    body: (first) => `${first},

The managed acquisition starting investment is ${CAMPAIGN_UPFRONT} upfront for up to ${CAMPAIGN_DAYS} days. It has to fit your business, not just your desire for more calls.

Can you answer inquiries, quote the work, and take on the jobs if the campaign works? Those questions matter as much as the advertising.

If the timing or investment does not fit, use the free tools and keep what already works. A written scope comes before any commitment.

Earlier approved agreements retain their own terms.

${nurtureLink(17, "/pricing")}`,
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

We agree which of these pieces belong in your campaign. Earlier purchased work keeps its own deliverables and terms.

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
    subject: "Know the investment before the work",
    body: (first) => `${first},

Managed acquisition campaigns start at ${CAMPAIGN_UPFRONT} upfront for up to ${CAMPAIGN_DAYS} days. The agreed build, onboarding, and advertising allocation belong in the written campaign scope.

${managedAdditionalScopeExplanation()}

If the target is reached early, new acquisition ends and captured inquiries are still handed over. At day 90 we review results and capacity, with no automatic extension.

If the evidence supports a higher investment, we agree the next scope and price before payment or work. Existing approved scopes retain their terms.

${nurtureLink(22, "/pricing")}`,
  },
  {
    step: 123,
    day: 23,
    subject: "How an approved build reaches preview",
    body: (first) => `${first},

For an existing approved five-page build, its written timeline and deliverables still apply. The outline below describes that build process; a new campaign has its own agreed scope and timing.

Day one. Written scope and complete intake. What you do, who you want calling, the five pages, the offer, ownership, outside costs, and exclusions.

Days two to five. I write and build. Your words, your photos, your offer. Not a template with your name dropped in.

Day five or six. Draft in your hands. You look at it on your phone, same as your customers will.

Days seven and eight. One consolidated launch review. You mark what is wrong inside the scope, I correct it.

Days nine and ten. Working-preview target. Form, links, mobile layout, analytics, search settings, and ownership path tested before launch.

That is the target after the scope, intake, photos, and access approvals are complete. No mystery, no black box.

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

If you want help producing the content, we agree the work, publishing responsibilities, and capacity within your campaign scope. Existing purchased content retains its approved deliverables.

${nurtureLink(25)}`,
  },
  {
    step: 126,
    day: 26,
    subject: "What another year of the same looks like",
    body: (first) => `${first},

Not a scare. Just straight.

If nothing changes, next year can still mean missed calls, leads gone cold because nobody followed up, and bills for tools you barely use.

Start by finding the leak. Some fixes are habits you can change today. Others need a scoped build and a campaign your business can support.

Managed acquisition campaigns start at ${CAMPAIGN_UPFRONT} upfront for up to ${CAMPAIGN_DAYS} days, with the agreed build and advertising allocation included. Use the numbers to decide; there is no automatic commitment.

${nurtureLink(26, "/pricing")}`,
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

If it is me, we agree the campaign scope, start date, acquisition target, and included advertising allocation before work or payment.

${nurtureLink(27, "/book")}`,
  },
  {
    step: 128,
    day: 28,
    subject: "Who this is not for",
    body: (first) => `${first},

Worth saying out loud.

Not for you if you want unlimited pages or an open-ended redesign. The agreed build and capacity are defined in the campaign scope.

Not for you if you want somebody to hand you a folder of drafts and disappear. I build it and switch it on, or I do not take it.

Not for you if you want me to promise you a lead count. I will not, and you should walk away from anyone who does.

Not for you if you are not going to answer your phone. Nothing I build fixes that.

Everything else, we can probably work with.

${nurtureLink(28)}`,
  },
  {
    step: 129,
    day: 29,
    subject: "Capacity before commitment",
    body: (first) => `${first},

Before we accept a campaign, we check your services, territory, and capacity to handle the work.

Interest is not a reservation. The written agreement defines any service-area protection and the acquisition goal. We do not invent a slot count to rush you.

The first managed acquisition campaign starts at ${CAMPAIGN_UPFRONT} upfront for up to ${CAMPAIGN_DAYS} days. If the fit is wrong, we say so before payment or work.

Earlier approved scopes keep their terms. A new campaign does not replace anything already agreed.

${nurtureLink(29, "/pricing")}`,
  },
  {
    step: 130,
    day: 30,
    subject: "🏁 Last one from me",
    body: (first) => `${first},

Thirty days. This is the last email in this sequence.

If the timing is wrong, keep my number: ${BUSINESS.phone.display}. Text whenever you have a question.

For a managed acquisition campaign, the starting point is ${CAMPAIGN_UPFRONT} upfront for one campaign lasting up to ${CAMPAIGN_DAYS} days. The agreed build, onboarding, and advertising allocation are included in writing.

Reach the agreed target early and new acquisition ends. Captured inquiries are still handed over. At day 90 we review results, with no automatic extension.

A higher investment needs a new written scope and price. Existing approved agreements keep their own terms.

${nurtureLink(30, "/pricing")}

Thank you for reading.

Ryan`,
  },
];

/** The subject for a lead, honoring a per-lead subject when the step defines one. */
export function nurtureSubjectFor(step: NurtureStep, context?: NurtureContext): string {
  return context && step.subjectFor ? step.subjectFor(context) : step.subject;
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

// ---------------------------------------------------------------------------
// The Sep 17 workshop sequence. Four short emails, days 1 through 4 after the
// lead, for people who raised a hand on the workshop instant form but have
// not paid for a seat. The instant welcome at capture is day zero and lives in
// lib/leadNotify.ts like everything else.
//
// STEP NUMBERS 201-204. The 30-day campaign owns 101-130 and retired history
// owns 0-4; never reuse either range.
//
// HARD STOP: the event happens Thursday Sep 17 at 6:30 PM Central. No email
// in this sequence may go out after the doors close. The cron checks
// workshopSequenceClosed() before sending and skips these leads entirely once
// it returns true.

// The class start, read from the featured event config (lib/site/events.ts)
// so the cutoff moves with the date instead of living in two places.
export const WORKSHOP_CUTOFF_MS = featuredEventStartMs();
const WORKSHOP_WHEN = eventWhen(featuredEvent());
const WORKSHOP_PRICE = usd(featuredEvent().priceUsd);

export function workshopSequenceClosed(now = Date.now()): boolean {
  return now >= WORKSHOP_CUTOFF_MS;
}

export function workshopLink(day: number): string {
  return (
    (featuredEvent().externalSiteUrl ?? `${BUSINESS.siteUrl}${featuredEvent().registrationPath}`) +
    `?utm_source=email&utm_medium=nurture&utm_campaign=workshop_sep17_2026&utm_content=day${day}`
  );
}

export const WORKSHOP_STEPS: NurtureStep[] = [
  {
    step: 201,
    day: 1,
    subject: "What task are you bringing?",
    body: (first) => `${first},

Here is how the night works.

You bring one real task. A quote you keep putting off. A week of content. The follow up nobody sends.

We turn it into written instructions, check what comes back, and save it as a process you own. Then you use it Friday.

Ten owners, ten laptops, ten real tasks. That is the whole format.

Grab your seat:
${workshopLink(1)}`,
  },
  {
    step: 202,
    day: 2,
    subject: "You opened ChatGPT and closed it again",
    body: (first) => `${first},

Most business owners have done it. Opened ChatGPT, typed something, got something generic back, closed the tab.

That is not a you problem. Nobody showed you what to actually type for YOUR business.

That is what ${WORKSHOP_WHEN.shortDate} is for. Not a lecture. A working session.

Seats confirm after payment, ten max:
${workshopLink(2)}`,
  },
  {
    step: 203,
    day: 3,
    subject: "Small room on purpose",
    body: (first) => `${first},

I capped this at ten people on purpose.

I am not talking at a crowd. I am sitting down with owners and building. When you get stuck, I am at your table.

That only works in a small room. That is also why seats do not hold without payment.

${WORKSHOP_PRICE}, one evening, Longview:
${workshopLink(3)}`,
  },
  {
    step: 204,
    day: 4,
    subject: "Doors close on this one",
    body: (first) => `${first},

Last note from me about the workshop.

${WORKSHOP_WHEN.dateLabel}, ${WORKSHOP_WHEN.startTime}, Longview. Whatever seats are left when the room is full, that is that.

If the timing is wrong, no problem. Reply and tell me what you were hoping to build and I will point you at the next best step either way.

Last call for a chair:
${workshopLink(4)}`,
  },
];

/** Every workshop step at or before this age, oldest first. */
export function workshopStepsDueBy(ageInDays: number): NurtureStep[] {
  return WORKSHOP_STEPS.filter((s) => s.day <= ageInDays);
}

export const WORKSHOP_FIRST_STEP = WORKSHOP_STEPS[0].step;
export const WORKSHOP_LAST_STEP = WORKSHOP_STEPS[WORKSHOP_STEPS.length - 1].step;

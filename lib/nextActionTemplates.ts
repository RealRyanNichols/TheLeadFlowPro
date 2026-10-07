// What to say at each step of the follow-up plan: the call openers, the
// voicemails, the texts and the short personal emails, plus the three
// checklists (they reached out, set the next step, get ready for call two).
//
// Ryan, October 7, 2026: "next action templates." The next-action engine
// (lib/nextAction.ts) names the script for each lead by key; this file is
// where the words live, once.
//
// Rules for every line in here:
//   - Ryan's voice: short, plain, direct. No dashes. No hype.
//   - The first call never talks price (Pat, Sep 30 to Oct 2: two calls, never
//     money on call one, book the second call before you hang up).
//   - The question is the customer's result, not our tools: "How many more
//     jobs do you want this month?" (Pat's lesson: sell the hole, not the drill.)
//   - No promise of leads, jobs or revenue. Say what we cannot promise first.
//   - Scott's numbers only as he said them on the October 1, 2026 recording,
//     approximate, with the line that says it is one business and one month.
//     tests/next-action-templates.test.ts holds them to lib/contractorSeries.ts.
//   - Prices come from lib/site/prices.ts. None is typed here by hand.
//   - A text script exists only for a lead with recorded consent and no STOP;
//     the engine never hands one out otherwise.
//
// Nothing here sends anything. A person reads, copies, dials and types.

import { BUSINESS } from "@/lib/site/business";
import { MANAGED_COMMERCIAL_TERMS } from "@/lib/site/managedPlans";
import { PRICES } from "@/lib/site/prices";

export type ScriptChannel = "call" | "voicemail" | "text" | "email" | "checklist";

export type Script = {
  key: string;
  channel: ScriptChannel;
  title: string;
  /** Emails only. */
  subject?: string;
  body: string;
};

export type ScriptContext = {
  /** The lead's first name, or "" when the record has none. */
  firstName: string;
  /** The primary_service answer key from the contractor form, when given. */
  service?: string | null;
  /** Pat's follow-up group, when the lead answered his questions. */
  group?: string | null;
  /** Days since the lead arrived. */
  day?: number;
  /** Who is making the call. Defaults to Ryan. */
  sender?: string | null;
  /**
   * True for a lead from the contractor form (the Scott video). Those scripts
   * say "jobs" and may mention Scott; every other lead hears "customers" and
   * no story about a business that is nothing like theirs.
   */
  contractor?: boolean;
};

const PHONE = BUSINESS.phone.display;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/** The offer, in the words of the live ad. Built from the price file so it cannot drift. */
export const PRICE_LINE = `I price it by the job: ${usd(PRICES.farmAcquiredJobPlanningTarget)} for each job we set out to help you close. It starts at ${usd(PRICES.managedStartingUpfront)} for a campaign of up to ${MANAGED_COMMERCIAL_TERMS.initialCampaignDays} days, and the ad budget is part of what we agree to.`;

/** Scott's result, the way he said it, with the note that goes everywhere it goes. */
export const SCOTT_PROOF =
  "Scott runs O-L Guy Farms out of Tyler. On camera on October 1, 2026 he said he paid us about $500 and spent about $300 on ads that month, and one pond job came back with roughly $4,500 in margin by his own rough figure, before what he pays us. One business, one month. Not a promise of what yours will do.";

/** How each primary_service answer reads inside a sentence: "more dirt work jobs". */
export const SERVICE_WORK: Record<string, string> = {
  dirt_work_excavation_grading: "dirt work",
  land_clearing_brush_mulching: "land clearing",
  pond_building_cleanouts_expansion: "pond",
  farm_ranch_custom_ag: "farm and ranch",
  other_land_improvement: "land improvement",
};

function firstNameOf(ctx: ScriptContext): string {
  return (ctx.firstName ?? "").trim();
}

function hello(ctx: ScriptContext): string {
  const name = firstNameOf(ctx);
  return name ? `${name},` : "Hello,";
}

function sender(ctx: ScriptContext): string {
  const name = (ctx.sender ?? "").trim();
  return name || BUSINESS.operator.split(" ")[0];
}

function isContractor(ctx: ScriptContext): boolean {
  return ctx.contractor ?? Boolean(ctx.service || ctx.group);
}

/** "more dirt work jobs", "more jobs" when the form did not say, "more customers" for every other lead. */
function moreJobs(ctx: ScriptContext): string {
  if (!isContractor(ctx)) return "more customers";
  const work = ctx.service ? SERVICE_WORK[ctx.service] : null;
  return work ? `more ${work} jobs` : "more jobs";
}

/** The one question. The customer's result, never our tools. */
function theQuestion(ctx: ScriptContext): string {
  return isContractor(ctx) ? "How many more jobs do you want on the board this month?" : "How many more customers do you want this month?";
}

function theQuestionShort(ctx: ScriptContext): string {
  return isContractor(ctx) ? "how many more jobs do you want this month?" : "how many more customers do you want this month?";
}

function whenTheyApplied(ctx: ScriptContext): string {
  const day = ctx.day ?? 0;
  if (day <= 0) return "a little while ago";
  if (day === 1) return "yesterday";
  return "the other day";
}

function groupLine(ctx: ScriptContext): string {
  if (ctx.group === "fit_check") {
    return '\n\nFirst find out who you have: "Do you own or run the company, or are you looking to hire somebody?" If they are looking to hire a contractor, thank them and close the record as not a fit.';
  }
  if (ctx.group === "funding_review") {
    return "\n\nThey said they would need funding. Do not promise any. Ask what they had in mind and write it down word for word.";
  }
  return "";
}

type Builder = (ctx: ScriptContext) => Omit<Script, "key">;

const SCRIPTS: Record<string, Builder> = {
  "call.first": (ctx) => ({
    channel: "call",
    title: "First call: the opener",
    body: `"${hello(ctx)} this is ${sender(ctx)} with The LeadFlow Pro. You filled out our form ${whenTheyApplied(ctx)} about getting ${moreJobs(ctx)}. Did I catch you at a decent time?"

One question, then let them talk:
"${theQuestion(ctx)}"

Listen for four things: ${isContractor(ctx) ? "what a good job is worth to them, how many crews and machines they run" : "what a good customer is worth to them, how they get customers now"}, what they have already tried, and who makes the call on spending.

No price on this call. Before you hang up, book the second one:
"Let me look at your area tonight and come back with real numbers. Is tomorrow at 10 or at 2 better?"${groupLine(ctx)}`,
  }),

  "call.attempt": (ctx) => ({
    channel: "call",
    title: "They picked up this time",
    body: `"${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. I have tried you a couple of times about the form you filled out for ${moreJobs(ctx)}. Is now a bad time?"

If they have two minutes: "${theQuestion(ctx)}"

If they are busy: "When is a good time today or tomorrow? I will call you then." Then save that time on the call card so it comes back to you.${groupLine(ctx)}`,
  }),

  "call.last": (ctx) => ({
    channel: "call",
    title: "Last call",
    body: `"${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. This is my last call about the form you filled out. If ${moreJobs(ctx)} still matter to you, I am glad to talk. If the timing is wrong, tell me and I will close your file."`,
  }),

  "call.reopen": (ctx) => ({
    channel: "call",
    title: "One call to reopen or close",
    body: `"${hello(ctx)} this is ${sender(ctx)} with The LeadFlow Pro. You reached out to us a while back and we never connected. That is on us. Are you still looking for ${moreJobs(ctx)}, or should I close your file?"

Whatever they say, save it on the call card: a next step with a time, or not a fit with the reason.`,
  }),

  "voicemail.1": (ctx) => ({
    channel: "voicemail",
    title: "Voicemail 1",
    body: `${hello(ctx)} this is ${sender(ctx)} with The LeadFlow Pro, calling about the form you filled out for ${moreJobs(ctx)}. I have one question for you and it takes two minutes. Call or text me back at ${PHONE}. That is ${PHONE}.`,
  }),
  "voicemail.2": (ctx) => ({
    channel: "voicemail",
    title: "Voicemail 2",
    body: isContractor(ctx)
      ? `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro again. We are the ones working with Scott at O-L Guy Farms, in the video you saw. I would like to hear how many more jobs you want this month. Call or text me at ${PHONE}.`
      : `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro again. One question for you, and it takes two minutes: ${theQuestionShort(ctx)} Call or text me at ${PHONE}.`,
  }),
  "voicemail.3": (ctx) => ({
    channel: "voicemail",
    title: "Voicemail 3",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. I have tried you a few times this week and I do not want to be a pest. If you still want ${moreJobs(ctx)}, call or text me at ${PHONE}. If not, no hard feelings.`,
  }),
  "voicemail.4": (ctx) => ({
    channel: "voicemail",
    title: "Voicemail 4",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro, checking back. I am still glad to talk through ${isContractor(ctx) ? "how many jobs you want" : "how many customers you want"} and what it would take to go after them. Call or text me at ${PHONE}.`,
  }),
  "voicemail.5": (ctx) => ({
    channel: "voicemail",
    title: "Voicemail 5",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. It has been a few weeks. I am keeping your file open a little longer. If ${moreJobs(ctx)} would help right now, call or text me at ${PHONE}.`,
  }),
  "voicemail.last": (ctx) => ({
    channel: "voicemail",
    title: "Last voicemail",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. This is my last call. I am closing your file after today so I stop bothering you. If you want to pick it back up, my number is ${PHONE}.`,
  }),

  "text.1": (ctx) => ({
    channel: "text",
    title: "Text 1",
    body: `${hello(ctx)} this is ${sender(ctx)} with The LeadFlow Pro. I just tried to call about the form you filled out. What is a good time to talk today? Reply STOP to opt out.`,
  }),
  "text.2": (ctx) => ({
    channel: "text",
    title: "Text 2",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. One question when you have a minute: ${theQuestionShort(ctx)}`,
  }),
  "text.3": (ctx) => ({
    channel: "text",
    title: "Text 3",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. I have tried you a few times. Still want to talk about ${moreJobs(ctx)}? A yes or a no both help me.`,
  }),
  "text.4": (ctx) => ({
    channel: "text",
    title: "Text 4",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro, checking in. If now is a better time for ${moreJobs(ctx)} than it was, I am at this number.`,
  }),
  "text.5": (ctx) => ({
    channel: "text",
    title: "Text 5",
    body: `${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. I am about to close your file. Want me to keep it open? Yes or no is fine.`,
  }),

  "email.1": (ctx) => ({
    channel: "email",
    title: "Email 1",
    subject: "Tried to call you just now",
    body: `${hello(ctx)}

I just tried to call you about the form you filled out for ${moreJobs(ctx)}.

I have one question, and it takes two minutes: ${theQuestionShort(ctx)}

Call or text me at ${PHONE}, or reply here with a good time.

${sender(ctx)}
The LeadFlow Pro`,
  }),
  "email.2": (ctx) => ({
    channel: "email",
    title: "Email 2",
    subject: isContractor(ctx) ? "What Scott told us on camera" : "The short version, in writing",
    body: `${hello(ctx)}

I have tried you a few times, so here is the short version in writing.

${
  isContractor(ctx)
    ? `${SCOTT_PROOF}

I cannot promise you his numbers. I can show you how we would go after the jobs you want, and you can decide if it is worth a try.`
    : `I ask one question first: ${theQuestionShort(ctx)} Then that number goes in writing, and the plan gets built around it. I cannot promise a result. I can show you how we would go after it, and you can decide if it is worth a try.`
}

When is a good time for a ten minute call? My number is ${PHONE}.

${sender(ctx)}
The LeadFlow Pro`,
  }),
  "email.3": (ctx) => ({
    channel: "email",
    title: "Email 3",
    subject: "Should I keep your file open?",
    body: `${hello(ctx)}

I have called a few times and I do not want to keep bothering you if the timing is wrong.

If ${moreJobs(ctx)} still matter to you, reply with a good time and I will call then.

If not, reply "close it" and I will.

${sender(ctx)}
The LeadFlow Pro
${PHONE}`,
  }),
  "email.last": (ctx) => ({
    channel: "email",
    title: "Last email",
    subject: "Closing your file",
    body: `${hello(ctx)}

I am closing your file today so I stop calling.

If you want to pick this back up, call or text me at ${PHONE}.

${sender(ctx)}
The LeadFlow Pro`,
  }),

  reply: (ctx) => ({
    channel: "checklist",
    title: "They reached out",
    body: `Answer in the same place they used, inside five minutes if you can.

1. Read what they wrote, or listen to the voicemail, before you answer.
2. Call first. A call back beats a text back.
3. No answer: one line and one question back. "This is ${sender(ctx)} with The LeadFlow Pro. Got your message. When is a good time to talk today?"
4. Save what happened on the call card, so the record shows they were answered.`,
  }),

  callback: (ctx) => ({
    channel: "call",
    title: "The call you promised",
    body: `"${hello(ctx)} it is ${sender(ctx)} with The LeadFlow Pro. I told you I would call back, so here I am."

Read the last note before you dial and pick up where it left off.
End the call with the next step and a time, and save it on the call card.`,
  }),

  next_step: () => ({
    channel: "checklist",
    title: "Set the next step",
    body: `You talked to them. Before anything else, pick one and save it on the call card:

1. Booked: the second call or a sit-down, with a date and a time.
2. Wants a proposal: which offer, and when you will send it.
3. Call back: the day and time they asked for.
4. Not a fit: the reason, in their words.

A conversation with no next step is where deals go quiet.`,
  }),

  "booked.prep": (ctx) => ({
    channel: "checklist",
    title: "Before the second call",
    body: `1. Read your notes from call one: the number they want, what one is worth to them, who decides.
2. Look at their area. Who is advertising for ${ctx.service && SERVICE_WORK[ctx.service] ? SERVICE_WORK[ctx.service] : "that kind of work"} there, and what are they saying?
3. ${isContractor(ctx) ? `Work the numbers out loud before you dial. ${PRICE_LINE}` : "Have the written offer and its price in front of you. Do not quote a number from memory."}
4. ${isContractor(ctx) ? `Have Scott's result ready, in his words. ${SCOTT_PROOF}` : "Have one real result ready, and where it came from. If none fits their kind of business, say so plainly."}
5. Decide the one thing you are asking for on this call: a yes to the written proposal.

On the call: their number first, then the plan, then ask. Say what you cannot promise before they ask.`,
  }),

  "proposal.1": (ctx) => ({
    channel: "call",
    title: "Proposal follow-up 1 (the day after)",
    body: `"${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. I sent the proposal over. Did it come through, and did you get a chance to look at it?"

If yes: "What stood out, and what gave you pause?" Then be quiet and listen.
If no: "No problem. Want me to walk you through it right now? It takes five minutes."

Leave with a date: "When do you want to make the call on this? I will check back that morning." Save that date on the call card.`,
  }),
  "proposal.2": (ctx) => ({
    channel: "call",
    title: "Proposal follow-up 2 (day 3)",
    body: `"${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. Checking back on the proposal like I said I would. Any questions I can answer for you, or for whoever else is weighing in?"

If the question is money: ${isContractor(ctx) ? PRICE_LINE : "read them the number in the proposal, exactly as it is written."}

Do not change a number on the phone. Write the objection down in their words and talk it over first.`,
  }),
  "proposal.3": (ctx) => ({
    channel: "email",
    title: "Proposal follow-up 3 (day 5)",
    subject: "Your proposal, in three lines",
    body: `${hello(ctx)}

Here is the proposal in three lines, so it is easy to weigh.

1. You told me ${isContractor(ctx) ? "how many more jobs you want" : "what you want out of this"}. That is in the proposal, in writing.
2. ${isContractor(ctx) ? PRICE_LINE : "The price, and what it covers, are in the proposal in writing."}
3. I cannot promise a result. ${isContractor(ctx) ? `The best picture I have of what it can look like is this. ${SCOTT_PROOF}` : "I can tell you exactly what we will do, and when."}

What would you need to see to say yes or no?

${sender(ctx)}
The LeadFlow Pro
${PHONE}`,
  }),
  "proposal.4": (ctx) => ({
    channel: "call",
    title: "Proposal follow-up 4 (one week)",
    body: `"${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. It has been a week on the proposal. I would rather hear a no than leave you hanging. Where is your head at?"

If it is not now: "What would have to change for it to be a yes?" Write the answer down word for word.`,
  }),
  "proposal.5": (ctx) => ({
    channel: "call",
    title: "Proposal follow-up 5 (two weeks)",
    body: `"${hello(ctx)} ${sender(ctx)} with The LeadFlow Pro. Last check on the proposal. I am going to close it out this week unless you tell me to keep it open. Either answer is fine with me."`,
  }),
  "proposal.decide": () => ({
    channel: "checklist",
    title: "Make it a decision",
    body: `Five follow-ups are done. Make it a decision today:

1. Yes: send the agreement and the pay link, and book the kickoff.
2. No: mark it lost, with the reason in their words.
3. Not now: set one follow-up 30 days out, and tell them you will.

Do not leave it at proposal with no date. That is how a board fills up with money that is not real.`,
  }),
};

/** Every script key, for the SOP page and the tests. */
export const SCRIPT_KEYS: readonly string[] = Object.keys(SCRIPTS);

export function script(key: string, ctx: ScriptContext): Script | null {
  const build = SCRIPTS[key];
  return build ? { key, ...build(ctx) } : null;
}

/** The scripts for a list of keys, in order, unknown keys dropped. */
export function scriptsFor(keys: readonly string[], ctx: ScriptContext): Script[] {
  const out: Script[] = [];
  for (const key of keys) {
    const s = script(key, ctx);
    if (s) out.push(s);
  }
  return out;
}

/** "Riley" from "Riley Example". Empty when the record has no name worth saying out loud. */
export function scriptFirstName(fullName: string | null | undefined): string {
  const first = String(fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || /[^\p{L}'-]/u.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

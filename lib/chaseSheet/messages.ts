// The words.
//
// Every touch on the sheet is a message the owner can send as written. Each
// role in the sequence has copy in three tones, and the text-message roles
// carry two variants each so two quotes chased in the same week do not read
// as the same template with the name swapped. The trade library supplies the
// nouns, the reasons, the proof angle, and the seasonal hook.
//
// The rules in this file:
//   - [Brackets] mark the two things only the owner can supply: a real job for
//     the proof touch and the real details of a similar job. The engine never
//     invents a job.
//   - No em dashes. No guarantees. No manufactured scarcity: the schedule
//     touch offers the owner's own honest start window and nothing else.
//   - A message never asks twice in a row for the same thing.
//
// Pure functions. The same quote always gets the same variant (seeded by its
// id), so a message the owner saw yesterday does not change under them today.

import type { Channel, StepRole } from "./cadence";
import { getTrade, seasonOf, type ObjectionId, type Season, type Trade } from "./trades";

export type Tone = "friendly" | "direct" | "professional";

export function isTone(value: unknown): value is Tone {
  return value === "friendly" || value === "direct" || value === "professional";
}

export const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "friendly", label: "Friendly and local" },
  { value: "direct", label: "Short and direct" },
  { value: "professional", label: "Professional and formal" },
];

export type MessageContext = {
  /** The customer's first name, or "" when unknown. */
  first: string;
  /** What was quoted, in the owner's words: "the back fence", "a 4 ton system". */
  job: string;
  /** "$4,200" or "" when the owner would rather not repeat it. */
  amount: string;
  /** Business name. */
  biz: string;
  /** Who signs: a first name, or "" to sign with the business. */
  owner: string;
  /** The owner's honest start window: "the week after next". */
  window: string;
  tradeId: string;
  tone: Tone;
  /** Month 1 to 12, for the seasonal hook. */
  month: number;
  /** Any stable string; picks the variant. */
  seed: string;
};

export type RenderedMessage = {
  role: StepRole;
  channel: Channel;
  /** Email subject, only for email-shaped messages. */
  subject?: string;
  /** The message, or the call script. */
  body: string;
  /** A short text to send when a call goes to voicemail. */
  fallbackText?: string;
};

/* --------------------------------- helpers -------------------------------- */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function pick<T>(seed: string, salt: string, options: readonly T[]): T {
  return options[hash(`${seed}:${salt}`) % options.length];
}

function greet(first: string, tone: Tone): string {
  if (!first) return tone === "professional" ? "Hello," : tone === "direct" ? "Hi," : "Hey there,";
  return tone === "professional" ? `Hello ${first},` : tone === "direct" ? `${first},` : `Hey ${first},`;
}

function signature(ctx: MessageContext): string {
  return ctx.owner ? `${ctx.owner}, ${ctx.biz}` : ctx.biz;
}

function who(ctx: MessageContext): string {
  return ctx.owner ? `${ctx.owner} with ${ctx.biz}` : ctx.biz;
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** The reason line for this quote, chosen by seed so quotes vary. */
function reasonFor(trade: Trade, seed: string): string {
  return pick(seed, "reason", trade.reasons);
}

function seasonalFor(trade: Trade, month: number): string {
  return trade.seasonal[seasonOf(month)];
}

/* -------------------------------- the copy -------------------------------- */

type Writer = (ctx: MessageContext, trade: Trade) => RenderedMessage;

const T = <A>(tone: Tone, friendly: A, direct: A, professional: A): A =>
  tone === "friendly" ? friendly : tone === "direct" ? direct : professional;

const WRITERS: Record<StepRole, Writer> = {
  landed(ctx) {
    const g = greet(ctx.first, ctx.tone);
    const body = T(
      ctx.tone,
      pick(ctx.seed, "landed", [
        `${g} it is ${who(ctx)}. Wanted to make sure the quote for ${ctx.job} made it to you. If anything in it reads funny or you want to talk through options, just reply here. No rush on my end.`,
        `${g} ${who(ctx)} here. Just checking the quote for ${ctx.job} came through okay. Questions, changes, anything you want priced differently, reply here and I will sort it.`,
      ]),
      pick(ctx.seed, "landed", [
        `${g} ${who(ctx)}. Confirming the quote for ${ctx.job} reached you. Questions, reply here.`,
        `${g} ${who(ctx)}. Did the quote for ${ctx.job} come through? Reply here if anything needs adjusting.`,
      ]),
      pick(ctx.seed, "landed", [
        `${g} this is ${who(ctx)}. I am confirming that your quote for ${ctx.job} was delivered. If you have questions or would like to review any options, please reply at your convenience.`,
        `${g} this is ${who(ctx)}. I wanted to confirm you received the quote for ${ctx.job}. I am glad to answer questions or adjust the scope if needed.`,
      ]),
    );
    return { role: "landed", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },

  call(ctx, trade) {
    const w = who(ctx);
    const open = T(
      ctx.tone,
      `"Hey ${ctx.first || "there"}, it is ${w}. Not chasing you, I just wanted to see if the quote for ${ctx.job} raised any questions."`,
      `"${ctx.first || "Hi"}, ${w}. Any questions on the quote for ${ctx.job}?"`,
      `"Good morning ${ctx.first || ""}, this is ${w}. I am calling to see whether the quote for ${ctx.job} raised any questions."`.replace("  ", " "),
    );
    const positive = T(
      ctx.tone,
      `"Great. The next step is picking a start window. I have ${ctx.window} open. Want me to pencil you in while we are talking?"`,
      `"Good. Next step is a start window. ${ctx.window} is open. Want it?"`,
      `"Excellent. The next step would be selecting a start window. We currently have ${ctx.window} available."`,
    );
    const hesitant = T(
      ctx.tone,
      `"Totally fair. What is the part that gives you pause: the price, the timing, or something in the scope?" Then stop talking and listen.`,
      `"Fair. Price, timing, or scope?" Then listen.`,
      `"That is understandable. May I ask whether the concern is the price, the timing, or the scope?" Then listen.`,
    );
    const close = T(
      ctx.tone,
      `"Whatever you decide, I appreciate you letting us quote it."`,
      `"Appreciate you letting us quote it either way."`,
      `"Thank you for the opportunity to quote the work, whatever you decide."`,
    );
    const body = [
      `CALL SCRIPT (about two minutes)`,
      ``,
      `Open: ${open}`,
      ``,
      `Then stop talking. What they say next tells you which objection reply to use.`,
      ``,
      `If they sound positive: ${positive}`,
      ``,
      `If they hesitate: ${hesitant}`,
      ``,
      `Close either way: ${close}`,
      ``,
      `If it goes to voicemail, do not leave a long message. Send the text below instead.`,
    ].join("\n");
    const fallback = T(
      ctx.tone,
      `${greet(ctx.first, ctx.tone)} just tried you, it is ${w}. No rush, I only wanted to see if the quote for ${ctx.job} raised any questions. Reply here whenever suits and I will answer.`,
      `${greet(ctx.first, ctx.tone)} ${w}, tried to call. Any questions on the quote for ${ctx.job}? Reply here.`,
      `${greet(ctx.first, ctx.tone)} this is ${w}. I tried to reach you by phone regarding the quote for ${ctx.job}. Please reply here with any questions and I will respond promptly.`,
    );
    return { role: "call", channel: "call", body, fallbackText: `${fallback}\n\n${signature(ctx)}` };
  },

  question(ctx) {
    const g = greet(ctx.first, ctx.tone);
    const body = T(
      ctx.tone,
      pick(ctx.seed, "question", [
        `${g} one quick question and then I will leave you be: is ${ctx.job} still on the list for this season, or has it moved down the pile? Either answer is useful to me.`,
        `${g} quick one from ${who(ctx)}. Is the timing the sticking point on ${ctx.job}, or is it something in the quote itself? Either way I can probably help.`,
      ]),
      pick(ctx.seed, "question", [
        `${g} quick one: is ${ctx.job} still happening this season? Either answer helps.`,
        `${g} ${who(ctx)}. Is it the timing or the quote itself that is holding up ${ctx.job}? Either is fixable.`,
      ]),
      pick(ctx.seed, "question", [
        `${g} one brief question: is ${ctx.job} still planned for this season? Either answer helps us plan our schedule.`,
        `${g} this is ${who(ctx)}. May I ask whether the timing or the quote itself is the open question on ${ctx.job}? I am glad to address either.`,
      ]),
    );
    return { role: "question", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },

  proof(ctx, trade) {
    const g = greet(ctx.first, ctx.tone);
    const body = T(
      ctx.tone,
      `${g} no ask in this one. ${trade.proof} If you want to talk to somebody we have done this for, say the word and I will connect you.`,
      `${g} no ask here. ${trade.proof} Want to talk to that customer about how it went? Say the word.`,
      `${g} nothing is required of you in this note. ${trade.proof} If a reference would be helpful, we would be glad to arrange one.`,
    );
    return { role: "proof", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },

  reason(ctx, trade) {
    const g = greet(ctx.first, ctx.tone);
    const reason = reasonFor(trade, ctx.seed);
    const body = T(
      ctx.tone,
      pick(ctx.seed, "reasonv", [
        `${g} one honest thing worth knowing while you decide on ${ctx.job}: ${lower(reason)} I would rather tell you that now than have you find out the expensive way.`,
        `${g} not pushing, just something true about this kind of work: ${lower(reason)} Whenever you are ready, the quote is still good and I am still here.`,
      ]),
      pick(ctx.seed, "reasonv", [
        `${g} one thing worth knowing on ${ctx.job}: ${lower(reason)} Quote still stands.`,
        `${g} straight talk on ${ctx.job}: ${lower(reason)} Reply when ready.`,
      ]),
      pick(ctx.seed, "reasonv", [
        `${g} one point that may be useful as you consider ${ctx.job}: ${lower(reason)} The quote remains available whenever you are ready to proceed.`,
        `${g} for your planning regarding ${ctx.job}: ${lower(reason)} Please reach out when you would like to move forward.`,
      ]),
    );
    return { role: "reason", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },

  schedule(ctx) {
    const w = who(ctx);
    const body = T(
      ctx.tone,
      `CALL SCRIPT (one minute)\n\n"Hey ${ctx.first || "there"}, ${w} again. I am building the schedule for the next few weeks and I have ${ctx.window} open for ${ctx.job}. I did not want to give that slot away without asking. Do you want it, or should I plan around you for now?"\n\nThat is the whole call. It only works because it is true: you really are building the schedule, and you really will give the slot away. If the slot is not real, do not say it is.`,
      `CALL SCRIPT\n\n"${ctx.first || "Hi"}, ${w}. Building the schedule. ${ctx.window} is open for ${ctx.job} and I did not want to give your slot away without asking. Want it?"\n\nOnly say it if it is true.`,
      `CALL SCRIPT\n\n"Good morning ${ctx.first || ""}, this is ${w}. We are finalizing our schedule for the coming weeks and currently have ${ctx.window} available for ${ctx.job}. Before assigning it elsewhere, I wanted to offer it to you first."\n\nUse only when the schedule pressure is real.`.replace("  ", " "),
    );
    const fallback = T(
      ctx.tone,
      `${greet(ctx.first, ctx.tone)} ${w}. Tried to call. I have ${ctx.window} open for ${ctx.job} and did not want to give it away without asking you first. Want it? Reply yes and I will hold it.`,
      `${greet(ctx.first, ctx.tone)} ${w}. ${ctx.window} is open for ${ctx.job}. Want it before I fill it? Reply yes.`,
      `${greet(ctx.first, ctx.tone)} this is ${w}. We have ${ctx.window} available for ${ctx.job}. I wanted to offer it to you before scheduling elsewhere. A reply of yes will reserve it.`,
    );
    return { role: "schedule", channel: "call", body, fallbackText: `${fallback}\n\n${signature(ctx)}` };
  },

  close(ctx) {
    const g = greet(ctx.first, ctx.tone);
    const body = T(
      ctx.tone,
      pick(ctx.seed, "close", [
        `${g} last note from me on ${ctx.job}, promise. I am closing the file so you stop hearing from us. If life got busy and you still want it done, reply any time and I will pick it right back up. Thanks for letting us quote it either way.`,
        `${g} I will stop nudging after this one. Closing the file on ${ctx.job} for now. If it comes back around, reply here and we start where we left off. Appreciate you considering us.`,
      ]),
      pick(ctx.seed, "close", [
        `${g} last one. Closing the file on ${ctx.job}. Still want it? Reply any time. Thanks for considering us.`,
        `${g} no more nudges after this. File closed on ${ctx.job} for now. Reply whenever it comes back around.`,
      ]),
      pick(ctx.seed, "close", [
        `${g} this is our final note regarding ${ctx.job}. We are closing the file so that you receive no further messages. Should you wish to proceed in the future, we would be glad to hear from you. Thank you for considering ${ctx.biz}.`,
        `${g} we will not follow up further on ${ctx.job} unless we hear from you. The file remains open to reactivate at any time. Thank you for the opportunity.`,
      ]),
    );
    return { role: "close", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },

  revive(ctx, trade) {
    const g = greet(ctx.first, ctx.tone);
    const hook = seasonalFor(trade, ctx.month);
    const body = T(
      ctx.tone,
      `${g} ${who(ctx)} here. You had us quote ${ctx.job} a while back. Reaching out because ${hook}, and I did not want you to miss the window if it is still on your list. Want me to look at the number again?`,
      `${g} ${who(ctx)}. You had us quote ${ctx.job} a while back. ${hook.charAt(0).toUpperCase()}${hook.slice(1)}. Still on the list? I can re-check the number.`,
      `${g} this is ${who(ctx)}. Some time ago we quoted ${ctx.job} for you. I am reaching out because ${hook}. If the project is still under consideration, I would be glad to review the figure.`,
    );
    return { role: "revive", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },

  last(ctx) {
    const g = greet(ctx.first, ctx.tone);
    const body = T(
      ctx.tone,
      `${g} ${who(ctx)}. This is genuinely the last one about ${ctx.job}. If it ever comes back around, my number does not change and neither does the way we do the work. Take care.`,
      `${g} ${who(ctx)}. Truly the last note on ${ctx.job}. Number stays the same if you ever need us. Take care.`,
      `${g} this is ${who(ctx)}, with a final note regarding ${ctx.job}. Our contact details will not change, and we would welcome the opportunity to help in the future. Kind regards.`,
    );
    return { role: "last", channel: "text", body: `${body}\n\n${signature(ctx)}` };
  },
};

export function renderMessage(role: StepRole, ctx: MessageContext): RenderedMessage {
  const trade = getTrade(ctx.tradeId);
  return WRITERS[role](ctx, trade);
}

/* -------------------------------- objections ------------------------------ */

export type ObjectionReply = {
  id: ObjectionId;
  /** What the customer said, in their words. */
  heard: string;
  /** The rule behind the reply. */
  note: string;
  /** The reply to send or say. */
  reply: string;
};

export function objectionReplies(ctx: MessageContext): ObjectionReply[] {
  const trade = getTrade(ctx.tradeId);
  const first = ctx.first || "there";
  const g = greet(ctx.first, ctx.tone);
  const sig = signature(ctx);
  const all: Record<ObjectionId, Omit<ObjectionReply, "id">> = {
    price: {
      heard: "It is more than we wanted to spend",
      note: "Never cut the price on the spot. Cut scope or offer phasing. A fast discount tells them the first number was padded.",
      reply: T(
        ctx.tone,
        `${g} I hear you. Rather than shave the number and quietly shave the work, can I ask: is it the total, or the timing of it? If it is the total, we can look at what could honestly come out of the scope. If it is the timing, we can split ${ctx.job} into two phases so it does not all land at once.\n\n${sig}`,
        `${g} fair. Is it the total or the timing? Total: we can take something out of the scope honestly. Timing: we can phase ${ctx.job}. Which one?\n\n${sig}`,
        `${g} I understand. May I ask whether the concern is the total or the timing? If the total, we can review what could be removed from the scope. If the timing, ${ctx.job} can be completed in two phases.\n\n${sig}`,
      ),
    },
    cheaper_quote: {
      heard: "We got a cheaper quote",
      note: "Do not talk down the other company. Point at two lines to compare, then let them decide.",
      reply: T(
        ctx.tone,
        `${g} that is fair, and they may be the right fit for you. Before you decide, check two lines on theirs: what it says is included that ours includes, and who is on the hook if something is wrong a month later. If theirs covers both, take it with my blessing.\n\n${sig}`,
        `${g} fair. Check two lines on theirs: what is included, and who fixes it if it fails in a month. If both are covered, take it.\n\n${sig}`,
        `${g} that is entirely reasonable. I would only suggest comparing two items: the scope each quote includes, and the warranty on the work afterward. If both are covered, you should proceed with confidence.\n\n${sig}`,
      ),
    },
    thinking: {
      heard: "We need to think about it",
      note: "Thinking about it usually means one unspoken concern. Name the three options gently and let them pick.",
      reply: T(
        ctx.tone,
        `${g} of course. Just so I am useful while you do: is it the money, the timing, or wanting to be sure of us? People usually mean one of the three, and each one has a different answer I can actually give you.\n\n${sig}`,
        `${g} sure. Money, timing, or being sure of us? Each has a different answer.\n\n${sig}`,
        `${g} certainly. So that I can be helpful, may I ask whether the question is the cost, the timing, or confidence in our work? Each has a different answer.\n\n${sig}`,
      ),
    },
    spouse: {
      heard: "I need to talk to my spouse or partner",
      note: "Make the conversation they have to have easier, not another thing on their list.",
      reply: T(
        ctx.tone,
        `${g} makes sense. Would it help if I put the whole thing on one page for both of you: what gets done, what it costs, and when it would start? And if it is easier, I am happy to walk you both through it in ten minutes on the phone.\n\n${sig}`,
        `${g} understood. Want a one-page version for both of you? Or ten minutes on the phone with you both. Either works.\n\n${sig}`,
        `${g} of course. I would be glad to prepare a one-page summary for you both, or to walk through the details together in a brief call, whichever is more convenient.\n\n${sig}`,
      ),
    },
    insurance: {
      heard: "Waiting on the insurance company",
      note: "Become the easy next step in the claim, not another party to manage. Then set the check-in date so it is your move, not theirs.",
      reply: T(
        ctx.tone,
        `${g} understood, that part is out of your hands. Two things I can do: send the one-page version adjusters usually ask for, and check back in two weeks so you do not have to remember to call me. Want both?\n\n${sig}`,
        `${g} got it. I can send the one-pager adjusters ask for and check back in two weeks. Want both?\n\n${sig}`,
        `${g} understood. I can provide the summary adjusters typically request and follow up in two weeks so nothing is missed on our side. Would that be helpful?\n\n${sig}`,
      ),
    },
    financing: {
      heard: "We would need to finance it",
      note: "If you offer financing, say exactly how it works. If you do not, say so and offer phasing. Never guess at rates.",
      reply: T(
        ctx.tone,
        `${g} plenty of people do. [If you offer financing: here is how ours works, in one sentence.] [If you do not: we do not finance it ourselves, but we can split ${ctx.job} into phases so the cash lands in pieces.] Want me to lay out the options?\n\n${sig}`,
        `${g} common. [Your financing in one sentence, or: we can phase ${ctx.job} instead.] Want the options?\n\n${sig}`,
        `${g} that is very common. [If financing is available: a one-sentence description.] [Otherwise: we can structure ${ctx.job} in phases to spread the cost.] I would be glad to outline the options.\n\n${sig}`,
      ),
    },
    timing: {
      heard: "Not right now, maybe later",
      note: "Do not argue with the timing. Ask for the month, put it on your sheet, and stop chasing until then.",
      reply: T(
        ctx.tone,
        `${g} no problem at all. Roughly when would be better, so I can check back then instead of bugging you before? A month is plenty. I will put it on my calendar and leave you alone until then.\n\n${sig}`,
        `${g} no problem. Which month should I check back? I will hold off until then.\n\n${sig}`,
        `${g} understood. If you can suggest an approximate month, I will make a note to follow up then and will not contact you before.\n\n${sig}`,
      ),
    },
    diy: {
      heard: "We might do it ourselves",
      note: "Respect it. Offer the part of the job people regret doing themselves, and leave the door open.",
      reply: T(
        ctx.tone,
        `${g} respect that, plenty of people do. If it helps, the part most folks regret doing themselves on ${lower(trade.jobNoun)} is the part that needs the right equipment or the permit. Happy to quote just that piece if you want to do the rest.\n\n${sig}`,
        `${g} fair. Want a quote for just the hard part of ${lower(trade.jobNoun)} and do the rest yourself? Door is open.\n\n${sig}`,
        `${g} that is a reasonable choice. Should it be useful, we can quote only the portion of ${lower(trade.jobNoun)} that requires specialized equipment or permitting, and you may handle the remainder.\n\n${sig}`,
      ),
    },
    silence: {
      heard: "They went quiet",
      note: "Silence is rarely a no. Work the sheet, never send two asks in a row, and close the file cleanly when the sequence ends.",
      reply: `Do not chase harder. Chase on schedule. The sheet already spaces the touches so ${first} never gets two asks back to back. When the close touch goes out with no reply, mark the quote closed and let the revival touch do its job in a few weeks.`,
    },
  };
  return trade.objections.map((id) => ({ id, ...all[id] }));
}

/* --------------------------------- links ---------------------------------- */

/** sms: link with the body prefilled. iOS and Android both read `?&body=`. */
export function smsLink(phoneDigits: string, body: string): string {
  return `sms:+${phoneDigits.replace(/\D/g, "")}?&body=${encodeURIComponent(body)}`;
}

export function telLink(phoneDigits: string): string {
  return `tel:+${phoneDigits.replace(/\D/g, "")}`;
}

export function mailLink(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** US numbers: 10 digits get a leading 1; 11 digits starting with 1 stay. Anything else is left alone. */
export function normalizeUsPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function seasonLabel(season: Season): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

// The free demo on the sales page, shaped for the visitor.
//
// The visitor describes one quote. The engine writes the first few touches in
// full and dates the rest, and answers one objection in full with the others
// named. The engine is the real one; what is held back is said on the page,
// so a visitor can judge the words without being handed the library, which is
// the part of the product a copy cannot fake.
//
// Pure. The route hands it the parsed body and today's date.

import { planSequence, type PlannedStep, type Urgency } from "./cadence";
import { isTone, objectionReplies, renderMessage, type MessageContext, type ObjectionReply, type RenderedMessage, type Tone } from "./messages";
import { getTrade, isTradeId } from "./trades";

/** Touches the demo writes in full. The rest come back dated, with the job of the touch, and no words. */
export const DEMO_WRITTEN_STEPS = 3;

/** The one objection the demo answers in full. Every trade lists it, so changing the trade never reveals another. */
export const DEMO_FULL_OBJECTION: ObjectionReply["id"] = "price";

export type DemoInput = Record<string, unknown>;

export type DemoStep = {
  step: PlannedStep;
  /** null for a touch the demo dates but does not write. */
  message: RenderedMessage | null;
};

export type DemoObjection = Pick<ObjectionReply, "id" | "heard" | "note"> & { reply?: string };

export type DemoResult = {
  trade: string;
  /** How many of the steps carry words. */
  written: number;
  steps: DemoStep[];
  objections: DemoObjection[];
};

function text(value: unknown, max: number, fallback: string): string {
  const v = typeof value === "string" ? value.trim().slice(0, max) : "";
  return v || fallback;
}

export function buildDemo(input: DemoInput, today: string): DemoResult {
  const tradeId = isTradeId(input.tradeId) ? input.tradeId : "general";
  const trade = getTrade(tradeId);
  const tone: Tone = isTone(input.tone) ? input.tone : "friendly";
  // The pace follows the trade's usual urgency. There is no override, so the
  // cadence templates cannot be pulled one request at a time.
  const urgency: Urgency = trade.urgency;
  const amountUsd = Math.max(0, Math.min(5_000_000, Number(String(input.amountUsd ?? "").replace(/[$,\s]/g, "")) || 0));
  const ctx: MessageContext = {
    first: text(input.first, 40, "Dana"),
    job: text(input.job, 80, trade.jobNoun),
    amount: amountUsd ? `$${Math.round(amountUsd).toLocaleString("en-US")}` : "",
    biz: text(input.business, 80, "[Your business]"),
    owner: typeof input.owner === "string" ? input.owner.trim().slice(0, 40) : "",
    window: text(input.window, 80, "the week after next"),
    tradeId,
    tone,
    month: Number(today.slice(5, 7)) || 1,
    // Seeded by tone alone. The text steps do not read the trade, so a seed
    // that included it would hand over the other variant of every one of
    // them for the price of cycling the trade list.
    seed: `demo:${tone}`,
  };
  const plan = planSequence({ sentOn: today, amountCents: Math.round(amountUsd * 100), urgency, tradeId });
  const steps: DemoStep[] = plan.map((step, i) => ({ step, message: i < DEMO_WRITTEN_STEPS ? renderMessage(step.role, ctx) : null }));

  const replies = objectionReplies(ctx);
  const full = replies.find((o) => o.id === DEMO_FULL_OBJECTION) ?? replies[0];
  const objections: DemoObjection[] = [];
  if (full) objections.push(full);
  for (const o of replies) if (o !== full) objections.push({ id: o.id, heard: o.heard, note: o.note });

  return { trade: trade.label, written: Math.min(DEMO_WRITTEN_STEPS, steps.length), steps, objections };
}

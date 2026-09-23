import { NextResponse } from "next/server";
import { planSequence, isUrgency, todayIn, type Urgency } from "@/lib/chaseSheet/cadence";
import { isTone, objectionReplies, renderMessage, type MessageContext, type Tone } from "@/lib/chaseSheet/messages";
import { getTrade, isTradeId } from "@/lib/chaseSheet/trades";
import { BUSINESS } from "@/lib/site/business";

// The free demo on the sales page. A visitor picks a trade, a tone, and a
// quote, and sees the whole sequence written out. The engine runs here, on
// the server, so what makes the product worth paying for never ships in a
// JavaScript bundle. Nothing is stored.

export const runtime = "nodejs";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 120;
const log = new Map<string, number[]>();

function allowed(key: string, now = Date.now()): boolean {
  const past = (log.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (past.length >= MAX_PER_WINDOW) {
    log.set(key, past);
    return false;
  }
  past.push(now);
  log.set(key, past);
  if (log.size > 5000) for (const k of [...log.keys()].slice(0, 1000)) log.delete(k);
  return true;
}

function text(value: unknown, max: number, fallback: string): string {
  const v = typeof value === "string" ? value.trim().slice(0, max) : "";
  return v || fallback;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.length > 4000) throw new Error("too long");
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const tradeId = isTradeId(body.tradeId) ? body.tradeId : "general";
  const tone: Tone = isTone(body.tone) ? body.tone : "friendly";
  const urgency: Urgency = isUrgency(body.urgency) ? body.urgency : getTrade(tradeId).urgency;
  const amountUsd = Math.max(0, Math.min(5_000_000, Number(String(body.amountUsd ?? "").replace(/[$,\s]/g, "")) || 0));
  const today = todayIn(BUSINESS.timezone);
  const ctx: MessageContext = {
    first: text(body.first, 40, "Dana"),
    job: text(body.job, 80, getTrade(tradeId).jobNoun),
    amount: amountUsd ? `$${Math.round(amountUsd).toLocaleString("en-US")}` : "",
    biz: text(body.business, 80, "your business"),
    owner: typeof body.owner === "string" ? body.owner.trim().slice(0, 40) : "",
    window: text(body.window, 80, "the week after next"),
    tradeId,
    tone,
    month: Number(today.slice(5, 7)) || 1,
    seed: `demo:${tradeId}:${tone}`,
  };
  const plan = planSequence({ sentOn: today, amountCents: Math.round(amountUsd * 100), urgency, tradeId });
  return NextResponse.json(
    {
      trade: getTrade(tradeId).label,
      steps: plan.map((step) => ({ step, message: renderMessage(step.role, ctx) })),
      objections: objectionReplies(ctx).slice(0, 4),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

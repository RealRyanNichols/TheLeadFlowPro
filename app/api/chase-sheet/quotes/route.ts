import { isIsoDate, isUrgency, planSequence, skipSunday, addDays, daysBetween, type Urgency } from "@/lib/chaseSheet/cadence";
import * as db from "@/lib/chaseSheet/db";
import { normalizeUsPhone } from "@/lib/chaseSheet/messages";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { isResponse, json, readBody, requireSheet, sameOrigin } from "@/lib/chaseSheet/server";
import { objectionReplies } from "@/lib/chaseSheet/messages";
import { contextFor, planInputFor, sequenceFor } from "@/lib/chaseSheet/sheet";
import { isQuoteStatus } from "@/lib/chaseSheet/types";

// Quotes: add one, change one, drop one. Every write is scoped to the account
// the cookie proved, and the next touch date is computed here, on the server,
// from the cadence model, never taken from the browser.

export const runtime = "nodejs";

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cents(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 5_000_000) return null;
  return Math.round(n * 100);
}

function phone(value: unknown): string {
  const digits = normalizeUsPhone(text(value, 30));
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function email(value: unknown): string {
  const e = text(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

/** One quote in full: the planned sequence with every message, the touches so far, and the objection replies. */
export async function GET(request: Request) {
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  const id = text(new URL(request.url).searchParams.get("id"), 64);
  const quote = id ? await db.getQuote(sheet.client, sheet.email, id) : null;
  if (!quote) return json({ error: "That quote is not on your sheet." }, 404);
  const touches = (await db.listTouches(sheet.client, sheet.email)).filter((t) => t.quoteId === quote.id);
  return json({
    quote,
    sequence: sequenceFor(quote, sheet.account.profile, sheet.today),
    touches,
    objections: objectionReplies(contextFor(quote, sheet.account.profile, sheet.today)),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 20_000);
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const customerName = text(body.customerName, 120);
  const job = text(body.job, 160);
  const amountCents = cents(body.amountUsd);
  const sentOn = isIsoDate(body.sentOn) ? body.sentOn : sheet.today;
  const urgency: Urgency = isUrgency(body.urgency) ? body.urgency : "planned";
  if (!customerName) return json({ error: "Who was the quote for? A first name is enough." }, 400);
  if (!job) return json({ error: "What did you quote? Two or three words: the back fence, a 4 ton system." }, 400);
  if (amountCents === null) return json({ error: "Enter the quote amount in dollars." }, 400);
  if (daysBetween(sentOn, sheet.today) < 0) return json({ error: "The sent date cannot be in the future." }, 400);
  if (daysBetween(sentOn, sheet.today) > 365) return json({ error: "That quote is more than a year old. Send a fresh one and add that instead." }, 400);

  const open = await db.countOpenQuotes(sheet.client, sheet.email);
  if (open >= CHASE_SHEET.maxOpenQuotes) return json({ error: `The sheet holds ${CHASE_SHEET.maxOpenQuotes} open quotes. Close some as won or lost first.` }, 400);

  const plan = planSequence({ sentOn, amountCents, urgency, tradeId: sheet.account.profile.tradeId });
  const quote = await db.insertQuote(sheet.client, sheet.email, {
    customerName,
    customerPhone: phone(body.customerPhone),
    customerEmail: email(body.customerEmail),
    job,
    amountCents,
    sentOn,
    urgency,
    notes: text(body.notes, 2000),
    nextOn: plan[0]?.on ?? null,
  });
  return json({ ok: true, quote });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 20_000);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const id = text(body.id, 64);
  const existing = id ? await db.getQuote(sheet.client, sheet.email, id) : null;
  if (!existing) return json({ error: "That quote is not on your sheet." }, 404);

  const patch: db.QuotePatch = {};
  if (body.customerName !== undefined) {
    const v = text(body.customerName, 120);
    if (!v) return json({ error: "The customer needs a name." }, 400);
    patch.customerName = v;
  }
  if (body.customerPhone !== undefined) patch.customerPhone = phone(body.customerPhone);
  if (body.customerEmail !== undefined) patch.customerEmail = email(body.customerEmail);
  if (body.job !== undefined) {
    const v = text(body.job, 160);
    if (!v) return json({ error: "The quote needs a job." }, 400);
    patch.job = v;
  }
  if (body.amountUsd !== undefined) {
    const v = cents(body.amountUsd);
    if (v === null) return json({ error: "Enter the quote amount in dollars." }, 400);
    patch.amountCents = v;
  }
  if (body.notes !== undefined) patch.notes = text(body.notes, 2000);
  if (body.urgency !== undefined && isUrgency(body.urgency)) patch.urgency = body.urgency;
  if (body.sentOn !== undefined) {
    if (!isIsoDate(body.sentOn) || daysBetween(body.sentOn, sheet.today) < 0) return json({ error: "Enter the day the quote went out." }, 400);
    patch.sentOn = body.sentOn;
  }

  // A snooze sets the next date directly. Won, lost, archived, and reopened
  // set the status and the dates that go with it.
  if (body.snoozeUntil !== undefined) {
    if (!isIsoDate(body.snoozeUntil) || daysBetween(sheet.today, body.snoozeUntil) < 1 || daysBetween(sheet.today, body.snoozeUntil) > 180) {
      return json({ error: "Pick a day in the next six months." }, 400);
    }
    patch.nextOn = skipSunday(body.snoozeUntil);
  }
  if (body.status !== undefined) {
    if (!isQuoteStatus(body.status)) return json({ error: "Unknown status." }, 400);
    patch.status = body.status;
    if (body.status === "won") {
      patch.wonOn = sheet.today;
      patch.nextOn = null;
    } else if (body.status === "lost") {
      patch.lostOn = sheet.today;
      patch.lostReason = text(body.lostReason, 200);
      patch.nextOn = null;
    } else if (body.status === "archived") {
      patch.nextOn = null;
    } else if (body.status === "open" && existing.status !== "open") {
      // Reopened: pick the sequence back up from where it stopped, starting tomorrow.
      patch.wonOn = null;
      patch.lostOn = null;
      patch.lostReason = "";
      patch.nextOn = skipSunday(addDays(sheet.today, 1));
    }
  }

  // Re-plan when the inputs the cadence depends on changed and nothing else moved the date.
  const merged = { ...existing, ...patch };
  if ((patch.amountCents !== undefined || patch.urgency !== undefined || patch.sentOn !== undefined) && patch.nextOn === undefined && merged.status === "open") {
    const plan = planSequence(planInputFor(merged, sheet.account.profile));
    const next = plan[merged.done];
    patch.nextOn = next ? (daysBetween(sheet.today, next.on) < 0 ? sheet.today : next.on) : null;
  }

  const quote = await db.updateQuote(sheet.client, sheet.email, id, patch);
  return json({ ok: true, quote });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  const id = text(new URL(request.url).searchParams.get("id"), 64);
  if (!id) return json({ error: "Which quote?" }, 400);
  const removed = await db.deleteQuote(sheet.client, sheet.email, id);
  return json({ ok: removed });
}

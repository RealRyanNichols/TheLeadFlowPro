import { addDays, nextTouch, skipSunday, touchAfter } from "@/lib/chaseSheet/cadence";
import * as db from "@/lib/chaseSheet/db";
import { isResponse, json, readBody, requireSheet, sameOrigin } from "@/lib/chaseSheet/server";
import { planInputFor } from "@/lib/chaseSheet/sheet";
import { isTouchOutcome } from "@/lib/chaseSheet/types";

// The owner did the touch. Record it and move the quote along.
//
//   sent, no_answer  the touch happened (a voicemail text counts): advance to
//                    the next step, spaced from today so a late touch never
//                    stacks the next one on top of it.
//   skipped          the owner chose not to send this one: advance without it.
//   replied          the customer answered: hold the step, check back in
//                    three days unless the owner moves the quote first.

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 8000);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const quoteId = typeof body.quoteId === "string" ? body.quoteId.slice(0, 64) : "";
  const outcome = isTouchOutcome(body.outcome) ? body.outcome : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!quoteId || !outcome) return json({ error: "Which quote, and what happened?" }, 400);

  const quote = await db.getQuote(sheet.client, sheet.email, quoteId);
  if (!quote) return json({ error: "That quote is not on your sheet." }, 404);
  if (quote.status !== "open") return json({ error: "That quote is closed. Reopen it to keep chasing." }, 400);

  const input = planInputFor(quote, sheet.account.profile);
  const step = nextTouch(input, quote.done, sheet.today);
  if (!step) return json({ error: "The sequence for this quote has run out. Mark it won, lost, or archived." }, 400);

  const touch = await db.insertTouch(sheet.client, sheet.email, {
    quoteId,
    step: step.step,
    role: step.role,
    channel: step.channel,
    outcome,
    note,
  });

  let patch: db.QuotePatch;
  if (outcome === "replied") {
    patch = { lastTouchOn: sheet.today, nextOn: skipSunday(addDays(sheet.today, 3)) };
  } else {
    const done = quote.done + 1;
    const after = touchAfter(input, done, outcome === "skipped" ? quote.lastTouchOn : sheet.today);
    patch = {
      done,
      lastTouchOn: outcome === "skipped" ? quote.lastTouchOn : sheet.today,
      nextOn: after?.on ?? null,
    };
  }
  const updated = await db.updateQuote(sheet.client, sheet.email, quoteId, patch);
  return json({ ok: true, touch, quote: updated });
}

// The Chase Sheet engine: the cadence, the words, the sheet, and the ledger.
//
// Everything here is pure, so the tests hand it fixtures and a date and read
// the answer. The rules under test are the ones the product promises on its
// page: nothing on a Sunday, never two asks in a row, the pace follows the
// money, every touch has the words, and the ledger adds up the owner's own
// quotes.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addDays,
  bandFor,
  coreStepCount,
  daysBetween,
  isIsoDate,
  nextTouch,
  planSequence,
  skipSunday,
  touchAfter,
  weekdayOf,
} from "../lib/chaseSheet/cadence.ts";
import { mailLink, normalizeUsPhone, objectionReplies, renderMessage, smsLink, TONE_OPTIONS, type MessageContext } from "../lib/chaseSheet/messages.ts";
import { buildLedger, buildSheet, contextFor, firstNameOf, money, sequenceFor } from "../lib/chaseSheet/sheet.ts";
import { getTrade, seasonOf, TRADE_OPTIONS, TRADES } from "../lib/chaseSheet/trades.ts";
import { DEFAULT_PROFILE, type Profile, type Quote, type Touch } from "../lib/chaseSheet/types.ts";

const ROOFER: Profile = { ...DEFAULT_PROFILE, business: "Nichols Roofing", owner: "Ryan", tradeId: "roofing", tone: "friendly", window: "the week after next" };

function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: over.id ?? "q-1",
    customerName: "Dana Whitfield",
    customerPhone: "19035550100",
    customerEmail: "",
    job: "the roof",
    amountCents: 840_000,
    sentOn: "2026-09-21",
    urgency: "soon",
    status: "open",
    done: 0,
    nextOn: "2026-09-22",
    lastTouchOn: null,
    notes: "",
    wonOn: null,
    lostOn: null,
    lostReason: "",
    createdAt: "2026-09-21T15:00:00Z",
    updatedAt: "2026-09-21T15:00:00Z",
    ...over,
  };
}

describe("dates", () => {
  test("ISO dates are validated for real, not by shape", () => {
    assert.equal(isIsoDate("2026-09-21"), true);
    assert.equal(isIsoDate("2026-02-30"), false);
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("21-09-2026"), false);
    assert.equal(isIsoDate(20260921), false);
  });
  test("day arithmetic is zone-free", () => {
    assert.equal(addDays("2026-12-30", 3), "2027-01-02");
    assert.equal(daysBetween("2026-09-21", "2026-09-30"), 9);
    assert.equal(daysBetween("2026-09-30", "2026-09-21"), -9);
    assert.equal(weekdayOf("2026-09-20"), 0, "September 20, 2026 is a Sunday");
    assert.equal(skipSunday("2026-09-20"), "2026-09-21");
    assert.equal(skipSunday("2026-09-21"), "2026-09-21");
  });
});

describe("cadence", () => {
  test("the pace follows the money: small, standard, and large tickets get different sequences", () => {
    const trade = getTrade("roofing");
    assert.equal(bandFor(100_000, trade), "small");
    assert.equal(bandFor(400_000, trade), "standard");
    assert.equal(bandFor(1_200_000, trade), "large");
    const small = planSequence({ sentOn: "2026-09-21", amountCents: 100_000, urgency: "planned", tradeId: "roofing" });
    const large = planSequence({ sentOn: "2026-09-21", amountCents: 1_200_000, urgency: "planned", tradeId: "roofing" });
    assert.equal(coreStepCount({ sentOn: "2026-09-21", amountCents: 100_000, urgency: "planned", tradeId: "roofing" }), 5);
    assert.equal(coreStepCount({ sentOn: "2026-09-21", amountCents: 1_200_000, urgency: "planned", tradeId: "roofing" }), 7);
    // Both carry the two revival touches after the close.
    assert.deepEqual(small.slice(-2).map((s) => s.role), ["revive", "last"]);
    assert.deepEqual(large.slice(-2).map((s) => s.role), ["revive", "last"]);
    // The large sequence closes later than the small one.
    assert.ok(large[6].day > small[4].day);
  });

  test("an urgent repair is chased faster than planned work of the same size", () => {
    const urgent = planSequence({ sentOn: "2026-09-21", amountCents: 400_000, urgency: "urgent", tradeId: "plumbing" });
    const planned = planSequence({ sentOn: "2026-09-21", amountCents: 400_000, urgency: "planned", tradeId: "plumbing" });
    assert.ok(urgent[1].day < planned[1].day, "the call comes sooner");
    assert.ok(urgent[6].day < planned[6].day, "the file closes sooner");
  });

  test("nothing lands on a Sunday and the dates strictly increase", () => {
    for (const trade of TRADES) {
      for (const urgency of ["urgent", "soon", "planned"] as const) {
        for (const amount of [10_000, 300_000, 2_000_000]) {
          for (const sentOn of ["2026-09-19", "2026-09-20", "2026-09-21", "2026-12-31"]) {
            const plan = planSequence({ sentOn, amountCents: amount, urgency, tradeId: trade.id });
            let previous = sentOn;
            for (const step of plan) {
              assert.notEqual(weekdayOf(step.on), 0, `${trade.id} ${urgency} ${amount} ${sentOn}: step ${step.step} on a Sunday`);
              assert.ok(daysBetween(previous, step.on) >= 1, `${trade.id}: step ${step.step} not after the previous`);
              previous = step.on;
            }
            assert.equal(plan[0].role, "landed");
            assert.equal(plan[0].channel, "text");
            assert.equal(plan[1].role, "call");
          }
        }
      }
    }
  });

  test("a touch the owner is behind on is due today, and the next one is spaced from the day it was actually sent", () => {
    const input = { sentOn: "2026-09-01", amountCents: 400_000, urgency: "soon" as const, tradeId: "hvac" };
    const plan = planSequence(input);
    const late = nextTouch(input, 0, "2026-09-21");
    assert.ok(late);
    assert.equal(late.on, "2026-09-21", "overdue touches are due today, not in the past");
    assert.equal(late.role, "landed");
    const onTime = nextTouch(input, 0, "2026-09-01");
    assert.equal(onTime?.on, plan[0].on);
    // After sending the late first touch on the 21st, the call is not stacked on the 22nd.
    const after = touchAfter(input, 1, "2026-09-21");
    assert.ok(after);
    assert.equal(after.role, "call");
    assert.ok(daysBetween("2026-09-21", after.on) >= 2, `call spaced from the late send, got ${after.on}`);
    assert.equal(nextTouch(input, plan.length, "2026-09-21"), null, "the sequence runs out");
  });
});

describe("the words", () => {
  const ctx: MessageContext = {
    first: "Dana",
    job: "the roof",
    amount: "$8,400",
    biz: "Nichols Roofing",
    owner: "Ryan",
    window: "the week after next",
    tradeId: "roofing",
    tone: "friendly",
    month: 9,
    seed: "q-1",
  };

  test("every role in every tone for every trade renders a message with the customer, the job, and no em dash", () => {
    const roles = ["landed", "call", "question", "proof", "reason", "schedule", "close", "revive", "last"] as const;
    for (const trade of TRADES) {
      for (const tone of TONE_OPTIONS.map((t) => t.value)) {
        for (const role of roles) {
          const m = renderMessage(role, { ...ctx, tradeId: trade.id, tone });
          assert.ok(m.body.length > 40, `${trade.id}/${tone}/${role} is too short`);
          assert.ok(!m.body.includes("—"), `${trade.id}/${tone}/${role} contains an em dash`);
          assert.ok(!/guarantee/i.test(m.body), `${trade.id}/${tone}/${role} promises something`);
          assert.ok(m.body.includes("Dana"), `${trade.id}/${tone}/${role} does not address the customer`);
          if (role !== "proof") assert.ok(m.body.includes("the roof"), `${trade.id}/${tone}/${role} does not name the job`);
          if (m.channel === "call") {
            assert.ok(m.body.startsWith("CALL SCRIPT"), `${role} is a script`);
            assert.ok(m.fallbackText && m.fallbackText.includes("Dana"), `${role} carries a voicemail text`);
          } else {
            assert.equal(m.fallbackText, undefined);
          }
        }
      }
    }
  });

  test("the trade library is what makes the messages differ", () => {
    const roof = renderMessage("reason", ctx).body;
    const dental = renderMessage("reason", { ...ctx, tradeId: "dental", job: "the treatment plan" }).body;
    assert.notEqual(roof, dental);
    const fall = renderMessage("revive", { ...ctx, month: 10 }).body;
    const winter = renderMessage("revive", { ...ctx, month: 1 }).body;
    assert.notEqual(fall, winter, "the revival hook follows the season");
    assert.ok(fall.toLowerCase().includes("fall") || fall.toLowerCase().includes("dry window"));
  });

  test("two quotes in the same week do not get the same text, and the same quote always gets the same text", () => {
    const a = renderMessage("landed", ctx).body;
    const b = renderMessage("landed", { ...ctx, seed: "q-2" }).body;
    const c = renderMessage("landed", { ...ctx, seed: "q-3" }).body;
    assert.equal(renderMessage("landed", ctx).body, a, "stable per quote");
    assert.ok(a !== b || a !== c, "at least one other quote gets the other variant");
  });

  test("the schedule call uses the owner's own start window and refuses to fake scarcity", () => {
    const m = renderMessage("schedule", ctx);
    assert.ok(m.body.includes("the week after next"));
    assert.ok(/If the slot is not real, do not say it is|Only say it if it is true|Use only when the schedule pressure is real/.test(m.body));
  });

  test("objection replies come in the trade's order and carry the rule behind each", () => {
    const replies = objectionReplies(ctx);
    assert.equal(replies[0].id, "insurance", "roofers hear insurance first");
    assert.ok(replies.every((r) => r.reply.length > 30 && r.note.length > 20));
    assert.ok(replies.find((r) => r.id === "price")?.note.includes("Never cut the price"));
    const dental = objectionReplies({ ...ctx, tradeId: "dental" });
    assert.equal(dental[0].id, "price");
  });

  test("links open the owner's own phone and email with the message already in them", () => {
    assert.equal(normalizeUsPhone("(903) 555-0100"), "19035550100");
    assert.equal(normalizeUsPhone("+1 903 555 0100"), "19035550100");
    assert.equal(normalizeUsPhone("0100"), "0100");
    const sms = smsLink("19035550100", "Hey Dana, it landed?");
    assert.ok(sms.startsWith("sms:+19035550100?&body="));
    assert.ok(sms.includes(encodeURIComponent("Hey Dana, it landed?")));
    const mail = mailLink("dana@example.com", "About the roof", "Hi Dana");
    assert.ok(mail.startsWith("mailto:dana%40example.com?subject="));
  });

  test("the trade options are the library, and seasons map to months", () => {
    assert.equal(TRADE_OPTIONS.length, TRADES.length);
    assert.ok(TRADES.length >= 20, "at least twenty trades");
    assert.equal(getTrade("not-a-trade").id, "general");
    assert.equal(seasonOf(1), "winter");
    assert.equal(seasonOf(4), "spring");
    assert.equal(seasonOf(7), "summer");
    assert.equal(seasonOf(10), "fall");
    for (const trade of TRADES) {
      assert.ok(trade.reasons.length >= 3, `${trade.id} reasons`);
      assert.ok(trade.bands.small < trade.bands.large, `${trade.id} bands`);
      assert.ok(trade.objections.length >= 6, `${trade.id} objections`);
      for (const text of [...trade.reasons, trade.proof, ...Object.values(trade.seasonal)]) {
        assert.ok(!text.includes("—"), `${trade.id} has an em dash`);
        assert.ok(!/\d+%/.test(text), `${trade.id} quotes a statistic`);
      }
    }
  });
});

describe("the sheet", () => {
  test("due today comes first, behind first, then bigger money; upcoming and quiet are separated", () => {
    const today = "2026-09-24";
    const quotes = [
      quote({ id: "small-late", amountCents: 120_000, sentOn: "2026-09-10", nextOn: "2026-09-11" }),
      quote({ id: "big-today", amountCents: 900_000, sentOn: "2026-09-23", nextOn: "2026-09-24" }),
      quote({ id: "tiny-today", amountCents: 50_000, sentOn: "2026-09-23", nextOn: "2026-09-24" }),
      quote({ id: "later", amountCents: 300_000, sentOn: "2026-09-24", nextOn: "2026-09-25" }),
      quote({ id: "quiet", amountCents: 700_000, sentOn: "2026-06-01", nextOn: null, done: 9 }),
      quote({ id: "won", status: "won", done: 3, wonOn: "2026-09-20", nextOn: null }),
    ];
    const sheet = buildSheet(quotes, [], ROOFER, today);
    assert.deepEqual(sheet.due.map((i) => i.quote.id), ["small-late", "big-today", "tiny-today"]);
    assert.ok(sheet.due[0].overdueDays > 0);
    assert.equal(sheet.due[1].overdueDays, 0);
    assert.deepEqual(sheet.upcoming.map((i) => i.quote.id), ["later"]);
    assert.deepEqual(sheet.quiet.map((q) => q.id), ["quiet"]);
    for (const item of sheet.due) {
      assert.ok(item.message.body.includes("Dana"));
      assert.ok(item.links.tel?.startsWith("tel:+1903"));
      if (item.message.channel === "text") assert.ok(item.links.sms?.startsWith("sms:+1903"));
    }
  });

  test("a snooze past the plan holds the quote until that day", () => {
    const today = "2026-09-24";
    const sheet = buildSheet([quote({ nextOn: "2026-10-15" })], [], ROOFER, today);
    assert.equal(sheet.due.length, 0);
    assert.equal(sheet.upcoming.length, 0);
    assert.equal(sheet.quiet.length, 0);
  });

  test("the ledger adds up the owner's own quotes and credits chasing only when a touch preceded the win", () => {
    const today = "2026-09-24";
    const touches: Touch[] = [
      { id: "t1", quoteId: "won-chased", step: 1, role: "landed", channel: "text", outcome: "sent", note: "", at: "2026-09-22T14:00:00Z" },
      { id: "t2", quoteId: "open", step: 1, role: "landed", channel: "text", outcome: "skipped", note: "", at: "2026-09-22T14:00:00Z" },
    ];
    const quotes = [
      quote({ id: "open", amountCents: 500_000, nextOn: "2026-09-24" }),
      quote({ id: "won-chased", status: "won", amountCents: 800_000, done: 1, nextOn: null }),
      quote({ id: "won-cold", status: "won", amountCents: 200_000, done: 0, nextOn: null }),
      quote({ id: "lost", status: "lost", amountCents: 300_000, nextOn: null }),
      quote({ id: "quiet", amountCents: 100_000, nextOn: null, done: 7 }),
    ];
    const ledger = buildLedger(quotes, touches, ROOFER, today);
    assert.equal(ledger.openCount, 2);
    assert.equal(ledger.openCents, 600_000);
    assert.equal(ledger.wonCount, 2);
    assert.equal(ledger.wonCents, 1_000_000);
    assert.equal(ledger.wonAfterChaseCount, 1);
    assert.equal(ledger.wonAfterChaseCents, 800_000);
    assert.equal(ledger.lostCents, 300_000);
    assert.equal(ledger.quietCount, 1);
    assert.equal(ledger.dueCount, 1);
    assert.equal(ledger.dueCents, 500_000);
    assert.equal(ledger.touchesThisWeek, 1, "a skipped touch is not a touch");
    assert.equal(money(840_000), "$8,400");
  });

  test("the full sequence for a quote marks what is done and reads from the profile", () => {
    const seq = sequenceFor(quote({ done: 2 }), ROOFER, "2026-09-24");
    assert.equal(seq.filter((s) => s.done).length, 2);
    assert.ok(seq[0].message.body.includes("Nichols Roofing"));
    assert.ok(seq[0].message.body.includes("Ryan"));
    assert.equal(firstNameOf("Dana Whitfield"), "Dana");
    assert.equal(contextFor(quote(), { ...ROOFER, business: "" }, "2026-09-24").biz, "[Your business]");
  });
});

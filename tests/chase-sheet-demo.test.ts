// The free demo: the real engine, with the library held back.
//
// The page says what the demo shows and what it holds: the first three
// touches in full, the rest dated, one objection reply in full. These tests
// pin that, and pin the two leaks the tightening closed: the trade list no
// longer changes which variant of a text step appears, and the cadence takes
// no override from the request.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { buildDemo, DEMO_FULL_OBJECTION, DEMO_WRITTEN_STEPS } from "../lib/chaseSheet/demo.ts";
import { TONE_OPTIONS } from "../lib/chaseSheet/messages.ts";
import { getTrade, TRADES } from "../lib/chaseSheet/trades.ts";

const TODAY = "2026-09-24";

describe("the free demo", () => {
  test("writes the first three touches in full and dates the rest", () => {
    const demo = buildDemo({ tradeId: "roofing", tone: "friendly", first: "Dana", job: "the roof", amountUsd: "8400" }, TODAY);
    assert.equal(demo.trade, "Roofing");
    assert.equal(demo.written, DEMO_WRITTEN_STEPS);
    assert.equal(demo.steps.length, 9, "seven core touches and two revival touches, all dated");
    demo.steps.forEach(({ step, message }, i) => {
      assert.ok(step.on > TODAY, `step ${step.step} lands on a real date after today`);
      assert.ok(step.job, `step ${step.step} says what the touch is for`);
      if (i < DEMO_WRITTEN_STEPS) {
        assert.ok(message, `step ${step.step} is written`);
        assert.match(message.body, /Dana/);
        assert.match(message.body, /the roof/);
      } else {
        assert.equal(message, null, `step ${step.step} is dated, not written`);
      }
    });
    assert.deepEqual(demo.steps.slice(0, DEMO_WRITTEN_STEPS).map((s) => s.step.role), ["landed", "call", "question"]);
    assert.ok(demo.steps[1].message?.fallbackText, "the call step carries its voicemail text");
  });

  test("the written three are the same three for every ticket band", () => {
    for (const amountUsd of ["400", "8400", "40000"]) {
      const demo = buildDemo({ tradeId: "roofing", amountUsd }, TODAY);
      assert.deepEqual(
        demo.steps.filter((s) => s.message).map((s) => s.step.role),
        ["landed", "call", "question"],
        `$${amountUsd}`,
      );
    }
  });

  test("answers one objection in full and names the rest, for every trade", () => {
    for (const trade of TRADES) {
      const demo = buildDemo({ tradeId: trade.id }, TODAY);
      assert.equal(demo.objections.length, trade.objections.length, trade.id);
      const full = demo.objections.filter((o) => o.reply);
      assert.equal(full.length, 1, `${trade.id}: exactly one reply in full`);
      assert.equal(full[0].id, DEMO_FULL_OBJECTION, `${trade.id}: the full reply is the one every trade lists`);
      assert.equal(demo.objections[0].id, DEMO_FULL_OBJECTION, `${trade.id}: the full reply comes first`);
      for (const o of demo.objections.slice(1)) {
        assert.ok(o.heard && o.note, `${trade.id}: ${o.id} is named with its rule`);
        assert.equal(o.reply, undefined, `${trade.id}: ${o.id} is not written out`);
      }
    }
  });

  test("changing the trade never changes which variant of a text step appears", () => {
    for (const tone of TONE_OPTIONS) {
      for (const index of [0, 2]) {
        const bodies = new Set(TRADES.map((t) => buildDemo({ tradeId: t.id, tone: tone.value, job: "the work" }, TODAY).steps[index].message?.body));
        assert.equal(bodies.size, 1, `${tone.value}: step ${index + 1} is one variant across every trade`);
      }
    }
  });

  test("takes no urgency from the request", () => {
    const usual = buildDemo({ tradeId: "roofing" }, TODAY).steps.map((s) => s.step.on);
    const pushed = buildDemo({ tradeId: "roofing", urgency: "urgent" }, TODAY).steps.map((s) => s.step.on);
    assert.deepEqual(pushed, usual);
    assert.equal(getTrade("roofing").urgency, "soon");
  });

  test("falls back to the general trade, the friendly tone, Dana, and a visible business placeholder", () => {
    const demo = buildDemo({ tradeId: "nope", tone: "shouty", amountUsd: "lots" }, TODAY);
    assert.equal(demo.trade, getTrade("general").label);
    assert.match(demo.steps[0].message?.body ?? "", /^Hey Dana,/);
    assert.match(demo.steps[0].message?.body ?? "", /\[Your business\]/);
  });

  test("the route hands the body to the engine and nothing else", () => {
    const route = readFileSync("app/api/chase-sheet/demo/route.ts", "utf8");
    assert.match(route, /buildDemo\(/);
    assert.doesNotMatch(route, /renderMessage|objectionReplies|planSequence/, "the route cannot widen what the demo shows");
    assert.match(route, /MAX_PER_WINDOW = 30\b/);
  });
});

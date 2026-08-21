import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HOLD_THE_LINE_OFFERS, holdTheLineOffer } from "../lib/offers.ts";
import {
  HOLD_THE_LINE_PURCHASE_EVENT,
  HOLD_THE_LINE_SERIES_EVENT,
} from "../lib/leadNotify.ts";

// The ladder's slugs and prices are load-bearing: the checkout route charges
// from them, the webhook routes fulfillment by them, and the Resend
// automation's trigger and exit rule are wired to the event names. A rename
// here silently breaks paid delivery, so these are pinned.

describe("Hold The Line offer ladder", () => {
  it("carries the four approved rungs at the approved prices", () => {
    const expected = [
      ["hold-the-line-playbook", 4700, "payment"],
      ["comment-rescue", 19700, "payment"],
      ["voice-recovery", 49700, "payment"],
      ["comment-cover", 29700, "subscription"],
    ];
    assert.deepEqual(
      HOLD_THE_LINE_OFFERS.map((o) => [o.slug, o.amountCents, o.mode]),
      expected,
    );
  });

  it("looks offers up by slug and rejects unknown slugs", () => {
    assert.equal(holdTheLineOffer("comment-rescue")?.name, "Comment Rescue");
    assert.equal(holdTheLineOffer("free-build"), null);
    assert.equal(holdTheLineOffer(""), null);
  });

  it("never guarantees an outcome and never offers to go after a person", () => {
    // Hard product rules from the lane spec. Any copy that implies either has
    // to be cut, and this catches the lib-level copy before it ships.
    const text = JSON.stringify(HOLD_THE_LINE_OFFERS).toLowerCase();
    for (const banned of [
      "guarantee",
      "we will get your account back",
      "expose them",
      "find out who",
    ]) {
      assert.equal(text.includes(banned), false, `offer copy contains "${banned}"`);
    }
  });

  it("keeps the lane's copy free of em dashes", () => {
    assert.equal(JSON.stringify(HOLD_THE_LINE_OFFERS).includes("—"), false);
  });
});

describe("Hold The Line Resend events", () => {
  it("uses its own trigger event, never the Free Build one", () => {
    assert.equal(HOLD_THE_LINE_SERIES_EVENT, "hold-the-line-lead");
    assert.notEqual(HOLD_THE_LINE_SERIES_EVENT, "free-build-lead");
  });

  it("uses a distinct purchase event for the automation exit rule", () => {
    assert.equal(HOLD_THE_LINE_PURCHASE_EVENT, "hold-the-line-purchase");
    assert.notEqual(HOLD_THE_LINE_PURCHASE_EVENT, HOLD_THE_LINE_SERIES_EVENT);
  });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { isDedicatedPictureStripeEvent, isPictureStudioStripeObject } from "../lib/pictureStudio/stripeIsolation.ts";

const tagged = { metadata: { service: "picture_studio", studio_order_id: "47c9d07f-3ad5-46b2-b5c0-ad29f8363136", fulfillment_mode: "automated_reviewed" } };
const noLookup = async () => { throw new Error("Unexpected lookup"); };
test("only explicit automated picture tags leave the legacy purchase dispatch", async () => {
  assert.equal(isPictureStudioStripeObject(tagged), true);
  assert.equal(isPictureStudioStripeObject({ metadata: { ...tagged.metadata, studio_order_id: "invalid" } }), false);
  assert.equal(await isDedicatedPictureStripeEvent({ type: "checkout.session.completed", data: { object: tagged } }, noLookup), true);
  assert.equal(await isDedicatedPictureStripeEvent({ type: "checkout.session.completed", data: { object: { metadata: { kind: "picture_pack_starter", fulfillment_mode: "manual_review" } } } }, noLookup), false);
  assert.equal(await isDedicatedPictureStripeEvent({ type: "charge.refunded", data: { object: tagged } }, noLookup), true);
});
test("disputes resolve ownership from the Charge and preserve unrelated payments", async () => {
  let lookedUp = "";
  const event = { type: "charge.dispute.created", data: { object: { charge: "ch_ABC123", ...tagged } } };
  assert.equal(await isDedicatedPictureStripeEvent(event, async id => { lookedUp = id; return tagged; }), true);
  assert.equal(lookedUp, "ch_ABC123");
  assert.equal(await isDedicatedPictureStripeEvent(event, async () => ({ metadata: { kind: "agency" } })), false);
  await assert.rejects(isDedicatedPictureStripeEvent(event, async () => { throw new Error("Lookup unavailable"); }), /Lookup unavailable/);
});

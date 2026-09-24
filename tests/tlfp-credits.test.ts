import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  TLFP_CREDITS,
  TLFP_EARN_RULES,
  TLFP_PACKS,
  TLFP_REDEEMABLE_KINDS,
  earnRule,
  findPack,
  packBonusPercent,
  redeemableCredits,
  referralCredits,
  wouldExceedCap,
} from "../lib/tlfpCredits.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { PRICES } from "../lib/site/prices.ts";

// TLFP Credits is a closed loop: store credit, not a coin. These tests hold
// the lines that keep it one: the balance cap, the pack maths, the numbers
// the database trigger must agree with, and the checkout rules that stop a
// coupon from colliding with an exact-total fulfilment.

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260923000000_tlfp_credits.sql"), "utf8");
const checkout = readFileSync(join(process.cwd(), "app/api/checkout/route.ts"), "utf8");
const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");

test("every pack carries a bonus, fits under the cap, and reads its dollars from PRICES", () => {
  const prices = new Set<number>([PRICES.tlfpPackStarter, PRICES.tlfpPackBuilder, PRICES.tlfpPackFounder]);
  for (const pack of TLFP_PACKS) {
    assert.ok(pack.credits > pack.priceUsd, `${pack.id} gives more credits than dollars`);
    assert.ok(pack.credits <= TLFP_CREDITS.maxBalance, `${pack.id} alone fits under the cap`);
    assert.ok(prices.has(pack.priceUsd), `${pack.id} price comes from lib/site/prices.ts`);
    assert.ok(packBonusPercent(pack) >= 10 && packBonusPercent(pack) <= 50, `${pack.id} bonus is a sane percentage`);
  }
  const bonuses = TLFP_PACKS.map(packBonusPercent);
  assert.deepEqual([...bonuses].sort((a, b) => a - b), bonuses, "a bigger pack never carries a smaller bonus");
  assert.equal(findPack("starter")?.credits, 300);
  assert.equal(findPack("nope"), null);
  assert.equal(findPack(42), null);
});

test("the cap is under the $2,000 closed-loop line and the maths respects it", () => {
  assert.ok(TLFP_CREDITS.maxBalance * TLFP_CREDITS.creditValueCents < 200_000, "balance stays under $2,000");
  assert.equal(wouldExceedCap(1000, 1300), true);
  assert.equal(wouldExceedCap(699, 1300), false);
  assert.match(migration, /v_cap constant integer := 1999/, "the database enforces the same cap");
});

test("redeemable credits never exceed the balance or the amount due", () => {
  assert.equal(redeemableCredits(625, 49_700), 497);
  assert.equal(redeemableCredits(100, 49_700), 100);
  assert.equal(redeemableCredits(0, 49_700), 0);
  assert.equal(redeemableCredits(300, 19_750), 197, "whole credits only");
  assert.equal(redeemableCredits(-5, 1000), 0);
});

test("referral pays 10% of a first purchase, in whole credits, and nothing on nothing", () => {
  assert.equal(earnRule("referral_purchase").percentOfPurchase, 10);
  assert.equal(referralCredits(49_700), 49);
  assert.equal(referralCredits(150_000), 150);
  assert.equal(referralCredits(0), 0);
  assert.equal(referralCredits(Number.NaN), 0);
});

test("the database trigger awards the same attendance credits the page promises", () => {
  const attend = earnRule("event_attended").credits;
  assert.ok(attend && attend > 0);
  assert.ok(migration.includes(`lower(new.email), ${attend}, 'event_attended'`), `trigger posts ${attend}`);
  assert.ok(migration.includes("after update of status on public.event_registrations"), "trigger is on the status column");
});

test("earn rules never pay for reviews, and every rule has a number or a percentage", () => {
  for (const rule of TLFP_EARN_RULES) {
    assert.ok(!/review/i.test(rule.label) && !/review/i.test(rule.how), `${rule.id} does not incentivize reviews`);
    assert.ok(typeof rule.credits === "number" || typeof rule.percentOfPurchase === "number", `${rule.id} pays something`);
  }
});

test("checkout holds credits before Stripe, and never sends a coupon with allow_promotion_codes", () => {
  const hold = checkout.indexOf("holdCredits(service");
  const coupon = checkout.indexOf('fetch("https://api.stripe.com/v1/coupons"');
  const session = checkout.indexOf('fetch("https://api.stripe.com/v1/checkout/sessions"');
  assert.ok(hold > 0 && coupon > hold && session > coupon, "hold, then coupon, then session");
  assert.ok(checkout.includes('if (tlfpHold) params.set("discounts[0][coupon]", tlfpHold.coupon);'));
  assert.ok(checkout.includes('else params.set("allow_promotion_codes", "true");'));
  assert.ok(!checkout.includes('allow_promotion_codes: "true"'), "promotion codes are no longer unconditional");
  assert.ok(checkout.includes("settleHold(service, ref, \"released\")") || checkout.includes('settleHold(service, ref, "released")'), "a failed coupon releases the hold");
});

test("exact-total fulfilments are never credit-eligible", () => {
  for (const kind of ["event", "pro_tool", "pro_bundle", "september_special_2026", "tool_monthly_menu", "agency_payment", "sellerproof_packet"]) {
    assert.ok(!TLFP_REDEEMABLE_KINDS.has(kind), `${kind} cannot take credits`);
  }
  assert.ok(checkout.includes('if (kind === "package_deposit" && metadata.package !== "system-map") return false;'), "the Website Launch deposit stays exact");
});

test("the webhook posts packs, settles holds on paid, releases on expiry, and reverses on refund", () => {
  assert.ok(hook.includes('await settleHold(supabase, tlfpHoldRef, "posted"'), "paid checkout posts the hold");
  assert.ok(hook.includes('event.type === "checkout.session.expired"') && hook.includes('"released"'), "expired checkout releases the hold");
  assert.ok(hook.includes('session.payment_status === "no_payment_required" && !!tlfpHoldRef'), "a checkout fully covered by credits still fulfils");
  assert.ok(hook.includes("creditPackReversed(supabase, { email: purchase.email, sessionId: purchase.stripe_session_id, restore: restoring })"), "refund reverses the pack");
  const settle = hook.indexOf('await settleHold(supabase, tlfpHoldRef, "posted"');
  const record = hook.indexOf("await recordPurchase(supabase, {");
  assert.ok(record > 0 && settle > record, "the purchase row is written before the hold is settled");
});

test("both public pages are catalogued so they get social artwork", () => {
  const paths = new Set(PUBLIC_PAGE_CATALOG.map((page) => page.path));
  assert.ok(paths.has(TLFP_CREDITS.path));
  assert.ok(paths.has(TLFP_CREDITS.termsPath));
  assert.ok(!/credit/i.test(TLFP_CREDITS.path), "the public path avoids the analytics filter that drops /credit/ URLs");
});

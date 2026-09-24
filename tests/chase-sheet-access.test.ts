// Who gets into Chase Sheet, and when it locks.
//
// The part money depends on: the identity cookie, the license key, what a
// Stripe session is allowed to unlock, the plan decisions, and the webhook
// handler for the monthly plan, run against a fake database.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  chaseLicenseKey,
  identityFor,
  purchaseFromSession,
  signIdentity,
  verifyChaseLicenseKey,
  verifyIdentity,
} from "../lib/chaseSheet/access.ts";
import { accountView, decideEntitlement, looksStale, statusFromStripe } from "../lib/chaseSheet/plan.ts";
import { CHASE_SHEET, isChaseSheetKind, planForKind } from "../lib/chaseSheet/product.ts";
import { applyChaseSheetMoneyBack, handleChaseSheetSubscription, markChaseSheetRenewed } from "../lib/chaseSheet/subscription.ts";
import type { Db } from "../lib/chaseSheet/db.ts";
import type { Account } from "../lib/chaseSheet/types.ts";
import { PRICES } from "../lib/site/prices.ts";
import { classifyStripeInvoice, renewalAction } from "../lib/stripeInvoiceEvents.ts";

const SECRET = "test-secret-one";
const OTHER = "test-secret-two";

function account(over: Partial<Account> = {}): Account {
  return {
    email: "owner@example.com",
    plan: "monthly",
    status: "active",
    currentPeriodEnd: "2026-10-21T00:00:00.000Z",
    cancelAt: null,
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    stripeEventAt: 100,
    profile: { business: "", owner: "", phone: "", tradeId: "general", tone: "friendly", window: "the week after next", timezone: "America/Chicago" },
    createdAt: "2026-09-21T00:00:00.000Z",
    ...over,
  };
}

describe("product", () => {
  test("the two kinds, their plans, and their prices come from the price registry", () => {
    assert.equal(isChaseSheetKind("chase_sheet_monthly"), true);
    assert.equal(isChaseSheetKind("chase_sheet_lifetime"), true);
    assert.equal(isChaseSheetKind("pro_bundle"), false);
    assert.equal(planForKind(CHASE_SHEET.monthlyKind), "monthly");
    assert.equal(planForKind(CHASE_SHEET.lifetimeKind), "lifetime");
    assert.equal(planForKind("learn_it"), null);
    assert.equal(CHASE_SHEET.monthlyUsd, PRICES.chaseSheetMonthly);
    assert.equal(CHASE_SHEET.lifetimeUsd, PRICES.chaseSheetLifetime);
    assert.equal(CHASE_SHEET.monthlyLabel, "$20/mo");
    assert.equal(CHASE_SHEET.lifetimeLabel, "$97 once");
  });
});

describe("identity cookie", () => {
  test("round-trips under the signing secret, any known secret verifies, a tampered body fails", () => {
    const token = signIdentity(identityFor("Owner@Example.com "), SECRET);
    const back = verifyIdentity(token, [OTHER, SECRET]);
    assert.ok(back);
    assert.equal(back.e, "owner@example.com");
    assert.equal(verifyIdentity(token, [OTHER]), null);
    const [body, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ v: 1, e: "thief@example.com", t: Math.floor(Date.now() / 1000) })).toString("base64url")}.${sig}`;
    assert.equal(verifyIdentity(forged, [SECRET]), null);
    assert.equal(verifyIdentity(`${body}.`, [SECRET]), null);
    assert.equal(verifyIdentity(undefined, [SECRET]), null);
  });

  test("an expired or future-dated token is rejected", () => {
    const old = signIdentity({ v: 1, e: "owner@example.com", t: 1_000 }, SECRET);
    assert.equal(verifyIdentity(old, [SECRET]), null);
    const future = signIdentity({ v: 1, e: "owner@example.com", t: Math.floor(Date.now() / 1000) + 3600 }, SECRET);
    assert.equal(verifyIdentity(future, [SECRET]), null);
  });

  test("the license key is derived, stable, and tied to the email", () => {
    const key = chaseLicenseKey("owner@example.com", SECRET);
    assert.match(key, /^LFP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(chaseLicenseKey("OWNER@example.com", SECRET), key);
    assert.equal(verifyChaseLicenseKey("owner@example.com", key.toLowerCase().replace(/-/g, " "), [OTHER, SECRET]), true);
    assert.equal(verifyChaseLicenseKey("other@example.com", key, [SECRET]), false);
    assert.equal(verifyChaseLicenseKey("owner@example.com", key, [OTHER]), false);
  });
});

describe("what a Stripe session may unlock", () => {
  const base = {
    id: "cs_test_abcdefghijklmnop",
    currency: "usd",
    payment_status: "paid",
    customer_details: { email: "Owner@Example.com" },
    customer: "cus_1",
  };

  test("the lifetime plan needs payment mode and its exact amount", () => {
    const ok = purchaseFromSession({ ...base, mode: "payment", amount_total: PRICES.chaseSheetLifetime * 100, metadata: { kind: CHASE_SHEET.lifetimeKind } });
    assert.ok(ok);
    assert.equal(ok.plan, "lifetime");
    assert.equal(ok.email, "owner@example.com");
    assert.equal(ok.subscriptionId, null);
    assert.equal(purchaseFromSession({ ...base, mode: "payment", amount_total: PRICES.chaseSheetMonthly * 100, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null, "a monthly amount cannot buy the lifetime plan");
    assert.equal(purchaseFromSession({ ...base, mode: "subscription", amount_total: PRICES.chaseSheetLifetime * 100, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null);
  });

  test("the monthly plan needs subscription mode, its amount, and carries the subscription id", () => {
    const ok = purchaseFromSession({ ...base, mode: "subscription", subscription: "sub_9", amount_total: PRICES.chaseSheetMonthly * 100, metadata: { kind: CHASE_SHEET.monthlyKind } });
    assert.ok(ok);
    assert.equal(ok.plan, "monthly");
    assert.equal(ok.subscriptionId, "sub_9");
    assert.equal(ok.customerId, "cus_1");
    // A promotion code lowers amount_total; the subtotal still proves the plan.
    const promo = purchaseFromSession({ ...base, mode: "subscription", amount_total: 1000, amount_subtotal: PRICES.chaseSheetMonthly * 100, metadata: { kind: CHASE_SHEET.monthlyKind } });
    assert.ok(promo);
  });

  test("anything unpaid, foreign, or with another kind is refused", () => {
    assert.equal(purchaseFromSession({ ...base, mode: "payment", payment_status: "unpaid", amount_total: 9700, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null);
    assert.equal(purchaseFromSession({ ...base, mode: "payment", currency: "eur", amount_total: 9700, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null);
    assert.equal(purchaseFromSession({ ...base, mode: "payment", amount_total: 9700, metadata: { kind: "pro_bundle" } }), null);
    assert.equal(purchaseFromSession({ ...base, id: "not-a-session", mode: "payment", amount_total: 9700, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null);
    assert.equal(purchaseFromSession({ ...base, customer_details: null, customer_email: "", mode: "payment", amount_total: 9700, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null);
  });
});

describe("plan decisions", () => {
  const now = new Date("2026-09-24T12:00:00Z");

  test("lifetime is entitled while active, locked after a refund", () => {
    assert.equal(decideEntitlement(account({ plan: "lifetime", currentPeriodEnd: null, stripeSubscriptionId: null }), now).entitled, true);
    assert.equal(decideEntitlement(account({ plan: "lifetime", status: "canceled" }), now).reason, "canceled");
    assert.equal(decideEntitlement(null, now).reason, "no_account");
  });

  test("monthly: active is in, canceled is out, a scheduled cancel keeps access to its date, past due gets the grace window", () => {
    assert.equal(decideEntitlement(account(), now).entitled, true);
    assert.equal(decideEntitlement(account({ status: "canceled" }), now).reason, "canceled");
    assert.equal(decideEntitlement(account({ cancelAt: "2026-10-21T00:00:00.000Z" }), now).entitled, true);
    assert.equal(decideEntitlement(account({ cancelAt: "2026-09-01T00:00:00.000Z" }), now).reason, "canceled");
    const missed = account({ status: "past_due", currentPeriodEnd: "2026-09-21T00:00:00.000Z" });
    assert.equal(decideEntitlement(missed, now).entitled, true, "three days into the grace window");
    const expired = account({ status: "past_due", currentPeriodEnd: "2026-09-01T00:00:00.000Z" });
    assert.equal(decideEntitlement(expired, now).reason, "past_due");
  });

  test("a monthly account whose paid period ended with no newer event looks stale", () => {
    assert.equal(looksStale(account(), now), false);
    assert.equal(looksStale(account({ currentPeriodEnd: "2026-09-20T00:00:00.000Z" }), now), true);
    assert.equal(looksStale(account({ plan: "lifetime", currentPeriodEnd: "2026-09-01T00:00:00.000Z" }), now), false);
    assert.equal(looksStale(account({ status: "canceled", currentPeriodEnd: "2026-09-01T00:00:00.000Z" }), now), false);
    assert.equal(looksStale(account({ currentPeriodEnd: null, createdAt: "2026-07-01T00:00:00.000Z" }), now), true, "no period recorded after five weeks");
  });

  test("Stripe statuses fold into three account states, and the browser never sees Stripe ids", () => {
    assert.equal(statusFromStripe({ status: "active" }), "active");
    assert.equal(statusFromStripe({ status: "trialing" }), "active");
    assert.equal(statusFromStripe({ status: "past_due" }), "past_due");
    assert.equal(statusFromStripe({ status: "unpaid" }), "past_due");
    assert.equal(statusFromStripe({ status: "canceled" }), "canceled");
    assert.equal(statusFromStripe({ status: "incomplete" }), "canceled");
    const view = accountView(account());
    assert.deepEqual(Object.keys(view).sort(), ["canManageBilling", "email", "endsOn", "plan", "renewsOn", "status"]);
    assert.equal(view.canManageBilling, true);
    assert.equal(accountView(account({ plan: "lifetime" })).canManageBilling, false);
    assert.equal(accountView(account({ cancelAt: "2026-10-21T00:00:00.000Z" })).renewsOn, null);
  });
});

/* ------------------------------ fake database ------------------------------ */

type Row = Record<string, unknown>;

function fakeDb(rows: Row[]) {
  const updates: { email: string; patch: Row }[] = [];
  function query(table: string) {
    if (table !== "chase_sheet_accounts") throw new Error(`unexpected table ${table}`);
    let filtered = rows;
    const chain = {
      select: () => chain,
      eq: (col: string, value: unknown) => {
        filtered = filtered.filter((r) => r[col] === value);
        return chain;
      },
      limit: () => chain,
      maybeSingle: async () => ({ data: filtered[0] ? { ...filtered[0] } : null, error: null }),
      update: (patch: Row) => ({
        eq: async (col: string, value: unknown) => {
          for (const r of rows) if (r[col] === value) Object.assign(r, patch);
          updates.push({ email: String(value), patch });
          return { error: null };
        },
      }),
    };
    return chain;
  }
  return { client: { from: query } as unknown as Db, rows, updates };
}

const row = (over: Row = {}): Row => ({
  email: "owner@example.com",
  plan: "monthly",
  status: "active",
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  current_period_end: "2026-10-21T00:00:00.000Z",
  cancel_at: null,
  stripe_event_at: 100,
  profile: {},
  created_at: "2026-09-21T00:00:00.000Z",
  ...over,
});

describe("the subscription webhook", () => {
  test("a cancellation locks the account, an older event is ignored, a foreign kind is not claimed", async () => {
    const { client, rows } = fakeDb([row()]);
    const deleted = { type: "customer.subscription.deleted", created: 200, data: { object: { id: "sub_1", customer: "cus_1", status: "canceled", metadata: { kind: CHASE_SHEET.monthlyKind } } } };
    assert.equal(await handleChaseSheetSubscription(client, deleted), true);
    assert.equal(rows[0].status, "canceled");
    assert.equal(rows[0].stripe_event_at, 200);
    const stale = { type: "customer.subscription.updated", created: 150, data: { object: { id: "sub_1", status: "active", metadata: { kind: CHASE_SHEET.monthlyKind } } } };
    assert.equal(await handleChaseSheetSubscription(client, stale), true);
    assert.equal(rows[0].status, "canceled", "an older event never wins");
    const hq = { type: "customer.subscription.updated", created: 300, data: { object: { id: "sub_1", status: "active", metadata: { kind: "hq_subscription" } } } };
    assert.equal(await handleChaseSheetSubscription(client, hq), false);
    assert.equal(await handleChaseSheetSubscription(client, { type: "invoice.paid" }), false);
  });

  test("a past-due update carries the period and a scheduled cancel", async () => {
    const { client, rows } = fakeDb([row()]);
    const event = {
      type: "customer.subscription.updated",
      created: 250,
      data: { object: { id: "sub_1", status: "past_due", current_period_end: 1_792_000_000, cancel_at_period_end: true, metadata: { kind: CHASE_SHEET.monthlyKind } } },
    };
    assert.equal(await handleChaseSheetSubscription(client, event), true);
    assert.equal(rows[0].status, "past_due");
    assert.equal(rows[0].current_period_end, new Date(1_792_000_000 * 1000).toISOString());
    assert.equal(rows[0].cancel_at, new Date(1_792_000_000 * 1000).toISOString());
  });

  test("a lifetime account is never governed by a subscription event", async () => {
    const { client, rows } = fakeDb([row({ plan: "lifetime" })]);
    const deleted = { type: "customer.subscription.deleted", created: 200, data: { object: { id: "sub_1", status: "canceled", metadata: { kind: CHASE_SHEET.monthlyKind } } } };
    assert.equal(await handleChaseSheetSubscription(client, deleted), true);
    assert.equal(rows[0].status, "active");
  });

  test("a paid renewal reopens a past-due account; a refund locks either plan; a dispute won reopens it", async () => {
    const { client, rows } = fakeDb([row({ status: "past_due" })]);
    await markChaseSheetRenewed(client, "sub_1", 400);
    assert.equal(rows[0].status, "active");
    await applyChaseSheetMoneyBack(client, { email: "owner@example.com", kind: CHASE_SHEET.lifetimeKind }, false);
    assert.equal(rows[0].status, "canceled");
    await applyChaseSheetMoneyBack(client, { email: "owner@example.com", kind: CHASE_SHEET.lifetimeKind }, true);
    assert.equal(rows[0].status, "active");
    await applyChaseSheetMoneyBack(client, { email: "owner@example.com", kind: "pro_bundle" }, false);
    assert.equal(rows[0].status, "active", "another product's refund does not touch the sheet");
  });

  test("renewal invoices classify as the chase_sheet family and follow the renewal rules", () => {
    const first = classifyStripeInvoice({ id: "in_1", amount_paid: 2000, billing_reason: "subscription_create", subscription: "sub_1", subscription_details: { metadata: { kind: CHASE_SHEET.monthlyKind, plan: "monthly" } } });
    assert.equal(first.family, "chase_sheet");
    assert.equal(renewalAction(first, "invoice.paid"), "skip_first_invoice");
    const cycle = classifyStripeInvoice({ id: "in_2", amount_paid: 2000, billing_reason: "subscription_cycle", subscription: "sub_1", subscription_details: { metadata: { kind: CHASE_SHEET.monthlyKind } } });
    assert.equal(renewalAction(cycle, "invoice.paid"), "record_paid");
    assert.equal(renewalAction(cycle, "invoice.payment_failed"), "record_failed");
  });
});

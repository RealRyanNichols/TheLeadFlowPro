// Who gets into Post Creator, and when it locks.
//
// The parts money and privacy depend on: the identity cookie and its epoch,
// the license key, what a Stripe session may unlock, the claim decision that
// keeps a stranger's checkout from signing into someone else's account, the
// plan decisions, the Chicago calendar the AI allowance counts in, and the
// server plumbing every /api/post-creator route starts with, run under the
// same vm route harness the route tests use.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {
  chaseLicenseKey,
  identityFor as chaseIdentityFor,
  signIdentity as signChaseIdentity,
  verifyChaseLicenseKey,
  verifyIdentity as verifyChaseIdentity,
} from "../lib/chaseSheet/access.ts";
import { CHASE_SHEET } from "../lib/chaseSheet/product.ts";
import {
  POST_CREATOR_COOKIE,
  POST_CREATOR_COOKIE_MAX_AGE,
  bucketFor,
  identityFor,
  postCreatorCookieOptions,
  postCreatorLicenseKey,
  postCreatorSecrets,
  purchaseFromSession,
  signIdentity,
  verifyIdentity,
  verifyPostCreatorLicenseKey,
} from "../lib/postCreator/access.ts";
import {
  accountView,
  allowanceView,
  chicagoParts,
  claimDecision,
  decideEntitlement,
  graceEnd,
  looksStale,
  monthDayLabel,
  seasonForMonth,
  statusFromStripe,
} from "../lib/postCreator/plan.ts";
import { POST_CREATOR } from "../lib/postCreator/product.ts";
import { EMPTY_PROFILE } from "../lib/postCreator/profile.ts";
import type { Account } from "../lib/postCreator/types.ts";
import * as proAccess from "../lib/proAccess.ts";
import { PRICES } from "../lib/site/prices.ts";

const SECRET = "test-secret-one";
const OTHER = "test-secret-two";
const EMAIL = "owner@example.com";
const DAY = 86_400_000;

function account(over: Partial<Account> = {}): Account {
  return {
    email: EMAIL,
    plan: "monthly",
    status: "active",
    currentPeriodEnd: "2026-10-21T00:00:00.000Z",
    cancelAt: null,
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    firstSessionId: "cs_test_abcdefghijkl",
    lastSessionId: "cs_test_abcdefghijkl",
    firstClaimedAt: null,
    accessEpoch: 0,
    stripeEventAt: 100,
    stripeSyncedAt: null,
    profile: { ...EMPTY_PROFILE, services: [] },
    createdAt: "2026-09-21T00:00:00.000Z",
    ...over,
  };
}

/** Runs `fn` with these env vars set (undefined deletes one), then puts the old values back. */
function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("identity cookie", () => {
  test("round-trips with its epoch under the signing secret; any known secret verifies; a tampered body fails", () => {
    const token = signIdentity(identityFor("Owner@Example.com ", 3), SECRET);
    const back = verifyIdentity(token, [OTHER, SECRET]);
    assert.ok(back);
    assert.equal(back.e, EMAIL);
    assert.equal(back.n, 3);
    assert.equal(verifyIdentity(token, [OTHER]), null);
    const [body, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ v: 1, e: "thief@example.com", t: Math.floor(Date.now() / 1000), n: 3 })).toString("base64url")}.${sig}`;
    assert.equal(verifyIdentity(forged, [SECRET]), null);
    assert.equal(verifyIdentity(`${body}.`, [SECRET]), null);
    assert.equal(verifyIdentity(undefined, [SECRET]), null);
    assert.equal(verifyIdentity("x".repeat(2049), [SECRET]), null);
  });

  test("an expired or future-dated token is rejected; a minute of clock skew is allowed", () => {
    const now = 1_800_000_000;
    assert.equal(verifyIdentity(signIdentity({ v: 1, e: EMAIL, t: 1_000, n: 0 }, SECRET), [SECRET], now), null);
    assert.equal(verifyIdentity(signIdentity({ v: 1, e: EMAIL, t: now - POST_CREATOR_COOKIE_MAX_AGE - 1, n: 0 }, SECRET), [SECRET], now), null);
    assert.equal(verifyIdentity(signIdentity({ v: 1, e: EMAIL, t: now + 3600, n: 0 }, SECRET), [SECRET], now), null);
    assert.ok(verifyIdentity(signIdentity({ v: 1, e: EMAIL, t: now + 60, n: 0 }, SECRET), [SECRET], now));
    assert.ok(verifyIdentity(signIdentity({ v: 1, e: EMAIL, t: now - POST_CREATOR_COOKIE_MAX_AGE, n: 0 }, SECRET), [SECRET], now));
  });

  test("the epoch must be a whole number, zero or more", () => {
    const now = 1_800_000_000;
    const sign = (n: unknown) => signIdentity({ v: 1, e: EMAIL, t: now, n } as unknown as Parameters<typeof signIdentity>[0], SECRET);
    assert.equal(verifyIdentity(sign(1.5), [SECRET], now), null);
    assert.equal(verifyIdentity(sign(-1), [SECRET], now), null);
    assert.equal(verifyIdentity(sign("1"), [SECRET], now), null);
    assert.equal(verifyIdentity(sign(undefined), [SECRET], now), null);
    assert.equal(verifyIdentity(sign(Number.NaN), [SECRET], now), null);
    assert.equal(verifyIdentity(sign(0), [SECRET], now)?.n, 0);
  });

  test("a Chase Sheet cookie never opens Post Creator, and a Post Creator cookie never opens Chase Sheet", () => {
    const chase = signChaseIdentity(chaseIdentityFor(EMAIL), SECRET);
    assert.ok(verifyChaseIdentity(chase, [SECRET]));
    assert.equal(verifyIdentity(chase, [SECRET]), null);
    const ours = signIdentity(identityFor(EMAIL, 0), SECRET);
    assert.ok(verifyIdentity(ours, [SECRET]));
    assert.equal(verifyChaseIdentity(ours, [SECRET]), null);
  });

  test("cookie options: a year, httpOnly, lax, the whole site; secure only in production; 0 clears it", () => {
    assert.equal(POST_CREATOR_COOKIE, "lfp_post_creator");
    assert.equal(POST_CREATOR_COOKIE_MAX_AGE, 31_536_000);
    const prod = withEnv({ NODE_ENV: "production" }, () => postCreatorCookieOptions());
    assert.deepEqual(prod, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 31_536_000 });
    assert.equal(withEnv({ NODE_ENV: "development" }, () => postCreatorCookieOptions()).secure, false);
    assert.equal(postCreatorCookieOptions(0).maxAge, 0);
  });
});

describe("license key and secrets", () => {
  test("the key is derived, stable, tied to the email, and different from the Chase Sheet key", () => {
    const key = postCreatorLicenseKey(EMAIL, SECRET);
    assert.match(key, /^LFP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(postCreatorLicenseKey("OWNER@example.com", SECRET), key);
    assert.notEqual(key, chaseLicenseKey(EMAIL, SECRET));
    assert.equal(verifyPostCreatorLicenseKey(EMAIL, key.toLowerCase().replace(/-/g, " "), [OTHER, SECRET]), true);
    assert.equal(verifyPostCreatorLicenseKey("other@example.com", key, [SECRET]), false);
    assert.equal(verifyPostCreatorLicenseKey(EMAIL, key, [OTHER]), false);
    assert.equal(verifyPostCreatorLicenseKey(EMAIL, chaseLicenseKey(EMAIL, SECRET), [SECRET]), false, "a Chase key does not open Post Creator");
    assert.equal(verifyChaseLicenseKey(EMAIL, key, [SECRET]), false, "a Post Creator key does not open Chase Sheet");
  });

  test("POST_CREATOR_SECRET signs first; the Pro Kit secrets still verify, so rotation never locks a buyer out", () => {
    const env = { PRO_TOOLS_SECRET: "old-pro-secret", UNSUBSCRIBE_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined };
    withEnv({ ...env, POST_CREATOR_SECRET: " new-own-secret " }, () => {
      assert.deepEqual(postCreatorSecrets(), ["new-own-secret", "old-pro-secret"]);
      const oldKey = postCreatorLicenseKey(EMAIL, "old-pro-secret");
      assert.equal(verifyPostCreatorLicenseKey(EMAIL, oldKey, postCreatorSecrets()), true);
      const oldCookie = signIdentity(identityFor(EMAIL, 0), "old-pro-secret");
      assert.ok(verifyIdentity(oldCookie, postCreatorSecrets()));
    });
    withEnv({ ...env, POST_CREATOR_SECRET: "old-pro-secret" }, () => assert.deepEqual(postCreatorSecrets(), ["old-pro-secret"]));
    withEnv({ ...env, POST_CREATOR_SECRET: "" }, () => assert.deepEqual(postCreatorSecrets(), ["old-pro-secret"]));
  });

  test("rate-limit buckets are sha256 hex, one per purpose and subject, with nothing in the clear", () => {
    const bucket = bucketFor("restore-ip", "203.0.113.9");
    assert.match(bucket, /^[0-9a-f]{64}$/);
    assert.equal(bucket, createHash("sha256").update("post-creator:restore-ip:203.0.113.9").digest("hex"));
    assert.equal(bucketFor("restore-ip", "203.0.113.9"), bucket);
    assert.notEqual(bucketFor("resend-ip", "203.0.113.9"), bucket);
    assert.ok(!bucketFor("resend-email", EMAIL).includes("example"));
  });
});

describe("what a Stripe session may unlock", () => {
  const base = {
    id: "cs_test_abcdefghijklmnop",
    currency: "usd",
    payment_status: "paid",
    customer_details: { email: "Owner@Example.com" },
    customer: "cus_1",
    created: 1_790_000_000,
  };
  const lifetime = { ...base, mode: "payment", amount_total: PRICES.postCreatorLifetime * 100, metadata: { kind: POST_CREATOR.lifetimeKind } };
  const monthly = { ...base, mode: "subscription", subscription: "sub_9", amount_total: PRICES.postCreatorMonthly * 100, metadata: { kind: POST_CREATOR.monthlyKind } };

  test("the one payment plan needs payment mode and its exact amount", () => {
    const ok = purchaseFromSession(lifetime);
    assert.deepEqual(ok, {
      plan: "lifetime",
      kind: POST_CREATOR.lifetimeKind,
      email: EMAIL,
      sessionId: base.id,
      customerId: "cus_1",
      subscriptionId: null,
      createdAt: 1_790_000_000,
    });
    assert.equal(purchaseFromSession({ ...lifetime, amount_total: PRICES.postCreatorMonthly * 100 }), null, "a monthly amount cannot buy the one payment plan");
    assert.equal(purchaseFromSession({ ...lifetime, mode: "subscription" }), null);
  });

  test("the monthly plan needs subscription mode and its amount, and carries the subscription id", () => {
    const ok = purchaseFromSession({ ...monthly, customer: { id: "cus_2" } });
    assert.ok(ok);
    assert.equal(ok.plan, "monthly");
    assert.equal(ok.kind, POST_CREATOR.monthlyKind);
    assert.equal(ok.subscriptionId, "sub_9");
    assert.equal(ok.customerId, "cus_2");
    assert.equal(purchaseFromSession({ ...monthly, mode: "payment" }), null);
    assert.equal(purchaseFromSession({ ...monthly, amount_total: PRICES.postCreatorLifetime * 100 }), null);
    // A promotion code lowers amount_total; the subtotal still proves the plan.
    assert.ok(purchaseFromSession({ ...monthly, amount_total: 1000, amount_subtotal: PRICES.postCreatorMonthly * 100 }));
    assert.equal(purchaseFromSession({ ...monthly, amount_total: 1000, amount_subtotal: 1000 }), null);
  });

  test("anything unpaid, foreign, another product's, or without an email is refused", () => {
    assert.equal(purchaseFromSession({ ...lifetime, payment_status: "unpaid" }), null);
    assert.equal(purchaseFromSession({ ...lifetime, payment_status: "no_payment_required", amount_total: 0 }), null);
    assert.equal(purchaseFromSession({ ...lifetime, currency: "eur" }), null);
    assert.equal(purchaseFromSession({ ...lifetime, metadata: { kind: CHASE_SHEET.lifetimeKind } }), null, "a Chase Sheet session is not a Post Creator purchase");
    assert.equal(purchaseFromSession({ ...lifetime, metadata: { kind: "pro_bundle" } }), null);
    assert.equal(purchaseFromSession({ ...lifetime, metadata: null }), null);
    assert.equal(purchaseFromSession({ ...lifetime, id: "not-a-session" }), null);
    assert.equal(purchaseFromSession({ ...lifetime, customer_details: null, customer_email: "" }), null);
    assert.equal(purchaseFromSession({ ...lifetime, amount_total: "9700" }), null);
  });

  test("the checkout's created time is read only when it is a positive whole number", () => {
    assert.equal(purchaseFromSession({ ...lifetime, created: undefined })?.createdAt, null);
    assert.equal(purchaseFromSession({ ...lifetime, created: "1790000000" })?.createdAt, null);
    assert.equal(purchaseFromSession({ ...lifetime, created: 1.5 })?.createdAt, null);
    assert.equal(purchaseFromSession({ ...lifetime, created: -5 })?.createdAt, null);
    assert.equal(purchaseFromSession({ ...lifetime, customer_details: null, customer_email: "Buyer@Example.com" })?.email, "buyer@example.com");
  });
});

describe("the claim decision", () => {
  const now = 1_800_000_000;
  const base = { createdByThisSession: true, firstClaimedAt: null, sessionCreatedAt: now - 60, now };

  test("only the checkout that created the account signs a browser in, once, within a day", () => {
    assert.equal(claimDecision(base), "sign_in");
    assert.equal(claimDecision({ ...base, createdByThisSession: false }), "existing");
    assert.equal(claimDecision({ ...base, createdByThisSession: false, firstClaimedAt: "2026-09-24T00:00:00Z", sessionCreatedAt: null }), "existing", "existing wins over every other answer");
    assert.equal(claimDecision({ ...base, firstClaimedAt: "2026-09-24T00:00:00Z" }), "used");
    assert.equal(claimDecision({ ...base, sessionCreatedAt: null }), "expired");
  });

  test("the 24 hour edge, and a checkout dated in the future", () => {
    assert.equal(POST_CREATOR.claimWindowHours, 24);
    assert.equal(claimDecision({ ...base, sessionCreatedAt: now - 86_400 }), "sign_in", "exactly a day old still signs in");
    assert.equal(claimDecision({ ...base, sessionCreatedAt: now - 86_401 }), "expired");
    assert.equal(claimDecision({ ...base, sessionCreatedAt: now - 86_401, firstClaimedAt: "2026-09-24T00:00:00Z" }), "expired", "expired is checked before used");
    assert.equal(claimDecision({ ...base, sessionCreatedAt: now + 300 }), "sign_in");
    assert.equal(claimDecision({ ...base, sessionCreatedAt: now + 301 }), "expired");
  });
});

describe("plan decisions", () => {
  const now = new Date("2026-09-24T12:00:00Z");

  test("one payment is entitled while active, locked after a refund", () => {
    assert.deepEqual(decideEntitlement(account({ plan: "lifetime", currentPeriodEnd: null, stripeSubscriptionId: null }), now), { entitled: true, reason: "ok" });
    assert.deepEqual(decideEntitlement(account({ plan: "lifetime", status: "canceled" }), now), { entitled: false, reason: "canceled" });
    assert.deepEqual(decideEntitlement(null, now), { entitled: false, reason: "no_account" });
  });

  test("monthly: active is in, canceled is out, a scheduled cancel keeps access to its date, past due gets seven days", () => {
    assert.equal(decideEntitlement(account(), now).entitled, true);
    assert.equal(decideEntitlement(account({ status: "canceled" }), now).reason, "canceled");
    assert.equal(decideEntitlement(account({ cancelAt: "2026-10-21T00:00:00.000Z" }), now).entitled, true);
    assert.equal(decideEntitlement(account({ cancelAt: "2026-09-01T00:00:00.000Z" }), now).reason, "canceled");
    const missed = account({ status: "past_due", currentPeriodEnd: "2026-09-21T00:00:00.000Z" });
    assert.equal(decideEntitlement(missed, now).entitled, true, "three days into the grace window");
    assert.equal(graceEnd(missed), new Date("2026-09-21T00:00:00.000Z").getTime() + POST_CREATOR.pastDueGraceDays * DAY);
    const expired = account({ status: "past_due", currentPeriodEnd: "2026-09-01T00:00:00.000Z" });
    assert.deepEqual(decideEntitlement(expired, now), { entitled: false, reason: "past_due" });
    assert.equal(decideEntitlement(account({ status: "past_due", currentPeriodEnd: null }), now).entitled, true);
  });

  test("a monthly account whose paid period ended with no newer event looks stale, at most once an hour", () => {
    const ended = { currentPeriodEnd: "2026-09-20T00:00:00.000Z" };
    assert.equal(looksStale(account(), now), false);
    assert.equal(looksStale(account(ended), now), true);
    assert.equal(looksStale(account({ ...ended, stripeSyncedAt: new Date(now.getTime() - 30 * 60_000).toISOString() }), now), false, "checked half an hour ago");
    assert.equal(looksStale(account({ ...ended, stripeSyncedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString() }), now), true, "checked two hours ago");
    assert.equal(looksStale(account({ ...ended, stripeSyncedAt: "not a date" }), now), true);
    assert.equal(looksStale(account({ plan: "lifetime", currentPeriodEnd: "2026-09-01T00:00:00.000Z" }), now), false);
    assert.equal(looksStale(account({ status: "canceled", currentPeriodEnd: "2026-09-01T00:00:00.000Z" }), now), false);
    assert.equal(looksStale(account({ ...ended, stripeSubscriptionId: null }), now), false);
    assert.equal(looksStale(account({ currentPeriodEnd: null, createdAt: "2026-07-01T00:00:00.000Z" }), now), true, "no period recorded after five weeks");
  });

  test("Stripe statuses fold into three account states", () => {
    assert.equal(statusFromStripe({ status: "active" }), "active");
    assert.equal(statusFromStripe({ status: "trialing" }), "active");
    assert.equal(statusFromStripe({ status: "past_due" }), "past_due");
    assert.equal(statusFromStripe({ status: "unpaid" }), "past_due");
    assert.equal(statusFromStripe({ status: "canceled" }), "canceled");
    assert.equal(statusFromStripe({ status: "incomplete" }), "canceled");
  });

  test("the browser never sees Stripe ids, and past due shows when the grace window ends", () => {
    const view = accountView(account());
    assert.deepEqual(Object.keys(view).sort(), ["canManageBilling", "email", "endsOn", "graceEndsOn", "plan", "renewsOn", "status"]);
    assert.ok(!JSON.stringify(view).includes("cus_1") && !JSON.stringify(view).includes("sub_1"));
    assert.equal(view.canManageBilling, true);
    assert.equal(view.renewsOn, "2026-10-21T00:00:00.000Z");
    assert.equal(view.graceEndsOn, null);
    assert.equal(accountView(account({ plan: "lifetime" })).canManageBilling, false);
    assert.equal(accountView(account({ stripeCustomerId: null })).canManageBilling, false);
    assert.equal(accountView(account({ stripeCustomerId: "not-a-customer" })).canManageBilling, false);
    assert.equal(accountView(account({ cancelAt: "2026-10-21T00:00:00.000Z" })).renewsOn, null);
    assert.equal(accountView(account({ cancelAt: "2026-10-21T00:00:00.000Z" })).endsOn, "2026-10-21T00:00:00.000Z");
    assert.equal(accountView(account({ status: "canceled" })).endsOn, "2026-10-21T00:00:00.000Z");
    const pastDue = accountView(account({ status: "past_due", currentPeriodEnd: "2026-09-21T00:00:00.000Z" }));
    assert.equal(pastDue.graceEndsOn, "2026-09-28T00:00:00.000Z");
    assert.equal(accountView(account({ plan: "lifetime", status: "past_due" })).graceEndsOn, null);
  });
});

describe("the Chicago calendar and the AI allowance", () => {
  const parts = (iso: string) => chicagoParts(new Date(iso));

  test("the day turns at Chicago midnight, not UTC midnight", () => {
    assert.deepEqual(parts("2026-09-25T00:30:00Z"), { day: "2026-09-24", month: "2026-09", nextMonthStart: "2026-10-01" });
    assert.equal(parts("2026-09-25T04:59:59Z").day, "2026-09-24");
    assert.equal(parts("2026-09-25T05:00:00Z").day, "2026-09-25");
  });

  test("both daylight saving changes move Chicago midnight by an hour", () => {
    // March 8, 2026: midnight is still CST (06:00Z); the next midnight is CDT (05:00Z).
    assert.equal(parts("2026-03-08T05:59:59Z").day, "2026-03-07");
    assert.equal(parts("2026-03-08T06:00:00Z").day, "2026-03-08");
    assert.equal(parts("2026-03-08T08:00:00Z").day, "2026-03-08");
    assert.equal(parts("2026-03-09T04:59:59Z").day, "2026-03-08");
    assert.equal(parts("2026-03-09T05:00:00Z").day, "2026-03-09");
    // November 1, 2026: midnight is still CDT (05:00Z); the next midnight is CST (06:00Z).
    assert.deepEqual(parts("2026-11-01T04:59:59Z"), { day: "2026-10-31", month: "2026-10", nextMonthStart: "2026-11-01" });
    assert.equal(parts("2026-11-01T05:00:00Z").day, "2026-11-01");
    assert.equal(parts("2026-11-02T05:59:59Z").day, "2026-11-01");
    assert.equal(parts("2026-11-02T06:00:00Z").day, "2026-11-02");
  });

  test("month and year ends", () => {
    assert.deepEqual(parts("2026-10-01T04:59:59Z"), { day: "2026-09-30", month: "2026-09", nextMonthStart: "2026-10-01" });
    assert.deepEqual(parts("2026-10-01T05:00:00Z"), { day: "2026-10-01", month: "2026-10", nextMonthStart: "2026-11-01" });
    assert.deepEqual(parts("2027-01-01T05:59:59Z"), { day: "2026-12-31", month: "2026-12", nextMonthStart: "2027-01-01" });
    assert.deepEqual(parts("2027-01-01T06:00:00Z"), { day: "2027-01-01", month: "2027-01", nextMonthStart: "2027-02-01" });
    assert.deepEqual(parts("2028-02-29T12:00:00Z"), { day: "2028-02-29", month: "2028-02", nextMonthStart: "2028-03-01" });
  });

  test("labels and seasons", () => {
    assert.equal(monthDayLabel("2026-10-01"), "October 1");
    assert.equal(monthDayLabel("2027-01-15"), "January 15");
    assert.equal(monthDayLabel("2026-12-31T00:00:00Z"), "December 31");
    assert.equal(monthDayLabel("soon"), "soon");
    assert.equal(monthDayLabel("2026-13-01"), "2026-13-01");
    assert.deepEqual([12, 1, 2].map(seasonForMonth), ["winter", "winter", "winter"]);
    assert.deepEqual([3, 4, 5].map(seasonForMonth), ["spring", "spring", "spring"]);
    assert.deepEqual([6, 7, 8].map(seasonForMonth), ["summer", "summer", "summer"]);
    assert.deepEqual([9, 10, 11].map(seasonForMonth), ["fall", "fall", "fall"]);
  });

  test("the allowance: what is left today never exceeds what is left this month, and nothing goes below zero", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    const counts = { day: "2026-09-24", month: "2026-09", usedDay: 3, usedMonth: 40, triesDay: 5, triesMonth: 44 };
    assert.deepEqual(allowanceView("monthly", counts, now), {
      plan: "monthly",
      perDay: 20,
      perMonth: 100,
      usedToday: 3,
      usedThisMonth: 40,
      leftToday: 17,
      leftThisMonth: 60,
      triesLeftToday: 20,
      resetsMonthOn: "2026-10-01",
    });
    const nearEnd = allowanceView("monthly", { ...counts, usedDay: 2, usedMonth: 95 }, now);
    assert.equal(nearEnd.leftThisMonth, 5);
    assert.equal(nearEnd.leftToday, 5);
    const over = allowanceView("monthly", { ...counts, usedDay: 25, usedMonth: 120, triesDay: 40 }, now);
    assert.equal(over.leftThisMonth, 0);
    assert.equal(over.leftToday, 0);
    assert.equal(over.triesLeftToday, 0);
    const lifetime = allowanceView("lifetime", { ...counts, usedDay: 0, usedMonth: 0, triesDay: 0 }, now);
    assert.equal(lifetime.perDay, POST_CREATOR.ai.lifetime.perDay);
    assert.equal(lifetime.perMonth, POST_CREATOR.ai.lifetime.perMonth);
    assert.equal(lifetime.leftToday, 10);
    assert.equal(lifetime.triesLeftToday, 15);
    assert.equal(allowanceView("monthly", counts, new Date("2026-10-01T04:00:00Z")).resetsMonthOn, "2026-10-01", "still September in Chicago");
  });
});

/* --------------------------- server plumbing (vm) --------------------------- */

// The route tests load lib/postCreator/server.ts through a vm harness that
// resolves "./x" to "x.ts" and stubs server-only, next/headers, supabase-js,
// and "../proAccess". This runs the same shape, so a server-side import that
// the harness cannot load fails here first.

type Row = Record<string, unknown>;
type Loaded = Record<string, any>;

const nativeRequire = createRequire(import.meta.url);
const ORIGIN = "https://www.theleadflowpro.com";
const SIGNER = "post-creator-test-signer";

function row(over: Row = {}): Row {
  return {
    email: EMAIL,
    plan: "monthly",
    status: "active",
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    first_session_id: "cs_test_abcdefghijkl",
    last_session_id: "cs_test_abcdefghijkl",
    first_claimed_at: null,
    access_epoch: 0,
    current_period_end: new Date(Date.now() + 10 * DAY).toISOString(),
    cancel_at: null,
    stripe_event_at: 100,
    stripe_synced_at: null,
    profile: {},
    created_at: new Date(Date.now() - 20 * DAY).toISOString(),
    ...over,
  };
}

function harness(options: { cookie?: string; rows?: Row[]; env?: Record<string, string | undefined>; stripe?: unknown; failStripe?: boolean; failDb?: boolean } = {}) {
  const rows = options.rows ?? [];
  const fetches: string[] = [];
  const modules = new Map<string, { exports: Loaded }>();
  function query(table: string) {
    if (table !== "post_creator_accounts") throw new Error(`unexpected table ${table}`);
    let filtered = rows;
    const chain = {
      select: () => chain,
      eq: (col: string, value: unknown) => {
        filtered = filtered.filter((r) => r[col] === value);
        return chain;
      },
      maybeSingle: async () =>
        options.failDb ? { data: null, error: { message: "database down" } } : { data: filtered[0] ? { ...filtered[0] } : null, error: null },
      update: (patch: Row) => ({
        eq: async (col: string, value: unknown) => {
          for (const r of rows) if (r[col] === value) Object.assign(r, patch);
          return { error: null };
        },
      }),
    };
    return chain;
  }
  const fakeDb = { from: query, rpc: async () => ({ data: null, error: { message: "no rpc here" } }) };
  const stubs: Record<string, unknown> = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: (name: string) => (name === POST_CREATOR_COOKIE && options.cookie ? { value: options.cookie } : undefined) }) },
    "@supabase/supabase-js": { createClient: () => fakeDb },
    "../proAccess": proAccess,
  };
  const env = {
    NODE_ENV: "production",
    POST_CREATOR_SECRET: SIGNER,
    SUPABASE_SERVICE_ROLE_KEY: "service-role-test-only",
    STRIPE_SECRET_KEY: "sk_test_local_mock_only",
    ...options.env,
  };
  function load(file: string): Loaded {
    const full = path.resolve(file);
    const cached = modules.get(full);
    if (cached) return cached.exports;
    const loaded = { exports: {} as Loaded };
    modules.set(full, loaded);
    const code = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name: string) => {
      if (name in stubs) return stubs[name];
      if (name.startsWith("@/")) return load(path.join(process.cwd(), `${name.slice(2)}.ts`));
      if (name.startsWith(".")) return load(path.resolve(path.dirname(full), `${name}.ts`));
      return nativeRequire(name);
    };
    const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
      Buffer,
      URL,
      URLSearchParams,
      Request,
      Response,
      Headers,
      AbortSignal,
      TextEncoder,
      TextDecoder,
      setTimeout,
      console,
      process: { env },
      fetch: async (url: string) => {
        fetches.push(url);
        if (options.failStripe) throw new Error("simulated upstream outage");
        return Response.json(options.stripe ?? { id: "sub_1", status: "active" });
      },
    });
    run(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return { server: load("lib/postCreator/server.ts"), entitlement: load("lib/postCreator/accessServer.ts"), rows, fetches };
}

const cookieFor = (epoch: number, email = EMAIL) => signIdentity(identityFor(email, epoch), SIGNER);

async function errorOf(res: Response) {
  return (await res.json()) as { ok: boolean; code: string; error: string; field?: string };
}

describe("getEntitlement and requirePostCreator", () => {
  test("a visitor gets 401, a signed-in active buyer gets through with the database client", async () => {
    const visitor = harness({ rows: [row()] });
    assert.equal((await visitor.entitlement.getEntitlement()).reason, "visitor");
    const denied = await visitor.server.requirePostCreator();
    assert.equal(visitor.server.isResponse(denied), true);
    assert.equal(denied.status, 401);
    assert.equal((await errorOf(denied)).code, "unauthorized");

    const buyer = harness({ rows: [row()], cookie: cookieFor(0) });
    const ok = await buyer.server.requirePostCreator();
    assert.equal(buyer.server.isResponse(ok), false);
    assert.equal(ok.email, EMAIL);
    assert.equal(ok.account.accessEpoch, 0);
    assert.equal(ok.entitlement.reason, "ok");
    assert.ok(ok.client);
  });

  test("a cookie from before a later checkout is signed out, with no email and no account", async () => {
    const h = harness({ rows: [row({ access_epoch: 1 })], cookie: cookieFor(0) });
    assert.deepEqual({ ...(await h.entitlement.getEntitlement()) }, { email: null, account: null, entitled: false, reason: "signed_out" });
    const res = await h.server.requirePostCreator({ allowLapsed: true });
    assert.equal(res.status, 401);
    assert.match((await errorOf(res)).error, /signed out on this device/);
    const current = harness({ rows: [row({ access_epoch: 1 })], cookie: cookieFor(1) });
    assert.equal((await current.entitlement.getEntitlement()).reason, "ok");
  });

  test("a lapsed plan is 402 unless the route allows lapsed accounts", async () => {
    const h = harness({ rows: [row({ status: "canceled" })], cookie: cookieFor(0) });
    const res = await h.server.requirePostCreator();
    assert.equal(res.status, 402);
    assert.equal((await errorOf(res)).code, "lapsed");
    const lapsed = await h.server.requirePostCreator({ allowLapsed: true });
    assert.equal(h.server.isResponse(lapsed), false);
    assert.equal(lapsed.entitlement.entitled, false);
    assert.equal(lapsed.entitlement.reason, "canceled");
  });

  test("no service key is 503; no account row is 401; a database error is a 500 with no detail", async () => {
    const off = harness({ rows: [row()], cookie: cookieFor(0), env: { SUPABASE_SERVICE_ROLE_KEY: undefined } });
    assert.equal((await off.entitlement.getEntitlement()).reason, "unconfigured");
    const offRes = await off.server.requirePostCreator();
    assert.equal(offRes.status, 503);
    assert.equal((await errorOf(offRes)).code, "unconfigured");

    const gone = harness({ rows: [], cookie: cookieFor(0) });
    assert.equal((await gone.entitlement.getEntitlement()).reason, "no_account");
    assert.equal((await gone.server.requirePostCreator()).status, 401);

    const broken = harness({ rows: [row()], cookie: cookieFor(0), failDb: true });
    const originalError = console.error;
    console.error = () => undefined;
    try {
      const res = await broken.server.requirePostCreator();
      assert.equal(res.status, 500);
      const body = await errorOf(res);
      assert.equal(body.code, "server_error");
      assert.ok(!body.error.includes("database down"));
    } finally {
      console.error = originalError;
    }
  });

  test("a stale monthly account asks Stripe once, stamps the check, and waits an hour before asking again", async () => {
    const ended = new Date(Date.now() - 3 * DAY).toISOString();
    const renewed = Math.floor((Date.now() + 27 * DAY) / 1000);
    const h = harness({ rows: [row({ current_period_end: ended })], cookie: cookieFor(0), stripe: { id: "sub_1", status: "active", current_period_end: renewed } });
    const first = await h.entitlement.getEntitlement();
    assert.equal(first.reason, "ok");
    assert.deepEqual(h.fetches, ["https://api.stripe.com/v1/subscriptions/sub_1"]);
    assert.equal(h.rows[0].current_period_end, new Date(renewed * 1000).toISOString());
    assert.equal(typeof h.rows[0].stripe_synced_at, "string");
    await h.entitlement.getEntitlement();
    assert.equal(h.fetches.length, 1, "not stale any more");

    const canceled = harness({ rows: [row({ current_period_end: ended })], cookie: cookieFor(0), stripe: { id: "sub_1", status: "canceled" } });
    assert.equal((await canceled.entitlement.getEntitlement()).reason, "canceled");
  });

  test("a failing Stripe still stamps the check, so it is not asked on every request", async () => {
    const ended = new Date(Date.now() - 3 * DAY).toISOString();
    const h = harness({ rows: [row({ current_period_end: ended })], cookie: cookieFor(0), failStripe: true });
    assert.equal((await h.entitlement.getEntitlement()).reason, "ok");
    assert.equal(typeof h.rows[0].stripe_synced_at, "string");
    await h.entitlement.getEntitlement();
    assert.equal(h.fetches.length, 1);
    const noKey = harness({ rows: [row({ current_period_end: ended })], cookie: cookieFor(0), env: { STRIPE_SECRET_KEY: undefined } });
    await noKey.entitlement.getEntitlement();
    assert.equal(noKey.fetches.length, 0);
  });
});

describe("route plumbing", () => {
  const { server } = harness();
  const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
    new Request(`${ORIGIN}/api/post-creator/test`, { method: "POST", headers: { "Content-Type": "application/json", origin: ORIGIN, ...headers }, body });

  test("answers are private, no-store, and noindex; errors have one shape", async () => {
    const res = server.json({ ok: true });
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
    assert.equal(res.headers.get("x-robots-tag"), "noindex");
    const err = server.apiError("bad_request", "Pick your trade from the list.", 400, { field: "trade" });
    assert.equal(err.status, 400);
    assert.deepEqual(await err.json(), { ok: false, code: "bad_request", error: "Pick your trade from the list.", field: "trade" });
    assert.deepEqual(await server.apiError("busy", "Still writing.", 409).json(), { ok: false, code: "busy", error: "Still writing." });
  });

  test("sameOrigin needs this site's own Origin header", () => {
    assert.equal(server.sameOrigin(post("{}")), true);
    assert.equal(server.sameOrigin(post("{}", { origin: "https://evil.example" })), false);
    assert.equal(server.sameOrigin(post("{}", { origin: "null" })), false);
    assert.equal(server.sameOrigin(new Request(`${ORIGIN}/api/post-creator/test`, { method: "POST", body: "{}" })), false);
  });

  test("readBody takes a JSON object under the limit and throws 400 or 413 otherwise", async () => {
    // Spread into this realm: the harness builds its objects in the vm context.
    assert.deepEqual({ ...(await server.readBody(post(JSON.stringify({ email: EMAIL })), 4000)) }, { email: EMAIL });
    assert.deepEqual({ ...(await server.readBody(post(null), 4000)) }, {});
    assert.deepEqual({ ...(await server.readBody(post(""), 4000)) }, {});
    const statusOf = async (req: Request, max: number) => {
      try {
        await server.readBody(req, max);
        return 0;
      } catch (error) {
        assert.ok(error instanceof server.BodyError);
        return (error as { status: number }).status;
      }
    };
    assert.equal(await statusOf(post(JSON.stringify({ note: "x".repeat(5000) })), 4000), 413);
    assert.equal(await statusOf(post("{}", { "content-length": "999999" }), 4000), 413);
    const streamed = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 10; i++) controller.enqueue(new TextEncoder().encode(`"${"y".repeat(1000)}"`));
        controller.close();
      },
    });
    const chunked = new Request(`${ORIGIN}/x`, { method: "POST", headers: { origin: ORIGIN }, body: streamed, duplex: "half" } as RequestInit);
    assert.equal(await statusOf(chunked, 4000), 413, "the stream is counted, not the header");
    assert.equal(await statusOf(post("{not json"), 4000), 400);
    assert.equal(await statusOf(post("[1,2]"), 4000), 400);
    assert.equal(await statusOf(post("42"), 4000), 400);
    assert.equal(await statusOf(post(new Uint8Array([0x7b, 0xff, 0x7d])), 4000), 400);
  });

  test("ipOf is the first forwarded address, clipped, or unknown", () => {
    assert.equal(server.ipOf(post("{}", { "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" })), "203.0.113.9");
    assert.equal(server.ipOf(post("{}", { "x-forwarded-for": "a".repeat(100) })), "a".repeat(64));
    assert.equal(server.ipOf(post("{}")), "unknown");
  });

  test("the identity cookie is set at the account's epoch, and cleared", async () => {
    const res = server.withIdentityCookie(server.json({ ok: true }), "Owner@Example.com", 4);
    const value = res.cookies.get(POST_CREATOR_COOKIE)?.value;
    const identity = verifyIdentity(value, [SIGNER]);
    assert.ok(identity);
    assert.equal(identity.e, EMAIL);
    assert.equal(identity.n, 4);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=lax/i);
    assert.match(setCookie, /Secure/i);
    const cleared = server.withClearedCookie(server.json({ ok: true }));
    assert.match(cleared.headers.get("set-cookie") ?? "", /lfp_post_creator=;.*Max-Age=0/i);
  });
});

// Post Creator's data layer against a fake Supabase client.
//
// The rules that must hold under concurrency live in the database functions;
// these tests pin what the code sends them (the exact p_* names the migration
// declares) and how it reads their answers, including every reserve result.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  claimFirstCookie,
  findAccountByStripe,
  getAccount,
  hasOtherPaidPurchase,
  hitRateLimit,
  markSynced,
  parseAccount,
  recordPurchase,
  reserveGeneration,
  saveProfile,
  serviceDb,
  setMoneyBack,
  settleGeneration,
  updatePlan,
  usageCounts,
  type Db,
} from "../lib/postCreator/db.ts";
import { EMPTY_PROFILE } from "../lib/postCreator/profile.ts";
import type { ReserveInput, SettleInput } from "../lib/postCreator/types.ts";

type Row = Record<string, unknown>;
type Result = { data?: unknown; error?: { message?: string; code?: string } | null };
type Call = { method: string; args: unknown[] };

/**
 * A client whose query chain records every call and resolves to `from`, and
 * whose rpc records its name and arguments and answers with `rpc`.
 */
function fakeDb(answers: { from?: Result; rpc?: (name: string, args: Row) => Result } = {}) {
  const calls: Call[] = [];
  const rpcCalls: { name: string; args: Row }[] = [];
  const result = () => ({ data: null, error: null, ...answers.from });
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "lte", "is", "update", "limit"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.maybeSingle = async () => {
    calls.push({ method: "maybeSingle", args: [] });
    return result();
  };
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject);
  const client = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return chain;
    },
    rpc: async (name: string, args: Row) => {
      rpcCalls.push({ name, args });
      return { data: null, error: null, ...answers.rpc?.(name, args) };
    },
  };
  return { client: client as unknown as Db, calls, rpcCalls };
}

const row = (over: Row = {}): Row => ({
  email: "owner@example.com",
  plan: "lifetime",
  status: "active",
  stripe_customer_id: "cus_1",
  stripe_subscription_id: null,
  first_session_id: "cs_test_abcdefghijkl",
  last_session_id: "cs_test_mnopqrstuvwx",
  first_claimed_at: null,
  access_epoch: 2,
  current_period_end: null,
  cancel_at: null,
  stripe_event_at: 1_790_000_000,
  stripe_synced_at: null,
  profile: { businessName: "Piney Woods Plumbing", trade: "plumbing" },
  created_at: "2026-09-24T15:00:00.123456+00:00",
  ...over,
});

const DB_ERROR = { message: "boom", code: "XX000" };

describe("accounts", () => {
  test("serviceDb needs the service role key", () => {
    const saved = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "  ";
    try {
      assert.equal(serviceDb(), null);
    } finally {
      if (saved === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = saved;
    }
  });

  test("parseAccount reads every column and falls back safely on junk", () => {
    const account = parseAccount(row());
    assert.equal(account.plan, "lifetime");
    assert.equal(account.firstSessionId, "cs_test_abcdefghijkl");
    assert.equal(account.lastSessionId, "cs_test_mnopqrstuvwx");
    assert.equal(account.firstClaimedAt, null);
    assert.equal(account.accessEpoch, 2);
    assert.equal(account.stripeEventAt, 1_790_000_000);
    assert.equal(account.stripeSubscriptionId, null);
    assert.equal(account.profile.businessName, "Piney Woods Plumbing");
    assert.equal(account.profile.trade, "plumbing");
    assert.deepEqual(Object.keys(account.profile).sort(), Object.keys(EMPTY_PROFILE).sort());
    const junk = parseAccount({ email: "x@example.com", plan: "gold", status: "weird", access_epoch: "many", profile: "not an object" });
    assert.equal(junk.plan, "monthly");
    assert.equal(junk.status, "active");
    assert.equal(junk.accessEpoch, 0);
    assert.equal(junk.firstSessionId, "");
    assert.deepEqual(junk.profile, EMPTY_PROFILE);
    assert.equal(parseAccount(row({ access_epoch: -1 })).accessEpoch, 0);
    assert.equal(parseAccount(row({ access_epoch: 1.5 })).accessEpoch, 0);
    const later = parseAccount(
      row({
        past_due_since: "2026-10-01T15:00:00+00:00",
        money_back_at: "2026-10-02T15:00:00+00:00",
        replaced_subscription_id: "sub_old",
        monthly_until: "2026-10-15T00:00:00+00:00",
      }),
    );
    assert.equal(later.pastDueSince, "2026-10-01T15:00:00+00:00");
    assert.equal(later.moneyBackAt, "2026-10-02T15:00:00+00:00");
    assert.equal(later.replacedSubscriptionId, "sub_old");
    assert.equal(later.monthlyUntil, "2026-10-15T00:00:00+00:00");
    for (const k of ["pastDueSince", "moneyBackAt", "replacedSubscriptionId", "monthlyUntil"] as const) assert.equal(junk[k], null, k);
    // key_version: 0 when the column is not there yet, the value when it is,
    // and -1 (which no key derives from) when it cannot be read.
    assert.equal(account.keyVersion, 0);
    assert.equal(parseAccount(row({ key_version: 3 })).keyVersion, 3);
    for (const bad of [-2, 1.5, "many"]) assert.equal(parseAccount(row({ key_version: bad })).keyVersion, -1, String(bad));
  });

  test("getAccount and findAccountByStripe filter by one column; a miss is null; an error throws", async () => {
    const found = fakeDb({ from: { data: row() } });
    assert.equal((await getAccount(found.client, "owner@example.com"))?.email, "owner@example.com");
    assert.deepEqual(found.calls.map((c) => c.method), ["from", "select", "eq", "maybeSingle"]);
    assert.deepEqual(found.calls[0].args, ["post_creator_accounts"]);
    assert.deepEqual(found.calls[2].args, ["email", "owner@example.com"]);
    assert.equal(await getAccount(fakeDb().client, "nobody@example.com"), null);
    await assert.rejects(getAccount(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com"), /getAccount: XX000 boom/);
    const bySub = fakeDb({ from: { data: row() } });
    await findAccountByStripe(bySub.client, "stripe_subscription_id", "sub_1");
    assert.deepEqual(bySub.calls.find((c) => c.method === "eq")?.args, ["stripe_subscription_id", "sub_1"]);
  });

  test("recordPurchase sends exactly the p_* arguments the migration declares and maps the answer", async () => {
    const h = fakeDb({ rpc: () => ({ data: { created: false, created_by_this_session: true, account: row() } }) });
    const out = await recordPurchase(h.client, {
      email: "owner@example.com",
      plan: "lifetime",
      sessionId: "cs_test_abcdefghijkl",
      customerId: "cus_1",
      subscriptionId: null,
      eventAt: 1_790_000_000,
    });
    assert.equal(h.rpcCalls.length, 1);
    assert.equal(h.rpcCalls[0].name, "post_creator_record_purchase");
    assert.deepEqual(h.rpcCalls[0].args, {
      p_email: "owner@example.com",
      p_plan: "lifetime",
      p_session_id: "cs_test_abcdefghijkl",
      p_customer_id: "cus_1",
      p_subscription_id: null,
      p_event_at: 1_790_000_000,
    });
    assert.equal(out.created, false);
    assert.equal(out.createdByThisSession, true);
    assert.equal(out.account?.accessEpoch, 2);

    const other = fakeDb({ rpc: () => ({ data: { created: true, created_by_this_session: false, account: row() } }) });
    const second = await recordPurchase(other.client, { email: "owner@example.com", plan: "monthly", sessionId: "cs_test_zzzzzzzzzzzz", customerId: null, subscriptionId: "sub_2", eventAt: 1 });
    assert.equal(second.created, true);
    assert.equal(second.createdByThisSession, false);
    const loose = fakeDb({ rpc: () => ({ data: { created: "true", created_by_this_session: 1, account: row() } }) });
    const looseOut = await recordPurchase(loose.client, { email: "owner@example.com", plan: "monthly", sessionId: "cs_test_zzzzzzzzzzzz", customerId: null, subscriptionId: null, eventAt: 1 });
    assert.equal(looseOut.createdByThisSession, false, "only a real true signs a browser in");
    assert.equal(looseOut.created, false);
  });

  test("recordPurchase throws on a database error or an answer with no account", async () => {
    const input = { email: "owner@example.com", plan: "monthly" as const, sessionId: "cs_test_abcdefghijkl", customerId: null, subscriptionId: null, eventAt: 1 };
    await assert.rejects(recordPurchase(fakeDb({ rpc: () => ({ error: { message: "post_creator_invalid_purchase" } }) }).client, input), /post_creator_invalid_purchase/);
    await assert.rejects(recordPurchase(fakeDb({ rpc: () => ({ data: { created: true } }) }).client, input), /no account/);
    await assert.rejects(recordPurchase(fakeDb({ rpc: () => ({ data: null }) }).client, input), /no account/);
  });

  test("recordPurchase says so when a checkout applied before finds its account deleted on request", async () => {
    const input = { email: "owner@example.com", plan: "monthly" as const, sessionId: "cs_test_abcdefghijkl", customerId: null, subscriptionId: null, eventAt: 1 };
    const gone = fakeDb({ rpc: () => ({ data: { created: false, created_by_this_session: false, account: null } }) });
    assert.deepEqual(await recordPurchase(gone.client, input), { account: null, created: false, createdByThisSession: false });
  });

  test("claimFirstCookie claims once: only the creating session, never claimed, no later checkout", async () => {
    const now = new Date("2026-09-24T15:00:00.000Z");
    const h = fakeDb({ from: { data: [{ access_epoch: 0 }] } });
    assert.equal(await claimFirstCookie(h.client, "owner@example.com", "cs_test_abcdefghijkl", now), 0);
    assert.deepEqual(h.calls, [
      { method: "from", args: ["post_creator_accounts"] },
      { method: "update", args: [{ first_claimed_at: "2026-09-24T15:00:00.000Z" }] },
      { method: "eq", args: ["email", "owner@example.com"] },
      { method: "eq", args: ["first_session_id", "cs_test_abcdefghijkl"] },
      // No later checkout applied. Epochs come from a sequence, so the first one is not 0.
      { method: "eq", args: ["last_session_id", "cs_test_abcdefghijkl"] },
      { method: "is", args: ["first_claimed_at", null] },
      { method: "select", args: ["access_epoch"] },
    ]);
    assert.equal(await claimFirstCookie(fakeDb({ from: { data: [] } }).client, "owner@example.com", "cs_test_abcdefghijkl", now), null, "already claimed, or not this session");
    assert.equal(await claimFirstCookie(fakeDb({ from: { data: null } }).client, "owner@example.com", "cs_test_abcdefghijkl", now), null);
    assert.equal(await claimFirstCookie(fakeDb({ from: { data: [{ access_epoch: 0 }, { access_epoch: 0 }] } }).client, "owner@example.com", "cs_test_abcdefghijkl", now), null);
    assert.equal(await claimFirstCookie(fakeDb({ from: { data: [{ access_epoch: "x" }] } }).client, "owner@example.com", "cs_test_abcdefghijkl", now), null);
    await assert.rejects(claimFirstCookie(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com", "cs_test_abcdefghijkl", now), /claimFirstCookie/);
  });

  test("updatePlan, setMoneyBack, markSynced, and saveProfile write only their own columns, filtered by email", async () => {
    const plan = fakeDb();
    await updatePlan(plan.client, "owner@example.com", {
      status: "past_due",
      currentPeriodEnd: "2026-10-21T00:00:00.000Z",
      cancelAt: null,
      pastDueSince: "2026-09-21T00:00:00.000Z",
      eventAt: 200,
    });
    assert.deepEqual(plan.calls.find((c) => c.method === "update")?.args, [
      { status: "past_due", current_period_end: "2026-10-21T00:00:00.000Z", cancel_at: null, past_due_since: "2026-09-21T00:00:00.000Z", stripe_event_at: 200 },
    ]);
    assert.deepEqual(plan.calls.find((c) => c.method === "eq")?.args, ["email", "owner@example.com"]);
    // The ordering check is in the write: a row already at a newer event matches nothing.
    assert.deepEqual(plan.calls.find((c) => c.method === "lte")?.args, ["stripe_event_at", 200]);
    const withIds = fakeDb();
    await updatePlan(withIds.client, "owner@example.com", { status: "active", currentPeriodEnd: null, cancelAt: null, pastDueSince: null, eventAt: 1, subscriptionId: "sub_2", customerId: null });
    assert.deepEqual(Object.keys(withIds.calls.find((c) => c.method === "update")?.args[0] as Row).sort(), [
      "cancel_at",
      "current_period_end",
      "past_due_since",
      "status",
      "stripe_customer_id",
      "stripe_event_at",
      "stripe_subscription_id",
    ]);

    const closed = fakeDb();
    const at = new Date("2026-10-02T15:00:00.000Z");
    await setMoneyBack(closed.client, "owner@example.com", { closed: true, at, eventAt: 1_791_000_000 });
    assert.deepEqual(closed.calls.find((c) => c.method === "update")?.args, [
      { status: "canceled", money_back_at: "2026-10-02T15:00:00.000Z", stripe_event_at: 1_791_000_000 },
    ]);
    const reopened = fakeDb();
    await setMoneyBack(reopened.client, "owner@example.com", { closed: false, at, eventAt: 1 });
    assert.deepEqual(reopened.calls.find((c) => c.method === "update")?.args, [{ status: "active", money_back_at: null }]);

    const synced = fakeDb();
    await markSynced(synced.client, "owner@example.com", new Date("2026-09-24T15:00:00.000Z"));
    assert.deepEqual(synced.calls.find((c) => c.method === "update")?.args, [{ stripe_synced_at: "2026-09-24T15:00:00.000Z" }]);

    const profile = fakeDb();
    const saved = await saveProfile(profile.client, "owner@example.com", { ...EMPTY_PROFILE, businessName: "  <b>Piney Woods</b> Plumbing ", services: ["Drains", "drains", "Water heaters"] });
    assert.equal(saved.businessName, "Piney Woods Plumbing");
    assert.deepEqual(saved.services, ["Drains", "Water heaters"]);
    assert.deepEqual(profile.calls.find((c) => c.method === "update")?.args, [{ profile: saved }]);

    await assert.rejects(setMoneyBack(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com", { closed: true, at, eventAt: 1 }), /setMoneyBack/);
    await assert.rejects(markSynced(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com"), /markSynced/);
    await assert.rejects(updatePlan(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com", { status: "active", currentPeriodEnd: null, cancelAt: null, pastDueSince: null, eventAt: 1 }), /updatePlan/);
    await assert.rejects(saveProfile(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com", EMPTY_PROFILE), /saveProfile/);
  });

  test("hasOtherPaidPurchase looks for another paid purchase of the same kind on the same email", async () => {
    const found = fakeDb({ from: { data: [{ stripe_session_id: "cs_test_other_one" }] } });
    assert.equal(await hasOtherPaidPurchase(found.client, "owner@example.com", "post_creator_lifetime", "cs_test_refunded"), true);
    assert.deepEqual(found.calls, [
      { method: "from", args: ["purchases"] },
      { method: "select", args: ["stripe_session_id"] },
      { method: "eq", args: ["email", "owner@example.com"] },
      { method: "eq", args: ["kind", "post_creator_lifetime"] },
      { method: "eq", args: ["status", "paid"] },
      { method: "neq", args: ["stripe_session_id", "cs_test_refunded"] },
      { method: "limit", args: [1] },
    ]);
    assert.equal(await hasOtherPaidPurchase(fakeDb({ from: { data: [] } }).client, "owner@example.com", "post_creator_lifetime", "cs_x"), false);
    await assert.rejects(hasOtherPaidPurchase(fakeDb({ from: { error: DB_ERROR } }).client, "owner@example.com", "k", "cs_x"), /hasOtherPaidPurchase/);
  });
});

describe("AI metering", () => {
  const reserveInput: ReserveInput = {
    email: "owner@example.com",
    requestId: "0b7c9c3e-4f1a-4c2b-9d8e-123456789abc",
    platforms: 3,
    perDay: 20,
    perMonth: 100,
    triesPerDay: 25,
    triesPerMonth: 120,
    accountMonthCapMicro: 15_000_000,
    reserveMicro: 307_500,
    capMicro: 10_000_000,
    model: "claude-opus-5",
  };
  const countsJson = { used_day: 4, used_month: 31, tries_day: 5, tries_month: 33, day: "2026-09-24", month: "2026-09" };
  const counts = { day: "2026-09-24", month: "2026-09", usedDay: 4, usedMonth: 31, triesDay: 5, triesMonth: 33 };
  const reserveWith = (data: unknown) => {
    const h = fakeDb({ rpc: () => ({ data }) });
    return { h, run: () => reserveGeneration(h.client, reserveInput) };
  };

  test("reserveGeneration sends exactly the p_* arguments the migration declares", async () => {
    const { h, run } = reserveWith({ result: "busy" });
    await run();
    assert.equal(h.rpcCalls[0].name, "post_creator_reserve");
    assert.deepEqual(h.rpcCalls[0].args, {
      p_email: "owner@example.com",
      p_request_id: "0b7c9c3e-4f1a-4c2b-9d8e-123456789abc",
      p_platforms: 3,
      p_per_day: 20,
      p_per_month: 100,
      p_tries_per_day: 25,
      p_tries_per_month: 120,
      p_account_month_cap_micro: 15_000_000,
      p_reserve_micro: 307_500,
      p_cap_micro: 10_000_000,
      p_model: "claude-opus-5",
    });
  });

  test("reserveGeneration maps every answer the database gives", async () => {
    const id = "6f9d2c1e-0000-4000-8000-000000000001";
    assert.deepEqual(await reserveWith({ result: "reserved", id, ...countsJson }).run(), { result: "reserved", id, counts });
    assert.deepEqual(await reserveWith({ result: "duplicate", status: "delivered" }).run(), { result: "duplicate", status: "delivered" });
    assert.deepEqual(await reserveWith({ result: "duplicate", status: "expired" }).run(), { result: "duplicate", status: "expired" });
    assert.deepEqual(await reserveWith({ result: "busy" }).run(), { result: "busy" });
    assert.deepEqual(await reserveWith({ result: "no_account" }).run(), { result: "no_account" });
    for (const limit of ["daily_limit", "monthly_limit", "attempt_limit", "account_cost_limit"] as const) {
      assert.deepEqual(await reserveWith({ result: limit, ...countsJson }).run(), { result: limit, counts });
    }
    assert.deepEqual(await reserveWith({ result: "spend_cap", first_hit: true }).run(), { result: "spend_cap", firstHit: true });
    assert.deepEqual(await reserveWith({ result: "spend_cap", first_hit: false }).run(), { result: "spend_cap", firstHit: false });
  });

  test("reserveGeneration throws on anything it does not know, so a surprise never becomes a model call", async () => {
    await assert.rejects(reserveWith({ result: "maybe" }).run(), /unexpected answer maybe/);
    await assert.rejects(reserveWith(null).run(), /unexpected answer none/);
    await assert.rejects(reserveWith({ result: "reserved" }).run(), /unexpected answer reserved/, "a reservation with no id");
    await assert.rejects(reserveWith({ result: "duplicate", status: "lost" }).run(), /unexpected answer duplicate/);
    const failing = fakeDb({ rpc: () => ({ error: { message: "post_creator_invalid_reserve" } }) });
    await assert.rejects(reserveGeneration(failing.client, reserveInput), /post_creator_invalid_reserve/);
  });

  test("settleGeneration sends every p_* argument, and an unknown cost as null", async () => {
    const input: SettleInput = {
      id: "6f9d2c1e-0000-4000-8000-000000000001",
      email: "owner@example.com",
      delivered: false,
      outcome: "timeout",
      costMicro: null,
      servedModel: null,
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      stopReason: null,
      fellBack: false,
    };
    const h = fakeDb({ rpc: () => ({ data: { result: "settled" } }) });
    await settleGeneration(h.client, input);
    assert.equal(h.rpcCalls[0].name, "post_creator_settle");
    assert.deepEqual(h.rpcCalls[0].args, {
      p_id: input.id,
      p_email: "owner@example.com",
      p_delivered: false,
      p_outcome: "timeout",
      p_cost_micro: null,
      p_served_model: null,
      p_input_tokens: null,
      p_output_tokens: null,
      p_cache_read_tokens: null,
      p_cache_write_tokens: null,
      p_stop_reason: null,
      p_fell_back: false,
    });
    assert.ok("p_cost_micro" in h.rpcCalls[0].args, "null, not left out");

    const delivered = fakeDb({ rpc: () => ({ data: { result: "noop" } }) });
    await settleGeneration(delivered.client, {
      ...input,
      delivered: true,
      outcome: "delivered",
      costMicro: 38_000.2,
      servedModel: "claude-opus-5",
      inputTokens: 2100,
      outputTokens: 1300,
      cacheReadTokens: 1200,
      cacheWriteTokens: 0,
      stopReason: "end_turn",
      fellBack: true,
    });
    const args = delivered.rpcCalls[0].args;
    assert.equal(args.p_cost_micro, 38_001, "rounded up, never down");
    assert.equal(args.p_delivered, true);
    assert.equal(args.p_served_model, "claude-opus-5");
    assert.equal(args.p_cache_read_tokens, 1200);
    assert.equal(args.p_fell_back, true);
    await settleGeneration(fakeDb({ rpc: () => ({ data: null }) }).client, { ...input, costMicro: 0 });

    await assert.rejects(settleGeneration(fakeDb({ rpc: () => ({ error: DB_ERROR }) }).client, input), /settleGeneration/);
  });

  test("usageCounts maps the Chicago day and month counts", async () => {
    const h = fakeDb({ rpc: () => ({ data: countsJson }) });
    assert.deepEqual(await usageCounts(h.client, "owner@example.com"), counts);
    assert.deepEqual(h.rpcCalls[0], { name: "post_creator_usage", args: { p_email: "owner@example.com" } });
    const empty = fakeDb({ rpc: () => ({ data: { day: "2026-09-24", month: "2026-09", used_day: 0, used_month: 0, tries_day: 0, tries_month: 0 } }) });
    assert.equal((await usageCounts(empty.client, "owner@example.com")).usedMonth, 0);
    await assert.rejects(usageCounts(fakeDb({ rpc: () => ({ error: DB_ERROR }) }).client, "owner@example.com"), /usageCounts/);
    await assert.rejects(usageCounts(fakeDb({ rpc: () => ({ data: null }) }).client, "owner@example.com"), /usageCounts/);
  });
});

describe("rate limits", () => {
  const bucket = "a".repeat(64);

  test("hitRateLimit counts a hit on the bucket and says whether it is still within the limit", async () => {
    const ok = fakeDb({ rpc: () => ({ data: true }) });
    assert.equal(await hitRateLimit(ok.client, bucket, 3600, 30), true);
    assert.deepEqual(ok.rpcCalls[0], { name: "post_creator_hit", args: { p_bucket: bucket, p_window_seconds: 3600, p_limit: 30 } });
    assert.equal(await hitRateLimit(fakeDb({ rpc: () => ({ data: false }) }).client, bucket, 3600, 30), false);
    assert.equal(await hitRateLimit(fakeDb({ rpc: () => ({ data: null }) }).client, bucket, 3600, 30), false, "anything but true is over the limit");
  });

  test("an RPC error throws, so the route can fail closed", async () => {
    await assert.rejects(hitRateLimit(fakeDb({ rpc: () => ({ error: { message: "post_creator_invalid_hit" } }) }).client, bucket, 3600, 30), /post_creator_invalid_hit/);
  });
});

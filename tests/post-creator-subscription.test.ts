import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, test } from "node:test";
import { CHASE_SHEET } from "../lib/chaseSheet/product.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { postCreatorLicenseKey } from "../lib/postCreator/access.ts";
import type { Db } from "../lib/postCreator/db.ts";
import {
  AI_OFF_FOR_GOOD_LINE,
  AI_PAUSE_LINE,
  buyerReceipt,
  endedMonthlyOwnerAlert,
  keyResendEmail,
  moneyBackOwnerAlert,
  overlapBuyerNotice,
  overlapOwnerAlert,
  ownerSaleAlert,
  replacedMonthlyBuyerNotice,
  replacedMonthlyOwnerAlert,
  subscriptionEndedOwnerAlert,
  type ResendPayload,
} from "../lib/postCreator/emails.ts";
import { parseAccount, updatePlan as dbUpdatePlan } from "../lib/postCreator/db.ts";
import { decideEntitlement } from "../lib/postCreator/plan.ts";
import { POST_CREATOR, aiCapLine } from "../lib/postCreator/product.ts";
import {
  POST_CREATOR_PURPOSES,
  applyPostCreatorMoneyBack,
  ensurePostCreatorPaid,
  handlePostCreatorSubscription,
  markPostCreatorRenewed,
  postCreatorFirstInvoiceCheckout,
} from "../lib/postCreator/subscription.ts";
import { BUSINESS } from "../lib/site/business.ts";

// The Post Creator money path against a fake database (the record-purchase
// RPC, the accounts table, and the email ledger) and a fake fetcher. Nothing
// here reaches Stripe or Resend.

globalThis.fetch = (() => {
  throw new Error("no network in tests");
}) as typeof fetch;

const SECRET = "test-post-creator-signer-not-used-in-production";
const ENV_KEYS = ["RESEND_API_KEY", "STRIPE_SECRET_KEY", "POST_CREATOR_SECRET", "PRO_TOOLS_SECRET", "UNSUBSCRIBE_SECRET", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const savedEnv: Record<string, string | undefined> = {};
const savedConsoleError = console.error;
let logged: string[] = [];

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  process.env.RESEND_API_KEY = "re_test_mock_only";
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_only";
  process.env.POST_CREATOR_SECRET = SECRET;
  logged = [];
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  };
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  console.error = savedConsoleError;
});

/* ------------------------------ fake database ------------------------------ */

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code?: string; message: string } | null };

function table(rows: Row[]) {
  let mode: "select" | "update" | "insert" | "upsert" = "select";
  let patch: Row = {};
  let incoming: Row[] = [];
  let conflict: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  let returning = false;
  let max = Infinity;
  const filters: ((r: Row) => boolean)[] = [];
  // Stands in for PostgREST ordering filters: numbers compare as numbers.
  const num = (v: unknown) => Number(v);
  const run = (): Result => {
    if (mode === "insert" || mode === "upsert") {
      for (const r of incoming) {
        const key = conflict.onConflict ?? (mode === "insert" ? "email" : undefined);
        const clash = key ? rows.find((x) => x[key] === r[key]) : undefined;
        if (clash && mode === "insert") return { data: null, error: { code: "23505", message: "duplicate key" } };
        if (clash && !conflict.ignoreDuplicates) Object.assign(clash, r);
        if (!clash) rows.push({ ...r });
      }
      return { data: returning ? incoming.map((r) => ({ ...r })) : null, error: null };
    }
    const hits = rows.filter((r) => filters.every((f) => f(r))).slice(0, max);
    if (mode === "update") {
      for (const r of hits) Object.assign(r, patch);
      return { data: returning ? hits.map((r) => ({ ...r })) : null, error: null };
    }
    return { data: hits.map((r) => ({ ...r })), error: null };
  };
  const first = (single: boolean): Result => {
    const res = run();
    const list = Array.isArray(res.data) ? (res.data as Row[]) : [];
    if (res.error) return res;
    if (!list.length) return single ? { data: null, error: { code: "PGRST116", message: "no rows" } } : { data: null, error: null };
    return { data: list[0], error: null };
  };
  const chain = {
    select: () => {
      returning = true;
      return chain;
    },
    eq: (col: string, value: unknown) => {
      filters.push((r) => r[col] === value);
      return chain;
    },
    is: (col: string, value: unknown) => {
      filters.push((r) => (r[col] ?? null) === value);
      return chain;
    },
    neq: (col: string, value: unknown) => {
      filters.push((r) => r[col] !== value);
      return chain;
    },
    lte: (col: string, value: unknown) => {
      filters.push((r) => num(r[col]) <= num(value));
      return chain;
    },
    limit: (n: number) => {
      max = n;
      return chain;
    },
    order: () => chain,
    update: (p: Row) => {
      mode = "update";
      patch = p;
      return chain;
    },
    insert: (r: Row | Row[]) => {
      mode = "insert";
      incoming = Array.isArray(r) ? r : [r];
      return chain;
    },
    upsert: (r: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) => {
      mode = "upsert";
      incoming = Array.isArray(r) ? r : [r];
      conflict = options;
      return chain;
    },
    maybeSingle: async () => first(false),
    single: async () => first(true),
    then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
  };
  return chain;
}

const accountRow = (over: Row = {}): Row => ({
  email: "owner@example.com",
  plan: "monthly",
  status: "active",
  stripe_customer_id: "cus_old",
  stripe_subscription_id: "sub_old",
  first_session_id: "cs_test_earlier_checkout_1",
  last_session_id: "cs_test_earlier_checkout_1",
  first_claimed_at: "2026-09-01T00:00:00.000Z",
  access_epoch: 0,
  current_period_end: "2026-10-01T00:00:00.000Z",
  cancel_at: null,
  stripe_event_at: 100,
  stripe_synced_at: null,
  past_due_since: null,
  money_back_at: null,
  replaced_subscription_id: null,
  monthly_until: null,
  profile: {},
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  ...over,
});

/** The access_epoch sequence: every value handed out is new. */
let epochSeq = 1000;

/**
 * post_creator_record_purchase, as the migration writes it: each checkout is
 * applied once (the post_creator_checkouts ledger), an owned one payment plan
 * never downgrades, a refunded one does, and a checkout that takes over from
 * a running monthly subscription names it in replaced_subscription_id.
 */
function recordPurchaseRpc(accounts: Row[], applied: Set<string>, args: Row): Row {
  const email = String(args.p_email);
  const plan = String(args.p_plan);
  const sessionId = String(args.p_session_id);
  let row = accounts.find((r) => r.email === email);
  if (applied.has(sessionId)) {
    if (!row) return { created: false, created_by_this_session: false, account: null };
    return { created: false, created_by_this_session: row.first_session_id === sessionId, account: { ...row } };
  }
  applied.add(sessionId);
  let created = false;
  if (!row) {
    row = accountRow({
      email,
      plan,
      stripe_customer_id: args.p_customer_id ?? null,
      stripe_subscription_id: plan === "monthly" ? (args.p_subscription_id ?? null) : null,
      first_session_id: sessionId,
      last_session_id: sessionId,
      first_claimed_at: null,
      access_epoch: ++epochSeq,
      current_period_end: null,
      stripe_event_at: args.p_event_at,
    });
    accounts.push(row);
    created = true;
  } else {
    const old = { ...row };
    const ownsLifetime = old.plan === "lifetime" && old.status === "active" && old.money_back_at == null;
    const newSub = (args.p_subscription_id as string | null) ?? null;
    const replaced =
      old.plan === "monthly" && old.status !== "canceled" && old.money_back_at == null && old.stripe_subscription_id != null &&
      (plan === "lifetime" || (newSub !== null && newSub !== old.stripe_subscription_id))
        ? old.stripe_subscription_id
        : null;
    Object.assign(row, {
      plan: plan === "lifetime" || ownsLifetime ? "lifetime" : "monthly",
      status: "active",
      current_period_end: plan === "monthly" && old.plan === "monthly" ? old.current_period_end : null,
      cancel_at: null,
      stripe_subscription_id: plan === "monthly" && !ownsLifetime ? (newSub ?? old.stripe_subscription_id) : old.stripe_subscription_id,
      stripe_customer_id: args.p_customer_id ?? old.stripe_customer_id,
      stripe_event_at: Math.max(Number(old.stripe_event_at), Number(args.p_event_at)),
      last_session_id: sessionId,
      replaced_subscription_id: replaced,
      past_due_since: null,
      money_back_at: null,
      monthly_until:
        plan === "lifetime" && replaced !== null && old.status === "past_due"
          ? new Date().toISOString()
          : plan === "lifetime" && replaced !== null
          ? new Date(Math.max(old.current_period_end ? Date.parse(String(old.current_period_end)) : 0, Date.now())).toISOString()
          : plan === "lifetime" || ownsLifetime
            ? old.monthly_until
            : null,
      access_epoch: ++epochSeq,
    });
  }
  return { created, created_by_this_session: row.first_session_id === sessionId, account: { ...row } };
}

function fakeDb(seed: Row[] = [], purchases: Row[] = []) {
  const tables: Record<string, Row[]> = {
    post_creator_accounts: seed.map((r) => ({ ...r })),
    payment_email_deliveries: [],
    purchases: purchases.map((r) => ({ ...r })),
  };
  // Seeded rows were applied by their own checkouts.
  const applied = new Set<string>(seed.flatMap((r) => [String(r.first_session_id), String(r.last_session_id)]));
  const rpcCalls: { name: string; args: Row }[] = [];
  const client = {
    from: (name: string) => {
      if (!tables[name]) throw new Error(`unexpected table ${name}`);
      return table(tables[name]);
    },
    rpc: async (name: string, args: Row): Promise<Result> => {
      rpcCalls.push({ name, args });
      if (name !== "post_creator_record_purchase") return { data: null, error: { message: `unexpected rpc ${name}` } };
      return { data: recordPurchaseRpc(tables.post_creator_accounts, applied, args), error: null };
    },
  };
  return { client: client as unknown as Db, tables, rpcCalls, applied, account: () => tables.post_creator_accounts[0] };
}

/* ------------------------------- fake network ------------------------------ */

type Sent = { url: string; method: string; body: string; headers: Record<string, string> };

/**
 * Resend and Stripe, in memory. `subscriptions` is what Stripe says each
 * subscription's status is (GET); `paidInto` maps a checkout session or an
 * invoice to the subscription it paid into.
 */
function fakeNetwork(
  options: { resendFails?: boolean; stripeFails?: boolean; subscriptions?: Record<string, string>; paidInto?: Record<string, string> } = {},
) {
  const resend: Sent[] = [];
  const stripe: Sent[] = [];
  const fetcher = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    const sent = { url, method, body: String(init.body ?? ""), headers: (init.headers ?? {}) as Record<string, string> };
    if (url === "https://api.resend.com/emails") {
      resend.push(sent);
      if (options.resendFails) return new Response("provider down", { status: 500 });
      return Response.json({ id: `re_mock_${resend.length}` });
    }
    if (url.startsWith("https://api.stripe.com/v1/subscriptions/")) {
      stripe.push(sent);
      if (options.stripeFails) return new Response("nope", { status: 400 });
      const id = url.split("/").pop() ?? "";
      if (method === "GET") return Response.json({ id, status: options.subscriptions?.[id] ?? "active" });
      if (method === "DELETE") return Response.json({ id, status: "canceled" });
      return Response.json({ id, cancel_at_period_end: true });
    }
    const paid = /^https:\/\/api\.stripe\.com\/v1\/(checkout\/sessions|invoices)\/([^/?]+)$/.exec(url);
    if (paid) {
      stripe.push(sent);
      const sub = options.paidInto?.[paid[2]] ?? null;
      return Response.json(paid[1] === "invoices" ? { id: paid[2], subscription: sub } : { id: paid[2], subscription: sub });
    }
    throw new Error(`unexpected request ${url}`);
  }) as typeof fetch;
  const calls = () => stripe.map((c) => `${c.method} ${c.url.replace("https://api.stripe.com/v1/", "")}${c.body ? ` ${c.body}` : ""}`);
  return { fetcher, resend, stripe, calls };
}

const deliveryKey = (sessionId: string, purpose: string) => createHash("sha256").update(`payment-email:${sessionId}:${purpose}`).digest("hex");

/** The Resend bodies sent, by ledger purpose. */
function byPurpose(sent: Sent[], sessionId: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const purpose of Object.values(POST_CREATOR_PURPOSES)) {
    const hit = sent.find((s) => s.headers["Idempotency-Key"] === `payment-${deliveryKey(sessionId, purpose)}`);
    if (hit) out[purpose] = hit.body;
  }
  return out;
}

const MONTHLY_SESSION = "cs_test_post_creator_monthly_1";
const LIFETIME_SESSION = "cs_test_post_creator_lifetime_1";

function session(plan: "monthly" | "lifetime", over: Row = {}): Row {
  const usd = plan === "monthly" ? POST_CREATOR.monthlyUsd : POST_CREATOR.lifetimeUsd;
  return {
    id: plan === "monthly" ? MONTHLY_SESSION : LIFETIME_SESSION,
    mode: plan === "monthly" ? "subscription" : "payment",
    status: "complete",
    payment_status: "paid",
    currency: "usd",
    amount_total: usd * 100,
    amount_subtotal: usd * 100,
    metadata: { kind: plan === "monthly" ? POST_CREATOR.monthlyKind : POST_CREATOR.lifetimeKind, plan },
    customer: "cus_new",
    subscription: plan === "monthly" ? "sub_new" : null,
    customer_details: { email: "Owner@Example.com" },
    created: 1_790_000_000,
    ...over,
  };
}

/* ------------------------------ paid checkouts ----------------------------- */

describe("ensurePostCreatorPaid", () => {
  test("a new monthly buyer gets an account, the receipt with the key, and the owner alert", async () => {
    const { client, rpcCalls, tables, account } = fakeDb();
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });

    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0].name, "post_creator_record_purchase");
    assert.equal(rpcCalls[0].args.p_email, "owner@example.com");
    assert.equal(rpcCalls[0].args.p_plan, "monthly");
    assert.equal(rpcCalls[0].args.p_session_id, MONTHLY_SESSION);
    assert.equal(rpcCalls[0].args.p_subscription_id, "sub_new");
    assert.equal(rpcCalls[0].args.p_event_at, 1_790_000_000, "the checkout's own time orders it against later subscription events");
    assert.equal(account().plan, "monthly");

    assert.equal(net.stripe.length, 0, "nothing to stop for a first plan");
    const sent = byPurpose(net.resend, MONTHLY_SESSION);
    assert.deepEqual(Object.keys(sent).sort(), [POST_CREATOR_PURPOSES.buyer, POST_CREATOR_PURPOSES.internal].sort());
    const receipt = JSON.parse(sent[POST_CREATOR_PURPOSES.buyer]) as ResendPayload;
    const key = postCreatorLicenseKey("owner@example.com", SECRET);
    assert.deepEqual(receipt, buyerReceipt({ email: "owner@example.com", plan: "monthly", key }));
    assert.deepEqual(receipt.to, ["owner@example.com"]);
    assert.ok(receipt.text.includes(`Your key: ${key}`));
    assert.ok(receipt.text.includes(`?email=owner%40example.com&key=${encodeURIComponent(key)}`));
    const alert = JSON.parse(sent[POST_CREATOR_PURPOSES.internal]) as ResendPayload;
    assert.deepEqual(alert, ownerSaleAlert({ email: "owner@example.com", plan: "monthly", sessionId: MONTHLY_SESSION }));
    assert.deepEqual(alert.to, [BUSINESS.email.hello]);
    assert.ok(tables.payment_email_deliveries.every((r) => typeof r.sent_at === "string"), "both ledger rows are marked sent");

    // A retried event sends nothing new.
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    assert.equal(net.resend.length, 2);
  });

  test("a receipt on an account whose key was revoked carries the current key, never the revoked one", async () => {
    const { client } = fakeDb([accountRow({ status: "canceled", key_version: 2 })]);
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    const receipt = JSON.parse(byPurpose(net.resend, MONTHLY_SESSION)[POST_CREATOR_PURPOSES.buyer]) as ResendPayload;
    assert.ok(receipt.text.includes(`Your key: ${postCreatorLicenseKey("owner@example.com", SECRET, 2)}`));
    assert.ok(!receipt.text.includes(postCreatorLicenseKey("owner@example.com", SECRET)));
  });

  test("the payloads are byte-identical whether the checkout made the account or found one", async () => {
    const fresh = fakeDb();
    const freshNet = fakeNetwork();
    await ensurePostCreatorPaid(fresh.client, session("monthly"), { fetcher: freshNet.fetcher });
    // A monthly plan that ended, bought again: no plan is running to stop.
    const existing = fakeDb([accountRow({ status: "canceled", access_epoch: 3 })]);
    const existingNet = fakeNetwork();
    await ensurePostCreatorPaid(existing.client, session("monthly"), { fetcher: existingNet.fetcher });
    assert.ok(Number(existing.account().access_epoch) > 3, "the later checkout signed every device out");

    const a = byPurpose(freshNet.resend, MONTHLY_SESSION);
    const b = byPurpose(existingNet.resend, MONTHLY_SESSION);
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const purpose of Object.keys(a)) assert.equal(a[purpose], b[purpose], `${purpose} is the same bytes`);
    const hashes = (rows: Row[]) => rows.map((r) => `${r.purpose}:${r.payload_hash}`).sort();
    assert.deepEqual(hashes(fresh.tables.payment_email_deliveries), hashes(existing.tables.payment_email_deliveries));
    for (const body of [...Object.values(a), ...Object.values(b)]) assert.ok(!/created/i.test(body), "no email says whether the row was new");
  });

  test("a failed send is retried after the account changed, and the ledger accepts the same payload", async () => {
    const { client } = fakeDb();
    const down = fakeNetwork({ resendFails: true });
    await assert.rejects(ensurePostCreatorPaid(client, session("monthly"), { fetcher: down.fetcher }), /retryable/);
    // The retry finds an existing account (not created by this run). A
    // changed payload would be refused with "needs review".
    const up = fakeNetwork();
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: up.fetcher });
    assert.equal(up.resend.length, 2);
    for (const purpose of [POST_CREATOR_PURPOSES.buyer, POST_CREATOR_PURPOSES.internal]) {
      assert.equal(byPurpose(up.resend, MONTHLY_SESSION)[purpose], byPurpose(down.resend, MONTHLY_SESSION)[purpose], purpose);
    }
  });

  test("one payment over a monthly plan stops the old subscription and tells the owner", async () => {
    const { client, account } = fakeDb([accountRow()]);
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("lifetime"), { fetcher: net.fetcher });
    assert.equal(account().plan, "lifetime");
    // Stripe is asked first; a running plan ends at the close of its paid month.
    assert.deepEqual(net.calls(), ["GET subscriptions/sub_old", "POST subscriptions/sub_old cancel_at_period_end=true"]);
    assert.equal(net.stripe[1].headers.Authorization, "Bearer sk_test_mock_only");
    const sent = byPurpose(net.resend, LIFETIME_SESSION);
    assert.deepEqual(
      Object.keys(sent).sort(),
      [POST_CREATOR_PURPOSES.buyer, POST_CREATOR_PURPOSES.internal, POST_CREATOR_PURPOSES.endedMonthlyInternal].sort(),
    );
    assert.deepEqual(
      JSON.parse(sent[POST_CREATOR_PURPOSES.endedMonthlyInternal]),
      endedMonthlyOwnerAlert({ email: "owner@example.com", sessionId: LIFETIME_SESSION, subscriptionId: "sub_old" }),
    );
    const receipt = JSON.parse(sent[POST_CREATOR_PURPOSES.buyer]) as ResendPayload;
    assert.ok(receipt.text.includes("so you are not charged for both"));
  });

  test("one payment over a past-due monthly plan cancels it now, so Stripe stops retrying the renewal", async () => {
    const { client } = fakeDb([accountRow({ status: "past_due" })]);
    const net = fakeNetwork({ subscriptions: { sub_old: "past_due" } });
    await ensurePostCreatorPaid(client, session("lifetime"), { fetcher: net.fetcher });
    assert.deepEqual(net.calls(), ["GET subscriptions/sub_old", "DELETE subscriptions/sub_old"]);
    const unpaid = fakeDb([accountRow({ status: "past_due" })]);
    const unpaidNet = fakeNetwork({ subscriptions: { sub_old: "unpaid" } });
    await ensurePostCreatorPaid(unpaid.client, session("lifetime"), { fetcher: unpaidNet.fetcher });
    assert.deepEqual(unpaidNet.calls(), ["GET subscriptions/sub_old", "DELETE subscriptions/sub_old"]);
  });

  test("one payment over an ended monthly plan stops nothing and sends no ended-monthly alert", async () => {
    const { client } = fakeDb([accountRow({ status: "canceled" })]);
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("lifetime"), { fetcher: net.fetcher });
    assert.deepEqual(net.calls(), []);
    assert.deepEqual(Object.keys(byPurpose(net.resend, LIFETIME_SESSION)).sort(), [POST_CREATOR_PURPOSES.buyer, POST_CREATOR_PURPOSES.internal].sort());
  });

  test("a second monthly checkout on a running monthly plan stops the older subscription and tells both sides", async () => {
    const { client, account } = fakeDb([accountRow()]);
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    // The account follows the new subscription and customer; the old one is stopped, never orphaned.
    assert.equal(account().stripe_subscription_id, "sub_new");
    assert.equal(account().stripe_customer_id, "cus_new");
    assert.equal(account().replaced_subscription_id, "sub_old");
    assert.deepEqual(net.calls(), ["GET subscriptions/sub_old", "POST subscriptions/sub_old cancel_at_period_end=true"]);
    const sent = byPurpose(net.resend, MONTHLY_SESSION);
    assert.deepEqual(
      Object.keys(sent).sort(),
      [
        POST_CREATOR_PURPOSES.buyer,
        POST_CREATOR_PURPOSES.internal,
        POST_CREATOR_PURPOSES.replacedMonthlyBuyer,
        POST_CREATOR_PURPOSES.replacedMonthlyInternal,
      ].sort(),
    );
    assert.deepEqual(JSON.parse(sent[POST_CREATOR_PURPOSES.replacedMonthlyBuyer]), replacedMonthlyBuyerNotice({ email: "owner@example.com" }));
    assert.deepEqual(
      JSON.parse(sent[POST_CREATOR_PURPOSES.replacedMonthlyInternal]),
      replacedMonthlyOwnerAlert({ email: "owner@example.com", sessionId: MONTHLY_SESSION, subscriptionId: "sub_old" }),
    );

    // A retry of the same checkout decides the same, and the ledger sends nothing new.
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    assert.equal(net.resend.length, 4);

    // Later events for the old subscription never touch the account.
    assert.equal(await handlePostCreatorSubscription(client, subEvent("customer.subscription.deleted", 9_999_999_999, { id: "sub_old", customer: "cus_old" })), true);
    assert.equal(account().status, "active");
  });

  test("a second monthly checkout over a past-due monthly plan cancels the older one now", async () => {
    const { client, account } = fakeDb([accountRow({ status: "past_due" })]);
    const net = fakeNetwork({ subscriptions: { sub_old: "past_due" } });
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    assert.equal(account().status, "active");
    assert.deepEqual(net.calls(), ["GET subscriptions/sub_old", "DELETE subscriptions/sub_old"]);
  });

  test("an older checkout replayed after a newer one changes nothing and decides nothing", async () => {
    const db = fakeDb();
    const net = fakeNetwork();
    const a = session("monthly", { id: "cs_test_three_checkouts_a", subscription: "sub_a", customer: "cus_a" });
    const b = session("monthly", { id: "cs_test_three_checkouts_b", subscription: "sub_b", customer: "cus_b" });
    const c = session("monthly", { id: "cs_test_three_checkouts_c", subscription: "sub_c", customer: "cus_c" });
    for (const s of [a, b, c]) await ensurePostCreatorPaid(db.client, s, { fetcher: net.fetcher });
    const before = { ...db.account() };
    assert.equal(before.stripe_subscription_id, "sub_c");
    const stripeCalls = net.stripe.length;
    const emails = net.resend.length;
    // A Stripe retry of b, or its success link opened again.
    await ensurePostCreatorPaid(db.client, b, { fetcher: net.fetcher });
    assert.deepEqual(db.account(), before, "no epoch bump, no older subscription, no status change");
    assert.equal(net.stripe.length, stripeCalls, "nothing is stopped again");
    assert.equal(net.resend.length, emails, "the ledger already sent b's emails");
  });

  test("a monthly checkout on a refunded one payment account starts a fresh monthly plan", async () => {
    const { client, account } = fakeDb([accountRow({ plan: "lifetime", status: "canceled", money_back_at: "2026-09-10T00:00:00.000Z", stripe_subscription_id: null })]);
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    assert.equal(account().plan, "monthly");
    assert.equal(account().status, "active");
    assert.equal(account().money_back_at, null);
    assert.equal(account().stripe_subscription_id, "sub_new");
    assert.deepEqual(net.calls(), [], "the subscription just bought is not stopped");
    const sent = byPurpose(net.resend, MONTHLY_SESSION);
    assert.deepEqual(Object.keys(sent).sort(), [POST_CREATOR_PURPOSES.buyer, POST_CREATOR_PURPOSES.internal].sort(), "no false 'you already own it' email");
    // Subscription events govern it from here.
    await handlePostCreatorSubscription(client, subEvent("customer.subscription.updated", 1_790_000_100, { id: "sub_new", customer: "cus_new", status: "past_due" }));
    assert.equal(account().status, "past_due");
  });

  test("a checkout applied before an account was deleted on request never brings it back", async () => {
    const db = fakeDb();
    const net = fakeNetwork();
    await ensurePostCreatorPaid(db.client, session("monthly"), { fetcher: net.fetcher });
    db.tables.post_creator_accounts.length = 0;
    await ensurePostCreatorPaid(db.client, session("monthly"), { fetcher: net.fetcher });
    assert.equal(db.tables.post_creator_accounts.length, 0);
    assert.equal(net.resend.length, 2, "nothing new is sent");
  });

  test("monthly over the one payment plan stops the new subscription and sends both overlap emails", async () => {
    const { client, account } = fakeDb([accountRow({ plan: "lifetime", stripe_subscription_id: null, current_period_end: null })]);
    const net = fakeNetwork();
    await ensurePostCreatorPaid(client, session("monthly"), { fetcher: net.fetcher });
    assert.equal(account().plan, "lifetime", "a monthly checkout never downgrades the one payment plan");
    assert.equal(net.stripe.length, 1);
    assert.equal(net.stripe[0].url, "https://api.stripe.com/v1/subscriptions/sub_new");
    const sent = byPurpose(net.resend, MONTHLY_SESSION);
    assert.deepEqual(
      Object.keys(sent).sort(),
      [POST_CREATOR_PURPOSES.buyer, POST_CREATOR_PURPOSES.internal, POST_CREATOR_PURPOSES.overlapBuyer, POST_CREATOR_PURPOSES.overlapInternal].sort(),
    );
    assert.deepEqual(JSON.parse(sent[POST_CREATOR_PURPOSES.overlapBuyer]), overlapBuyerNotice({ email: "owner@example.com" }));
    assert.deepEqual(
      JSON.parse(sent[POST_CREATOR_PURPOSES.overlapInternal]),
      overlapOwnerAlert({ email: "owner@example.com", sessionId: MONTHLY_SESSION, subscriptionId: "sub_new" }),
    );
  });

  test("a failed cancel call is logged, never thrown, and never changes an email", async () => {
    const { client } = fakeDb([accountRow()]);
    const net = fakeNetwork({ stripeFails: true });
    await ensurePostCreatorPaid(client, session("lifetime"), { fetcher: net.fetcher });
    assert.deepEqual(net.calls(), ["GET subscriptions/sub_old", "POST subscriptions/sub_old cancel_at_period_end=true"], "an unreadable subscription still ends at period end");
    assert.ok(logged.some((l) => l.includes("could not read a subscription")));
    assert.ok(logged.some((l) => l.includes("could not stop a subscription")));
    const ok = fakeDb([accountRow()]);
    const okNet = fakeNetwork();
    await ensurePostCreatorPaid(ok.client, session("lifetime"), { fetcher: okNet.fetcher });
    assert.deepEqual(byPurpose(net.resend, LIFETIME_SESSION), byPurpose(okNet.resend, LIFETIME_SESSION));
  });

  test("no Resend key, no secret, a rejected send, or an unreadable session throws so Stripe retries", async () => {
    delete process.env.RESEND_API_KEY;
    await assert.rejects(ensurePostCreatorPaid(fakeDb().client, session("monthly"), { fetcher: fakeNetwork().fetcher }), /not configured/);
    process.env.RESEND_API_KEY = "re_test_mock_only";
    delete process.env.POST_CREATOR_SECRET;
    await assert.rejects(ensurePostCreatorPaid(fakeDb().client, session("monthly"), { fetcher: fakeNetwork().fetcher }), /not configured/);
    process.env.POST_CREATOR_SECRET = SECRET;
    await assert.rejects(ensurePostCreatorPaid(fakeDb().client, session("monthly"), { fetcher: fakeNetwork({ resendFails: true }).fetcher }), /retryable/);
    for (const bad of [
      session("monthly", { payment_status: "unpaid" }),
      session("monthly", { currency: "eur" }),
      session("monthly", { amount_total: 100, amount_subtotal: 100 }),
      session("lifetime", { mode: "subscription" }),
      session("monthly", { metadata: { kind: CHASE_SHEET.monthlyKind } }),
    ]) {
      const db = fakeDb();
      await assert.rejects(ensurePostCreatorPaid(db.client, bad, { fetcher: fakeNetwork().fetcher }), /requires amount, mode, or currency review/);
      assert.equal(db.rpcCalls.length, 0, "nothing is recorded for a session that fails the checks");
    }
  });
});

/* ---------------------------- subscription events --------------------------- */

const subEvent = (type: string, created: number, object: Row) => ({
  type,
  created,
  data: { object: { id: "sub_old", customer: "cus_old", status: "active", metadata: { kind: POST_CREATOR.monthlyKind }, ...object } },
});

describe("handlePostCreatorSubscription", () => {
  test("only Post Creator subscription events are claimed", async () => {
    const { client, account } = fakeDb([accountRow()]);
    assert.equal(await handlePostCreatorSubscription(client, subEvent("customer.subscription.updated", 200, { metadata: { kind: CHASE_SHEET.monthlyKind } })), false);
    assert.equal(await handlePostCreatorSubscription(client, subEvent("customer.subscription.updated", 200, { metadata: { kind: "hq_subscription" } })), false);
    assert.equal(await handlePostCreatorSubscription(client, { type: "invoice.paid", created: 200, data: { object: {} } }), false);
    assert.equal(account().stripe_event_at, 100);
  });

  test("a past-due update carries the period and a scheduled cancel", async () => {
    const { client, account } = fakeDb([accountRow()]);
    const handled = await handlePostCreatorSubscription(
      client,
      subEvent("customer.subscription.updated", 250, { status: "past_due", current_period_end: 1_792_000_000, cancel_at_period_end: true }),
    );
    assert.equal(handled, true);
    assert.equal(account().status, "past_due");
    assert.equal(account().current_period_end, new Date(1_792_000_000 * 1000).toISOString());
    assert.equal(account().cancel_at, new Date(1_792_000_000 * 1000).toISOString());
    assert.equal(account().stripe_event_at, 250);
  });

  test("the grace window counts from the failed renewal, not from the end of the unpaid month", async () => {
    // Stripe renews Oct 1 (the period moves to Oct 1 to Nov 1), then the card fails an hour later.
    const renewal = Date.parse("2026-10-01T15:00:00Z") / 1000;
    const failed = renewal + 3600;
    const periodEnd = Date.parse("2026-11-01T15:00:00Z") / 1000;
    const { client, account } = fakeDb([accountRow({ stripe_event_at: renewal - 10 })]);
    const pastDue = { status: "past_due", current_period_start: renewal, current_period_end: periodEnd };
    await handlePostCreatorSubscription(client, subEvent("customer.subscription.updated", failed, pastDue));
    assert.equal(account().past_due_since, new Date(failed * 1000).toISOString(), "the event's time is when it went past due");
    const at = (iso: string) => decideEntitlement(parseAccount(account()), new Date(iso));
    assert.equal(at("2026-10-07T12:00:00Z").entitled, true, "inside the seven days");
    assert.deepEqual(at("2026-10-09T00:00:00Z"), { entitled: false, reason: "past_due" }, "not the 37 days the period end would give");

    // Stripe's retries keep it past due; the date holds. Stripe moving the
    // period on (leave past due, mark unpaid) never restarts the window.
    await handlePostCreatorSubscription(
      client,
      subEvent("customer.subscription.updated", periodEnd + 60, { status: "unpaid", current_period_start: periodEnd, current_period_end: periodEnd + 30 * 86_400 }),
    );
    assert.equal(account().past_due_since, new Date(failed * 1000).toISOString());
    assert.equal(at("2026-11-20T00:00:00Z").entitled, false);

    // Paid again: the date clears.
    await handlePostCreatorSubscription(client, subEvent("customer.subscription.updated", periodEnd + 120, { status: "active", current_period_end: periodEnd + 30 * 86_400 }));
    assert.equal(account().past_due_since, null);
    assert.equal(account().status, "active");
  });

  test("two deliveries racing on two servers can never let the older one land last", async () => {
    const { client, account } = fakeDb([accountRow({ stripe_event_at: 1000 })]);
    // Both read the row at 1000 and pass the in-code check. The newer one lands first.
    const older = subEvent("customer.subscription.updated", 2000, { status: "active" });
    const newer = subEvent("customer.subscription.updated", 3000, { status: "past_due" });
    await handlePostCreatorSubscription(client, newer);
    assert.equal(account().status, "past_due");
    // The older one was already past the in-code check; the write itself refuses it.
    await dbUpdatePlan(client, "owner@example.com", { status: "active", currentPeriodEnd: null, cancelAt: null, pastDueSince: null, eventAt: 2000 });
    assert.equal(account().status, "past_due");
    assert.equal(account().stripe_event_at, 3000);
    await handlePostCreatorSubscription(client, older);
    assert.equal(account().status, "past_due");
  });

  test("an older event, an old subscription, a one payment account, and an unknown account change nothing", async () => {
    const { client, account } = fakeDb([accountRow({ stripe_subscription_id: "sub_new", stripe_customer_id: "cus_1" })]);
    // Older than the last event applied.
    assert.equal(await handlePostCreatorSubscription(client, subEvent("customer.subscription.deleted", 50, { id: "sub_new", customer: "cus_1" })), true);
    assert.equal(account().status, "active");
    // A late event from the subscription this account moved on from, matched by customer.
    assert.equal(await handlePostCreatorSubscription(client, subEvent("customer.subscription.deleted", 300, { id: "sub_old", customer: "cus_1" })), true);
    assert.equal(account().status, "active");
    assert.equal(account().stripe_subscription_id, "sub_new");

    const lifetime = fakeDb([accountRow({ plan: "lifetime" })]);
    assert.equal(await handlePostCreatorSubscription(lifetime.client, subEvent("customer.subscription.deleted", 300, {})), true);
    assert.equal(lifetime.account().status, "active");
    assert.equal(lifetime.tables.payment_email_deliveries.length, 0, "no ended alert for a one payment account");

    const empty = fakeDb();
    assert.equal(await handlePostCreatorSubscription(empty.client, subEvent("customer.subscription.deleted", 300, { id: "sub_x", customer: "cus_x" })), true);
  });

  test("deleted cancels the account and sends the ended alert once, keyed by the subscription", async () => {
    const { client, account, tables } = fakeDb([accountRow()]);
    const net = fakeNetwork();
    const deleted = subEvent("customer.subscription.deleted", 300, { status: "active" });
    assert.equal(await handlePostCreatorSubscription(client, deleted, { fetcher: net.fetcher }), true);
    assert.equal(account().status, "canceled", "deleted always means canceled");
    assert.equal(net.resend.length, 1);
    assert.equal(net.resend[0].headers["Idempotency-Key"], `payment-${deliveryKey("sub_old", POST_CREATOR_PURPOSES.subscriptionEnded)}`);
    assert.deepEqual(JSON.parse(net.resend[0].body), subscriptionEndedOwnerAlert({ email: "owner@example.com", subscriptionId: "sub_old" }));
    assert.equal(tables.payment_email_deliveries[0].stripe_session_id, "sub_old");
    // Stripe retries the same event: no second email.
    assert.equal(await handlePostCreatorSubscription(client, deleted, { fetcher: net.fetcher }), true);
    assert.equal(net.resend.length, 1);
  });

  test("the ended alert is skipped without Resend and a failed send is logged, not thrown", async () => {
    delete process.env.RESEND_API_KEY;
    const quiet = fakeDb([accountRow()]);
    const quietNet = fakeNetwork();
    assert.equal(await handlePostCreatorSubscription(quiet.client, subEvent("customer.subscription.deleted", 300, {}), { fetcher: quietNet.fetcher }), true);
    assert.equal(quiet.account().status, "canceled");
    assert.equal(quietNet.resend.length, 0);

    process.env.RESEND_API_KEY = "re_test_mock_only";
    const failing = fakeDb([accountRow()]);
    const down = fakeNetwork({ resendFails: true });
    assert.equal(await handlePostCreatorSubscription(failing.client, subEvent("customer.subscription.deleted", 300, {}), { fetcher: down.fetcher }), true);
    assert.equal(failing.account().status, "canceled");
    assert.ok(logged.some((l) => l.includes("ended alert was not sent")));
  });
});

/* ------------------------------ renewals, money ------------------------------ */

describe("renewals and money back", () => {
  test("a paid renewal reopens a past-due monthly account and leaves the rest alone", async () => {
    const { client, account } = fakeDb([accountRow({ status: "past_due" })]);
    await markPostCreatorRenewed(client, "sub_old", 400);
    assert.equal(account().status, "active");
    assert.equal(account().stripe_event_at, 400);
    const lifetime = fakeDb([accountRow({ plan: "lifetime", status: "canceled" })]);
    await markPostCreatorRenewed(lifetime.client, "sub_old", 400);
    assert.equal(lifetime.account().status, "canceled");
    const unknown = fakeDb([accountRow({ status: "past_due" })]);
    await markPostCreatorRenewed(unknown.client, "sub_other", 400);
    assert.equal(unknown.account().status, "past_due");
  });

  test("a refund cancels, a dispute won restores, and a monthly refund never locks a one payment account", async () => {
    const { client, account } = fakeDb([accountRow({ plan: "lifetime", stripe_subscription_id: null })]);
    const net = fakeNetwork();
    const lifetime = { stripe_session_id: LIFETIME_SESSION, email: "Owner@Example.com", kind: POST_CREATOR.lifetimeKind };
    await applyPostCreatorMoneyBack(client, lifetime, false, { fetcher: net.fetcher });
    assert.equal(account().status, "canceled");
    assert.equal(typeof account().money_back_at, "string");
    await applyPostCreatorMoneyBack(client, lifetime, true, { fetcher: net.fetcher });
    assert.equal(account().status, "active");
    assert.equal(account().money_back_at, null);
    await applyPostCreatorMoneyBack(client, { stripe_session_id: MONTHLY_SESSION, email: "owner@example.com", kind: POST_CREATOR.monthlyKind }, false, { fetcher: net.fetcher });
    assert.equal(account().status, "active", "the overlap refund leaves the one payment plan open");
    await applyPostCreatorMoneyBack(client, { email: "owner@example.com", kind: CHASE_SHEET.lifetimeKind }, false);
    await applyPostCreatorMoneyBack(client, { email: "owner@example.com", kind: "pro_bundle" }, false);
    await applyPostCreatorMoneyBack(client, { email: null, kind: POST_CREATOR.lifetimeKind }, false);
    assert.equal(account().status, "active", "another product's refund does not touch Post Creator");
    assert.deepEqual(net.calls(), [], "a one payment refund cancels nothing in Stripe");
    await applyPostCreatorMoneyBack(fakeDb().client, { email: "nobody@example.com", kind: POST_CREATOR.monthlyKind }, false);
  });

  test("refunding a duplicate one payment purchase leaves the account the other one backs", async () => {
    const paid = (id: string, status = "paid") => ({ stripe_session_id: id, email: "owner@example.com", kind: POST_CREATOR.lifetimeKind, status });
    const S1 = "cs_test_duplicate_lifetime_1";
    const S2 = "cs_test_duplicate_lifetime_2";
    const { client, account } = fakeDb([accountRow({ plan: "lifetime", stripe_subscription_id: null, first_session_id: S1, last_session_id: S2 })], [paid(S1), paid(S2)]);
    await applyPostCreatorMoneyBack(client, paid(S2), false);
    assert.equal(account().status, "active", "S1 is still paid");
    assert.deepEqual(decideEntitlement(parseAccount(account())), { entitled: true, reason: "ok" });

    // The last paid one refunded (S1 already refunded): the plan closes.
    const last = fakeDb([accountRow({ plan: "lifetime", stripe_subscription_id: null, first_session_id: S1, last_session_id: S2 })], [paid(S1, "refunded"), paid(S2)]);
    await applyPostCreatorMoneyBack(last.client, paid(S2), false);
    assert.equal(last.account().status, "canceled");

    // A comp backs the account on its own.
    const comp = fakeDb([accountRow({ plan: "lifetime", stripe_subscription_id: null, first_session_id: "manual:comp", last_session_id: S2 })], [paid(S2)]);
    await applyPostCreatorMoneyBack(comp.client, paid(S2), false);
    assert.equal(comp.account().status, "active");

    // Money back on an old one payment charge never closes a monthly plan bought since.
    const moved = fakeDb([accountRow()], [paid(S1)]);
    await applyPostCreatorMoneyBack(moved.client, paid(S1), false);
    assert.equal(moved.account().status, "active");
  });

  test("money back on the current monthly subscription closes the plan, cancels it in Stripe, and nothing reopens it", async () => {
    const { client, account, tables } = fakeDb([accountRow({ stripe_event_at: 1_790_000_000 })]);
    const net = fakeNetwork({ paidInto: { in_renewal_month_3: "sub_old" } });
    const renewal = { stripe_session_id: "in_renewal_month_3", email: "owner@example.com", kind: POST_CREATOR.monthlyKind };
    const now = new Date(1_790_000_500 * 1000);
    await applyPostCreatorMoneyBack(client, renewal, false, { fetcher: net.fetcher, now });
    assert.equal(account().status, "canceled");
    assert.equal(account().money_back_at, now.toISOString());
    assert.equal(account().stripe_event_at, 1_790_000_500, "older events can no longer land");
    assert.deepEqual(net.calls(), ["GET invoices/in_renewal_month_3", "DELETE subscriptions/sub_old"]);
    assert.equal(net.resend.length, 1);
    assert.equal(net.resend[0].headers["Idempotency-Key"], `payment-${deliveryKey("sub_old", POST_CREATOR_PURPOSES.moneyBackInternal)}`);
    assert.deepEqual(JSON.parse(net.resend[0].body), moneyBackOwnerAlert({ email: "owner@example.com", subscriptionId: "sub_old" }));
    assert.equal(tables.payment_email_deliveries.length, 1);

    // The buyer cancels in the portal (or updates a card): Stripe says active. The plan stays closed.
    await handlePostCreatorSubscription(client, subEvent("customer.subscription.updated", 1_790_000_600, { status: "active", cancel_at_period_end: true }));
    assert.deepEqual(decideEntitlement(parseAccount(account())), { entitled: false, reason: "canceled" });
    await markPostCreatorRenewed(client, "sub_old", 1_790_000_700);
    assert.deepEqual(decideEntitlement(parseAccount(account())), { entitled: false, reason: "canceled" });

    // A dispute won opens it again.
    await applyPostCreatorMoneyBack(client, renewal, true, { fetcher: net.fetcher, now });
    assert.equal(account().money_back_at, null);
    assert.equal(decideEntitlement(parseAccount(account())).entitled, true);
  });

  test("money back on a subscription the account moved on from stops that one and leaves the plan alone", async () => {
    const { client, account } = fakeDb([accountRow({ stripe_subscription_id: "sub_new" })]);
    const net = fakeNetwork({ paidInto: { in_old_month: "sub_old" } });
    await applyPostCreatorMoneyBack(client, { stripe_session_id: "in_old_month", email: "owner@example.com", kind: POST_CREATOR.monthlyKind }, false, { fetcher: net.fetcher });
    assert.equal(account().status, "active");
    assert.equal(account().money_back_at, null);
    assert.deepEqual(net.calls(), ["GET invoices/in_old_month", "DELETE subscriptions/sub_old"]);
  });

  test("a Stripe lookup that fails throws, so the webhook retries with the purchase row unmoved", async () => {
    const { client, account } = fakeDb([accountRow()]);
    const down = (async () => new Response("down", { status: 500 })) as unknown as typeof fetch;
    await assert.rejects(
      applyPostCreatorMoneyBack(client, { stripe_session_id: "in_renewal", email: "owner@example.com", kind: POST_CREATOR.monthlyKind }, false, { fetcher: down }),
      /could not read invoices/,
    );
    assert.equal(account().status, "active");
  });

  test("money back on a subscription's first invoice is matched to the checkout that started it, then closes the plan", async () => {
    const seen: string[] = [];
    const stripe = (invoice: Row, sessions: Row[]) =>
      (async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = String(input).replace("https://api.stripe.com/v1/", "");
        seen.push(`${init.method ?? "GET"} ${url}`);
        if (url.startsWith("invoices/")) return Response.json(invoice);
        if (url.startsWith("checkout/sessions?")) return Response.json({ object: "list", data: sessions });
        if (url.startsWith("checkout/sessions/")) return Response.json({ id: MONTHLY_SESSION, subscription: "sub_old" });
        if (url.startsWith("subscriptions/")) return Response.json({ id: "sub_old", status: "canceled" });
        if (url === "https://api.resend.com/emails") return Response.json({ id: "re_mock_closed" });
        throw new Error(`unexpected ${url}`);
      }) as unknown as typeof fetch;
    const monthlyMeta = { kind: POST_CREATOR.monthlyKind };
    // Both Stripe API shapes for the subscription on an invoice.
    const first = { id: "in_first", billing_reason: "subscription_create", subscription: "sub_old", subscription_details: { metadata: monthlyMeta } };
    const firstBasil = { id: "in_first", billing_reason: "subscription_create", parent: { subscription_details: { subscription: "sub_old", metadata: monthlyMeta } } };
    const checkout = [{ id: MONTHLY_SESSION, metadata: monthlyMeta }];
    for (const invoice of [first, firstBasil]) {
      seen.length = 0;
      assert.equal(await postCreatorFirstInvoiceCheckout("in_first", stripe(invoice, checkout)), MONTHLY_SESSION);
      assert.deepEqual(seen, ["GET invoices/in_first", "GET checkout/sessions?subscription=sub_old&limit=1"]);
    }
    // A renewal, another product's first invoice, or a checkout for something else: not this path.
    assert.equal(await postCreatorFirstInvoiceCheckout("in_first", stripe({ ...first, billing_reason: "subscription_cycle" }, checkout)), null);
    assert.equal(await postCreatorFirstInvoiceCheckout("in_first", stripe({ ...first, subscription_details: { metadata: { kind: CHASE_SHEET.monthlyKind } } }, checkout)), null);
    assert.equal(await postCreatorFirstInvoiceCheckout("in_first", stripe(first, [{ id: MONTHLY_SESSION, metadata: { kind: CHASE_SHEET.monthlyKind } }])), null);
    assert.equal(await postCreatorFirstInvoiceCheckout("in_first", stripe(first, [])), null);
    assert.equal(await postCreatorFirstInvoiceCheckout("cs_not_an_invoice_1", stripe(first, checkout)), null);
    // A failed lookup throws, so the webhook answers 500 and Stripe retries.
    const down = (async () => new Response("down", { status: 500 })) as unknown as typeof fetch;
    await assert.rejects(postCreatorFirstInvoiceCheckout("in_first", down), /first invoice lookup failed/);
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(await postCreatorFirstInvoiceCheckout("in_first", stripe(first, checkout)), null);
    process.env.STRIPE_SECRET_KEY = "sk_test_mock_only";

    // The checkout's row then closes the plan and cancels the subscription it paid into.
    const { client, account } = fakeDb([accountRow()]);
    seen.length = 0;
    await applyPostCreatorMoneyBack(client, { stripe_session_id: MONTHLY_SESSION, email: "owner@example.com", kind: POST_CREATOR.monthlyKind }, false, { fetcher: stripe(first, checkout) });
    assert.equal(account().status, "canceled");
    assert.ok(account().money_back_at);
    assert.deepEqual(seen, [`GET checkout/sessions/${MONTHLY_SESSION}`, "DELETE subscriptions/sub_old", "POST https://api.resend.com/emails"], "the owner is told it closed");
  });
});

/* ---------------------------------- emails --------------------------------- */

describe("emails", () => {
  const key = "LFP-ABCD-EFGH-JKMN-PQRS";
  const all: [string, ResendPayload][] = [
    ["buyerReceipt monthly", buyerReceipt({ email: "owner+test@example.com", plan: "monthly", key })],
    ["buyerReceipt lifetime", buyerReceipt({ email: "owner+test@example.com", plan: "lifetime", key })],
    ["ownerSaleAlert monthly", ownerSaleAlert({ email: "owner@example.com", plan: "monthly", sessionId: MONTHLY_SESSION })],
    ["ownerSaleAlert lifetime", ownerSaleAlert({ email: "owner@example.com", plan: "lifetime", sessionId: LIFETIME_SESSION })],
    ["overlapBuyerNotice", overlapBuyerNotice({ email: "owner@example.com" })],
    ["overlapOwnerAlert", overlapOwnerAlert({ email: "owner@example.com", sessionId: MONTHLY_SESSION, subscriptionId: "sub_new" })],
    ["endedMonthlyOwnerAlert", endedMonthlyOwnerAlert({ email: "owner@example.com", sessionId: LIFETIME_SESSION, subscriptionId: "sub_old" })],
    ["subscriptionEndedOwnerAlert", subscriptionEndedOwnerAlert({ email: "owner@example.com", subscriptionId: "sub_old" })],
    ["keyResendEmail", keyResendEmail({ email: "owner+test@example.com", key })],
    ["replacedMonthlyBuyerNotice", replacedMonthlyBuyerNotice({ email: "owner@example.com" })],
    ["replacedMonthlyOwnerAlert", replacedMonthlyOwnerAlert({ email: "owner@example.com", sessionId: MONTHLY_SESSION, subscriptionId: "sub_old" })],
    ["moneyBackOwnerAlert", moneyBackOwnerAlert({ email: "owner@example.com", subscriptionId: "sub_old" })],
  ];

  test("every email passes the copy rules and never says whether an account was new", () => {
    for (const [name, p] of all) {
      assert.deepEqual(copyProblems(`${p.subject}\n${p.text}`), [], name);
      assert.ok(!/[\u2013\u2014]/.test(`${p.subject}${p.text}`), `${name} has no long dash`);
      assert.ok(!/created|new account|existing account/i.test(`${p.subject}${p.text}`), `${name} has no created wording`);
      assert.ok(!/undefined|null|NaN/.test(p.text), `${name} has no unrendered value`);
    }
  });

  test("buyer mail is from Ryan with replies to the inbox; owner mail goes to the inbox", () => {
    const buyer = new Set(["buyerReceipt monthly", "buyerReceipt lifetime", "overlapBuyerNotice", "keyResendEmail", "replacedMonthlyBuyerNotice"]);
    for (const [name, p] of all) {
      if (buyer.has(name)) {
        assert.equal(p.from, `${BUSINESS.operator} <${BUSINESS.email.hello}>`, name);
        assert.equal(p.reply_to, BUSINESS.email.hello, name);
        assert.notDeepEqual(p.to, [BUSINESS.email.hello], name);
      } else {
        assert.equal(p.from, `${BUSINESS.name} <${BUSINESS.email.hello}>`, name);
        assert.deepEqual(p.to, [BUSINESS.email.hello], name);
        assert.equal(p.reply_to, undefined, name);
        assert.ok(p.text.endsWith(`Purchases: ${BUSINESS.siteUrl}/admin/purchases`), name);
      }
    }
  });

  test("the receipt carries the key, both links, the plan terms, and who posts", () => {
    const monthly = buyerReceipt({ email: "owner+test@example.com", plan: "monthly", key });
    const lifetime = buyerReceipt({ email: "owner+test@example.com", plan: "lifetime", key });
    assert.equal(monthly.subject, "Your Post Creator key and how to open it");
    for (const r of [monthly, lifetime]) {
      assert.ok(r.text.startsWith("Post Creator is yours.\n\n"));
      assert.ok(r.text.includes("Nothing is posted for you. You read every draft and you post it yourself."));
      assert.ok(r.text.includes(`Open Post Creator: ${BUSINESS.siteUrl}${POST_CREATOR.appPath}\n`));
      assert.ok(r.text.includes(`${POST_CREATOR.appPath}?email=owner%2Btest%40example.com&key=${encodeURIComponent(key)}`));
      assert.ok(r.text.endsWith(`${BUSINESS.operator}\n${BUSINESS.name}\n${BUSINESS.phone.display}`));
      assert.ok(!r.text.includes("\n\n\n"), "no double blank lines");
    }
    assert.ok(monthly.text.includes(`Plan: ${POST_CREATOR.monthlyLabel}. It renews on the same date each month`));
    assert.ok(monthly.text.includes(aiCapLine("monthly")));
    assert.ok(!monthly.text.includes("not charged for both"));
    assert.ok(lifetime.text.includes(`Plan: ${POST_CREATOR.lifetimeLabel}. Nothing renews and there is nothing to cancel.`));
    assert.ok(lifetime.text.includes(aiCapLine("lifetime")));
    assert.ok(lifetime.text.includes("so you are not charged for both."));
    // True whether the monthly plan was running (it ends with its paid month) or past due (it is cancelled now).
    assert.ok(lifetime.text.includes("stops any monthly Post Creator plan on this email from renewing"));
    assert.ok(!lifetime.text.includes("at the close of its paid month"));
    // The pauses and the off-for-good promise match the terms, on both plans.
    for (const r of [monthly, lifetime]) {
      assert.ok(r.text.includes(AI_PAUSE_LINE) && r.text.includes(AI_OFF_FOR_GOOD_LINE));
      assert.ok(!r.text.includes("works only while it is switched on"));
    }
    const terms = readFileSync(new URL("../app/post-creator/terms/page.tsx", import.meta.url), "utf8").replace(/\s+/g, " ");
    assert.ok(terms.includes("Switching AI writing off for good would count as discontinuing"));
    assert.ok(terms.includes("at least 90 days&apos; notice by email"));
    assert.equal(ownerSaleAlert({ email: "a@example.com", plan: "lifetime", sessionId: LIFETIME_SESSION }).subject, "💰 POST CREATOR ONE PAYMENT: a@example.com");
    assert.equal(keyResendEmail({ email: "a@example.com", key }).subject, "Your Post Creator key");
  });

  test("every builder is deterministic", () => {
    const again: ResendPayload[] = [
      buyerReceipt({ email: "owner+test@example.com", plan: "monthly", key }),
      buyerReceipt({ email: "owner+test@example.com", plan: "lifetime", key }),
      ownerSaleAlert({ email: "owner@example.com", plan: "monthly", sessionId: MONTHLY_SESSION }),
      ownerSaleAlert({ email: "owner@example.com", plan: "lifetime", sessionId: LIFETIME_SESSION }),
      overlapBuyerNotice({ email: "owner@example.com" }),
      overlapOwnerAlert({ email: "owner@example.com", sessionId: MONTHLY_SESSION, subscriptionId: "sub_new" }),
      endedMonthlyOwnerAlert({ email: "owner@example.com", sessionId: LIFETIME_SESSION, subscriptionId: "sub_old" }),
      subscriptionEndedOwnerAlert({ email: "owner@example.com", subscriptionId: "sub_old" }),
      keyResendEmail({ email: "owner+test@example.com", key }),
      replacedMonthlyBuyerNotice({ email: "owner@example.com" }),
      replacedMonthlyOwnerAlert({ email: "owner@example.com", sessionId: MONTHLY_SESSION, subscriptionId: "sub_old" }),
      moneyBackOwnerAlert({ email: "owner@example.com", subscriptionId: "sub_old" }),
    ];
    assert.equal(JSON.stringify(again), JSON.stringify(all.map(([, p]) => p)));
  });

  test("the purposes are unique and namespaced", () => {
    const values = Object.values(POST_CREATOR_PURPOSES);
    assert.equal(new Set(values).size, values.length);
    for (const v of values) assert.match(v, /^post-creator:[a-z:-]+$/);
  });
});

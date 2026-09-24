import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as proAccess from "../lib/proAccess.ts";
import {
  POST_CREATOR_COOKIE,
  bucketFor,
  identityFor,
  postCreatorLicenseKey,
  signIdentity,
  verifyIdentity,
} from "../lib/postCreator/access.ts";
import { keyResendEmail } from "../lib/postCreator/emails.ts";
import { POST_CREATOR } from "../lib/postCreator/product.ts";
import { BUSINESS } from "../lib/site/business.ts";

// The account routes under /api/post-creator, run for real inside a vm
// context: the route files and every lib module they import are transpiled
// and loaded fresh per harness, with Stripe, Resend, Supabase, and the cookie
// store replaced by in-memory fakes. No network is touched.

const nativeRequire = createRequire(import.meta.url);
const ORIGIN = BUSINESS.siteUrl;
const APP = `${BUSINESS.siteUrl}${POST_CREATOR.appPath}`;
const SIGNER = "post-creator-test-signer";
const BUYER = "buyer@example.test";
const SESSION = "cs_test_postcreator_new_0001";
const OLD_SESSION = "cs_test_postcreator_old_0000";
const IP = "203.0.113.9";
const PORTAL = "https://billing.stripe.com/p/session/test_mock";

const BASE_ENV: Record<string, string | undefined> = {
  NODE_ENV: "production",
  STRIPE_SECRET_KEY: "sk_test_local_mock_only",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-mock-only",
  POST_CREATOR_SECRET: SIGNER,
  RESEND_API_KEY: "re_mock_only",
};

type Row = Record<string, unknown>;
type Filter = [op: "eq" | "is" | "lte", column: string, value: unknown];

/** Copies a value out of the vm realm, so deepEqual compares plain objects. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** A post_creator_accounts row as the database returns it. */
function account(over: Row = {}): Row {
  return {
    email: BUYER,
    plan: "lifetime",
    status: "active",
    stripe_customer_id: "cus_TestCustomer1",
    stripe_subscription_id: null,
    first_session_id: OLD_SESSION,
    last_session_id: OLD_SESSION,
    first_claimed_at: "2026-09-01T12:00:00.000Z",
    access_epoch: 0,
    current_period_end: null,
    cancel_at: null,
    stripe_event_at: 0,
    stripe_synced_at: null,
    profile: {},
    created_at: new Date().toISOString(),
    ...over,
  };
}

/** A monthly plan whose card failed more than the grace period ago, checked against Stripe just now. */
function lapsedMonthly(over: Row = {}): Row {
  return account({
    plan: "monthly",
    status: "past_due",
    stripe_subscription_id: "sub_TestSubscription1",
    current_period_end: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    stripe_synced_at: new Date().toISOString(),
    ...over,
  });
}

/** A paid one payment checkout, created two minutes ago. */
function paidSession(over: Row = {}): Row {
  return {
    id: SESSION,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "usd",
    amount_total: POST_CREATOR.lifetimeUsd * 100,
    amount_subtotal: POST_CREATOR.lifetimeUsd * 100,
    metadata: { kind: POST_CREATOR.lifetimeKind, plan: "lifetime" },
    customer: "cus_TestCustomer1",
    subscription: null,
    customer_details: { email: "Buyer@Example.test" },
    created: Math.floor(Date.now() / 1000) - 120,
    ...over,
  };
}

/** lib/proAccess.ts proAccessSecrets, read from the harness env instead of the test process. */
function secretsFrom(env: Record<string, string | undefined>): string[] {
  const out: string[] = [];
  for (const raw of [env.PRO_TOOLS_SECRET, env.UNSUBSCRIBE_SECRET, env.SUPABASE_SERVICE_ROLE_KEY]) {
    const s = raw?.trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

function cookieFor(email = BUYER, epoch = 0): string {
  return signIdentity(identityFor(email, epoch), SIGNER);
}

/** The lfp_post_creator value a response sets, or null when it sets none. */
function setCookieToken(res: Response): string | null {
  const match = new RegExp(`${POST_CREATOR_COOKIE}=([^;]*)`).exec(res.headers.get("set-cookie") ?? "");
  return match ? match[1] : null;
}

type HarnessOptions = {
  env?: Record<string, string | undefined>;
  accounts?: Row[];
  cookie?: string;
  stripe?: unknown;
  stripeStatus?: number;
  stripeDown?: boolean;
  portalStatus?: number;
  resendStatus?: number;
  /** Hits already on a rate limit bucket this window. */
  hits?: Record<string, number>;
  /** RPC names that answer with a database error. */
  failRpc?: string[];
  /** post_creator_accounts reads and writes answer with a database error. */
  failAccounts?: boolean;
};

function harness(o: HarnessOptions = {}) {
  const env = { ...(o.env ?? BASE_ENV) };
  let cookie = o.cookie;
  const accounts = new Map<string, Row>((o.accounts ?? []).map((row) => [String(row.email), { ...row }]));
  const hits = new Map<string, number>(Object.entries(o.hits ?? {}));
  const rpcs: { name: string; args: Row }[] = [];
  const updates: { patch: Row; filters: Filter[] }[] = [];
  const requests: { url: string; method: string; body: string }[] = [];
  const logs: string[] = [];
  const dbError = { message: "simulated database outage", code: "XX000" };
  // Work a route hands to next/server after(): it runs only when the test says so.
  const afterQueue: (() => unknown)[] = [];
  // The checkouts already applied (post_creator_checkouts). Seeded rows were
  // applied by their own checkouts.
  const applied = new Set<string>((o.accounts ?? []).flatMap((row) => [String(row.first_session_id), String(row.last_session_id)]));

  // post_creator_record_purchase, in miniature: a new email gets a row made
  // by this session; a different checkout on an existing email bumps the
  // epoch; a checkout applied before changes nothing, and finds no account
  // when that account was deleted since.
  function recordPurchase(a: Row): Row {
    const email = String(a.p_email);
    const session = String(a.p_session_id);
    let row = accounts.get(email);
    if (applied.has(session) && !row) return { created: false, created_by_this_session: false, account: null };
    applied.add(session);
    if (!row) {
      row = account({
        email,
        plan: a.p_plan,
        first_session_id: session,
        last_session_id: session,
        first_claimed_at: null,
        stripe_customer_id: a.p_customer_id,
        stripe_subscription_id: a.p_plan === "monthly" ? a.p_subscription_id : null,
        stripe_event_at: a.p_event_at,
      });
      accounts.set(email, row);
      return { created: true, created_by_this_session: true, account: { ...row } };
    }
    if (row.last_session_id !== session && row.first_session_id !== session) {
      if (a.p_plan === "lifetime") row.plan = "lifetime";
      row.last_session_id = session;
      row.access_epoch = Number(row.access_epoch) + 1;
    }
    return { created: false, created_by_this_session: row.first_session_id === session, account: { ...row } };
  }

  // The supabase-js chain the account functions use: select/update, eq/is
  // filters, then maybeSingle() or an await on the chain itself.
  function query() {
    let patch: Row | null = null;
    let returning = false;
    const filters: Filter[] = [];
    const run = (): { data: Row[] | null; error: typeof dbError | null } => {
      if (o.failAccounts) return { data: null, error: dbError };
      const rows = [...accounts.values()].filter((row) =>
        filters.every(([op, column, value]) =>
          op === "is" ? row[column] == null && value === null : op === "lte" ? Number(row[column]) <= Number(value) : row[column] === value,
        ),
      );
      if (patch) {
        updates.push({ patch, filters: [...filters] });
        for (const row of rows) Object.assign(row, patch);
        return { data: returning ? rows.map((row) => ({ ...row })) : null, error: null };
      }
      return { data: rows.map((row) => ({ ...row })), error: null };
    };
    const chain = {
      select: () => {
        if (patch) returning = true;
        return chain;
      },
      update: (next: Row) => {
        patch = plain(next);
        return chain;
      },
      eq: (column: string, value: unknown) => {
        filters.push(["eq", column, value]);
        return chain;
      },
      is: (column: string, value: unknown) => {
        filters.push(["is", column, value]);
        return chain;
      },
      lte: (column: string, value: unknown) => {
        filters.push(["lte", column, value]);
        return chain;
      },
      limit: () => chain,
      maybeSingle: async () => {
        const r = run();
        return { data: r.data?.[0] ?? null, error: r.error };
      },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return chain;
  }

  const fakeDb = {
    from: (table: string) => {
      assert.equal(table, "post_creator_accounts");
      return query();
    },
    rpc: async (name: string, args: Row) => {
      rpcs.push({ name, args: plain(args) });
      if ((o.failRpc ?? []).includes(name)) return { data: null, error: dbError };
      if (name === "post_creator_record_purchase") return { data: recordPurchase(plain(args)), error: null };
      if (name === "post_creator_hit") {
        const bucket = String(args.p_bucket);
        const count = (hits.get(bucket) ?? 0) + 1;
        hits.set(bucket, count);
        return { data: count <= Number(args.p_limit), error: null };
      }
      if (name === "post_creator_usage") {
        return { data: { day: "2026-09-24", month: "2026-09", used_day: 2, used_month: 12, tries_day: 3, tries_month: 14 }, error: null };
      }
      throw new Error(`unexpected rpc ${name}`);
    },
  };

  async function fakeFetch(input: string, init: { method?: string; body?: unknown } = {}) {
    const url = String(input);
    const method = init.method ?? "GET";
    requests.push({ url, method, body: String(init.body ?? "") });
    if (url.startsWith("https://api.resend.com/")) return Response.json({ id: "mock-email-id" }, { status: o.resendStatus ?? 200 });
    if (url.startsWith("https://api.stripe.com/v1/checkout/sessions/")) {
      if (o.stripeDown) throw new Error("simulated Stripe outage");
      return Response.json(o.stripe ?? paidSession(), { status: o.stripeStatus ?? 200 });
    }
    if (url === "https://api.stripe.com/v1/billing_portal/sessions") {
      const status = o.portalStatus ?? 200;
      return Response.json(status === 200 ? { url: PORTAL } : { error: { message: "No configuration" } }, { status });
    }
    throw new Error(`unexpected fetch ${method} ${url}`);
  }

  const stubs: Record<string, unknown> = {
    "server-only": {},
    "next/headers": {
      cookies: async () => ({ get: (name: string) => (name === POST_CREATOR_COOKIE && cookie ? { value: cookie } : undefined) }),
    },
    "@supabase/supabase-js": { createClient: () => fakeDb },
    "next/server": { ...nativeRequire("next/server"), after: (task: () => unknown) => void afterQueue.push(task) },
    // lib/proAccess.ts imports ./tools/pro, a directory the resolver below
    // cannot load, so the natively imported module stands in. Its fallback
    // signers come from this harness's env, not the test process's.
    "../proAccess": { ...proAccess, proAccessSecrets: () => secretsFrom(env) },
  };

  const modules = new Map<string, { exports: Record<string, any> }>();
  function load(file: string): Record<string, any> {
    const full = path.resolve(file);
    const cached = modules.get(full);
    if (cached) return cached.exports;
    const loaded = { exports: {} as Record<string, any> };
    modules.set(full, loaded);
    const code = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name: string) => {
      if (Object.prototype.hasOwnProperty.call(stubs, name)) return stubs[name];
      if (name.startsWith("@/")) return load(path.join(process.cwd(), `${name.slice(2)}.ts`));
      if (name.startsWith(".")) return load(path.resolve(path.dirname(full), `${name}.ts`));
      return nativeRequire(name);
    };
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
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
      clearTimeout,
      console: {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      },
      process: { env },
      fetch: fakeFetch,
    })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }

  function route(name: string) {
    return load(`app/api/post-creator/${name}/route.ts`);
  }

  function request(
    name: string,
    init: { method?: string; body?: unknown; raw?: string; origin?: string | null; ip?: string } = {},
  ): Request {
    const headers: Record<string, string> = { "Content-Type": "application/json", "x-forwarded-for": `${init.ip ?? IP}, 10.0.0.1` };
    if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
    const body = init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body));
    return new Request(`${ORIGIN}/api/post-creator/${name}`, { method: init.method ?? "POST", headers, body });
  }

  async function claim(sessionId: string | null = SESSION): Promise<Response> {
    const query = sessionId === null ? "" : `?session_id=${encodeURIComponent(sessionId)}`;
    return route("claim").GET(new Request(`${ORIGIN}/api/post-creator/claim${query}`, { headers: { "x-forwarded-for": `${IP}, 10.0.0.1` } }));
  }

  /** Runs the work routes handed to after(), the way Next.js does once the answer has gone out. */
  async function runAfter(): Promise<void> {
    while (afterQueue.length) await afterQueue.shift()?.();
  }

  return {
    env,
    accounts,
    hits,
    rpcs,
    updates,
    requests,
    logs,
    route,
    request,
    claim,
    runAfter,
    pendingAfter: () => afterQueue.length,
    setCookie: (value: string | undefined) => {
      cookie = value;
    },
  };
}

function assertNote(res: Response, code: string) {
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), `${APP}?claim=${code}`);
  assert.equal(res.headers.get("set-cookie"), null, `claim=${code} must not set a cookie`);
  assert.match(res.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
}

async function errorOf(res: Response): Promise<{ ok: boolean; code: string; error: string; field?: string }> {
  return (await res.json()) as { ok: boolean; code: string; error: string; field?: string };
}

/* ----------------------------------- claim ---------------------------------- */

test("claim signs in the browser that bought a brand new account", async () => {
  const session = paidSession();
  const h = harness({ stripe: session });
  const res = await h.claim();
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), `${APP}?welcome=1`);
  assert.match(res.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.equal(res.headers.get("x-robots-tag"), "noindex");

  const header = res.headers.get("set-cookie") ?? "";
  assert.match(header, new RegExp(`^${POST_CREATOR_COOKIE}=`));
  assert.match(header, /HttpOnly/i);
  assert.match(header, /Secure/i);
  assert.match(header, /SameSite=lax/i);
  assert.match(header, /Path=\//);
  const identity = verifyIdentity(setCookieToken(res), [SIGNER]);
  assert.equal(identity?.e, BUYER);
  assert.equal(identity?.n, 0);

  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, `https://api.stripe.com/v1/checkout/sessions/${SESSION}`);
  const record = h.rpcs.find((c) => c.name === "post_creator_record_purchase");
  assert.deepEqual(record?.args, {
    p_email: BUYER,
    p_plan: "lifetime",
    p_session_id: SESSION,
    p_customer_id: "cus_TestCustomer1",
    p_subscription_id: null,
    p_event_at: session.created,
  });

  // The claim is marked in the database, guarded by the creating checkout
  // and an empty first_claimed_at.
  const row = h.accounts.get(BUYER);
  assert.equal(row?.first_session_id, SESSION);
  assert.equal(typeof row?.first_claimed_at, "string");
  const marked = h.updates.find((u) => "first_claimed_at" in u.patch);
  assert.ok(marked);
  assert.ok(marked.filters.some(([op, column, value]) => op === "eq" && column === "first_session_id" && value === SESSION));
  assert.ok(marked.filters.some(([op, column, value]) => op === "is" && column === "first_claimed_at" && value === null));
});

test("claim signs in a new monthly buyer with the subscription on record", async () => {
  const monthly = paidSession({
    mode: "subscription",
    amount_total: POST_CREATOR.monthlyUsd * 100,
    amount_subtotal: POST_CREATOR.monthlyUsd * 100,
    metadata: { kind: POST_CREATOR.monthlyKind, plan: "monthly" },
    subscription: "sub_TestSubscription1",
  });
  const h = harness({ stripe: monthly });
  const res = await h.claim();
  assert.equal(res.headers.get("location"), `${APP}?welcome=1`);
  assert.equal(verifyIdentity(setCookieToken(res), [SIGNER])?.e, BUYER);
  assert.equal(h.accounts.get(BUYER)?.plan, "monthly");
  assert.equal(h.accounts.get(BUYER)?.stripe_subscription_id, "sub_TestSubscription1");
});

test("claim never sets a cookie on an email that already had an account", async () => {
  for (const existing of [account(), account({ first_claimed_at: null })]) {
    const h = harness({ accounts: [existing] });
    const res = await h.claim();
    assertNote(res, "existing");
    // The later checkout signs every device out; the emailed key opens it again.
    assert.equal(h.accounts.get(BUYER)?.access_epoch, 1);
    assert.equal(h.accounts.get(BUYER)?.first_session_id, OLD_SESSION);
    assert.equal(h.updates.length, 0);
  }
});

test("a replayed claim link opens nothing the second time", async () => {
  const h = harness();
  const first = await h.claim();
  assert.equal(first.headers.get("location"), `${APP}?welcome=1`);
  assert.ok(setCookieToken(first));
  const again = await h.claim();
  assertNote(again, "used");
  assert.equal(h.accounts.get(BUYER)?.access_epoch, 0);
});

test("two tabs racing the same claim link sign in exactly once", async () => {
  const h = harness();
  const answers = await Promise.all([h.claim(), h.claim(), h.claim()]);
  const signedIn = answers.filter((res) => setCookieToken(res) !== null);
  assert.equal(signedIn.length, 1);
  for (const res of answers) {
    if (setCookieToken(res) === null) assertNote(res, "used");
  }
});

test("a claim after a later checkout never signs in at the old epoch", async () => {
  // The creating checkout never arrived, then a second checkout on the same
  // email bumped the epoch. Whether the first link may still sign in is the
  // data layer's call (claimFirstCookie); a cookie at the old epoch never is.
  const h = harness({ accounts: [account({ first_session_id: SESSION, last_session_id: OLD_SESSION, first_claimed_at: null, access_epoch: 1 })] });
  const res = await h.claim();
  const token = setCookieToken(res);
  if (token === null) assertNote(res, "used");
  else assert.equal(verifyIdentity(token, [SIGNER])?.n, 1);
});

test("a claim more than a day old, dated ahead, or with no date is expired", async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const created of [now - 25 * 3600, now + 600, undefined]) {
    const h = harness({ stripe: paidSession({ created }) });
    assertNote(await h.claim(), "expired");
    // The account is still recorded; only the browser is not signed in.
    assert.equal(h.accounts.get(BUYER)?.first_session_id, SESSION);
    assert.equal(h.accounts.get(BUYER)?.first_claimed_at, null);
  }
});

test("claim answers missing, notfound, unpaid, and unavailable without a cookie", async () => {
  for (const id of [null, "", "cs_short", "pi_1234567890abcdef", `cs_${"a".repeat(201)}`, "cs_test_abcdefgh?x=1"]) {
    const h = harness();
    assertNote(await h.claim(id), "missing");
    assert.equal(h.requests.length, 0);
  }

  assertNote(await harness({ stripeStatus: 404 }).claim(), "notfound");
  assertNote(await harness({ stripe: paidSession({ id: "cs_test_someone_else_0001" }) }).claim(), "notfound");
  assertNote(await harness({ stripe: paidSession({ amount_total: 100, amount_subtotal: 100 }) }).claim(), "notfound");
  assertNote(await harness({ stripe: paidSession({ metadata: { kind: "chase_sheet_lifetime" } }) }).claim(), "notfound");
  assertNote(await harness({ stripe: paidSession({ customer_details: null, customer_email: null }) }).claim(), "notfound");

  assertNote(await harness({ stripe: paidSession({ payment_status: "unpaid" }) }).claim(), "unpaid");

  for (const missing of ["STRIPE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const h = harness({ env: { ...BASE_ENV, [missing]: "" } });
    assertNote(await h.claim(), "unavailable");
    assert.equal(h.requests.length, 0);
  }
  const noSigner = harness({ env: { ...BASE_ENV, POST_CREATOR_SECRET: "", SUPABASE_SERVICE_ROLE_KEY: "" } });
  assertNote(await noSigner.claim(), "unavailable");
  assertNote(await harness({ stripeDown: true }).claim(), "unavailable");

  const dbDown = harness({ failRpc: ["post_creator_record_purchase"] });
  assertNote(await dbDown.claim(), "unavailable");
  assert.ok(dbDown.logs.some((l) => l.startsWith("Post Creator claim could not record the account:")));
  assert.ok(dbDown.logs.every((l) => !l.includes(BUYER)));

  const claimDown = harness({ failAccounts: true });
  assertNote(await claimDown.claim(), "unavailable");
});

test("claim counts every arrival against the connection before it asks Stripe", async () => {
  const h = harness();
  await h.claim();
  const hit = h.rpcs.find((c) => c.name === "post_creator_hit");
  assert.deepEqual(hit?.args, { p_bucket: bucketFor("claim-ip", IP), p_window_seconds: 3600, p_limit: 30 });

  // A script looping random session ids stops costing Stripe calls.
  const flood = harness({ hits: { [bucketFor("claim-ip", IP)]: 30 } });
  for (let i = 0; i < 5; i++) assertNote(await flood.claim(`cs_live_random_${String(i).padStart(8, "0")}`), "unavailable");
  assert.equal(flood.requests.length, 0);

  // A limit that cannot be checked fails closed.
  const down = harness({ failRpc: ["post_creator_hit"] });
  assertNote(await down.claim(), "unavailable");
  assert.equal(down.requests.length, 0);
});

test("a claim link never swaps the account a browser is already signed in to", async () => {
  const other = "victim@example.test";
  const h = harness({ accounts: [account({ email: other, access_epoch: 4 })], cookie: cookieFor(other, 4) });
  const res = await h.claim();
  assertNote(res, "other_account");
  // The link is not spent, so its real owner can still open it after signing out.
  assert.equal(h.accounts.get(BUYER)?.first_claimed_at, null);
  h.setCookie(undefined);
  const later = await h.claim();
  assert.equal(later.headers.get("location"), `${APP}?welcome=1`);
  assert.equal(verifyIdentity(setCookieToken(later), [SIGNER])?.e, BUYER);

  // A signed-out cookie (stale epoch), or one for the same email, is simply replaced.
  const stale = harness({ accounts: [account({ email: other, access_epoch: 5 })], cookie: cookieFor(other, 4) });
  assert.equal((await stale.claim()).headers.get("location"), `${APP}?welcome=1`);
  const same = harness({ cookie: cookieFor(BUYER, 9) });
  assert.equal((await same.claim()).headers.get("location"), `${APP}?welcome=1`);
});

test("a checkout applied before an account was deleted on request opens nothing", async () => {
  const h = harness();
  assert.equal((await h.claim()).headers.get("location"), `${APP}?welcome=1`);
  h.accounts.clear();
  h.setCookie(undefined);
  assertNote(await h.claim(), "notfound");
  assert.equal(h.accounts.size, 0, "the account is not brought back");
});

/* ---------------------------------- restore --------------------------------- */

test("restore with a matching key signs in at the account's epoch", async () => {
  const h = harness({ accounts: [account({ access_epoch: 2 })] });
  const key = postCreatorLicenseKey(BUYER, SIGNER);
  const res = await h.route("restore").POST(h.request("restore", { body: { email: " Buyer@Example.test ", key: key.toLowerCase() } }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, next: POST_CREATOR.appPath });
  assert.match(res.headers.get("cache-control") ?? "", /private, no-store/);
  const identity = verifyIdentity(setCookieToken(res), [SIGNER]);
  assert.equal(identity?.e, BUYER);
  assert.equal(identity?.n, 2);
  // The try was counted against this connection, never against the raw IP.
  const hit = h.rpcs.find((c) => c.name === "post_creator_hit");
  assert.deepEqual(hit?.args, { p_bucket: bucketFor("restore-ip", IP), p_window_seconds: 3600, p_limit: 30 });
});

test("restore refuses a wrong key, an unknown account, and too many tries", async () => {
  const other = postCreatorLicenseKey("someone@example.test", SIGNER);
  const wrong = harness({ accounts: [account()] });
  const mismatch = await wrong.route("restore").POST(wrong.request("restore", { body: { email: BUYER, key: other } }));
  assert.equal(mismatch.status, 403);
  assert.equal((await errorOf(mismatch)).code, "key_mismatch");
  assert.equal(setCookieToken(mismatch), null);

  const none = harness();
  const missing = await none.route("restore").POST(none.request("restore", { body: { email: BUYER, key: postCreatorLicenseKey(BUYER, SIGNER) } }));
  assert.equal(missing.status, 404);
  assert.equal((await errorOf(missing)).code, "not_found");
  assert.equal(setCookieToken(missing), null);

  const busy = harness({ accounts: [account()], hits: { [bucketFor("restore-ip", IP)]: 30 } });
  const limited = await busy.route("restore").POST(busy.request("restore", { body: { email: BUYER, key: postCreatorLicenseKey(BUYER, SIGNER) } }));
  assert.equal(limited.status, 429);
  assert.equal((await errorOf(limited)).code, "too_many_tries");
  assert.equal(setCookieToken(limited), null);

  const down = harness({ accounts: [account()], failRpc: ["post_creator_hit"] });
  const closed = await down.route("restore").POST(down.request("restore", { body: { email: BUYER, key: postCreatorLicenseKey(BUYER, SIGNER) } }));
  assert.equal(closed.status, 503);
  assert.equal(setCookieToken(closed), null);
});

test("a raised key version revokes the old key; the new one opens it and is the one emailed", async () => {
  const h = harness({ accounts: [account({ key_version: 1, access_epoch: 5 })] });
  const oldKey = postCreatorLicenseKey(BUYER, SIGNER);
  const newKey = postCreatorLicenseKey(BUYER, SIGNER, 1);
  const refused = await h.route("restore").POST(h.request("restore", { body: { email: BUYER, key: oldKey } }));
  assert.equal(refused.status, 403);
  assert.equal((await errorOf(refused)).code, "key_mismatch");
  assert.equal(setCookieToken(refused), null);
  const opened = await h.route("restore").POST(h.request("restore", { body: { email: BUYER, key: newKey } }));
  assert.equal(opened.status, 200);
  assert.equal(verifyIdentity(setCookieToken(opened), [SIGNER])?.n, 5);
  // "Email me my key" sends the new key.
  await h.route("restore").POST(h.request("restore", { body: { email: BUYER } }));
  await h.runAfter();
  const sent = h.requests.filter((r) => r.url === "https://api.resend.com/emails");
  assert.equal(sent.length, 1);
  assert.deepEqual(JSON.parse(sent[0].body), keyResendEmail({ email: BUYER, key: newKey }));
  assert.ok(!sent[0].body.includes(oldKey));
});

test("restore with only an email sends the key once and answers the same either way", async () => {
  const h = harness({ accounts: [account()] });
  const res = await h.route("restore").POST(h.request("restore", { body: { email: BUYER } }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, sent: true });
  assert.equal(setCookieToken(res), null);
  // The answer went out before the account was even looked up.
  assert.equal(h.requests.length, 0);
  assert.equal(h.pendingAfter(), 1);
  await h.runAfter();
  const sent = h.requests.filter((r) => r.url === "https://api.resend.com/emails");
  assert.equal(sent.length, 1);
  assert.deepEqual(JSON.parse(sent[0].body), keyResendEmail({ email: BUYER, key: postCreatorLicenseKey(BUYER, SIGNER) }));
  const buckets = h.rpcs.filter((c) => c.name === "post_creator_hit").map((c) => c.args);
  assert.deepEqual(buckets, [
    { p_bucket: bucketFor("resend-email", BUYER), p_window_seconds: 3600, p_limit: 3 },
    { p_bucket: bucketFor("resend-ip", IP), p_window_seconds: 3600, p_limit: 10 },
  ]);

  // No account: the same answer, and nothing is sent.
  const stranger = harness();
  const quiet = await stranger.route("restore").POST(stranger.request("restore", { body: { email: "nobody@example.test" } }));
  assert.deepEqual(await quiet.json(), { ok: true, sent: true });
  await stranger.runAfter();
  assert.equal(stranger.requests.length, 0);
});

test("restore by email answers a buyer and a stranger alike even when the send fails", async () => {
  const answers: { status: number; body: string }[] = [];
  for (const [email, accounts] of [
    [BUYER, [account()]],
    ["nobody2@example.test", []],
  ] as const) {
    const h = harness({ accounts: [...accounts], resendStatus: 500 });
    const res = await h.route("restore").POST(h.request("restore", { body: { email } }));
    answers.push({ status: res.status, body: await res.text() });
    // Neither answer waited on the lookup or on Resend.
    assert.equal(h.requests.length, 0);
    await h.runAfter();
    if (email === BUYER) {
      assert.equal(h.requests.length, 1, "the send was tried");
      assert.ok(h.logs.some((l) => l.startsWith("Post Creator key email failed:")));
      assert.ok(h.logs.every((l) => !l.includes(BUYER)));
    }
  }
  assert.deepEqual(answers[0], answers[1]);
  assert.deepEqual(answers[0], { status: 200, body: JSON.stringify({ ok: true, sent: true }) });
});

test("restore by email does not send once a limit is hit", async () => {
  for (const hits of [{ [bucketFor("resend-email", BUYER)]: 3 }, { [bucketFor("resend-ip", IP)]: 10 }]) {
    const h = harness({ accounts: [account()], hits });
    const res = await h.route("restore").POST(h.request("restore", { body: { email: BUYER } }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, sent: true });
    assert.equal(h.requests.length, 0);
  }
});

test("restore checks origin, the email, the key shape, and what is switched on", async () => {
  const h = harness({ accounts: [account()] });
  const post = h.route("restore").POST;
  const key = postCreatorLicenseKey(BUYER, SIGNER);

  const foreign = await post(h.request("restore", { body: { email: BUYER, key }, origin: "https://foreign.invalid" }));
  assert.equal(foreign.status, 403);
  assert.equal((await errorOf(foreign)).code, "forbidden");
  const noOrigin = await post(h.request("restore", { body: { email: BUYER, key }, origin: null }));
  assert.equal(noOrigin.status, 403);
  assert.equal(h.rpcs.length, 0);

  const badEmail = await post(h.request("restore", { body: { email: "not an email", key } }));
  assert.equal(badEmail.status, 400);
  assert.equal((await errorOf(badEmail)).field, "email");

  for (const bad of ["LFP-1234", 12345, "nope"]) {
    const res = await post(h.request("restore", { body: { email: BUYER, key: bad } }));
    assert.equal(res.status, 400);
    assert.equal((await errorOf(res)).field, "key");
  }

  const oversize = await post(h.request("restore", { body: { email: BUYER, pad: "x".repeat(5000) } }));
  assert.equal(oversize.status, 413);
  const junk = await post(h.request("restore", { raw: "{not json" }));
  assert.equal(junk.status, 400);

  const off = harness({ env: { ...BASE_ENV, POST_CREATOR_SECRET: "", SUPABASE_SERVICE_ROLE_KEY: "" } });
  const unconfigured = await off.route("restore").POST(off.request("restore", { body: { email: BUYER, key } }));
  assert.equal(unconfigured.status, 503);
  const body = await errorOf(unconfigured);
  assert.equal(body.code, "unconfigured");
  assert.ok(body.error.includes(BUSINESS.email.hello));

  const noResend = harness({ env: { ...BASE_ENV, RESEND_API_KEY: "" }, accounts: [account()] });
  const cannotSend = await noResend.route("restore").POST(noResend.request("restore", { body: { email: BUYER } }));
  assert.equal(cannotSend.status, 503);
  assert.equal(noResend.requests.length, 0);

});

/* ---------------------------------- billing --------------------------------- */

test("billing opens the portal for a lapsed monthly plan and refuses a one payment plan", async () => {
  const lapsed = harness({ accounts: [lapsedMonthly()], cookie: cookieFor() });
  const res = await lapsed.route("billing").POST(lapsed.request("billing", { body: {} }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { url: PORTAL });
  const portal = lapsed.requests.find((r) => r.url === "https://api.stripe.com/v1/billing_portal/sessions");
  assert.equal(portal?.method, "POST");
  const form = new URLSearchParams(portal?.body ?? "");
  assert.equal(form.get("customer"), "cus_TestCustomer1");
  assert.equal(form.get("return_url"), APP);

  const lifetime = harness({ accounts: [account()], cookie: cookieFor() });
  const refused = await lifetime.route("billing").POST(lifetime.request("billing", { body: {} }));
  assert.equal(refused.status, 400);
  assert.equal((await errorOf(refused)).code, "nothing_to_manage");
  assert.equal(lifetime.requests.length, 0);
});

test("billing has nothing to offer a monthly plan that ended or that a refund or dispute closed", async () => {
  for (const over of [{ status: "canceled" }, { status: "active", money_back_at: "2026-09-20T00:00:00.000Z" }, { status: "past_due", money_back_at: "2026-09-20T00:00:00.000Z" }]) {
    const h = harness({ accounts: [lapsedMonthly(over)], cookie: cookieFor() });
    const res = await h.route("billing").POST(h.request("billing", { body: {} }));
    assert.equal(res.status, 400, JSON.stringify(over));
    const body = await errorOf(res);
    assert.equal(body.code, "nothing_to_manage");
    assert.match(body.error, /This plan has ended/);
    assert.equal(h.requests.length, 0, "the portal is never opened");
  }
});

test("billing checks origin, the cookie, the Stripe key, and the portal answer", async () => {
  const h = harness({ accounts: [lapsedMonthly()], cookie: cookieFor() });
  assert.equal((await h.route("billing").POST(h.request("billing", { body: {}, origin: null }))).status, 403);
  h.setCookie(undefined);
  assert.equal((await h.route("billing").POST(h.request("billing", { body: {} }))).status, 401);
  assert.equal(h.requests.length, 0);

  const noKey = harness({ env: { ...BASE_ENV, STRIPE_SECRET_KEY: "" }, accounts: [lapsedMonthly()], cookie: cookieFor() });
  const off = await noKey.route("billing").POST(noKey.request("billing", { body: {} }));
  assert.equal(off.status, 503);
  assert.equal((await errorOf(off)).code, "billing_unavailable");

  const broken = harness({ accounts: [lapsedMonthly()], cookie: cookieFor(), portalStatus: 400 });
  const failed = await broken.route("billing").POST(broken.request("billing", { body: {} }));
  assert.equal(failed.status, 502);
  assert.equal((await errorOf(failed)).code, "billing_unavailable");
});

/* ---------------------------------- session --------------------------------- */

test("session GET refuses a visitor and a signed-out device", async () => {
  const visitor = harness({ accounts: [account()] });
  const res = await visitor.route("session").GET();
  assert.equal(res.status, 401);
  assert.equal((await errorOf(res)).code, "unauthorized");

  // A later checkout bumped the epoch: the old cookie is signed out.
  const stale = harness({ accounts: [account({ access_epoch: 1 })], cookie: cookieFor(BUYER, 0) });
  const out = await stale.route("session").GET();
  assert.equal(out.status, 401);
  const body = await errorOf(out);
  assert.equal(body.code, "unauthorized");
  assert.match(body.error, /signed out on this device/);

  const forged = harness({ accounts: [account()], cookie: signIdentity(identityFor(BUYER, 0), "some-other-signer") });
  assert.equal((await forged.route("session").GET()).status, 401);

  const noDb = harness({ env: { ...BASE_ENV, SUPABASE_SERVICE_ROLE_KEY: "" }, accounts: [account()], cookie: cookieFor() });
  assert.equal((await noDb.route("session").GET()).status, 503);
});

test("session GET answers a lapsed plan with entitled false and no Stripe ids", async () => {
  const h = harness({ accounts: [lapsedMonthly()], cookie: cookieFor() });
  const res = await h.route("session").GET();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") ?? "", /private, no-store/);
  const view = await res.json();
  assert.equal(view.entitled, false);
  assert.equal(view.reason, "past_due");
  assert.equal(view.account.email, BUYER);
  assert.equal(view.account.plan, "monthly");
  assert.equal(view.account.canManageBilling, true);
  assert.equal(view.profileReady, false);
  assert.equal(view.ai.on, false);
  assert.equal(typeof view.ai.message, "string");
  assert.equal(view.salesOpen, false);
  assert.equal(view.allowance.perMonth, POST_CREATOR.ai.monthly.perMonth);
  assert.equal(view.allowance.leftThisMonth, POST_CREATOR.ai.monthly.perMonth - 12);
  const text = JSON.stringify(view);
  for (const secret of ["cus_TestCustomer1", "sub_TestSubscription1", OLD_SESSION]) assert.ok(!text.includes(secret), secret);
});

test("session GET reads AI and sales status from the env and survives a usage outage", async () => {
  const env = {
    ...BASE_ENV,
    POST_CREATOR_AI_ENABLED: "true",
    POST_CREATOR_ANTHROPIC_API_KEY: "sk-ant-mock-only",
    POST_CREATOR_DAILY_SPEND_CAP_USD: "5",
    POST_CREATOR_SALES_OPEN: "true",
  };
  const profile = { businessName: "Piney Woods Plumbing", trade: "plumbing", town: "Longview" };
  const h = harness({ env, accounts: [account({ profile })], cookie: cookieFor() });
  const view = await (await h.route("session").GET()).json();
  assert.equal(view.entitled, true);
  assert.equal(view.reason, "ok");
  assert.equal(view.ai.on, true);
  assert.equal(view.salesOpen, true);
  assert.equal(view.profileReady, true);
  assert.equal(view.profile.businessName, "Piney Woods Plumbing");
  assert.equal(view.allowance.plan, "lifetime");
  assert.equal(view.allowance.usedToday, 2);

  const down = harness({ accounts: [account()], cookie: cookieFor(), failRpc: ["post_creator_usage"] });
  const res = await down.route("session").GET();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).allowance, null);
});

test("session DELETE clears this device's cookie and needs the site's origin", async () => {
  const h = harness({ accounts: [account()], cookie: cookieFor() });
  const res = await h.route("session").DELETE(h.request("session", { method: "DELETE" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const header = res.headers.get("set-cookie") ?? "";
  assert.match(header, new RegExp(`^${POST_CREATOR_COOKIE}=;`));
  assert.match(header, /Max-Age=0/i);

  const foreign = await h.route("session").DELETE(h.request("session", { method: "DELETE", origin: "https://foreign.invalid" }));
  assert.equal(foreign.status, 403);
  assert.equal(setCookieToken(foreign), null);
});

/* ---------------------------------- profile --------------------------------- */

test("profile PUT checks origin, size, and every field before it saves", async () => {
  const good = {
    businessName: "Piney Woods Plumbing",
    town: "Longview",
    trade: "plumbing",
    services: ["drain cleaning", "water heaters"],
    voice: "direct",
    cta: "call",
    facts: "Family owned since 2009.",
  };
  const h = harness({ accounts: [account()], cookie: cookieFor() });
  const put = h.route("profile").PUT;

  assert.equal((await put(h.request("profile", { method: "PUT", body: { profile: good }, origin: null }))).status, 403);
  assert.equal(h.updates.length, 0);

  const oversize = await put(h.request("profile", { method: "PUT", body: { profile: { ...good, samplePost: "x".repeat(9000) } } }));
  assert.equal(oversize.status, 413);

  const tooLong = await put(h.request("profile", { method: "PUT", body: { profile: { ...good, businessName: "x".repeat(81) } } }));
  assert.equal(tooLong.status, 400);
  const problem = await errorOf(tooLong);
  assert.equal(problem.code, "bad_request");
  assert.equal(problem.field, "businessName");
  assert.equal(problem.error, "Keep it under 80 characters.");

  const badTrade = await put(h.request("profile", { method: "PUT", body: { profile: { ...good, trade: "astronaut" } } }));
  assert.equal((await errorOf(badTrade)).field, "trade");
  const noProfile = await put(h.request("profile", { method: "PUT", body: {} }));
  assert.equal(noProfile.status, 400);
  assert.equal((await errorOf(noProfile)).field, "businessName");
  assert.equal(h.updates.length, 0);

  const res = await put(h.request("profile", { method: "PUT", body: { profile: { ...good, town: "  Longview <b>TX</b> " } } }));
  assert.equal(res.status, 200);
  const saved = await res.json();
  assert.equal(saved.ok, true);
  assert.equal(saved.ready, true);
  assert.equal(saved.profile.businessName, "Piney Woods Plumbing");
  assert.equal(saved.profile.town.includes("<"), false);
  assert.deepEqual(saved.profile.services, ["drain cleaning", "water heaters"]);
  assert.deepEqual(h.accounts.get(BUYER)?.profile, saved.profile);
});

test("profile PUT needs an active plan", async () => {
  const visitor = harness({ accounts: [account()] });
  assert.equal((await visitor.route("profile").PUT(visitor.request("profile", { method: "PUT", body: { profile: {} } }))).status, 401);

  const lapsed = harness({ accounts: [lapsedMonthly()], cookie: cookieFor() });
  const res = await lapsed.route("profile").PUT(lapsed.request("profile", { method: "PUT", body: { profile: { businessName: "Piney Woods Plumbing" } } }));
  assert.equal(res.status, 402);
  assert.equal((await errorOf(res)).code, "lapsed");
  assert.equal(lapsed.updates.length, 0);
});

/* ---------------------------------- source ---------------------------------- */

test("every account route runs on Node, and the GET routes are never cached", () => {
  for (const name of ["claim", "restore", "session", "profile", "billing"]) {
    const source = readFileSync(`app/api/post-creator/${name}/route.ts`, "utf8");
    assert.match(source, /export const runtime = "nodejs";/, name);
    if (/export async function GET\b/.test(source)) assert.match(source, /export const dynamic = "force-dynamic";/, name);
  }
});

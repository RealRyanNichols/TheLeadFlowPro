globalThis.fetch = (() => {
  throw new Error("no network in tests");
}) as typeof fetch;

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as proAccess from "../lib/proAccess.ts";
import { POST_CREATOR_COOKIE, identityFor, signIdentity } from "../lib/postCreator/access.ts";
import { BUSINESS } from "../lib/site/business.ts";

// POST /api/post-creator/write, run for real inside a vm context: the route
// and every lib module it imports are transpiled and loaded fresh per
// harness. The Anthropic SDK, Supabase, and the cookie store are in-memory
// fakes, and fetch throws, so nothing here can reach a network or spend a
// credit.

const nativeRequire = createRequire(import.meta.url);
const ORIGIN = BUSINESS.siteUrl;
const SIGNER = "post-creator-write-test-signer";
const BUYER = "buyer@example.test";
const REQUEST_ID = "0d9f5c1e-7b3a-4c2d-9e8f-1a2b3c4d5e6f";

const ON_ENV: Record<string, string | undefined> = {
  NODE_ENV: "production",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-mock-only",
  POST_CREATOR_SECRET: SIGNER,
  POST_CREATOR_AI_ENABLED: "true",
  POST_CREATOR_ANTHROPIC_API_KEY: "sk-ant-mock-only",
  POST_CREATOR_DAILY_SPEND_CAP_USD: "10",
};

type Row = Record<string, unknown>;

const READY_PROFILE = {
  businessName: "Piney Woods Plumbing",
  town: "Longview",
  trade: "plumbing",
  services: ["drain cleaning"],
  facts: "Licensed in Texas.",
  voice: "friendly",
  cta: "message",
};

/** A post_creator_accounts row as the database returns it. */
function account(over: Row = {}): Row {
  return {
    email: BUYER,
    plan: "monthly",
    status: "active",
    stripe_customer_id: "cus_TestCustomer1",
    stripe_subscription_id: "sub_TestSubscription1",
    first_session_id: "cs_test_postcreator_0001",
    last_session_id: "cs_test_postcreator_0001",
    first_claimed_at: "2026-09-01T12:00:00.000Z",
    access_epoch: 0,
    current_period_end: new Date(Date.now() + 20 * 86_400_000).toISOString(),
    cancel_at: null,
    stripe_event_at: 0,
    stripe_synced_at: new Date().toISOString(),
    profile: READY_PROFILE,
    created_at: new Date().toISOString(),
    ...over,
  };
}

const GOOD_ANSWER = JSON.stringify({
  drafts: [
    {
      platform: "facebook",
      text: "Slow drains are not always a clog. Hair and soap build up over time, and a simple clean can clear it. Send us a message and we will take a look.",
      hashtags: ["#Plumbing"],
      shot_list: [],
    },
  ],
  alt_hooks: ["Is your drain slow again?"],
  photo_idea: "A clean drain cover next to the sink.",
});

function goodMessage(): Row {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    stop_reason: "end_turn",
    stop_details: null,
    stop_sequence: null,
    content: [{ type: "text", text: GOOD_ANSWER }],
    usage: { input_tokens: 900, output_tokens: 1300, cache_creation_input_tokens: 0, cache_read_input_tokens: 1200, iterations: null },
  };
}

// The SDK's error classes, in the SDK's hierarchy: a timeout is a connection
// error, and every one of them is an APIError.
class FakeAPIError extends Error {
  status: number | undefined;
  constructor(status: number | undefined, message: string) {
    super(message);
    this.status = status;
  }
}
class FakeAPIConnectionError extends FakeAPIError {
  constructor(message = "Connection error.") {
    super(undefined, message);
  }
}
class FakeAPIConnectionTimeoutError extends FakeAPIConnectionError {
  constructor() {
    super("Request timed out.");
  }
}
class FakeRateLimitError extends FakeAPIError {
  constructor() {
    super(429, "rate limited");
  }
}

type HarnessOptions = {
  env?: Record<string, string | undefined>;
  accounts?: Row[];
  cookie?: string | null;
  answer?: () => unknown;
};

function harness(o: HarnessOptions = {}) {
  const env = { ...(o.env ?? ON_ENV) };
  const cookie = o.cookie === undefined ? signIdentity(identityFor(BUYER, 0), SIGNER) : o.cookie;
  const accounts = new Map<string, Row>((o.accounts ?? [account()]).map((row) => [String(row.email), { ...row }]));
  const rpcs: { name: string; args: Row }[] = [];
  const logs: string[] = [];
  const sdk = { constructed: [] as unknown[], calls: [] as unknown[] };

  class FakeAnthropic {
    static APIError = FakeAPIError;
    static APIConnectionError = FakeAPIConnectionError;
    static APIConnectionTimeoutError = FakeAPIConnectionTimeoutError;
    static RateLimitError = FakeRateLimitError;
    beta: { messages: { create: (p: unknown) => Promise<unknown> } };
    constructor(options: unknown) {
      sdk.constructed.push(JSON.parse(JSON.stringify(options)));
      this.beta = {
        messages: {
          create: async (p: unknown) => {
            sdk.calls.push(JSON.parse(JSON.stringify(p)));
            return (o.answer ?? goodMessage)();
          },
        },
      };
    }
  }

  // getAccount's chain: select, eq, maybeSingle.
  function query() {
    let email: unknown = null;
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        if (column === "email") email = value;
        return chain;
      },
      limit: () => chain,
      maybeSingle: async () => ({ data: accounts.get(String(email)) ?? null, error: null }),
    };
    return chain;
  }

  const fakeDb = {
    from: (table: string) => {
      assert.equal(table, "post_creator_accounts");
      return query();
    },
    rpc: async (name: string, args: Row) => {
      rpcs.push({ name, args: JSON.parse(JSON.stringify(args)) });
      const counts = { day: "2026-09-24", month: "2026-09", used_day: 1, used_month: 1, tries_day: 1, tries_month: 1 };
      if (name === "post_creator_reserve") return { data: { result: "reserved", id: "4b0c2d1e-0000-4000-8000-000000000001", ...counts }, error: null };
      if (name === "post_creator_settle") return { data: { result: "settled" }, error: null };
      if (name === "post_creator_usage") return { data: counts, error: null };
      throw new Error(`unexpected rpc ${name}`);
    },
  };

  const stubs: Record<string, unknown> = {
    "server-only": {},
    "next/headers": {
      cookies: async () => ({ get: (name: string) => (name === POST_CREATOR_COOKIE && cookie ? { value: cookie } : undefined) }),
    },
    "@supabase/supabase-js": { createClient: () => fakeDb },
    "@anthropic-ai/sdk": { __esModule: true, default: FakeAnthropic },
    // lib/proAccess.ts imports ./tools/pro, a directory the resolver below
    // cannot load, so the natively imported module stands in.
    "../proAccess": { ...proAccess, proAccessSecrets: () => [] },
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
      fetch: async () => {
        throw new Error("no network in tests");
      },
    })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }

  function post(init: { body?: unknown; raw?: string; origin?: string | null } = {}): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.9" };
    if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
    const body = init.raw ?? JSON.stringify(init.body ?? goodBody());
    const route = load("app/api/post-creator/write/route.ts");
    return route.POST(new Request(`${ORIGIN}/api/post-creator/write`, { method: "POST", headers, body }));
  }

  return { env, rpcs, logs, sdk, load, post };
}

function goodBody(over: Row = {}): Row {
  return {
    requestId: REQUEST_ID,
    idea: { title: "Myth vs fact: slow drains", angle: "myth-fact", hook: "Slow drains are not always a clog.", shot: "Show a slow drain" },
    platforms: ["facebook"],
    ...over,
  };
}

async function errorOf(res: Response): Promise<{ ok: boolean; code: string; error: string; field?: string }> {
  return (await res.json()) as { ok: boolean; code: string; error: string; field?: string };
}

test("403 without a same-site origin, before anything else is read", async () => {
  for (const origin of [null, "https://evil.example"]) {
    const h = harness();
    const res = await h.post({ origin });
    assert.equal(res.status, 403);
    assert.equal((await errorOf(res)).code, "forbidden");
    assert.equal(h.rpcs.length, 0);
    assert.equal(h.sdk.constructed.length, 0);
  }
});

test("401 for a visitor and 402 for a lapsed plan", async () => {
  const visitor = harness({ cookie: null });
  const res = await visitor.post();
  assert.equal(res.status, 401);
  assert.equal((await errorOf(res)).code, "unauthorized");

  const lapsed = harness({
    accounts: [account({ status: "past_due", current_period_end: new Date(Date.now() - 30 * 86_400_000).toISOString() })],
  });
  const res2 = await lapsed.post();
  assert.equal(res2.status, 402);
  assert.equal((await errorOf(res2)).code, "lapsed");
  assert.equal(lapsed.sdk.constructed.length, 0);
});

test("503 ai_off when AI writing is switched off, and the SDK is never constructed", async () => {
  for (const patch of [{ POST_CREATOR_AI_ENABLED: "false" }, { POST_CREATOR_ANTHROPIC_API_KEY: "" }, { POST_CREATOR_DAILY_SPEND_CAP_USD: "" }]) {
    const h = harness({ env: { ...ON_ENV, ...patch } });
    const res = await h.post();
    assert.equal(res.status, 503);
    const body = await errorOf(res);
    assert.equal(body.code, "ai_off");
    assert.equal(h.sdk.constructed.length, 0);
    assert.equal(h.rpcs.length, 0);
  }
});

test("413 for an oversize body and 400 for a bad one", async () => {
  const big = harness();
  const res = await big.post({ raw: JSON.stringify(goodBody({ note: "x".repeat(9000) })) });
  assert.equal(res.status, 413);
  assert.equal((await errorOf(res)).code, "too_large");

  const broken = harness();
  const res2 = await broken.post({ raw: "{not json" });
  assert.equal(res2.status, 400);
  assert.equal((await errorOf(res2)).code, "bad_request");

  const invalid = harness();
  const res3 = await invalid.post({ body: goodBody({ platforms: ["facebook", "instagram", "google", "video"] }) });
  assert.equal(res3.status, 400);
  const body3 = await errorOf(res3);
  assert.equal(body3.code, "bad_request");
  assert.equal(body3.field, "platforms");

  const note = harness();
  const res4 = await note.post({ body: goodBody({ note: "x".repeat(301) }) });
  assert.equal(res4.status, 400);
  assert.deepEqual(await errorOf(res4), { ok: false, code: "bad_request", error: "Keep your note under 300 characters.", field: "note" });
  for (const h of [big, broken, invalid, note]) {
    assert.equal(h.rpcs.length, 0);
    assert.equal(h.sdk.constructed.length, 0);
  }
});

test("400 profile_needed until the profile names the business and the trade", async () => {
  const h = harness({ accounts: [account({ profile: {} })] });
  const res = await h.post();
  assert.equal(res.status, 400);
  assert.equal((await errorOf(res)).code, "profile_needed");
  assert.equal(h.rpcs.length, 0);
  assert.equal(h.sdk.constructed.length, 0);
});

test("happy path: reserve, one pinned SDK call, settle, 200 with drafts", async () => {
  const h = harness();
  const res = await h.post({ body: goodBody({ platforms: ["facebook"], note: "Mention the fall tune up special" }) });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") ?? "", /private, no-store/);
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
  const body = (await res.json()) as { ok: boolean; drafts: { platform: string; text: string }[]; allowance: { usedToday: number } | null };
  assert.equal(body.ok, true);
  assert.deepEqual(body.drafts.map((d) => d.platform), ["facebook"]);
  assert.ok(body.allowance);

  assert.deepEqual(h.rpcs.map((r) => r.name), ["post_creator_reserve", "post_creator_settle", "post_creator_usage"]);
  const reserve = h.rpcs[0].args;
  assert.equal(reserve.p_email, BUYER);
  assert.equal(reserve.p_request_id, REQUEST_ID);
  assert.equal(reserve.p_platforms, 1);
  assert.equal(reserve.p_cap_micro, 10_000_000);
  assert.equal(reserve.p_model, "claude-opus-5");
  assert.ok(Number(reserve.p_reserve_micro) > 0);
  const settle = h.rpcs[1].args;
  assert.equal(settle.p_delivered, true);
  assert.equal(settle.p_outcome, "delivered");
  assert.equal(settle.p_cost_micro, 900 * 5 + (1200 * 5) / 10 + 1300 * 25);

  assert.deepEqual(h.sdk.constructed, [
    { apiKey: "sk-ant-mock-only", authToken: null, baseURL: "https://api.anthropic.com", timeout: 100_000, maxRetries: 0 },
  ]);
  assert.equal(h.sdk.calls.length, 1);
  const params = h.sdk.calls[0] as { model: string; metadata: { user_id: string }; betas?: string[]; fallbacks?: string; messages: { content: string }[] };
  assert.equal(params.model, "claude-opus-5");
  assert.match(params.metadata.user_id, /^[0-9a-f]{32}$/);
  assert.ok(!JSON.stringify(params).includes(BUYER), "the email is never sent to the model");
  assert.deepEqual(params.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(params.fallbacks, "default");
  assert.match(params.messages[0].content, /Owner's note: Mention the fall tune up special/);
  assert.deepEqual(h.logs, []);

  // A second write in the same process reuses the client built for this key.
  await h.post({ body: goodBody({ requestId: "1d9f5c1e-7b3a-4c2d-9e8f-1a2b3c4d5e6f" }) });
  assert.equal(h.sdk.constructed.length, 1);
  assert.equal(h.sdk.calls.length, 2);
});

test("an SDK error becomes a settled failure, not a thrown request", async () => {
  const h = harness({
    answer: () => {
      throw new FakeAPIConnectionTimeoutError();
    },
  });
  const res = await h.post();
  assert.equal(res.status, 504);
  assert.equal((await errorOf(res)).code, "timeout");
  const settle = h.rpcs.find((r) => r.name === "post_creator_settle");
  assert.equal(settle?.args.p_cost_micro, null);
  assert.equal(settle?.args.p_outcome, "timeout");
  assert.ok(h.logs.includes("Post Creator write failed: timeout"));
});

test("providerFailure maps each SDK error class", () => {
  const h = harness();
  const mod = h.load("lib/postCreator/ai/anthropic.ts");
  // Copied out of the vm realm, so deepEqual compares plain objects.
  const providerFailure = (error: unknown) => JSON.parse(JSON.stringify(mod.providerFailure(error)));
  const callAnthropic = mod.callAnthropic;
  assert.deepEqual(providerFailure(new FakeAPIConnectionTimeoutError()), { kind: "timeout", status: null, billedUnknown: true });
  assert.deepEqual(providerFailure(new FakeAPIConnectionError()), { kind: "connection", status: null, billedUnknown: true });
  assert.deepEqual(providerFailure(new FakeRateLimitError()), { kind: "rate_limited", status: 429, billedUnknown: false });
  assert.deepEqual(providerFailure(new FakeAPIError(529, "overloaded")), { kind: "rate_limited", status: 529, billedUnknown: false });
  assert.deepEqual(providerFailure(new FakeAPIError(400, "bad request")), { kind: "api", status: 400, billedUnknown: false });
  assert.deepEqual(providerFailure(new FakeAPIError(500, "server")), { kind: "api", status: 500, billedUnknown: false });
  assert.deepEqual(providerFailure(new Error("something else")), { kind: "unknown", status: null, billedUnknown: true });
  assert.deepEqual(providerFailure("a string"), { kind: "unknown", status: null, billedUnknown: true });
  assert.deepEqual(h.logs, ["Post Creator provider rejected the request: 400", "Post Creator provider rejected the request: 500"]);
  assert.equal(typeof callAnthropic, "function");
});

test("callAnthropic with no key answers a config failure without building a client", async () => {
  const h = harness({ env: { ...ON_ENV, POST_CREATOR_ANTHROPIC_API_KEY: "  " } });
  const { callAnthropic } = h.load("lib/postCreator/ai/anthropic.ts");
  const result = await callAnthropic({ model: "claude-opus-5", max_tokens: 10, messages: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { kind: "error", error: { kind: "config", status: null, billedUnknown: false } });
  assert.equal(h.sdk.constructed.length, 0);
});

test("route source: exports and check order", () => {
  const source = readFileSync("app/api/post-creator/write/route.ts", "utf8");
  assert.match(source, /export const maxDuration = 120;/);
  assert.match(source, /export const runtime = "nodejs";/);
  assert.match(source, /export const dynamic = "force-dynamic";/);
  const order = ["sameOrigin(", "requirePostCreator(", "aiWritingStatus(", "readBody(", "runWrite("].map((s) => source.indexOf(s));
  for (const i of order) assert.ok(i > 0);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.doesNotMatch(source, /@anthropic-ai\/sdk/);
  assert.doesNotMatch(source, /\$\d/);
  assert.doesNotMatch(source, /@theleadflowpro\.com/);

  const sdk = readFileSync("lib/postCreator/ai/anthropic.ts", "utf8");
  assert.match(sdk, /^import "server-only";/);
});

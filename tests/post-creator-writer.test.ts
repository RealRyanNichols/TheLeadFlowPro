globalThis.fetch = (() => {
  throw new Error("no network in tests");
}) as typeof fetch;

import test from "node:test";
import assert from "node:assert/strict";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { allowanceView } from "../lib/postCreator/plan.ts";
import { aiLimitsFor } from "../lib/postCreator/product.ts";
import { EMPTY_PROFILE } from "../lib/postCreator/profile.ts";
import type {
  ApiError,
  BrandProfile,
  ParsedWriteRequest,
  ReserveInput,
  ReserveResult,
  SettleInput,
  UsageCounts,
  WriteSuccess,
} from "../lib/postCreator/types.ts";
import { aiWritingStatus, type AiOn } from "../lib/postCreator/ai/config.ts";
import { actualMicroUsd, reserveMicroUsd } from "../lib/postCreator/ai/cost.ts";
import type { ModelResult, ProviderFailure } from "../lib/postCreator/ai/model.ts";
import { buildParams } from "../lib/postCreator/ai/prompt.ts";
import { missingPlatformsLine } from "../lib/postCreator/ai/messages.ts";
import { runWrite, type WriterDeps, type WriterInput } from "../lib/postCreator/ai/writer.ts";

// runWrite with every dependency faked: the reservation, the model, the
// settle, and the usage read. Each path checks what was reserved, whether the
// model was called, and that a reservation is settled exactly once.

const NOW = new Date("2026-09-24T15:00:00.000Z");
const EMAIL = "buyer@example.test";
const USER_HASH = "0123456789abcdef0123456789abcdef";

function aiOn(): AiOn {
  const s = aiWritingStatus({ POST_CREATOR_AI_ENABLED: "true", POST_CREATOR_ANTHROPIC_API_KEY: "sk-ant-mock", POST_CREATOR_DAILY_SPEND_CAP_USD: "10" });
  if (!s.on) throw new Error("AI should be on");
  return s;
}

const PROFILE: BrandProfile = {
  ...EMPTY_PROFILE,
  businessName: "Piney Woods Plumbing",
  town: "Longview",
  trade: "plumbing",
  services: ["drain cleaning", "water heaters"],
  facts: "Licensed in Texas.",
};

const REQUEST: ParsedWriteRequest = {
  requestId: "0d9f5c1e-7b3a-4c2d-9e8f-1a2b3c4d5e6f",
  idea: { title: "Myth vs fact: slow drains", angle: "myth-fact", hook: "Slow drains are not always a clog.", shot: "Show a slow drain" },
  platforms: ["facebook", "instagram", "google"],
  note: "",
};

function input(over: Partial<WriterInput> = {}): WriterInput {
  return { email: EMAIL, userHash: USER_HASH, plan: "monthly", profile: PROFILE, request: REQUEST, ai: aiOn(), now: NOW, ...over };
}

const COUNTS: UsageCounts = { day: "2026-09-24", month: "2026-09", usedDay: 4, usedMonth: 30, triesDay: 5, triesMonth: 33 };
const AFTER: UsageCounts = { ...COUNTS, usedDay: 5, usedMonth: 31, triesDay: 6, triesMonth: 34 };

const GOOD = JSON.stringify({
  drafts: [
    {
      platform: "facebook",
      text: "Slow drains are not always a clog. Hair and soap build up over time, and a simple clean can clear it. Send us a message and we will take a look.",
      hashtags: ["#Plumbing"],
      shot_list: [],
    },
    {
      platform: "instagram",
      text: "Is your drain slow again? It may not be a clog at all.\nSoap and hair add up, and a simple clean can help. Message us to set up a visit.",
      hashtags: ["#Plumbing", "#DrainTips"],
      shot_list: [],
    },
    {
      platform: "google",
      text: "Slow drains in Longview homes often come from soap and hair, not a deep clog. A simple cleaning usually clears it. Message us to book a visit.",
      hashtags: [],
      shot_list: [],
    },
  ],
  alt_hooks: ["Is your drain slow again?", "Your drain is trying to tell you something."],
  photo_idea: "A clean drain cover next to the sink.",
});

const USAGE = {
  input_tokens: 900,
  output_tokens: 1300,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 1200,
  iterations: [{ type: "message", model: "claude-opus-5", input_tokens: 900, output_tokens: 1300, cache_creation_input_tokens: 0, cache_read_input_tokens: 1200 }],
};

function message(o: { stop_reason?: string | null; text?: string; content?: unknown[]; usage?: unknown; model?: string; stop_details?: unknown } = {}): ModelResult {
  const msg = {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: o.model ?? "claude-opus-5",
    stop_reason: o.stop_reason === undefined ? "end_turn" : o.stop_reason,
    stop_details: o.stop_details ?? null,
    stop_sequence: null,
    content: o.content ?? [{ type: "text", text: o.text ?? GOOD }],
    usage: o.usage ?? USAGE,
  };
  return { kind: "message", message: msg as unknown as BetaMessage };
}

function failure(kind: ProviderFailure["kind"], status: number | null = null, billedUnknown = kind === "timeout" || kind === "connection" || kind === "unknown"): ModelResult {
  return { kind: "error", error: { kind, status, billedUnknown } };
}

type Fakes = {
  reserve?: ReserveResult | Error;
  model?: ModelResult | Error;
  settleThrows?: boolean;
  usageThrows?: boolean;
};

function fakes(o: Fakes = {}) {
  const calls = { reserve: [] as ReserveInput[], settle: [] as SettleInput[], model: [] as unknown[], usage: 0, logs: [] as string[] };
  const deps: WriterDeps = {
    async reserve(i) {
      calls.reserve.push({ ...i });
      if (o.reserve instanceof Error) throw o.reserve;
      return o.reserve ?? { result: "reserved", id: "gen-0001", counts: COUNTS };
    },
    async settle(i) {
      calls.settle.push({ ...i });
      if (o.settleThrows) throw new Error("simulated settle outage");
    },
    async usage() {
      calls.usage += 1;
      if (o.usageThrows) throw new Error("simulated usage outage");
      return AFTER;
    },
    async callModel(p) {
      calls.model.push(p);
      if (o.model instanceof Error) throw o.model;
      return o.model ?? message();
    },
    log(m) {
      calls.logs.push(m);
    },
  };
  return { deps, calls };
}

function assertNoPrivateLogs(logs: string[]) {
  for (const line of logs) {
    assert.ok(!line.includes("@"), line);
    assert.ok(!line.includes("Piney"), line);
    assert.ok(!line.includes("drain"), line);
  }
}

test("happy path: reserve, one call, settle delivered at the actual cost, 200 with drafts and a fresh allowance", async () => {
  const { deps, calls } = fakes();
  const ai = aiOn();
  const res = await runWrite(input({ ai }), deps);
  assert.equal(res.status, 200);
  const body = res.body as WriteSuccess;
  assert.equal(body.ok, true);
  assert.deepEqual(body.drafts.map((d) => d.platform), ["facebook", "instagram", "google"]);
  assert.deepEqual(body.missing, []);
  assert.deepEqual(body.drafts[1].hashtags, ["#Plumbing", "#DrainTips"]);
  assert.deepEqual(body.drafts[2].hashtags, []);
  assert.equal(body.altHooks.length, 2);
  assert.equal(body.photoIdea, "A clean drain cover next to the sink.");
  assert.equal(body.trimmed, 0);
  assert.deepEqual(body.allowance, allowanceView("monthly", AFTER, NOW));

  const limits = aiLimitsFor("monthly");
  const { inputBytes, params } = buildParams(REQUEST, PROFILE, ai, "fall", USER_HASH);
  assert.equal(calls.reserve.length, 1);
  assert.deepEqual(calls.reserve[0], {
    email: EMAIL,
    requestId: REQUEST.requestId,
    platforms: 3,
    perDay: limits.perDay,
    perMonth: limits.perMonth,
    triesPerDay: limits.triesPerDay,
    triesPerMonth: limits.triesPerMonth,
    accountMonthCapMicro: limits.costCeilingMicroUsd,
    reserveMicro: reserveMicroUsd(ai.model, inputBytes, 4000),
    capMicro: 10_000_000,
    model: "claude-opus-5",
  });
  assert.equal(calls.model.length, 1);
  assert.deepEqual(calls.model[0], params);
  assert.equal(calls.settle.length, 1);
  assert.deepEqual(calls.settle[0], {
    id: "gen-0001",
    email: EMAIL,
    delivered: true,
    outcome: "delivered",
    costMicro: actualMicroUsd(USAGE, ai.model, "claude-opus-5"),
    servedModel: "claude-opus-5",
    inputTokens: 900,
    outputTokens: 1300,
    cacheReadTokens: 1200,
    cacheWriteTokens: 0,
    stopReason: "end_turn",
    fellBack: false,
  });
  assert.equal(calls.settle[0].costMicro, 37_600);
  assert.equal(calls.usage, 1);
  assert.deepEqual(calls.logs, []);
});

test("a fallback-served answer is priced per attempt and marked as fallen back", async () => {
  const usage = {
    input_tokens: 900,
    output_tokens: 1000,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    iterations: [
      { type: "message", model: "claude-opus-5", input_tokens: 2000, output_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      { type: "fallback_message", model: "claude-opus-4-8", input_tokens: 900, output_tokens: 1000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    ],
  };
  const { deps, calls } = fakes({ model: message({ usage, model: "claude-opus-4-8", content: [{ type: "fallback" }, { type: "text", text: GOOD }] }) });
  const res = await runWrite(input(), deps);
  assert.equal(res.status, 200);
  const s = calls.settle[0];
  assert.equal(s.fellBack, true);
  assert.equal(s.servedModel, "claude-opus-4-8");
  assert.equal(s.costMicro, 2000 * 5 + 200 * 25 + 900 * 5 + 1000 * 25);
  assert.equal(s.inputTokens, 2900);
});

test("a refusal settles as not delivered at its actual cost and answers 422", async () => {
  const { deps, calls } = fakes({ model: message({ stop_reason: "refusal", stop_details: { type: "refusal", category: "general_harms", explanation: null }, content: [] }) });
  const res = await runWrite(input(), deps);
  assert.equal(res.status, 422);
  assert.equal((res.body as ApiError).code, "refused");
  assert.equal(calls.settle.length, 1);
  assert.equal(calls.settle[0].delivered, false);
  assert.equal(calls.settle[0].outcome, "refused");
  assert.equal(calls.settle[0].costMicro, 37_600);
  assert.equal(calls.settle[0].stopReason, "refusal");
  assert.deepEqual((res.body as ApiError).allowance, allowanceView("monthly", AFTER, NOW));
  assert.deepEqual(calls.logs, ["Post Creator write failed: refused"]);
});

test("max_tokens, bad JSON, an empty answer, an odd stop, and no clean drafts all answer 502 unusable at the actual cost", async () => {
  const cases: [ModelResult, string][] = [
    [message({ stop_reason: "max_tokens", text: '{"drafts":[' }), "max_tokens"],
    [message({ text: "{not json" }), "unusable"],
    [message({ content: [{ type: "thinking", thinking: "" }] }), "unusable"],
    [message({ stop_reason: "pause_turn" }), "unusable"],
    [message({ text: JSON.stringify({ drafts: [{ platform: "facebook", text: "We are the best. We are number one. Act now." }], alt_hooks: [], photo_idea: "" }) }), "unusable"],
  ];
  for (const [result, outcome] of cases) {
    const { deps, calls } = fakes({ model: result });
    const res = await runWrite(input(), deps);
    assert.equal(res.status, 502, outcome);
    assert.equal((res.body as ApiError).code, "unusable");
    assert.equal(calls.settle.length, 1);
    assert.equal(calls.settle[0].delivered, false);
    assert.equal(calls.settle[0].outcome, outcome);
    assert.equal(calls.settle[0].costMicro, 37_600);
    assert.equal(calls.model.length, 1);
  }
});

test("provider failures settle at 0 when nothing was billed and at an unknown cost when it may have been", async () => {
  const cases: [ModelResult, number, string, number | null, string][] = [
    [failure("rate_limited", 429), 503, "rate_limited", 0, "rate_limited"],
    [failure("rate_limited", 529), 503, "rate_limited", 0, "rate_limited"],
    [failure("api", 400), 502, "provider_error", 0, "provider_error"],
    [failure("config"), 502, "provider_error", 0, "provider_error"],
    [failure("timeout"), 504, "timeout", null, "timeout"],
    [failure("connection"), 502, "provider_error", null, "connection"],
    // A connection that never opened (DNS, refused, bad certificate) sent nothing, so it costs nothing.
    [failure("connection", null, false), 502, "provider_error", 0, "connection"],
    [failure("unknown"), 502, "provider_error", null, "unknown"],
  ];
  for (const [result, status, code, cost, outcome] of cases) {
    const { deps, calls } = fakes({ model: result });
    const res = await runWrite(input(), deps);
    assert.equal(res.status, status, outcome);
    assert.equal((res.body as ApiError).code, code);
    assert.equal(calls.settle.length, 1);
    assert.equal(calls.settle[0].costMicro, cost, outcome);
    assert.equal(calls.settle[0].outcome, outcome);
    assert.equal(calls.settle[0].delivered, false);
    assert.equal(calls.settle[0].servedModel, null);
    assert.equal(calls.model.length, 1);
  }
});

test("a callModel that throws settles once at an unknown cost", async () => {
  const { deps, calls } = fakes({ model: new Error("boom") });
  const res = await runWrite(input(), deps);
  assert.equal(res.status, 502);
  assert.equal((res.body as ApiError).code, "provider_error");
  assert.equal(calls.settle.length, 1);
  assert.equal(calls.settle[0].costMicro, null);
  assert.equal(calls.settle[0].outcome, "unknown");
  assert.equal(calls.model.length, 1);
});

test("every answer short of a reservation makes no model call and no settle", async () => {
  const limit = (result: "daily_limit" | "monthly_limit" | "attempt_limit" | "account_cost_limit"): ReserveResult => ({ result, counts: COUNTS });
  const cases: [ReserveResult | Error, number, string][] = [
    [{ result: "duplicate", status: "delivered" }, 409, "already_delivered"],
    [{ result: "duplicate", status: "reserved" }, 409, "busy"],
    [{ result: "duplicate", status: "failed" }, 409, "duplicate"],
    [{ result: "duplicate", status: "expired" }, 409, "duplicate"],
    [{ result: "busy" }, 409, "busy"],
    [limit("daily_limit"), 429, "daily_limit"],
    [limit("monthly_limit"), 429, "monthly_limit"],
    [limit("attempt_limit"), 429, "attempt_limit"],
    [limit("account_cost_limit"), 429, "account_cost_limit"],
    [{ result: "spend_cap", firstHit: false }, 503, "spend_cap"],
    [{ result: "spend_cap", firstHit: true }, 503, "spend_cap"],
    [{ result: "no_account" }, 404, "not_found"],
    [new Error("simulated reserve outage"), 500, "server_error"],
  ];
  for (const [reserve, status, code] of cases) {
    const { deps, calls } = fakes({ reserve });
    const res = await runWrite(input(), deps);
    const label = reserve instanceof Error ? "throws" : JSON.stringify(reserve);
    assert.equal(res.status, status, label);
    assert.equal(res.body.ok, false);
    assert.equal((res.body as ApiError).code, code, label);
    assert.equal(calls.model.length, 0, label);
    assert.equal(calls.settle.length, 0, label);
    assert.equal(calls.reserve.length, 1, label);
    if (code.endsWith("_limit")) assert.deepEqual((res.body as ApiError).allowance, allowanceView("monthly", COUNTS, NOW), label);
    assertNoPrivateLogs(calls.logs);
  }
  const first = fakes({ reserve: { result: "spend_cap", firstHit: true } });
  await runWrite(input(), first.deps);
  assert.deepEqual(first.calls.logs, ["Post Creator daily AI spend cap reached"]);
  const later = fakes({ reserve: { result: "spend_cap", firstHit: false } });
  await runWrite(input(), later.deps);
  assert.deepEqual(later.calls.logs, []);
});

test("an attempt_limit says midnight for the daily tries ceiling and the 1st for the monthly one", async () => {
  const limits = aiLimitsFor("monthly");
  // 95 delivered and 25 failed earlier this month, none today: only the month's ceiling is reached.
  const monthCounts: UsageCounts = { day: "2026-09-24", month: "2026-09", usedDay: 0, usedMonth: 95, triesDay: 0, triesMonth: limits.triesPerMonth };
  const month = fakes({ reserve: { result: "attempt_limit", counts: monthCounts } });
  const m = await runWrite(input(), month.deps);
  assert.equal(m.status, 429);
  const mBody = m.body as ApiError;
  assert.equal(mBody.code, "attempt_limit");
  assert.match(mBody.error, new RegExp(`this month's ceiling of ${limits.triesPerMonth} tries`));
  assert.match(mBody.error, /comes back on October 1\./);
  assert.doesNotMatch(mBody.error, /midnight/);
  assert.deepEqual(mBody.allowance, allowanceView("monthly", monthCounts, NOW));
  assert.equal(month.calls.model.length, 0);

  const dayCounts: UsageCounts = { ...monthCounts, usedDay: 18, usedMonth: 40, triesDay: limits.triesPerDay, triesMonth: 47 };
  const day = fakes({ reserve: { result: "attempt_limit", counts: dayCounts } });
  const d = await runWrite(input(), day.deps);
  const dBody = d.body as ApiError;
  assert.match(dBody.error, new RegExp(`today's ceiling of ${limits.triesPerDay} tries`));
  assert.match(dBody.error, /midnight Central time/);

  // Both reached: midnight brings nothing back, so the month is the answer.
  const both = fakes({ reserve: { result: "attempt_limit", counts: { ...dayCounts, triesMonth: limits.triesPerMonth } } });
  assert.match(((await runWrite(input(), both.deps)).body as ApiError).error, /October 1/);

  const lifetime = aiLimitsFor("lifetime");
  const once = fakes({ reserve: { result: "attempt_limit", counts: { ...monthCounts, usedMonth: 50, triesMonth: lifetime.triesPerMonth } } });
  assert.match(((await runWrite(input({ plan: "lifetime" }), once.deps)).body as ApiError).error, new RegExp(`ceiling of ${lifetime.triesPerMonth} tries`));
});

test("a write that comes back for only some platforms counts, and names the ones that did not", async () => {
  // The model left two of the three requested platforms out.
  const only = JSON.stringify({ ...JSON.parse(GOOD), drafts: [JSON.parse(GOOD).drafts[0]] });
  const left = fakes({ model: message({ text: only }) });
  const res = await runWrite(input(), left.deps);
  assert.equal(res.status, 200);
  const body = res.body as WriteSuccess;
  assert.deepEqual(body.drafts.map((d) => d.platform), ["facebook"]);
  assert.deepEqual(body.missing, ["instagram", "google"]);
  assert.equal(body.trimmed, 0);
  assert.equal(left.calls.reserve[0].platforms, 3);
  assert.equal(left.calls.settle[0].delivered, true);
  assert.equal(left.calls.settle[0].outcome, "delivered");
  assert.equal(
    missingPlatformsLine(body.missing),
    "We could not write a clean draft for Instagram and Google Business Profile this time. A write counts when at least one draft comes back, so this one counted. To get those platforms, start a new write for them.",
  );

  // The filter threw two out: Instagram too short, Google mostly claims.
  const drafts = JSON.parse(GOOD).drafts;
  drafts[1] = { ...drafts[1], text: "Slow drain? DM us." };
  drafts[2] = { ...drafts[2], text: "Slow drains happen. We are the best. We are number one. Act now, spots are filling up." };
  const thrown = fakes({ model: message({ text: JSON.stringify({ ...JSON.parse(GOOD), drafts }) }) });
  const res2 = await runWrite(input(), thrown.deps);
  assert.equal(res2.status, 200);
  assert.deepEqual((res2.body as WriteSuccess).missing, ["instagram", "google"]);
  assert.equal(thrown.calls.settle[0].delivered, true);
});

test("a settle that throws is logged and the answer still goes back", async () => {
  const ok = fakes({ settleThrows: true });
  const res = await runWrite(input(), ok.deps);
  assert.equal(res.status, 200);
  assert.equal(ok.calls.settle.length, 1);
  assert.ok(ok.calls.logs.some((l) => l.startsWith("Post Creator settle failed")));

  const bad = fakes({ settleThrows: true, model: failure("timeout") });
  const failed = await runWrite(input(), bad.deps);
  assert.equal(failed.status, 504);
  assert.equal(bad.calls.settle.length, 1);
  assertNoPrivateLogs([...ok.calls.logs, ...bad.calls.logs]);
});

test("a usage read that fails leaves the allowance null", async () => {
  const { deps } = fakes({ usageThrows: true });
  const res = await runWrite(input(), deps);
  assert.equal(res.status, 200);
  assert.equal((res.body as WriteSuccess).allowance, null);
  const refused = fakes({ usageThrows: true, model: message({ stop_reason: "refusal", content: [] }) });
  const r = await runWrite(input(), refused.deps);
  assert.equal(r.status, 422);
  assert.ok(!("allowance" in r.body));
});

test("the one payment plan reserves against its own limits", async () => {
  const { deps, calls } = fakes({ reserve: { result: "daily_limit", counts: COUNTS } });
  const res = await runWrite(input({ plan: "lifetime" }), deps);
  const limits = aiLimitsFor("lifetime");
  assert.equal(calls.reserve[0].perDay, limits.perDay);
  assert.equal(calls.reserve[0].perMonth, limits.perMonth);
  assert.equal(calls.reserve[0].triesPerDay, limits.triesPerDay);
  assert.equal(calls.reserve[0].accountMonthCapMicro, limits.costCeilingMicroUsd);
  assert.ok((res.body as ApiError).error.includes(`today's ${limits.perDay} AI writes`));
});

test("a trimmed sentence is counted and never reaches the buyer", async () => {
  const text = JSON.stringify({
    drafts: [
      {
        platform: "facebook",
        text: "Slow drains are not always a clog. We are the best plumber in town. Hair and soap build up over time. Send us a message.",
        hashtags: [],
        shot_list: [],
      },
    ],
    alt_hooks: [],
    photo_idea: "",
  });
  const { deps, calls } = fakes({ model: message({ text }) });
  const res = await runWrite(input({ request: { ...REQUEST, platforms: ["facebook"] } }), deps);
  assert.equal(res.status, 200);
  const body = res.body as WriteSuccess;
  assert.equal(body.trimmed, 1);
  assert.ok(!body.drafts[0].text.includes("best"));
  assert.equal(calls.reserve[0].platforms, 1);
});

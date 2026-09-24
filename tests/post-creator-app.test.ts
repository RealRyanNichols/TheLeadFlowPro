// Post Creator buyer app (/post-creator/app).
//
// The page stays private and per request, every note a buyer can land on
// exists and passes the house copy rules, the writer never sends a second
// request id after a dropped answer, the browser sends the write route
// exactly the request it expects, and the client files never reach for a
// server-only module. No network: every fetch here is a stub.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, describe, mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  API_PATHS,
  WRITE_TIMEOUT_MS,
  fetchSession,
  looksLikeEmail,
  looksLikeKey,
  openBilling,
  restore,
  saveProfile,
  signOut,
  write,
} from "../app/post-creator/app/api.ts";
import {
  APP_COPY,
  CLAIM_CODES,
  CLAIM_NOTES,
  GENERIC_ERROR,
  NETWORK_ERROR,
  OFFLINE_ERROR,
  PROFILE_FIELD_COPY,
  REASON_NOTES,
  appClaimNote,
  counterLine,
  dayLabel,
  graceLine,
  isClaimCode,
  lowLine,
  meterLine,
  planLine,
  trimmedLine,
  writeBlockedLabel,
  writeCostLine,
} from "../app/post-creator/app/copy.ts";
import UsageMeter from "../app/post-creator/app/UsageMeter.tsx";
import { INITIAL_WRITER_STATE, isRetryable, newRequestId, writerReducer, type WriterState } from "../app/post-creator/app/writerState.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { EMPTY_PROFILE } from "../lib/postCreator/profile.ts";
import { POST_CREATOR } from "../lib/postCreator/product.ts";
import type { AccountView, Allowance, EntitlementReason, ErrorCode, WriteRequestBody, WriteSuccess } from "../lib/postCreator/types.ts";
import { BUSINESS } from "../lib/site/business.ts";

const APP_DIR = new URL("../app/post-creator/app/", import.meta.url);
const source = (name: string) => readFileSync(new URL(name, APP_DIR), "utf8");
const APP_FILES = readdirSync(APP_DIR).filter((f) => /\.tsx?$/.test(f));

/** Every EntitlementReason. A missing or extra key fails the type check. */
const ALL_REASONS: Record<EntitlementReason, true> = {
  visitor: true,
  no_account: true,
  ok: true,
  past_due: true,
  canceled: true,
  unconfigured: true,
  signed_out: true,
};

const ALLOWANCE: Allowance = {
  plan: "monthly",
  perDay: 20,
  perMonth: 100,
  usedToday: 2,
  usedThisMonth: 37,
  leftToday: 18,
  leftThisMonth: 63,
  triesLeftToday: 23,
  resetsMonthOn: "2026-10-01",
};

function account(over: Partial<AccountView> = {}): AccountView {
  return {
    email: "owner@example.com",
    plan: "monthly",
    status: "active",
    renewsOn: null,
    endsOn: null,
    graceEndsOn: null,
    canManageBilling: true,
    ...over,
  };
}

/** Every string inside a value, however deeply nested. */
function strings(x: unknown): string[] {
  if (typeof x === "string") return [x];
  if (Array.isArray(x)) return x.flatMap(strings);
  if (x && typeof x === "object") return Object.values(x).flatMap(strings);
  return [];
}

/* ---------------------------------- page ----------------------------------- */

describe("page", () => {
  const page = source("page.tsx");

  test("is private and rendered per request", () => {
    assert.match(page, /export const dynamic = "force-dynamic";/);
    assert.match(page, /\.\.\.PRIVATE_PAGE_METADATA/);
    assert.ok(!page.includes("withPublicPageMetadata"));
    assert.match(page, /title: "Your Post Creator \| The LeadFlow Pro"/);
    assert.match(page, /description: "Post ideas, AI drafts in your voice, and your business profile\."/);
  });

  test("never imports the site login client", () => {
    assert.ok(!page.includes("@/lib/supabase"));
    assert.ok(!page.includes("lib/supabase"));
  });

  test("decides access from the cookie, then locks without a live plan or a database", () => {
    const order = ["getEntitlement()", "!entitlement.entitled || !entitlement.account", "serviceDb()", "buildSessionView(", "<PostCreatorApp"];
    const at = order.map((s) => page.indexOf(s));
    at.forEach((i, n) => assert.ok(i > 0, `${order[n]} is missing`));
    assert.deepEqual([...at].sort((a, b) => a - b), at, "access is checked before the app renders");
    assert.match(page, /locked\("unconfigured"\)/);
    assert.ok(!page.includes('"use client"'));
  });
});

/* ---------------------------------- copy ----------------------------------- */

describe("copy", () => {
  test("CLAIM_NOTES covers exactly the seven claim codes", () => {
    assert.deepEqual(Object.keys(CLAIM_NOTES).sort(), ["existing", "expired", "missing", "notfound", "unavailable", "unpaid", "used"]);
    assert.deepEqual([...CLAIM_CODES].sort(), Object.keys(CLAIM_NOTES).sort());
    for (const code of CLAIM_CODES) {
      assert.ok(CLAIM_NOTES[code].length > 20, code);
      assert.ok(isClaimCode(code));
    }
    assert.ok(!isClaimCode("welcome"));
    assert.ok(!isClaimCode(""));
    assert.ok(CLAIM_NOTES.notfound.includes(BUSINESS.email.hello));
  });

  test("REASON_NOTES covers every entitlement reason, with words for every locked one", () => {
    assert.deepEqual(Object.keys(REASON_NOTES).sort(), Object.keys(ALL_REASONS).sort());
    assert.equal(REASON_NOTES.visitor, "");
    assert.equal(REASON_NOTES.ok, "");
    for (const reason of ["no_account", "signed_out", "unconfigured", "past_due", "canceled"] as const) {
      assert.ok(REASON_NOTES[reason].length > 20, reason);
    }
  });

  test("the open app hides the claim notes for a link that already did its job", () => {
    assert.equal(appClaimNote("used"), null);
    assert.equal(appClaimNote("expired"), null);
    assert.equal(appClaimNote(null), null);
    assert.equal(appClaimNote("existing"), CLAIM_NOTES.existing);
    assert.equal(appClaimNote("unavailable"), CLAIM_NOTES.unavailable);
  });

  test("the spec's exact lines", () => {
    assert.equal(NETWORK_ERROR, "The connection dropped. Tap Try again. You will not be counted twice for the same request.");
    assert.equal(APP_COPY.locked.keyPlaceholder, "LFP-XXXX-XXXX-XXXX-XXXX");
    assert.equal(APP_COPY.writer.platformsLegend, `Write for (pick up to ${POST_CREATOR.ai.maxPlatformsPerWrite})`);
    assert.equal(APP_COPY.writer.platformsLegend, "Write for (pick up to 3)");
    assert.equal(APP_COPY.account.deleteLine, `${APP_COPY.account.deleteLead} ${BUSINESS.email.hello}.`);
    assert.equal(PROFILE_FIELD_COPY.services.label, `Services (up to ${POST_CREATOR.maxServices}, one per line)`);
  });

  test("the built lines", () => {
    assert.equal(meterLine(ALLOWANCE), "63 of 100 AI writes left this month \u00b7 18 left today. Resets October 1.");
    assert.equal(meterLine(null), "Could not load your AI writes right now.");
    assert.equal(lowLine(ALLOWANCE), null);
    assert.equal(lowLine({ ...ALLOWANCE, leftThisMonth: 10 }), "Running low: 10 AI writes left this month.");
    assert.equal(lowLine({ ...ALLOWANCE, leftThisMonth: 1 }), "Running low: 1 AI write left this month.");
    assert.equal(lowLine({ ...ALLOWANCE, leftThisMonth: 0 }), null);
    assert.equal(lowLine(null), null);
    assert.equal(writeCostLine(ALLOWANCE), "Uses 1 of your 63 AI writes");
    assert.equal(writeCostLine(null), "Uses 1 AI write");
    assert.equal(trimmedLine(1), "We removed 1 sentence that made a claim we cannot check.");
    assert.equal(trimmedLine(3), "We removed 3 sentences that made claims we cannot check.");
    assert.equal(counterLine(1234, 3000), "1,234 of 3,000");
    assert.equal(graceLine("2026-10-08T17:00:00.000Z"), "Your last payment did not go through. Update your card by October 8 to keep AI writing on.");
  });

  test("dates are the Chicago calendar day", () => {
    assert.equal(dayLabel("2026-10-01"), "October 1");
    // 03:00 UTC on October 1 is still September 30 in Chicago.
    assert.equal(dayLabel("2026-10-01T03:00:00.000Z"), "September 30");
    assert.equal(dayLabel("2026-10-01T06:00:00.000Z"), "October 1");
    assert.equal(dayLabel("not a date"), "not a date");
  });

  test("the plan line", () => {
    assert.equal(planLine(account({ plan: "lifetime", canManageBilling: false })), "Your plan: One payment. Nothing renews.");
    assert.equal(
      planLine(account({ renewsOn: "2026-10-21T15:00:00.000Z" })),
      `Your plan: Monthly, ${POST_CREATOR.monthlyLabel}. Renews on October 21.`,
    );
    assert.equal(planLine(account({ endsOn: "2026-10-21T15:00:00.000Z" })), "Your plan: Monthly. Ends on October 21.");
    assert.equal(planLine(account()), `Your plan: Monthly, ${POST_CREATOR.monthlyLabel}.`);
  });

  test("why Write it cannot run, in order, with the month before the day", () => {
    const ready = { aiOn: true, profileReady: true, allowance: ALLOWANCE };
    assert.equal(writeBlockedLabel(ready), null);
    assert.equal(writeBlockedLabel({ ...ready, allowance: null }), null);
    assert.equal(writeBlockedLabel({ ...ready, aiOn: false, profileReady: false }), "AI writing is not switched on right now");
    assert.equal(writeBlockedLabel({ ...ready, profileReady: false }), "Set up your profile to use AI");
    assert.equal(writeBlockedLabel({ ...ready, allowance: { ...ALLOWANCE, leftToday: 0 } }), "No AI writes left today");
    assert.equal(writeBlockedLabel({ ...ready, allowance: { ...ALLOWANCE, leftToday: 0, leftThisMonth: 0 } }), "No AI writes left this month");
  });

  test("every line passes the house copy rules", () => {
    const account0 = account();
    const all = [
      ...strings(APP_COPY),
      ...strings(CLAIM_NOTES),
      ...strings(REASON_NOTES),
      ...strings(PROFILE_FIELD_COPY),
      NETWORK_ERROR,
      OFFLINE_ERROR,
      GENERIC_ERROR,
      meterLine(ALLOWANCE),
      meterLine(null),
      lowLine({ ...ALLOWANCE, leftThisMonth: 4 }) ?? "",
      writeCostLine(ALLOWANCE),
      writeCostLine(null),
      trimmedLine(1),
      trimmedLine(2),
      graceLine("2026-10-08T17:00:00.000Z"),
      planLine(account0),
      planLine(account({ renewsOn: "2026-10-21T15:00:00.000Z" })),
      planLine(account({ endsOn: "2026-10-21T15:00:00.000Z" })),
      planLine(account({ plan: "lifetime" })),
    ];
    assert.ok(all.length > 60);
    for (const s of all) {
      assert.deepEqual(copyProblems(s), [], s);
      assert.doesNotMatch(s, /\b(unlimited|unending|endless|infinite|never run out|no limit)\b/i, s);
      assert.doesNotMatch(s, /guarantee/i, s);
    }
  });

  test("the usage meter renders the sentence, and says so when the count did not load", () => {
    const html = renderToStaticMarkup(createElement(UsageMeter, { allowance: ALLOWANCE }));
    assert.ok(html.includes("63 of 100 AI writes left this month"));
    assert.ok(html.includes('aria-live="polite"'));
    const none = renderToStaticMarkup(createElement(UsageMeter, { allowance: null }));
    assert.ok(none.includes("Could not load your AI writes right now."));
    assert.ok(!none.includes("aria-hidden"));
  });
});

/* ------------------------------- writer state ------------------------------ */

const ID_A = "0f8c1d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f";
const ID_B = "1a2b3c4d-5e6f-4a7b-9c8d-0e1f2a3b4c5d";
const ID_C = "2b3c4d5e-6f7a-4b8c-ad9e-1f2a3b4c5d6e";

const SUCCESS: WriteSuccess = { ok: true, drafts: [], altHooks: [], photoIdea: "", trimmed: 0, allowance: null };

function failure(code: ErrorCode | "network", status = 500) {
  return { ok: false as const, status, code, error: `error for ${code}` };
}

function writingAfter(code: ErrorCode | "network"): WriterState {
  const s1 = writerReducer(INITIAL_WRITER_STATE, { type: "submit", newId: ID_A });
  return writerReducer(s1, { type: "response", requestId: ID_A, result: failure(code) });
}

describe("writerReducer", () => {
  test("a submit starts a write with the fresh id; a second submit while writing does nothing", () => {
    const s1 = writerReducer(INITIAL_WRITER_STATE, { type: "submit", newId: ID_A });
    assert.deepEqual(s1, { phase: "writing", requestId: ID_A });
    assert.equal(writerReducer(s1, { type: "submit", newId: ID_B }), s1);
  });

  test("a dropped answer keeps the id: Try again sends the same request", () => {
    const failed = writingAfter("network");
    assert.equal(failed.phase, "failed");
    if (failed.phase !== "failed") return;
    assert.equal(failed.keepRequestId, ID_A);
    assert.equal(failed.retryable, true);
    assert.equal(failed.message, "error for network");
    assert.deepEqual(writerReducer(failed, { type: "retry", newId: ID_B }), { phase: "writing", requestId: ID_A });
    // Tapping Write it instead is the same write too.
    assert.deepEqual(writerReducer(failed, { type: "submit", newId: ID_C }), { phase: "writing", requestId: ID_A });
  });

  test("busy keeps the id", () => {
    const failed = writingAfter("busy");
    assert.ok(failed.phase === "failed" && failed.keepRequestId === ID_A && failed.retryable);
    assert.deepEqual(writerReducer(failed, { type: "retry", newId: ID_B }), { phase: "writing", requestId: ID_A });
  });

  test("a definitive failure makes a new id on retry", () => {
    for (const code of ["unusable", "provider_error", "rate_limited", "timeout", "duplicate", "server_error"] as const) {
      const failed = writingAfter(code);
      assert.ok(failed.phase === "failed" && failed.keepRequestId === null && failed.retryable, code);
      assert.deepEqual(writerReducer(failed, { type: "retry", newId: ID_B }), { phase: "writing", requestId: ID_B }, code);
    }
  });

  test("limits, a refusal, and a lost session offer no Try again", () => {
    for (const code of ["refused", "daily_limit", "monthly_limit", "attempt_limit", "account_cost_limit", "spend_cap", "ai_off", "profile_needed", "already_delivered", "unauthorized", "lapsed", "bad_request"] as const) {
      const failed = writingAfter(code);
      assert.ok(failed.phase === "failed" && !failed.retryable && failed.keepRequestId === null, code);
      assert.equal(isRetryable(code), false, code);
      // A new write is still a new id.
      assert.deepEqual(writerReducer(failed, { type: "submit", newId: ID_B }), { phase: "writing", requestId: ID_B }, code);
    }
  });

  test("an answer for another request is ignored; success lands in done", () => {
    const s1 = writerReducer(INITIAL_WRITER_STATE, { type: "submit", newId: ID_A });
    assert.equal(writerReducer(s1, { type: "response", requestId: ID_B, result: { ok: true, data: SUCCESS } }), s1);
    assert.deepEqual(writerReducer(s1, { type: "response", requestId: ID_A, result: { ok: true, data: SUCCESS } }), { phase: "done", result: SUCCESS });
    assert.equal(writerReducer(INITIAL_WRITER_STATE, { type: "response", requestId: ID_A, result: { ok: true, data: SUCCESS } }), INITIAL_WRITER_STATE);
  });

  test("done then Try again (uses 1 AI write) is a new request", () => {
    const s1 = writerReducer(INITIAL_WRITER_STATE, { type: "submit", newId: ID_A });
    const done = writerReducer(s1, { type: "response", requestId: ID_A, result: { ok: true, data: SUCCESS } });
    assert.deepEqual(writerReducer(done, { type: "submit", newId: ID_B }), { phase: "writing", requestId: ID_B });
    assert.equal(writerReducer(done, { type: "retry", newId: ID_B }), done);
  });

  test("reset clears everything, including a kept id", () => {
    const failed = writingAfter("network");
    const reset = writerReducer(failed, { type: "reset" });
    assert.deepEqual(reset, { phase: "idle" });
    assert.deepEqual(writerReducer(reset, { type: "submit", newId: ID_B }), { phase: "writing", requestId: ID_B });
  });

  test("request ids are version 4 UUIDs the write route accepts", () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const id = newRequestId();
      assert.match(id, re);
      ids.add(id);
    }
    assert.equal(ids.size, 200);
  });
});

/* ----------------------------------- api ----------------------------------- */

type Sent = { url: string; init: RequestInit };

const realFetch = globalThis.fetch;

function stubFetch(answer: (sent: Sent) => Response | Promise<Response>): Sent[] {
  const sent: Sent[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const s = { url: String(input), init: init ?? {} };
    sent.push(s);
    return answer(s);
  }) as typeof fetch;
  return sent;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const BODY: WriteRequestBody = {
  requestId: ID_A,
  idea: { title: "Myth vs fact: slow drains", angle: "myth-fact", hook: "Here is a common myth about slow drains.", shot: "A phone note" },
  platforms: ["facebook", "instagram", "google"],
  note: "Mention the fall tune up special",
};

describe("api", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
    mock.timers.reset();
  });

  test("write sends exactly the WriteRequestBody, as same-origin JSON", async () => {
    const sent = stubFetch(() => json(SUCCESS));
    const r = await write(BODY);
    assert.deepEqual(r, { ok: true, data: SUCCESS });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, API_PATHS.write);
    assert.equal(sent[0].url, "/api/post-creator/write");
    assert.equal(sent[0].init.method, "POST");
    assert.equal(sent[0].init.credentials, "same-origin");
    assert.equal((sent[0].init.headers as Record<string, string>)["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), BODY);
  });

  test("write sends no note key without a note, and never an extra field", async () => {
    const sent = stubFetch(() => json(SUCCESS));
    const { note: _note, ...noNote } = BODY;
    await write(noNote);
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), noNote);
    assert.ok(!("note" in JSON.parse(String(sent[0].init.body))));
    const extra = { ...BODY, email: "owner@example.com", idea: { ...BODY.idea, secret: "x" } } as unknown as WriteRequestBody;
    await write(extra);
    assert.deepEqual(JSON.parse(String(sent[1].init.body)), BODY);
  });

  test("a route error keeps its code, words, field, and allowance", async () => {
    stubFetch(() => json({ ok: false, code: "daily_limit", error: "You have used today's writes.", allowance: ALLOWANCE }, 429));
    const r = await write(BODY);
    assert.deepEqual(r, { ok: false, status: 429, code: "daily_limit", error: "You have used today's writes.", allowance: ALLOWANCE });
  });

  test("an unknown code or a body that is not JSON becomes a server error with plain words", async () => {
    stubFetch(() => json({ ok: false, code: "made_up", error: "" }, 502));
    const r1 = await write(BODY);
    assert.ok(!r1.ok && r1.code === "server_error" && r1.error === GENERIC_ERROR && r1.status === 502);
    stubFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    const r2 = await write(BODY);
    assert.ok(!r2.ok && r2.code === "server_error" && r2.error === GENERIC_ERROR);
    stubFetch(() => json({ nope: true }));
    const r3 = await write(BODY);
    assert.ok(!r3.ok && r3.code === "server_error", "a 200 without drafts is not a success");
  });

  test("no answer is a network failure with the Try again line", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    assert.deepEqual(await write(BODY), { ok: false, status: 0, code: "network", error: NETWORK_ERROR });
    assert.deepEqual(await fetchSession(), { ok: false, status: 0, code: "network", error: OFFLINE_ERROR });
  });

  test("the browser stops waiting after 115 seconds, or when the panel aborts", async () => {
    assert.equal(WRITE_TIMEOUT_MS, 115_000);
    let aborted = false;
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("aborted"));
        });
      })) as typeof fetch;

    mock.timers.enable({ apis: ["setTimeout"] });
    const pending = write(BODY);
    mock.timers.tick(WRITE_TIMEOUT_MS - 1);
    await Promise.resolve();
    assert.equal(aborted, false);
    mock.timers.tick(1);
    const r = await pending;
    assert.equal(aborted, true);
    assert.ok(!r.ok && r.code === "network");
    mock.timers.reset();

    aborted = false;
    const panel = new AbortController();
    const second = write(BODY, panel.signal);
    panel.abort();
    const r2 = await second;
    assert.ok(aborted && !r2.ok && r2.code === "network");
  });

  test("the other calls: paths, methods, and bodies", async () => {
    const sent = stubFetch((s) => {
      if (s.url === API_PATHS.billing) return json({ url: "https://billing.stripe.com/p/session/test" });
      if (s.url === API_PATHS.profile) return json({ ok: true, profile: EMPTY_PROFILE, ready: false });
      return json({ ok: true, sent: true });
    });
    await restore("owner@example.com");
    await restore("owner@example.com", "LFP-ABCD-EFGH-JKLM-NPQR");
    await saveProfile(EMPTY_PROFILE);
    await signOut();
    const billing = await openBilling();
    assert.deepEqual(
      sent.map((s) => [s.url, s.init.method]),
      [
        [API_PATHS.restore, "POST"],
        [API_PATHS.restore, "POST"],
        [API_PATHS.profile, "PUT"],
        [API_PATHS.session, "DELETE"],
        [API_PATHS.billing, "POST"],
      ],
    );
    assert.deepEqual(JSON.parse(String(sent[0].init.body)), { email: "owner@example.com" });
    assert.deepEqual(JSON.parse(String(sent[1].init.body)), { email: "owner@example.com", key: "LFP-ABCD-EFGH-JKLM-NPQR" });
    assert.deepEqual(JSON.parse(String(sent[2].init.body)), { profile: EMPTY_PROFILE });
    assert.equal(sent[3].init.body, undefined);
    assert.ok(sent.every((s) => s.init.credentials === "same-origin"));
    assert.ok(billing.ok && billing.data.url.startsWith("https://"));
  });

  test("a billing answer without an https link is not followed", async () => {
    stubFetch(() => json({ url: "javascript:alert(1)" }));
    const r = await openBilling();
    assert.ok(!r.ok && r.code === "server_error");
  });

  test("a profile field error comes back with its field", async () => {
    stubFetch(() => json({ ok: false, code: "bad_request", error: "Keep it under 80 characters.", field: "businessName" }, 400));
    const r = await saveProfile(EMPTY_PROFILE);
    assert.deepEqual(r, { ok: false, status: 400, code: "bad_request", error: "Keep it under 80 characters.", field: "businessName" });
  });

  test("the checks the locked screen makes before sending", () => {
    assert.ok(looksLikeEmail(" Owner@Example.com "));
    assert.ok(!looksLikeEmail("owner@example"));
    assert.ok(!looksLikeEmail(""));
    assert.ok(looksLikeKey("LFP-ABCD-EFGH-JKLM-NPQR"));
    assert.ok(looksLikeKey("lfp abcd efgh jklm npqr"));
    assert.ok(looksLikeKey("ABCDEFGHJKLMNPQR"));
    assert.ok(!looksLikeKey("LFP-ABCD-EFGH-JKLM"));
    assert.ok(!looksLikeKey("LFP-XXXX-XXXX-XXXX-XXXX-XXXX"));
    assert.ok(!looksLikeKey(""));
  });
});

/* --------------------------------- sources --------------------------------- */

describe("sources", () => {
  test("the writer panel announces progress, shows errors as alerts, and can stop waiting", () => {
    const panel = source("WritePanel.tsx");
    assert.ok(panel.includes('aria-live="polite"'));
    assert.ok(panel.includes('role="alert"'));
    assert.ok(panel.includes("AbortController"));
    assert.ok(panel.includes('role="status"'));
    assert.ok(panel.includes("aria-busy"));
  });

  test("the app has real tabs and the locked screen labels its fields", () => {
    const app = source("PostCreatorApp.tsx");
    assert.ok(app.includes('role="tablist"'));
    assert.ok(app.includes('role="tab"'));
    assert.ok(app.includes('role="tabpanel"'));
    assert.ok(app.includes("ArrowRight") && app.includes("ArrowLeft"));
    assert.ok(app.includes('mode="paid"'));
    const locked = source("LockedPostCreator.tsx");
    assert.ok(locked.includes("htmlFor={id(\"email\")}") && locked.includes("htmlFor={id(\"key\")}"));
    assert.ok(locked.includes('role="alert"'));
  });

  test("client files never import a server-only module", () => {
    const forbidden = /from\s+["'][^"']*postCreator\/(accessServer|server|db|access|session|subscription|emails|ai\/anthropic|ai\/writer)["']/;
    for (const file of APP_FILES.filter((f) => f !== "page.tsx")) {
      const text = source(file);
      assert.doesNotMatch(text, forbidden, file);
      assert.ok(!text.includes('"server-only"'), file);
      assert.ok(!text.includes("next/headers"), file);
    }
    for (const file of ["LockedPostCreator.tsx", "PostCreatorApp.tsx", "WritePanel.tsx", "ProfileForm.tsx", "AccountPanel.tsx"]) {
      assert.ok(source(file).startsWith('"use client";'), file);
    }
  });

  test("house rules hold in every file", () => {
    assert.ok(APP_FILES.length >= 10);
    for (const file of APP_FILES) {
      const text = source(file);
      assert.doesNotMatch(text, /[\u2014\u2013]/, `${file}: long dash`);
      assert.doesNotMatch(text, /[^\x00-\x7F]/, `${file}: non-ASCII character`);
      assert.doesNotMatch(text, /guarantee/i, file);
      assert.doesNotMatch(text, /\$\d/, `${file}: typed price`);
      assert.ok(!text.includes("@theleadflowpro.com"), `${file}: typed address`);
      assert.doesNotMatch(text, /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, `${file}: phone digits`);
      assert.doesNotMatch(text, /\b(unlimited|unending|endless|infinite|never run out|no limit)\b/i, file);
      assert.ok(!text.includes('<a href="/'), `${file}: internal link without next/link`);
    }
  });
});

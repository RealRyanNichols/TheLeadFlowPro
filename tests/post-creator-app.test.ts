// Post Creator buyer app (/post-creator/app).
//
// The page stays private and per request, every note a buyer can land on
// exists and passes the house copy rules, the writer never sends a second
// request id after a dropped answer, the browser sends the write route
// exactly the request it expects, and the client files never reach for a
// server-only module. No network: every fetch here is a stub.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, describe, mock, test } from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as pageCopy from "../app/post-creator/copy.ts";
import * as api from "../app/post-creator/app/api.ts";
import * as appCopy from "../app/post-creator/app/copy.ts";
import * as buyButtons from "../components/postCreator/BuyButtons.tsx";
import * as setupFields from "../components/postCreator/SetupFields.tsx";
import * as product from "../lib/postCreator/product.ts";
import { PRICES, usd } from "../lib/site/prices.ts";
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
  missingPlatformsLine,
  planLine,
  trimmedLine,
  writeBlockedLabel,
  writeCostLine,
  type ClaimCode,
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

const requireReal = createRequire(import.meta.url);
const StubLink = ({ href, children, prefetch: _prefetch, ...rest }: { href: string; children?: ReactNode; prefetch?: boolean | null }) =>
  createElement("a", { href, ...rest }, children);
const esm = (ns: object) => ({ __esModule: true, ...ns });

/**
 * The locked screen, transpiled with next/link and next/navigation stubbed
 * (neither has an entry Node can load directly). `navigations` records every
 * router call.
 */
type LockedProps = {
  reason: EntitlementReason;
  claim: ClaimCode | null;
  prefill: { email: string; key: string };
  salesOpen: boolean;
  aiOn: boolean;
  canManageBilling: boolean;
};

function loadLocked(navigations: string[] = []): ComponentType<LockedProps> {
  const code = ts.transpileModule(source("LockedPostCreator.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const router = { refresh: () => navigations.push("refresh"), replace: (to: string) => navigations.push(`replace ${to}`), push: (to: string) => navigations.push(`push ${to}`) };
  const accountPanel = { BillingButton: ({ label }: { label?: string }) => createElement("button", { type: "button" }, label ?? "Manage billing") };
  const modules: Record<string, unknown> = {
    react: requireReal("react"),
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "next/navigation": { useRouter: () => router },
    "lucide-react": requireReal("lucide-react"),
    "@/app/post-creator/copy": pageCopy,
    "@/components/postCreator/BuyButtons": esm(buyButtons),
    "@/components/postCreator/SetupFields": setupFields,
    "@/lib/postCreator/product": product,
    "./AccountPanel": accountPanel,
    "./api": api,
    "./copy": appCopy,
  };
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`LockedPostCreator imports ${name}, which this test does not expect`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  return mod.exports.default as ComponentType<LockedProps>;
}

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
  triesLeftThisMonth: 80,
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
  test("CLAIM_NOTES covers exactly the eight claim codes", () => {
    assert.deepEqual(Object.keys(CLAIM_NOTES).sort(), ["existing", "expired", "missing", "notfound", "other_account", "unavailable", "unpaid", "used"]);
    assert.deepEqual([...CLAIM_CODES].sort(), Object.keys(CLAIM_NOTES).sort());
    for (const code of CLAIM_CODES) {
      assert.ok(CLAIM_NOTES[code].length > 20, code);
      assert.ok(isClaimCode(code));
    }
    assert.ok(!isClaimCode("welcome"));
    assert.ok(!isClaimCode(""));
    assert.ok(CLAIM_NOTES.notfound.includes(BUSINESS.email.hello));
  });

  test("other_account, the claim route's answer for a browser signed in elsewhere, is read and explained on both screens", () => {
    // Every note the claim route can send is one the app page reads.
    const route = readFileSync(new URL("../app/api/post-creator/claim/route.ts", import.meta.url), "utf8");
    const sent = /type ClaimNote = ([^;]+);/.exec(route)?.[1].match(/"([a-z_]+)"/g)?.map((q) => q.slice(1, -1)) ?? [];
    assert.ok(sent.includes("other_account"));
    assert.deepEqual([...sent].sort(), [...CLAIM_CODES].sort());
    assert.ok(isClaimCode("other_account"));
    // Locked screen: the key form is on the page.
    assert.match(CLAIM_NOTES.other_account, /was not switched/);
    assert.match(CLAIM_NOTES.other_account, /the email you paid with and the key we emailed to it/);
    // Open app: sign out first, then the key.
    const open = appClaimNote("other_account");
    assert.ok(open && open !== CLAIM_NOTES.other_account);
    assert.match(open ?? "", /sign out on this device in Settings, then open it with the email you paid with/);
    for (const line of [CLAIM_NOTES.other_account, open ?? ""]) assert.deepEqual(copyProblems(line), [], line);
  });

  test("REASON_NOTES covers every entitlement reason, with words for every locked one", () => {
    assert.deepEqual(Object.keys(REASON_NOTES).sort(), Object.keys(ALL_REASONS).sort());
    assert.equal(REASON_NOTES.visitor, "");
    assert.equal(REASON_NOTES.ok, "");
    for (const reason of ["no_account", "signed_out", "unconfigured", "past_due", "canceled"] as const) {
      assert.ok(REASON_NOTES[reason].length > 20, reason);
    }
  });

  test("a dropped write says what Try again can and cannot bring back", () => {
    // The server keeps no draft text: a write that finished behind a dropped
    // connection answers "already delivered" on the retry, with nothing to show.
    assert.match(NETWORK_ERROR, /will not count twice/);
    assert.match(NETWORK_ERROR, /already finished, it counts once, but its drafts cannot be shown here again/);
    assert.doesNotMatch(NETWORK_ERROR, /You will not be counted twice for the same request\.$/);
  });

  test("no claim note says to reload: reloading never re-runs the checkout check", () => {
    for (const code of CLAIM_CODES) {
      assert.doesNotMatch(CLAIM_NOTES[code], /\breload\b/i, code);
      assert.doesNotMatch(CLAIM_NOTES[code], /try again in a minute/i, code);
    }
    // The unpaid note points to the key that is emailed once the payment clears.
    assert.match(CLAIM_NOTES.unpaid, /When the payment goes through, we email your key/);
    assert.match(CLAIM_NOTES.unavailable, /with the key from your receipt email/);
  });

  test("the contact detail help matches the draft filter: emails are always left out", () => {
    const help = PROFILE_FIELD_COPY.ctaDetail.help;
    assert.doesNotMatch(help, /Only this contact detail can appear/);
    assert.match(help, /Email addresses are always left out of drafts\./);
    assert.match(help, /booking link or a phone number/i);
  });

  test("the open app hides the claim notes for a link that already did its job", () => {
    assert.equal(appClaimNote("used"), null);
    assert.equal(appClaimNote("expired"), null);
    assert.equal(appClaimNote(null), null);
    assert.equal(appClaimNote("existing"), CLAIM_NOTES.existing);
    assert.equal(appClaimNote("unavailable"), CLAIM_NOTES.unavailable);
  });

  test("the spec's exact lines", () => {
    assert.equal(
      NETWORK_ERROR,
      "The connection dropped before your drafts arrived. Tap Try again: it will not count twice. If the write had already finished, it counts once, but its drafts cannot be shown here again.",
    );
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

  test("the tries ceiling blocks Write it and shows on the meter only when failed tries used it up first", () => {
    const ready = { aiOn: true, profileReady: true };
    // Writes left, but failed tries used up this month's tries: the 1st, not midnight.
    const month = { ...ALLOWANCE, triesLeftThisMonth: 0, triesLeftToday: 0 };
    assert.equal(writeBlockedLabel({ ...ready, allowance: month }), "No tries left this month");
    assert.equal(
      meterLine(month),
      "63 of 100 AI writes left this month \u00b7 18 left today. Resets October 1. Failed tries count toward a ceiling: 0 tries left this month, back on October 1.",
    );
    // Writes left today, but today's tries are used up: midnight.
    const today = { ...ALLOWANCE, triesLeftToday: 0 };
    assert.equal(writeBlockedLabel({ ...ready, allowance: today }), "No tries left today");
    assert.equal(
      meterLine(today),
      "63 of 100 AI writes left this month \u00b7 18 left today. Resets October 1. Failed tries count toward a ceiling: 0 tries left today, more at midnight Central time.",
    );
    assert.ok(meterLine({ ...ALLOWANCE, triesLeftToday: 1 }).endsWith("1 try left today, more at midnight Central time."));
    // No writes left is the true reason, even with the tries gone too.
    assert.equal(writeBlockedLabel({ ...ready, allowance: { ...month, leftThisMonth: 0, leftToday: 0 } }), "No AI writes left this month");
    assert.equal(writeBlockedLabel({ ...ready, allowance: { ...today, leftToday: 0 } }), "No AI writes left today");
    // Plenty of tries: nothing extra on the meter.
    assert.equal(meterLine(ALLOWANCE), "63 of 100 AI writes left this month \u00b7 18 left today. Resets October 1.");
    // An allowance from before the month count existed never blocks on it.
    const { triesLeftThisMonth: _m, ...old } = ALLOWANCE;
    assert.equal(writeBlockedLabel({ ...ready, allowance: old as Allowance }), null);
    for (const line of [meterLine(month), meterLine(today), APP_COPY.writer.blocked.triesMonth, APP_COPY.writer.blocked.triesToday]) {
      assert.deepEqual(copyProblems(line), [], line);
    }
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

const SUCCESS: WriteSuccess = { ok: true, drafts: [], missing: [], altHooks: [], photoIdea: "", trimmed: 0, allowance: null };

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

  test("write names the platforms that came back without a draft", async () => {
    const draft = { platform: "facebook" as const, text: "Slow drain?", hashtags: [], shotList: [], chars: 11, limit: null, blanks: [] };
    // The route's own list, kept in the order asked and limited to what was asked.
    stubFetch(() => json({ ...SUCCESS, drafts: [draft], missing: ["google", "nextdoor", "instagram"] }));
    const sent = await write(BODY);
    assert.ok(sent.ok);
    assert.deepEqual(sent.data.missing, ["instagram", "google"]);
    // An answer without the list is read from the drafts.
    const { missing: _missing, ...noList } = SUCCESS;
    stubFetch(() => json({ ...noList, drafts: [draft] }));
    const read = await write(BODY);
    assert.ok(read.ok);
    assert.deepEqual(read.data.missing, ["instagram", "google"]);
    assert.equal(
      missingPlatformsLine(read.data.missing),
      "We could not write a clean draft for Instagram and Google Business Profile this time. A write counts when at least one draft comes back, so this one counted. To get those platforms, start a new write for them.",
    );
    assert.equal(missingPlatformsLine([]), "");
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

  test("a write answered by a gateway page, not the route, is a dropped answer that keeps its request id", async () => {
    // The server may have finished and counted the write behind a proxy's 502
    // or 504 page. Try again must send the same id, so it answers from the
    // ledger instead of writing and counting a second time.
    const gateways: [string, () => Response][] = [
      ["502 page", () => new Response("<html>Bad gateway</html>", { status: 502 })],
      ["504 page", () => new Response("<html>Gateway timeout</html>", { status: 504 })],
      ["empty 502", () => new Response("", { status: 502 })],
      ["unknown code", () => json({ ok: false, code: "made_up", error: "" }, 502)],
      ["cut-off 200", () => new Response('{"ok":true,"drafts":[', { status: 200 })],
      ["200 without drafts", () => json({ nope: true })],
    ];
    for (const [name, answer] of gateways) {
      stubFetch(answer);
      const r = await write(BODY);
      assert.ok(!r.ok && r.code === "network" && r.error === NETWORK_ERROR, name);
      const s1 = writerReducer(INITIAL_WRITER_STATE, { type: "submit", newId: ID_A });
      const failed = writerReducer(s1, { type: "response", requestId: ID_A, result: r });
      assert.ok(failed.phase === "failed" && failed.keepRequestId === ID_A && failed.retryable, name);
      assert.deepEqual(writerReducer(failed, { type: "retry", newId: ID_B }), { phase: "writing", requestId: ID_A }, name);
    }
    // The route's own answers keep their code and words.
    stubFetch(() => json({ ok: false, code: "server_error", error: "Something broke." }, 500));
    const own = await write(BODY);
    assert.ok(!own.ok && own.code === "server_error" && own.error === "Something broke.");
    stubFetch(() => json({ ok: false, code: "ai_off", error: "AI writing is off." }, 503));
    const off = await write(BODY);
    assert.ok(!off.ok && off.code === "ai_off");
    // A 4xx page never reached the route, so it stays final with plain words.
    stubFetch(() => new Response("<html>Too large</html>", { status: 413 }));
    const big = await write(BODY);
    assert.ok(!big.ok && big.code === "server_error" && big.error === GENERIC_ERROR);
  });

  test("other calls still read an unknown answer as a server error with plain words", async () => {
    stubFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    const r = await fetchSession();
    assert.ok(!r.ok && r.code === "server_error" && r.error === GENERIC_ERROR);
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

  test("a signed-in device whose plan lapsed gets the plan as its heading, and the key form folded away", () => {
    const Locked = loadLocked();
    const render = (reason: EntitlementReason, extra: Partial<{ salesOpen: boolean; aiOn: boolean; canManageBilling: boolean; claim: ClaimCode | null }> = {}) =>
      renderToStaticMarkup(
        createElement(Locked, {
          reason,
          claim: null,
          prefill: { email: "owner@example.com", key: "" },
          salesOpen: false,
          aiOn: true,
          canManageBilling: true,
          ...extra,
        }),
      );
    const h1 = (html: string) => [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => m[1]);

    const pastDue = render("past_due");
    assert.deepEqual(h1(pastDue), [APP_COPY.lapsed.past_due.title]);
    assert.ok(pastDue.includes(APP_COPY.locked.updateCard));
    assert.ok(pastDue.includes("<details") && pastDue.includes(APP_COPY.locked.otherAccount));
    assert.ok(!pastDue.includes('value="owner@example.com"'), "the folded form is for another account");
    assert.ok(!pastDue.includes("<details open"), "folded until asked for");
    // Arriving from a checkout for another account: the note says why, and the key form it points to starts open.
    const otherAccount = render("past_due", { claim: "other_account" });
    assert.ok(otherAccount.includes("<details open"));
    assert.ok(otherAccount.includes(CLAIM_NOTES.other_account));

    const ended = render("canceled");
    assert.deepEqual(h1(ended), [APP_COPY.lapsed.canceled.title]);
    assert.ok(ended.includes(pageCopy.closedMessage(true, "locked")));
    assert.doesNotMatch(ended, /idea machine above/);
    const endedOpen = render("canceled", { salesOpen: true });
    assert.ok(endedOpen.includes(`Pay once, ${usd(PRICES.postCreatorLifetime)}`));
    assert.doesNotMatch(endedOpen, /once[^<]*once/);

    // Everyone else still gets the key form as the page.
    for (const reason of ["visitor", "signed_out", "no_account", "unconfigured"] as const) {
      const html = render(reason);
      assert.deepEqual(h1(html), [APP_COPY.locked.title], reason);
      assert.ok(!html.includes("<details"), reason);
      assert.ok(html.includes('value="owner@example.com"'), reason);
    }
  });

  test("after a key opens it, the app loads at its plain address, so no ?claim= note lingers", () => {
    const locked = source("LockedPostCreator.tsx");
    assert.ok(locked.includes("startRefresh(() => router.replace(POST_CREATOR.appPath));"));
    assert.ok(!locked.includes("router.refresh()"));
  });

  test("a lost session loads the locked page fresh, from the top", () => {
    const app = source("PostCreatorApp.tsx");
    assert.ok(app.includes("window.location.assign(POST_CREATOR.appPath);"));
    assert.ok(app.includes("const sessionLost = useCallback(() => reloadApp(), []);"));
    assert.ok(!app.includes("router.refresh()"), "a refresh in place keeps the scroll position");
  });

  test("the welcome line goes once the profile is saved", () => {
    const app = source("PostCreatorApp.tsx");
    assert.ok(app.includes("{welcome && !session.profileReady ? ("));
  });

  test("what scrolls into view clears the sticky header, and the drafts come into view before they take focus", () => {
    const app = source("PostCreatorApp.tsx");
    assert.match(app, /role="tablist"[\s\S]*?scroll-mt-24/);
    assert.ok(app.includes('<div ref={writeAreaRef} className="scroll-mt-24">'));
    assert.ok(!app.includes("scroll-mt-4"));
    const panel = source("WritePanel.tsx");
    assert.match(panel, /<h3 id=\{id\("title"\)\} ref=\{headingRef\} tabIndex=\{-1\} className="scroll-mt-24 /);
    assert.match(panel, /<h4 ref=\{resultRef\} tabIndex=\{-1\} className="scroll-mt-24 /);
    assert.ok(!panel.includes("scroll-mt-4"));
    const success = panel.slice(panel.indexOf("requestAnimationFrame(() => {"), panel.indexOf("result.focus({ preventScroll: true });"));
    assert.ok(success.includes('result.scrollIntoView({ block: "start"'), "the drafts scroll to the top first");
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

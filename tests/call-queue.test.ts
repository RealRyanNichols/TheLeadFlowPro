import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as backOfficeNav from "../app/admin/backOfficeNav.ts";
import * as callQueue from "../lib/callQueue.ts";
import * as callSheet from "../lib/callSheet.ts";
import * as contactGaps from "../lib/contactGaps.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import * as hqPhone from "../lib/hq/phone.ts";
import * as leadMessageAuthor from "../lib/leadMessageAuthor.ts";
import * as quo from "../lib/quo.ts";
import * as business from "../lib/site/business.ts";
import * as speedToLead from "../lib/speedToLead.ts";
import { routeExists } from "../scripts/check-links.ts";

// "Start calling": the pure queue (lib/callQueue.ts), the page that picks the
// next person (/admin/call-sheet/next), the "Today's calls" banner at the top
// of the back office, and the plainer call sheet. The pages run for real
// against a fake database that records every read, so "auth before any read"
// and "nothing is written" are checked by behaviour. Fictional leads only.

const {
  NEXT_CALL_PATH,
  SKIP_MAX,
  leftAfterThis,
  nextHref,
  parseLeft,
  parseSkip,
  pickNext,
  queueCardHref,
  runIsFull,
  skippedStillWaiting,
  stillOnSheet,
  waitingBreakdown,
  waitingHeadline,
} = callQueue;

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
const requireReal = createRequire(import.meta.url);

const NEXT_PAGE = "app/admin/call-sheet/next/page.tsx";
const SHEET_PAGE = "app/admin/call-sheet/page.tsx";
const BANNER = "app/admin/TodaysCallsBanner.tsx";

/** A fictional lead id: 0a1b2c3d-0000-4000-8000-00000000000n. */
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1);
const B = id(2);
const C = id(3);

function sheetLead(overrides: Partial<callSheet.CallSheetLead> & { id: string }): callSheet.CallSheetLead {
  return {
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    full_name: "Riley Example",
    business_name: "Example Lawn Care (fictional)",
    email: "riley@example.test",
    phone: "(903) 555-0142",
    interest: "website_launch",
    status: "new",
    source: "website",
    utm_source: null,
    best_contact_method: "call",
    sms_consent: false,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: null,
    ...overrides,
  };
}

/** Three untouched leads, newest first on the sheet: A (1h), B (2h), C (3h). */
function threeLeads(): callSheet.CallSheetLead[] {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  return [
    sheetLead({ id: C, full_name: "Casey Sample", created_at: hoursAgo(3) }),
    sheetLead({ id: A, full_name: "Alex Sample", created_at: hoursAgo(1) }),
    sheetLead({ id: B, full_name: "Blair Sample", created_at: hoursAgo(2) }),
  ];
}

function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// The pure queue.
// ---------------------------------------------------------------------------

test("parseSkip: lead ids only, lowercased, once each, at most the newest hundred", () => {
  assert.deepEqual(parseSkip(`${A},${B.toUpperCase()}, ${A} ,not-an-id,,${C}`), [A, B, C]);
  assert.deepEqual(parseSkip([A, `${B},${C}`]), [A, B, C], "repeated parameters are joined");
  for (const junk of [undefined, null, 42, {}, "", "   ", "sample", "../../etc", `"><script>`, `${A}x`]) {
    assert.deepEqual(parseSkip(junk), [], String(junk));
  }
  const many = Array.from({ length: SKIP_MAX + 7 }, (_, i) => id(i + 1));
  const kept = parseSkip(many.join(","));
  assert.equal(SKIP_MAX, 100);
  // The longest list stays a short URL, even sent twice (the page and its Referer).
  assert.ok(`skip=${kept.join(",")}`.length < 4_000);
  assert.equal(kept.length, SKIP_MAX);
  assert.deepEqual(kept, many.slice(-SKIP_MAX), "the newest are kept, so the person just passed never comes back first");
});

test("pickNext: the first person in sheet order this run has not passed, and how many are left counting them", () => {
  const sheet = callSheet.buildCallSheet(threeLeads(), [], new Date());
  assert.deepEqual(sheet.rows.map((r) => r.lead.id), [A, B, C], "fixture: newest first");
  const first = pickNext(sheet.rows, []);
  assert.equal(first?.row.lead.id, A);
  assert.equal(first?.left, 3);
  const second = pickNext(sheet.rows, [A]);
  assert.equal(second?.row.lead.id, B);
  assert.equal(second?.left, 2);
  // Skipping someone further down still counts only the people left.
  const skippedMiddle = pickNext(sheet.rows, [B.toUpperCase()]);
  assert.equal(skippedMiddle?.row.lead.id, A);
  assert.equal(skippedMiddle?.left, 2);
  // An id that is no longer on the sheet (their call was saved) changes nothing.
  assert.equal(pickNext(sheet.rows, [id(99)])?.left, 3);
  assert.equal(pickNext(sheet.rows, [A, B, C]), null);
  assert.equal(pickNext([], []), null);
  assert.equal(skippedStillWaiting(sheet.rows, [A, C, id(99)]), 2);
});

test("stillOnSheet and runIsFull: saved people leave the list, and a full list is never overflowed", () => {
  const sheet = callSheet.buildCallSheet(threeLeads(), [], new Date());
  // Someone whose call was saved is off the sheet, so they come off the list; the order of the rest is kept.
  assert.deepEqual(stillOnSheet(sheet.rows, [C, id(98), A.toUpperCase(), id(99)]), [C, A]);
  assert.deepEqual(stillOnSheet(sheet.rows, []), []);
  assert.deepEqual(stillOnSheet([], [A, B]), []);
  // Full means the card would have to drop the oldest id to add itself.
  const ids = (n: number) => Array.from({ length: n }, (_, i) => id(i + 1));
  assert.equal(runIsFull([]), false);
  assert.equal(runIsFull(ids(SKIP_MAX - 1)), false);
  assert.equal(runIsFull(ids(SKIP_MAX)), true);
  // Below full, the card's link keeps every id: nothing falls off the front.
  const almost = ids(SKIP_MAX - 1);
  const href = nextHref(almost, id(500));
  assert.deepEqual(href.slice(href.indexOf("skip=") + 5).split(","), [...almost, id(500)]);
});

test("the queue's links: the card in a run, and the next person with this one added to the skip list", () => {
  assert.equal(NEXT_CALL_PATH, "/admin/call-sheet/next");
  assert.equal(queueCardHref(A, [], 3), `/admin/call-sheet/${A}?queue=1&left=3`);
  assert.equal(queueCardHref(B, [A], 2), `/admin/call-sheet/${B}?queue=1&left=2&skip=${A}`);
  assert.equal(queueCardHref(C, [A, "junk", B], 1), `/admin/call-sheet/${C}?queue=1&left=1&skip=${A},${B}`);
  assert.equal(nextHref([], A), `/admin/call-sheet/next?skip=${A}`);
  assert.equal(nextHref([A], B), `/admin/call-sheet/next?skip=${A},${B}`);
  assert.equal(nextHref([A, B], A.toUpperCase()), `/admin/call-sheet/next?skip=${B},${A}`, "no duplicate; this person goes last");
  assert.equal(nextHref([], "sample"), NEXT_CALL_PATH, "only a real lead id is added");
  assert.equal(nextHref([A], null), `/admin/call-sheet/next?skip=${A}`);
  // A full list drops the oldest, never the person just passed.
  const full = Array.from({ length: SKIP_MAX }, (_, i) => id(i + 10));
  const href = nextHref(full, A);
  const list = href.slice(href.indexOf("skip=") + 5).split(",");
  assert.equal(list.length, SKIP_MAX);
  assert.equal(list[list.length - 1], A);
  assert.ok(!list.includes(full[0]));
  // The count in the card's URL, and the count the panel shows after a save.
  assert.equal(parseLeft("5"), 5);
  assert.equal(parseLeft("0"), 0);
  for (const bad of [undefined, "", "-1", "2.5", "lots", "999999", ["5"]]) assert.equal(parseLeft(bad), null, String(bad));
  assert.equal(leftAfterThis(5), 4);
  assert.equal(leftAfterThis(1), 0);
  assert.equal(leftAfterThis(0), 0);
  assert.equal(leftAfterThis(null), null);
});

test("the banner's words: a plain headline and a short breakdown in the sheet's order", () => {
  assert.equal(waitingHeadline(1), "1 person is waiting on a call");
  assert.equal(waitingHeadline(7), "7 people are waiting on a call");
  const counts = { reply: 2, callback: 1, answer: 3, waiting: 0, follow_up: 1 };
  assert.equal(waitingBreakdown(counts), "2 reached out · 1 call you promised · 3 new · 1 to follow up");
  assert.equal(waitingBreakdown({ reply: 0, callback: 2, answer: 0, waiting: 4, follow_up: 0 }), "2 calls you promised · 4 still waiting");
  assert.equal(waitingBreakdown({ reply: 0, callback: 0, answer: 0, waiting: 0, follow_up: 0 }), "");
  for (const line of [waitingHeadline(1), waitingHeadline(7), waitingBreakdown(counts)]) assert.deepEqual(copyProblems(line), []);
});

// ---------------------------------------------------------------------------
// The pages and the banner, compiled the way Next compiles them, against a
// fake database. Next itself is stubbed.
// ---------------------------------------------------------------------------

class Redirect extends Error {
  url: string;
  constructor(url: string) {
    super(`redirect ${url}`);
    this.url = url;
  }
}

type Db = {
  signedIn?: boolean;
  role?: string;
  leads?: callSheet.CallSheetLead[];
  /** Tables whose read comes back with an error. */
  failing?: string[];
};

function fakeDb(db: Db, reads: string[]) {
  return {
    auth: {
      getUser: async () => ({ data: { user: db.signedIn === false ? null : { id: "staff-ryan", email: "owner@example.test" } } }),
    },
    from(table: string) {
      reads.push(table);
      const result = () => {
        if (db.failing?.includes(table)) return { data: null, error: { message: "offline" } };
        if (table === "profiles") return { data: { role: db.role ?? "admin" }, error: null };
        if (table === "leads") return { data: db.leads ?? [], error: null };
        if (["lead_notes", "lead_calls", "lead_messages"].includes(table)) return { data: [], error: null };
        return { data: null, error: { message: `unexpected table ${table}` } };
      };
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "in", "gte", "lt", "lte", "not", "order", "limit"]) query[method] = () => query;
      for (const write of ["insert", "update", "upsert", "delete", "rpc"]) {
        query[write] = () => {
          throw new Error(`tried to ${write} ${table}`);
        };
      }
      query.single = async () => result();
      query.maybeSingle = async () => result();
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
      return query;
    },
  };
}

/** The real call sheet loader, compiled with "server-only" stubbed. */
function callSheetServerModule(): Record<string, unknown> {
  const code = ts.transpileModule(src("lib/callSheetServer.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modules: Record<string, unknown> = { "server-only": {}, "@/lib/callSheet": callSheet, "@/lib/speedToLead": speedToLead };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)((name: string) => modules[name], mod, mod.exports);
  return mod.exports;
}

const StubLink = ({ href, children, prefetch, ...rest }: { href: string; children?: ReactNode; prefetch?: boolean | null }) =>
  createElement("a", { href, "data-prefetch": prefetch === false ? "off" : undefined, ...rest }, children);

function load(file: string, db: Db, extra: Record<string, unknown> = {}) {
  const reads: string[] = [];
  const code = ts.transpileModule(src(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "next/navigation": {
      redirect: (url: string) => {
        throw new Redirect(url);
      },
    },
    "@/lib/supabase/server": { createClient: async () => fakeDb(db, reads) },
    "@/lib/callSheetServer": callSheetServerModule(),
    "@/lib/callSheet": callSheet,
    "@/lib/callQueue": callQueue,
    "@/lib/contactGaps": contactGaps,
    "@/lib/hq/phone": hqPhone,
    "@/lib/leadMessageAuthor": leadMessageAuthor,
    "@/lib/speedToLead": speedToLead,
    "@/lib/site/business": business,
    "@/lib/quo": quo,
    "../command-center/LiveRefresh": { __esModule: true, default: () => null },
    ...extra,
  };
  const mod: { exports: { default?: (props: unknown) => Promise<unknown> } } = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`${file} imports ${name}, which this harness does not expect`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  assert.equal(typeof mod.exports.default, "function");
  return { run: mod.exports.default!, reads };
}

async function nextPage(db: Db, query?: Record<string, string | string[]>) {
  const { run, reads } = load(NEXT_PAGE, db);
  try {
    const element = await run(query === undefined ? {} : { searchParams: Promise.resolve(query) });
    return { html: renderToStaticMarkup(element as never), reads, redirect: null as string | null };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, redirect: e.url };
    throw e;
  }
}

test("next page: signed in and admin before anything is read", async () => {
  const out = await nextPage({ signedIn: false, leads: threeLeads() });
  assert.equal(out.redirect, "/login?next=/admin/call-sheet/next");
  assert.deepEqual(out.reads, []);
  const sales = await nextPage({ role: "sales", leads: threeLeads() });
  assert.equal(sales.redirect, "/dashboard");
  assert.deepEqual(sales.reads, ["profiles"]);
  const page = src(NEXT_PAGE);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  const body = page.slice(page.indexOf("export default async function"));
  assert.ok(body.indexOf("auth.getUser()") < body.indexOf('profile?.role !== "admin"'));
  assert.ok(body.indexOf('profile?.role !== "admin"') < body.indexOf("loadCallSheet("), "the role check comes before the sheet is read");
  assert.ok(!/\.(insert|update|upsert|delete|rpc)\(|lib\/supabase\/service|fetch\(/.test(page), "read-only, the admin's own client");
});

test("next page: straight to the first person left, in queue mode, never someone already passed", async () => {
  const first = await nextPage({ leads: threeLeads() });
  assert.equal(first.redirect, `/admin/call-sheet/${A}?queue=1&left=3`);
  assert.equal(first.reads[0], "profiles");
  assert.ok(first.reads.includes("leads") && first.reads.indexOf("leads") > 0);
  const second = await nextPage({ leads: threeLeads() }, { skip: A });
  assert.equal(second.redirect, `/admin/call-sheet/${B}?queue=1&left=2&skip=${A}`);
  const third = await nextPage({ leads: threeLeads() }, { skip: `${A},junk,${B.toUpperCase()}` });
  assert.equal(third.redirect, `/admin/call-sheet/${C}?queue=1&left=1&skip=${A},${B}`);
  // The static "next" folder is a real route beside [leadId], and the card only takes a UUID.
  assert.ok(existsSync(join(process.cwd(), NEXT_PAGE)));
  assert.ok(routeExists(NEXT_CALL_PATH));
  assert.match(src("app/admin/call-sheet/[leadId]/page.tsx"), /if \(!UUID_RE\.test\(leadId\)\) notFound\(\);/);
});

test("next page: caught up says so calmly, says when people come back, and links to the list", async () => {
  const empty = await nextPage({ leads: [] });
  assert.equal(empty.redirect, null);
  const text = textOf(empty.html);
  assert.ok(text.includes("You are caught up."), text);
  assert.ok(text.includes("Nobody is waiting on a call right now."), text);
  assert.ok(text.includes("A call back comes back at the time you picked"), text);
  assert.ok(text.includes(`comes back as a follow-up`), text);
  assert.ok(empty.html.includes('href="/admin/call-sheet"') && text.includes("See the call sheet"));
  assert.ok(empty.html.includes('href="/admin"') && text.includes("Open the lead list"));
  assert.ok(!/role="alert"/.test(empty.html));
  assert.match(empty.html, /min-h-\[52px\]/);
  assert.deepEqual(copyProblems(text), []);
  // Caught up, the call sheet is empty: the lead list is the one big button, the sheet a quiet link after it.
  const big = [...empty.html.matchAll(/<a href="([^"]*)"[^>]*class="([^"]*)"[^>]*>([^<]*)<\/a>/g)].filter((m) => m[2].includes("min-h-[52px]"));
  assert.deepEqual(big.map((m) => [m[1], m[3]]), [["/admin", "Open the lead list"]]);
  const sheetLink = /<a href="\/admin\/call-sheet"[^>]*class="([^"]*)"[^>]*>See the call sheet<\/a>/.exec(empty.html);
  assert.ok(sheetLink, empty.html);
  assert.ok(!sheetLink[1].includes("min-h-[52px]") && sheetLink[1].includes("min-h-[44px]"), sheetLink[1]);
  assert.ok(empty.html.indexOf("Open the lead list") < empty.html.indexOf("See the call sheet"));

  // Everyone left was skipped in this run: the end of the list, and a way to go through them again.
  const skipped = await nextPage({ leads: threeLeads() }, { skip: `${A},${B},${C}` });
  const st = textOf(skipped.html);
  assert.ok(st.includes("That is the end of the list."), st);
  assert.ok(st.includes("3 people you skipped are still on the list"), st);
  assert.match(skipped.html, /<a href="\/admin\/call-sheet\/next" data-prefetch="off"[^>]*>Call the ones you skipped<\/a>/);
  // Going through the skipped ones again is the one big button; the sheet and the lead list stay quiet links.
  const skippedBig = [...skipped.html.matchAll(/<a href="([^"]*)"[^>]*class="([^"]*)"[^>]*>([^<]*)<\/a>/g)].filter((m) => m[2].includes("min-h-[52px]"));
  assert.deepEqual(skippedBig.map((m) => m[3]), ["Call the ones you skipped"]);
  assert.ok(st.includes("See the call sheet") && st.includes("Open the lead list"), st);
  assert.deepEqual(copyProblems(st), []);
  const one = textOf((await nextPage({ leads: threeLeads().slice(0, 1) }, { skip: C })).html);
  assert.ok(one.includes("1 person you skipped is still on the list"), one);
});

test("next page: a failed read is a connection problem, not an empty list, and Try again keeps the run", async () => {
  const down = await nextPage({ leads: threeLeads(), failing: ["leads"] }, { skip: A });
  assert.equal(down.redirect, null);
  assert.match(down.html, /role="alert"/);
  const text = textOf(down.html);
  assert.ok(text.includes("This is a connection problem, not an empty list."), text);
  assert.ok(!text.includes("caught up"), text);
  assert.ok(down.html.includes(`href="/admin/call-sheet/next?skip=${A}"`));
  const history = await nextPage({ leads: threeLeads(), failing: ["lead_notes"] });
  assert.ok(textOf(history.html).includes("This is a connection problem, not an empty list."));
  assert.deepEqual(copyProblems(text), []);
});

/** `n` untouched fictional leads, one hour apart, all on the sheet. */
function manyLeads(n: number): callSheet.CallSheetLead[] {
  return Array.from({ length: n }, (_, i) =>
    sheetLead({ id: id(i + 1), full_name: `Sample Person ${i + 1}`, created_at: new Date(Date.now() - (i + 1) * 3_600_000).toISOString() }),
  );
}

/**
 * A whole "Start calling" run, the way the pages chain: /next picks someone and
 * redirects to their card, the card's link is nextHref over the card's own skip
 * list plus this person, and that goes back to /next. `act` decides per visit:
 * "save" takes the lead off the sheet (a saved call sets when they come back),
 * "skip" leaves them on it.
 */
async function walkRun(leads: callSheet.CallSheetLead[], act: (visit: number) => "save" | "skip") {
  const db: Db = { leads: [...leads] };
  const visits: string[] = [];
  const lefts: number[] = [];
  const skipLengths: number[] = [];
  let query: Record<string, string> | undefined;
  for (let step = 0; step < leads.length * 3; step++) {
    const out = await nextPage(db, query);
    if (!out.redirect) return { visits, lefts, skipLengths, html: out.html };
    const card = new URL(out.redirect, "https://example.test");
    const leadId = card.pathname.slice("/admin/call-sheet/".length);
    assert.equal(card.searchParams.get("queue"), "1");
    visits.push(leadId);
    lefts.push(Number(card.searchParams.get("left")));
    const cardSkip = parseSkip(card.searchParams.get("skip") ?? "");
    skipLengths.push(cardSkip.length);
    if (act(visits.length) === "save") db.leads = db.leads!.filter((l) => l.id !== leadId);
    const next = new URL(nextHref(cardSkip, leadId), "https://example.test");
    assert.equal(next.pathname, NEXT_CALL_PATH);
    query = { skip: next.searchParams.get("skip") ?? "" };
  }
  assert.fail(`the run never ended: ${visits.length} visits`);
}

test("a run where every person is skipped visits each one exactly once, then reaches the end of the list", async () => {
  const leads = manyLeads(60);
  const run = await walkRun(leads, () => "skip");
  assert.equal(run.visits.length, 60);
  assert.equal(new Set(run.visits).size, 60, "nobody is shown twice");
  assert.deepEqual([...run.visits].sort(), leads.map((l) => l.id).sort(), "everyone is shown");
  assert.deepEqual(run.lefts, Array.from({ length: 60 }, (_, i) => 60 - i), "the count goes down by one each time");
  const text = textOf(run.html);
  assert.ok(text.includes("That is the end of the list."), text);
  assert.ok(text.includes("60 people you skipped are still on the list"), text);
});

test("a run that saves most people and skips some never returns to anyone, and saved people use no places on the list", async () => {
  const leads = manyLeads(80);
  // Save four of every five (they leave the sheet), skip every fifth.
  const run = await walkRun(leads, (visit) => (visit % 5 === 0 ? "skip" : "save"));
  assert.equal(run.visits.length, 80);
  assert.equal(new Set(run.visits).size, 80, "nobody is shown twice");
  // Only the people skipped and still waiting ride along in the URL.
  assert.ok(Math.max(...run.skipLengths) <= 16, String(Math.max(...run.skipLengths)));
  const text = textOf(run.html);
  assert.ok(text.includes("That is the end of the list."), text);
  assert.ok(text.includes("16 people you skipped are still on the list"), text);
});

test("a run that fills the list ends plainly instead of going back to the top", async () => {
  const leads = manyLeads(SKIP_MAX + 10);
  const run = await walkRun(leads, () => "skip");
  assert.equal(run.visits.length, SKIP_MAX);
  assert.equal(new Set(run.visits).size, SKIP_MAX, "nobody is shown twice");
  assert.ok(Math.max(...run.skipLengths) < SKIP_MAX, "the card never gets a list it would have to cut");
  const text = textOf(run.html);
  assert.ok(text.includes(`You have skipped ${SKIP_MAX} people in this run.`), text);
  assert.ok(text.includes("10 more people are still waiting after them. Start again from the top to keep going."), text);
  assert.ok(!text.includes("That is the end of the list.") && !text.includes("caught up"), text);
  assert.ok(!/role="alert"/.test(run.html));
  // One big way on, from the top; the sheet and the lead list stay quiet links.
  const big = [...run.html.matchAll(/<a href="([^"]*)"[^>]*class="([^"]*)"[^>]*>([^<]*)<\/a>/g)].filter((m) => m[2].includes("min-h-[52px]"));
  assert.deepEqual(big.map((m) => [m[1], m[3]]), [[NEXT_CALL_PATH, "Start again from the top"]]);
  assert.match(run.html, /<a href="\/admin\/call-sheet\/next" data-prefetch="off"/);
  assert.ok(run.html.includes('href="/admin/call-sheet"') && run.html.includes('href="/admin"'));
  assert.deepEqual(copyProblems(text), []);
  // One person left after a full list: singular.
  const full = manyLeads(SKIP_MAX + 1);
  const one = await nextPage({ leads: full }, { skip: full.slice(0, SKIP_MAX).map((l) => l.id).join(",") });
  assert.equal(one.redirect, null);
  assert.ok(textOf(one.html).includes("1 more person is still waiting after them."), textOf(one.html));
});

async function banner(db: Db, reads: string[] = []) {
  const { run } = load(BANNER, db);
  const element = await run({ supabase: fakeDb(db, reads) });
  return { element, html: element === null ? "" : renderToStaticMarkup(element as never), reads };
}

test("today's calls banner: how many are waiting, what kind, and one big way in", async () => {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const leads = [...threeLeads(), sheetLead({ id: id(4), full_name: "Dana Sample", created_at: hoursAgo(200) })];
  const out = await banner({ leads });
  const text = textOf(out.html);
  assert.ok(text.includes("4 people are waiting on a call"), text);
  assert.ok(text.includes("3 new · 1 still waiting"), text);
  assert.match(out.html, /<a href="\/admin\/call-sheet\/next" data-prefetch="off"[^>]*min-h-\[52px\][^>]*>Start calling<\/a>/);
  assert.match(out.html, /<a href="\/admin\/call-sheet"[^>]*min-h-\[44px\][^>]*>See the list<\/a>/);
  assert.match(out.html, /focus-visible:outline/);
  assert.match(out.html, /<section aria-labelledby="todays-calls-banner"/);
  assert.deepEqual(copyProblems(text), []);
  // Only the call sheet's own reads, with the client it was handed.
  assert.deepEqual([...new Set(out.reads)].sort(), ["lead_calls", "lead_messages", "lead_notes", "leads"]);

  const one = textOf((await banner({ leads: threeLeads().slice(0, 1) })).html);
  assert.ok(one.includes("1 person is waiting on a call"), one);

  const none = await banner({ leads: [] });
  assert.equal(textOf(none.html), "Nobody is waiting on a call right now.");
  assert.ok(!none.html.includes("Start calling"));
});

test("today's calls banner: when the sheet cannot be read it steps aside, so the page still works", async () => {
  assert.equal((await banner({ leads: threeLeads(), failing: ["leads"] })).element, null);
  assert.equal((await banner({ leads: threeLeads(), failing: ["lead_messages"] })).element, null);
  // Even a client that throws never takes the page down.
  const { run } = load(BANNER, {});
  const throwing = { from: () => { throw new Error("socket closed"); } };
  assert.equal(await run({ supabase: throwing }), null);
  const file = src(BANNER);
  assert.ok(!/lib\/supabase\/service|createClient|\.(insert|update|upsert|delete|rpc)\(/.test(file), "reads with the page's own client only");
});

test("the banner sits at the top of the lead list, after the page's own admin check", () => {
  const page = src("app/admin/page.tsx");
  const body = page.slice(page.indexOf("export default async function"));
  const role = body.indexOf('profile?.role !== "admin"');
  assert.ok(body.indexOf("auth.getUser()") > 0 && role > body.indexOf("auth.getUser()"));
  assert.ok(role < body.indexOf('.from("leads")'), "the role check comes before the lead read");
  assert.ok(role < body.indexOf("<TodaysCallsBanner supabase={supabase} />"));
  // First thing on the page, in the normal view and when the leads read fails.
  assert.equal((body.match(/<TodaysCallsBanner supabase=\{supabase\} \/>/g) ?? []).length, 2);
  assert.ok(body.indexOf("<TodaysCallsBanner") < body.indexOf("Leads & conversations"));
  assert.ok(body.indexOf("<TodaysCallsBanner") < body.indexOf("Leads could not be loaded."));
  const center = src("app/admin/command-center/page.tsx");
  assert.equal((center.match(/<TodaysCallsBanner supabase=\{supabase\} className="" \/>/g) ?? []).length, 2);
});

// ---------------------------------------------------------------------------
// The plainer call sheet, rendered.
// ---------------------------------------------------------------------------

async function sheetPage(db: Db) {
  const { run, reads } = load(SHEET_PAGE, db);
  const element = await run({});
  return { html: renderToStaticMarkup(element as never), reads };
}

test("call sheet: one plain sentence, the rules folded under How this works, and a big Start calling", async () => {
  const leads = threeLeads().map((l, i) => (i === 0 ? { ...l, sms_consent: true } : l));
  const out = await sheetPage({ leads });
  const text = textOf(out.html);
  assert.ok(
    text.includes("Call these people from the top. Open a card, call, and tap what happened. Each person comes back when you said they would."),
    text,
  );
  assert.ok(!text.includes("Open the call card and log how the call went: that takes the lead off"), "the long paragraph is gone");
  const details = /<details[^>]*><summary[^>]*>How this works<\/summary><ul[^>]*>([\s\S]*?)<\/ul><\/details>/.exec(out.html);
  assert.ok(details, "How this works is a details disclosure");
  const bullets = details[1].match(/<li>/g) ?? [];
  assert.ok(bullets.length >= 3 && bullets.length <= 4, String(bullets.length));
  const rules = textOf(details[1]);
  assert.ok(rules.includes("The welcome email and the automatic text do not count."), rules);
  assert.ok(rules.includes("Nothing is ever sent to a lead from here."), rules);
  assert.ok(rules.includes("comes back as a follow-up"), rules);
  assert.match(out.html, /<summary class="[^"]*min-h-\[44px\][^"]*focus-visible:outline/);
  // Start calling: first action on the page, 52px, full width on a phone.
  const start = /<a href="\/admin\/call-sheet\/next" data-prefetch="off" class="([^"]*)">Start calling<\/a>/.exec(out.html);
  assert.ok(start, "Start calling links to the next person");
  assert.ok(start[1].includes("min-h-[52px]") && start[1].includes("w-full") && start[1].includes("sm:w-auto"), start[1]);
  assert.ok(out.html.indexOf("Start calling") < out.html.indexOf("Open call card"));
  assert.ok(text.includes("3 people, one card at a time, from the top."), text);
  assert.ok(text.includes("From your own records:"), text);
  assert.deepEqual(copyProblems(text), []);
  assert.deepEqual(out.reads[0], "profiles");

  // Nobody waiting: no Start calling.
  const empty = await sheetPage({ leads: [] });
  assert.ok(!empty.html.includes("Start calling"));
  assert.ok(textOf(empty.html).includes("Nobody is waiting on a call right now."));
  // A failed read: no Start calling, and the connection alert.
  const down = await sheetPage({ leads: threeLeads(), failing: ["leads"] });
  assert.ok(!down.html.includes("Start calling"));
  assert.ok(textOf(down.html).includes("This is a connection problem, not an empty list."));
});

test("call sheet rows: Open call card is the one filled button; Call, Text and Email are outlines; Full record is a small link", async () => {
  const leads = threeLeads().map((l) => (l.id === A ? { ...l, sms_consent: true } : l));
  const out = await sheetPage({ leads });
  const rows = out.html.split("<li ").slice(1);
  assert.equal(rows.filter((r) => r.includes("Open call card")).length, 3);
  const row = rows.find((r) => r.includes("Alex Sample"))!;
  const anchor = (label: RegExp) => {
    const m = new RegExp(`<a href="([^"]*)"[^>]*class="([^"]*)"[^>]*>${label.source}</a>`).exec(row);
    assert.ok(m, `${label}`);
    return { href: m[1], cls: m[2] };
  };
  const card = anchor(/Open call card/);
  assert.equal(card.href, `/admin/call-sheet/${A}`);
  assert.ok(card.cls.includes("bg-[var(--blue)]") && card.cls.includes("text-white"), card.cls);
  assert.match(row, /aria-label="Open call card for Alex Sample"/);
  for (const label of [/Call \(903\) 555-0142/, /Text \(consented\)/, /Email/]) {
    const { cls } = anchor(label);
    assert.ok(cls.includes("border") && !cls.includes("bg-[var(--blue)]"), `${label}: ${cls}`);
    assert.ok(cls.includes("min-h-[44px]"), `${label} is 44px`);
  }
  const record = anchor(/Full record/);
  assert.equal(record.href, `/admin/leads/${A}`);
  assert.ok(record.cls.includes("text-xs") && !record.cls.includes("border") && record.cls.includes("min-h-[44px]"), record.cls);
  assert.ok(row.indexOf("Open call card") < row.indexOf("Call (903)"), "the call card comes first on the row");
  // Only one filled button per row.
  for (const r of rows) assert.equal((r.match(/bg-\[var\(--blue\)\]/g) ?? []).length, 1);
  // No consent: the reason, not a text link.
  const other = rows.find((r) => r.includes("Blair Sample"))!;
  assert.ok(!other.includes('href="sms:') && other.includes("No text consent"));
});

test("call sheet rows: Email only for a real address, the call card's rule; otherwise the reason, muted", async () => {
  const leads = [
    sheetLead({ id: A, full_name: "Alex Sample", email: "alex@example.test", phone: "+19035550105", created_at: new Date(Date.now() - 3_600_000).toISOString() }),
    sheetLead({ id: B, full_name: "Blair Sample", email: "demo-0010@no-email.facebook.lead", created_at: new Date(Date.now() - 2 * 3_600_000).toISOString() }),
    sheetLead({ id: C, full_name: "Casey Sample", email: null, created_at: new Date(Date.now() - 3 * 3_600_000).toISOString() }),
    sheetLead({ id: id(4), full_name: "Dana Sample", email: "DEMO-0011@No-Email.Facebook.Lead", created_at: new Date(Date.now() - 4 * 3_600_000).toISOString() }),
  ];
  const out = await sheetPage({ leads });
  const rows = out.html.split("<li ").slice(1);
  const row = (name: string) => {
    const found = rows.find((r) => r.includes(name));
    assert.ok(found, name);
    return found;
  };
  const muted = (r: string, words: string) =>
    new RegExp(`<span class="([^"]*)">${words}</span>`).exec(r)?.[1] ?? "";

  // A real address: the Email outline, straight to their address.
  const alex = row("Alex Sample");
  const email = /<a href="mailto:alex@example\.test" class="([^"]*)">Email<\/a>/.exec(alex);
  assert.ok(email, alex);
  assert.ok(email[1].includes("border") && email[1].includes("min-h-[44px]") && !email[1].includes("bg-[var(--blue)]"), email[1]);
  // Facebook's placeholder, in any case: no mailto, the call card's reason in muted text.
  for (const name of ["Blair Sample", "Dana Sample"]) {
    const r = row(name);
    assert.ok(!r.includes('href="mailto:'), name);
    assert.ok(!/>Email</.test(r), name);
    const cls = muted(r, "Facebook did not share an email");
    assert.ok(cls.includes("text-[var(--muted)]") && cls.includes("min-h-[44px]"), `${name}: ${cls}`);
  }
  // Nothing on file: the reason, never a button.
  const casey = row("Casey Sample");
  assert.ok(!casey.includes('href="mailto:'));
  assert.ok(muted(casey, "No email on file").includes("text-[var(--muted)]"), casey);
  // The words are lib/contactGaps.ts's own, and the page uses the call card's check.
  assert.equal(contactGaps.emailGap("demo-0010@no-email.facebook.lead")?.label, "Facebook did not share an email");
  assert.equal(contactGaps.emailGap(null)?.label, "No email on file");
  const page = src(SHEET_PAGE);
  assert.ok(page.includes("hasLeadEmailAddress(row.lead.email)"), "the call card's rule");
  assert.ok(page.includes("emailGap(row.lead.email)"), "the call card's words");
  assert.ok(!/row\.lead\.email \? \(/.test(page), "no Email button just because the field is filled");

  // The Call button reads the number it dials, formatted: (903) 555-0105, not +19035550105.
  assert.match(alex, /<a href="tel:\+19035550105" class="[^"]*">Call \(903\) 555-0105<\/a>/);
  assert.ok(!textOf(alex).includes("Call +1"), textOf(alex));
  for (const r of rows) assert.deepEqual(copyProblems(textOf(r)), []);
});

/**
 * The admin layout, run for real: auth, then the header. Next and the page's
 * own components are stubbed; the nav (app/admin/BackOfficeNav.tsx) and its
 * data are the real thing, on the page at `pathname`.
 */
async function adminLayout(db: Db = {}, pathname = "/admin/call-sheet") {
  const icon = (name: string) => (props: Record<string, unknown>) => createElement("svg", { ...props, "data-icon": name });
  const stubs = {
    "@/lib/publicPageMetadata": { PRIVATE_PAGE_METADATA: {} },
    "next/navigation": {
      redirect: (url: string) => {
        throw new Redirect(url);
      },
      usePathname: () => pathname,
    },
    "lucide-react": { ArrowUpRight: icon("external"), ChevronDown: icon("chevron"), Menu: icon("menu"), X: icon("close") },
    "@/components/BrandLockup": { __esModule: true, default: ({ href }: { href: string }) => createElement("a", { href, "data-brand": "" }, "The LeadFlow Pro") },
    "@/components/InternalTrafficMarker": { __esModule: true, default: () => null },
    // The real SignOutButton's markup: a form that posts to /auth/signout with one submit button.
    "@/components/SignOutButton": {
      __esModule: true,
      default: ({ className }: { className?: string }) =>
        createElement("form", { action: "/auth/signout", method: "post" }, createElement("button", { type: "submit", className }, "Sign out")),
    },
    "./AdminMenuCloser": { __esModule: true, default: () => null },
    "./backOfficeNav": backOfficeNav,
  };
  const nav = load("app/admin/BackOfficeNav.tsx", db, stubs);
  const { run, reads } = load("app/admin/layout.tsx", db, { ...stubs, "./BackOfficeNav": { __esModule: true, default: nav.run } });
  try {
    const element = await run({ children: createElement("main", null, "PAGE") });
    return { html: renderToStaticMarkup(element as never), reads, redirect: null as string | null };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, redirect: e.url };
    throw e;
  }
}

test("the back office nav: Today's calls and the four daily pages in one row; Menu holds every page under six headings", async () => {
  const out = await adminLayout();
  assert.equal(out.redirect, null);
  const html = out.html;
  const header = html.slice(0, html.indexOf("<main>PAGE</main>"));
  const nav = html.slice(html.indexOf("<nav"), html.indexOf("</nav>") + "</nav>".length);
  const anchors = (part: string) => [...part.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: textOf(m[2]), tag: m[0] }));
  const target = (tag: string) => /min-h-\[44px\]/.test(tag) && /focus-visible:outline/.test(tag);

  // Today's calls: the first link in the nav, the only link to the call sheet anywhere in the header, under that
  // name, a 44px target at every width, and marked as the page you are on when you are on it.
  const all = anchors(nav);
  assert.deepEqual({ href: all[0].href, text: all[0].text }, { href: "/admin/call-sheet", text: "Today's calls" });
  assert.equal(all.filter((a) => a.href === "/admin/call-sheet").length, 1);
  assert.equal((header.match(/href="\/admin\/call-sheet"/g) ?? []).length, 1);
  assert.ok(!textOf(nav).includes("Call sheet"));
  assert.ok(target(all[0].tag) && /font-black/.test(all[0].tag) && /aria-current="page"/.test(all[0].tag), all[0].tag);

  // From sm up: the four daily pages, in the data file's order, as 44px pills. The wrapper only hides below sm.
  const rowStart = nav.indexOf('<div class="contents max-sm:hidden">');
  const menuStart = nav.indexOf('<details id="back-office-menu"');
  assert.ok(rowStart > nav.indexOf("Today&#x27;s calls") && menuStart > rowStart, "Today's calls, then the row, then Menu");
  const row = anchors(nav.slice(rowStart, menuStart));
  assert.deepEqual(row.map((a) => [a.href, a.text]), backOfficeNav.BAR_LINKS.map((l) => [l.href, l.label]));
  assert.deepEqual(row.map((a) => a.href), ["/admin", "/admin/sales", "/admin/messages", "/admin/purchases"]);
  for (const a of row) assert.ok(target(a.tag) && !/aria-current/.test(a.tag), a.tag);
  // The Sales Desk is "Sales desk" in the nav, never "Today queue" beside "Today's calls".
  assert.ok(row.some((a) => a.href === "/admin/sales" && a.text === "Sales desk"));
  assert.ok(!header.includes("Today queue"));

  // Menu: one <details> at every width that works without JavaScript, closed until tapped, a 44px button with a
  // focus ring and decorative icons. It reads Menu on a phone and All pages from sm up.
  const menuEnd = nav.lastIndexOf("</details>") + "</details>".length;
  const details = nav.slice(menuStart, menuEnd);
  const opening = details.slice(0, details.indexOf(">"));
  assert.ok(!/\sopen=""/.test(opening), "closed until tapped");
  assert.ok(!/sm:hidden/.test(opening), "the same menu at every width");
  const summary = /<summary class="([^"]*)">([\s\S]*?)<\/summary>/.exec(details);
  assert.ok(summary);
  assert.ok(summary[1].includes("min-h-[44px]") && summary[1].includes("focus-visible:outline"), summary[1]);
  const words = [...summary[2].matchAll(/<span class="([^"]*)">([^<]+)<\/span>/g)].map((m) => [m[2], m[1].split(" ")] as const);
  assert.deepEqual(words.map(([w]) => w), ["Menu", "All pages"]);
  assert.ok(words[0][1].includes("sm:hidden") && words[1][1].includes("max-sm:hidden"), summary[2]);
  assert.ok(/<svg[^>]*aria-hidden="true"/.test(summary[2]), "the icons are decoration");

  // It holds every Menu link once, in the data file's order, each a 44px target with a focus ring showing its
  // label and its one plain line. A separate site opens in a new tab.
  const menu = anchors(details);
  assert.deepEqual(menu.map((a) => a.href), backOfficeNav.MENU_LINKS.map((l) => l.href));
  for (const [i, a] of menu.entries()) {
    const link = backOfficeNav.MENU_LINKS[i];
    assert.ok(target(a.tag), a.tag);
    assert.equal(a.text, `${link.label} ${link.description}`);
    assert.equal(/target="_blank" rel="noreferrer"/.test(a.tag), link.external === true, a.tag);
  }
  assert.ok(!menu.some((a) => a.href === "/admin/call-sheet"), "Today's calls stays in the row, once");

  // Six headings, each with its line. From sm up a heading sits over its links, which always show; below sm the
  // heading is a 44px row that opens the group (a nested <details>), the first open and the rest closed.
  const headings = [...details.matchAll(/<h2 class="[^"]*">([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(headings, backOfficeNav.MENU_GROUPS.map((g) => g.title));
  for (const g of backOfficeNav.MENU_GROUPS) assert.ok(textOf(details).includes(g.subtitle), g.subtitle);
  const folds = [...details.matchAll(/<details class="([^"]*)"( open="")?>/g)];
  assert.equal(folds.length, backOfficeNav.MENU_GROUPS.length);
  assert.deepEqual(folds.map((f) => Boolean(f[2])), backOfficeNav.MENU_GROUPS.map((_, i) => i === 0));
  for (const f of folds) {
    const classes = f[1].split(" ");
    assert.ok(classes.includes("sm:hidden") && classes.includes("peer"), f[1]);
  }
  const foldSummaries = [...details.matchAll(/<summary class="([^"]*)">/g)].slice(1).map((m) => m[1]);
  assert.equal(foldSummaries.length, backOfficeNav.MENU_GROUPS.length);
  for (const cls of foldSummaries) assert.ok(cls.includes("min-h-[44px]") && cls.includes("focus-visible:outline"), cls);
  const lists = [...details.matchAll(/<ul class="([^"]*)">/g)].map((m) => m[1]);
  assert.equal(lists.length, backOfficeNav.MENU_GROUPS.length);
  for (const cls of lists) assert.ok(cls.includes("max-sm:hidden") && cls.includes("peer-open:block"), cls);

  // Sign out: in the row from sm up, and the last row of the menu below sm. Both post to /auth/signout.
  const forms = [...nav.matchAll(/<form action="\/auth\/signout" method="post"><button type="submit" class="([^"]*)">Sign out<\/button><\/form>/g)];
  assert.equal(forms.length, 2);
  for (const f of forms) assert.ok(f[1].includes("min-h-[44px]"), f[1]);
  const wrapper = (part: string) => /<div class="([^"]*)"><form action="\/auth\/signout"/.exec(part)?.[1].split(" ") ?? [];
  assert.ok(wrapper(details).includes("sm:hidden"), "the menu's Sign out is for phones");
  assert.ok(nav.slice(menuEnd).startsWith("<div class=") && wrapper(nav.slice(menuEnd)).includes("max-sm:hidden"), "the row's Sign out is for sm up");

  // The brand gives its row to the page on a phone and is back from sm up.
  assert.match(header, /<div class="mb-6 hidden sm:block"><a href="\/" data-brand="">/);
  assert.match(header, /<h1 class="[^"]*sm:text-2xl[^"]*">Back Office<\/h1>/);
  assert.deepEqual(copyProblems(textOf(header)), []);

  // The page you are on is marked in the row and in the menu, and nothing else is.
  const onPurchases = (await adminLayout({}, "/admin/purchases")).html;
  const marked = [...onPurchases.matchAll(/<a href="([^"]+)"[^>]*aria-current="page"/g)].map((m) => m[1]);
  assert.deepEqual(marked, ["/admin/purchases", "/admin/purchases"]);
  const onLead = (await adminLayout({}, `/admin/leads/${A}`)).html;
  assert.deepEqual([...onLead.matchAll(/<a href="([^"]+)"[^>]*aria-current="page"/g)].map((m) => m[1]), ["/admin", "/admin"]);

  // The closer is progressive: it only closes the menu, never opens it, reads, or sends anything. The nav's own
  // script reads the address to mark the page, and nothing else.
  const closer = src("app/admin/AdminMenuCloser.tsx");
  assert.ok(closer.startsWith('"use client";'));
  assert.ok(!/\.open = true|fetch\(|supabase|sendBeacon/.test(closer), "closes only");
  assert.match(src("app/admin/layout.tsx"), /<AdminMenuCloser menuId=\{MENU_ID\} \/>/);
  const navSource = src("app/admin/BackOfficeNav.tsx");
  assert.ok(navSource.startsWith('"use client";'));
  assert.ok(!/fetch\(|supabase|sendBeacon|useEffect|useState|localStorage/.test(navSource), "reads the address, nothing else");

  // Signed out or not an admin: nothing renders.
  assert.equal((await adminLayout({ signedIn: false })).redirect, "/login?next=/admin");
  assert.equal((await adminLayout({ role: "sales" })).redirect, "/dashboard");
});

test("Today's calls is first in the back office nav, and only there", () => {
  const source = src("app/admin/BackOfficeNav.tsx");
  const nav = source.slice(source.indexOf("<nav"), source.indexOf("</nav>"));
  const hrefs = [...nav.matchAll(/href=\{([^}]+)\}/g)].map((m) => m[1]);
  assert.equal(hrefs[0], "CALL_SHEET_HREF");
  assert.equal(backOfficeNav.CALL_SHEET_HREF, "/admin/call-sheet");
  assert.match(nav, /href=\{CALL_SHEET_HREF\}[\s\S]{0,300}Today&apos;s calls\s*<\/Link>/);
  assert.ok(!source.includes("Call sheet"), "one link to the call sheet, under its new name");
  assert.ok(![...backOfficeNav.BAR_LINKS, ...backOfficeNav.MENU_LINKS].some((l) => l.href === "/admin/call-sheet"), "not in the menu");

  // The site manifest is not linked from any page yet, so no home-screen shortcut is added here.
  assert.ok(!src("public/site.webmanifest").includes("shortcuts"));
});

test("the new and changed call files keep the house style: no long dashes, no hard-coded contact details", () => {
  for (const file of [
    "lib/callQueue.ts",
    NEXT_PAGE,
    SHEET_PAGE,
    BANNER,
    "app/admin/call-sheet/[leadId]/page.tsx",
    "app/admin/page.tsx",
    "app/admin/layout.tsx",
    "app/admin/AdminMenuCloser.tsx",
    "app/admin/BackOfficeNav.tsx",
    "app/admin/backOfficeNav.ts",
    "components/WorkspaceLinks.tsx",
  ]) {
    const text = src(file);
    assert.ok(!/[–—]/.test(text), file);
    assert.ok(!/500-8898|19035008898|@theleadflowpro\.com/.test(text), file);
  }
});

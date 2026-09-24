import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as callQueue from "../lib/callQueue.ts";
import * as callSheet from "../lib/callSheet.ts";
import { copyProblems } from "../lib/hq/copy.ts";
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
  skippedStillWaiting,
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

test("parseSkip: lead ids only, lowercased, once each, at most the newest fifty", () => {
  assert.deepEqual(parseSkip(`${A},${B.toUpperCase()}, ${A} ,not-an-id,,${C}`), [A, B, C]);
  assert.deepEqual(parseSkip([A, `${B},${C}`]), [A, B, C], "repeated parameters are joined");
  for (const junk of [undefined, null, 42, {}, "", "   ", "sample", "../../etc", `"><script>`, `${A}x`]) {
    assert.deepEqual(parseSkip(junk), [], String(junk));
  }
  const many = Array.from({ length: SKIP_MAX + 7 }, (_, i) => id(i + 1));
  const kept = parseSkip(many.join(","));
  assert.equal(SKIP_MAX, 50);
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

function load(file: string, db: Db) {
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
    "@/lib/speedToLead": speedToLead,
    "@/lib/site/business": business,
    "@/lib/quo": quo,
    "../command-center/LiveRefresh": { __esModule: true, default: () => null },
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

  // Everyone left was skipped in this run: the end of the list, and a way to go through them again.
  const skipped = await nextPage({ leads: threeLeads() }, { skip: `${A},${B},${C}` });
  const st = textOf(skipped.html);
  assert.ok(st.includes("That is the end of the list."), st);
  assert.ok(st.includes("3 people you skipped are still on the list"), st);
  assert.match(skipped.html, /<a href="\/admin\/call-sheet\/next" data-prefetch="off"[^>]*>Call the ones you skipped<\/a>/);
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

test("Today's calls is first in the back office nav", () => {
  const layout = src("app/admin/layout.tsx");
  const nav = layout.slice(layout.indexOf("<nav"), layout.indexOf("</nav>"));
  const hrefs = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs[0], "/admin/call-sheet");
  assert.match(nav, /href="\/admin\/call-sheet"\s+className="[^"]*"\s*>\s*Today&apos;s calls\s*<\/Link>/);
  assert.ok(!nav.includes("Call sheet"), "one link to the call sheet, under its new name");
  assert.equal(hrefs.filter((h) => h === "/admin/call-sheet").length, 1);

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
    "components/WorkspaceLinks.tsx",
  ]) {
    const text = src(file);
    assert.ok(!/[–—]/.test(text), file);
    assert.ok(!/500-8898|19035008898|@theleadflowpro\.com/.test(text), file);
  }
});

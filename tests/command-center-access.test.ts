import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as leadTimeline from "../lib/leadTimeline.ts";
import * as callSheet from "../lib/callSheet.ts";
import * as callQueue from "../lib/callQueue.ts";
import * as salesQueue from "../lib/salesQueue.ts";
import * as businessTime from "../lib/businessTime.ts";
import * as commandCenter from "../lib/commandCenter.ts";
import * as operatorLinks from "../lib/operatorLinks.ts";
import * as commandCenterSwitches from "../lib/commandCenterSwitches.ts";
import * as commandCenterPulse from "../lib/commandCenterPulse.ts";
import * as commandCenterPlan from "../lib/commandCenterPlan.ts";
import * as externalLinks from "../lib/site/external-links.ts";
import * as managedPlans from "../lib/site/managedPlans.ts";

// The command center page and Pat's sales board, run for real against a fake
// database that records every read. "Auth before any read", "the service key
// only where it must be", "a failed read is never a zero" and "the board math
// is the pure module's" are checked by behaviour. Fictional leads only.

const requireReal = createRequire(import.meta.url);
const src = (f: string) => readFileSync(f, "utf8");

type Db = Record<string, unknown[]>;

const FAKE_USER = { id: "user-1", email: "owner@example.test" };

/** A PostgREST-shaped fake: any chain resolves to the table's rows (the first row after .single()), or an error for a failed table. */
function fakeClient(db: Db, failed: Set<string>, reads: string[], tag: string) {
  return {
    auth: { getUser: async () => ({ data: { user: FAKE_USER }, error: null }) },
    from(table: string) {
      reads.push(`${tag}:${table}`);
      let single = false;
      const chain: unknown = new Proxy(
        {},
        {
          get: (_t, key) => {
            if (key === "then") {
              return (resolve: (value: unknown) => void) => {
                const rows = db[table] ?? [];
                resolve({ data: failed.has(table) ? null : single ? (rows[0] ?? null) : rows, error: failed.has(table) ? { message: `${table} unavailable` } : null });
              };
            }
            if (key === "single" || key === "maybeSingle") {
              return () => {
                single = true;
                return chain;
              };
            }
            return () => chain;
          },
        },
      );
      return chain;
    },
  };
}

function compile(file: string): string {
  return ts.transpileModule(src(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
}

function evalModule(file: string, resolve: (name: string) => unknown): Record<string, unknown> {
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", compile(file))(resolve, mod, mod.exports);
  return mod.exports;
}

const StubLink = ({ href, children, prefetch, ...rest }: { href: string; children?: ReactNode; prefetch?: boolean | null }) =>
  createElement("a", { href, "data-prefetch": prefetch === false ? "off" : undefined, ...rest }, children);

function TodaysCallsBannerStub() {
  return null;
}

const emptySheet = (now: Date) => ({
  ok: true as const,
  sheet: callSheet.buildCallSheet([], [], now),
  speed: { windowDays: 7, leads: 0, reachedIn24h: 0, stillInside24h: 0, missed: 0, partial: false },
  partial: false,
  leadsCapped: false,
});

type HarnessOptions = {
  admin?: boolean;
  failed?: string[];
  rows?: Db;
  /** What the Meta reader answers. */
  insights?: unknown;
  /** Rows the call sheet loader returns. */
  sheetLeads?: callSheet.CallSheetLead[];
  /** The signed-in person's profile role (Pat's board reads it to decide whether money is readable). */
  role?: "admin" | "sales";
};

function harness({ admin = true, failed = [], rows: given = {}, insights, sheetLeads = [], role = "admin" }: HarnessOptions = {}) {
  const reads: string[] = [];
  const rows: Db = { profiles: [{ id: FAKE_USER.id, role }], ...given };
  const failedSet = new Set(failed);
  let verified = false;
  let userClient: unknown = null;
  const base: Record<string, unknown> = {
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "lucide-react": requireReal("lucide-react"),
    "server-only": {},
    "@/lib/leadTimeline": leadTimeline,
    "@/lib/callSheet": callSheet,
    "@/lib/callQueue": callQueue,
    "@/lib/salesQueue": salesQueue,
    "@/lib/businessTime": businessTime,
    "@/lib/commandCenter": commandCenter,
    "@/lib/operatorLinks": operatorLinks,
    "@/lib/commandCenterSwitches": commandCenterSwitches,
    "@/lib/commandCenterPulse": commandCenterPulse,
    "@/lib/commandCenterPlan": commandCenterPlan,
    "@/lib/site/external-links": externalLinks,
    "@/lib/site/managedPlans": managedPlans,
    "@/lib/metaInsights": {
      fetchLeadFlowAdInsights: async () => insights ?? { ok: false, reason: "not_configured", detail: "META_ADS_READ_TOKEN is not set on this server." },
    },
    "@/lib/callSheetServer": {
      loadCallSheet: async (_client: unknown, now: Date) => ({ ...emptySheet(now), sheet: callSheet.buildCallSheet(sheetLeads, [], now) }),
    },
    "@/lib/operatoros/auth": {
      requireOperatorAdmin: async () => {
        if (!admin) throw new Error("Admins only");
        verified = true;
        userClient = fakeClient(rows, failedSet, reads, "user");
        return { supabase: userClient, user: { email: "owner@example.test" } };
      },
    },
    "@/lib/supabase/service": {
      createServiceClient: () => {
        assert.ok(verified, "service read before auth");
        return fakeClient(rows, failedSet, reads, "service");
      },
    },
    "@/lib/supabase/server": { createClient: async () => fakeClient(rows, failedSet, reads, "user") },
    "../TodaysCallsBanner": { __esModule: true, default: TodaysCallsBannerStub },
    "./LiveRefresh": { __esModule: true, default: () => null },
    "./Rn1DeskPanel": { __esModule: true, default: () => createElement("section", { "data-rn1": "" }) },
  };
  const resolve = (name: string): unknown => {
    if (name in base) return base[name];
    // The real modules this page is made of, compiled with the same resolver.
    if (name === "@/lib/commandCenterServer") return evalModule("lib/commandCenterServer.ts", resolve);
    if (name === "./CallNowList") return evalModule("app/admin/command-center/CallNowList.tsx", resolve);
    if (name === "./MoneyBoardView" || name === "@/app/admin/command-center/MoneyBoardView") return evalModule("app/admin/command-center/MoneyBoardView.tsx", resolve);
    if (name === "./PulsePlanView" || name === "@/app/admin/command-center/PulsePlanView") return evalModule("app/admin/command-center/PulsePlanView.tsx", resolve);
    throw new Error(`harness does not expect ${name}`);
  };
  return { resolve, reads, userClient: () => userClient };
}

async function commandCenterPage(opts: HarnessOptions = {}, query?: Record<string, string | string[]>) {
  const h = harness(opts);
  const page = evalModule("app/admin/command-center/page.tsx", h.resolve) as { default: (props: unknown) => Promise<unknown> };
  const element = await page.default({ searchParams: Promise.resolve(query ?? {}) });
  return { element, html: renderToStaticMarkup(element as never), reads: h.reads, userClient: h.userClient() };
}

async function salesBoardPage(opts: HarnessOptions = {}, query?: Record<string, string | string[]>) {
  const h = harness(opts);
  const page = evalModule("app/sales/board/page.tsx", h.resolve) as { default: (props: unknown) => Promise<unknown> };
  const element = await page.default({ searchParams: Promise.resolve(query ?? {}) });
  return { element, html: renderToStaticMarkup(element as never), reads: h.reads };
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

const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;

function lead(overrides: Record<string, unknown> & { id: string }) {
  return {
    created_at: hoursAgo(2),
    full_name: "Riley Example",
    business_name: "Example Dirt Work (fictional)",
    email: "riley@example.test",
    phone: "(903) 555-0142",
    interest: "done_for_you",
    status: "new",
    source: "meta_lead_ad",
    utm_source: null,
    best_contact_method: "call",
    sms_consent: true,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: null,
    priority: null,
    expected_value_cents: null,
    last_contacted_at: null,
    owner: null,
    ...overrides,
  };
}

/** Two Meta leads this week: one Pat noted an hour after it came in, one untouched; one old proposal; one paid checkout. */
function fixture(): Db {
  return {
    leads: [
      lead({ id: id(1), created_at: hoursAgo(20), status: "contacted", business_name: "Lawrence Dirt Work (fictional)" }),
      lead({ id: id(2), created_at: hoursAgo(3), business_name: "Blake Land Services (fictional)" }),
      lead({ id: id(3), created_at: hoursAgo(24 * 20), status: "proposal", expected_value_cents: 750_000, business_name: "Garrison Oilfield (fictional)" }),
    ],
    lead_notes: [{ lead_id: id(1), created_at: hoursAgo(19), body: "Called, wants the second call Thursday. Outcome: call_back. Ref 0123456789abcdef01234", author: "Pat" }],
    lead_calls: [],
    lead_messages: [],
    // The verified cash ledger view: one Stripe checkout five hours ago.
    operator_verified_cash_entries: [{ workspace_id: "ws-lfp", source_type: "checkout", source_id: "p1", external_reference: "cs_test_1", payer_label: "riley@example.test", description: "agency_payment", amount_cents: 750_000, received_at: hoursAgo(5) }],
    lead_activity: [{ id: "a1", lead_id: id(1), kind: "note", detail: "Called, wants the second call Thursday. Outcome: call_back. Offer ids: managed_campaign. Ref 0123456789abcdef01234", created_at: hoursAgo(19) }],
    approval_queue: [{ id: "q1", source_agent: "content", target_agent: "operator", status: "pending", approval_required: true, created_at: hoursAgo(1) }],
    hq_workspaces: [{ id: "ws1", name: "Restore Decorative Concrete (fictional)", slug: "restore", plan: "active" }],
    hq_leads: [{ workspace_id: "ws1", created_at: hoursAgo(30) }],
  };
}

test("the command center verifies the admin before every private read and uses the service key only for the approval queue and client workspaces", async () => {
  const { reads } = await commandCenterPage({ rows: fixture() });
  for (const table of ["leads", "lead_notes", "lead_calls", "lead_messages", "operator_verified_cash_entries", "lead_activity"]) {
    assert.ok(reads.includes(`user:${table}`), `user read of ${table}`);
    assert.ok(!reads.includes(`service:${table}`), `no service read of ${table}`);
  }
  assert.ok(reads.includes("service:approval_queue"));
  assert.ok(!reads.includes("user:approval_queue"));
  assert.ok(reads.includes("service:hq_workspaces") && reads.includes("service:hq_leads"));
  assert.ok(!reads.includes("user:hq_workspaces"));
});

test("a non-admin cannot trigger any command-center read", async () => {
  const h = harness({ admin: false, rows: fixture() });
  const page = evalModule("app/admin/command-center/page.tsx", h.resolve) as { default: (props: unknown) => Promise<unknown> };
  await assert.rejects(page.default({ searchParams: Promise.resolve({}) }), /Admins only/);
  assert.deepEqual(h.reads, []);
});

test("a failed lead read returns the recovery view, never zero-valued tiles", async () => {
  const { html } = await commandCenterPage({ rows: fixture(), failed: ["leads"] });
  const text = textOf(html);
  assert.match(text, /Part of the overview could not be loaded/);
  assert.match(text, /Unavailable totals are not shown as zero/);
  assert.doesNotMatch(text, /Leads in · 7d/);
  assert.doesNotMatch(text, /Paid · 7d/);
  assert.ok(html.includes('data-rn1=""'), "the trading desk panel still shows; it reads its own server");
});

test("a failed approval read keeps the board and says the queue is unread, not zero", async () => {
  const { html } = await commandCenterPage({ rows: fixture(), failed: ["approval_queue"] });
  const text = textOf(html);
  assert.match(text, /Leads in · 7d/);
  assert.match(text, /The approval queue could not be read\. Not zero, unread\./);
  assert.doesNotMatch(text, /0 actions waiting for a human yes/);
});

test("today's calls banner sits first in both views and reads with the admin's own client", async () => {
  for (const failed of [[], ["leads"]]) {
    const { element, userClient } = await commandCenterPage({ rows: fixture(), failed });
    const first = (element as { props: { children: { type: unknown; props: { supabase?: unknown } }[] } }).props.children[0];
    assert.equal(first.type, TodaysCallsBannerStub, `banner first (${failed.join(",") || "full view"})`);
    assert.ok(userClient !== null);
    assert.equal(first.props.supabase, userClient, "the signed-in client, never the service client");
  }
});

test("the money line is the pure board's arithmetic over the real reads, with definitions printed", async () => {
  const { html } = await commandCenterPage({ rows: fixture() });
  const text = textOf(html);
  // Two leads in 7 days, one reached by Pat's note inside 24 hours, one still waiting.
  assert.match(text, /Leads in · 7d 2 Facebook lead form 2/);
  assert.match(text, /Reached by a person 1 of 2 1 inside 24 hours/);
  assert.match(text, /Waiting on a person 1 0 replied or called and are owed an answer · 1 of this window's leads never heard from anyone/);
  assert.match(text, /Proposals out 1 · \$7,500/);
  // Money in is the verified cash ledger, named by source, with the door to record a check.
  assert.match(text, /Paid · 7d \$7,500\.00 1 Stripe checkout\. Money that landed, from the verified cash ledger\./);
  assert.match(text, /Payment recorded .* \$7,500 · Stripe checkout/);
  assert.ok(html.includes('href="/admin/operator/cash"'), "the record-a-payment door");
  assert.match(text, /Notes logged: Pat 1/);
  // The bottleneck line names the step: a lead nobody has reached.
  assert.match(text, /1 of the last 7 days' leads has never heard from a person\. Call them\./);
  // Without the Meta token the ad tile says so instead of inventing a number.
  assert.match(text, /Ad spend · 7d Not connected Set META_ADS_READ_TOKEN/);
  // Money on the table lists the proposal, quietest first, with its value.
  assert.match(text, /Money on the table .* Garrison Oilfield \(fictional\) \$7,500 · never touched by a person/);
  // Every business: LeadFlow from this database, the client workspace from HQ, PDA as a door.
  assert.match(text, /The LeadFlow Pro .* 2 7d 3 28d/);
  assert.match(text, /Restore Decorative Concrete \(fictional\) .* 1 7d 1 28d/);
  // The fake database answers both lead reads with the same rows; the loader keeps one row per lead.
  assert.equal((text.match(/Lead captured/g) ?? []).length, 2);
  assert.match(text, /Premier Dental Academy of Longview Counted in its own system/);
});

test("the 28-day window is a query parameter and the default is 7", async () => {
  const month = textOf((await commandCenterPage({ rows: fixture() }, { window: "28" })).html);
  assert.match(month, /Leads in · 28d 3/);
  assert.match(month, /Paid · 28d/);
  const week = textOf((await commandCenterPage({ rows: fixture() }, { window: "nonsense" })).html);
  assert.match(week, /Leads in · 7d 2/);
  const bare = textOf((await commandCenterPage({ rows: fixture() })).html);
  assert.match(bare, /Leads in · 7d 2/);
  // The toggle links to both windows and marks the current one.
  const { html } = await commandCenterPage({ rows: fixture() }, { window: "28" });
  assert.ok(html.includes('href="/admin/command-center"'));
  assert.ok(html.includes('href="/admin/command-center?window=28"'));
  assert.match(html, /aria-current="page"[^>]*>28 days</);
});

test("the 24-hour feed hides the Call Closer's Outcome, Offer ids and Ref markers", async () => {
  const { html } = await commandCenterPage({ rows: fixture() });
  const text = textOf(html);
  assert.match(text, /Lawrence Dirt Work \(fictional\): Called, wants the second call Thursday\./);
  assert.doesNotMatch(text, /Outcome: call_back/);
  assert.doesNotMatch(text, /Offer ids:/);
  assert.doesNotMatch(text, /Ref 0123456789abcdef01234/);
});

test("call now lists the sheet's first rows with the dialer one tap away, and a text button only with consent", async () => {
  const sheetLeads: callSheet.CallSheetLead[] = [
    { ...lead({ id: id(7), business_name: "Consented Co (fictional)", phone: "(903) 555-0105", sms_consent: true }) } as callSheet.CallSheetLead,
    { ...lead({ id: id(8), business_name: "No Text Co (fictional)", phone: "(903) 555-0106", sms_consent: false }) } as callSheet.CallSheetLead,
  ];
  const { html } = await commandCenterPage({ rows: fixture(), sheetLeads });
  assert.ok(html.includes('href="tel:+19035550105"'));
  assert.ok(html.includes('href="sms:+19035550105"'));
  assert.ok(html.includes('href="tel:+19035550106"'));
  assert.ok(!html.includes('href="sms:+19035550106"'), "no consent, no text button");
  assert.ok(html.includes(`href="${callQueue.NEXT_CALL_PATH}"`), "Start calling runs the call cards");
  assert.match(textOf(html), /Call now 2 waiting on a person/);
});

test("with Meta reporting available the ad tile and panel show spend and cost per lead from the pure summary", async () => {
  const today = businessTime.centralDate(new Date());
  const insights = {
    ok: true,
    generatedAt: new Date().toISOString(),
    cached: false,
    account: { name: "LeadFlow", currency: "USD", amountSpentCents: 10_000 },
    campaigns: [{ id: "c1", name: "LFP | Scott Video", status: "ACTIVE", effective_status: "ACTIVE", daily_budget_cents: 5_000, lifetime_budget_cents: null }],
    rows: [{ date: today, campaign_id: "c1", campaign_name: "LFP | Scott Video", spend: 47.77, impressions: 1045, link_clicks: 19, platform_leads: 2 }],
  };
  const text = textOf((await commandCenterPage({ rows: fixture(), insights })).html);
  // $47.77 over the 2 Meta leads in our records this week.
  assert.match(text, /Ad spend · 7d \$47\.77 \$24 per Meta lead in our records · 2 leads by Meta's count/);
  assert.match(text, /LFP \| Scott Video running · \$50\/day · \$47\.77 · 2 leads · \$24 each/);
  assert.match(text, /Read just now/);
});

test("Pat's board reads with the signed-in client, marks what the role cannot read as not counted, and never offers the owner-only doors", async () => {
  const { html, reads } = await salesBoardPage({ rows: fixture(), failed: ["lead_notes"], role: "sales" });
  const text = textOf(html);
  assert.ok(reads.every((r) => r.startsWith("user:")), reads.join(","));
  // The cash ledger answers admins only, so the sales role never reads it and the tile says unread, not zero.
  assert.ok(!reads.includes("user:operator_verified_cash_entries"), "no ledger read for the sales role");
  assert.match(text, /This login cannot read notes, payments; those lanes are not counted, not zero\./);
  assert.match(text, /Paid · 7d – This login cannot read the cash ledger\. Not zero, unread\./);
  assert.doesNotMatch(text, /Last payment recorded/, "the paid lane is left off the pulse, never shown as quiet");
  assert.ok(!html.includes("/admin/operator/cash"), "no record-a-payment door for the sales role");
  assert.match(text, /Leads in · 7d 2/);
  assert.match(text, /Spend shows on the owner's command center/);
  assert.ok(html.includes('href="/admin/sales/board?window=28"'));
  assert.ok(html.includes('href="/admin/sales/uncalled"'));
  assert.ok(!html.includes("/fieldy"), "the Fieldy archive is owner only");
  assert.ok(!html.includes("adsmanager.facebook.com"));
});

test("an admin on Pat's board gets the cash ledger counted", async () => {
  const { html, reads } = await salesBoardPage({ rows: fixture(), role: "admin" });
  assert.ok(reads.includes("user:operator_verified_cash_entries"));
  const text = textOf(html);
  assert.match(text, /Paid · 7d \$7,500\.00 1 Stripe checkout/);
  assert.match(text, /Last payment recorded 5 hours ago/);
});

test("the pulse, the plan sheet and the snapshot door are on the owner's board; Pat's board gets the pulse only", async () => {
  const { html } = await commandCenterPage({ rows: fixture() }, { jobs: "20", rate: "500", profit: "$2,000" });
  const text = textOf(html);
  // The pulse: the fixture's newest lead is three hours old, the payment five; nobody has logged a call, the one lane that warns.
  assert.match(text, /Pulse 1 lane needs a look/);
  assert.match(text, /Last lead, any source 3 hours ago/);
  assert.match(text, /Last payment recorded 5 hours ago/);
  assert.match(text, /Last call somebody had never in the rows read .* No logged call in three days/);
  assert.match(text, /Meta was not read this time/);
  // The plan sheet runs the typed numbers: 20 jobs at $500 is $10,000; at $2,000 profit a job that is +$30,000 at target.
  assert.match(text, /Plan and call/);
  assert.match(text, /Investment to plan for \$10,000 20 jobs at \$500/);
  assert.match(text, /If every target lands \+\$30,000 20 × \$2,000 minus \$10,000/);
  assert.match(text, /Planning rates from the pricing page, not measured results and not a promise/);
  assert.ok(html.includes('action="/admin/command-center#plan"'));
  assert.ok(html.includes('href="/admin/command-center/snapshot?window=7"'), "the snapshot door carries the window");
  // Pat's board: the pulse on his own reads, no plan sheet, no snapshot door.
  const pat = await salesBoardPage({ rows: fixture() });
  const patText = textOf(pat.html);
  assert.match(patText, /Pulse .* Last lead, any source 3 hours ago/);
  assert.doesNotMatch(patText, /Plan and call/);
  assert.ok(!pat.html.includes("/admin/command-center/snapshot"));
});

test("a failed lead read on Pat's board is an error, not an empty board", async () => {
  const { html } = await salesBoardPage({ rows: fixture(), failed: ["leads"] });
  assert.match(textOf(html), /The board could not load\. This is a connection or access error, not an empty board/);
});

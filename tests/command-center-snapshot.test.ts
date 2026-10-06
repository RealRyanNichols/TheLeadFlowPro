import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { moneyBoard, type BoardLead } from "../lib/commandCenter.ts";
import * as commandCenter from "../lib/commandCenter.ts";
import * as commandCenterSnapshot from "../lib/commandCenterSnapshot.ts";
import * as businessTime from "../lib/businessTime.ts";
import * as callSheet from "../lib/callSheet.ts";
import { snapshotFacts, snapshotFileName, snapshotText } from "../lib/commandCenterSnapshot.ts";

// The shareable snapshot carries counts and percentages only. These tests
// build a board from leads with distinctive fictional names, phones, emails
// and typed values, and prove none of it reaches the card; then run the
// route itself against a fake database with a fake image renderer to prove
// the admin check comes before any read and the card is drawn from the
// pure facts. The manifest is static text.

const NOW = new Date("2026-10-06T15:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PRIVATE = ["Zebulon Quartermaine", "Quartermaine Excavation", "zeb@quartermaine.test", "(903) 555-0199", "Harlow Baptiste", "harlow@baptiste.test", "(903) 555-0188", "Baptiste Land Co"];

function lead(overrides: Partial<BoardLead> & { id: string }): BoardLead {
  return {
    created_at: hoursAgo(2),
    full_name: "Zebulon Quartermaine",
    business_name: "Quartermaine Excavation",
    email: "zeb@quartermaine.test",
    phone: "(903) 555-0199",
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

const leads = [
  lead({ id: id(1), created_at: hoursAgo(3) }),
  lead({ id: id(2), created_at: hoursAgo(30), full_name: "Harlow Baptiste", business_name: "Baptiste Land Co", email: "harlow@baptiste.test", phone: "(903) 555-0188", status: "proposal", expected_value_cents: 1_234_500 }),
];
const board = moneyBoard({
  leads,
  touches: [{ lead_id: id(2), at: hoursAgo(20), kind: "note", summary: "Wants the Thursday call, mentioned the 1234500 figure" }],
  purchases: [{ id: "p1", kind: "agency_payment", amount_cents: 750_000, status: "paid", created_at: hoursAgo(5) }],
  notes: [{ author: "Pat", created_at: hoursAgo(20) }],
  calls: [],
  now: NOW,
  days: 7,
});

test("the snapshot's facts are the board's aggregates and nothing typed on a lead", () => {
  const facts = snapshotFacts(board);
  assert.deepEqual(
    facts.map((f) => f.label),
    ["Leads in", "Reached by a person", "Waiting on a person", "Proposals out", "Paid"],
  );
  assert.equal(facts[0].value, "2");
  assert.equal(facts[1].value, "50%");
  assert.equal(facts[2].value, "1");
  assert.equal(facts[3].value, "1");
  assert.equal(facts[3].detail, "$12,345", "the proposal total is a sum, not a lead");
  assert.equal(facts[4].value, "$7,500");
  const text = snapshotText(board, "2026-10-06");
  for (const secret of PRIVATE) assert.ok(!text.includes(secret), `${secret} must not be on the card`);
  assert.ok(!text.includes("Pat"), "no author name on the card");
  assert.ok(!text.includes("Thursday"), "no note text on the card");
  assert.equal(snapshotFileName(board, "2026-10-06"), "leadflow-board-7d-2026-10-06.png");
});

test("an empty window says so without a divide-by-zero or a dash for a count", () => {
  const empty = moneyBoard({ leads: [], touches: [], purchases: [], notes: [], calls: [], now: NOW, days: 28 });
  const facts = snapshotFacts(empty);
  assert.equal(facts[0].value, "0");
  assert.equal(facts[1].value, "–");
  assert.equal(facts[1].detail, "no leads in the window");
  assert.equal(facts[3].detail, "no value typed");
  assert.equal(facts[4].value, "$0");
  assert.equal(facts[4].detail, "0 checkouts in 28 days");
});

// The route, run for real with a fake database and a fake image renderer.

const requireReal = createRequire(import.meta.url);
const compile = (file: string) =>
  ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;

function evalModule(file: string, resolve: (name: string) => unknown): Record<string, unknown> {
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", compile(file))(resolve, mod, mod.exports);
  return mod.exports;
}

class FakeAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Rendered = { element: unknown; options: { width?: number; height?: number; headers?: Record<string, string> } };

/** Stands in for next/og's ImageResponse: records what would be drawn instead of drawing it. */
class FakeImageResponse {
  static rendered: Rendered[] = [];
  constructor(element: unknown, options: Rendered["options"]) {
    FakeImageResponse.rendered.push({ element, options });
  }
}

function routeHarness({ admin, failed = [] as string[], rows = {} as Record<string, unknown[]> }: { admin: boolean; failed?: string[]; rows?: Record<string, unknown[]> }) {
  const reads: string[] = [];
  FakeImageResponse.rendered = [];
  const rendered = FakeImageResponse.rendered;
  const failedSet = new Set(failed);
  const client = {
    from(table: string) {
      reads.push(table);
      const chain: unknown = new Proxy(
        {},
        {
          get: (_t, key) =>
            key === "then"
              ? (resolve: (value: unknown) => void) => resolve({ data: failedSet.has(table) ? null : (rows[table] ?? []), error: failedSet.has(table) ? { message: `${table} unavailable` } : null })
              : () => chain,
        },
      );
      return chain;
    },
  };
  const base: Record<string, unknown> = {
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "server-only": {},
    "next/og": { ImageResponse: FakeImageResponse },
    "next/server": { NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ kind: "json", body, status: init?.status ?? 200 }) } },
    "@/lib/operatoros/auth": {
      OperatorAuthError: FakeAuthError,
      requireOperatorAdmin: async () => {
        if (admin === false) throw new FakeAuthError(403, "Admins only");
        return { supabase: client, user: { email: "owner@example.test" } };
      },
    },
    "@/lib/commandCenter": commandCenter,
    "@/lib/commandCenterSnapshot": commandCenterSnapshot,
    "@/lib/businessTime": businessTime,
    "@/lib/callSheet": callSheet,
  };
  const resolve = (name: string): unknown => {
    if (name in base) return base[name];
    if (name === "@/lib/commandCenterServer") return evalModule("lib/commandCenterServer.ts", resolve);
    throw new Error(`harness does not expect ${name}`);
  };
  const route = evalModule("app/admin/command-center/snapshot/route.tsx", resolve) as { GET: (request: Request) => Promise<unknown> };
  return { route, reads, rendered };
}

const fixture = () => ({
  leads: leads as unknown[],
  lead_notes: [{ lead_id: id(2), created_at: hoursAgo(20), body: "Wants the Thursday call", author: "Pat" }],
  lead_calls: [],
  lead_messages: [],
  operator_verified_cash_entries: [{ workspace_id: "ws-lfp", source_type: "checkout", source_id: "p1", external_reference: "cs_test_1", payer_label: "zeb@quartermaine.test", description: "agency_payment", amount_cents: 750_000, received_at: hoursAgo(5) }],
});

test("the snapshot route refuses a non-admin before any read", async () => {
  const { route, reads, rendered } = routeHarness({ admin: false });
  const response = (await route.GET(new Request("https://www.theleadflowpro.com/admin/command-center/snapshot"))) as { kind: string; status: number; body: { error: string } };
  assert.equal(response.kind, "json");
  assert.equal(response.status, 403);
  assert.equal(response.body.error, "Admins only.");
  assert.deepEqual(reads, []);
  assert.equal(rendered.length, 0);
});

test("the snapshot route draws a 1200 by 630 card of the aggregates for an admin, with nothing private and no caching", async () => {
  const { route, reads, rendered } = routeHarness({ admin: true, rows: fixture() });
  const response = await route.GET(new Request("https://www.theleadflowpro.com/admin/command-center/snapshot?window=28"));
  assert.equal(rendered.length, 1, "one image rendered");
  assert.ok(response instanceof FakeImageResponse, "the response is the image");
  assert.ok(reads.includes("leads") && reads.includes("operator_verified_cash_entries"), reads.join(","));
  const { options, element } = rendered[0];
  assert.equal(options.width, 1200);
  assert.equal(options.height, 630);
  assert.equal(options.headers?.["Cache-Control"], "private, no-store");
  assert.match(options.headers?.["Content-Disposition"] ?? "", /^inline; filename="leadflow-board-28d-\d{4}-\d{2}-\d{2}\.png"$/);
  const html = renderToStaticMarkup(element as never);
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /The LeadFlow Pro/);
  assert.match(text, /last 28 days/);
  assert.match(text, /Leads in 2/);
  assert.match(text, /Reached by a person 50%/);
  assert.match(text, /Paid \$7,500/);
  for (const secret of PRIVATE) assert.ok(!html.includes(secret), `${secret} must not be on the card`);
  assert.ok(!html.includes("Pat"), "no author on the card");
});

test("a failed lead read is a 503 with no card, never a card of zeros", async () => {
  const { route, rendered } = routeHarness({ admin: true, rows: fixture(), failed: ["leads"] });
  const response = (await route.GET(new Request("https://www.theleadflowpro.com/admin/command-center/snapshot"))) as { kind: string; status: number; body: { error: string } };
  assert.equal(response.status, 503);
  assert.match(response.body.error, /Nothing is shown as zero/);
  assert.equal(rendered.length, 0);
});

test("the board's manifest opens on the board, under the admin scope, with the site's icons and no data", () => {
  const route = evalModule("app/admin/command-center/manifest.webmanifest/route.ts", (name) => {
    if (name === "next/server") return { NextResponse: { json: (body: unknown, init?: { headers?: Record<string, string> }) => ({ body, headers: init?.headers ?? {} }) } };
    throw new Error(`harness does not expect ${name}`);
  }) as { GET: () => { body: Record<string, unknown>; headers: Record<string, string> }; dynamic: string };
  const { body, headers } = route.GET();
  assert.equal(route.dynamic, "force-static");
  assert.equal(body.start_url, "/admin/command-center");
  assert.equal(body.scope, "/admin/");
  assert.equal(body.display, "standalone");
  assert.equal(headers["Content-Type"], "application/manifest+json");
  const icons = body.icons as { src: string }[];
  assert.ok(icons.some((i) => i.src === "/icon-192.png") && icons.some((i) => i.src === "/icon-512.png"));
  assert.ok(!JSON.stringify(body).match(/supabase|token|key/i), "no secret, no data");
});

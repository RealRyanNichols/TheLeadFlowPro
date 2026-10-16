import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as callSheet from "../lib/callSheet.ts";
import * as contractorSeries from "../lib/contractorSeries.ts";
import * as leadNotify from "../lib/leadNotify.ts";
import * as metaLeadAnswers from "../lib/metaLeadAnswers.ts";
import * as nextAction from "../lib/nextAction.ts";
import * as growthSignals from "../lib/growthSignals.ts";
import * as followUpPlan from "../lib/followUpPlan.ts";
import * as nextActionTemplates from "../lib/nextActionTemplates.ts";
import * as businessTime from "../lib/businessTime.ts";
import * as commandCenter from "../lib/commandCenter.ts";
import * as salesQueue from "../lib/salesQueue.ts";
import * as adsBrain from "../lib/adsBrain.ts";
import { copyProblems } from "../lib/hq/copy.ts";

// The Next actions page and its loader, run for real against a fake database
// that records every table it is asked for and every method called on it.
// "Read only", "a failed read is never a zero", "a text button only with
// consent" and "ad spend for the owner only" are checked by behaviour.
// Fictional leads only.

const requireReal = createRequire(import.meta.url);
const src = (f: string) => readFileSync(f, "utf8");

type Db = Record<string, unknown[]>;
const WRITES = new Set(["insert", "update", "upsert", "delete", "rpc"]);

function fakeClient(db: Db, failed: Set<string>, reads: string[], calls: string[]) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "person@example.test" } }, error: null }) },
    rpc() {
      calls.push("rpc");
      return Promise.resolve({ data: null, error: null });
    },
    from(table: string) {
      reads.push(table);
      let single = false;
      // One table read two ways can fail one way: "lead_activity:email" fails only the read that asks for kind = email.
      let kind: unknown = null;
      const chain: unknown = new Proxy(
        {},
        {
          get: (_t, key) => {
            if (key === "then") {
              return (resolve: (value: unknown) => void) => {
                const rows = db[table] ?? [];
                const down = failed.has(table) || failed.has(`${table}:${String(kind)}`);
                resolve({ data: down ? null : single ? (rows[0] ?? null) : rows, error: down ? { message: `${table} unavailable` } : null });
              };
            }
            if (key === "eq") {
              return (column: string, value: unknown) => {
                if (column === "kind") kind = value;
                return chain;
              };
            }
            if (typeof key === "string" && WRITES.has(key)) calls.push(`${table}.${key}`);
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

function evalModule(file: string, map: Record<string, unknown>): Record<string, unknown> {
  const resolve = (name: string) => {
    if (name in map) return map[name];
    throw new Error(`${file} imported ${name}, which this test does not provide`);
  };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", compile(file))(resolve, mod, mod.exports);
  return mod.exports;
}

const StubLink = ({ href, children, ...rest }: { href: string; children?: ReactNode }) => createElement("a", { href, ...rest }, children);

const server = evalModule("lib/nextActionServer.ts", {
  "server-only": {},
  "@/lib/callSheet": callSheet,
  "@/lib/contractorSeries": contractorSeries,
  "@/lib/leadNotify": leadNotify,
  "@/lib/metaLeadAnswers": metaLeadAnswers,
  "@/lib/nextAction": nextAction,
  "@/lib/growthSignals": growthSignals,
}) as {
  loadNextActions: (client: unknown, now: Date, options: { days: number; ads: growthSignals.AdRow[] | null; hrefFor: (id: string) => string }) => Promise<Record<string, unknown>>;
  toNextActionLead: (row: Record<string, unknown>) => nextAction.NextActionLead;
  isRealEmail: (email: string | null | undefined) => boolean;
  isUnknownCaller: (row: { source: string | null; full_name: string | null; business_name: string | null }) => boolean;
  emailEventKind: (detail: string) => string | null;
  isDeliveredEvent: (detail: string) => boolean;
  emailSubject: (detail: string) => string;
  LEAD_LIMIT: number;
};

// The page reads the clock itself, so the clock is pinned: Wednesday, October
// 7, 2026 at 1:00 PM Central, inside calling hours. Unpinned, "2 due" and
// "Day 1" would change with the hour and the day this file happened to run.
mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-07T18:00:00.000Z") });
const NOW = new Date();
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;

function leadRow(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: id(n),
    created_at: hoursAgo(2),
    full_name: `Riley Example${n}`,
    business_name: `Example Dirt Work ${n} (fictional)`,
    email: `riley${n}@example.test`,
    phone: "(903) 555-0142",
    status: "new",
    priority: "high",
    source: "meta_lead_ad",
    utm_campaign: "scott_contractor_tx_2026_10",
    diagnostic: {
      form_id: contractorSeries.CONTRACTOR_META_FORM_ID_V3,
      ad_id: "120254001470770154",
      fields: { role_in_business: "owner_partner", primary_service: "pond_building_cleanouts_expansion", prepared_to_invest_7000: "yes_7000", how_soon_more_jobs: "now_30_days", full_name: "Riley Example" },
    },
    sms_consent: false,
    sms_unsubscribed_at: null,
    marketing_email_consent: true,
    email_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: null,
    expected_value_cents: null,
    ...overrides,
  };
}

type PageOptions = { role?: "admin" | "sales"; failed?: string[]; rows?: Db; ads?: unknown; fullName?: string | null };

async function renderPage({ role = "admin", failed = [], rows = {}, ads, fullName = "Ryan Nichols" }: PageOptions = {}) {
  const reads: string[] = [];
  const calls: string[] = [];
  let metaAsked = 0;
  const db: Db = { profiles: [{ id: "user-1", role, full_name: fullName }], ...rows };
  const client = fakeClient(db, new Set(failed), reads, calls);
  const view = evalModule("app/sales/next-actions/NextActionsView.tsx", {
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "lucide-react": requireReal("lucide-react"),
    "@/lib/businessTime": businessTime,
    "@/lib/followUpPlan": followUpPlan,
    "@/lib/nextAction": nextAction,
    "@/lib/nextActionTemplates": nextActionTemplates,
    "@/lib/growthSignals": growthSignals,
    "@/lib/salesQueue": salesQueue,
    "./CopyButton": evalModule("app/sales/next-actions/CopyButton.tsx", { "react/jsx-runtime": requireReal("react/jsx-runtime"), react: requireReal("react") }),
  });
  const page = evalModule("app/sales/next-actions/page.tsx", {
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/commandCenter": commandCenter,
    "@/lib/businessTime": businessTime,
    "@/lib/nextAction": nextAction,
    "@/lib/nextActionServer": server,
    "@/lib/nextActionTemplates": nextActionTemplates,
    "@/lib/metaAdLevel": {
      fetchLeadFlowAdRows: async () => {
        metaAsked += 1;
        return ads ?? { ok: false, reason: "not_configured", detail: "META_ADS_READ_TOKEN is not set on this server." };
      },
    },
    "@/app/admin/command-center/MoneyBoardView": { WindowToggle: ({ days }: { days: number }) => createElement("nav", { "data-window": days }) },
    "./NextActionsView": view,
  });
  const element = await (page.default as (props: { searchParams: Promise<Record<string, string>> }) => Promise<unknown>)({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(element as never);
  const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");
  return { html, text, reads, calls, metaAsked };
}

test("the owner's page: who is due, the count against the plan, the script, the scorecard and the plan", async () => {
  const { html, text, reads, calls, metaAsked } = await renderPage({
    rows: {
      leads: [leadRow(1), leadRow(2, { created_at: hoursAgo(30), status: "contacted" })],
      lead_messages: [{ lead_id: id(2), direction: "in", channel: "sms", body: "Call me after 3", created_at: hoursAgo(1), delivered: true, author: null }],
      lead_notes: [{ lead_id: id(1), created_at: hoursAgo(1), author: "Codex · Patrick-requested Fieldy review" }],
      lead_emails: [{ lead_id: id(2), step: 601, delivery_status: "sent", sent_at: hoursAgo(6) }],
      lead_email_notifications: [{ lead_id: id(1), notification_type: "lead_welcome", status: "sent" }, { lead_id: id(2), notification_type: "lead_welcome", status: "sent" }],
    },
    ads: { ok: true, generatedAt: NOW.toISOString(), cached: false, rows: [{ ad_id: "120254001470770154", ad_name: "Example ad", campaign_name: "Example", effective_status: "ACTIVE", spendCents: 12_345, platformLeads: 2 }] },
  });
  assert.match(text, /Next actions/);
  assert.match(text, /2 due/);
  assert.match(text, /1 person has reached out with no reply on the record\. Start there\./);
  // The reply is first, the first call second. A software note did not clear the first call.
  assert.ok(text.indexOf("Answer them now") < text.indexOf("Call 1 of 25"));
  assert.match(text, /Calls 0 of 25 · Emails 1 of 81 · Day 0/);
  assert.match(text, /Calls 0 of 25 · Emails 2 of 81 · Day 1/);
  assert.match(text, /Priority lead\./);
  // The script uses their first name, their kind of work and the caller's name.
  assert.match(text, /"Riley, this is Ryan with The LeadFlow Pro\. You filled out our form a little while ago about getting more pond jobs\./);
  // The owner logs the outcome on the call card.
  assert.ok(html.includes(`href="/admin/call-sheet/${id(1)}"`));
  assert.ok(html.includes('href="tel:+19035550142"'));
  // No texting consent on file: no text button and no text script.
  assert.ok(!html.includes("sms:"), "no text link without consent");
  assert.ok(!/Text 1/.test(text));
  // The email button opens the person's own mail app with the script filled in.
  assert.ok(html.includes("mailto:riley1@example.test?subject=Tried%20to%20call%20you%20just%20now&amp;body="));
  // Scorecard, with Meta's numbers for the owner.
  assert.match(text, /The numbers, and what they say to do/);
  assert.match(text, /Ad spend \$123/);
  assert.match(text, /Ad numbers are Meta's own, read /);
  assert.match(text, /Priority leads 2 of 2/);
  // The plan, in full.
  assert.match(text, /Full plan: 25 calls over 90 days/);
  assert.match(text, /a welcome plus 80 emails over 180 days, 81 in all/);
  assert.match(text, /Monday to Saturday, 9:00 AM to 7:00 PM Central/);
  assert.equal(metaAsked, 1);
  // Read only: the tables it reads, and not one write.
  assert.deepEqual([...new Set(reads)].sort(), ["lead_activity", "lead_calls", "lead_email_notifications", "lead_emails", "lead_messages", "lead_notes", "leads", "profiles"]);
  assert.deepEqual(calls, []);
  assert.deepEqual(copyProblems(text), []);
});

test("the sales desk sees the same list, logs on its own lead page, and Meta is never asked", async () => {
  const { html, text, metaAsked, calls } = await renderPage({ role: "sales", fullName: "Pat Example", rows: { leads: [leadRow(1, { sms_consent: true })] } });
  assert.equal(metaAsked, 0);
  assert.match(text, /Ad spend shows for the owner\./);
  assert.ok(!/Ad spend \$/.test(text));
  assert.ok(html.includes(`href="/admin/sales/leads/${id(1)}"`));
  assert.ok(!html.includes("/admin/call-sheet/"));
  assert.match(text, /this is Pat with The LeadFlow Pro/);
  // Consent on file and no STOP: the text button and the text script appear.
  assert.ok(html.includes('href="sms:+19035550142"'));
  assert.match(text, /Text 1/);
  assert.match(text, /Reply STOP to opt out\./);
  assert.deepEqual(calls, []);
});

test("a STOP removes the text button even when consent was given", async () => {
  const { html, text } = await renderPage({ rows: { leads: [leadRow(1, { sms_consent: true, sms_unsubscribed_at: hoursAgo(1) })] } });
  assert.ok(!html.includes("sms:"));
  assert.ok(!/Text 1/.test(text));
});

test("when the leads cannot be read the page says so and shows no numbers at all", async () => {
  const { text } = await renderPage({ failed: ["leads"] });
  assert.match(text, /Next actions could not load\./);
  assert.match(text, /This is a connection or access error, not an empty list\./);
  assert.ok(!/\b0 due\b|Nothing is due|Nothing new is due|Leads in/.test(text), "no zero that looks like a quiet day");
});

test("when a history table that decides who is owed what cannot be read, the board refuses to guess", async () => {
  for (const table of ["lead_calls", "lead_messages", "lead_notes", "lead_activity"]) {
    const { text } = await renderPage({ failed: [table], rows: { leads: [leadRow(1)] } });
    assert.match(text, /Next actions could not load\./, table);
  }
});

test("when only the email history cannot be read, the calls still show and the email counts are left out", async () => {
  const { text } = await renderPage({ failed: ["lead_emails", "lead_email_notifications"], rows: { leads: [leadRow(1)] } });
  assert.match(text, /Call 1 of 25/);
  assert.match(text, /The email history could not be read with this sign-in\. Email counts are left out, not shown as zero\./);
  assert.match(text, /Calls 0 of 25 · Day 0/);
  assert.ok(!/Emails \d+ of/.test(text.split("The numbers, and what they say to do")[0]), "no email count on any lead");

  // Only the welcome emails unread: the series is counted, and the welcome is left out of both sides.
  const partial = await renderPage({
    failed: ["lead_email_notifications"],
    rows: { leads: [leadRow(1)], lead_emails: [{ lead_id: id(1), step: 601, delivery_status: "sent", sent_at: hoursAgo(1) }] },
  });
  assert.match(partial.text, /Calls 0 of 25 · Emails 1 of 80 · Day 0/);
  assert.match(partial.text, /The welcome emails could not be read with this sign-in, so the email counts leave the welcome out\./);
});

test("when only the email opens cannot be read, the calls still count and no open count is shown as zero", async () => {
  const { text } = await renderPage({
    failed: ["lead_activity:email"],
    rows: {
      leads: [leadRow(1, { created_at: hoursAgo(30), status: "contacted" })],
      // The call history is the same table, read on its own, and it still decides the row.
      lead_activity: [
        { lead_id: id(1), kind: "call", detail: "Call: no answer. Outcome: no_answer. Ref 0123456789abcdefghij", created_at: hoursAgo(20) },
        { lead_id: id(1), kind: "email", detail: 'Opened "Subject" (contractor_owner, day 1). Ref open-1', created_at: hoursAgo(10) },
      ],
      lead_emails: Array.from({ length: 60 }, (_, i) => ({ lead_id: id(1), step: 601 + i, delivery_status: "sent", sent_at: hoursAgo(12) })),
    },
  });
  assert.match(text, /Call 2 of 25/);
  assert.match(text, /Email opens could not be read with this sign-in, so no open count shows on any lead or in the numbers\./);
  assert.ok(!/emails? opened/.test(text), "no open count on the lead");
  assert.ok(!/Email tracking|delivered emails|No email delivery or open/.test(text), "and no verdict built on a number that was not read");
});

test("when Meta is not connected the owner is told, and no ad number is shown as zero", async () => {
  const off = await renderPage({ rows: { leads: [leadRow(1)] } });
  assert.match(off.text, /Ad spend is not read on this server yet/);
  assert.ok(!/Ad spend \$/.test(off.text));
  assert.ok(!/No ad is running/.test(off.text), "not read is not the same as nothing running");
  const down = await renderPage({ rows: { leads: [leadRow(1)] }, ads: { ok: false, reason: "unavailable", detail: "Meta returned HTTP 500" } });
  assert.match(down.text, /Meta did not answer just now, so ad numbers are left out rather than shown as zero\. Meta returned HTTP 500/);
});

test("an empty board reads as empty, in words", async () => {
  const { text } = await renderPage({ rows: { leads: [] } });
  assert.match(text, /Nothing new is due/);
  assert.match(text, /No open leads on the board\./);
  assert.match(text, /That is the whole list, not a loading error\./);
  assert.ok(!/Backlog|Unknown callers/.test(text), "no empty sections");
});

test("a CRM row becomes an engine lead by rules that are written down", () => {
  const mapped = server.toNextActionLead(leadRow(1));
  assert.equal(mapped.group, "priority");
  assert.equal(mapped.service, "pond_building_cleanouts_expansion");
  assert.equal(mapped.ad_id, "120254001470770154");
  assert.equal(mapped.series, "contractor_owner");
  assert.equal(mapped.campaign, "scott_contractor_tx_2026_10");
  assert.equal(mapped.can_text, false);
  assert.equal(mapped.can_email, true);

  const plain = server.toNextActionLead(leadRow(2, { diagnostic: null, source: "website", priority: null, status: null, full_name: null, email: "quo+19035550100@unknown.invalid", marketing_email_consent: false }));
  assert.equal(plain.group, null);
  assert.equal(plain.service, null);
  assert.equal(plain.ad_id, null);
  assert.equal(plain.series, null);
  assert.equal(plain.status, "new");
  assert.equal(plain.full_name, "");
  assert.equal(plain.can_email, false, "a placeholder address is not an email to write to");

  assert.equal(server.toNextActionLead(leadRow(3, { email_unsubscribed_at: hoursAgo(1) })).can_email, false);
  assert.equal(server.toNextActionLead(leadRow(4, { sms_consent: true })).can_text, true);
  assert.equal(server.toNextActionLead(leadRow(5, { sms_consent: true, phone: null })).can_text, false);
  // Answers that are not strings (a malformed form payload) are ignored, not trusted.
  assert.equal(server.toNextActionLead(leadRow(6, { diagnostic: { fields: { role_in_business: 7, primary_service: ["x"] } } })).group, null);

  for (const real of ["riley@example.test", " Riley@Example.Test "]) assert.equal(server.isRealEmail(real), true, real);
  for (const fake of ["", null, undefined, "no-at-sign", "lead-123@no-email.theleadflowpro.com", "quo+1903@unknown.invalid"]) assert.equal(server.isRealEmail(fake), false, String(fake));

  assert.equal(server.emailEventKind('Opened "Subject" (contractor_owner, day 02). Ref open-abc'), "opened");
  assert.equal(server.emailEventKind('Clicked a link in "Subject". Ref click-abc'), "clicked");
  assert.equal(server.emailEventKind('Email bounced for good ("Subject"). Emails stopped.'), "bounced");
  assert.equal(server.emailEventKind('Delivered "Subject" to the recipient\'s mail server.'), null);
  assert.equal(server.emailEventKind('Resend accepted "Subject" for delivery.'), null);
  // Delivery is its own event: the base opens are measured against.
  assert.equal(server.isDeliveredEvent('Delivered "Subject" (free_build, day 14) to the recipient\'s mail server. Ref delivered-abc'), true);
  assert.equal(server.isDeliveredEvent('Opened "Subject". Ref open-abc'), false);
  assert.equal(server.emailSubject('Opened "The Sunday inbox" (free_build, day 9). Ref open-abc'), "The Sunday inbox");
  assert.equal(server.emailSubject("Email bounced"), "Email bounced");

  // A number the phone line saved: came in by phone, a name the software made up, no business.
  const unknown = server.toNextActionLead(leadRow(7, { source: "quo_inbound", full_name: "Unknown", business_name: null, diagnostic: null, email: "quo+19035550100@unknown.invalid" }));
  assert.equal(unknown.unknown_caller, true);
  for (const named of [
    { source: "quo_inbound", full_name: "Riley Example", business_name: null },
    { source: "quo_inbound", full_name: "Unknown", business_name: "Example Dirt Work (fictional)" },
    // A form lead with a made-up name is still a lead: it has a form behind it.
    { source: "meta_lead_ad", full_name: "Facebook User", business_name: null },
    { source: null, full_name: null, business_name: null },
  ]) assert.equal(server.isUnknownCaller(named), false, JSON.stringify(named));
  for (const saved of [{ source: "quo_call", full_name: "unknown caller", business_name: " " }, { source: "quo_inbound", full_name: null, business_name: null }]) assert.equal(server.isUnknownCaller(saved), true, JSON.stringify(saved));
  assert.equal(server.toNextActionLead(leadRow(8, { sms_unsubscribed_at: hoursAgo(1) })).texts_stopped, true);
  assert.equal(mapped.texts_stopped, false);
  assert.equal(mapped.unknown_caller, false);
});

test("today's work on top, the backlog under it, unknown callers apart, and none of them padding the numbers", async () => {
  const caller = (n: number) => leadRow(n, { source: "quo_inbound", full_name: "Unknown", business_name: null, diagnostic: null, email: "quo+19035550100@unknown.invalid", status: "contacted", priority: "normal", utm_campaign: null, marketing_email_consent: false, created_at: hoursAgo(24) });
  const { text, html, calls } = await renderPage({
    rows: {
      leads: [
        leadRow(1, { created_at: new Date(NOW.getTime() - 4 * 60_000).toISOString(), priority: "normal" }), // four minutes old
        leadRow(2, { created_at: hoursAgo(24 * 5), status: "contacted", next_follow_up_at: hoursAgo(5) }), // promised this morning
        leadRow(3, { created_at: hoursAgo(24 * 20), status: "contacted", next_follow_up_at: hoursAgo(24 * 14), diagnostic: null, priority: "normal" }), // a two-week-old date
        ...[10, 11, 12, 13, 14].map(caller), // five robocalls somebody picked up
        caller(15), // and one real person texting from a number nobody knows
        leadRow(4, { created_at: hoursAgo(24 * 3), status: "contacted", sms_consent: true, sms_unsubscribed_at: hoursAgo(24 * 2) }), // texted STOP
      ],
      lead_calls: [10, 11, 12, 13, 14].map((n) => ({ lead_id: id(n), started_at: hoursAgo(24), direction: "incoming", outcome: "completed", duration_seconds: null, scope_status: "company" })),
      lead_messages: [
        { lead_id: id(15), direction: "in", channel: "sms", body: "Do you have a scheduler link by chance", created_at: hoursAgo(28), delivered: true, author: null },
        { lead_id: id(3), direction: "out", channel: "sms", body: "Following up on your request.", created_at: hoursAgo(24 * 15), delivered: true, author: null },
        { lead_id: id(4), direction: "in", channel: "sms", body: "Stop", created_at: hoursAgo(24 * 2), delivered: true, author: null },
      ],
      lead_activity: [
        // A call brought in from a recording, in words, with no outcome tapped.
        { lead_id: id(2), kind: "sales", detail: "Sam Example: Call (Fieldy-imported by Codex) - Riley answered, unavailable; rescheduled to tomorrow after about 8:30", created_at: hoursAgo(19) },
        // One day of email tracking: 60 delivered, 4 opened.
        ...Array.from({ length: 60 }, (_, i) => ({ lead_id: id(2), kind: "email", detail: `Delivered "Subject ${i}" (contractor_owner, day ${i}) to the recipient's mail server. Ref delivered-${i}`, created_at: hoursAgo(20) })),
        ...[1, 2, 3, 4, 4].map((i) => ({ lead_id: id(2), kind: "email", detail: `Opened "Subject ${i}" (contractor_owner, day ${i}). Ref open-${i}`, created_at: hoursAgo(18) })),
      ],
      lead_emails: Array.from({ length: 60 }, (_, i) => ({ lead_id: id(2), step: 601 + (i % 80), delivery_status: "sent", sent_at: hoursAgo(20) })),
    },
  });
  const top = text.split("Backlog:")[0];
  // The newest lead first, then the person waiting on an answer, then the promised call.
  assert.match(top, /4 due/);
  assert.match(top, /1 new lead came in inside the last hour\. Call them now, before anything else\./);
  assert.ok(top.indexOf("Call 1 of 25") < top.indexOf("Answer them now"), "the four-minute-old lead is above the reply");
  assert.ok(top.indexOf("Answer them now") < top.indexOf("Call back, as promised"));
  assert.match(top, /An unnamed caller sent a message 28 hours ago and no reply is on the record\./);
  // The call written down in words counted, so the promise is honored. One email opened twice is one email opened.
  assert.match(top, /Calls 1 of 25 · Emails 60 of 81 · Day 5 · 4 emails opened/);
  // The lead who texted STOP is still on the call plan, with no text button, and the row says why.
  assert.match(top, /They texted STOP, so no text goes to them\./);
  assert.ok(!html.includes("sms:"), "nobody on this page has both consent and no STOP");
  // The two-week-old follow-up date is real work, kept under today's.
  assert.match(text, /Backlog: 1 follow-up more than a week late/);
  assert.ok(!top.includes(`Example Dirt Work 3 (fictional)`), "the old one is not in today's list");
  // The robocalls are listed apart, never as "Set the next step", and "Unknown" is never printed as a name.
  assert.match(text, /Unknown callers: 5 to name or close/);
  assert.ok(!/Set the next step/.test(top));
  assert.match(text, /Unknown number/);
  assert.ok(!/Unknown, this is|Unknown at /.test(text));
  // And they are not counted as leads, or as people talked to.
  assert.match(text, /Leads in 3 3 leads from Meta ads, the last 7 days\. Not counted: 6 unknown numbers the phone line saved\./);
  assert.match(text, /Talked to 1 of 3/);
  assert.match(text, /6 unknown numbers were saved as leads/);
  // Opens against delivered emails, counted once each, with tracking one day old: too early to judge.
  assert.match(text, /Email tracking is one day old/);
  assert.match(text, /4 of 60 delivered emails show as opened so far\./);
  assert.deepEqual(calls, []);
  assert.deepEqual(copyProblems(text), []);
});

test("Meta's ad list and its ad numbers are merged by ad, and a foreign account is refused", async () => {
  const graph: { account: Record<string, unknown>; ads: Record<string, unknown>[]; insights: Record<string, unknown>[] } = {
    account: { account_id: adsBrain.ADS_BRAIN.identity.adAccountId, business: { id: adsBrain.ADS_BRAIN.identity.businessPortfolioId } },
    ads: [
      { id: "1", name: "Example video", effective_status: "ACTIVE", campaign: { name: "Example campaign" } },
      { id: "2", name: "Example static", effective_status: "ACTIVE", campaign: { name: "Example retargeting" } },
      { id: "3", name: "Old ad", effective_status: "PAUSED", campaign: { name: "Old" } },
    ],
    insights: [
      { ad_id: "1", ad_name: "Example video", campaign_name: "Example campaign", spend: "468.36", actions: [{ action_type: "lead", value: "8" }, { action_type: "onsite_conversion.lead_grouped", value: "8" }] },
      { ad_id: "9", ad_name: "Deleted ad", campaign_name: "Gone", spend: "12.00", actions: [] },
    ],
  };
  const paths: string[] = [];
  const load = (token: string | null) =>
    evalModule("lib/metaAdLevel.ts", {
      "server-only": {},
      "@/lib/adsBrain": adsBrain,
      "@/lib/metaInsights": {
        dateDaysAgo: (days: number, now: Date) => new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10),
        metaReadToken: () => token,
        graphObject: async (path: string) => {
          paths.push(path);
          return graph.account;
        },
        graphRows: async (path: string, _fields: string, _token: string, extra: Record<string, string>) => {
          paths.push(`${path}${extra.level ? `?level=${extra.level}` : ""}`);
          return path.endsWith("/ads") ? graph.ads : graph.insights;
        },
      },
    }) as { fetchLeadFlowAdRows: (o?: { days?: number; now?: Date }) => Promise<Record<string, unknown>>; adRowsFrom: (a: unknown[], i: unknown[]) => growthSignals.AdRow[] };

  assert.deepEqual(await load(null).fetchLeadFlowAdRows(), { ok: false, reason: "not_configured", detail: "META_ADS_READ_TOKEN is not set on this server." });
  assert.deepEqual(paths, [], "no token, no request");

  const mod = load("read-only-token-for-the-test");
  const first = (await mod.fetchLeadFlowAdRows({ days: 7, now: NOW })) as { ok: true; cached: boolean; rows: growthSignals.AdRow[] };
  assert.equal(first.ok, true);
  assert.equal(first.cached, false);
  assert.deepEqual(first.rows.map((r) => [r.ad_id, r.effective_status, r.spendCents, r.platformLeads]), [
    ["1", "ACTIVE", 46_836, 8],
    ["9", "ARCHIVED", 1_200, 0],
    // Running with nothing delivered in the window: still listed, so it is visible.
    ["2", "ACTIVE", 0, 0],
  ]);
  assert.ok(!first.rows.some((r) => r.ad_id === "3"), "a paused ad with no spend is noise");
  const account = `act_${adsBrain.ADS_BRAIN.identity.adAccountId}`;
  assert.deepEqual(paths.sort(), [account, `${account}/ads`, `${account}/insights?level=ad`].sort());
  // Inside ten minutes the same answer is served without asking Meta again.
  const before = paths.length;
  assert.equal(((await mod.fetchLeadFlowAdRows({ days: 7, now: new Date(NOW.getTime() + 60_000) })) as { cached: boolean }).cached, true);
  assert.equal(paths.length, before);

  graph.account = { account_id: "999", business: { id: "1" } };
  const foreign = await load("read-only-token-for-the-test").fetchLeadFlowAdRows({ days: 7, now: NOW });
  assert.equal(foreign.ok, false);
  assert.match(String(foreign.detail), /different ad account than the LeadFlow allowlist/);
});

test("the loader reads at most the lead limit and says when it was cut", async () => {
  const reads: string[] = [];
  const calls: string[] = [];
  const many = Array.from({ length: server.LEAD_LIMIT }, (_, i) => leadRow(i + 1));
  const result = (await server.loadNextActions(fakeClient({ leads: many }, new Set(), reads, calls), NOW, { days: 7, ads: null, hrefFor: (leadId) => `/x/${leadId}` })) as { ok: boolean; leadsCapped: boolean; board: nextAction.NextActionBoard };
  assert.equal(result.ok, true);
  assert.equal(result.leadsCapped, true);
  assert.equal(result.board.rows.length, server.LEAD_LIMIT);
  assert.equal(result.board.rows[0].href.startsWith("/x/"), true);
  assert.deepEqual(calls, []);
});

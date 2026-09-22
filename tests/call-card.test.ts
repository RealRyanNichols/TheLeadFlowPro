import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import CallOutcomePanel, { type CallOutcomePanelProps } from "../app/admin/call-sheet/CallOutcomePanel.tsx";
import * as businessTime from "../lib/businessTime.ts";
import * as callCloser from "../lib/callCloser.ts";
import * as callCloserFixtures from "../lib/callCloserFixtures.ts";
import * as callSheet from "../lib/callSheet.ts";
import * as leadMessageAuthor from "../lib/leadMessageAuthor.ts";
import * as leadTimeline from "../lib/leadTimeline.ts";
import * as payDoors from "../lib/payDoors.ts";
import * as proposalBuild from "../lib/proposals/build.ts";
import * as proposalFixtures from "../lib/proposals/fixtures.ts";
import * as proposalRender from "../lib/proposals/render.ts";
import * as quo from "../lib/quo.ts";
import {
  LOST_REASONS,
  MEETING_PLACES,
  OUTCOME_LABELS,
  PANEL_OUTCOMES,
  closerOffersFor,
  countPriorAttempts,
  parseNextStepRequest,
  planCallOutcome,
  type CallOutcome,
  type PlannerLead,
} from "../lib/callCloser.ts";
import { SAMPLE_ACTOR_NAME, SAMPLE_CALL_ACTIVITY, SAMPLE_CALL_LEAD, SAMPLE_NOW } from "../lib/callCloserFixtures.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { buildLeadTimeline, stripActivityMarkers } from "../lib/leadTimeline.ts";

// The call card and the proposal page: authorization before any lead read,
// a client panel that cannot reach the database or a messaging provider, and
// markup that works with a thumb and a screen reader. Fixed clocks and the
// fictional sample lead only.

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

const CARD_PAGE = "app/admin/call-sheet/[leadId]/page.tsx";
const CARD_WRAPPER = "app/admin/call-sheet/[leadId]/CallCardPanel.tsx";
const PANEL = "app/admin/call-sheet/CallOutcomePanel.tsx";
const PROPOSAL_PAGE = "app/admin/proposals/[leadId]/page.tsx";
const SENT_BUTTON = "app/admin/proposals/[leadId]/ProposalSentButton.tsx";
const SALES_WORKSPACE = "app/sales/leads/[id]/SalesLeadWorkspace.tsx";
const ADMIN_LEAD_PAGE = "app/admin/leads/[id]/page.tsx";

/** The body of the page's default export, so helpers defined above it do not count. */
function defaultExportBody(file: string): string {
  const text = src(file);
  const start = text.indexOf("export default async function");
  assert.ok(start >= 0, `${file} has an async default export`);
  return text.slice(start);
}

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*import\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)].map((m) => m[1]);
}

const { created_at: _c, source: _s, goals: _g, best_contact_method: _b, ...sampleLeadFields } = SAMPLE_CALL_LEAD;
const SAMPLE_LEAD: PlannerLead = { ...sampleLeadFields, diagnostic: null };
const SAMPLE_SUGGESTIONS = closerOffersFor(SAMPLE_CALL_LEAD.interest, SAMPLE_CALL_LEAD.diagnostic);
const SAMPLE_PRIOR = countPriorAttempts(SAMPLE_CALL_ACTIVITY);

function sampleProps(overrides: Partial<CallOutcomePanelProps> = {}): CallOutcomePanelProps {
  return {
    lead: SAMPLE_LEAD,
    suggestedOffers: SAMPLE_SUGGESTIONS,
    priorAttempts: SAMPLE_PRIOR,
    actorName: SAMPLE_ACTOR_NAME,
    smsHref: "sms:+19035550100",
    mailHref: "mailto:dana@example.test",
    canText: true,
    hasEmail: true,
    proposalAllowed: true,
    sample: true,
    fixedNow: SAMPLE_NOW.toISOString(),
    ...overrides,
  };
}

const render = (props: CallOutcomePanelProps) => renderToStaticMarkup(createElement(CallOutcomePanel, props));

/** Visible text, roughly: tags out, the few entities React writes decoded. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function inputs(html: string, type: string): { id: string; tag: string }[] {
  return [...html.matchAll(/<input\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes(`type="${type}"`))
    .map((tag) => ({ id: /\bid="([^"]+)"/.exec(tag)?.[1] ?? "", tag }));
}

function assertLabelled(html: string, type: string, expected: number) {
  const found = inputs(html, type);
  assert.equal(found.length, expected, `${expected} ${type} inputs`);
  for (const { id, tag } of found) {
    assert.ok(id, `every ${type} has an id: ${tag}`);
    assert.ok(html.includes(`for="${id}"`), `a label points at ${type} ${id}`);
  }
}

test("call card page: signed in and admin before any lead read; the sample reads no lead data", () => {
  const body = defaultExportBody(CARD_PAGE);
  const getUser = body.indexOf("auth.getUser()");
  const role = body.indexOf('profile?.role !== "admin"');
  const firstLeadRead = body.indexOf('.from("leads")');
  const sample = body.indexOf('leadId === "sample"');
  assert.ok(getUser > 0, "reads the signed-in user");
  assert.ok(role > getUser, "checks the admin role after reading the user");
  assert.ok(firstLeadRead > role, "reads the lead only after the role check");
  assert.ok(sample > role && sample < firstLeadRead, "the sample returns after auth and before any lead read");
  // Nothing above the page function reads the database either.
  const whole = src(CARD_PAGE);
  assert.ok(whole.indexOf('.from("leads")') > whole.indexOf("auth.getUser()"), "no lead read anywhere before auth");
  assert.ok(whole.indexOf('.from("lead_notes")') > whole.indexOf('profile?.role !== "admin"'));
  assert.ok(whole.indexOf('.from("lead_activity")') > whole.indexOf('profile?.role !== "admin"'));
  // Same redirects as the call sheet, with this card as the way back.
  assert.match(body, /redirect\(`\/login\?next=\$\{encodeURIComponent\(`\/admin\/call-sheet\/\$\{leadId\}`\)\}`\)/);
  assert.match(body, /redirect\("\/dashboard"\)/);
  assert.match(whole, /export const dynamic = "force-dynamic"/);
  assert.match(whole, /title: "Call card \| The LeadFlow Pro"/);
  assert.match(whole, /This is a connection problem, not an empty lead\./);
  // Read-only: the page never writes.
  assert.ok(!/\.(insert|update|upsert|delete|rpc)\(/.test(whole), "the call card page only reads");
  assert.ok(!/lib\/supabase\/service|lead_calls/.test(whole), "no service client and no scoreboard call log");
});

test("proposal page: signed in and admin before intakeFor() reads the lead", () => {
  const body = defaultExportBody(PROPOSAL_PAGE);
  const getUser = body.indexOf("auth.getUser()");
  const role = body.indexOf('profile?.role !== "admin"');
  const intake = body.indexOf("intakeFor(");
  assert.ok(getUser > 0 && role > getUser && intake > role, `order: getUser ${getUser}, role ${role}, intakeFor ${intake}`);
  assert.match(body, /redirect\("\/dashboard"\)/);
  assert.match(body, /searchParams/);
  assert.match(body, /buildProposal\(found\.intake, now, \{ selection \}\)/);
  assert.match(body, /<ProposalSentButton/);
  assert.match(body, /Back to call card/);
  // The page itself still never sends anything (tests/proposals.test.ts guards the same words).
  assert.ok(!/resend|sendEmail|sendSms|channels|leadNotify|api\.resend|fetch\(/i.test(src(PROPOSAL_PAGE)));
});

test("the panel and the proposal button reach no database, provider, or call sheet code, and post only to the save route", () => {
  for (const file of [PANEL, SENT_BUTTON]) {
    const text = src(file);
    assert.ok(text.startsWith('"use client";'), `${file} is a client component`);
    const imports = importsOf(text);
    assert.ok(imports.length > 0, file);
    for (const spec of imports) {
      assert.ok(!/callSheet|\/quo$|lib\/quo|leadNotify|supabase|resend|nurture|smsPolicy/i.test(spec), `${file} imports ${spec}`);
    }
    const fetches = [...text.matchAll(/\bfetch\(/g)];
    assert.equal(fetches.length, 1, `${file} has exactly one fetch`);
    const call = text.slice(fetches[0].index, fetches[0].index! + 120);
    assert.match(call, /fetch\(`\/api\/admin\/leads\/\$\{encodeURIComponent\(lead\.id\)\}\/next-step`/, call);
    assert.ok(!/XMLHttpRequest|sendBeacon|EventSource|WebSocket/.test(text), `${file} has no other network path`);
  }
  // The panel imports only the pure Call Closer modules and the copy button.
  const libs = importsOf(src(PANEL)).filter((s) => s.startsWith("@/lib/"));
  assert.deepEqual(libs.sort(), ["@/lib/businessTime", "@/lib/callCloser", "@/lib/payDoors"]);
  // No Next.js router in the panel, so it renders in a plain React test. The call card wrapper refreshes instead.
  assert.ok(!importsOf(src(PANEL)).some((s) => s.startsWith("next/")));
  assert.match(src(CARD_WRAPPER), /router\.refresh\(\)/);
});

test("sample panel markup: a fieldset with a legend, a label for every radio, 44px targets, and a Save that cannot post", () => {
  const html = render(sampleProps());
  assert.match(html, /<fieldset[^>]*>\s*<legend[^>]*>How did the call go\?<\/legend>/);
  assert.match(html, /<legend[^>]*tabindex="-1"/, "the legend can take focus when Ryan comes back from a call");
  assertLabelled(html, "radio", PANEL_OUTCOMES.length);
  for (const o of PANEL_OUTCOMES) assert.ok(html.includes(OUTCOME_LABELS[o]), o);
  assert.ok(!html.includes(OUTCOME_LABELS.proposal_sent), "proposal sent is logged from the proposal page");
  assert.ok((html.match(/min-h-\[44px\]/g) ?? []).length >= PANEL_OUTCOMES.length + 1, "every tile and the Save button are 44px tall");
  const save = /<button[^>]*type="submit"[^>]*>([^<]*)<\/button>/.exec(html);
  assert.ok(save, "a submit button");
  assert.match(save[0], /disabled=""/);
  assert.equal(save[1], "Sample only, nothing is saved");
  assert.match(html, /focus-visible:outline/);
  assert.ok(!/role="alert"/.test(html), "no error before anything happened");
  assert.deepEqual(copyProblems(textOf(html)), []);
});

test("a real panel has an enabled Save, and shows nothing that depends on the clock until the browser reads it", () => {
  const html = render(sampleProps({ sample: false, fixedNow: null, initialOutcome: "call_back" }));
  const save = /<button[^>]*type="submit"[^>]*>([^<]*)<\/button>/.exec(html);
  assert.ok(save);
  assert.ok(!/\sdisabled=""/.test(save[0]), save[0]);
  assert.equal(save[1], "Save the call");
  // No clock on the server render: no quick picks and no preview yet, so hydration cannot disagree.
  assert.ok(!html.includes("When you save"));
  assert.ok(!html.includes('aria-pressed'));
});

test("booked: labelled day and time in Central, the place chips, and dates bounded to the next 90 days", () => {
  const html = render(sampleProps({ initialOutcome: "booked" }));
  assertLabelled(html, "date", 1);
  assertLabelled(html, "time", 1);
  assertLabelled(html, "radio", PANEL_OUTCOMES.length + MEETING_PLACES.length + 1);
  assert.match(html, /When is the sit-down\?/);
  assert.match(html, /Time \(Central\)/);
  assert.match(html, new RegExp(`type="date"[^>]*min="${businessTime.centralDate(SAMPLE_NOW)}"`));
  assert.match(html, /max="2026-12-21"/);
  // Nothing chosen yet, so the planner says what is missing instead of a preview.
  assert.match(html, /Before you save:/);
});

test("the preview is the planner's own list, drawn from the same JSON Save would post", () => {
  const html = render(sampleProps({ initialOutcome: "no_answer" }));
  const parsed = parseNextStepRequest({ outcome: "no_answer", idempotency_key: "preview-only-key-not-saved", offers: [] });
  assert.ok(parsed.ok);
  const plan = planCallOutcome({ lead: SAMPLE_LEAD, request: parsed.request, actorName: SAMPLE_ACTOR_NAME, now: SAMPLE_NOW, priorAttempts: SAMPLE_PRIOR });
  assert.ok(plan.ok);
  assert.match(html, /When you save/);
  const text = textOf(html);
  for (const line of plan.preview) assert.ok(text.includes(line), line);
  // One unanswered try already: the second one comes back in two business days, in the afternoon.
  assert.ok(text.includes("Thu, Sep 24 at 4:00 PM"), text);
  assert.ok(text.includes("Nothing is sent to Dana."));
  assert.deepEqual(copyProblems(text), []);
});

test("ready to pay with offers that take no money online explains why instead of saving", () => {
  const html = render(sampleProps({ initialOutcome: "ready_to_pay" }));
  assert.match(html, /What are they paying for\? Pick up to three\./);
  // Suggestions are preselected, up to three, each a labelled checkbox.
  const boxes = inputs(html, "checkbox");
  assert.ok(boxes.length >= SAMPLE_SUGGESTIONS.length);
  for (const { id } of boxes) assert.ok(html.includes(`for="${id}"`), id);
  assert.equal(boxes.filter((b) => /\bchecked=""/.test(b.tag)).length, 3);
  assert.match(textOf(html), /Before you save: No online payment for .+ yet\. Choose Wants a proposal so the number goes in writing first\./);
});

test("not a fit lists every reason as a labelled radio", () => {
  const html = render(sampleProps({ initialOutcome: "not_a_fit" }));
  assertLabelled(html, "radio", PANEL_OUTCOMES.length + LOST_REASONS.length);
  for (const r of LOST_REASONS) assert.ok(html.includes(r.label), r.id);
  assert.match(html, /maxLength="2000"|maxlength="2000"/);
});

test("every panel outcome renders clean copy with the sample lead", () => {
  for (const outcome of PANEL_OUTCOMES as readonly CallOutcome[]) {
    const text = textOf(render(sampleProps({ initialOutcome: outcome })));
    assert.deepEqual(copyProblems(text), [], outcome);
    assert.ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(text), outcome);
  }
});

test("stripActivityMarkers hides the Call Closer's bookkeeping, and only at the end", () => {
  const detail = "Call: wants a proposal for Website Launch. Proposal due Thu, Sep 24. Outcome: wants_proposal. Offer ids: website_launch. Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
  assert.equal(stripActivityMarkers(detail), "Call: wants a proposal for Website Launch. Proposal due Thu, Sep 24.");
  assert.equal(stripActivityMarkers(SAMPLE_CALL_ACTIVITY[0]), "Call: no answer. Try again Tue, Sep 22 at 10:00 AM.");
  assert.equal(stripActivityMarkers("Stage: New to Contacted"), "Stage: New to Contacted");
  assert.equal(stripActivityMarkers("They said Outcome: great. Call Friday."), "They said Outcome: great. Call Friday.");
  const timeline = buildLeadTimeline({
    lead: { id: "lead-a", created_at: "2026-09-21T19:12:00Z", full_name: "Dana Sample", source: "meta_lead_ad", notes: null },
    activity: [{ id: "a1", lead_id: "lead-a", kind: "call", detail, created_at: "2026-09-22T15:05:00Z" }],
  });
  const entry = timeline.find((e) => e.id === "activity:a1");
  assert.ok(entry);
  assert.ok(!/Outcome:|Offer ids:|Ref /.test(entry.body), entry.body);
});

// ------------------------------------------------------------------------
// The two server pages, run for real against a fake database. Each page is
// compiled the way Next compiles it, its imports are handed the same modules
// the app uses (Next itself and the database are stubs), and every table read
// is recorded, so "auth before any lead read" is checked by behaviour, not
// only by where the words sit in the file.

const requireReal = createRequire(import.meta.url);
const LEAD_ID = "5b0f3a52-8f4e-4c0e-9a3d-2f1e6c7d8a90";

type Harness = {
  signedIn?: boolean;
  role?: string;
  lead?: Record<string, unknown> | null;
  leadError?: boolean;
  notes?: Record<string, unknown>[];
  notesError?: boolean;
  activity?: Record<string, unknown>[];
};

class Redirect extends Error {
  url: string;
  constructor(url: string) {
    super(`redirect ${url}`);
    this.url = url;
  }
}
class NotFound extends Error {}

function fakeDb(h: Harness, reads: string[]) {
  return {
    auth: {
      getUser: async () => ({ data: { user: h.signedIn === false ? null : { id: "staff-ryan", email: "owner@example.test" } } }),
    },
    from(table: string) {
      reads.push(table);
      const result = () => {
        if (table === "profiles") return { data: { role: h.role ?? "admin", full_name: "Ryan Sample" }, error: null };
        if (table === "leads") return h.leadError ? { data: null, error: { message: "offline" } } : { data: h.lead ?? null, error: null };
        if (table === "lead_notes") return h.notesError ? { data: null, error: { message: "offline" } } : { data: h.notes ?? [], error: null };
        if (table === "lead_activity") return { data: h.activity ?? [], error: null };
        return { data: null, error: { message: `unexpected table ${table}` } };
      };
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "order", "limit", "in", "gte"]) query[method] = () => query;
      for (const write of ["insert", "update", "upsert", "delete", "rpc"]) {
        query[write] = () => {
          throw new Error(`the page tried to ${write} ${table}`);
        };
      }
      query.single = async () => result();
      query.maybeSingle = async () => result();
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
      return query;
    },
  };
}

const StubLink = ({ href, children, ...rest }: { href: string; children?: ReactNode }) => createElement("a", { href, ...rest }, children);

function loadPage(file: string, h: Harness, extra: Record<string, unknown>) {
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
      notFound: () => {
        throw new NotFound("not found");
      },
    },
    "@/lib/supabase/server": { createClient: async () => fakeDb(h, reads) },
    "@/lib/businessTime": businessTime,
    "@/lib/callCloser": callCloser,
    "@/lib/callCloserFixtures": callCloserFixtures,
    "@/lib/callSheet": callSheet,
    "@/lib/leadMessageAuthor": leadMessageAuthor,
    "@/lib/leadTimeline": leadTimeline,
    "@/lib/payDoors": payDoors,
    "@/lib/quo": quo,
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
  return { page: mod.exports.default!, reads };
}

async function callCard(leadId: string, h: Harness = {}) {
  const panels: CallOutcomePanelProps[] = [];
  const { page, reads } = loadPage(CARD_PAGE, h, {
    "./CallCardPanel": {
      __esModule: true,
      default: (props: CallOutcomePanelProps) => {
        panels.push(props);
        return createElement(CallOutcomePanel, props);
      },
    },
  });
  try {
    const element = await page({ params: Promise.resolve({ leadId }) });
    return { html: renderToStaticMarkup(element as never), reads, panels, redirect: null as string | null, notFound: false };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, panels, redirect: e.url, notFound: false };
    if (e instanceof NotFound) return { html: "", reads, panels, redirect: null, notFound: true };
    throw e;
  }
}

function realLead(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: LEAD_ID,
    created_at: "2026-09-21T19:12:00.000Z",
    full_name: "Riley Example",
    business_name: "Example Lawn Care (fictional)",
    email: "riley@example.test",
    phone: "(903) 555-0142",
    status: "contacted",
    interest: "website_launch",
    source: "website",
    utm_source: null,
    best_contact_method: "call",
    goals: "Free 30-minute consultation. Meet: Come to my business. Reach me by: Call me.\n\nWe need a site that brings in mowing quotes.",
    sms_consent: true,
    sms_unsubscribed_at: null,
    next_follow_up_at: "2026-09-25T15:00:00.000Z",
    last_contacted_at: "2026-09-21T20:00:00.000Z",
    is_test: false,
    diagnostic: { api_token: "fixture-secret", source: "website" },
    ...overrides,
  };
}

test("call card harness: signed out or not an admin, nothing about the lead is read", async () => {
  const out = await callCard(LEAD_ID, { signedIn: false });
  assert.equal(out.redirect, `/login?next=${encodeURIComponent(`/admin/call-sheet/${LEAD_ID}`)}`);
  assert.deepEqual(out.reads, []);
  const sales = await callCard(LEAD_ID, { role: "sales", lead: realLead() });
  assert.equal(sales.redirect, "/dashboard");
  assert.deepEqual(sales.reads, ["profiles"]);
  const bad = await callCard("not-a-lead-id");
  assert.ok(bad.notFound);
  assert.deepEqual(bad.reads, ["profiles"]);
});

test("call card harness: the sample renders the fictional lead in sample mode and reads no lead data", async () => {
  const out = await callCard("sample");
  assert.deepEqual(out.reads, ["profiles"]);
  const text = textOf(out.html);
  assert.ok(text.includes("Dana Sample") && text.includes("Sample Pressure Washing (fictional)"));
  assert.ok(text.includes("Sample call card."));
  assert.ok(out.html.includes('href="tel:+19035550100"'), "a dialable Call button");
  assert.ok(out.html.includes('href="sms:+19035550100"'), "texting is consented on the sample");
  assert.ok(out.html.includes('href="mailto:dana@example.test"'));
  assert.ok(text.includes("Call back due now. You set it for Tue, Sep 22 at 10:00 AM Central."), text);
  assert.ok(text.includes("In their words") && text.includes("Pressure washing, mostly driveways and house washes"));
  assert.ok(text.includes("What you can offer") && text.includes("Show every published offer"));
  assert.ok(text.includes("Last time") && text.includes("Call: no answer. Try again Tue, Sep 22 at 10:00 AM."));
  assert.ok(text.includes("Sample only, nothing is saved"));
  assert.ok(!out.html.includes("/admin/leads/sample"), "no link to a lead record that does not exist");
  assert.deepEqual(copyProblems(text), []);
});

test("call card harness: a real lead is read after auth, and links follow consent", async () => {
  const detail = "Call: talked, call back Fri, Sep 25 at 10:00 AM. Talked about Website Launch. Outcome: call_back. Offer ids: website_launch, system_map. Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
  const out = await callCard(LEAD_ID, {
    lead: realLead(),
    notes: [{ body: "Call: talked, call back Fri, Sep 25 at 10:00 AM.\n\nWants mowing quotes online.", author: "Ryan", created_at: "2026-09-21T20:00:00.000Z" }],
    activity: [{ detail }],
  });
  assert.equal(out.redirect, null);
  assert.deepEqual(out.reads, ["profiles", "leads", "lead_notes", "lead_activity"]);
  const text = textOf(out.html);
  assert.ok(out.html.includes('href="tel:+19035550142"'));
  assert.ok(out.html.includes('href="sms:+19035550142"'));
  assert.ok(text.includes("Call back set for Fri, Sep 25 at 10:00 AM Central."), text);
  // The consultation form's own sentence is split out of their words.
  assert.ok(text.includes("We need a site that brings in mowing quotes."));
  assert.ok(text.includes("Wants to meet: Come to my business"));
  assert.ok(!text.includes("Free 30-minute consultation."));
  // A credential-shaped diagnostic key never reaches the page.
  assert.ok(!out.html.includes("fixture-secret"));
  // The panel gets plain props: links built here, offers named on the last call, and no diagnostic.
  const panel = out.panels[0];
  assert.ok(panel);
  assert.deepEqual(panel.initialOffers, ["website_launch", "system_map"]);
  assert.deepEqual(panel.suggestedOffers, callCloser.closerOffersFor("website_launch", null).slice(0, 4));
  assert.equal(panel.priorAttempts, 0, "the last call was a conversation");
  assert.equal(panel.smsHref, "sms:+19035550142");
  assert.equal(panel.mailHref, "mailto:riley@example.test");
  assert.equal(panel.canText, true);
  assert.equal(panel.lead.diagnostic, null);
  assert.equal(panel.defaultMeetingPlace, "at their business");
  assert.equal(panel.actorName, "Ryan Sample");
  assert.equal(panel.sample, false);
  assert.equal(panel.fixedNow, null);
  assert.equal(panel.proposalAllowed, true);
  assert.ok(text.includes("Save the call"));
  assert.ok(out.html.includes(`href="/admin/leads/${LEAD_ID}"`));
});

test("call card harness: no text link after STOP or without consent, no email link for a placeholder address", async () => {
  const stopped = await callCard(LEAD_ID, { lead: realLead({ sms_unsubscribed_at: "2026-09-21T21:00:00.000Z", email: "x@no-email.facebook.lead" }) });
  assert.ok(!stopped.html.includes('href="sms:'));
  assert.ok(textOf(stopped.html).includes("Replied STOP. Call instead."));
  assert.ok(!stopped.html.includes('href="mailto:'));
  const noConsent = await callCard(LEAD_ID, { lead: realLead({ sms_consent: false }) });
  assert.ok(!noConsent.html.includes('href="sms:'));
  assert.ok(textOf(noConsent.html).includes("No text consent"));
});

test("call card harness: a failed read says it is a connection problem, never an empty lead", async () => {
  const down = await callCard(LEAD_ID, { leadError: true });
  assert.match(down.html, /role="alert"/);
  assert.ok(textOf(down.html).includes("This is a connection problem, not an empty lead."));
  assert.deepEqual(down.reads, ["profiles", "leads"]);
  const gone = await callCard(LEAD_ID, { lead: null });
  assert.ok(gone.notFound);
  const partial = await callCard(LEAD_ID, { lead: realLead(), notesError: true });
  assert.match(partial.html, /role="alert"/);
  assert.ok(textOf(partial.html).includes("Some of this lead's history did not load."), textOf(partial.html));
  const untouched = await callCard(LEAD_ID, { lead: realLead({ last_contacted_at: null }) });
  assert.ok(textOf(untouched.html).includes("Nobody has logged a call or a note yet. This is the first call."));
});

async function proposalPage(leadId: string, offers: string | undefined, h: Harness = {}) {
  const sent: { offers?: string[]; sample?: boolean; callCardHref?: string | null }[] = [];
  const { page, reads } = loadPage(PROPOSAL_PAGE, h, {
    "@/lib/proposals/build": proposalBuild,
    "@/lib/proposals/render": proposalRender,
    "@/lib/proposals/fixtures": proposalFixtures,
    "@/app/hq/_components/CopyButton": { __esModule: true, default: () => createElement("button", { type: "button" }, "Copy text") },
    "./ProposalSentButton": {
      __esModule: true,
      default: (props: { offers: string[]; sample: boolean; callCardHref: string | null }) => {
        sent.push(props);
        return createElement("section", { "data-sent-button": "" }, "Mark the proposal sent");
      },
    },
  });
  try {
    const element = await page({ params: Promise.resolve({ leadId }), searchParams: Promise.resolve(offers === undefined ? {} : { offers }) });
    return { html: renderToStaticMarkup(element as never), reads, sent, redirect: null as string | null };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, sent, redirect: e.url };
    throw e;
  }
}

test("proposal page harness: auth before intakeFor, the call's offers replace the guess, and a way back to the call card", async () => {
  const out = await proposalPage(LEAD_ID, "website_launch", { signedIn: false, lead: realLead() });
  assert.equal(out.redirect, `/login?next=${encodeURIComponent(`/admin/proposals/${LEAD_ID}`)}`);
  assert.deepEqual(out.reads, []);
  const sales = await proposalPage(LEAD_ID, undefined, { role: "sales", lead: realLead() });
  assert.equal(sales.redirect, "/dashboard");
  assert.deepEqual(sales.reads, ["profiles"]);

  const sample = await proposalPage("sample-build", "website_launch,not_an_offer,website_launch", {});
  assert.deepEqual(sample.reads, ["profiles"], "a sample reads no lead");
  assert.deepEqual(sample.sent[0].offers?.[0], "website_launch");
  assert.equal(sample.sent[0].sample, true);
  assert.equal(sample.sent[0].callCardHref, null);
  assert.ok(textOf(sample.html).includes("Offers chosen with the lead on the call."));
  assert.ok(!sample.html.includes("Back to call card"));

  const real = await proposalPage(LEAD_ID, "system_map,website_launch,lead_followup_campaign,company_os", { lead: realLead() });
  assert.deepEqual(real.reads, ["profiles", "leads"]);
  assert.deepEqual(real.sent[0].offers, ["system_map", "website_launch", "lead_followup_campaign"], "at most three, in the order chosen");
  assert.equal(real.sent[0].sample, false);
  assert.equal(real.sent[0].callCardHref, `/admin/call-sheet/${LEAD_ID}`);
  assert.ok(real.html.includes(`href="/admin/call-sheet/${LEAD_ID}"`) && textOf(real.html).includes("Back to call card"));
});

test("the sales workspace logs calls through the panel, and the lead page links to the call card", () => {
  const sales = src(SALES_WORKSPACE);
  assert.ok(!sales.includes("Log completed call") && !/\blogCall\b/.test(sales), "the old one-tap call log is gone");
  assert.match(sales, /<CallOutcomePanel\s+compact/);
  assert.match(sales, /onSaved=\{\(\) => router\.refresh\(\)\}/);
  assert.ok(!/proposalAllowed/.test(sales), "no proposal link in the sales workspace");
  assert.ok(
    !importsOf(sales).some((spec) => /lib\/quo|lib\/callSheet|leadNotify/.test(spec)),
    "the client workspace does not load Quo, call sheet, or notification code",
  );
  const admin = src(ADMIN_LEAD_PAGE);
  assert.match(admin, /href=\{`\/admin\/call-sheet\/\$\{id\}`\}[^>]*className="hq-btn hq-btn-sm"[^>]*>\s*Log a call/);
});

test("new UI files keep the house style: no long dashes, even in comments", () => {
  for (const file of [CARD_PAGE, CARD_WRAPPER, PANEL, SENT_BUTTON]) {
    assert.ok(!/[\u2013\u2014]/.test(src(file)), file);
  }
});

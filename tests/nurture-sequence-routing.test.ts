import * as business from "../lib/site/business.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as nurture from "../lib/nurture";
import * as nurtureContext from "../lib/nurtureContext";
import * as nurtureHtml from "../lib/nurtureHtml";
import * as nurtureRentReceipt from "../lib/nurtureRentReceipt";
import * as nurtureDelivery from "../lib/nurtureDelivery";
import * as guard from "../lib/metaCampaignGuard";
import * as contractorSeries from "../lib/contractorSeries";
import * as contractorEmailHtml from "../lib/contractorEmailHtml";
import { bookingPage } from "../lib/site/external-links";

// Runs the actual cron route against an in-memory leads and lead_emails
// table and captures what it would have handed Resend. Proves the one
// decision that matters: which sequence a lead lands in, and that a lead
// never gets two.

const require = createRequire(import.meta.url);
const START = Date.parse(nurtureRentReceipt.RENT_RECEIPT_SERIES_START);
const HOUR = 3600_000;
const DAY = 24 * HOUR;

type Row = Record<string, unknown>;

function makeDb(leads: Row[], emails: Row[]) {
  const activity: Row[] = [];
  let nextId = 1;
  function builder(table: string) {
    const rows = table === "leads" ? leads : table === "lead_emails" ? emails : activity;
    const state: { op: "select" | "insert" | "update"; payload: Row | null; filters: ((r: Row) => boolean)[]; single: boolean } = {
      op: "select",
      payload: null,
      filters: [],
      single: false,
    };
    const cmp = (a: unknown, b: unknown) =>
      typeof b === "number" ? Number(a) : String(a);
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      select: () => q,
      insert: (p: Row) => ((state.op = "insert"), (state.payload = p), q),
      update: (p: Row) => ((state.op = "update"), (state.payload = p), q),
      is: (c: string, v: unknown) => (state.filters.push((r) => r[c] === v), q),
      eq: (c: string, v: unknown) => (state.filters.push((r) => r[c] === v), q),
      not: (c: string, _o: string, v: unknown) => (state.filters.push((r) => r[c] !== v), q),
      in: (c: string, vs: unknown[]) => (state.filters.push((r) => vs.includes(r[c])), q),
      gte: (c: string, v: unknown) => (state.filters.push((r) => cmp(r[c], v) >= (typeof v === "number" ? v : String(v))), q),
      lte: (c: string, v: unknown) => (state.filters.push((r) => cmp(r[c], v) <= (typeof v === "number" ? v : String(v))), q),
      order: () => q,
      single: () => ((state.single = true), q),
      maybeSingle: () => ((state.single = true), q),
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve().then(execute).then(resolve, reject);
      },
    });
    function execute() {
      const match = rows.filter((r) => state.filters.every((f) => f(r)));
      if (state.op === "insert") {
        const p = state.payload!;
        if (
          table === "lead_emails" &&
          emails.some((r) => r.lead_id === p.lead_id && r.step === p.step)
        ) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        const row: Row = { id: `row-${nextId++}`, sent_at: null, provider_message_id: null, last_error: null, ...p };
        rows.push(row);
        return { data: state.single ? row : [row], error: null };
      }
      if (state.op === "update") {
        for (const r of match) Object.assign(r, state.payload);
        return { data: state.single ? (match[0] ?? null) : match, error: null };
      }
      return { data: state.single ? (match[0] ?? null) : match, error: null };
    }
    return q;
  }
  return { db: { from: builder }, activity };
}

async function runRoute(leads: Row[], emails: Row[], nowMs: number, sendWindow = "off") {
  const { db, activity } = makeDb(leads, emails);
  const sends: { key: string; payload: Record<string, unknown> }[] = [];
  const code = ts.transpileModule(
    readFileSync(new URL("../app/api/cron/nurture/route.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const loaded = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  class Clock extends Date {
    static now() {
      return nowMs;
    }
  }
  const run = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    Date: Clock,
    console: { error() {} },
    process: {
      env: { CRON_SECRET: "fixture-cron", SUPABASE_SERVICE_ROLE_KEY: "fixture-db", RESEND_API_KEY: "fixture-email", NURTURE_SEND_WINDOW: sendWindow },
    },
  });
  run(
    (name: string) => {
      if (name === "@supabase/supabase-js") return { createClient: () => db };
      if (name === "@/lib/config")
        return { SUPABASE_URL: `https://${guard.LEADFLOW_META.supabaseProjectRef}.supabase.co` };
      if (name === "@/lib/nurture")
        return { ...nurture, workshopSequenceClosed: () => nurture.workshopSequenceClosed(nowMs) };
      if (name === "@/lib/nurtureContext") return nurtureContext;
      if (name === "@/lib/nurtureHtml") return nurtureHtml;
      if (name === "@/lib/nurtureRentReceipt") return nurtureRentReceipt;
      if (name === "@/lib/metaCampaignGuard") return guard;
      if (name === "@/lib/contractorSeries") return contractorSeries;
      if (name === "@/lib/contractorEmailHtml") return contractorEmailHtml;
      if (name === "@/lib/site/business") return business;
      if (name === "@/lib/unsubscribe")
        return {
          unsubscribeSecret: () => "fixture-unsubscribe",
          unsubscribeUrl: (id: string) => `https://www.theleadflowpro.com/api/unsubscribe?lead=${id}&sig=fixture`,
        };
      if (name === "@/lib/nurtureDelivery")
        return {
          ...nurtureDelivery,
          sendNurtureEmail: async (_key: string, idempotencyKey: string, payload: Record<string, unknown>) => {
            sends.push({ key: idempotencyKey, payload });
            return { ok: true, providerMessageId: `msg-${sends.length}` };
          },
        };
      return require(name);
    },
    loaded,
    loaded.exports,
  );
  const response = await loaded.exports.GET(
    new Request("https://www.theleadflowpro.com/api/cron/nurture", { headers: { authorization: "Bearer fixture-cron" } }),
  );
  return { status: response.status, body: (await response.json()) as Record<string, unknown>, sends, emails, activity };
}

const base = {
  source: "meta_lead_ad",
  interest: "services",
  marketing_email_consent: true,
  deleted_at: null,
  email_unsubscribed_at: null,
  is_test: false,
  status: "contacted",
  timeline: null,
  goals: null,
};

const rentForm = (fields: Record<string, string>) => ({
  form_id: "3610264839155246",
  source: "meta_lead_form",
  fields,
});

test("a new Rent Receipt lead gets step 501 on its pain track with the HTML part and tags", async () => {
  const now = START + 2 * DAY + HOUR;
  const leads: Row[] = [
    {
      ...base,
      id: "rent-new",
      full_name: "Debra Terry",
      email: "debra@example.com",
      created_at: new Date(START + DAY).toISOString(),
      timeline: "this_week",
      diagnostic: rentForm({
        "what_is_costing_you_the_most_right_now?": "missed_calls_and_texts_nobody_returns",
        "how_soon_do_you_want_it_fixed?": "this_week",
      }),
    },
  ];
  const result = await runRoute(leads, [], now);
  assert.equal(result.status, 200);
  assert.equal(result.body.sent, 1);
  assert.equal(result.sends.length, 1);
  const [send] = result.sends;
  assert.equal(send.key, `nurture-rent_receipt-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-rent-new-501`);
  assert.equal(send.payload.subject, "📵 About the calls nobody returns");
  const text = String(send.payload.text);
  assert.ok(text.startsWith("Debra,"));
  assert.ok(text.includes(`${bookingPage()}?utm_source=email`), "hot lead links the booking page");
  assert.ok(text.includes("Stop them any time, one click, no login:"), "unsubscribe line is appended");
  const html = String(send.payload.html);
  assert.ok(html.startsWith("<!DOCTYPE html>"), "designed HTML is attached");
  assert.ok(html.includes("Debra,") && html.includes("Day 1 of 30") && html.includes("About the calls nobody returns</h1>"));
  assert.ok(html.includes("Pick a time, I call you"), "hot lead button is the call");
  // Objects cross the vm boundary with a different prototype, so compare by value.
  assert.equal(
    JSON.stringify(send.payload.tags),
    JSON.stringify([
      { name: "campaign", value: "rent_receipt" },
      { name: "day", value: "01" },
      { name: "track", value: "missed_calls_hot" },
      { name: "lead_id", value: "rent-new" },
    ]),
  );
  const claim = result.emails.find((r) => r.lead_id === "rent-new");
  assert.equal(claim?.step, 501);
  assert.equal(claim?.delivery_status, "sent");
  assert.match(String(result.activity[0]?.detail), /Sent day 1 follow-up email: 📵 About the calls nobody returns \[rent_receipt\/missed_calls_hot\]/);
});

test("leads created before the start, or already on Free Build, stay on Free Build", async () => {
  const now = START + 2 * DAY + HOUR;
  const leads: Row[] = [
    {
      ...base,
      id: "free-old",
      full_name: "Old Lead",
      email: "old@example.com",
      created_at: new Date(START - 3 * DAY).toISOString(),
      diagnostic: { form_id: "1001553739566746" },
    },
    {
      ...base,
      id: "free-started",
      full_name: "Started Lead",
      email: "started@example.com",
      created_at: new Date(START + 30 * 60_000).toISOString(),
      diagnostic: rentForm({ "what_is_costing_you_the_most_right_now?": "something_else" }),
    },
  ];
  const emails: Row[] = [
    {
      id: "existing-101",
      lead_id: "free-started",
      step: 101,
      delivery_status: "sent",
      sent_at: new Date(now - 26 * HOUR).toISOString(),
      first_attempt_at: new Date(now - 26 * HOUR).toISOString(),
      last_attempt_at: new Date(now - 26 * HOUR).toISOString(),
      attempt_count: 1,
    },
  ];
  const result = await runRoute(leads, emails, now);
  assert.equal(result.status, 200);
  assert.equal(result.body.sent, 2);
  const byLead = Object.fromEntries(result.sends.map((s) => [String(s.payload.to), s]));
  // Created before the start: Free Build day one.
  assert.equal(byLead["old@example.com"].key, `nurture-free_build-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-free-old-101`);
  assert.equal(byLead["old@example.com"].payload.subject, nurture.NURTURE_STEPS[0].subject);
  // Created after the start but already sent a Free Build step: Free Build day two, never 501.
  assert.equal(byLead["started@example.com"].key, `nurture-free_build-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-free-started-102`);
  assert.equal(byLead["started@example.com"].payload.subject, nurture.NURTURE_STEPS[1].subject);
  assert.equal(result.emails.some((r) => Number(r.step) >= 501), false, "no Rent Receipt row was written");
  for (const send of result.sends) {
    assert.ok(String(send.payload.html).startsWith("<!DOCTYPE html>"), "Free Build sends carry the HTML part too");
    assert.equal((send.payload.tags as { name: string; value: string }[])[0].value, "free_build");
  }
});

test("a cool lead with no answers gets the general track and no booking link on day one", async () => {
  const now = START + 2 * DAY + HOUR;
  const leads: Row[] = [
    {
      ...base,
      id: "scoreboard-new",
      full_name: "Pat Example",
      email: "pat@example.com",
      created_at: new Date(START + DAY).toISOString(),
      diagnostic: { form_id: "1072145798524733" },
    },
  ];
  const result = await runRoute(leads, [], now);
  assert.equal(result.sends.length, 1);
  const [send] = result.sends;
  assert.equal(send.payload.subject, "❓ What is costing you the most?");
  assert.equal(String(send.payload.text).includes(String(bookingPage())), false);
  assert.ok(String(send.payload.text).includes("/tools/rent-receipt?utm_source=email"));
  assert.equal(
    JSON.stringify((send.payload.tags as { name: string; value: string }[])[2]),
    JSON.stringify({ name: "track", value: "other_cool" }),
  );
});

test("one email per lead per day holds across sequences", async () => {
  const now = START + 2 * DAY + HOUR;
  const leads: Row[] = [
    {
      ...base,
      id: "rent-throttled",
      full_name: "Throttled",
      email: "throttled@example.com",
      created_at: new Date(START + DAY).toISOString(),
      diagnostic: rentForm({}),
    },
  ];
  const emails: Row[] = [
    {
      id: "just-sent",
      lead_id: "rent-throttled",
      step: 401,
      delivery_status: "sent",
      sent_at: new Date(now - 2 * HOUR).toISOString(),
      first_attempt_at: new Date(now - 2 * HOUR).toISOString(),
      last_attempt_at: new Date(now - 2 * HOUR).toISOString(),
      attempt_count: 1,
    },
  ];
  const result = await runRoute(leads, emails, now);
  assert.equal(result.sends.length, 0);
  assert.equal(result.body.throttled, 1);
});

const contractorForm = () => ({
  form_id: contractorSeries.CONTRACTOR_META_FORM_ID,
  source: "contractor_owner",
  fields: {},
});

test("a lead from Pat's v2 form gets the same contractor day 1", async () => {
  const now = START + 40 * DAY;
  const leads: Row[] = [
    {
      ...base,
      id: "dirt-v2",
      full_name: "mike smith",
      email: "mike@example.com",
      created_at: new Date(now - DAY - HOUR).toISOString(),
      diagnostic: { ...contractorForm(), form_id: contractorSeries.CONTRACTOR_META_FORM_ID_V2 },
    },
  ];
  const result = await runRoute(leads, [], now);
  assert.equal(result.status, 200);
  assert.equal(result.sends.length, 1);
  assert.equal(
    result.sends[0].key,
    `nurture-contractor_owner-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-dirt-v2-601`,
  );
});

test("a Scott video lead gets contractor day 1, designed and tagged, never Rent Receipt", async () => {
  const now = START + 40 * DAY;
  const leads: Row[] = [
    {
      ...base,
      id: "dirt-new",
      full_name: "mike smith",
      email: "mike@example.com",
      created_at: new Date(now - DAY - HOUR).toISOString(),
      diagnostic: contractorForm(),
    },
  ];
  const result = await runRoute(leads, [], now);
  assert.equal(result.status, 200);
  assert.equal(result.sends.length, 1);
  const [send] = result.sends;
  assert.equal(send.key, `nurture-contractor_owner-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-dirt-new-601`);
  assert.equal(send.payload.subject, "🚜 Scott spent $800. Here is what came back.");
  assert.ok(String(send.payload.text).startsWith("Mike,"));
  assert.ok(String(send.payload.html).includes("Not a promise of what yours will do."));
  assert.equal(
    JSON.stringify(send.payload.tags),
    JSON.stringify([
      { name: "campaign", value: "contractor_owner" },
      { name: "day", value: "01" },
      { name: "track", value: "contractor" },
      { name: "lead_id", value: "dirt-new" },
    ]),
  );
  assert.equal(result.emails.find((r) => r.lead_id === "dirt-new")?.step, 601);
});

test("contractor leads stop at the last cleared day and are read back past 45 days", async () => {
  const now = START + 120 * DAY;
  const sentRow = (lead: string, step: number, daysAgo: number): Row => ({
    id: `${lead}-${step}`,
    lead_id: lead,
    step,
    delivery_status: "sent",
    sent_at: new Date(now - daysAgo * DAY).toISOString(),
    first_attempt_at: new Date(now - daysAgo * DAY).toISOString(),
    last_attempt_at: new Date(now - daysAgo * DAY).toISOString(),
    attempt_count: 1,
  });
  const leads: Row[] = [
    {
      ...base,
      id: "dirt-done",
      full_name: "Done",
      email: "done@example.com",
      created_at: new Date(now - 30 * DAY).toISOString(),
      diagnostic: contractorForm(),
    },
    {
      ...base,
      id: "dirt-old",
      full_name: "Old",
      email: "old@example.com",
      created_at: new Date(now - 100 * DAY).toISOString(),
      diagnostic: contractorForm(),
    },
    {
      ...base,
      id: "rent-old",
      full_name: "Rent Old",
      email: "rentold@example.com",
      created_at: new Date(now - 50 * DAY).toISOString(),
      diagnostic: rentForm({}),
    },
  ];
  // dirt-done already has every cleared day.
  const emails: Row[] = contractorSeries.CONTRACTOR_STEPS.map((step, i) =>
    sentRow("dirt-done", step.step, 8 - i * 0.5),
  );
  const result = await runRoute(leads, emails, now);
  // dirt-done has every cleared day; dirt-old (100 days) is caught up one at a
  // time; the 50 day old Rent Receipt lead stays outside its 45 day window.
  assert.deepEqual(
    result.sends.map((s) => s.key.split("-").slice(-1)[0]),
    ["601"],
  );
  assert.ok(result.sends[0].key.includes("-dirt-old-"));
});

test("new follow ups wait for 7 AM to 8 PM Central", async () => {
  // 2026-10-02 08:00 UTC is 3 AM Central; 14:00 UTC is 9 AM Central.
  const night = Date.parse("2026-10-02T08:00:00Z");
  const morning = Date.parse("2026-10-02T14:00:00Z");
  const lead = (): Row => ({
    ...base,
    id: "dirt-window",
    full_name: "Window Test",
    email: "window@example.com",
    created_at: new Date(night - 2 * DAY).toISOString(),
    diagnostic: contractorForm(),
  });
  const held = await runRoute([lead()], [], night, "7-20");
  assert.equal(held.sends.length, 0);
  assert.equal(held.body.held_for_window, 1);
  const open = await runRoute([lead()], [], morning, "7-20");
  assert.equal(open.sends.length, 1);
  assert.equal(open.body.held_for_window, 0);
});

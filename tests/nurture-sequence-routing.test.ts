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
import * as metaSalesSeries from "../lib/metaSalesSeries";
import * as metaSalesDailySeries from "../lib/metaSalesDailySeries";
import * as metaDailyEnrollment from "../lib/metaDailyEnrollment";
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

function makeDb(leads: Row[], emails: Row[], finalLifecycle?: Row | "error", optOutSyncFails = false, queryFailure?: { table: string; from: number; malformed?: boolean; truncated?: boolean }) {
  const activity: Row[] = [];
  let nextId = 1;
  function builder(table: string) {
    const rows = table === "leads" ? leads : table === "lead_emails" ? emails : activity;
    const state: { op: "select" | "insert" | "update"; payload: Row | null; filters: ((r: Row) => boolean)[]; single: boolean; finalRead: boolean; range?: [number, number]; order: string[] } = {
      op: "select",
      payload: null,
      filters: [],
      single: false,
      finalRead: false,
      order: [],
    };
    const cmp = (a: unknown, b: unknown) =>
      typeof b === "number" ? Number(a) : String(a);
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      select: (columns?: string) => {
        state.finalRead = table === "leads" && columns === "status,deleted_at,is_test,marketing_email_consent,email_unsubscribed_at,diagnostic";
        return q;
      },
      insert: (p: Row) => ((state.op = "insert"), (state.payload = p), q),
      update: (p: Row) => ((state.op = "update"), (state.payload = p), q),
      is: (c: string, v: unknown) => (state.filters.push((r) => r[c] === v), q),
      eq: (c: string, v: unknown) => (state.filters.push((r) => r[c] === v), q),
      not: (c: string, _o: string, v: unknown) => (state.filters.push((r) => r[c] !== v), q),
      in: (c: string, vs: unknown[]) => {
        if (table === "lead_emails" && c === "lead_id") assert.ok(vs.length <= 100, "bounded history URL ID filter");
        state.filters.push((r) => vs.includes(r[c])); return q;
      },
      gte: (c: string, v: unknown) => (state.filters.push((r) => cmp(r[c], v) >= (typeof v === "number" ? v : String(v))), q),
      lte: (c: string, v: unknown) => (state.filters.push((r) => cmp(r[c], v) <= (typeof v === "number" ? v : String(v))), q),
      or: (expression: string) => {
        const parts = expression.split(",");
        assert.equal(parts.length, 2);
        const createdSince = parts[0].replace("created_at.gte.", "");
        const enrolledSince = parts[1].replace("diagnostic->meta_daily30->>enrolled_at.gte.", "");
        assert.ok(parts[0].startsWith("created_at.gte.") && parts[1].startsWith("diagnostic->meta_daily30->>enrolled_at.gte."));
        state.filters.push((r) => String(r.created_at) >= createdSince ||
          String((r.diagnostic as Record<string, Record<string, unknown>> | null)?.meta_daily30?.enrolled_at ?? "") >= enrolledSince);
        return q;
      },
      order: (column: string) => (state.order.push(column), q),
      range: (from: number, to: number) => ((state.range = [from, to]), q),
      single: () => ((state.single = true), q),
      maybeSingle: () => ((state.single = true), q),
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve().then(execute).then(resolve, reject);
      },
    });
    function execute() {
      let match = rows.filter((r) => state.filters.every((f) => f(r)));
      const count = match.length;
      if (state.range) {
        if (queryFailure?.table === table && queryFailure.from === state.range[0]) {
          return queryFailure.truncated
            ? { data: [], count, error: null }
            : queryFailure.malformed
              ? { data: null, count, error: null }
              : { data: null, count, error: { message: "Fixture second-page failure" } };
        }
        match.sort((a, b) => {
          for (const column of state.order) {
            const value = String(a[column]).localeCompare(String(b[column]));
            if (value) return value;
          }
          return 0;
        });
        match = match.slice(state.range[0], state.range[1] + 1);
      }
      if (state.finalRead && finalLifecycle === "error") {
        return { data: null, error: { message: "Fixture eligibility read failed" } };
      }
      if (state.finalRead && typeof finalLifecycle === "object") {
        return { data: match[0] ? { ...match[0], ...finalLifecycle } : null, error: null };
      }
      if (state.op === "insert") {
        const p = state.payload!;
        if (
          table === "lead_emails" &&
          emails.some((r) => r.lead_id === p.lead_id && r.step === p.step)
        ) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        let id: string;
        do { id = `row-${nextId++}`; } while (rows.some((row) => row.id === id));
        const row: Row = { id, sent_at: null, provider_message_id: null, last_error: null, ...p };
        rows.push(row);
        return { data: state.single ? row : [row], error: null };
      }
      if (state.op === "update") {
        if (table === "leads" && state.payload?.email_unsubscribed_at && optOutSyncFails) {
          return { data: null, error: { message: "Fixture opt-out sync failed" } };
        }
        for (const r of match) Object.assign(r, state.payload);
        return { data: state.single ? (match[0] ?? null) : match, error: null };
      }
      return { data: state.single ? (match[0] ?? null) : match, count, error: null };
    }
    return q;
  }
  return { db: { from: builder }, activity };
}

async function runRoute(leads: Row[], emails: Row[], nowMs: number, sendWindow = "off", finalLifecycle?: Row | "error", provider?: { emails?: string[]; failed?: boolean; syncFails?: boolean; queryFailure?: { table: string; from: number; malformed?: boolean; truncated?: boolean } }) {
  const { db, activity } = makeDb(leads, emails, finalLifecycle, provider?.syncFails, provider?.queryFailure);
  let providerReads = 0;
  const sends: { key: string; payload: Record<string, unknown> }[] = [];
  const code = ts.transpileModule(
    readFileSync(new URL("../app/api/cron/nurture/route.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const loaded = { exports: {} as { GET: (request: Request) => Promise<Response> } };
  class Clock extends Date {
    constructor(value?: string | number) {
      super(value === undefined ? nowMs : value);
    }
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
      if (name === "@/lib/metaSalesSeries") return metaSalesSeries;
      if (name === "@/lib/metaSalesDailySeries") return metaSalesDailySeries;
      if (name === "@/lib/metaDailyEnrollment") return metaDailyEnrollment;
      if (name === "@/lib/resendContacts") return {
        readResendContactOptOuts: async () => {
          providerReads++;
          return provider?.failed
            ? { ok: false, error: "list:403" }
            : { ok: true, emails: new Set(provider?.emails ?? []) };
        },
      };
      if (name === "@/lib/site/business") return business;
      if (name === "@/lib/unsubscribe")
        return {
          unsubscribeSecret: () => "fixture-unsubscribe",
          unsubscribeUrl: (id: string) => `https://www.theleadflowpro.com/api/unsubscribe?lead=${id}&sig=fixture`,
        };
      if (name === "@/lib/nurtureDelivery")
        return {
          ...nurtureDelivery,
          nurtureRetryWindowExpired: (firstAttempt: string | null) =>
            nurtureDelivery.nurtureRetryWindowExpired(firstAttempt, nowMs),
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
  return { status: response.status, body: (await response.json()) as Record<string, unknown>, sends, emails, activity, providerReads };
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
  const now = Date.parse(metaSalesSeries.META_SALES_START) - DAY;
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
  const now = Date.parse(metaSalesSeries.META_SALES_START) - DAY;
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
  const now = Date.parse(metaSalesSeries.META_SALES_START) - HOUR;
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

test("restored partial histories resume at step 105 at 7 AM, without restarting or catch-up bursts", async () => {
  const morning = Date.parse("2026-10-08T12:00:00Z");
  const lead = (): Row => ({
    ...base,
    id: "restored-partial",
    full_name: "Owner Example",
    email: "owner@example.com",
    created_at: new Date(morning - 41 * DAY).toISOString(),
    diagnostic: { form_id: "2043120369669082" },
  });
  const history = () => [101, 102, 103, 104].map((step) => ({
    id: `restored-${step}`,
    lead_id: "restored-partial",
    step,
    delivery_status: "sent",
    sent_at: new Date(morning - 25 * DAY).toISOString(),
    first_attempt_at: new Date(morning - 25 * DAY).toISOString(),
    last_attempt_at: new Date(morning - 25 * DAY).toISOString(),
    attempt_count: 1,
  }));
  const held = await runRoute([lead()], history(), morning - 1, "7-20");
  assert.equal(held.sends.length, 0);
  assert.equal(held.body.held_for_window, 1);
  const open = await runRoute([lead()], history(), morning, "7-20");
  assert.equal(open.sends.length, 1);
  assert.equal(open.sends[0].key, `nurture-free_build-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-restored-partial-105`);
  assert.equal(open.emails.filter((r) => r.step === 105).length, 1);
  assert.equal(open.emails.some((r) => Number(r.step) >= 501), false);
});

test("restored sequences can finish beyond day 45 and completed histories never replay", async () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  const lead = (id: string): Row => ({
    ...base, id, full_name: "Owner Example", email: `${id}@example.com`,
    created_at: new Date(now - 66 * DAY).toISOString(),
    diagnostic: { form_id: "2043120369669082" },
  });
  const history = (id: string, count: number): Row[] => Array.from({ length: count }, (_, i) => ({
    id: `${id}-${101 + i}`, lead_id: id, step: 101 + i, delivery_status: "sent",
    sent_at: new Date(now - 2 * DAY).toISOString(),
    first_attempt_at: new Date(now - 2 * DAY).toISOString(),
    last_attempt_at: new Date(now - 2 * DAY).toISOString(), attempt_count: 1,
  }));
  const result = await runRoute([lead("partial-late"), lead("completed-late")], [
    ...history("partial-late", 25), ...history("completed-late", 30),
  ], now);
  assert.equal(result.sends.length, 1);
  assert.equal(result.sends[0].key, `nurture-free_build-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-partial-late-126`);
});

test("restored forms keep the daily throttle and stable pending provider claim", async () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  const lead = (id: string): Row => ({
    ...base, id, full_name: "Owner Example", email: `${id}@example.com`,
    created_at: new Date(now - 41 * DAY).toISOString(),
    diagnostic: { form_id: "2043120369669082" },
  });
  const accepted = (id: string): Row[] => [101, 102, 103, 104].map((step) => ({
    id: `${id}-${step}`, lead_id: id, step, delivery_status: "sent",
    sent_at: new Date(now - 23 * HOUR).toISOString(),
    first_attempt_at: new Date(now - 23 * HOUR).toISOString(),
    last_attempt_at: new Date(now - 23 * HOUR).toISOString(), attempt_count: 1,
  }));
  const throttled = await runRoute([lead("restored-throttled")], accepted("restored-throttled"), now);
  assert.equal(throttled.sends.length, 0);
  assert.equal(throttled.body.throttled, 1);
  const pending: Row = {
    id: "pending-105", lead_id: "restored-pending", step: 105, delivery_status: "pending",
    sent_at: null, first_attempt_at: new Date(now - HOUR).toISOString(),
    last_attempt_at: new Date(now - 31 * 60_000).toISOString(), attempt_count: 1,
  };
  const resumed = await runRoute([lead("restored-pending")], [...accepted("restored-pending"), pending], now);
  assert.equal(resumed.sends.length, 1);
  assert.equal(resumed.sends[0].key, `nurture-free_build-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-restored-pending-105`);
  assert.equal(resumed.emails.filter((r) => r.step === 105).length, 1);
  assert.equal(resumed.emails.find((r) => r.step === 105)?.attempt_count, 2);
});

test("unclaimed Meta cohorts use daily follow-ups while earlier contractor cohorts stay intact", async () => {
  const cutoff = Date.parse(metaSalesSeries.META_SALES_START);
  const now = cutoff + DAY + HOUR;
  const lead = (id: string, created: number): Row => ({
    ...base, id, full_name: "Owner Example", email: `${id}@example.com`,
    created_at: new Date(created).toISOString(), diagnostic: { form_id: contractorSeries.CONTRACTOR_META_FORM_ID_V3 },
  });
  const result = await runRoute([lead("before-cutoff", cutoff - 1), lead("new-cohort", cutoff)], [], now);
  assert.equal(result.sends.length, 2);
  assert.ok(result.sends.some((s) => s.key === `nurture-contractor_owner-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-before-cutoff-601`));
  const sales = result.sends.find((s) => s.key.includes("-new-cohort-801"));
  assert.ok(sales);
  assert.equal(sales.payload.subject, metaSalesDailySeries.META_SALES_DAILY_STEPS[0].subject);
  assert.equal(sales.payload.from, "Ryan | The LeadFlow Pro <hello@theleadflowpro.com>");
  assert.equal(sales.payload.reply_to, "hello@theleadflowpro.com");
  assert.ok(String(sales.payload.html).includes("No login required."));
  assert.equal(String(sales.payload.html).includes("UNSUBSCRIBE_LINK"), false);
  assert.ok(String(sales.payload.text).includes("https://www.theleadflowpro.com/api/unsubscribe?lead=new-cohort&sig=fixture"));
  assert.equal(result.emails.some((r) => r.step === 700), false, "day 0 belongs to the existing welcome outbox");
});

test("an older pending campaign claim keeps its original payload and key after the future cutoff", async () => {
  const cutoff = Date.parse(metaSalesSeries.META_SALES_START);
  const now = cutoff + 2 * DAY;
  const lead: Row = { ...base, id: "old-claim", full_name: "Owner Example", email: "owner@example.com",
    created_at: new Date(cutoff).toISOString(), diagnostic: { form_id: "1001553739566746" } };
  const claim: Row = { id: "old-pending-101", lead_id: "old-claim", step: 101, delivery_status: "pending",
    sent_at: null, first_attempt_at: new Date(now - HOUR).toISOString(),
    last_attempt_at: new Date(now - 31 * 60_000).toISOString(), attempt_count: 1 };
  const result = await runRoute([lead], [claim], now);
  assert.equal(result.sends.length, 1);
  assert.equal(result.sends[0].key, `nurture-free_build-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-old-claim-101`);
  assert.equal(result.emails.some((r) => Number(r.step) >= 700), false);
});

test("new Meta sales submission rechecks revocation, sales exits and database failures", async () => {
  const cutoff = Date.parse(metaSalesSeries.META_SALES_START);
  const now = cutoff + DAY + HOUR;
  const lead = (): Row => ({ ...base, id: "race-exit", full_name: "Owner Example", email: "owner@example.com",
    created_at: new Date(cutoff).toISOString(), diagnostic: { form_id: "2084381329108926" } });
  const exits: (Row | "error")[] = [
    { marketing_email_consent: false }, { email_unsubscribed_at: new Date(now).toISOString() },
    { deleted_at: new Date(now).toISOString() }, { is_test: true },
    { status: "proposal" }, { status: "won" }, { status: "lost" }, "error",
  ];
  for (const exit of exits) {
    const result = await runRoute([lead()], [], now, "off", exit);
    assert.equal(result.sends.length, 0);
    const claim = result.emails.find((r) => r.step === 801);
    assert.equal(claim?.delivery_status, exit === "error" ? "pending" : "failed");
  }
});

test("new sales cohorts finish at day 30 and never start fresh sends on day 31", async () => {
  const cutoff = Date.parse(metaSalesSeries.META_SALES_START);
  const day30 = cutoff + 30 * DAY;
  const lead = (): Row => ({ ...base, id: "sales-last-day", full_name: "Owner Example", email: "owner@example.com",
    created_at: new Date(cutoff).toISOString(), diagnostic: { form_id: "2084381329108926" } });
  const history = (): Row[] => Array.from({ length: 8 }, (_, i) => ({
    id: `sales-${701 + i}`, lead_id: "sales-last-day", step: 701 + i, delivery_status: "sent",
    sent_at: new Date(day30 - 2 * DAY).toISOString(),
    first_attempt_at: new Date(day30 - 2 * DAY).toISOString(),
    last_attempt_at: new Date(day30 - 2 * DAY).toISOString(), attempt_count: 1,
  }));
  const last = await runRoute([lead()], history(), day30);
  assert.equal(last.sends.length, 1);
  assert.ok(last.sends[0].key.endsWith("-709"));
  const expired = await runRoute([lead()], history(), day30 + DAY);
  assert.equal(expired.sends.length, 0);
  const safeRetry: Row = { id: "pending-last", lead_id: "sales-last-day", step: 709, delivery_status: "pending",
    sent_at: null, first_attempt_at: new Date(day30 + 23 * HOUR).toISOString(),
    last_attempt_at: new Date(day30 + 23 * HOUR).toISOString(), attempt_count: 1 };
  const retry = await runRoute([lead()], [...history(), safeRetry], day30 + DAY);
  assert.equal(retry.sends.length, 1, "only the existing day-30 claim can retry inside 23 hours");
  assert.ok(retry.sends[0].key.endsWith("-709"));
});


test("native provider opt-outs hold old and new cohorts before claims and synchronize by exact lead ID", async () => {
  const now = Date.parse(metaSalesSeries.META_SALES_START) + DAY;
  const leads: Row[] = [
    { ...base, id: "native-old", email: " OLD@Example.com ", full_name: "Old Owner", created_at: "2026-10-01T12:00:00.000Z", diagnostic: { form_id: "2043120369669082" } },
    { ...base, id: "native-new", email: "new@example.com", full_name: "New Owner", created_at: metaSalesSeries.META_SALES_START, diagnostic: { form_id: "2084381329108926" } },
    { ...base, id: "clear-new", email: "clear@example.com", full_name: "Clear Owner", created_at: metaSalesSeries.META_SALES_START, diagnostic: { form_id: "2084381329108926" } },
    { ...base, id: "already-held", email: "old@example.com", full_name: "Held Owner", created_at: "2026-10-01T12:00:00.000Z", diagnostic: { form_id: "2043120369669082" }, email_unsubscribed_at: "2026-10-02T00:00:00.000Z" },
  ];
  const result = await runRoute(leads, [], now, "off", undefined, { emails: ["old@example.com", "new@example.com"] });
  assert.equal(result.status, 200);
  assert.equal(result.providerReads, 1);
  assert.equal(result.body.provider_opt_outs_held, 2);
  assert.equal(result.sends.length, 1);
  assert.deepEqual(Array.from(result.sends[0].payload.to as string[]), ["clear@example.com"]);
  assert.equal(result.emails.length, 1, "opted-out rows never acquire any claim");
  assert.equal(result.emails[0].lead_id, "clear-new");
  for (const lead of leads.slice(0, 2)) {
    assert.equal(lead.email_unsubscribed_at, new Date(now).toISOString());
    assert.equal(lead.marketing_email_consent, true, "do not reverse or invent consent");
  }
  assert.equal(leads[3].email_unsubscribed_at, "2026-10-02T00:00:00.000Z", "existing opt-out timestamp remains unchanged");
});

test("a provider opt-out read failure stops the complete batch before any claim or send", async () => {
  const now = Date.parse(metaSalesSeries.META_SALES_START) + DAY;
  const lead = { ...base, id: "read-failure", email: "fixture@example.com", full_name: "Fixture", created_at: metaSalesSeries.META_SALES_START, diagnostic: { form_id: "2084381329108926" } };
  const result = await runRoute([lead], [], now, "off", undefined, { failed: true });
  assert.equal(result.status, 503);
  assert.equal(result.providerReads, 1);
  assert.equal(result.body.sent, 0);
  assert.equal(result.sends.length, 0);
  assert.equal(result.emails.length, 0);
});

test("a failed CRM opt-out mirror still holds native opted-out recipients", async () => {
  const now = Date.parse(metaSalesSeries.META_SALES_START) + DAY;
  const lead = { ...base, id: "sync-failure", email: "fixture@example.com", full_name: "Fixture", created_at: metaSalesSeries.META_SALES_START, diagnostic: { form_id: "2084381329108926" } };
  const result = await runRoute([lead], [], now, "off", undefined, { emails: [lead.email], syncFails: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.provider_opt_outs_held, 1);
  assert.equal(result.body.provider_opt_out_sync_failed, 1);
  assert.equal(result.sends.length, 0);
  assert.equal(result.emails.length, 0);
  assert.equal(lead.email_unsubscribed_at, null);
});

function dailyLead(id: string, created = metaSalesSeries.META_SALES_START): Row {
  return { ...base, id, email: `${id}@example.com`, full_name: "Fixture Owner",
    created_at: created, diagnostic: { form_id: "2084381329108926" } };
}

function acceptedStep(id: string, step: number, at: number): Row {
  return { id: `${id}-${step}`, lead_id: id, step, delivery_status: "sent",
    sent_at: new Date(at).toISOString(), first_attempt_at: new Date(at).toISOString(),
    last_attempt_at: new Date(at).toISOString(), attempt_count: 1 };
}

test("daily calendar clock starts next local date inside the window without another welcome", async () => {
  const captured = "2026-10-08T23:30:00.000Z";
  const sameDate = await runRoute([dailyLead("daily-first", captured)], [], Date.parse("2026-10-09T04:59:00Z"));
  assert.equal(sameDate.sends.length, 0);
  assert.equal(sameDate.emails.length, 0);
  const held = await runRoute([dailyLead("daily-first", captured)], [], Date.parse("2026-10-09T11:59:59Z"), "7-20");
  assert.equal(held.sends.length, 0);
  assert.equal(held.body.held_for_window, 1);
  const morning = await runRoute([dailyLead("daily-first", captured)], [], Date.parse("2026-10-09T12:00:00Z"), "7-20");
  assert.equal(morning.sends.length, 1);
  assert.equal(morning.sends[0].key, `nurture-meta_sales_daily30_v1-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-daily-first-801`);
  assert.equal(morning.emails.some((row) => row.step === 800 || row.step === 700 || row.step === 0), false);
});

test("daily next morning tolerates latency while legacy contractor spacing stays exactly24h", async () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const last = Date.parse("2026-10-09T12:00:05Z");
  const legacy = dailyLead("legacy-contract", "2026-10-08T11:59:59.999Z");
  const result = await runRoute([dailyLead("daily-latency"), legacy], [
    acceptedStep("daily-latency", 801, last), acceptedStep("legacy-contract", 601, last),
  ], now, "7-20");
  assert.equal(result.sends.length, 1);
  assert.ok(result.sends[0].key.endsWith("-daily-latency-802"));
  assert.equal(result.body.throttled, 1);
  assert.equal(result.emails.some((row) => row.lead_id === "legacy-contract" && row.step === 602), false);
});

test("daily same-date acceptance blocks a second copy even after20h", async () => {
  const last = Date.parse("2026-10-10T05:01:00Z");
  const result = await runRoute([dailyLead("daily-same-date")], [acceptedStep("daily-same-date", 801, last)],
    Date.parse("2026-10-11T01:02:00Z"));
  assert.equal(result.sends.length, 0);
  assert.equal(result.body.throttled, 1);
  assert.equal(result.emails.length, 1);
});

test("a late daily first send continues once per next date after its20h safety floor", async () => {
  const lead = dailyLead("daily-late");
  const emails = [acceptedStep("daily-late", 801, Date.parse("2026-10-10T00:00:00Z"))];
  const early = await runRoute([lead], emails, Date.parse("2026-10-10T12:00:00Z"), "7-20");
  assert.equal(early.sends.length, 0);
  const safe = await runRoute([lead], emails, Date.parse("2026-10-10T20:00:00Z"), "7-20");
  assert.equal(safe.sends.length, 1);
  assert.ok(safe.sends[0].key.endsWith("-802"));
  const repeat = await runRoute([lead], emails, Date.parse("2026-10-10T21:00:00Z"), "7-20");
  assert.equal(repeat.sends.length, 0);
  const nextEarly = await runRoute([lead], emails, Date.parse("2026-10-11T12:00:00Z"), "7-20");
  assert.equal(nextEarly.sends.length, 0);
  const nextSafe = await runRoute([lead], emails, Date.parse("2026-10-11T16:00:00Z"), "7-20");
  assert.equal(nextSafe.sends.length, 1);
  assert.ok(nextSafe.sends[0].key.endsWith("-803"));
});

test("daily pending retries retain one claim/key and cannot advance into a catch-up burst", async () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  const claim: Row = { id: "daily-pending-801", lead_id: "daily-pending", step: 801,
    delivery_status: "pending", sent_at: null, first_attempt_at: new Date(now - HOUR).toISOString(),
    last_attempt_at: new Date(now - 31 * 60_000).toISOString(), attempt_count: 1 };
  const emails = [claim];
  const result = await runRoute([dailyLead("daily-pending")], emails, now);
  assert.equal(result.sends.length, 1);
  assert.equal(result.sends[0].key, `nurture-meta_sales_daily30_v1-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-daily-pending-801`);
  assert.equal(emails.length, 1);
  assert.equal(claim.attempt_count, 2);
  const repeat = await runRoute([dailyLead("daily-pending")], emails, now + 60_000);
  assert.equal(repeat.sends.length, 0);
  assert.equal(emails.length, 1);
});

test("daily final slot follows the local calendar through DST and fresh sends stop after day30", async () => {
  const day30 = Date.parse("2026-11-07T13:00:00Z");
  const history = () => Array.from({ length: 29 }, (_, i) => acceptedStep("daily-last", 801 + i, day30 - 25 * HOUR));
  const final = await runRoute([dailyLead("daily-last")], history(), day30, "7-20");
  assert.equal(final.sends.length, 1);
  assert.ok(final.sends[0].key.endsWith("-830"));
  const expired = await runRoute([dailyLead("daily-last")], history(), day30 + DAY, "7-20");
  assert.equal(expired.sends.length, 0);
  assert.equal(expired.emails.length, 29);
  const complete = await runRoute([dailyLead("daily-last")], final.emails, day30 + DAY, "7-20");
  assert.equal(complete.sends.length, 0);
  assert.equal(complete.emails.length, 30);
  const pending: Row = { id: "daily-last-pending", lead_id: "daily-last", step: 830,
    delivery_status: "pending", sent_at: null, first_attempt_at: "2026-11-07T23:00:00.000Z",
    last_attempt_at: "2026-11-07T23:00:00.000Z", attempt_count: 1 };
  const safeRetry = await runRoute([dailyLead("daily-last")], [...history(), pending], day30 + DAY, "7-20");
  assert.equal(safeRetry.sends.length, 1);
  assert.ok(safeRetry.sends[0].key.endsWith("-830"));
});

test("v1 claimed history stays on its immutable payload and24h spacing", async () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const recent = acceptedStep("v1-pinned", 701, now - DAY + 5_000);
  const held = await runRoute([dailyLead("v1-pinned")], [recent], now);
  assert.equal(held.sends.length, 0);
  assert.equal(held.body.throttled, 1);
  const old = acceptedStep("v1-pinned", 701, now - DAY);
  const result = await runRoute([dailyLead("v1-pinned")], [old], now);
  assert.equal(result.sends.length, 1);
  assert.ok(result.sends[0].key.endsWith("-v1-pinned-702"));
  assert.equal(result.sends[0].payload.subject, metaSalesSeries.META_SALES_STEPS[1].subject);
  assert.equal(result.emails.some((row) => Number(row.step) >= 801), false);
});

test("healthy daily sequence sends exactly one copy on all thirty local dates including DST", async () => {
  const lead = dailyLead("daily-complete");
  const emails: Row[] = [];
  const keys = new Set<string>();
  for (let day = 1; day <= 30; day++) {
    // DST ends Nov1 (programday24); 7AM Chicago moves from12UTC to13UTC.
    const now = Date.UTC(2026, 9, 8 + day, day >= 24 ? 13 : 12);
    const result = await runRoute([lead], emails, now + (day % 2 ? 5_000 : 0), "7-20");
    assert.equal(result.sends.length, 1, `one follow-up on local day${day}`);
    assert.ok(result.sends[0].key.endsWith(`-${800 + day}`));
    keys.add(result.sends[0].key);
    const second = await runRoute([lead], emails, now + HOUR, "7-20");
    assert.equal(second.sends.length, 0, `no second follow-up on local day${day}`);
    assert.equal(emails.length, day);
  }
  assert.equal(keys.size, 30);
  assert.deepEqual(emails.map((row) => row.step), Array.from({ length: 30 }, (_, i) => 801 + i));
  const after = await runRoute([lead], emails, Date.parse("2026-11-08T13:00:00Z"), "7-20");
  assert.equal(after.sends.length, 0);
  assert.equal(emails.length, 30);
});

const markerAt = "2026-10-08T18:00:00.000Z";
function migratedLead(id = "migrated", source = "meta_lead_ad"): Row {
  return { ...base, id, source, full_name: "Owner", email: `${id}@example.com`,
    created_at: "2026-01-01T00:00:00.000Z", diagnostic: {
      form_id: "1001553739566746", untouched: "keep",
      meta_daily30: metaDailyEnrollment.createMetaDailyEnrollment(markerAt, "123456789"),
    } };
}
function acceptedLegacy(id: string, at = "2026-10-08T12:00:05.000Z"): Row {
  return { id: "prior-row", lead_id: id, step: 105, delivery_status: "sent", sent_at: at,
    first_attempt_at: at, last_attempt_at: at, attempt_count: 1 };
}

test("explicit old-lead enrollment sends Day1 next Chicago date at7AM and preserves accepted legacy rows", async () => {
  for (const source of ["meta_lead_ad", "facebook-lead-ad", "website"]) {
    const lead = migratedLead(`migration-${source}`, source);
    const prior = acceptedLegacy(String(lead.id));
    const before = JSON.stringify(prior);
    const day0 = await runRoute([lead], [prior], Date.parse("2026-10-08T19:00:00Z"));
    assert.equal(day0.sends.length, 0);
    const result = await runRoute([lead], [prior], Date.parse("2026-10-09T12:00:00Z"));
    assert.equal(result.sends.length, 1);
    assert.equal(result.emails.at(-1)?.step, 801);
    assert.equal(JSON.stringify(prior), before, "accepted history remains byte-equivalent");
    assert.ok(JSON.stringify(result.sends[0].payload.tags).includes("meta_sales_daily30_v1"));
  }
});

test("marked first and later steps share any accepted legacy spacing floor and Chicago-date gate", async () => {
  const lead = migratedLead();
  const now = Date.parse("2026-10-09T12:00:00Z");
  const lateLegacy = acceptedLegacy(String(lead.id), "2026-10-09T00:00:00.000Z");
  const blocked = await runRoute([lead], [lateLegacy], now);
  assert.equal(blocked.sends.length, 0);
  assert.equal(blocked.body.throttled, 1);
  const accepted = await runRoute([lead], [lateLegacy], Date.parse("2026-10-09T20:00:00Z"));
  assert.equal(accepted.sends.length, 1);
  const again = await runRoute([lead], accepted.emails, Date.parse("2026-10-10T04:59:00Z"));
  assert.equal(again.sends.length, 0);
});

test("invalid markers, duplicate holds, workshop markers and unresolved legacy claims never fall back to old lanes", async () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  const valid = migratedLead();
  const diagnostic = valid.diagnostic as Row;
  const invalid = { ...valid, created_at: "2026-10-01T12:00:00.000Z", diagnostic: { ...diagnostic, meta_daily30: null } };
  const duplicate = { ...valid, diagnostic: { ...diagnostic, meta_daily30_duplicate_of: "canonical" } };
  const workshop = { ...valid, diagnostic: { ...diagnostic, form_id: "1749164796410610" } };
  for (const lead of [invalid, duplicate, workshop, { ...workshop, source: "website" }]) assert.equal((await runRoute([lead], [], now)).sends.length, 0);
  for (const delivery_status of ["pending", "failed"]) {
    const row = { ...acceptedLegacy(String(valid.id)), delivery_status };
    const result = await runRoute([valid], [row], now);
    assert.equal(result.sends.length, 0);
    assert.equal(result.emails.length, 1, "no daily claim and no old-row mutation");
    assert.equal(result.body.blocked, 1);
  }
});

test("legacy batch final-check detects enrollment or duplicate marker introduced after initial read", async () => {
  const now = Date.parse("2026-10-08T18:00:00Z");
  const lead = { ...migratedLead("race"), created_at: "2026-10-01T12:00:00.000Z", diagnostic: { form_id: "1001553739566746" } };
  for (const diagnostic of [migratedLead().diagnostic, { form_id: "1001553739566746", meta_daily30_duplicate_of: "canonical" }]) {
    const result = await runRoute([lead], [], now, "off", { diagnostic });
    assert.equal(result.sends.length, 0);
    assert.equal(result.body.blocked, 1);
    assert.equal(result.emails[0]?.delivery_status, "failed");
  }
});

test("marked daily permission/provider/status changes fail closed and day31 only retries immutable own pending claim", async () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  for (const finalLifecycle of [{ status: "call_booked" }, { status: "proposal" }, { status: "won" }, { status: "lost" }, { marketing_email_consent: false }, { email_unsubscribed_at: markerAt }, "error"] as const) {
    const result = await runRoute([migratedLead()], [], now, "off", finalLifecycle);
    assert.equal(result.sends.length, 0);
  }
  const held = await runRoute([migratedLead()], [], now, "off", undefined, { emails: ["migrated@example.com"] });
  assert.equal(held.sends.length, 0);
  assert.equal(held.emails.length, 0);
  const day31 = Date.parse("2026-11-08T13:00:00Z");
  assert.equal((await runRoute([migratedLead()], [], day31)).sends.length, 0);
  const pendingAt = new Date(day31 - HOUR).toISOString();
  const pending: Row = { id: "pending-day30", lead_id: "migrated", step: 830, delivery_status: "pending", sent_at: null, first_attempt_at: pendingAt, last_attempt_at: pendingAt, attempt_count: 1 };
  const retried = await runRoute([migratedLead()], [pending], day31);
  assert.equal(retried.sends.length, 1);
  assert.equal(retried.emails.length, 1);
  assert.equal(retried.sends[0].key, `nurture-meta_sales_daily30_v1-${nurtureDelivery.NURTURE_SEQUENCE_VERSION}-migrated-830`);
});


test("daily enrollment holds malformed accepted timestamps rather than guessing spacing", async () => {
  const lead = migratedLead();
  for (const sent_at of [null, "invalid", ""]) {
    const prior = { ...acceptedLegacy(String(lead.id)), sent_at };
    const result = await runRoute([lead], [prior], Date.parse("2026-10-09T12:00:00Z"));
    assert.equal(result.sends.length, 0);
    assert.equal(result.emails.length, 1);
    assert.equal(result.body.blocked, 1);
  }
});

test("complete paged ledger reads retain more than1000 prior claims and advance every lead at Day17", async () => {
  const leads = Array.from({ length: 30 }, (_, i) => migratedLead(`paged-${String(i).padStart(2, "0")}`));
  const emails: Row[] = [];
  for (const lead of leads) {
    for (let step = 101; step <= 130; step++) emails.push({ ...acceptedLegacy(String(lead.id)), id: `${lead.id}-legacy-${step}`, step });
    for (let step = 801; step <= 816; step++) {
      const at = "2026-10-24T12:00:05.000Z";
      emails.push({ ...acceptedLegacy(String(lead.id), at), id: `${lead.id}-daily-${step}`, step });
    }
  }
  assert.equal(emails.length, 1380);
  const result = await runRoute(leads, emails, Date.parse("2026-10-25T12:00:00Z"));
  assert.equal(result.sends.length, 30);
  assert.equal(result.emails.filter((row) => row.step === 817).length, 30);
  assert.equal(result.emails.length, 1410);
  assert.equal(result.body.failed, 0);
});

test("complete paged recipient reads include more than1000 eligible rows without dispatching expired daily slots", async () => {
  const leads = Array.from({ length: 1001 }, (_, i) => migratedLead(`recipient-${String(i).padStart(4, "0")}`));
  const result = await runRoute(leads, [], Date.parse("2026-11-08T13:00:00Z"));
  assert.equal(result.body.checked, 1001);
  assert.equal(result.sends.length, 0);
  assert.equal(result.emails.length, 0);
});

test("a failed or malformed later recipient/history page stops before any send or claim", async () => {
  const leads = Array.from({ length: 501 }, (_, i) => migratedLead(`partial-${String(i).padStart(4, "0")}`));
  const emails = Array.from({ length: 501 }, (_, i) => ({ ...acceptedLegacy(String(leads[Math.floor(i / 17)].id)), step: 101 + i % 17, id: `prior-${String(i).padStart(4, "0")}` }));
  for (const table of ["leads", "lead_emails"]) {
    for (const malformed of [false, true]) {
      const result = await runRoute(leads, emails.map((row) => ({ ...row })), Date.parse("2026-10-09T12:00:00Z"), "off", undefined,
        { queryFailure: { table, from: 500, malformed } });
      assert.equal(result.status, 500);
      assert.equal(result.sends.length, 0);
      assert.equal(result.emails.length, 501);
      assert.equal(result.emails.some((row) => row.step === 801), false);
      if (table === "leads") assert.equal(result.providerReads, 0);
    }
  }
});

test("valid-shaped but silently truncated pages fail closed against exact database counts", async () => {
  const leads = Array.from({ length: 501 }, (_, i) => migratedLead(`truncated-${String(i).padStart(4, "0")}`));
  const emails = Array.from({ length: 501 }, (_, i) => ({ ...acceptedLegacy(String(leads[Math.floor(i / 17)].id)), step: 101 + i % 17, id: `truncated-history-${String(i).padStart(4, "0")}` }));
  for (const table of ["leads", "lead_emails"]) {
    const result = await runRoute(leads, emails.map((row) => ({ ...row })), Date.parse("2026-10-09T12:00:00Z"), "off", undefined,
      { queryFailure: { table, from: 500, truncated: true } });
    assert.equal(result.status, 500);
    assert.equal(result.sends.length, 0);
    assert.equal(result.emails.length, 501);
  }
});

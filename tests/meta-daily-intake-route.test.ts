import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as guard from "../lib/metaCampaignGuard";
import * as enrollment from "../lib/metaDailyEnrollment";

const require = createRequire(import.meta.url);
const NOW = Date.parse("2026-10-08T18:10:00Z");
type Row = Record<string, unknown>;
const FORM = "2084381329108926";
const OWNER = guard.LEADFLOW_META.pageId;

function database(seed: Row[] = [], ledger: Row[] = [], casFails = false, emailChangedAtCAS = false) {
  const leads = seed.map(x => ({ ...x }));
  const emails = ledger.map(x => ({ ...x }));
  const activities: Row[] = [];
  let nextID = 0;
  function from(table: string) {
    const rows = table === "leads" ? leads : table === "lead_emails" ? emails : activities;
    const state = { op: "select", payload: null as Row | null, filters: [] as ((r: Row) => boolean)[], single: false, limit: Infinity };
    const q: Record<string, unknown> = {};
    Object.assign(q, {
      select: () => q,
      insert: (value: Row) => ((state.op = "insert"), (state.payload = value), q),
      update: (value: Row) => ((state.op = "update"), (state.payload = value), q),
      eq: (key: string, value: unknown) => (state.filters.push(r => key === "diagnostic" && typeof value === "string"
        ? JSON.stringify(r[key]) === value : r[key] === value), q),
      ilike: (key: string, value: string) => (state.filters.push(r => String(r[key] || "").toLowerCase() ===
        value.replace(/\\([\\%_])/g, "$1").toLowerCase()), q),
      is: (key: string, value: unknown) => (state.filters.push(r => (r[key] ?? null) === value), q),
      not: (key: string, _op: string, value: unknown) => (state.filters.push(r => r[key] !== value), q),
      in: (key: string, values: unknown[]) => (state.filters.push(r => values.includes(r[key])), q),
      or: (raw: string) => (state.filters.push(r => raw.split(",").some(part => {
        const [key, op, ...value] = part.split(".");
        if (key === "diagnostic->meta_daily30") return Boolean((r.diagnostic as Row | undefined)?.meta_daily30);
        if (op === "eq") return r[key] === value.join(".");
        return op === "ilike" && String(r[key] || "").toLowerCase().includes(value.join(".").replaceAll("%", "").toLowerCase());
      })), q),
      limit: (value: number) => ((state.limit = value), q),
      single: () => ((state.single = true), q),
      maybeSingle: () => ((state.single = true), q),
      then: (resolve: (result: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(() => {
        if (state.op === "update" && state.payload?.diagnostic && emailChangedAtCAS) {
          for (const row of rows) row.email = "staff-changed@example.com";
        }
        const matches = state.op === "update" && state.payload?.diagnostic && casFails ? [] : rows.filter(r => state.filters.every(f => f(r))).slice(0, state.limit);
        if (state.op === "insert") {
          if (table === "leads" && leads.some(r => r.external_id === state.payload?.external_id && state.payload?.external_id)) return { data: null, error: { code: "23505" } };
          const row = { id: `fixture-${++nextID}`, deleted_at: null, is_test: false, email_unsubscribed_at: null, status: "new", ...state.payload };
          rows.push(row); return { data: state.single ? row : [row], error: null };
        }
        if (state.op === "update") for (const row of matches) Object.assign(row, state.payload);
        return { data: state.single ? matches[0] ?? null : matches, error: null };
      }).then(resolve, reject),
    });
    return q;
  }
  return { db: { from }, leads, activities, emails };
}

function rawLead(id = "9001001", form = FORM, checked = false) {
  return { id, created_time: "2026-10-08T18:09:00+0000", form_id: form, field_data: [{ name: "full_name", values: ["Fixture Prospect"] },
    { name: "email", values: [`prospect-${id}@example.com`] }],
    custom_disclaimer_responses: [{ checkbox_key: "email_checkbox", is_checked: checked }] };
}

function fixture(options: { raw?: Row; seed?: Row[]; ledger?: Row[]; casFails?: boolean; emailChangedAtCAS?: boolean; providerOptOuts?: string[]; providerReadFails?: boolean; pages?: Row[]; syncThrows?: boolean; syncRetryAfter?: number; pollThrows?: boolean } = {}) {
  const db = database(options.seed, options.ledger, options.casFails, options.emailChangedAtCAS);
  const welcome: string[] = [], speed: string[] = [], contactSync: Row[] = [], alerts: Row[] = [], requested: URL[] = [];
  const logs: string[] = [];
  const raw = options.raw ?? rawLead();
  const code = ts.transpileModule(readFileSync(new URL("../app/api/meta-leads/route.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { GET: (r: Request) => Promise<Response>; POST: (r: Request) => Promise<Response> } };
  class Clock extends Date { constructor(value?: string | number) { super(value === undefined ? NOW : value); } static now() { return NOW; } }
  const fetcher = async (url: string) => {
    const u = new URL(url); requested.push(u);
    if (u.hostname === "api.resend.com") return new Response("", { status: 429, headers: { "retry-after": String(options.syncRetryAfter) } });
    if (u.pathname === `/v21.0/${OWNER}`) return Response.json({ access_token: "fixture-page-token" });
    if (u.pathname.endsWith("/leads")) {
      if (u.pathname === `/v21.0/${FORM}/leads` && options.pollThrows) throw new Error("fixture-private-transport-value");
      if (u.pathname === `/v21.0/${FORM}/leads` && options.pages) return Response.json(options.pages[u.searchParams.get("after") ? 1 : 0]);
      return Response.json({ data: [] });
    }
    if (u.pathname === `/v21.0/${raw.id}`) return Response.json(raw);
    throw new Error("Unexpected fixture network path");
  };
  const runner = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    Date: Clock, URL, AbortSignal, Buffer, fetch: fetcher,
    console: { error: (...x: unknown[]) => logs.push(x.join(" ")), warn() {}, info() {} },
    process: { env: { META_PAGE_ACCESS_TOKEN: "fixture-system", META_APP_SECRET: "fixture-secret", CRON_SECRET: "fixture-cron", SUPABASE_SERVICE_ROLE_KEY: "fixture-db", RESEND_API_KEY: "fixture-email" } },
  });
  runner((name: string) => {
    if (name === "next/server") return { NextResponse: class extends Response { static json(value: unknown, init?: ResponseInit) { return Response.json(value, init); } } };
    if (name === "@supabase/supabase-js") return { createClient: () => db.db };
    if (name === "@/lib/config") return { SUPABASE_URL: `https://${guard.LEADFLOW_META.supabaseProjectRef}.supabase.co`, SUPABASE_ANON_KEY: "fixture-anon" };
    if (name === "@/lib/metaCampaignGuard") return guard;
    if (name === "@/lib/metaDailyEnrollment") return enrollment;
    if (name === "@/lib/metaLeadAnswers") return { contractorFollowUp: () => null, metaAnswerLines: () => [] };
    if (name === "@/lib/leadNotify") return { sendInternalLeadAlert: async (value: Row) => { alerts.push(value); } };
    if (name === "@/lib/leadEmailNotifications") return { deliverLeadEmailNotificationsForLead: async (_db: unknown, id: string) => { welcome.push(id); } };
    if (name === "@/lib/speedToLeadAlertsServer") return { dispatchSpeedToLeadWithBudget: async (_db: unknown, id: string) => { speed.push(id); } };
    if (name === "@/lib/resendContacts") return { readResendContactOptOuts: async () => options.providerReadFails
      ? { ok: false } : { ok: true, emails: new Set(options.providerOptOuts ?? []) }, syncResendContacts: async (value: Row) => {
      contactSync.push(value); if (options.syncThrows) throw new Error("fixture-private-error");
      if (options.syncRetryAfter) await (value.fetcher as typeof fetch)("https://api.resend.com/contacts");
      return { ok: true, eligible: 1, created: 1, added_to_segment: 0, preserved_provider_opt_out: 0, failed: 0 };
    } };
    return require(name);
  }, loaded, loaded.exports);
  async function post(page: string = OWNER, badSignature = false) {
    const body = JSON.stringify({ entry: [{ id: page, changes: [{ field: "leadgen", value: { leadgen_id: raw.id } }] }] });
    const signature = createHmac("sha256", "fixture-secret").update(body).digest("hex");
    return loaded.exports.POST(new Request("https://example.com/api/meta-leads", { method: "POST", body, headers: { "x-hub-signature-256": `sha256=${badSignature ? "0".repeat(64) : signature}` } }));
  }
  return { ...db, welcome, speed, contactSync, alerts, requested, logs, post, get: () => loaded.exports.GET(new Request("https://example.com/api/meta-leads", { headers: { authorization: "Bearer fixture-cron" } })) };
}

test("owned consented webhook capture commits daily marker, synchronizes one contact and attempts one welcome", async () => {
  const f = fixture(); const response = await f.post(); assert.equal(response.status, 200);
  assert.equal((await response.json()).imported, 1); assert.equal(f.leads.length, 1);
  const diagnostic = f.leads[0].diagnostic as Row;
  const marker = enrollment.readMetaDailyEnrollment(diagnostic);
  assert.equal(marker?.enrolled_at, "2026-10-08T18:10:00.000Z"); assert.equal(marker?.meta_lead_id, "9001001");
  assert.equal(f.welcome.length, 1); assert.equal(f.speed.length, 1); assert.equal(f.contactSync.length, 1);
  assert.equal((f.contactSync[0].leads as Row[]).length, 1);
  assert.equal(f.contactSync[0].segmentId, "f500eae4-6d02-4825-9aad-24808610deef");
  assert.equal(f.contactSync[0].maxMutations, 2);
  await f.post(); assert.equal(f.leads.length, 1); assert.equal(f.welcome.length, 1); assert.equal(f.contactSync.length, 1);
});

test("unchecked checkbox lead is captured transactionally without daily enrollment or contact opt-in", async () => {
  const f = fixture({ raw: rawLead("9001002", "2043120369669082", false) }); await f.post();
  assert.equal(f.leads[0].marketing_email_consent, false);
  assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), false);
  assert.equal(f.contactSync.length, 0); assert.equal(f.welcome.length, 1);
});

test("checked single-box registered lead joins daily follow-up; workshop stays in its own purpose", async () => {
  const f = fixture({ raw: rawLead("9001003", "2043120369669082", true) }); await f.post();
  assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), true);
  const workshop = fixture({ raw: rawLead("9001004", "1749164796410610") }); await workshop.post();
  assert.equal(workshop.leads[0].marketing_email_consent, true);
  assert.equal(enrollment.hasMetaDailyEnrollment(workshop.leads[0].diagnostic), false);
});

test("unknown form, foreign Page, bad signature and missing deliverable email cannot enroll", async () => {
  const unknown = fixture({ raw: rawLead("9001005", "999999") }); await unknown.post(); assert.equal(unknown.leads.length, 0);
  const foreign = fixture(); await foreign.post("999999"); assert.equal(foreign.leads.length, 0);
  const bad = fixture(); assert.equal((await bad.post(OWNER, true)).status, 401); assert.equal(bad.leads.length, 0);
  const missing = rawLead("9001006"); missing.field_data = missing.field_data.filter(x => x.name !== "email");
  const noEmail = fixture({ raw: missing }); await noEmail.post(); assert.equal(enrollment.hasMetaDailyEnrollment(noEmail.leads[0].diagnostic), false); assert.equal(noEmail.contactSync.length, 0);
});

test("repeat submission preserves refusal, opt-out, enrollment clock and prior record without another welcome", async () => {
  const marker = enrollment.createMetaDailyEnrollment("2026-10-01T12:00:00Z", "8001001");
  const f = fixture({ seed: [{ id: "existing", email: "prospect-9001001@example.com", external_id: "meta:8001001", status: "lost", marketing_email_consent: false, email_unsubscribed_at: "2026-10-02T12:00:00Z", diagnostic: { meta_daily30: marker }, deleted_at: null, is_test: false }] });
  await f.post(); assert.equal(f.leads.length, 1); assert.equal(f.leads[0].status, "lost");
  assert.equal(f.leads[0].marketing_email_consent, false); assert.equal(f.leads[0].email_unsubscribed_at, "2026-10-02T12:00:00Z");
  assert.equal(enrollment.readMetaDailyEnrollment(f.leads[0].diagnostic)?.enrolled_at, "2026-10-01T12:00:00.000Z");
  assert.equal(f.welcome.length, 0); assert.equal(f.contactSync.length, 0); assert.equal(f.alerts.length, 1);
});

function existingProspect(overrides: Row = {}): Row {
  return { id: "existing", external_id: null, full_name: "Fixture Prospect", email: "prospect-9001001@example.com", source: "website",
    status: "contacted", marketing_email_consent: true, email_unsubscribed_at: null, deleted_at: null, is_test: false,
    diagnostic: { source: "free_build_funnel", answer: "preserve" }, ...overrides };
}

test("new verified Meta inquiry enrolls one eligible existing website prospect once without replaying its welcome or ledger", async () => {
  const ledger = [{ lead_id: "existing", step: 107, delivery_status: "sent" }];
  const f = fixture({ seed: [existingProspect()], ledger }); await f.post();
  assert.equal(f.leads.length, 1); assert.equal(f.welcome.length, 0); assert.equal(f.contactSync.length, 1);
  assert.equal(enrollment.readMetaDailyEnrollment(f.leads[0].diagnostic)?.enrolled_at, "2026-10-08T18:10:00.000Z");
  assert.equal((f.leads[0].diagnostic as Row).answer, "preserve");
  assert.deepEqual(f.emails, ledger); await f.post(); assert.equal(f.contactSync.length, 1);
});

test("existing refusal, CRM/native holds, false consent and ambiguous claims cannot be enrolled by a new form", async () => {
  for (const status of ["won", "proposal", "lost"]) {
    const f = fixture({ seed: [existingProspect({ status })] }); await f.post();
    assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), false); assert.equal(f.leads[0].status, status);
  }
  for (const overrides of [{ marketing_email_consent: false }, { email_unsubscribed_at: "2026-10-01T12:00:00Z" }, { diagnostic: { meta_daily30_duplicate_of: "another-canonical" } }]) {
    const f = fixture({ seed: [existingProspect(overrides)] }); await f.post(); assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), false);
  }
  for (const delivery_status of ["pending", "failed"]) {
    const f = fixture({ seed: [existingProspect()], ledger: [{ lead_id: "existing", step: 107, delivery_status }] });
    await f.post(); assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), false); assert.equal(f.contactSync.length, 0);
  }
  const optedOut = fixture({ seed: [existingProspect()], providerOptOuts: ["prospect-9001001@example.com"] }); await optedOut.post();
  assert.equal(enrollment.hasMetaDailyEnrollment(optedOut.leads[0].diagnostic), false); assert.equal(optedOut.contactSync.length, 0);
});

test("provider read or diagnostic CAS failure holds enrollment, and known unmarked match can retry safely", async () => {
  const options = { seed: [existingProspect()], providerReadFails: true };
  const f = fixture(options); await f.post(); assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), false);
  options.providerReadFails = false; await f.post(); assert.equal(enrollment.hasMetaDailyEnrollment(f.leads[0].diagnostic), true);
  assert.equal(f.welcome.length, 0); assert.equal(f.contactSync.length, 1);
  const race = fixture({ seed: [existingProspect()], casFails: true }); await race.post();
  assert.equal(enrollment.hasMetaDailyEnrollment(race.leads[0].diagnostic), false); assert.equal(race.contactSync.length, 0);
  const changedEmail = fixture({ seed: [existingProspect()], emailChangedAtCAS: true }); await changedEmail.post();
  assert.equal(enrollment.hasMetaDailyEnrollment(changedEmail.leads[0].diagnostic), false); assert.equal(changedEmail.contactSync.length, 0);
});

test("historical recovery poll and ambiguous duplicate rows do not silently migrate an old cohort", async () => {
  const oldRaw = rawLead(); oldRaw.created_time = "2026-09-08T18:09:00+0000";
  const old = fixture({ raw: oldRaw, seed: [existingProspect({ external_id: "meta:9001001" })] }); await old.post();
  assert.equal(enrollment.hasMetaDailyEnrollment(old.leads[0].diagnostic), false);
  const multiple = fixture({ seed: [existingProspect(), existingProspect({ id: "duplicate" })] }); await multiple.post();
  assert.equal(multiple.leads.some(x => enrollment.hasMetaDailyEnrollment(x.diagnostic)), false);
  const caseVariant = fixture({ seed: [existingProspect({ external_id: "meta:9001001" }),
    existingProspect({ id: "case-duplicate", email: "PROSPECT-9001001@EXAMPLE.COM" })] }); await caseVariant.post();
  assert.equal(caseVariant.leads.some(x => enrollment.hasMetaDailyEnrollment(x.diagnostic)), false);
});

test("recovery contact reconciliation includes trusted marked website aliases and rejects malformed marker aliases", async () => {
  const marker = enrollment.createMetaDailyEnrollment("2026-10-08T18:00:00Z", "9001001");
  const f = fixture({ seed: [existingProspect({ diagnostic: { meta_daily30: marker } }), existingProspect({ id: "malformed", email: "other@example.com", diagnostic: { meta_daily30: { invalid: true } } })] });
  assert.equal((await f.get()).status, 200); assert.equal(f.contactSync.length, 1);
  const leads = f.contactSync[0].leads as Row[]; assert.equal(leads.length, 1); assert.equal(leads[0].email, "prospect-9001001@example.com");
});

test("provider contact failure preserves captured lead and one transactional welcome for existing reconciliation retry", async () => {
  const f = fixture({ syncThrows: true }); assert.equal((await f.post()).status, 200);
  assert.equal(f.leads.length, 1); assert.equal(f.welcome.length, 1);
  assert.ok(f.logs.includes("Immediate Meta contact reconciliation deferred to the existing poll"));
  assert.equal(f.logs.some(x => x.includes("fixture-private-error")), false);
});

test("long provider rate-limit wait is deferred before it can hold the webhook beyond its deadline", async () => {
  const f = fixture({ syncRetryAfter: 60 }); assert.equal((await f.post()).status, 200);
  assert.equal(f.leads.length, 1); assert.equal(f.welcome.length, 1);
  assert.ok(f.logs.includes("Immediate Meta contact reconciliation deferred to the existing poll"));
});

test("poll follows Graph cursor pages on the pinned form instead of opaque next URLs", async () => {
  const a = rawLead("9002001"), b = rawLead("9002002");
  const f = fixture({ pages: [{ data: [a], paging: { next: "https://untrusted.example/never-fetch?private=token", cursors: { after: "cursor-two" } } }, { data: [b] }] });
  const response = await f.get(); assert.equal(response.status, 200); const result = await response.json();
  assert.equal(result.seen, 2); assert.equal(result.imported, 2); assert.equal(result.incomplete_forms, 0);
  assert.equal(f.leads.length, 2); assert.equal(f.welcome.length, 2);
  assert.ok(f.requested.some(x => x.pathname === `/v21.0/${FORM}/leads` && x.searchParams.get("after") === "cursor-two"));
  assert.equal(f.requested.some(x => x.hostname !== "graph.facebook.com"), false);
});

test("cyclic or malformed pagination reports incomplete recovery instead of false success", async () => {
  const f = fixture({ pages: [{ data: [], paging: { next: "unused", cursors: { after: "cycle" } } }, { data: [], paging: { next: "unused", cursors: { after: "cycle" } } }] });
  const response = await f.get(); assert.equal(response.status, 503);
  assert.equal((await response.json()).incomplete_forms, 1); assert.equal(f.leads.length, 0);
  const malformed = fixture({ pages: [{ data: "not-an-array" }] }); assert.equal((await malformed.get()).status, 503);
  const network = fixture({ pollThrows: true }); assert.equal((await network.get()).status, 503);
  assert.equal(network.logs.some(x => x.includes("fixture-private-transport-value")), false);
});

test("public website intake strips enrollment and duplicate holds while preserving ordinary diagnostic answers", async () => {
  const db = database(), code = ts.transpileModule(readFileSync(new URL("../app/api/leads/route.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { POST: (r: Request) => Promise<Response> } };
  const runner = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { console: { error() {} }, process: { env: { SUPABASE_SERVICE_ROLE_KEY: "fixture-db" } } });
  runner((name: string) => {
    if (name === "next/server") return { NextResponse: { json: Response.json } };
    if (name === "@supabase/supabase-js") return { createClient: () => db.db };
    if (name === "@/lib/config") return { SUPABASE_URL: `https://${guard.LEADFLOW_META.supabaseProjectRef}.supabase.co` };
    if (name === "@/lib/metaCampaignGuard") return guard;
    if (name === "@/lib/metaDailyEnrollment") return enrollment;
    if (name === "@/lib/leadNotify") return { INTEREST_LABELS: { unsure: "Not sure" } };
    if (name === "@/lib/leadEmailNotifications") return { deliverLeadEmailNotificationsForLead: async () => {} };
    if (name === "@/lib/speedToLeadAlertsServer") return { dispatchSpeedToLeadWithBudget: async () => {} };
    if (name === "@/lib/analytics/server") return { recordServerEvent: async () => {} };
    return require(name);
  }, loaded, loaded.exports);
  const response = await loaded.exports.POST(new Request("https://example.com/api/leads", { method: "POST", body: JSON.stringify({
    full_name: "Fixture Website Prospect", email: "website@example.com", marketing_email_consent: false,
    diagnostic: { source: "package_page", answer: "ordinary answer", meta_daily30: enrollment.createMetaDailyEnrollment("2026-10-08T18:00:00Z", "9003001"), meta_daily30_duplicate_of: "forged-uuid" },
  }) }));
  assert.equal(response.status, 200); const diagnostic = db.leads[0].diagnostic as Row;
  assert.equal(diagnostic.source, "package_page"); assert.equal(diagnostic.answer, "ordinary answer");
  assert.equal(diagnostic.notification_pipeline, "lead_intake_v1");
  assert.equal(enrollment.hasMetaDailyEnrollment(diagnostic), false); assert.equal(enrollment.hasMetaDailyDuplicateHold(diagnostic), false);
  assert.equal(db.leads[0].marketing_email_consent, false);
});

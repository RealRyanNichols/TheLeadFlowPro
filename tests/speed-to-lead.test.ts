import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as quoModule from "../lib/quo.ts";
import * as leadNotifyModule from "../lib/leadNotify.ts";
import * as businessModule from "../lib/site/business.ts";
import * as smsPolicyModule from "../lib/smsPolicy.ts";
import * as speed from "../lib/speedToLead.ts";
import { SUPABASE_URL } from "../lib/config.ts";

// Synthetic data only. Every phone number is a 555-01xx fiction, every
// provider call is answered by a mocked fetch, and nothing here can reach
// Quo, Resend or the database.

const require = createRequire(import.meta.url);
const SITE = "https://www.theleadflowpro.com";
// 2:14 PM Central daylight time on Tuesday, September 22, 2026.
const NOW = new Date("2026-09-22T19:14:00.000Z");
// 11:30 PM Central the same night.
const NIGHT = new Date("2026-09-23T04:30:00.000Z");
const STAFF = "+1 903 555 0199, 9035550198";
const LEAD_PHONE = "(903) 555-0142";
const LEAD_ID = "11111111-2222-4333-8444-555555555555";

function leadRow(overrides: Partial<speed.SpeedToLeadLead> = {}): speed.SpeedToLeadLead {
  return {
    id: LEAD_ID,
    created_at: new Date(NOW.getTime() - 60_000).toISOString(),
    full_name: "Jane Owner",
    business_name: "Example Roofing",
    email: "jane.owner@example.com",
    phone: LEAD_PHONE,
    interest: "website_launch",
    status: "new",
    source: "meta_lead_ad",
    utm_source: "facebook",
    sms_consent: true,
    sms_unsubscribed_at: null,
    is_test: false,
    deleted_at: null,
    goals: "what kind of business: roofing",
    current_platform: "Facebook page",
    timeline: "This month",
    funnel: "free_build_funnel",
    ...overrides,
  };
}

// ------------------------------------------------------------- builders ---

test("the staff text is three short lines: source and time, first name and interest, the one link", () => {
  const text = speed.staffAlertText(leadRow(), SITE, NOW);
  assert.equal(
    text,
    [
      "NEW LEAD | Meta lead ad | 2:13 PM CT",
      "Jane at Example Roofing. Website Launch.",
      `Open: ${SITE}/admin/sales/leads/${LEAD_ID}`,
    ].join("\n"),
  );
  // No phone, no email, no last name on a lock screen.
  assert.ok(!text.includes("0142") && !text.includes("(903)"));
  assert.ok(!text.includes("@"));
  assert.ok(!text.includes("Owner"));
  // An older lead carries its date; a made-up name reads as no name.
  const older = speed.staffAlertText(leadRow({ created_at: "2026-09-21T04:58:00.000Z", full_name: "Facebook lead", business_name: null }), SITE, NOW);
  assert.match(older, /^NEW LEAD \| Meta lead ad \| Sep 20, 11:58 PM CT\nNo name given\. Website Launch\./);
  const texter = speed.staffAlertText(leadRow({ full_name: "Unknown (903) 555-0142", source: "quo_inbound", business_name: null, interest: "unsure" }), SITE, NOW);
  assert.match(texter, /^NEW LEAD \| Texted or called in \| 2:13 PM CT\nNo name given\. Not sure yet\.\n/);
  assert.ok(!texter.includes("0142"));
});

test("the staff text stays under 320 characters with every field at its longest", () => {
  const worst = speed.staffAlertText(
    leadRow({
      full_name: "Bartholomew-Alexandrianus Jones",
      business_name: "A".repeat(300),
      source: "some_extremely_long_import_source_name_that_goes_on_and_on",
      interest: "an_interest_value_nobody_has_labelled_yet_and_is_long",
    }),
    SITE,
    NOW,
  );
  assert.ok(worst.length < 320, `${worst.length} characters`);
  assert.ok(worst.endsWith(`Open: ${SITE}/admin/sales/leads/${LEAD_ID}`), "the link is never cut off");
  assert.ok(!/[–—]/.test(worst), "no dashes that are not on a keyboard");
});

test("the staff email mirrors the owner alert: who, how to reach them, what they said, when, and the one link", () => {
  const email = speed.staffAlertEmail(leadRow({ source: "stripe_checkout", utm_source: null }), SITE);
  assert.equal(email.subject, "NEW LEAD [stripe checkout]: Jane Owner (Example Roofing)");
  for (const line of [
    "New lead from stripe checkout, Tue, Sep 22, 2:13 PM CT.",
    "Name: Jane Owner",
    "Business: Example Roofing",
    "Email: jane.owner@example.com",
    `Phone: ${LEAD_PHONE}`,
    "Texting: consented",
    "Recommended path: Website Launch",
    "Home base: Facebook page",
    "Timeline: This month",
    "Source: stripe_checkout",
    "what kind of business: roofing",
    `Open: ${SITE}/admin/sales/leads/${LEAD_ID}`,
  ]) {
    assert.ok(email.text.split("\n").includes(line), line);
  }
  // A text-in lead: no email to show, and what they wrote stands in for goals.
  const texter = speed.staffAlertEmail(
    leadRow({ email: "quo+9035550142@unknown.invalid", goals: null, source: "quo_inbound", sms_consent: false }),
    SITE,
    { firstMessage: "How much for a new roof page?" },
  );
  assert.ok(texter.text.includes("Email: - (none given)"));
  assert.ok(texter.text.includes("Texting: no text consent"));
  assert.ok(texter.text.includes("What they told me:\nHow much for a new roof page?"));
  assert.equal(speed.staffEmailIdempotencyKey(LEAD_ID), `speed-to-lead-${LEAD_ID}-staff_email-v1`);
});

test("the first text: one qualifying question, /services, the opt-out, plain characters, two segments at most", () => {
  const names = [
    "Jane Owner",
    "christopherabcdefghij Longname",
    "Mary-Kate O'Neil",
    "José Álvarez",
    "李 雷",
    "Facebook lead",
    "Unknown (903) 555-0142",
    "",
    "   ",
    "Dr. Smith",
    "a".repeat(80),
  ];
  for (const full_name of names) {
    for (const funnel of [null, "free_consultation", "free_build_funnel"]) {
      const text = speed.leadFirstText({ full_name, funnel });
      assert.equal((text.match(/\?/g) ?? []).length, 1, `one question: ${text}`);
      assert.ok(text.includes("See what we build: theleadflowpro.com/services"), text);
      assert.ok(text.endsWith("Reply STOP to opt out."), text);
      assert.ok(!/[–—]/.test(text), `no em or en dash: ${text}`);
      assert.ok(speed.smsSegments(text) <= 2, `${speed.smsSegments(text)} segments: ${text}`);
      assert.ok(text.length <= 306, `${text.length} characters`);
      assert.equal(leadNotifyModule.isAutomatedLeadText(text), true, "the call sheet sees it as software");
    }
  }
  assert.ok(speed.leadFirstText({ full_name: "jane owner" }).startsWith("Jane, this is Ryan with The LeadFlow Pro. Got your request. Quick question"));
  assert.ok(speed.leadFirstText({ full_name: "José Álvarez" }).startsWith("Hi, this is Ryan"), "a name outside plain GSM would triple the cost");
  assert.ok(speed.leadFirstText({ full_name: "Facebook lead" }).startsWith("Hi, this is Ryan"));
  assert.ok(speed.leadFirstText({ full_name: "Sam", funnel: "free_consultation" }).includes("Got your free consultation request."));
  // The segment counter itself.
  assert.equal(speed.smsSegments("a".repeat(160)), 1);
  assert.equal(speed.smsSegments("a".repeat(161)), 2);
  assert.equal(speed.smsSegments("a".repeat(306)), 2);
  assert.equal(speed.smsSegments("a".repeat(307)), 3);
  assert.equal(speed.smsSegments(`${"a".repeat(69)}—`), 1);
  assert.equal(speed.smsSegments(`${"a".repeat(70)}—`), 2);
});

// ------------------------------------------------------------ decisions ---

const decide = (overrides: Partial<speed.SpeedToLeadDecisionInput> & { channel: speed.SpeedToLeadChannel }) =>
  speed.decideSpeedToLeadJob({
    lead: leadRow(),
    now: NOW,
    staffPhones: speed.parseStaffPhones(STAFF),
    killSwitchOn: false,
    ...overrides,
  });

test("master switch, kill switch and staff phones are read exactly, never guessed", () => {
  assert.equal(speed.speedToLeadEnabled({}), false);
  assert.equal(speed.speedToLeadEnabled({ SPEED_TO_LEAD_ENABLED: "TRUE" }), false);
  assert.equal(speed.speedToLeadEnabled({ SPEED_TO_LEAD_ENABLED: "1" }), false);
  assert.equal(speed.speedToLeadEnabled({ SPEED_TO_LEAD_ENABLED: "true" }), true);
  assert.equal(speed.smsKillSwitchOn({}), true);
  assert.equal(speed.smsKillSwitchOn({ QUO_OUTBOUND_SMS_DISABLED: "no" }), true);
  assert.equal(speed.smsKillSwitchOn({ QUO_OUTBOUND_SMS_DISABLED: "false" }), false);
  assert.deepEqual(speed.parseStaffPhones(STAFF), ["9035550199", "9035550198"]);
  assert.deepEqual(speed.parseStaffPhones("+19035550199;903-555-0199\n12345, +44 20 7946 0000"), ["9035550199"]);
  assert.deepEqual(speed.parseStaffPhones(""), []);
  assert.deepEqual(speed.parseStaffPhones(undefined), []);
  assert.equal(speed.isStaffPhone("(903) 555-0198", ["9035550198"]), true);
  assert.equal(speed.isStaffPhone("+1 903 555 0142", ["9035550198"]), false);
  assert.equal(speed.isStaffPhone(null, ["9035550198"]), false);
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(speed.speedToLeadRetryDelayMinutes), [1, 5, 15, 60, 60, 60]);
  assert.equal(speed.SPEED_TO_LEAD_MAX_ATTEMPTS, 5);
});

test("test, deleted and staff-number records never send anything", () => {
  for (const channel of speed.SPEED_TO_LEAD_CHANNELS) {
    assert.deepEqual(decide({ channel, lead: leadRow({ is_test: true }) }), { kind: "skip", reason: "test record" });
    assert.deepEqual(decide({ channel, lead: leadRow({ deleted_at: NOW.toISOString() }) }), { kind: "skip", reason: "lead deleted" });
    assert.deepEqual(decide({ channel, lead: null }), { kind: "skip", reason: "lead not found" });
    assert.deepEqual(decide({ channel, lead: leadRow({ phone: "+19035550198", source: "quo_inbound" }) }), { kind: "staff_number" });
  }
});

test("switching on never blasts a backlog: staff alerts go stale at 2 hours, first texts at 14", () => {
  const at = (hours: number) => leadRow({ created_at: new Date(NOW.getTime() - hours * 3_600_000).toISOString() });
  assert.deepEqual(decide({ channel: "staff_sms", lead: at(1.9) }), { kind: "send" });
  assert.deepEqual(decide({ channel: "staff_sms", lead: at(2.1) }), { kind: "skip", reason: "stale" });
  assert.deepEqual(decide({ channel: "staff_email", lead: at(2.1) }), { kind: "skip", reason: "stale" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: at(13.9) }), { kind: "send" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: at(14.1) }), { kind: "skip", reason: "stale" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ created_at: "not a date" }) }), { kind: "skip", reason: "stale" });
});

test("staff texts need staff phones and the kill switch off, and are not held for quiet hours", () => {
  assert.deepEqual(decide({ channel: "staff_sms", staffPhones: [] }), { kind: "skip", reason: "no staff phones configured" });
  assert.deepEqual(decide({ channel: "staff_sms", killSwitchOn: true }), { kind: "skip", reason: "sms kill switch on" });
  const late = leadRow({ created_at: new Date(NIGHT.getTime() - 60_000).toISOString() });
  assert.deepEqual(decide({ channel: "staff_sms", lead: late, now: NIGHT }), { kind: "send" });
  assert.deepEqual(decide({ channel: "staff_email", lead: late, now: NIGHT, killSwitchOn: true }), { kind: "send" });
});

test("the first text needs a phone, consent, no STOP and the kill switch off; at night it waits for 8 am", () => {
  assert.deepEqual(decide({ channel: "lead_sms" }), { kind: "send" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ phone: null }) }), { kind: "skip", reason: "no phone" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ sms_consent: false }) }), { kind: "skip", reason: "no sms consent" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ sms_consent: null }) }), { kind: "skip", reason: "no sms consent" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ sms_unsubscribed_at: NOW.toISOString() }) }), { kind: "skip", reason: "replied STOP" });
  assert.deepEqual(decide({ channel: "lead_sms", killSwitchOn: true }), { kind: "skip", reason: "sms kill switch on" });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ source: "quo_inbound" }) }), {
    kind: "skip",
    reason: "texted in first; the inbound auto-reply answers",
  });
  assert.deepEqual(decide({ channel: "lead_sms", lead: leadRow({ status: "won" }) }), { kind: "skip", reason: "lead already won" });
  const late = leadRow({ created_at: new Date(NIGHT.getTime() - 60_000).toISOString() });
  const held = decide({ channel: "lead_sms", lead: late, now: NIGHT });
  assert.equal(held.kind, "hold");
  if (held.kind === "hold") {
    assert.equal(held.until.toISOString(), "2026-09-23T13:00:00.000Z", "8:00 am Central the next morning");
    assert.equal(held.reason, "quiet hours");
  }
});

test("a refused text is final only when retrying cannot change it", () => {
  const refusal = (reason: Extract<quoModule.QuoSendResult, { ok: false }>["reason"]) => ({ ok: false as const, reason, detail: reason });
  assert.deepEqual(speed.outcomeForQuoRefusal(refusal("kill_switch"), "lead_sms"), { kind: "skip", reason: "sms kill switch on" });
  assert.deepEqual(speed.outcomeForQuoRefusal(refusal("suppressed"), "lead_sms"), { kind: "skip", reason: "replied STOP" });
  assert.deepEqual(speed.outcomeForQuoRefusal(refusal("suppressed"), "staff_sms"), { kind: "skip", reason: "staff number on STOP list" });
  assert.deepEqual(speed.outcomeForQuoRefusal(refusal("invalid_phone"), "lead_sms"), { kind: "skip", reason: "phone number is not textable" });
  assert.deepEqual(speed.outcomeForQuoRefusal(refusal("quiet_hours"), "lead_sms"), { kind: "hold" });
  for (const reason of ["provider_error", "not_configured", "from_number_not_allowed", "user_id_not_allowed"] as const) {
    assert.deepEqual(speed.outcomeForQuoRefusal(refusal(reason), "lead_sms"), { kind: "retry" }, reason);
  }
  assert.equal(speed.speedToLeadActivityDetail("lead_sms", "sent"), "Speed to lead: first text sent");
  assert.equal(speed.speedToLeadActivityDetail("staff_sms", "failed", "Quo returned HTTP 500"), "Speed to lead: staff text failed: Quo returned HTTP 500");
  assert.ok(speed.speedToLeadActivityDetail("staff_email", "failed", "x".repeat(5000)).length <= 1000);
});

// ---------------------------------------------------- providers (mocked) ---

type Providers = {
  quo: { to: string; content: string }[];
  emails: { key: string | null; body: { from: string; to: string[]; subject: string; text: string } }[];
  stopLookups: string[];
};

const PROVIDER_ENV = {
  QUO_OUTBOUND_SMS_DISABLED: "false",
  QUO_FROM_NUMBER: "+19035008898",
  QUO_USER_ID: "",
  QUO_LEADFLOW_USER_ID: "",
  QUO_API_KEY: "quo-test-key-not-real",
  SUPABASE_SERVICE_ROLE_KEY: "service-test-key-not-real",
  RESEND_API_KEY: "re_test_key_not_real",
  SPEED_TO_LEAD_ENABLED: "true",
  SPEED_TO_LEAD_STAFF_PHONES: STAFF,
};

function withEnv(t: TestContext, vars: Record<string, string | undefined>) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function mockProviders(
  t: TestContext,
  options: { quoStatus?: (to: string) => number; suppressed?: string[]; resendStatus?: number } = {},
): Providers {
  const seen: Providers = { quo: [], emails: [], stopLookups: [] };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === "https://api.openphone.com/v1/messages") {
      const body = JSON.parse(String(init?.body)) as { to: string[]; content: string };
      seen.quo.push({ to: body.to[0], content: body.content });
      const status = options.quoStatus?.(body.to[0]) ?? 202;
      return status < 300
        ? new Response(JSON.stringify({ data: { id: `msg_${seen.quo.length}` } }), { status, headers: { "content-type": "application/json" } })
        : new Response("provider down", { status });
    }
    if (url.startsWith(`${SUPABASE_URL}/rest/v1/sms_suppressions`)) {
      const norm = String(new URL(url).searchParams.get("phone_norm") ?? "").replace(/^eq\./, "");
      seen.stopLookups.push(norm);
      const rows = options.suppressed?.includes(norm) ? [{ phone_norm: norm }] : [];
      return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url === "https://api.resend.com/emails") {
      seen.emails.push({ key: new Headers(init?.headers).get("Idempotency-Key"), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ id: `email_${seen.emails.length}` }), { status: options.resendStatus ?? 200 });
    }
    throw new Error(`unexpected network call in a test: ${url}`);
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  return seen;
}

/** Collects every console line so a test can prove no lead details were logged. */
function captureConsole(t: TestContext): string[] {
  const lines: string[] = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  for (const method of ["log", "warn", "error"] as const) {
    console[method] = (...args: unknown[]) => {
      lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
  }
  t.after(() => Object.assign(console, original));
  return lines;
}

/** The real sender reads the real clock for quiet hours; pin it. */
function pinClock(t: TestContext, at: Date) {
  t.mock.timers.enable({ apis: ["Date"], now: at.getTime() });
}

test("sendLeadTextDetailed says why: kill switch, STOP, quiet hours, provider error, or the message id", async (t) => {
  withEnv(t, PROVIDER_ENV);
  captureConsole(t);
  const seen = mockProviders(t, { suppressed: ["9035550150"], quoStatus: (to) => (to === "+19035550160" ? 500 : 202) });
  pinClock(t, NOW);
  assert.deepEqual(await quoModule.sendLeadTextDetailed("903-555-0142", "hello"), { ok: true, providerMessageId: "msg_1" });
  assert.equal(await quoModule.sendLeadText("903-555-0143", "hello"), true);
  const stopped = await quoModule.sendLeadTextDetailed("903-555-0150", "hello");
  assert.equal(stopped.ok === false && stopped.reason, "suppressed");
  const failed = await quoModule.sendLeadTextDetailed("903-555-0160", "hello");
  assert.equal(failed.ok === false && failed.reason, "provider_error");
  assert.match(failed.ok === false ? failed.detail : "", /Quo returned HTTP 500/);
  assert.equal((await quoModule.sendLeadTextDetailed("12", "hello")).ok, false);
  assert.equal(seen.quo.length, 3, "STOP and a bad number never reach the provider");

  t.mock.timers.setTime(NIGHT.getTime());
  const night = await quoModule.sendLeadTextDetailed("903-555-0142", "hello");
  assert.equal(night.ok === false && night.reason, "quiet_hours");
  // Staff alerts are internal: no quiet hours, but STOP still wins.
  assert.equal((await quoModule.sendStaffAlertText("+19035550199", "NEW LEAD")).ok, true);
  const staffStop = await quoModule.sendStaffAlertText("903-555-0150", "NEW LEAD");
  assert.equal(staffStop.ok === false && staffStop.reason, "suppressed");
  assert.equal(seen.quo.length, 4);

  process.env.QUO_OUTBOUND_SMS_DISABLED = "true";
  for (const result of [await quoModule.sendLeadTextDetailed("903-555-0142", "x"), await quoModule.sendStaffAlertText("+19035550199", "x")]) {
    assert.equal(result.ok === false && result.reason, "kill_switch");
  }
  assert.equal(seen.quo.length, 4, "the kill switch stops both senders before the provider");
});

// ----------------------------------------------- dispatcher on a fake DB ---

type Row = Record<string, unknown>;
type DbError = { code: string; message: string };
type DbResult = { data: unknown; error: DbError | null };

class FakeDb {
  tables: Record<string, Row[]> = { speed_to_lead_jobs: [], leads: [], lead_activity: [], lead_messages: [] };
  reads = 0;
  failures: { table: string; op: string }[] = [];
  seq = 0;
  from(table: string) {
    return new FakeQuery(this, table);
  }
  jobs(leadId = LEAD_ID) {
    return Object.fromEntries(this.tables.speed_to_lead_jobs.filter((j) => j.lead_id === leadId).map((j) => [String(j.channel), j]));
  }
  activity() {
    return this.tables.lead_activity.map((a) => String(a.detail));
  }
}

class FakeQuery {
  db: FakeDb;
  table: string;
  op = "select";
  values: Row | Row[] | null = null;
  filters: ((row: Row) => boolean)[] = [];
  returning = false;
  sorts: [string, boolean][] = [];
  max: number | null = null;
  offset = 0;
  upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  constructor(db: FakeDb, table: string) {
    this.db = db;
    this.table = table;
  }
  select() {
    if (this.op !== "select") this.returning = true;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.values = values;
    return this;
  }
  insert(values: Row | Row[]) {
    this.op = "insert";
    this.values = values;
    return this;
  }
  upsert(values: Row, options: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = "upsert";
    this.values = values;
    this.upsertOptions = options;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  lte(column: string, value: string) {
    this.filters.push((row) => row[column] != null && Date.parse(String(row[column])) <= Date.parse(value));
    return this;
  }
  lt(column: string, value: string) {
    this.filters.push((row) => row[column] != null && Date.parse(String(row[column])) < Date.parse(value));
    return this;
  }
  ilike(column: string, pattern: string) {
    const re = new RegExp(`^${pattern.split("%").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "is");
    this.filters.push((row) => re.test(String(row[column] ?? "")));
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.sorts.push([column, options?.ascending !== false]);
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    return this.run("maybe");
  }
  single() {
    return this.run("single");
  }
  then<T>(resolve: (value: DbResult) => T, reject?: (reason: unknown) => T) {
    return this.run(null).then(resolve, reject);
  }
  async run(mode: "maybe" | "single" | null): Promise<DbResult> {
    // Yield like a network round trip, so concurrent workers interleave.
    await new Promise((resolve) => setImmediate(resolve));
    if (this.op === "select") this.db.reads += 1;
    const failure = this.db.failures.findIndex((f) => f.table === this.table && f.op === this.op);
    if (failure >= 0) {
      this.db.failures.splice(failure, 1);
      return { data: null, error: { code: "XX000", message: `injected ${this.op} failure` } };
    }
    const rows = (this.db.tables[this.table] ??= []);
    const shape = (list: Row[]): DbResult => {
      if (mode === "maybe") return list.length > 1 ? { data: null, error: { code: "PGRST116", message: "many" } } : { data: list[0] ?? null, error: null };
      if (mode === "single") return list.length === 1 ? { data: list[0], error: null } : { data: null, error: { code: "PGRST116", message: "not one" } };
      return { data: list, error: null };
    };
    if (this.op === "insert" || this.op === "upsert") {
      const out: Row[] = [];
      for (const value of Array.isArray(this.values) ? this.values : [this.values as Row]) {
        const key = this.upsertOptions.onConflict;
        if (this.op === "upsert" && key && value[key] != null && rows.some((r) => r[key] === value[key])) continue;
        const row = { id: `${this.table}-${++this.db.seq}`, created_at: new Date(0).toISOString(), ...value };
        rows.push(row);
        out.push({ ...row });
      }
      return this.returning ? shape(out) : { data: null, error: null };
    }
    const matched = rows.filter((row) => this.filters.every((f) => f(row)));
    if (this.op === "update") {
      for (const row of matched) Object.assign(row, this.values);
      return this.returning ? shape(matched.map((r) => ({ ...r }))) : { data: null, error: null };
    }
    let list = matched.map((r) => ({ ...r }));
    for (const [column, ascending] of [...this.sorts].reverse()) {
      list = list.sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : String(a[column]) > String(b[column]) ? 1 : 0) * (ascending ? 1 : -1));
    }
    list = list.slice(this.offset, this.max === null ? undefined : this.offset + this.max);
    return shape(list);
  }
}

/** What the insert trigger writes: three jobs, due at once. */
function seed(db: FakeDb, lead: speed.SpeedToLeadLead, statuses: Partial<Record<speed.SpeedToLeadChannel, [string, string?]>> = {}) {
  db.tables.leads.push({ ...lead });
  for (const channel of speed.SPEED_TO_LEAD_CHANNELS) {
    const [status, skip] = statuses[channel] ?? ["pending"];
    db.tables.speed_to_lead_jobs.push({
      id: `${lead.id}-${channel}`,
      lead_id: lead.id,
      channel,
      status,
      attempt_count: 0,
      next_attempt_at: lead.created_at,
      last_attempt_at: null,
      sent_at: null,
      provider_message_ids: [],
      skip_reason: skip ?? null,
      last_error: null,
      created_at: lead.created_at,
      updated_at: lead.created_at,
    });
  }
}

type Dispatcher = {
  dispatchSpeedToLeadForLead: (db: FakeDb, leadId: string, options?: { now?: () => Date }) => Promise<Record<string, number | boolean>>;
  sweepSpeedToLeadJobs: (db: FakeDb, limit?: number, options?: { now?: () => Date }) => Promise<Record<string, number | boolean>>;
  dispatchSpeedToLeadWithBudget: (db: FakeDb, leadId: string, budgetMs?: number) => Promise<void>;
};

function loadTs(file: string, modules: Record<string, unknown>) {
  const code = ts.transpileModule(readFileSync(join(process.cwd(), file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} as Record<string, unknown> };
  const evaluate = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    process,
    console,
    setTimeout,
    clearTimeout,
    setImmediate,
  });
  evaluate((name: string) => (name in modules ? modules[name] : require(name)), loaded, loaded.exports);
  return loaded.exports;
}

// The dispatcher is "server-only"; load the real source with that one import stubbed.
const dispatcher = loadTs("lib/speedToLeadServer.ts", {
  "server-only": {},
  "@/lib/quo": quoModule,
  "@/lib/leadNotify": leadNotifyModule,
  "@/lib/site/business": businessModule,
  "@/lib/smsPolicy": smsPolicyModule,
  "@/lib/speedToLead": speed,
}) as unknown as Dispatcher;

const at = (d: Date) => () => d;
const plus = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

test("dormant: with the switch off nothing is read, sent or changed", async (t) => {
  withEnv(t, { ...PROVIDER_ENV, SPEED_TO_LEAD_ENABLED: undefined });
  const seen = mockProviders(t);
  const db = new FakeDb();
  seed(db, leadRow());
  assert.equal((await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) })).enabled, false);
  assert.equal((await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(NOW) })).enabled, false);
  await dispatcher.dispatchSpeedToLeadWithBudget(db, LEAD_ID);
  assert.equal(db.reads, 0);
  assert.deepEqual(seen, { quo: [], emails: [], stopLookups: [] });
  assert.ok(Object.values(db.jobs()).every((j) => j.status === "pending" && j.attempt_count === 0));
});

test("a new Meta lead: both staff phones get the alert, the lead gets one first text, every outcome is logged", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NOW);
  const logs = captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  // The owner-alert outbox already emails a Meta lead, so the trigger skipped this one.
  seed(db, leadRow(), { staff_email: ["skipped", "owner alert outbox"] });

  const summary = await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
  assert.equal(summary.sent, 2);

  const staffTexts = seen.quo.filter((m) => m.to !== "+19035550142");
  assert.deepEqual(staffTexts.map((m) => m.to).sort(), ["+19035550198", "+19035550199"]);
  assert.equal(staffTexts[0].content, speed.staffAlertText(leadRow(), SITE, NOW));
  const leadTexts = seen.quo.filter((m) => m.to === "+19035550142");
  assert.equal(leadTexts.length, 1, "exactly one first text");
  assert.equal(leadTexts[0].content, speed.leadFirstText(leadRow()));
  assert.equal(seen.emails.length, 0);
  assert.ok(seen.stopLookups.includes("9035550142"), "the global STOP list was checked for the lead");

  const jobs = db.jobs();
  assert.equal(jobs.staff_sms.status, "sent");
  assert.equal(jobs.staff_sms.attempt_count, 1);
  assert.equal((jobs.staff_sms.provider_message_ids as string[]).length, 2);
  assert.equal(jobs.lead_sms.status, "sent");
  assert.ok(jobs.lead_sms.sent_at);
  assert.equal(jobs.staff_email.status, "skipped");
  assert.equal(jobs.staff_email.skip_reason, "owner alert outbox");
  assert.deepEqual(db.activity().sort(), ["Speed to lead: first text sent", "Speed to lead: staff text sent"]);
  for (const a of db.tables.lead_activity) assert.equal(a.kind, "system");
  // The first text is on the lead's thread with the provider id the Quo echo will carry.
  assert.equal(db.tables.lead_messages.length, 1);
  assert.equal(db.tables.lead_messages[0].direction, "out");
  assert.equal(db.tables.lead_messages[0].body, speed.leadFirstText(leadRow()));
  assert.equal(db.tables.lead_messages[0].provider_id, (jobs.lead_sms.provider_message_ids as string[])[0]);

  // Running again sends nothing: every job is finished.
  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(plus(2)) });
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(plus(2)) });
  assert.equal(seen.quo.length, 3);
  const joined = logs.join("\n");
  for (const secret of ["555-0142", "9035550142", "jane.owner@example.com", "Jane", "Owner", "Quick question"]) {
    assert.ok(!joined.includes(secret), `console never carries ${secret}`);
  }
});

test("the route dispatch and the cron racing on the same lead send each message once", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NOW);
  captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  seed(db, leadRow({ source: "website", utm_source: null }));
  await Promise.all([
    dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) }),
    dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(NOW) }),
    dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) }),
  ]);
  assert.equal(seen.quo.filter((m) => m.to === "+19035550142").length, 1);
  assert.equal(seen.quo.filter((m) => m.to !== "+19035550142").length, 2);
  assert.equal(seen.emails.length, 1);
  assert.equal(db.activity().length, 3);
  assert.ok(Object.values(db.jobs()).every((j) => j.status === "sent" && j.attempt_count === 1));
});

test("the NEW LEAD email for a door the owner alert does not cover: both inboxes, stable key, what they texted", async (t) => {
  withEnv(t, { ...PROVIDER_ENV, SPEED_TO_LEAD_STAFF_PHONES: "" });
  captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  const texter = leadRow({
    full_name: "Unknown (903) 555-0142",
    email: "quo+9035550142@unknown.invalid",
    source: "quo_inbound",
    utm_source: null,
    goals: null,
    business_name: null,
    interest: "unsure",
    funnel: null,
  });
  seed(db, texter);
  db.tables.lead_messages.push({ id: "m1", lead_id: LEAD_ID, direction: "in", body: "Do you build websites for roofers?", created_at: texter.created_at });
  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
  assert.equal(seen.emails.length, 1);
  const email = seen.emails[0];
  assert.equal(email.key, `speed-to-lead-${LEAD_ID}-staff_email-v1`);
  assert.deepEqual(email.body.to, ["hello@theleadflowpro.com", "pat@theleadflowpro.com"]);
  assert.equal(email.body.from, "The LeadFlow Pro <leadflow@theleadflowpro.com>");
  assert.equal(email.body.subject, "NEW LEAD [Texted or called in]: Unknown (903) 555-0142");
  assert.ok(email.body.text.includes("What they told me:\nDo you build websites for roofers?"));
  assert.ok(email.body.text.includes(`Open: ${SITE}/admin/sales/leads/${LEAD_ID}`));
  const jobs = db.jobs();
  assert.equal(jobs.staff_email.status, "sent");
  assert.deepEqual([...(jobs.staff_email.provider_message_ids as string[])], ["email_1"]);
  assert.equal(jobs.staff_sms.skip_reason, "no staff phones configured");
  assert.equal(jobs.lead_sms.skip_reason, "texted in first; the inbound auto-reply answers");
  assert.equal(seen.quo.length, 0);
  assert.equal(jobs.staff_sms.attempt_count, 0, "a decision not to send is not an attempt");
});

test("consent, STOP and the kill switch each skip the first text with the reason on the job", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NOW);
  captureConsole(t);
  const seen = mockProviders(t, { suppressed: ["9035550150"] });
  const cases: [Partial<speed.SpeedToLeadLead>, string][] = [
    [{ sms_consent: false }, "no sms consent"],
    [{ sms_unsubscribed_at: NOW.toISOString() }, "replied STOP"],
    [{ phone: null }, "no phone"],
    [{ phone: "903-555-0150" }, "replied STOP"], // on the global STOP list, found by the sender
    [{ status: "won" }, "lead already won"],
  ];
  for (const [overrides, reason] of cases) {
    const db = new FakeDb();
    seed(db, leadRow(overrides), { staff_sms: ["sent"], staff_email: ["sent"] });
    await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
    assert.equal(db.jobs().lead_sms.status, "skipped", reason);
    assert.equal(db.jobs().lead_sms.skip_reason, reason);
    assert.equal(db.tables.lead_messages.length, 0);
  }
  assert.equal(seen.quo.length, 0, "no case reached the provider");

  process.env.QUO_OUTBOUND_SMS_DISABLED = "true";
  const db = new FakeDb();
  seed(db, leadRow({ source: "website" }));
  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
  assert.equal(db.jobs().lead_sms.skip_reason, "sms kill switch on");
  assert.equal(db.jobs().staff_sms.skip_reason, "sms kill switch on");
  assert.equal(db.jobs().staff_email.status, "sent", "the email is not an SMS and still goes");
  assert.equal(seen.quo.length, 0);
});

test("after 9 pm the first text waits for 8 am and then goes; staff are alerted at once", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NIGHT);
  captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  seed(db, leadRow({ created_at: new Date(NIGHT.getTime() - 30_000).toISOString() }), { staff_email: ["skipped", "owner alert outbox"] });
  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NIGHT) });
  assert.equal(db.jobs().staff_sms.status, "sent");
  assert.equal(db.jobs().lead_sms.status, "pending");
  assert.equal(db.jobs().lead_sms.attempt_count, 0);
  assert.equal(db.jobs().lead_sms.next_attempt_at, "2026-09-23T13:00:00.000Z");
  assert.equal(seen.quo.filter((m) => m.to === "+19035550142").length, 0);

  // The sweep at 7:59 am leaves it; at 8:00 it goes.
  const early = new Date("2026-09-23T12:59:00.000Z");
  const eight = new Date("2026-09-23T13:00:30.000Z");
  assert.equal((await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(early) })).checked, 0);
  t.mock.timers.setTime(eight.getTime());
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(eight) });
  assert.equal(db.jobs().lead_sms.status, "sent");
  assert.equal(seen.quo.filter((m) => m.to === "+19035550142").length, 1);
});

test("a provider failure retries at 1, 5, 15 and 60 minutes, then fails for good with one activity line", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NOW);
  captureConsole(t);
  const seen = mockProviders(t, { quoStatus: (to) => (to === "+19035550142" ? 500 : 202) });
  const db = new FakeDb();
  seed(db, leadRow(), { staff_sms: ["sent"], staff_email: ["sent"] });

  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
  let job = db.jobs().lead_sms;
  assert.equal(job.status, "pending");
  assert.equal(job.attempt_count, 1);
  assert.equal(job.next_attempt_at, plus(1).toISOString());
  assert.match(String(job.last_error), /Quo returned HTTP 500/);
  assert.equal(db.activity().length, 0, "a retry is on the job row, not in the history");

  assert.equal((await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(plus(0.5)) })).checked, 0, "not before it is due");
  let clock = 0;
  for (const [attempt, wait] of [[2, 1], [3, 5], [4, 15]] as const) {
    clock += wait;
    await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(plus(clock)) });
    job = db.jobs().lead_sms;
    assert.equal(job.attempt_count, attempt);
    assert.equal(job.status, "pending");
    assert.equal(job.next_attempt_at, plus(clock + speed.speedToLeadRetryDelayMinutes(attempt)).toISOString());
  }
  clock += 60;
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(plus(clock)) });
  job = db.jobs().lead_sms;
  assert.equal(job.status, "failed");
  assert.equal(job.attempt_count, 5);
  assert.deepEqual(db.activity(), ["Speed to lead: first text failed: Quo returned HTTP 500: provider down"]);
  assert.equal(seen.quo.length, 5);
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(plus(clock + 120)) });
  assert.equal(seen.quo.length, 5, "a failed job is never retried again");
});

test("an email provider failure and a database hiccup are retried, not lost", async (t) => {
  withEnv(t, { ...PROVIDER_ENV, SPEED_TO_LEAD_STAFF_PHONES: "" });
  captureConsole(t);
  const seen = mockProviders(t, { resendStatus: 503 });
  const db = new FakeDb();
  seed(db, leadRow({ source: "operator_academy_free_access", sms_consent: false }));
  db.failures.push({ table: "leads", op: "select" });
  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
  // The lead read failed for the first job to ask; the cache shares that failure within the run.
  const afterHiccup = Object.values(db.jobs()).filter((j) => j.status === "pending");
  assert.ok(afterHiccup.every((j) => /lead lookup failed/.test(String(j.last_error))));
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(plus(2)) });
  const email = db.jobs().staff_email;
  assert.equal(email.status, "pending");
  assert.match(String(email.last_error), /Resend returned HTTP 503/);
  assert.ok(seen.emails.length >= 1);
  assert.ok(seen.emails.every((e) => e.key === `speed-to-lead-${LEAD_ID}-staff_email-v1`), "every retry reuses the provider key");
});

test("a job stuck mid-send is reclaimed after five minutes, and a first text already on the thread is not sent twice", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NOW);
  captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  seed(db, leadRow(), { staff_sms: ["sent"], staff_email: ["sent"] });
  Object.assign(db.jobs().lead_sms, { status: "sending", attempt_count: 1, last_attempt_at: new Date(NOW.getTime() - 2 * 60_000).toISOString() });
  db.tables.lead_messages.push({ id: "echo", lead_id: LEAD_ID, direction: "out", body: speed.leadFirstText(leadRow()), provider_id: "msg_from_quo_echo" });

  assert.equal((await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(NOW) })).checked, 0, "inside its lease it is left alone");
  const later = new Date(NOW.getTime() + 4 * 60_000);
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(later) });
  const job = db.jobs().lead_sms;
  assert.equal(job.status, "sent");
  assert.deepEqual([...(job.provider_message_ids as string[])], ["msg_from_quo_echo"]);
  assert.match(String(job.last_error), /not sent again/);
  assert.equal(seen.quo.length, 0);
});

test("our own alert to a staff cell comes back as a lead: it is marked test and nothing alerts about it", async (t) => {
  withEnv(t, PROVIDER_ENV);
  captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  seed(db, leadRow({ phone: "+19035550199", source: "quo_inbound", full_name: "Unknown (903) 555-0199", sms_consent: false }));
  await dispatcher.dispatchSpeedToLeadForLead(db, LEAD_ID, { now: at(NOW) });
  assert.equal(db.tables.leads[0].is_test, true);
  assert.ok(Object.values(db.jobs()).every((j) => j.status === "skipped" && j.skip_reason === "staff number"));
  assert.equal(db.activity().length, 1);
  assert.match(db.activity()[0], /staff phone/);
  assert.deepEqual(seen.quo, []);
  assert.deepEqual(seen.emails, []);
});

test("stale jobs from before the switch was turned on are skipped, not sent", async (t) => {
  withEnv(t, PROVIDER_ENV);
  pinClock(t, NOW);
  captureConsole(t);
  const seen = mockProviders(t);
  const db = new FakeDb();
  const old = "22222222-2222-4333-8444-555555555555";
  seed(db, leadRow({ created_at: new Date(NOW.getTime() - 3 * 3_600_000).toISOString() }));
  seed(db, leadRow({ id: old, created_at: new Date(NOW.getTime() - 20 * 3_600_000).toISOString(), phone: "903-555-0144" }));
  await dispatcher.sweepSpeedToLeadJobs(db, 25, { now: at(NOW) });
  assert.equal(db.jobs().staff_sms.skip_reason, "stale");
  assert.equal(db.jobs().staff_email.skip_reason, "stale");
  assert.equal(db.jobs().lead_sms.status, "sent", "three hours old is still inside the 14-hour first-text window");
  assert.ok(Object.values(db.jobs(old)).every((j) => j.skip_reason === "stale"));
  assert.equal(seen.quo.length, 1);
});

test("the route budget never throws and never waits past its limit", async (t) => {
  withEnv(t, PROVIDER_ENV);
  captureConsole(t);
  const slow = {
    from() {
      return { select: () => ({ eq: () => ({ in: () => new Promise(() => {}) }) }) };
    },
  };
  const started = Date.now();
  await dispatcher.dispatchSpeedToLeadWithBudget(slow as unknown as FakeDb, LEAD_ID, 50);
  assert.ok(Date.now() - started < 2_000);
  const broken = {
    from() {
      throw new Error("database unreachable");
    },
  };
  await dispatcher.dispatchSpeedToLeadWithBudget(broken as unknown as FakeDb, LEAD_ID, 50);
});

// ------------------------------------------------------------------ cron ---

test("the cron fails closed without the secret, does nothing while dormant, and sweeps 25 when on", async (t) => {
  const calls: number[] = [];
  let summary: Record<string, number | boolean> = { enabled: true, checked: 0, failed: 0, errors: 0 };
  const route = loadTs("app/api/cron/speed-to-lead/route.ts", {
    "@/lib/config": { SUPABASE_URL: "https://hpzpwfymwfgwspaixrxi.supabase.co" },
    "@/lib/metaCampaignGuard": { leadFlowSupabaseRuntimeIssues: () => [] },
    "@/lib/speedToLead": speed,
    "@/lib/speedToLeadServer": {
      sweepSpeedToLeadJobs: async (_db: unknown, limit: number) => {
        calls.push(limit);
        return summary;
      },
    },
    "@supabase/supabase-js": { createClient: () => ({}) },
  }) as { GET: (r: Request) => Promise<Response>; maxDuration: number; runtime: string };
  const call = (auth?: string) =>
    route.GET(new Request("https://www.theleadflowpro.com/api/cron/speed-to-lead", { headers: auth ? { authorization: auth } : {} }));

  withEnv(t, { CRON_SECRET: undefined, SPEED_TO_LEAD_ENABLED: "true", SUPABASE_SERVICE_ROLE_KEY: "service-test-key-not-real" });
  assert.equal((await call("Bearer anything")).status, 401);
  process.env.CRON_SECRET = "cron-test-secret";
  assert.equal((await call()).status, 401);
  assert.equal((await call("Bearer wrong")).status, 401);
  assert.equal(calls.length, 0);

  process.env.SPEED_TO_LEAD_ENABLED = "false";
  const dormant = await call("Bearer cron-test-secret");
  assert.equal(dormant.status, 200);
  assert.match(JSON.stringify(await dormant.json()), /SPEED_TO_LEAD_ENABLED is not true/);
  assert.equal(calls.length, 0);

  process.env.SPEED_TO_LEAD_ENABLED = "true";
  assert.equal((await call("Bearer cron-test-secret")).status, 200);
  assert.deepEqual(calls, [25]);
  summary = { enabled: true, checked: 1, failed: 1, errors: 0 };
  assert.equal((await call("Bearer cron-test-secret")).status, 500, "a job that failed for good shows in the cron log");
  assert.equal(route.maxDuration, 60);
  assert.equal(route.runtime, "nodejs");

  const crons = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };
  assert.deepEqual(crons.crons.find((c) => c.path === "/api/cron/speed-to-lead"), { path: "/api/cron/speed-to-lead", schedule: "* * * * *" });
  const env = readFileSync(join(process.cwd(), ".env.example"), "utf8");
  assert.match(env, /^SPEED_TO_LEAD_ENABLED="false"$/m);
  assert.match(env, /^SPEED_TO_LEAD_STAFF_PHONES=""$/m);
  assert.match(env, /QUO_OUTBOUND_SMS_DISABLED="false"/);
});

// ------------------------------------------------------------- migration ---

test("the trigger can never block a lead, never backfills, and dedupes one job per channel", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260922190000_speed_to_lead.sql"), "utf8");
  const body = sql.slice(sql.indexOf("create or replace function public.enqueue_speed_to_lead_jobs()"), sql.indexOf("comment on function"));
  assert.match(sql, /create table if not exists public\.speed_to_lead_jobs/);
  assert.match(sql, /lead_id uuid not null references public\.leads\(id\) on delete cascade/);
  assert.match(sql, /channel in \('staff_sms', 'staff_email', 'lead_sms'\)/);
  assert.match(sql, /status in \('pending', 'sending', 'sent', 'failed', 'skipped'\)/);
  assert.match(sql, /provider_message_ids text\[\] not null default '\{\}'/);
  assert.match(sql, /char_length\(last_error\) <= 1000/);
  assert.match(sql, /unique \(lead_id, channel\)/);
  assert.match(sql, /on public\.speed_to_lead_jobs \(status, next_attempt_at\)/);
  assert.match(sql, /alter table public\.speed_to_lead_jobs enable row level security/);
  assert.match(sql, /revoke all on table public\.speed_to_lead_jobs from public, anon, authenticated/);
  assert.match(sql, /grant select on table public\.speed_to_lead_jobs to authenticated/);
  assert.match(sql, /\(select public\.is_admin\(\)\)\s+or \(select public\.can_access_sales_pipeline\(\)\)/);
  assert.doesNotMatch(sql, /to anon/i);
  assert.match(body, /security definer\s+set search_path = public/);
  // The whole body sits in one exception block, and NEW always comes back.
  assert.match(body, /begin\s+begin[\s\S]+exception when others then\s+(--[^\n]*\n\s*)*raise warning[\s\S]+end;\s+return new;\s+end;\s+\$\$;/);
  assert.equal((body.match(/return new/g) ?? []).length, 1, "a single exit, after the exception block");
  assert.equal((body.match(/on conflict \(lead_id, channel\) do nothing/g) ?? []).length, 7);
  // Doors with their own alert email get the staff text only; a diagnostic
  // draft (created before the form is submitted) never gets a first text.
  assert.match(body, /'stripe_checkout', 'stripe_payment_link', 'lead_follow_up_funnel'[\s\S]+'time_back_funnel'[\s\S]+'door sends its own alert'/);
  assert.match(body, /like 'business-diagnostic:%'[\s\S]+'diagnostic draft'/);
  assert.match(body, /coalesce\(new\.is_test, false\)[\s\S]+'test record'/);
  assert.match(body, /new\.deleted_at is not null/);
  assert.match(body, /request\.jwt\.claim\.role[\s\S]+'service_role'[\s\S]+notification_pipeline[\s\S]+'lead_intake_v1'/);
  assert.match(body, /'owner alert outbox'/);
  assert.match(sql, /create trigger speed_to_lead_enqueue_after_insert\s+after insert on public\.leads\s+for each row execute function public\.enqueue_speed_to_lead_jobs\(\)/);
  assert.doesNotMatch(sql, /insert into public\.speed_to_lead_jobs[\s\S]+select[\s\S]+from public\.leads/i);
  // Rollback is written down, commented out.
  assert.match(sql, /--\s+drop trigger if exists speed_to_lead_enqueue_after_insert on public\.leads;/);
  assert.match(sql, /--\s+drop function if exists public\.enqueue_speed_to_lead_jobs\(\);/);
  assert.match(sql, /--\s+drop table if exists public\.speed_to_lead_jobs;/);
});

// ---------------------------------------------------------------- wiring ---

test("every intake route dispatches speed to lead with the service client, inside its budget, and texts nobody itself", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
  for (const file of ["app/api/leads/route.ts", "app/api/meta-leads/route.ts", "app/api/quo-inbound/route.ts"]) {
    const source = read(file);
    assert.match(source, /dispatchSpeedToLeadWithBudget\(supabase, (leadId|data\.id)\)/, file);
    assert.ok(!source.includes("notifyNewLeadSms"), file);
    assert.ok(!source.includes("sendLeadText"), file);
  }
  const meta = read("app/api/meta-leads/route.ts");
  assert.ok(!meta.includes("async function smsSuppressed"), "the global STOP check in the sender replaces the Meta-only copy");
  const inbound = read("app/api/quo-inbound/route.ts");
  // One NEW LEAD email for a text-in: speed to lead when it is on, the old alert only while it is off.
  assert.match(inbound, /if \(speedToLeadEnabled\(process\.env\)\) \{[\s\S]+dispatchSpeedToLeadWithBudget\(supabase, leadId\);\s+\} else \{[\s\S]+sendInternalLeadAlert\(/);
  const server = read("lib/speedToLeadServer.ts");
  assert.match(server, /^import "server-only";/);
  assert.match(server, /\.eq\("status", "pending"\)\.lte\("next_attempt_at", claimAt\)/, "claims are compare-and-swap");
  assert.match(server, /\.eq\("attempt_count", job\.attempt_count\)/);
  assert.match(server, /SPEED_TO_LEAD_ROUTE_BUDGET_MS = 8_000/);
  assert.ok(!/console\.(log|warn|error)\([^)]*\b(body|content|phone|email)\b/.test(server), "no message body or contact detail in a log call");
  const notify = read("lib/leadNotify.ts");
  assert.match(notify, /export async function notifyNewLeadSms\(_lead: NotifiableLead\): Promise<void> \{\s+return;\s+\}/);
});

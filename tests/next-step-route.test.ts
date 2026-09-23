// The Call Closer's write route, run for real against a fake Supabase.
//
// The route file is transpiled and evaluated in a fresh vm context, the same
// way tests/lead-message-route.test.ts does it. Its imports are handed in by
// name, so an import this test does not expect fails loudly. The clock is
// pinned to SAMPLE_NOW (Tue, Sep 22, 2026 at 10:00 AM Central) and fetch
// throws, so a route that tried to reach the network would fail here.
//
// The fake client keeps small in-memory tables and applies the filters the
// route actually sends (eq, is, in, gte, ilike, order, limit). A route that
// forgot `.is("deleted_at", null)` or anchored its Ref search wrong would
// get the wrong rows back, not a friendly stub.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as authorModule from "../lib/leadMessageAuthor.ts";
import * as callCloserModule from "../lib/callCloser.ts";
import * as businessTimeModule from "../lib/businessTime.ts";
import { formatCentral } from "../lib/businessTime.ts";
import { CALL_OUTCOMES, refMarker, type CallOutcome } from "../lib/callCloser.ts";
import { SAMPLE_CALL_LEAD, SAMPLE_NOW } from "../lib/callCloserFixtures.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { EXTERNAL_LINKS } from "../lib/site/external-links.ts";

const require = createRequire(import.meta.url);
const ROUTE = "app/api/admin/leads/[id]/next-step/route.ts";
const source = readFileSync(ROUTE, "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const LEAD_ID = "5b8f2c9e-1d4a-4e6b-9c3f-7a2d1e0b4c6a";
const OTHER_LEAD_ID = "8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const KEY = "0f6d7c1a-2b3e-4f5a-8b9c-1d2e3f4a5b6c";
const OTHER_KEY = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
const NOW_ISO = SAMPLE_NOW.toISOString();
const STAFF = { id: "staff-pat", email: "pat@example.test" };
const PROFILE_NAME = "Patrick Grabbs";
const ALLOWED_PATCH_KEYS = ["status", "last_contacted_at", "next_follow_up_at", "lost_reason"];

// ------------------------------------------------------------ fake db --

type Row = Record<string, unknown>;
type Op = { name: string; args: unknown[] };
type Action = "select" | "insert" | "update";
type Call = { table: string; action: Action | null; ops: Op[]; executed: boolean };
type Tables = Record<"profiles" | "leads" | "lead_notes" | "lead_tasks" | "lead_activity", Row[]>;

type Options = {
  signedIn?: boolean;
  role?: string | null;
  profileName?: string | null;
  id?: string;
  body?: unknown;
  lead?: Row | null;
  /** "<table>.<action>" pairs that answer with an error, e.g. "lead_notes.insert". */
  fail?: string[];
  /** Row level security refuses the lead update: zero rows, no error. */
  rlsBlocksLeadUpdate?: boolean;
  /** "<table>.<action>" pairs whose request throws (a dropped connection), e.g. "lead_activity.insert". */
  throwOn?: string[];
  /** Seed rows, newest first where order matters. */
  activity?: Row[];
  notes?: Row[];
  tasks?: Row[];
};

function leadRow(overrides: Row = {}): Row {
  return {
    id: LEAD_ID,
    full_name: SAMPLE_CALL_LEAD.full_name,
    business_name: SAMPLE_CALL_LEAD.business_name,
    status: "new",
    interest: SAMPLE_CALL_LEAD.interest,
    phone: SAMPLE_CALL_LEAD.phone,
    email: SAMPLE_CALL_LEAD.email,
    sms_consent: SAMPLE_CALL_LEAD.sms_consent,
    sms_unsubscribed_at: null,
    next_follow_up_at: SAMPLE_CALL_LEAD.next_follow_up_at,
    diagnostic: SAMPLE_CALL_LEAD.diagnostic,
    deleted_at: null,
    ...overrides,
  };
}

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, "is");
}

/** Applies the filters the route sent, in the order it sent them. */
function applyFilters(rows: Row[], ops: Op[]): Row[] {
  let out = rows.slice();
  for (const op of ops) {
    const [col, val] = op.args as [string, unknown];
    if (op.name === "eq") out = out.filter((r) => r[col] === val);
    else if (op.name === "is") out = out.filter((r) => (r[col] ?? null) === val);
    else if (op.name === "in") out = out.filter((r) => (val as unknown[]).includes(r[col]));
    else if (op.name === "gte") out = out.filter((r) => String(r[col]) >= String(val));
    else if (op.name === "ilike") out = out.filter((r) => likeToRegExp(String(val)).test(String(r[col] ?? "")));
    else if (op.name === "order") {
      const ascending = (op.args[1] as { ascending?: boolean } | undefined)?.ascending !== false;
      out.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (ascending ? 1 : -1));
    } else if (op.name === "limit") out = out.slice(0, Number(op.args[0]));
  }
  return out;
}

function makeTables(options: Options): Tables {
  const role = options.role === undefined ? "sales" : options.role;
  const lead = options.lead === undefined ? leadRow() : options.lead;
  return {
    profiles: role === null ? [] : [{ id: STAFF.id, role, full_name: options.profileName === undefined ? PROFILE_NAME : options.profileName }],
    leads: lead ? [lead] : [],
    lead_notes: (options.notes ?? []).map((r) => ({ ...r })),
    lead_tasks: (options.tasks ?? []).map((r) => ({ ...r })),
    lead_activity: (options.activity ?? []).map((r) => ({ ...r })),
  };
}

let rowSeq = 0;

function makeDb(tables: Tables, options: Options, calls: Call[]) {
  const fail = new Set(options.fail ?? []);
  const throwOn = new Set(options.throwOn ?? []);
  function execute(call: Call): { data: unknown; error: { message: string } | null } {
    assert.equal(call.executed, false, `${call.table} query ran twice`);
    call.executed = true;
    const action = call.action ?? "select";
    if (throwOn.has(`${call.table}.${action}`)) throw new Error("fixture connection reset");
    if (fail.has(`${call.table}.${action}`)) return { data: null, error: { message: "fixture failure" } };
    const table = tables[call.table as keyof Tables];
    assert.ok(table, `unexpected table ${call.table}`);
    const writeAt = call.ops.findIndex((o) => o.name === "insert" || o.name === "update");
    const filters = call.ops.slice(writeAt + 1);
    const returning = writeAt >= 0 && filters.some((o) => o.name === "select");
    if (action === "insert") {
      const payload = call.ops[writeAt].args[0];
      const rows = (Array.isArray(payload) ? payload : [payload]).map((r) => ({
        id: `row-${(rowSeq += 1)}`,
        created_at: NOW_ISO,
        ...(r as Row),
      }));
      table.unshift(...rows);
      return { data: returning ? rows : null, error: null };
    }
    if (action === "update") {
      const patch = call.ops[writeAt].args[0] as Row;
      let rows = applyFilters(table, filters);
      if (call.table === "leads" && options.rlsBlocksLeadUpdate) rows = [];
      for (const row of rows) Object.assign(row, patch);
      return { data: returning ? rows.map((r) => ({ id: r.id })) : null, error: null };
    }
    return { data: applyFilters(table, call.ops), error: null };
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: options.signedIn === false ? null : STAFF } }),
    },
    from(tableName: string) {
      const call: Call = { table: tableName, action: null, ops: [], executed: false };
      calls.push(call);
      const record =
        (name: string) =>
        (...args: unknown[]) => {
          call.ops.push({ name, args });
          if (name === "insert" || name === "update") call.action = name;
          else if (name === "select" && call.action === null) call.action = "select";
          return query;
        };
      const one = (strict: boolean) => async () => {
        const result = execute(call);
        if (result.error) return result;
        const rows = (Array.isArray(result.data) ? result.data : []) as Row[];
        if (strict && rows.length !== 1) return { data: null, error: { message: "not exactly one row" } };
        return { data: rows[0] ?? null, error: null };
      };
      const query = {
        select: record("select"),
        insert: record("insert"),
        update: record("update"),
        eq: record("eq"),
        is: record("is"),
        in: record("in"),
        ilike: record("ilike"),
        gte: record("gte"),
        order: record("order"),
        limit: record("limit"),
        single: one(true),
        maybeSingle: one(false),
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve()
            .then(() => execute(call))
            .then(resolve, reject);
        },
      };
      return query;
    },
  };
}

// ---------------------------------------------------------- the route --

const FIXED = SAMPLE_NOW.getTime();
class FixedDate extends Date {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(FIXED);
    else super(args[0] as string | number);
  }
  static now() {
    return FIXED;
  }
}

const MODULES: Record<string, unknown> = {
  "@/lib/leadMessageAuthor": authorModule,
  "@/lib/callCloser": callCloserModule,
  "@/lib/businessTime": businessTimeModule,
};

type Result = {
  status: number;
  json: Record<string, unknown>;
  calls: Call[];
  writes: Call[];
  tables: Tables;
  exports: Record<string, unknown>;
};

const everyMessage: string[] = [];

async function run(options: Options = {}, tables: Tables = makeTables(options)): Promise<Result> {
  const calls: Call[] = [];
  const db = makeDb(tables, options, calls);
  let fetchCalls = 0;
  const loaded = { exports: {} as Record<string, unknown> };
  const evaluate = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    Date: FixedDate,
    fetch: () => {
      fetchCalls += 1;
      throw new Error("The next-step route must never call fetch.");
    },
  });
  evaluate(
    (name: string) => {
      if (name === "@/lib/supabase/server") return { createClient: async () => db };
      if (name === "next/server") return require("next/server");
      if (name in MODULES) return MODULES[name];
      throw new Error(`The next-step route imported something unexpected: ${name}`);
    },
    loaded,
    loaded.exports,
  );
  const body = options.body === undefined ? bodyFor("booked") : options.body;
  const POST = loaded.exports.POST as (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  const response = await POST(
    new Request(`https://www.theleadflowpro.com/api/admin/leads/${options.id ?? LEAD_ID}/next-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: options.id ?? LEAD_ID }) },
  );
  assert.equal(fetchCalls, 0, "fetch must never be called");
  const json = (await response.json()) as Record<string, unknown>;
  for (const key of ["error", "summary"]) if (typeof json[key] === "string") everyMessage.push(json[key] as string);
  if (Array.isArray(json.warnings)) everyMessage.push(...(json.warnings as string[]));
  for (const call of calls) assert.ok(call.executed, `${call.table} query was built but never run`);
  return {
    status: response.status,
    json,
    calls,
    writes: calls.filter((c) => c.action === "insert" || c.action === "update"),
    tables,
    exports: loaded.exports,
  };
}

function bodyFor(outcome: CallOutcome, extra: Row = {}): Row {
  const base: Record<CallOutcome, Row> = {
    booked: {
      meeting_date: "2026-09-24",
      meeting_time: "14:00",
      meeting_place: "at their business",
      offers: ["free_website_program"],
      note: "Wants before and after photos on the home page.",
    },
    wants_proposal: { offers: ["website_launch"] },
    ready_to_pay: { offers: ["website_launch"] },
    call_back: { callback_date: "2026-09-29", callback_time: "09:00" },
    no_answer: {},
    voicemail: {},
    not_a_fit: { lost_reason: "no_budget" },
    proposal_sent: { offers: ["website_launch"] },
  };
  return { outcome, idempotency_key: KEY, ...base[outcome], ...extra };
}

const writeNames = (r: Result) => r.writes.map((c) => `${c.table}.${c.action}`);
/** The row the route wrote, copied into this realm (vm objects have their own prototypes). */
const payloadOf = (call: Call | undefined): Row => {
  const op = call?.ops.find((o) => o.name === "insert" || o.name === "update");
  return JSON.parse(JSON.stringify(op?.args[0] ?? {})) as Row;
};
const writeTo = (r: Result, table: string, action: Action) => r.writes.find((c) => c.table === table && c.action === action);
const leadReads = (r: Result) => r.calls.filter((c) => c.table === "leads" && c.action === "select");
const hasOp = (call: Call, name: string, ...args: unknown[]) =>
  call.ops.some((o) => o.name === name && JSON.stringify(o.args) === JSON.stringify(args));

// ---------------------------------------------------------------- auth --

test("signed out gets a 401 before anything about the lead is read or written", async () => {
  const r = await run({ signedIn: false });
  assert.equal(r.status, 401);
  assert.equal(r.json.ok, false);
  assert.equal(typeof r.json.error, "string");
  assert.equal(r.calls.length, 0);
  assert.equal(leadReads(r).length, 0);
  assert.equal(r.writes.length, 0);
});

test("a client, a student, or a missing profile gets a 403 and only the profile is read", async () => {
  for (const role of ["client", "student", null]) {
    const r = await run({ role });
    assert.equal(r.status, 403, `role ${role}`);
    assert.equal(leadReads(r).length, 0);
    assert.equal(r.writes.length, 0);
    assert.deepEqual(
      r.calls.map((c) => c.table),
      ["profiles"],
    );
    assert.ok(hasOp(r.calls[0], "eq", "id", STAFF.id));
  }
});

test("a bad lead id is a 400 before any lead read, after auth", async () => {
  for (const id of ["sample", "not-a-uuid", `${LEAD_ID}x`, "1 or 1=1"]) {
    const r = await run({ id });
    assert.equal(r.status, 400, id);
    assert.equal(leadReads(r).length, 0);
    assert.equal(r.writes.length, 0);
  }
  const signedOut = await run({ id: "sample", signedIn: false });
  assert.equal(signedOut.status, 401, "auth is checked before the id");
});

test("a bad body is a 400 before any lead read", async () => {
  const bodies: unknown[] = [
    "{not json",
    [],
    { outcome: "sent_a_text", idempotency_key: KEY },
    { outcome: "booked" },
    { outcome: "booked", idempotency_key: "short" },
    bodyFor("wants_proposal", { offers: ["not_an_offer"] }),
    bodyFor("booked", { meeting_time: "" }),
    bodyFor("not_a_fit", { lost_reason: "rude" }),
  ];
  for (const body of bodies) {
    const r = await run({ body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.json.ok, false);
    assert.equal(leadReads(r).length, 0);
    assert.equal(r.writes.length, 0);
  }
});

// -------------------------------------------------------------- reads --

test("a missing or deleted lead is a 404, and the read filters out deleted leads", async () => {
  const missing = await run({ lead: null });
  assert.equal(missing.status, 404);
  assert.equal(missing.writes.length, 0);

  const deleted = await run({ lead: leadRow({ deleted_at: "2026-09-21T12:00:00.000Z" }) });
  assert.equal(deleted.status, 404);
  assert.equal(deleted.writes.length, 0);
  const [read] = leadReads(deleted);
  assert.ok(hasOp(read, "eq", "id", LEAD_ID));
  assert.ok(hasOp(read, "is", "deleted_at", null), "the lead read must apply .is('deleted_at', null)");
  const columns = String(read.ops.find((o) => o.name === "select")?.args[0]);
  for (const column of Object.keys(leadRow()).filter((k) => k !== "deleted_at")) {
    assert.match(columns, new RegExp(`\\b${column}\\b`), `the lead read selects ${column}`);
  }
});

test("a won or lost lead is a 409 with zero writes", async () => {
  for (const status of ["won", "lost"]) {
    const r = await run({ lead: leadRow({ status }) });
    assert.equal(r.status, 409, status);
    assert.equal(r.writes.length, 0);
    assert.match(String(r.json.error), new RegExp(status));
  }
});

test("an outcome missing what it needs is a 400 from the planner with zero writes", async () => {
  const noDate = await run({ body: { outcome: "booked", idempotency_key: KEY } });
  assert.equal(noDate.status, 400);
  assert.equal(noDate.writes.length, 0);
  const past = await run({ body: bodyFor("call_back", { callback_date: "2026-09-21" }) });
  assert.equal(past.status, 400);
  assert.equal(past.writes.length, 0);
  const notPayable = await run({ body: bodyFor("ready_to_pay", { offers: ["free_website_program"] }) });
  assert.equal(notPayable.status, 400);
  assert.equal(notPayable.writes.length, 0);
});

test("a read that fails is a retryable 500 with nothing written", async () => {
  for (const fail of [["leads.select"], ["lead_activity.select"]]) {
    const r = await run({ fail });
    assert.equal(r.status, 500, fail.join());
    assert.equal(r.json.retryable, true);
    assert.deepEqual(r.json.landed, []);
    assert.equal(r.writes.length, 0);
  }
});

// ------------------------------------------------------ idempotency --

test("a save whose Ref marker is already on the timeline is a duplicate with zero writes", async () => {
  const detail = `Call: booked the sit-down for Thu, Sep 24 at 2:00 PM. Outcome: booked. ${refMarker(KEY)}`;
  const r = await run({ activity: [{ lead_id: LEAD_ID, kind: "call", detail, created_at: "2026-09-22T14:59:00.000Z" }] });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.duplicate, true);
  assert.deepEqual(r.json.landed, []);
  assert.equal(r.writes.length, 0);
  const check = r.calls.find((c) => c.table === "lead_activity" && c.ops.some((o) => o.name === "ilike"));
  assert.ok(check, "the duplicate check searches lead_activity by detail");
  assert.ok(hasOp(check, "eq", "lead_id", LEAD_ID));
  const pattern = String(check.ops.find((o) => o.name === "ilike")?.args[1]);
  assert.ok(pattern.includes(refMarker(KEY)));
});

test("the same key saved twice writes once; the retry hands back the pay links", async () => {
  const tables = makeTables({});
  const first = await run({ body: bodyFor("ready_to_pay") }, tables);
  assert.equal(first.status, 200);
  assert.equal(first.json.duplicate, false);
  const second = await run({ body: bodyFor("ready_to_pay") }, tables);
  assert.equal(second.status, 200);
  assert.equal(second.json.duplicate, true);
  assert.equal(second.writes.length, 0);
  assert.equal(tables.lead_notes.length, 1);
  assert.equal(tables.lead_activity.length, 1);
  assert.deepEqual(
    (second.json.payDoors as { offerId: string }[]).map((d) => d.offerId),
    ["website_launch"],
  );
  assert.equal(second.json.payMessage, first.json.payMessage);
  assert.equal(second.json.nextFollowUpAt, first.json.nextFollowUpAt);
});

test("an edited save under a key already used gets the links of the call that was saved, never of the edit", async () => {
  const saved = (detail: string, created_at = "2026-09-22T14:59:00.000Z") => [{ lead_id: LEAD_ID, kind: "call", detail, created_at }];
  const none = (r: Result) => {
    assert.equal(r.status, 200);
    assert.equal(r.json.duplicate, true);
    assert.equal(r.writes.length, 0);
    assert.deepEqual(r.json.payDoors, []);
    assert.equal(r.json.payMessage, null);
    assert.equal(r.json.proposalHref, null);
  };

  // The saved call was a call back. The retry, edited to Ready to pay or Wants a proposal, gets no links:
  // nothing recorded a payment to check or a proposal to write.
  const callBack = saved(`Call: talked, call back Tue, Sep 29 at 9:00 AM. Outcome: call_back. ${refMarker(KEY)}`);
  const paid = await run({ body: bodyFor("ready_to_pay"), activity: callBack, lead: leadRow({ status: "contacted" }) });
  none(paid);
  assert.equal(paid.json.outcome, "call_back", "the answer names what was saved");
  none(await run({ body: bodyFor("wants_proposal"), activity: callBack, lead: leadRow({ status: "contacted" }) }));

  // Saved: ready to pay for the System Map. Retried as the Website Launch: only the System Map link, the one the record names.
  const map = saved(`Call: ready to pay now for System Map. Outcome: ready_to_pay. Offer ids: system_map. ${refMarker(KEY)}`);
  const edited = await run({ body: bodyFor("ready_to_pay", { offers: ["website_launch"] }), activity: map, lead: leadRow({ status: "proposal" }) });
  assert.equal(edited.json.duplicate, true);
  assert.equal(edited.writes.length, 0);
  assert.equal(edited.json.outcome, "ready_to_pay");
  assert.deepEqual((edited.json.payDoors as { offerId: string }[]).map((d) => d.offerId), ["system_map"]);
  assert.ok(!String(edited.json.payMessage).includes("Website Launch"), String(edited.json.payMessage));
  assert.ok(!JSON.stringify(edited.json).includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit), "never the deposit link of an offer the record does not name");

  // Saved: a proposal for the System Map. Retried as a Website Launch proposal: the saved proposal's link.
  const proposal = saved(`Call: wants a proposal for System Map. Outcome: wants_proposal. Offer ids: system_map. ${refMarker(KEY)}`);
  const asked = await run({ body: bodyFor("wants_proposal", { offers: ["website_launch"] }), activity: proposal, lead: leadRow({ status: "contacted" }) });
  assert.equal(asked.json.duplicate, true);
  assert.equal(asked.json.proposalHref, `/admin/proposals/${LEAD_ID}?offers=system_map`);
  assert.deepEqual(asked.json.payDoors, []);

  // A note-only edit of a ready-to-pay save still gets the saved links, the same as an unchanged retry.
  const tables = makeTables({});
  const first = await run({ body: bodyFor("ready_to_pay") }, tables);
  assert.equal(first.json.duplicate, false);
  assert.equal(first.json.outcome, "ready_to_pay");
  const noteEdit = await run({ body: bodyFor("ready_to_pay", { note: "Paying from the shop computer tonight." }) }, tables);
  assert.equal(noteEdit.json.duplicate, true);
  assert.equal(noteEdit.writes.length, 0);
  assert.deepEqual((noteEdit.json.payDoors as { offerId: string }[]).map((d) => d.offerId), ["website_launch"]);
  assert.equal(noteEdit.json.payMessage, first.json.payMessage);

  // An entry with the Ref but no readable outcome hands back nothing.
  const unreadable = await run({ body: bodyFor("ready_to_pay"), activity: saved(`Something else. ${refMarker(KEY)}`) });
  none(unreadable);
  assert.equal(unreadable.json.outcome, null);

  // The duplicate check reads the saved entry's detail, so it can rebuild from it.
  const check = unreadable.calls.find((c) => c.table === "lead_activity" && c.ops.some((o) => o.name === "ilike" && String(o.args[1]).includes(refMarker(KEY))));
  assert.ok(check);
  assert.match(String(check.ops.find((o) => o.name === "select")?.args[0]), /\bdetail\b/);
});

test("a retried not-a-fit save is a duplicate, not a 409 for the now lost lead", async () => {
  const tables = makeTables({});
  const first = await run({ body: bodyFor("not_a_fit") }, tables);
  assert.equal(first.status, 200);
  assert.equal(tables.leads[0].status, "lost");
  const retry = await run({ body: bodyFor("not_a_fit") }, tables);
  assert.equal(retry.status, 200);
  assert.equal(retry.json.duplicate, true);
  assert.equal(retry.writes.length, 0);
});

test("a longer key that starts with this key is not mistaken for this save", async () => {
  const detail = `Call: no answer. Outcome: no_answer. ${refMarker(`${KEY}0`)}`;
  const r = await run({ activity: [{ lead_id: LEAD_ID, kind: "call", detail, created_at: "2026-09-22T14:00:00.000Z" }] });
  assert.equal(r.status, 200);
  assert.equal(r.json.duplicate, false);
  assert.ok(r.writes.length > 0);
});

test("the same note inside 15 minutes is not added twice; outside the window it is", async () => {
  const tables = makeTables({});
  const first = await run({ body: bodyFor("booked") }, tables);
  assert.equal(first.status, 200);
  const noteBody = payloadOf(writeTo(first, "lead_notes", "insert")).body;
  assert.equal(typeof noteBody, "string");

  const second = await run({ body: bodyFor("booked", { idempotency_key: OTHER_KEY }) }, tables);
  assert.equal(second.status, 200);
  assert.equal(second.json.duplicate, false);
  assert.equal(writeTo(second, "lead_notes", "insert"), undefined, "an identical recent note is not inserted again");
  assert.ok(!(second.json.landed as string[]).includes("note"));
  assert.ok(writeTo(second, "lead_activity", "insert"), "the timeline entry still lands");
  assert.equal(tables.lead_notes.length, 1);
  const check = second.calls.find((c) => c.table === "lead_notes" && c.action === "select");
  assert.ok(check);
  assert.ok(hasOp(check, "eq", "lead_id", LEAD_ID));
  assert.ok(hasOp(check, "gte", "created_at", "2026-09-22T14:45:00.000Z"));

  const old = await run({
    body: bodyFor("booked", { idempotency_key: OTHER_KEY }),
    notes: [{ lead_id: LEAD_ID, body: noteBody, author: PROFILE_NAME, created_at: "2026-09-22T14:40:00.000Z" }],
  });
  assert.ok(writeTo(old, "lead_notes", "insert"), "a same-text note older than 15 minutes is a new call");

  const otherLead = await run({
    body: bodyFor("booked", { idempotency_key: OTHER_KEY }),
    notes: [{ lead_id: OTHER_LEAD_ID, body: noteBody, author: PROFILE_NAME, created_at: NOW_ISO }],
  });
  assert.ok(writeTo(otherLead, "lead_notes", "insert"), "another lead's note does not count");
});

// ------------------------------------------------------------- writes --

test("a sales user can save, and a forged author in the body is replaced by the profile name", async () => {
  const forged = bodyFor("booked", { author: "Ryan Nichols", actor: "Ryan Nichols", author_name: "Ryan Nichols", from: "forged@example.test" });
  const r = await run({ role: "sales", body: forged });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  const note = payloadOf(writeTo(r, "lead_notes", "insert"));
  assert.equal(note.author, PROFILE_NAME);
  for (const call of r.writes) {
    assert.doesNotMatch(JSON.stringify(payloadOf(call)), /Ryan Nichols|forged@example\.test/, `${call.table} ${call.action}`);
  }

  const admin = await run({ role: "admin", body: forged });
  assert.equal(admin.status, 200);

  const noName = await run({ profileName: "   " });
  assert.equal(payloadOf(writeTo(noName, "lead_notes", "insert")).author, STAFF.email);
});

test("the pay-link draft is signed by the signed-in person, never by an email address", async () => {
  const named = await run({ body: bodyFor("ready_to_pay") });
  assert.match(String(named.json.payMessage), /^Hi Dana, it's Patrick with /);
  const unnamed = await run({ profileName: null, body: bodyFor("ready_to_pay") });
  assert.match(String(unnamed.json.payMessage), new RegExp(`^Hi Dana, it's ${BUSINESS.operator.split(" ")[0]} with `));
  assert.doesNotMatch(String(unnamed.json.payMessage), /@example\.test|it's The /);
});

test("writes go lead, then note, then task, then the timeline entry last", async () => {
  const r = await run({ body: bodyFor("booked") });
  assert.equal(r.status, 200);
  assert.deepEqual(writeNames(r), ["leads.update", "lead_notes.insert", "lead_tasks.insert", "lead_activity.insert"]);
  assert.deepEqual(r.json.landed, ["lead", "note", "task", "activity"]);
  assert.deepEqual(r.json.warnings, []);
  assert.equal(r.json.retryable, false);
  assert.equal(r.json.duplicate, false);

  // Every read happens before the first write.
  const firstWrite = r.calls.findIndex((c) => c.action !== "select");
  const reads = r.calls.map((c, i) => ({ c, i })).filter(({ c }) => c.action === "select");
  const readTables = reads.map(({ c }) => c.table);
  assert.deepEqual(readTables.slice(0, 4), ["profiles", "leads", "lead_activity", "lead_activity"]);
  for (const { c, i } of reads) if (c.table !== "lead_notes") assert.ok(i < firstWrite, `${c.table} read after a write`);

  const update = writeTo(r, "leads", "update");
  assert.ok(update);
  assert.ok(hasOp(update, "eq", "id", LEAD_ID));
  assert.deepEqual(payloadOf(update), {
    status: "call_booked",
    last_contacted_at: NOW_ISO,
    next_follow_up_at: "2026-09-24T19:00:00.000Z",
  });
  assert.deepEqual(payloadOf(writeTo(r, "lead_tasks", "insert")), {
    lead_id: LEAD_ID,
    title: "Sit-down with Dana",
    task_type: "meeting",
    due_date: "2026-09-24",
    priority: "high",
  });
  const note = payloadOf(writeTo(r, "lead_notes", "insert"));
  assert.deepEqual(Object.keys(note).sort(), ["author", "body", "lead_id"]);
  assert.equal(note.lead_id, LEAD_ID);
  assert.match(String(note.body), /^Call: booked the sit-down for Thu, Sep 24 at 2:00 PM, at their business\./);
  assert.match(String(note.body), /\n\nWants before and after photos on the home page\.$/);
  const activity = payloadOf(writeTo(r, "lead_activity", "insert"));
  assert.deepEqual(Object.keys(activity).sort(), ["detail", "kind", "lead_id"]);
  assert.equal(activity.kind, "call");
  assert.ok(String(activity.detail).endsWith(refMarker(KEY)));
  assert.match(String(activity.detail), / Outcome: booked\. Offer ids: free_website_program\. /);

  assert.equal(r.json.nextFollowUpAt, "2026-09-24T19:00:00.000Z");
  assert.equal(r.json.nextFollowUpLabel, formatCentral(new Date("2026-09-24T19:00:00.000Z")));
  assert.equal(typeof r.json.summary, "string");
  const preview = r.json.preview as string[];
  assert.equal(preview[preview.length - 1], "Nothing is sent to Dana.");
  assert.deepEqual(r.json.payDoors, []);
  assert.equal(r.json.payMessage, null);
  assert.equal(r.json.proposalHref, null);
});

test("every outcome writes only the four CRM fields a sales user may change, and the kinds the schema allows", async () => {
  const sql = readFileSync("supabase/migrations/20260819172000_expand_sales_crm_and_delivery_center.sql", "utf8");
  const guard = sql.slice(sql.indexOf("function public.protect_sales_lead_fields"));
  const salesFields = [...(guard.match(/array\[([^\]]*)\]/)?.[1] ?? "").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(salesFields.includes("next_follow_up_at"));
  const kinds = [...(sql.match(/lead_activity_kind_check check \(([\s\S]*?)\)\s*\);/)?.[1] ?? "").matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
  assert.ok(kinds.includes("call") && kinds.includes("sales"));

  for (const outcome of CALL_OUTCOMES) {
    const r = await run({ body: bodyFor(outcome) });
    assert.equal(r.status, 200, `${outcome}: ${String(r.json.error ?? "")}`);
    const updates = r.writes.filter((c) => c.table === "leads");
    assert.equal(updates.length, 1, outcome);
    const keys = Object.keys(payloadOf(updates[0]));
    assert.ok(keys.length > 0, outcome);
    for (const key of keys) {
      assert.ok(ALLOWED_PATCH_KEYS.includes(key), `${outcome} writes ${key}`);
      assert.ok(salesFields.includes(key), `${outcome} writes ${key}, which the sales guard refuses`);
    }
    const activity = payloadOf(writeTo(r, "lead_activity", "insert"));
    assert.equal(activity.kind, outcome === "proposal_sent" ? "sales" : "call");
    assert.ok(kinds.includes(String(activity.kind)));
    assert.ok(String(activity.detail).length <= 1000);
    assert.ok(String(payloadOf(writeTo(r, "lead_notes", "insert")).body).length <= 4000);
    assert.equal(writeNames(r)[writeNames(r).length - 1], "lead_activity.insert", `${outcome}: the timeline entry is last`);
    assert.ok(r.calls.every((c) => c.table !== "lead_calls"));
  }
});

test("no answer and voicemail change only the next try, and the ladder reads the call history", async () => {
  const fresh = await run({ body: bodyFor("no_answer") });
  assert.deepEqual(payloadOf(writeTo(fresh, "leads", "update")), { next_follow_up_at: "2026-09-23T21:00:00.000Z" });
  assert.equal(writeTo(fresh, "lead_tasks", "insert"), undefined);
  const history = fresh.calls.find((c) => c.table === "lead_activity" && c.action === "select" && c.ops.some((o) => o.name === "limit" && o.args[0] === 20));
  assert.ok(history, "reads the last 20 call entries");
  assert.ok(hasOp(history, "eq", "lead_id", LEAD_ID));
  // Call entries and the sent proposals (kind "sales"), and only rows with an outcome marker.
  assert.ok(hasOp(history, "in", "kind", ["call", "sales"]));
  assert.ok(hasOp(history, "ilike", "detail", "%Outcome: %"));
  assert.ok(!hasOp(history, "eq", "kind", "sales"), "never every sales row");
  assert.ok(hasOp(history, "order", "created_at", { ascending: false }));

  const tries = [
    { lead_id: LEAD_ID, kind: "call", detail: `Call: no answer. Outcome: no_answer. ${refMarker("a".repeat(36))}`, created_at: "2026-09-21T21:00:00.000Z" },
    { lead_id: LEAD_ID, kind: "call", detail: `Call: no answer. Outcome: no_answer. ${refMarker("b".repeat(36))}`, created_at: "2026-09-18T21:00:00.000Z" },
    // Not a call entry, and another lead's call: neither counts.
    { lead_id: LEAD_ID, kind: "sales", detail: `Proposal sent. Outcome: no_answer. ${refMarker("c".repeat(36))}`, created_at: "2026-09-22T12:00:00.000Z" },
    { lead_id: OTHER_LEAD_ID, kind: "call", detail: `Call: no answer. Outcome: no_answer. ${refMarker("d".repeat(36))}`, created_at: "2026-09-22T13:00:00.000Z" },
  ];
  const third = await run({ body: bodyFor("no_answer"), activity: tries });
  assert.equal(third.status, 200);
  assert.deepEqual(payloadOf(writeTo(third, "leads", "update")), { next_follow_up_at: "2026-09-28T21:00:00.000Z" });
  assert.ok((third.json.preview as string[]).includes("That is several tries without an answer. Try a text or an email next."));

  const voicemail = await run({ body: bodyFor("voicemail"), activity: tries.slice(0, 1) });
  assert.deepEqual(Object.keys(payloadOf(writeTo(voicemail, "leads", "update"))), ["next_follow_up_at"]);

  // A sales entry that is not a sent proposal never counts as a try: one call miss is rung 1, two business days out.
  const oneMiss = await run({ body: bodyFor("no_answer"), activity: [tries[2], tries[0]] });
  assert.deepEqual(payloadOf(writeTo(oneMiss, "leads", "update")), { next_follow_up_at: "2026-09-24T21:00:00.000Z" });
});

test("a sent proposal ends a run of missed calls, although it is saved as a sales entry", async () => {
  // Mon: no answer. Mon afternoon: voicemail. Tue morning: proposal sent. Now another no answer.
  const history = [
    {
      lead_id: LEAD_ID,
      kind: "sales",
      detail: `Proposal sent for Website Launch. Follow up Thu, Sep 24 at 9:00 AM. Outcome: proposal_sent. Offer ids: website_launch. ${refMarker("e".repeat(36))}`,
      created_at: "2026-09-22T14:00:00.000Z",
    },
    // A Sales Desk change in between is not a call and does not take a place in the window.
    { lead_id: LEAD_ID, kind: "sales", detail: "Patrick Grabbs: Priority set to high", created_at: "2026-09-22T14:30:00.000Z" },
    { lead_id: LEAD_ID, kind: "call", detail: `Call: left a voicemail. Outcome: voicemail. ${refMarker("f".repeat(36))}`, created_at: "2026-09-21T20:00:00.000Z" },
    { lead_id: LEAD_ID, kind: "call", detail: `Call: no answer. Outcome: no_answer. ${refMarker("g".repeat(36))}`, created_at: "2026-09-21T15:00:00.000Z" },
  ];
  const r = await run({ body: bodyFor("no_answer"), activity: history });
  assert.equal(r.status, 200);
  // Rung 0: one business day out, at the other half of the day (Wed 4:00 PM Central), not four days.
  assert.deepEqual(payloadOf(writeTo(r, "leads", "update")), { next_follow_up_at: "2026-09-23T21:00:00.000Z" });
  assert.ok(!(r.json.preview as string[]).some((l) => l.includes("several tries")), (r.json.preview as string[]).join(" | "));

  // Without the proposal the same two misses make this the third try.
  const withoutProposal = await run({ body: bodyFor("no_answer"), activity: history.slice(2) });
  assert.deepEqual(payloadOf(writeTo(withoutProposal, "leads", "update")), { next_follow_up_at: "2026-09-28T21:00:00.000Z" });
});

test("the other outcomes write the stage, task, and links the planner promises", async () => {
  const proposal = await run({ body: bodyFor("wants_proposal") });
  assert.equal(proposal.json.proposalHref, `/admin/proposals/${LEAD_ID}?offers=website_launch`);
  assert.deepEqual(payloadOf(writeTo(proposal, "leads", "update")), {
    status: "contacted",
    last_contacted_at: NOW_ISO,
    next_follow_up_at: "2026-09-24T18:00:00.000Z",
  });
  const task = payloadOf(writeTo(proposal, "lead_tasks", "insert"));
  assert.equal(task.task_type, "proposal");
  assert.equal(task.due_date, "2026-09-24");

  const pay = await run({ body: bodyFor("ready_to_pay") });
  assert.equal(payloadOf(writeTo(pay, "leads", "update")).status, "proposal");
  assert.equal(pay.json.nextFollowUpAt, "2026-09-23T15:00:00.000Z");
  assert.deepEqual(
    (pay.json.payDoors as { offerId: string; url: string | null }[]).map((d) => [d.offerId, Boolean(d.url)]),
    [["website_launch", true]],
  );

  const lost = await run({ body: bodyFor("not_a_fit") });
  assert.deepEqual(payloadOf(writeTo(lost, "leads", "update")), {
    status: "lost",
    last_contacted_at: NOW_ISO,
    next_follow_up_at: null,
    lost_reason: "No budget right now",
  });
  assert.equal(lost.json.nextFollowUpAt, null);
  assert.equal(lost.json.nextFollowUpLabel, null);

  const later = await run({ body: bodyFor("call_back"), lead: leadRow({ status: "call_booked" }) });
  assert.deepEqual(Object.keys(payloadOf(writeTo(later, "leads", "update"))).sort(), ["last_contacted_at", "next_follow_up_at"], "stages never move back");
});

test("proposal sent marks only this lead's open proposal tasks done", async () => {
  const tasks: Row[] = [
    { id: "t1", lead_id: LEAD_ID, task_type: "proposal", completed_at: null, title: "Write the proposal" },
    { id: "t2", lead_id: LEAD_ID, task_type: "proposal", completed_at: null, title: "Write the second proposal" },
    { id: "t3", lead_id: LEAD_ID, task_type: "proposal", completed_at: "2026-09-10T15:00:00.000Z", title: "Old proposal" },
    { id: "t4", lead_id: LEAD_ID, task_type: "meeting", completed_at: null, title: "Sit-down" },
    { id: "t5", lead_id: OTHER_LEAD_ID, task_type: "proposal", completed_at: null, title: "Someone else" },
  ];
  const r = await run({ body: bodyFor("proposal_sent"), lead: leadRow({ status: "contacted" }), tasks });
  assert.equal(r.status, 200);
  assert.deepEqual(writeNames(r), ["leads.update", "lead_notes.insert", "lead_tasks.update", "lead_activity.insert"]);
  const done = writeTo(r, "lead_tasks", "update");
  assert.ok(done);
  assert.deepEqual(payloadOf(done), { completed_at: NOW_ISO });
  assert.ok(hasOp(done, "eq", "lead_id", LEAD_ID));
  assert.ok(hasOp(done, "eq", "task_type", "proposal"));
  assert.ok(hasOp(done, "is", "completed_at", null));
  const byId = Object.fromEntries(r.tables.lead_tasks.map((t) => [t.id, t.completed_at]));
  assert.deepEqual(byId, { t1: NOW_ISO, t2: NOW_ISO, t3: "2026-09-10T15:00:00.000Z", t4: null, t5: null });
  assert.equal(payloadOf(writeTo(r, "leads", "update")).status, "proposal");
  assert.equal(payloadOf(writeTo(r, "lead_activity", "insert")).kind, "sales");
  assert.ok((r.json.landed as string[]).includes("proposal_tasks"));
});

// ----------------------------------------------------------- failures --

test("a failed lead update is a retryable 500 and nothing else is written", async () => {
  for (const options of [{ fail: ["leads.update"] }, { rlsBlocksLeadUpdate: true }] as Options[]) {
    const r = await run(options);
    assert.equal(r.status, 500);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.retryable, true);
    assert.deepEqual(r.json.landed, []);
    assert.deepEqual(writeNames(r), ["leads.update"]);
  }
});

test("a failed note is a retryable 500 that says the lead already landed", async () => {
  const r = await run({ fail: ["lead_notes.insert"] });
  assert.equal(r.status, 500);
  assert.equal(r.json.retryable, true);
  assert.deepEqual(r.json.landed, ["lead"]);
  assert.deepEqual(writeNames(r), ["leads.update", "lead_notes.insert"]);
});

test("a failed task or timeline entry is a 200 with a warning, not a retry", async () => {
  const activity = await run({ fail: ["lead_activity.insert"] });
  assert.equal(activity.status, 200);
  assert.equal(activity.json.ok, true);
  assert.equal(activity.json.retryable, false);
  assert.equal((activity.json.warnings as string[]).length, 1);
  assert.deepEqual(activity.json.landed, ["lead", "note", "task"]);

  const task = await run({ fail: ["lead_tasks.insert"] });
  assert.equal(task.status, 200);
  assert.equal(task.json.retryable, false);
  assert.equal((task.json.warnings as string[]).length, 1);
  assert.match((task.json.warnings as string[])[0], /Sit-down with Dana/);
  assert.deepEqual(task.json.landed, ["lead", "note", "activity"]);
  assert.deepEqual(writeNames(task), ["leads.update", "lead_notes.insert", "lead_tasks.insert", "lead_activity.insert"]);

  const proposalTasks = await run({ body: bodyFor("proposal_sent"), fail: ["lead_tasks.update"] });
  assert.equal(proposalTasks.status, 200);
  assert.equal((proposalTasks.json.warnings as string[]).length, 1);
  assert.deepEqual(proposalTasks.json.landed, ["lead", "note", "activity"]);
});

test("not a fit writes the note before it closes the lead, so a failed note leaves nothing to refuse the retry", async () => {
  const tables = makeTables({});
  const first = await run({ body: bodyFor("not_a_fit"), fail: ["lead_notes.insert"] }, tables);
  assert.equal(first.status, 500);
  assert.equal(first.json.retryable, true);
  assert.deepEqual(first.json.landed, [], "nothing landed, so the lead is still open");
  assert.deepEqual(writeNames(first), ["lead_notes.insert"]);
  assert.equal(tables.leads[0].status, "new");

  const retry = await run({ body: bodyFor("not_a_fit") }, tables);
  assert.equal(retry.status, 200, String(retry.json.error ?? ""));
  assert.equal(retry.json.duplicate, false);
  assert.deepEqual(writeNames(retry), ["lead_notes.insert", "leads.update", "lead_activity.insert"]);
  assert.deepEqual(retry.json.landed, ["note", "lead", "activity"]);
  assert.equal(tables.leads[0].status, "lost");
  assert.equal(tables.leads[0].lost_reason, "No budget right now");
  assert.equal(tables.lead_notes.length, 1);
  assert.equal(tables.lead_activity.length, 1);
  assert.ok(String(tables.lead_activity[0].detail).endsWith(refMarker(KEY)));
});

test("not a fit whose lead update fails after the note retries cleanly, without a second note", async () => {
  const tables = makeTables({});
  const first = await run({ body: bodyFor("not_a_fit"), fail: ["leads.update"] }, tables);
  assert.equal(first.status, 500);
  assert.equal(first.json.retryable, true);
  assert.deepEqual(first.json.landed, ["note"]);
  assert.match(String(first.json.error), /The note saved but the lead did not update/);
  assert.equal(tables.leads[0].status, "new");

  const retry = await run({ body: bodyFor("not_a_fit") }, tables);
  assert.equal(retry.status, 200, String(retry.json.error ?? ""));
  assert.equal(writeTo(retry, "lead_notes", "insert"), undefined, "the note from the first try is not added again");
  assert.equal(tables.leads[0].status, "lost");
  assert.equal(tables.lead_notes.length, 1);
  assert.equal(tables.lead_activity.length, 1);
});

test("once a closing update has landed, a crash is not offered as a retry the closed lead would refuse", async () => {
  const closed = await run({ body: bodyFor("not_a_fit"), throwOn: ["lead_activity.insert"] });
  assert.equal(closed.status, 500);
  assert.equal(closed.json.retryable, false);
  assert.deepEqual(closed.json.landed, ["note", "lead"]);
  assert.match(String(closed.json.error), /marked not a fit\. The note is saved\. Check the lead page/);

  // Any other outcome without a task stays retryable: the lead stays open.
  const open = await run({ body: bodyFor("call_back"), throwOn: ["lead_activity.insert"] });
  assert.equal(open.status, 500);
  assert.equal(open.json.retryable, true);
  assert.deepEqual(open.json.landed, ["lead", "note"]);
});

// ------------------------------------------------------------- source --

test("the route imports only what it needs and never reaches a channel, the service key, or the call log", () => {
  const specifiers = [...source.matchAll(/\bfrom\s+"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(specifiers, ["@/lib/businessTime", "@/lib/callCloser", "@/lib/leadMessageAuthor", "@/lib/supabase/server", "next/server"]);
  assert.doesNotMatch(source, /\brequire\s*\(|\bimport\s*\(/);
  for (const banned of [
    /lead_calls/,
    /supabase\/service/,
    /createServiceClient|SERVICE_ROLE/i,
    /\bquo\b/i,
    /resend/i,
    /leadNotify/i,
    /\bfetch\b/,
    /sendEmail|sendSms|sendLeadText/,
    /[\u2013\u2014]/,
  ]) {
    assert.doesNotMatch(source, banned, `route source must not contain ${banned}`);
  }
  assert.match(source, /export const dynamic = "force-dynamic";/);
  assert.match(source, /export async function POST\(request: Request, context: \{ params: Promise<\{ id: string \}> \}\)/);
  assert.doesNotMatch(source, /export async function (GET|PUT|PATCH|DELETE)\b/);

  // Auth sits above the first lead read in the file, too.
  const auth = source.indexOf("auth.getUser()");
  const role = source.indexOf('from("profiles")');
  const firstLeadRead = source.indexOf('from("leads")');
  assert.ok(auth > 0 && auth < role && role < firstLeadRead);
});

test("the route exports POST and force-dynamic only", async () => {
  const r = await run({ signedIn: false });
  assert.deepEqual(Object.keys(r.exports).filter((k) => k !== "__esModule").sort(), ["POST", "dynamic"]);
  assert.equal(r.exports.dynamic, "force-dynamic");
});

test("every message the route returned passes the copy rules", () => {
  assert.ok(everyMessage.length > 20, "the earlier tests collected the route's messages");
  for (const message of everyMessage) assert.deepEqual(copyProblems(message), [], message);
});

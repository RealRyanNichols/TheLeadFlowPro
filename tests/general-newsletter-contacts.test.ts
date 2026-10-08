import assert from "node:assert/strict";
import test from "node:test";
import { BUSINESS_OFFERS_TOPIC_ID, GENERAL_NEWSLETTER_SEGMENT_ID, newsletterEmail, readNewsletterCrm, newsletterCrmEligibility, reconcileGeneralNewsletter } from "../lib/generalNewsletterContacts";

type Row = Record<string, unknown>;
const lead = (email = "owner@example.com", changes: Row = {}): Row => ({ id: "lead-" + email, email,
  marketing_email_consent: true, email_unsubscribed_at: null, deleted_at: null, is_test: false, ...changes });
const native = (email = "owner@example.com", changes: Row = {}): Row => ({ id: "contact-" + email, email, unsubscribed: false, ...changes });
const reader = (rows: Row[]) => async (from: number, to: number) => ({ data: rows.slice(from, to + 1), count: rows.length });
const list = (rows: Row[], more = false) => Response.json({ object: "list", has_more: more, data: rows });
function fixture(input: { crm?: Row[]; contacts?: Row[]; members?: Row[]; suppressions?: Row[]; optOut?: string[];
  unknownTopic?: boolean; topicError?: boolean; freshUnsubscribed?: boolean; createConflict?: boolean; duplicateProvider?: boolean } = {}) {
  const crm = input.crm ?? [lead()], contacts = input.contacts ?? [native()], members = input.members ?? [];
  const writes: { method: string; path: string; body?: Row }[] = [], paths: string[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const u = new URL(String(url)), method = init?.method ?? "GET"; paths.push(u.pathname);
    if (method !== "GET") {
      const body = init?.body ? JSON.parse(String(init.body)) as Row : undefined;
      writes.push({ method, path: u.pathname, body });
      if (u.pathname === "/contacts" && method === "POST") {
        if (input.createConflict) return new Response("", { status: 409 });
        const value = native(String(body?.email)); contacts.push(value); return Response.json({ id: value.id });
      }
      return Response.json({ id: "membership" });
    }
    if (u.pathname === "/contacts") return list(input.duplicateProvider ? [native(), native("owner@example.com", { id: "second-id" })] : contacts);
    if (u.pathname === "/segments/" + GENERAL_NEWSLETTER_SEGMENT_ID + "/contacts") return list(members);
    if (u.pathname === "/suppressions") return list(input.suppressions ?? []);
    if (u.pathname.startsWith("/suppressions/")) return new Response("", { status: 404 });
    if (u.pathname.endsWith("/topics")) {
      if (input.topicError) return new Response("private-provider-error", { status: 503 });
      return list(input.unknownTopic ? [] : [{ id: BUSINESS_OFFERS_TOPIC_ID,
        subscription: input.optOut?.includes(decodeURIComponent(u.pathname.split("/")[2])) ? "opt_out" : "opt_in" }]);
    }
    const id = decodeURIComponent(u.pathname.split("/")[2]);
    const c = contacts.find(c => c.id === id || c.email === id);
    if (c) return Response.json({ ...c, unsubscribed: input.freshUnsubscribed ?? c.unsubscribed });
    return new Response("", { status: 404 });
  };
  const run = (changes = {}) => reconcileGeneralNewsletter({ apiKey: "fixture", readCrmPage: reader(crm), fetcher,
    requestIntervalMs: 0, nowMs: 0, ...changes });
  return { crm, contacts, members, writes, paths, run, fetcher };
}

test("General identity is the verified existing UUID, without a count suffix", () => {
  assert.equal(GENERAL_NEWSLETTER_SEGMENT_ID, "c9c45654-e1dd-4874-9286-d9da525a59da");
  assert.equal(BUSINESS_OFFERS_TOPIC_ID, "123caa19-4f2d-49da-bec6-7628dfa0f5cf");
});

test("general permission includes every sales/workshop lifecycle without reading daily markers", () => {
  const rows = ["new", "contacted", "proposal", "won", "lost", "workshop_complete"].map((status, i) => lead(`person${i}@example.com`, {
    status, diagnostic: { meta_daily30: { anything: true }, meta_daily30_duplicate_of: "other" } }));
  assert.equal(newsletterCrmEligibility(rows).size, 6);
});

test("strict addresses reject placeholders, display names, control chars and malformed domains", () => {
  for (const email of ["x@unknown.invalid", "x@direct_outreach.invalid", "123@no-email.facebook.lead", "Name <x@example.com>",
    "x@example.com\r\nBcc:y@example.com", "x@y", "x@@example.com", "x@-example.com", "x@example..com", "x@under_score.com"])
    assert.equal(newsletterEmail(email), null, email);
  assert.equal(newsletterEmail(" OWNER+TAG@Example.com "), "owner+tag@example.com");
});

test("duplicate active conflicting consent and any non-test email hold win; deleted/test alone cannot join", () => {
  const rows = [lead(), lead(" OWNER@EXAMPLE.COM ", { id: "alias", marketing_email_consent: null }),
    lead("deleted@example.com", { deleted_at: "2026-10-08" }), lead("test@example.com", { is_test: true }),
    lead("held@example.com"), lead("held@example.com", { id: "old", deleted_at: "2026-01-01", email_unsubscribed_at: "2026-10-01" }),
    lead("valid@example.com"), lead("valid@example.com", { id: "ignored-test", is_test: true, marketing_email_consent: false })];
  assert.deepEqual([...newsletterCrmEligibility(rows)], ["valid@example.com"]);
});

test("complete CRM pagination includes beyond1000 and stable exact counts", async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => lead(`owner${i}@example.com`));
  assert.equal((await readNewsletterCrm(reader(rows))).length, 1001);
});

for (const failure of ["late-page", "count-change", "truncated", "duplicate-id", "missing-count"]) test(`CRM ${failure} causes zero provider mutations`, async () => {
  const f = fixture(); let calls = 0;
  const readCrmPage = async () => {
    calls++;
    if (failure === "missing-count") return { data: [], count: null };
    if (failure === "truncated") return { data: [lead()], count: 1001 };
    if (calls > 1) return failure === "count-change" ? { data: [lead("last@example.com")], count: 501 }
      : failure === "duplicate-id" ? { data: [lead("owner0@example.com")], count: 1001 }
      : { data: null, count: 1001, error: { message: "private-crm-value" } };
    return { data: Array.from({ length: 500 }, (_, i) => lead(`owner${i}@example.com`)), count: 1001 };
  };
  const r = await f.run({ readCrmPage }); assert.equal(r.ok, false); assert.equal(f.writes.length, 0);
  assert.equal(JSON.stringify(r).includes("private-crm-value"), false);
});

test("new website and Meta contacts enter only General with no topic/global overrides", async () => {
  const f = fixture({ crm: [lead("website@example.com", { source: "website", status: "won" }), lead("meta@example.com", { source: "meta_lead_ad" })], contacts: [] });
  const r = await f.run(); assert.equal(r.ok, true); assert.equal(r.created, 2); assert.equal(r.added, 2);
  for (const w of f.writes) {
    assert.notEqual(w.method, "PATCH");
    if (w.path === "/contacts") assert.deepEqual(Object.keys(w.body ?? {}), ["email"]);
    else assert.ok(w.path.endsWith("/segments/" + GENERAL_NEWSLETTER_SEGMENT_ID));
    assert.equal(w.path.includes("f500eae4"), false); assert.equal(w.path.includes("topics"), false);
  }
});

test("native global opt-out, topic opt-out and account suppression cannot join", async () => {
  const crm = [lead("global@example.com"), lead("topic@example.com"), lead("suppressed@example.com")];
  const contacts = [native("global@example.com", { unsubscribed: true }), native("topic@example.com"), native("suppressed@example.com")];
  const f = fixture({ crm, contacts, optOut: [String(contacts[1].id)], suppressions: [{ id: "suppression1", email: "suppressed@example.com", origin: "bounce" }] });
  const r = await f.run(); assert.equal(r.added, 0); assert.equal(f.writes.length, 0); assert.equal(r.provider_held, 3);
});

test("stale CRM permission/global/topic holds remove only General membership", async () => {
  const contacts = [native("lost@example.com"), native("global@example.com", { unsubscribed: true }), native("topic@example.com")];
  const f = fixture({ crm: [lead("lost@example.com", { marketing_email_consent: false }), lead("global@example.com"), lead("topic@example.com")], contacts,
    members: contacts, optOut: [String(contacts[2].id)] });
  const r = await f.run(); assert.equal(r.removed, 3); assert.equal(f.writes.length, 3);
  assert.ok(f.writes.every(w => w.method === "DELETE" && w.path.endsWith("/segments/" + GENERAL_NEWSLETTER_SEGMENT_ID)));
});

test("native unsubscribe between listing and addition is rechecked and preserved", async () => {
  const f = fixture({ freshUnsubscribed: true }); const r = await f.run(); assert.equal(r.added, 0); assert.equal(f.writes.length, 0);
});

test("unknown topics and failed topic reads defer without any subscription override", async () => {
  for (const flags of [{ unknownTopic: true }, { topicError: true }]) {
    const f = fixture(flags); const r = await f.run(); assert.equal(r.ok, false); assert.equal(r.added, 0); assert.equal(f.writes.length, 0);
    assert.equal(JSON.stringify(r).includes("private-provider-error"), false);
  }
});

test("provider duplicate email or incomplete/cyclic lists stop all mutations", async () => {
  const f = fixture({ duplicateProvider: true }); assert.equal((await f.run()).ok, false); assert.equal(f.writes.length, 0);
  for (const mode of ["failed-later", "cursor-cycle", "malformed"]) {
    let calls = 0, writes = 0;
    const fetcher: typeof fetch = async (_url, init) => {
      if (init?.method) { writes++; return Response.json({}); }
      calls++;
      if (mode === "malformed") return Response.json({ data: [] });
      if (calls > 1 && mode === "failed-later") return new Response("", { status: 503 });
      return list([native()], true);
    };
    const r = await reconcileGeneralNewsletter({ apiKey: "fixture", readCrmPage: reader([lead()]), fetcher, requestIntervalMs: 0 });
    assert.equal(r.ok, false); assert.equal(writes, 0);
  }
});

test("create conflict defers rather than guesses native ID or clears subscription", async () => {
  const f = fixture({ contacts: [], createConflict: true }); const r = await f.run(); assert.equal(r.deferred, 1); assert.equal(r.added, 0);
  assert.equal(f.writes.length, 1); assert.deepEqual(f.writes[0].body, { email: "owner@example.com" });
});

test("a native contact appearing after the snapshot is read before create and its opt-out wins", async () => {
  const f = fixture({ contacts: [] });
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if ((!init?.method || init.method === "GET") && path.startsWith("/contacts/")) return Response.json(native(undefined, { unsubscribed: true }));
    return f.fetcher(url, init);
  };
  const r = await f.run({ fetcher }); assert.equal(r.provider_held, 1); assert.equal(r.created, 0); assert.equal(r.added, 0);
  assert.equal(f.writes.length, 0);
});

test("unknown pre-create state defers without creating a contact", async () => {
  const f = fixture({ contacts: [] });
  const fetcher: typeof fetch = async (url, init) => new URL(String(url)).pathname === "/contacts/owner%40example.com"
    ? new Response("private-provider-error", { status: 503 }) : f.fetcher(url, init);
  const r = await f.run({ fetcher }); assert.equal(r.ok, false); assert.equal(r.created, 0); assert.equal(f.writes.length, 0);
});

test("a topic opt-out on a later topic page prevents membership", async () => {
  const f = fixture();
  const fetcher: typeof fetch = async (url, init) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith("/topics")) return u.searchParams.has("after")
      ? list([{ id: BUSINESS_OFFERS_TOPIC_ID, subscription: "opt_out" }])
      : list([{ id: "another-topic", subscription: "opt_in" }], true);
    return f.fetcher(url, init);
  };
  const r = await f.run({ fetcher }); assert.equal(r.provider_held, 1); assert.equal(r.added, 0); assert.equal(f.writes.length, 0);
});

test("suppression list failure and unsupported state cause zero mutations", async () => {
  for (const bad of [false, true]) {
    const f = fixture(); const fetcher: typeof fetch = async (url, init) => String(url).includes("/suppressions?")
      ? bad ? list([{ id: "x", email: "owner@example.com", origin: "unknown" }]) : new Response("", { status: 403 }) : f.fetcher(url, init);
    const r = await f.run({ fetcher }); assert.equal(r.ok, false); assert.equal(f.writes.length, 0);
  }
});

test("bounded create+add mutations defer safely and do not emit raw contact data", async () => {
  const f = fixture({ contacts: [] }); const r = await f.run({ maxMutations: 1 }); assert.equal(r.created, 1); assert.equal(r.added, 0);
  assert.equal(r.deferred, 1); assert.equal(f.writes.length, 1); assert.equal(JSON.stringify(r).includes("owner@example.com"), false);
});

test("successive bounded polls eventually visit every pending contact even when list length shares factors with64", async () => {
  const addresses = Array.from({ length: 128 }, (_, i) => `person${String(i).padStart(3, "0")}@example.com`);
  const visited = new Set<string>();
  for (let run = 0; run < addresses.length; run++) {
    const f = fixture({ crm: addresses.map(email => lead(email)), contacts: addresses.map(email => native(email)) });
    const r = await f.run({ nowMs: run * 300_000, maxMutations: 1 });
    assert.equal(r.added, 1); assert.equal(r.deferred, 127);
    assert.equal(f.writes.length, 1); visited.add(f.writes[0].path);
  }
  assert.equal(visited.size, 128);
});

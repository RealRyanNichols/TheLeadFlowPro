import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizePhoneLast10 } from "../lib/quo";

// Task 0 pinned down. These tests exist because the failure they guard against
// is silent: two systems creating leads produce two rows that never collide, so
// nothing errors and nobody notices until the CRM is full of duplicates with
// opposite consent flags.

const routeSource = () =>
  readFile(new URL("../app/api/quo-inbound/route.ts", import.meta.url), "utf8");
const libSource = () =>
  readFile(new URL("../lib/quo.ts", import.meta.url), "utf8");
const ownerMigration = () =>
  readFile(
    new URL("../supabase/migrations/20260916002000_quo_ingestion_single_owner.sql", import.meta.url),
    "utf8",
  );

test("normalizePhoneLast10 agrees with public.normalize_phone", () => {
  // right(regexp_replace(p, '\D', '', 'g'), 10)
  assert.equal(normalizePhoneLast10("+1 (903) 500-8898"), "9035008898");
  assert.equal(normalizePhoneLast10("19035008898"), "9035008898");
  assert.equal(normalizePhoneLast10("9035008898"), "9035008898");
  assert.equal(normalizePhoneLast10("903.500.8898"), "9035008898");
  assert.equal(normalizePhoneLast10(""), "");
  assert.equal(normalizePhoneLast10("12345"), "12345");
});

test("the inbound route creates nothing: one owner writes leads", async () => {
  const source = await routeSource();
  assert.doesNotMatch(source, /from\(["']leads["']\)/,
    "the route must not touch the leads table; log_quo_activity owns it");
  assert.doesNotMatch(source, /from\(["']lead_activity["']\)/,
    "activity rows are written by the database function, not here");
  assert.match(source, /rpc\(\s*["']log_quo_activity["']/,
    "the route must forward into log_quo_activity");
});

test("the inbound route does not carry a second STOP implementation", async () => {
  const source = await routeSource();
  assert.doesNotMatch(source, /isStopMessage/,
    "STOP is decided once, in SQL, before any lead is created");
  const lib = await libSource();
  assert.doesNotMatch(lib, /export function isStopMessage/,
    "the TypeScript STOP list is deleted, not kept in sync; the two had drifted");
});

test("the auto-reply claims its row before it calls the provider", async () => {
  const source = await routeSource();
  const claim = source.indexOf('from("sms_auto_replies")');
  const send = source.indexOf("sendInboundAutoReply(");
  assert.ok(claim >= 0, "the auto-reply must claim sms_auto_replies");
  assert.ok(send > claim,
    "claim first, then send: the reverse order sends twice when the write fails");
  assert.match(source, /phone_norm: last10/,
    "the claim is keyed on the phone, not the lead id: duplicate lead rows exist");
});

test("STOP is evaluated before any lead is created", async () => {
  const sql = await ownerMigration();
  const stopBranch = sql.indexOf("if v_is_stop then");
  const ensureCall = sql.indexOf("coalesce(v_existing, public.ensure_lead_for_phone(");
  assert.ok(stopBranch >= 0 && ensureCall >= 0);
  assert.ok(stopBranch < ensureCall,
    "the STOP branch must return before ensure_lead_for_phone can INSERT on leads, " +
    "because leads carries an AFTER INSERT trigger that enqueues outbound email");
});

test("a STOP never advances the lead to contacted", async () => {
  const sql = await ownerMigration();
  const stopReturn = sql.indexOf("'suppressed', true");
  const touch = sql.indexOf("perform public.touch_lead_contact(");
  assert.ok(stopReturn >= 0 && touch >= 0);
  assert.ok(stopReturn < touch,
    "the STOP branch returns before touch_lead_contact, which would flip new -> contacted");
});

test("an unknown number that texts STOP is still recorded", async () => {
  const sql = await ownerMigration();
  assert.match(sql, /insert into public\.sms_suppressions/,
    "the opt-out must land somewhere that does not require a lead row");
  const suppress = sql.indexOf("insert into public.sms_suppressions");
  const match = sql.indexOf("v_lead_id := public.match_lead_by_phone(v_participant);");
  assert.ok(suppress < match,
    "suppression is recorded whether or not a lead is ever found");
});

test("consent is granted by an inbound text and by nothing else", async () => {
  const sql = await ownerMigration();
  assert.match(sql, /v_is_msg_in\s*:=\s*v_kind = 'message' and not v_is_out;/,
    "only an inbound message counts");
  assert.match(sql, /v_grant\s*:=\s*v_is_msg_in and not v_suppressed;/,
    "a suppressed number never gets consent back from a later text");
  assert.match(sql, /and sms_unsubscribed_at is null/,
    "an explicit STOP is never undone by a later inbound message");
  assert.match(sql, /marketing_email_consent[\s\S]{0,400}?false, v_consent/,
    "email consent stays false: an inbound text is not an email address");
});

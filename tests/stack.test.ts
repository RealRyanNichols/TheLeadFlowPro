import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { STACK_VERSION, enabledModules, validateStackConfig, type StackConfig } from "../stack/lib/config.ts";
import { buildOwnerDashboard } from "../stack/lib/dashboard.ts";
import { applyStripeEvent, paymentActions, redirectState, type Ledger } from "../stack/lib/payments.ts";
import { applyStop, findPerson, isStopMessage, normalizePhone, setStatus, upsertPerson, type Person } from "../stack/lib/people.ts";
import { portalView, updateOwnPreferences } from "../stack/lib/portal.ts";
import { envExample, ownershipList, provisioningPlan } from "../stack/lib/provision.ts";
import { decideStep, enroll, recordReply, runSequences, withinSendWindow, type Enrollment } from "../stack/lib/sequences.ts";
import { runDemo } from "../scripts/stack-demo.ts";

const fixture = (): StackConfig => JSON.parse(readFileSync(join(process.cwd(), "stack/clients/fixture-fitness-club.json"), "utf8"));
const ids = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const T0 = new Date("2026-09-07T15:00:00Z"); // Monday 10:00 a.m. Central
const at = (days: number, hourUtc = 15) => new Date(T0.getTime() + days * 86_400_000 + (hourUtc - 15) * 3_600_000);

test("the fixture validates, is fictional, and names no LeadFlow Pro contact details", () => {
  const c = fixture();
  assert.equal(c.stackVersion, STACK_VERSION);
  assert.deepEqual(validateStackConfig(c), []);
  assert.deepEqual(enabledModules(c), ["crm", "sequences", "portal", "dashboard", "payments"]);
  const text = JSON.stringify(c);
  assert.ok(text.includes("fictional"));
  assert.ok(!text.includes("500-8898") && !text.includes("theleadflowpro.com"));
});

test("invalid configs are refused with paths", () => {
  const c = fixture();
  c.modules.crm = false;
  c.accounts.stripeAccountId = "sk_live_nope";
  c.consent.quietHours = { start: 0, end: 24 };
  c.sequences[0].steps = [{ day: 3, channel: "sms", templateId: "a" }, { day: 1, channel: "sms", templateId: "b" }];
  c.launch = { status: "live" };
  const paths = validateStackConfig(c).map((p) => p.path);
  for (const expected of ["modules.crm", "accounts.stripeAccountId", "consent.quietHours", "sequences[0].steps[1].day", "launch"]) assert.ok(paths.includes(expected), expected);
  assert.equal(validateStackConfig("nope").length, 1);
});

test("one record per person: phone or email matches merge, consent only rises through a form, and a STOP is global", () => {
  const people: Person[] = [];
  const id = ids();
  const a = upsertPerson(people, { name: "Rowan Vale", phone: "(903) 555-0101", email: "Rowan@Example.com", source: "form", consentSms: true }, at(0), id);
  const b = upsertPerson(people, { phone: "+1 903 555 0101", source: "walk_in", consentEmail: true, tags: ["walk-in"] }, at(0), id);
  const c = upsertPerson(people, { name: "Someone", email: "rowan@example.com", source: "call", consentSms: false }, at(1), id);
  assert.equal(people.length, 1);
  assert.equal(a.created, true);
  assert.equal(b.created, false);
  assert.equal(c.created, false);
  assert.equal(a.person.phone, "+19035550101");
  assert.equal(a.person.email, "rowan@example.com");
  assert.equal(a.person.consentSms, true, "a later submission without the box does not remove consent");
  assert.equal(a.person.consentEmail, true);
  assert.equal(a.person.firstSource, "form", "first source is kept");
  assert.deepEqual(b.changed, ["consentEmail", "tags"]);
  assert.equal(normalizePhone("555-0101"), null);
  assert.equal(findPerson(people, { phone: "9035550101" })?.id, a.person.id);
  assert.throws(() => upsertPerson(people, { name: "No address", source: "x" }, at(0), id), /phone or an email/);

  assert.ok(isStopMessage("STOP"));
  assert.ok(isStopMessage("unsubscribe me"));
  assert.ok(!isStopMessage("please don't stop"));
  applyStop(a.person, at(2));
  assert.equal(a.person.consentSms, false);
  assert.equal(a.person.consentEmail, false);
  assert.equal(a.person.status, "do_not_contact");
  const after = upsertPerson(people, { phone: "9035550101", source: "form", consentSms: true, consentEmail: true }, at(3), id);
  assert.equal(after.person.consentSms, false, "a form cannot undo a STOP");
  assert.throws(() => setStatus(a.person, "customer", at(3)), /stays that way/);
});

test("sequences: consent and address are checked at send time, steps skip and move on, replies and STOP end the sequence", () => {
  const config = fixture();
  const seq = config.sequences[0];
  const id = ids();
  const people: Person[] = [];
  const noSms = upsertPerson(people, { name: "Sky", phone: "9035550102", email: "sky@example.com", source: "form", consentEmail: true }, at(0), id).person;
  const noPhone = upsertPerson(people, { name: "Tatum", email: "tatum@example.com", source: "form", consentSms: true, consentEmail: true }, at(0), id).person;
  const full = upsertPerson(people, { name: "Rowan", phone: "9035550101", email: "rowan@example.com", source: "form", consentSms: true, consentEmail: true }, at(0), id).person;
  let enrollments = [noSms, noPhone, full].map((p) => enroll(p, seq, at(0), id)!).filter(Boolean);
  const sent = new Set<string>();

  let r = runSequences(config, people, enrollments, sent, at(0));
  enrollments = r.enrollments;
  assert.deepEqual(r.sends.map((s) => [people.find((p) => p.id === s.personId)!.name, s.channel]), [["Rowan", "sms"]]);
  assert.deepEqual(r.skipped.map((s) => s.reason).sort(), ["no_address", "no_consent"]);
  assert.ok(enrollments.every((e) => e.nextStep === 1), "a skipped step is not held for later");
  for (const s of r.sends) sent.add(s.dedupeKey);

  r = runSequences(config, people, enrollments, sent, at(0));
  assert.equal(r.sends.length, 0, "re-running the same instant sends nothing");

  r = runSequences(config, people, r.enrollments, sent, at(2));
  enrollments = r.enrollments;
  assert.deepEqual(r.sends.map((s) => [people.find((p) => p.id === s.personId)!.name, s.channel]).sort(), [["Rowan", "email"], ["Sky", "email"], ["Tatum", "email"]]);
  for (const s of r.sends) sent.add(s.dedupeKey);
  assert.ok(r.sends.every((s) => s.dedupeKey === `seq:${s.enrollmentId}:1`));

  enrollments = recordReply(enrollments, noSms.id, at(3));
  applyStop(noPhone, at(3));
  r = runSequences(config, people, enrollments, sent, at(6));
  enrollments = r.enrollments;
  assert.deepEqual(r.sends.map((s) => people.find((p) => p.id === s.personId)!.name), ["Rowan"]);
  const bySky = enrollments.find((e) => e.personId === noSms.id)!;
  const byTatum = enrollments.find((e) => e.personId === noPhone.id)!;
  assert.equal(bySky.endedReason, "replied");
  assert.equal(byTatum.endedReason, "stopped");
  assert.equal(enrollments.find((e) => e.personId === full.id)!.endedReason, "completed");

  // A person who asked not to be contacted cannot be enrolled at all.
  assert.equal(enroll(noPhone, seq, at(7), id), null);
  // Module off: nothing decides to send.
  const off = { ...config, modules: { ...config.modules, sequences: false } };
  assert.deepEqual(decideStep(off, seq, enrollments[0], full, at(8)), { skip: "module_off" });
});

test("quiet hours: a due step at 2 a.m. Central is planned for 8 a.m. Central, never sent in the night", () => {
  const config = fixture();
  const night = new Date("2026-09-08T07:00:00Z"); // 2:00 a.m. Central
  const shifted = withinSendWindow(night, "America/Chicago", config.consent.quietHours);
  assert.equal(shifted.toISOString(), "2026-09-08T13:00:00.000Z");
  const noon = new Date("2026-09-08T17:00:00Z");
  assert.equal(withinSendWindow(noon, "America/Chicago", config.consent.quietHours).toISOString(), noon.toISOString());
  const id = ids();
  const people: Person[] = [];
  const p = upsertPerson(people, { name: "R", phone: "9035550101", source: "form", consentSms: true }, night, id).person;
  const e = enroll(p, config.sequences[0], night, id)!;
  const d = decideStep(config, config.sequences[0], e, p, night);
  assert.ok("send" in d && d.send.sendAt === "2026-09-08T13:00:00.000Z");
});

test("payments: Stripe events apply exactly once, a redirect proves nothing, and failures become private actions", () => {
  const ledger: Ledger = { payments: [], appliedEventIds: new Set() };
  const id = ids();
  const ev = { id: "evt_1", type: "checkout.session.completed", created: 1, data: { object: { id: "cs_1", amount_total: 4900, currency: "usd", payment_status: "paid", customer_details: { email: "rowan@example.com" } } } };
  const first = applyStripeEvent(ledger, ev, at(0), id);
  assert.equal(first.applied, true);
  assert.equal(first.payment?.status, "paid");
  assert.equal(first.payment?.amountCents, 4900);
  assert.equal(first.personEmail, "rowan@example.com");
  assert.deepEqual(applyStripeEvent(ledger, ev, at(0), id), { applied: false, reason: "duplicate" });
  assert.equal(ledger.payments.length, 1);
  const unpaid = applyStripeEvent(ledger, { ...ev, id: "evt_2", data: { object: { ...ev.data.object, id: "cs_2", payment_status: "unpaid" } } }, at(0), id);
  assert.equal(unpaid.payment?.status, "pending");
  applyStripeEvent(ledger, { id: "evt_3", type: "charge.refunded", created: 3, data: { object: { id: "ch_1", payment_intent: "cs_1", amount_refunded: 4900, currency: "usd" } } }, at(1), id);
  assert.equal(ledger.payments[0].status, "refunded");
  assert.equal(applyStripeEvent(ledger, { id: "evt_4", type: "customer.created", created: 4, data: { object: {} } }, at(1), id).reason, "ignored_type");
  applyStripeEvent(ledger, { id: "evt_5", type: "invoice.payment_failed", created: 5, data: { object: { id: "in_1", amount_due: 4900, currency: "usd" } } }, at(2), id);
  assert.equal(redirectState().status, "pending_verification");
  const actions = paymentActions(ledger.payments);
  assert.equal(actions.length, 1);
  assert.ok(actions[0].text.includes("privately"));
  assert.ok(!JSON.stringify(ledger).includes("card"), "no card data ever");
});

test("portal: a member sees only their own rows and can change only their own preferences", () => {
  const config = fixture();
  const id = ids();
  const people: Person[] = [];
  const me = upsertPerson(people, { name: "Me", email: "me@example.com", source: "form", consentEmail: true }, at(0), id).person;
  const other = upsertPerson(people, { name: "Other", email: "other@example.com", source: "form" }, at(0), id).person;
  const data = {
    people,
    payments: [
      { id: "p1", personId: me.id, providerId: "cs_1", amountCents: 100, currency: "USD", status: "paid" as const, description: "Mine", lastEventId: "e", createdAt: "x", updatedAt: "x" },
      { id: "p2", personId: other.id, providerId: "cs_2", amountCents: 999, currency: "USD", status: "paid" as const, description: "Theirs", lastEventId: "e", createdAt: "x", updatedAt: "x" },
    ],
    messages: [
      { id: "m1", personId: me.id, channel: "sms" as const, direction: "out" as const, body: "hi me", at: "x" },
      { id: "m2", personId: other.id, channel: "sms" as const, direction: "out" as const, body: "hi other", at: "x" },
    ],
    documents: [{ id: "d1", personId: other.id, title: "Their waiver", url: "/x", issuedAt: "x" }],
  };
  const view = portalView(config, data, me.id);
  assert.equal(view.profile?.name, "Me");
  assert.deepEqual(view.payments.map((p) => p.description), ["Mine"]);
  assert.deepEqual(view.messages.map((m) => m.body), ["hi me"]);
  assert.deepEqual(view.documents, []);
  assert.ok(!JSON.stringify(view).includes("other@example.com"));
  const limited = { ...config, portal: { shows: ["profile" as const] } };
  assert.deepEqual(portalView(limited, data, me.id).payments, []);
  assert.throws(() => portalView({ ...config, modules: { ...config.modules, portal: false } }, data, me.id), /portal module is off/);
  assert.throws(() => updateOwnPreferences(other, me.id, { textsOn: true }, at(1)), /own preferences/);
  applyStop(me, at(1));
  updateOwnPreferences(me, me.id, { emailsOn: true }, at(2));
  assert.equal(me.consentEmail, true);
  assert.equal(me.stoppedAt, null, "opting back in is the person's own act");
});

test("owner dashboard counts only what the rows say", () => {
  const r = runDemo(fixture());
  assert.equal(r.dashboard.people.total, 3);
  assert.equal(r.dashboard.people.doNotContact, 1);
  assert.equal(r.dashboard.money?.paidCents, 4900);
  assert.equal(r.dashboard.money?.failed, 1);
  assert.ok(r.dashboard.actions.some((a) => a.includes("privately")));
  assert.equal(r.mergedTwin, true);
  assert.equal(r.duplicateEvent.applied, false);
  assert.deepEqual(r.skyPortal.payments, []);
  assert.equal(r.rowanPortal.payments.length, 1);
  const noPay = buildOwnerDashboard({ ...fixture(), modules: { ...fixture().modules, payments: false } }, r.people, r.enrollments, [], r.ledger.payments);
  assert.equal(noPay.money, null);
});

test("provisioning: every step names the client's account, env names only, and ownership goes to the client", () => {
  const c = fixture();
  const plan = provisioningPlan(c);
  assert.ok(plan.length >= 8);
  assert.ok(plan.every((s) => s.account.startsWith("client_") || s.account === "leadflow"));
  assert.ok(plan.some((s) => s.migrations.includes("schema/001_core.sql")));
  assert.ok(plan.some((s) => s.migrations.includes("schema/004_payments.sql")));
  const env = envExample(c);
  assert.ok(env.split("\n").filter((l) => l && !l.startsWith("#")).every((l) => /^[A-Z_]+=$/.test(l)));
  assert.ok(env.includes("STRIPE_WEBHOOK_SECRET="));
  const owns = ownershipList(c);
  assert.ok(owns[0].includes(c.accounts.supabaseProjectRef) && owns[0].includes(c.business.name));
  assert.ok(owns[1].includes(c.accounts.vercelProject) && owns[1].includes(c.business.name));
  assert.ok(owns.some((o) => o.includes(c.accounts.stripeAccountId!) && o.includes("never holds funds")));
  assert.ok(owns.some((o) => o.includes("The LeadFlow Pro keeps the configuration file")));
  const noPay = { ...c, modules: { ...c.modules, payments: false } };
  assert.ok(!provisioningPlan(noPay).some((s) => s.account === "client_stripe"));
  assert.ok(!envExample(noPay).includes("STRIPE"));
  assert.throws(() => provisioningPlan({ ...c, slug: "Bad Slug" }), /not valid/);
});

test("schema: every table has RLS, browser roles get select at most, and payments store provider ids only", () => {
  const dir = join(process.cwd(), "stack/schema");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  assert.deepEqual(files, ["001_core.sql", "002_sequences.sql", "003_portal.sql", "004_payments.sql", "005_scoreboard.sql"]);
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
    for (const t of tables) {
      assert.ok(sql.includes(`alter table public.${t} enable row level security`), `${f}: ${t} RLS`);
      assert.ok(sql.includes(`public.${t}`) && /revoke all on table[\s\S]*from anon, authenticated/.test(sql), `${f}: ${t} revoke`);
    }
    assert.ok(!/grant (insert|delete)/i.test(sql), `${f}: no browser insert or delete`);
    if (f === "005_scoreboard.sql") {
      assert.ok(sql.includes("security definer") && sql.includes("grant execute on function public.scoreboard_public_daily(integer) to anon"), "aggregate feed callable with the publishable key");
      assert.ok(!/select\s+\*\s+from public\.people/i.test(sql), "the feed never returns person rows");
    }
    assert.ok(!/card_number|cvv|pan\b/i.test(sql), `${f}: no card fields`);
  }
  const core = readFileSync(join(dir, "001_core.sql"), "utf8");
  assert.ok(core.includes("people_phone_idx") && core.includes("people_email_idx"), "one person per phone and per email");
  const seq = readFileSync(join(dir, "002_sequences.sql"), "utf8");
  assert.ok(seq.includes("dedupe_key text not null unique"));
});

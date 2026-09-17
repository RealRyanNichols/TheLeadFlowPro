// Run the Company OS stack end to end on fictional data and print what the
// owner would see. No database, no accounts, no sends.
//
//   npm run stack:demo
//   npm run stack:demo -- --config stack/clients/fixture-fitness-club.json --plan

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateStackConfig, type StackConfig } from "../stack/lib/config.ts";
import { buildOwnerDashboard } from "../stack/lib/dashboard.ts";
import { applyStripeEvent, type Ledger } from "../stack/lib/payments.ts";
import { applyStop, isStopMessage, setStatus, upsertPerson, type Person } from "../stack/lib/people.ts";
import { portalView } from "../stack/lib/portal.ts";
import { envExample, ownershipList, provisioningPlan } from "../stack/lib/provision.ts";
import { enroll, recordReply, runSequences, type Enrollment } from "../stack/lib/sequences.ts";

export type DemoResult = ReturnType<typeof runDemo>;

export function runDemo(config: StackConfig) {
  let n = 0;
  const newId = () => `id-${++n}`;
  const t0 = new Date("2026-09-07T15:00:00Z"); // Monday 10:00 a.m. Central
  const day = (d: number, hourUtc = 15) => new Date(t0.getTime() + d * 86_400_000 + (hourUtc - 15) * 3_600_000);

  const people: Person[] = [];
  const trial = config.sequences.find((s) => s.id === "trial-follow-up")!;
  const welcome = config.sequences.find((s) => s.id === "new-member-welcome")!;

  // Day 0: three trial visitors sign the form. One arrives twice (same phone, different email casing).
  const a = upsertPerson(people, { name: "Rowan Vale", phone: "(903) 555-0101", email: "Rowan@Example.com", source: "trial_form", consentSms: true, consentEmail: true }, day(0), newId);
  const b = upsertPerson(people, { name: "Sky Moreno", phone: "903-555-0102", email: "sky@example.com", source: "trial_form", consentSms: false, consentEmail: true }, day(0), newId);
  const c = upsertPerson(people, { name: "Tatum Reed", email: "tatum@example.com", source: "trial_form", consentSms: true, consentEmail: true }, day(0), newId);
  const aAgain = upsertPerson(people, { name: "Rowan Vale", phone: "+19035550101", email: "rowan@example.com", source: "walk_in", tags: ["walk-in"] }, day(0, 18), newId);

  let enrollments: Enrollment[] = [a.person, b.person, c.person].map((p) => enroll(p, trial, day(0), newId)).filter((e): e is Enrollment => e !== null);
  const sent = new Set<string>();
  const log: string[] = [];

  const pass = (at: Date, label: string) => {
    const r = runSequences(config, people, enrollments, sent, at);
    enrollments = r.enrollments;
    for (const s of r.sends) sent.add(s.dedupeKey);
    log.push(`${label}: ${r.sends.length} send(s) [${r.sends.map((s) => `${people.find((p) => p.id === s.personId)?.name} ${s.channel}/${s.templateId}`).join("; ")}]${r.skipped.length ? ` skipped ${r.skipped.map((x) => x.reason).join(",")}` : ""}`);
    return r;
  };

  pass(day(0), "day 0 10:00");
  pass(day(0), "day 0 10:00 re-run"); // idempotent: nothing goes twice
  // Day 1: Tatum texts STOP. Day 2: the email step goes to Rowan and Sky (Sky never consented to texts).
  if (isStopMessage("STOP please", config.consent.stopWords)) applyStop(c.person, day(1));
  pass(day(2), "day 2 10:00");
  // Day 2, later: Sky replies to the email, which ends the trial sequence for Sky.
  enrollments = recordReply(enrollments, b.person.id, day(2, 20));
  // Day 3: Rowan joins. Trial sequence stops on member; welcome sequence starts.
  setStatus(a.person, "member", day(3));
  const w = enroll(a.person, welcome, day(3), newId);
  if (w) enrollments.push(w);
  pass(day(3, 2), "day 3 02:00 (quiet hours)"); // send is planned but shifted into the window
  pass(day(6), "day 6 10:00");
  pass(day(10), "day 10 10:00");

  // Payments: the client's Stripe sends a checkout event twice and a refund once.
  const ledger: Ledger = { payments: [], appliedEventIds: new Set() };
  const checkout = { id: "evt_1", type: "checkout.session.completed", created: 1, data: { object: { id: "cs_1", amount_total: 4900, currency: "usd", payment_status: "paid", customer_details: { email: "rowan@example.com" } } } };
  const first = applyStripeEvent(ledger, checkout, day(3), newId);
  const dup = applyStripeEvent(ledger, checkout, day(3), newId);
  if (first.payment && first.personEmail) first.payment.personId = people.find((p) => p.email === first.personEmail)?.id ?? null;
  applyStripeEvent(ledger, { id: "evt_2", type: "invoice.payment_failed", created: 2, data: { object: { id: "in_9", amount_due: 4900, currency: "usd" } } }, day(8), newId);

  const dashboard = buildOwnerDashboard(config, people, enrollments, [], ledger.payments);
  const rowanPortal = portalView(config, { people, payments: ledger.payments, messages: [], documents: [] }, a.person.id);
  const skyPortal = portalView(config, { people, payments: ledger.payments, messages: [], documents: [] }, b.person.id);

  return { people, enrollments, sent: [...sent], log, ledger, duplicateEvent: dup, dashboard, rowanPortal, skyPortal, mergedTwin: !aAgain.created };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("stack-demo.ts")) {
  const path = arg("config") ?? "stack/clients/fixture-fitness-club.json";
  const config = JSON.parse(readFileSync(resolve(path), "utf8")) as StackConfig;
  const problems = validateStackConfig(config);
  if (problems.length) {
    for (const p of problems) console.error(`${p.path}: ${p.message}`);
    process.exit(1);
  }
  if (process.argv.includes("--plan")) {
    for (const s of provisioningPlan(config)) console.log(`${s.n}. [${s.account}] ${s.title}\n   ${s.detail}\n   env: ${s.env.join(", ") || "none"}; migrations: ${s.migrations.join(", ") || "none"}\n   check: ${s.check}`);
    console.log("\n" + envExample(config));
    for (const o of ownershipList(config)) console.log(`- ${o}`);
    process.exit(0);
  }
  const r = runDemo(config);
  console.log(`SAMPLE DATA. ${config.business.name}. Nothing here is real.\n`);
  for (const line of r.log) console.log(line);
  console.log(`\nSecond identical submission merged into one person: ${r.mergedTwin}`);
  console.log(`Duplicate Stripe event applied: ${r.duplicateEvent.applied} (${r.duplicateEvent.reason})`);
  console.log("\nOWNER DASHBOARD");
  console.log(JSON.stringify(r.dashboard, null, 2));
  console.log("\nPORTAL, as Rowan:");
  console.log(JSON.stringify(r.rowanPortal, null, 2));
  console.log("\nPORTAL, as Sky (sees no payments):");
  console.log(JSON.stringify(r.skyPortal.payments));
}

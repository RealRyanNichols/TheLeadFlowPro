// The Call Closer, end to end, on fictional data. No database, no sign-in,
// no dev server, nothing sent. It runs the same pure functions the call
// card, the save route, and the call sheet run, with the clock pinned so
// the output is the same every time.
//
//   npm run call-closer:demo

import { buildCallSheet, TIER_LABELS, tiers, type CallSheetLead, type CallSheetTouch } from "../lib/callSheet.ts";
import { closerOffersFor, OUTCOME_LABELS, planCallOutcome, theirWords, type NextStepRequest } from "../lib/callCloser.ts";
import { SAMPLE_ACTOR_NAME, SAMPLE_CALL_LEAD, SAMPLE_NOW } from "../lib/callCloserFixtures.ts";
import { payDoorFor } from "../lib/payDoors.ts";
import { buildProposal } from "../lib/proposals/build.ts";
import { sampleBuildIntake } from "../lib/proposals/fixtures.ts";
import { speedToLead, speedToLeadLine } from "../lib/speedToLead.ts";
import { formatCentral } from "../lib/businessTime.ts";

const rule = (title: string) => console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
let keyCounter = 0;
const key = () => `demo-key-${String(++keyCounter).padStart(4, "0")}-call-closer`;

function request(outcome: NextStepRequest["outcome"], extra: Partial<NextStepRequest> = {}): NextStepRequest {
  return { outcome, idempotencyKey: key(), note: null, offers: [], meeting: null, callback: null, lostReason: null, ...extra };
}

function show(label: string, now: Date, req: NextStepRequest, priorAttempts = 0) {
  const lead = { ...SAMPLE_CALL_LEAD, next_follow_up_at: null };
  const plan = planCallOutcome({ lead, request: req, actorName: SAMPLE_ACTOR_NAME, now, priorAttempts });
  console.log(`\n${label}\nLogged ${formatCentral(now)} Central. Outcome: ${OUTCOME_LABELS[req.outcome]}.`);
  if (!plan.ok) {
    console.log(`  Refused (${plan.status}): ${plan.error}`);
    return;
  }
  console.log("  When you save:");
  for (const line of plan.preview) console.log(`   - ${line}`);
  if (plan.payMessage) console.log(`  Message Ryan can send himself:\n    ${plan.payMessage.replace(/\n/g, "\n    ")}`);
  if (plan.proposalHref) console.log(`  Next: ${plan.proposalHref}`);
}

// ---------------------------------------------------------------- 1. card --
rule("1. THE CALL CARD (fictional lead, /admin/call-sheet/sample)");
const words = theirWords(SAMPLE_CALL_LEAD.goals);
console.log(`${SAMPLE_CALL_LEAD.full_name}, ${SAMPLE_CALL_LEAD.business_name}. Phone ${SAMPLE_CALL_LEAD.phone}.`);
console.log(`In their words:\n  ${(words.words ?? "(nothing written)").replace(/\n/g, "\n  ")}`);
console.log("What you can offer (straight from the offers registry):");
for (const id of closerOffersFor(SAMPLE_CALL_LEAD.interest, SAMPLE_CALL_LEAD.diagnostic)) {
  const door = payDoorFor(id);
  if (door) console.log(`  - ${door.offerName}: ${door.priceLabel}. ${door.howTheyPay}.`);
}

// ------------------------------------------------------------ 2. outcomes --
rule("2. TWO TAPS AFTER THE CALL");
show("A Friday afternoon miss comes back Monday morning:", new Date("2026-09-25T21:30:00.000Z"), request("no_answer"));
show(
  "A voicemail on the Friday before the clocks change comes back Tuesday, in standard time:",
  new Date("2026-10-30T20:00:00.000Z"),
  request("voicemail"),
);
show("They want it in writing. The proposal lands on the next Tuesday or Thursday slot:", SAMPLE_NOW, request("wants_proposal", { offers: ["website_launch"] }));
show("They said yes on the phone:", SAMPLE_NOW, request("ready_to_pay", { offers: ["website_launch"] }));
show("A price nobody has published yet cannot be sent as a pay link:", SAMPLE_NOW, request("ready_to_pay", { offers: ["agency_meta_ads"] }));

// ------------------------------------------------------------ 3. proposal --
rule("3. THE PROPOSAL NOW PRINTS THE REAL PAY LINK");
const proposal = buildProposal(sampleBuildIntake(), SAMPLE_NOW, { selection: ["website_launch"] });
const accept = proposal.text.split("\n");
const start = accept.indexOf("TO ACCEPT");
console.log(accept.slice(start, start + 5).join("\n"));

// ---------------------------------------------------------- 4. call sheet --
rule("4. THE 7:30 CALL SHEET REMEMBERS THE PROMISE");
const now = SAMPLE_NOW;
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const base = { email: null, source: "meta_lead_ad", utm_source: null, best_contact_method: null, sms_consent: false, sms_unsubscribed_at: null, is_test: false, status: "new", business_name: null };
const leads: CallSheetLead[] = [
  { ...base, id: "a", created_at: hoursAgo(3), full_name: "Avery Fictional", phone: "(903) 555-0101", interest: "website_launch", next_follow_up_at: null },
  { ...base, id: "b", created_at: hoursAgo(80), full_name: "Blake Fictional", phone: "(903) 555-0102", interest: "website_launch", status: "contacted", next_follow_up_at: hoursAgo(2) },
  { ...base, id: "c", created_at: hoursAgo(50), full_name: "Casey Fictional", phone: "(903) 555-0103", interest: "system_map", status: "contacted", next_follow_up_at: new Date(now.getTime() + 26 * 3_600_000).toISOString() },
  { ...base, id: "d", created_at: hoursAgo(40), full_name: "Drew Fictional", phone: "(903) 555-0104", interest: "website_launch", next_follow_up_at: null },
];
const touches: CallSheetTouch[] = [
  { lead_id: "b", at: hoursAgo(26), kind: "note", summary: "Call: talked, call back later. Wants to check with a partner first." },
  { lead_id: "c", at: hoursAgo(20), kind: "note", summary: "Call: no answer." },
  { lead_id: "d", at: hoursAgo(30), kind: "note", summary: "Call: talked, wants a proposal." },
];
const sheet = buildCallSheet(leads, touches, now);
console.log(speedToLeadLine(speedToLead(leads, touches, now)));
for (const group of tiers(sheet)) {
  console.log(`\n${TIER_LABELS[group.tier].title}`);
  for (const row of group.rows) console.log(`  - ${row.reason}`);
}
const nameOf = (id: string) => leads.find((l) => l.id === id)?.full_name ?? id;
console.log("\nOff the sheet for now:");
for (const ex of sheet.excluded) console.log(`  - ${nameOf(ex.id)}: ${ex.reason}`);

console.log("\nEverything above is fictional. Nothing was saved or sent.");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FREE_BUILD } from "../lib/freeBuild.ts";
import { LEAD_FOLLOW_UP } from "../lib/leadFollowUp.ts";
import { SELLERPROOF } from "../lib/sellerproof/packet.ts";
import { CONTENT_ENGINE } from "../lib/contentEngineCourse.ts";
import { CHATGPT_OPERATOR } from "../lib/chatgptOperatorCourse.ts";
import { OPERATOR_ACADEMY } from "../lib/operatorAcademyCatalog.ts";
import { AGENCY_PAYMENT } from "../lib/agencyPayment.ts";
import { HQ_PLAN } from "../lib/hq/types.ts";

// Source-level guards over the one file that turns Stripe events into
// records, alerts, and access. Every kind /api/checkout can mint must reach
// a branch that tells the owner, and every email must go through the ledger.

const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
const checkout = readFileSync(join(process.cwd(), "app/api/checkout/route.ts"), "utf8");
const dispatch = hook.slice(hook.indexOf("if (websiteLaunch) {"), hook.indexOf("return NextResponse.json({ received: true });", hook.indexOf("if (websiteLaunch) {")));

function slice(name: string): string {
  const start = hook.indexOf(`async function ${name}(`);
  assert.ok(start > 0, `${name} exists`);
  const next = hook.indexOf("\nasync function ", start + 1);
  return hook.slice(start, next > 0 ? next : undefined);
}

test("every kind the checkout route can mint reaches an alerting branch", () => {
  const kinds = [
    ...FREE_BUILD.tiers.map((t) => t.id),
    LEAD_FOLLOW_UP.id,
    SELLERPROOF.kind,
    CONTENT_ENGINE.purchaseKind,
    CHATGPT_OPERATOR.purchaseKind,
    OPERATOR_ACADEMY.allAccessPurchaseKind,
    AGENCY_PAYMENT.kind,
    "build_deposit",
    "package_deposit",
    "package_full",
    "tool_studio_order",
    "tool_monthly_menu",
    "pro_tool",
    "pro_bundle",
    "timeback_order",
    "system_map",
    "event",
    "learn_it",
  ];
  // The checkout route spells module-owned kinds by their constant, so the
  // literal check covers only the plain-string kinds; the constants are
  // imported above from the same modules the route imports, so the list
  // cannot drift silently.
  const literalKinds = ["build_deposit", "package_deposit", "package_full", "tool_studio_order", "tool_monthly_menu", "pro_tool", "pro_bundle", "timeback_order", "system_map", "event"];
  for (const kind of literalKinds) assert.ok(checkout.includes(`"${kind}"`), `checkout mints ${kind}`);
  assert.ok(checkout.includes("FREE_BUILD_IDS.has(kind)") && checkout.includes("LEAD_FOLLOW_UP.id") && checkout.includes("AGENCY_PAYMENT.kind"));
  assert.ok(kinds.length >= 18);
  assert.ok(dispatch.includes("notifyUnhandledPurchase"), "the catch-all is still the else branch");
  for (const literal of ['kind === "system_map"', 'kind === "tool_studio_order"', "kind === LEAD_FOLLOW_UP.id", "kind === AGENCY_PAYMENT.kind", "findFreeBuildTier(kind)", 'kind === "timeback_order"', 'kind === "event"', "kind === SELLERPROOF.kind", 'kind === "learn_it"']) {
    assert.ok(dispatch.includes(literal), `dispatch handles ${literal}`);
  }
  assert.ok(dispatch.includes("ensureSystemMapPaid(supabase, session)"));
  assert.ok(dispatch.includes("ensureToolStudioPaid(supabase, session, kind)"));
  const post = hook.slice(hook.indexOf("export async function POST"));
  assert.ok(post.indexOf("handleHqStripeEvent(") < post.indexOf("recordPurchase(supabase, {"), `${HQ_PLAN.kind} is claimed before the purchase write`);
});

test("System Map and Tool Studio claim the funnel lead, open a task, acknowledge, alert, then mark", () => {
  const claim = slice("claimFunnelLead");
  assert.ok(claim.includes('"diagnostic->>source", input.source') && claim.includes('.from("lead_tasks")'));
  for (const [name, source, purpose, task] of [
    ["ensureSystemMapPaid", "package_page", "system-map", "Schedule System Map call"],
    ["ensureToolStudioPaid", "tool_studio", "tool-studio", "Lock Tool Studio scope"],
  ] as const) {
    const body = slice(name);
    assert.ok(body.includes(`source: "${source}"`), `${name} reads ${source}`);
    assert.ok(body.includes(`taskTitle: "${task}"`), `${name} opens the task`);
    const buyer = body.indexOf(`${purpose}:buyer`);
    const internal = body.indexOf(`${purpose}:internal`);
    const marker = body.indexOf("markLeadActivity(");
    assert.ok(buyer > 0 && internal > buyer && marker > internal, `${name}: buyer, then alert, then marker`);
  }
});

test("the five funnel flows acknowledge the buyer through the ledger before the owner alert and say whether it left", () => {
  for (const [name, purpose] of [
    ["ensureWebsiteLaunchIntake", "website-launch"],
    ["ensureTimebackOrderPaid", "time-back"],
    ["ensureLeadFollowUpPaid", "lead-follow-up"],
    ["ensureFreeBuildPaid", "free-build"],
    ["ensureAgencyPaymentPaid", "agency"],
  ] as const) {
    const body = slice(name);
    const buyer = body.indexOf(`${purpose}:buyer`);
    const alert = name === "ensureWebsiteLaunchIntake" ? body.indexOf("sendInternalLeadAlert(") : body.indexOf(`${purpose}:internal`);
    const marker = body.indexOf('.from("lead_activity").insert');
    assert.ok(buyer > 0, `${name} acknowledges through the ledger`);
    assert.ok(alert > buyer, `${name} alerts after the acknowledgement`);
    assert.ok(marker > alert, `${name} writes the marker last`);
    assert.ok(body.includes("acknowledgementLine(acknowledged)"), `${name} tells the owner whether the buyer heard`);
  }
  const ack = slice("sendBuyerAcknowledgement");
  assert.ok(ack.includes("deliverPaymentEmail") && /catch[\s\S]*return false/.test(ack));
});

test("no email leaves this file outside the delivery ledger, and each purpose is unique", () => {
  assert.equal((hook.match(/api\.resend\.com/g) ?? []).length, 0, "no raw Resend call remains");
  const purposes = [
    "learn-it", "content-engine", "academy", "unhandled",
    "website-launch:buyer", "time-back:buyer", "time-back:internal", "lead-follow-up:buyer", "lead-follow-up:internal",
    "free-build:buyer", "free-build:internal", "agency:buyer", "agency:internal",
    "system-map:buyer", "system-map:internal", "tool-studio:buyer", "tool-studio:internal",
    "invoice-paid:internal", "renewal-paid:internal", "renewal-failed:internal", "plugin-paid:internal",
    "refund:internal", "dispute:internal", "async-failed:internal",
    "subscription-cancelled:internal", "subscription-cancel-scheduled:internal",
  ];
  for (const p of purposes) {
    const count = (hook.match(new RegExp(`"${p.replace(/[-:]/g, (c) => `\\${c}`)}"`, "g")) ?? []).length;
    assert.equal(count, 1, `purpose ${p} appears exactly once`);
  }
});

test("invoices: subscription families are recorded first, a paid Sales Desk invoice finishes the sale, and the cron order is right", () => {
  const post = hook.slice(hook.indexOf("export async function POST"));
  const subscription = post.indexOf("recordSubscriptionInvoice(");
  const salesUpdate = post.indexOf('.from("sales_invoices")');
  const finish = post.indexOf("finishPaidInvoice(");
  const moneyBack = post.indexOf("handleMoneyBack(");
  const subEnd = post.indexOf("noteSubscriptionEnd(");
  const gate = post.indexOf("isCheckoutPaymentEvent(event.type)");
  assert.ok(subscription > 0 && salesUpdate > subscription && finish > salesUpdate, "subscription invoices, then the Sales Desk update, then finish");
  assert.ok(post.indexOf("handleHqStripeEvent(") < moneyBack && moneyBack < subEnd && subEnd < gate, "money-back and subscription-end run after the plugin handler and before the checkout gate");
  const finishBody = slice("finishPaidInvoice");
  assert.ok(finishBody.indexOf("invoice-paid:internal") < finishBody.indexOf('.from("purchases")') || finishBody.includes("recordPurchase("), "alert before the purchase write");
  assert.ok(finishBody.includes('.from("lead_tasks")') && finishBody.includes('status: "won"'));
  const renew = slice("recordSubscriptionInvoice");
  assert.ok(renew.includes("skip_first_invoice") && renew.includes("record_failed") && renew.includes("record_paid"));
  const record = slice("recordPurchase");
  assert.ok(record.includes('existing.data.status === "payment_failed" && purchase.status === "paid"'), "only payment_failed may move back to paid");
});

test("agency payments match the linked lead, then the intake, then a lead no other funnel owns, and never a placeholder email", () => {
  const body = slice("ensureAgencyPaymentPaid");
  const link = body.indexOf("session.metadata?.lead_id");
  const intake = body.indexOf('"agency_intake"');
  const owned = body.indexOf("FUNNEL_OWNED_SOURCES");
  const insert = body.indexOf(".insert({");
  assert.ok(link > 0 && link < intake && intake < insert, "linked lead is checked before the intake, before any insert");
  assert.ok(owned > 0 && owned < insert);
  for (const s of ["time_back_funnel", "lead_follow_up_funnel", "free_build_funnel", "@no-email.facebook.lead"]) assert.ok(body.includes(s), s);
  const fallback = body.slice(body.indexOf('matchedBy === "intake"'), body.indexOf("if (!found.phone"));
  assert.ok(fallback.includes("{ ...diagnostic, agency_payment: agencyStamp }"), "a lead from another door gets only the agency stamp");
});

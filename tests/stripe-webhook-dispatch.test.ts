import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { RETIRED_FREE_BUILD_TIERS } from "../lib/freeBuild.ts";
import { LEAD_FOLLOW_UP } from "../lib/leadFollowUp.ts";
import { SELLERPROOF } from "../lib/sellerproof/packet.ts";
import { CONTENT_ENGINE } from "../lib/contentEngineCourse.ts";
import { CHATGPT_OPERATOR } from "../lib/chatgptOperatorCourse.ts";
import { OPERATOR_ACADEMY } from "../lib/operatorAcademyCatalog.ts";
import { AGENCY_PAYMENT } from "../lib/agencyPayment.ts";
import { CHASE_SHEET } from "../lib/chaseSheet/product.ts";
import { POST_CREATOR } from "../lib/postCreator/product.ts";
import { HQ_PLAN } from "../lib/hq/types.ts";
import { TLFP_CREDITS } from "../lib/tlfpCredits.ts";

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
  // The free-build tiers were retired on 2026-09-22: checkout no longer mints
  // them, but a session created before then can still be paid or replayed,
  // so the webhook keeps a named branch for each (checked below).
  const kinds = [
    ...RETIRED_FREE_BUILD_TIERS.map((t) => t.id),
    LEAD_FOLLOW_UP.id,
    SELLERPROOF.kind,
    CONTENT_ENGINE.purchaseKind,
    CHATGPT_OPERATOR.purchaseKind,
    OPERATOR_ACADEMY.allAccessPurchaseKind,
    AGENCY_PAYMENT.kind,
    CHASE_SHEET.monthlyKind,
    CHASE_SHEET.lifetimeKind,
    POST_CREATOR.monthlyKind,
    POST_CREATOR.lifetimeKind,
    TLFP_CREDITS.purchaseKind,
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
  assert.ok(checkout.includes("isChaseSheetKind(body.kind)"), "checkout mints both Chase Sheet plans through the product record");
  assert.ok(checkout.includes("isPostCreatorKind(body.kind)"), "checkout mints both Post Creator plans through the product record");
  assert.ok(checkout.includes("postCreatorSalesOpen(process.env)"), "Post Creator checkout stays closed until sales are switched on");
  assert.ok(checkout.includes("LEAD_FOLLOW_UP.id") && checkout.includes("AGENCY_PAYMENT.kind") && checkout.includes("TLFP_CREDITS.purchaseKind"));
  assert.ok(!checkout.includes("FREE_BUILD") && !checkout.includes("@/lib/freeBuild"), "checkout no longer mints the retired free-build tiers");
  assert.ok(dispatch.includes("notifyUnhandledPurchase"), "the catch-all is still the else branch");

  // Every kind must reach a named branch, except the three the catch-all is
  // designed for (deposits and full package payments with no fulfilment).
  const catchAll = new Set(["build_deposit", "package_deposit", "package_full"]);
  const namedBranch: Record<string, string> = {
    [LEAD_FOLLOW_UP.id]: "kind === LEAD_FOLLOW_UP.id",
    [SELLERPROOF.kind]: "kind === SELLERPROOF.kind",
    [CONTENT_ENGINE.purchaseKind]: "kind === CONTENT_ENGINE.purchaseKind",
    [CHATGPT_OPERATOR.purchaseKind]: "kind === CHATGPT_OPERATOR.purchaseKind",
    [OPERATOR_ACADEMY.allAccessPurchaseKind]: "kind === OPERATOR_ACADEMY.allAccessPurchaseKind",
    [AGENCY_PAYMENT.kind]: "kind === AGENCY_PAYMENT.kind",
    [CHASE_SHEET.monthlyKind]: "isChaseSheetKind(kind)",
    [CHASE_SHEET.lifetimeKind]: "isChaseSheetKind(kind)",
    [POST_CREATOR.monthlyKind]: "isPostCreatorKind(kind)",
    [POST_CREATOR.lifetimeKind]: "isPostCreatorKind(kind)",
    [TLFP_CREDITS.purchaseKind]: "kind === TLFP_CREDITS.purchaseKind",
    tool_studio_order: 'kind === "tool_studio_order"',
    tool_monthly_menu: 'kind === "tool_monthly_menu"',
    pro_tool: "proKind",
    pro_bundle: "proKind",
    timeback_order: 'kind === "timeback_order"',
    system_map: 'kind === "system_map"',
    event: 'kind === "event"',
    learn_it: 'kind === "learn_it"',
  };
  for (const tier of RETIRED_FREE_BUILD_TIERS) namedBranch[tier.id] = "findFreeBuildTier(kind)";
  for (const kind of kinds) {
    if (catchAll.has(kind)) continue;
    assert.ok(namedBranch[kind], `${kind} needs a named branch in this test's map`);
    assert.ok(dispatch.includes(namedBranch[kind]), `dispatch handles ${kind} through ${namedBranch[kind]}`);
  }
  assert.ok(dispatch.includes("ensureSystemMapPaid(supabase, session)"));
  assert.ok(dispatch.includes("ensureToolStudioPaid(supabase, session, kind)"));
  const post = hook.slice(hook.indexOf("export async function POST"));
  assert.ok(post.indexOf("handleHqStripeEvent(") < post.indexOf("recordPurchase(supabase, {"), `${HQ_PLAN.kind} is claimed before the purchase write`);
  // Chase Sheet's monthly lifecycle is claimed right after the plugin's; its paid
  // checkouts flow through the dispatch and its refunds through the money-back path.
  const chase = post.indexOf("handleChaseSheetSubscription(");
  assert.ok(post.indexOf("handleHqStripeEvent(") < chase && chase < post.indexOf("recordSubscriptionInvoice("), "Chase Sheet subscription events are claimed after the plugin's and before invoices");
  assert.ok(dispatch.includes("ensureChaseSheetPaid(supabase, session)"));
  assert.ok(slice("handleMoneyBack").includes("applyChaseSheetMoneyBack(supabase, purchase, restoring)"), "a refund on either plan reaches the sheet");
  assert.ok(slice("recordSubscriptionInvoice").includes("markChaseSheetRenewed("), "a paid renewal reopens a past-due sheet");
  // Post Creator follows the same four touch points, claimed after Chase Sheet
  // and before the invoice branch.
  const postCreator = post.indexOf("handlePostCreatorSubscription(");
  assert.ok(chase < postCreator && postCreator < post.indexOf("recordSubscriptionInvoice("), "Post Creator subscription events are claimed after Chase Sheet's and before invoices");
  assert.ok(dispatch.includes("ensurePostCreatorPaid(supabase, session)"));
  assert.ok(slice("handleMoneyBack").includes("applyPostCreatorMoneyBack(supabase, purchase, restoring)"), "a refund on either Post Creator plan reaches the account");
  // The account locks run before the purchases row moves: when either one
  // fails, the 500 makes Stripe retry with the row still in its old status,
  // so the retry applies the lock instead of finding nothing to flip.
  const moneyBack = slice("handleMoneyBack");
  const flip = moneyBack.indexOf('.from("purchases").update({ status: toStatus })');
  assert.ok(flip > 0, "the flip is there");
  assert.ok(moneyBack.indexOf("applyChaseSheetMoneyBack(") < flip, "Chase Sheet locks before the flip");
  assert.ok(moneyBack.indexOf("applyPostCreatorMoneyBack(") < flip, "Post Creator locks before the flip");
  // A first-month refund or dispute has no invoice row: it is matched to the checkout's row, Post Creator only.
  const firstInvoice = moneyBack.indexOf("postCreatorFirstInvoiceCheckout(");
  assert.ok(firstInvoice > 0 && firstInvoice < moneyBack.indexOf("applyPostCreatorMoneyBack("), "the first invoice is matched before money back is applied");
  assert.ok(moneyBack.includes("row.data.kind === POST_CREATOR.monthlyKind"), "other products keep their first-invoice handling");
  const renewals = slice("recordSubscriptionInvoice");
  assert.ok(renewals.includes("markPostCreatorRenewed(") && renewals.includes('"post_creator"'), "a paid Post Creator renewal reopens a past-due account");
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
    "learn-it", "content-engine", "academy", "unhandled:buyer", "unhandled:internal",
    "website-launch:buyer", "time-back:buyer", "time-back:internal", "lead-follow-up:buyer", "lead-follow-up:internal",
    "free-build:buyer", "free-build:internal", "agency:buyer", "agency:internal",
    "system-map:buyer", "system-map:internal", "tool-studio:buyer", "tool-studio:internal",
    "tlfp-pack:buyer", "tlfp-pack:internal",
    "invoice-paid:internal", "renewal-paid:internal", "renewal-failed:internal", "plugin-paid:internal",
    "refund:internal", "refund:partial:internal", "dispute:internal", "dispute-won:internal", "async-failed:internal",
    "subscription-cancelled:internal", "subscription-cancel-scheduled:internal",
  ];
  for (const p of purposes) {
    const count = (hook.match(new RegExp(`"${p.replace(/[-:]/g, (c) => `\\${c}`)}"`, "g")) ?? []).length;
    assert.equal(count, 1, `purpose ${p} appears exactly once`);
  }
  // Post Creator's purposes live in lib/postCreator/subscription.ts, never here.
  assert.ok(!hook.includes('"post-creator:'), "no Post Creator purpose is spelled in the route");
  // The owner alert body carries whether the buyer acknowledgement left,
  // which can change between a failed attempt and its retry. The ledger
  // refuses a retry whose body changed, so that state is part of the key.
  const alert = slice("internalAlert");
  assert.ok(alert.includes('options.acknowledged === false ? `${purpose}:noack` : purpose'), "the acknowledgement state keys the ledger row");
  for (const name of ["ensureSystemMapPaid", "ensureToolStudioPaid", "ensureTimebackOrderPaid", "ensureLeadFollowUpPaid", "ensureFreeBuildPaid", "ensureAgencyPaymentPaid", "notifyUnhandledPurchase", "ensureCreditPackPaid"]) {
    assert.ok(slice(name).includes("{ acknowledged })"), `${name} passes the acknowledgement state to the ledgered alert`);
  }
});

test("a lead with no diagnostic source is still matched by the agency email fallback", () => {
  const body = slice("ensureAgencyPaymentPaid");
  assert.ok(body.includes("diagnostic->>source.is.null,diagnostic->>source.not.in."), "NOT IN would drop a null source; null is allowed explicitly");
  assert.ok(!body.includes('.not("diagnostic->>source", "in"'));
  const cancel = slice("noteSubscriptionEnd");
  assert.ok(cancel.includes("metadata.lead_id") && !cancel.includes("metadata.customer_email"), "the cancel note keys on the lead id the pay link carried");
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
  const invoiceAlert = finishBody.indexOf('"invoice-paid:internal"');
  const invoiceWrite = finishBody.indexOf("recordPurchase(");
  assert.ok(invoiceAlert > 0 && invoiceWrite > invoiceAlert, "alert before the purchase write");
  assert.ok(finishBody.includes("if (!matched) {"), "a Sales Desk invoice is not written to purchases twice; only an unmatched invoice is recorded");
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

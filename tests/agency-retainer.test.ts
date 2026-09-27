import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  STRIPE_API_VERSION,
  cancelRetainerAtPeriodEnd,
  retainerActive,
  retainerCancelDetail,
  retainerCancelPrompt,
  retainerEndedNote,
  retainerFromDiagnostic,
  subscriptionBelongsToLead,
  subscriptionIdFromSession,
  subscriptionIdOf,
} from "../lib/agencyRetainer.ts";

const SUB = "sub_1ABCDEFGHIJKLMNOP";
const SESSION = "cs_test_a1b2c3d4e5f6g7h8";
const LEAD = "3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
const EMPTY = { cancelScheduledAt: null, cancelledBy: null, currentPeriodEnd: null, endedAt: null };

test("only a monthly agency payment is a retainer; one-time payments and other leads have nothing to end", () => {
  assert.equal(retainerFromDiagnostic(null), null);
  assert.equal(retainerFromDiagnostic({ source: "consultation" }), null);
  assert.equal(retainerFromDiagnostic({ agency_payment: { service: "local-ads", billing: "one_time" } }), null);
  const state = retainerFromDiagnostic({
    agency_payment: { service: "local-ads", billing: "monthly", reference: "Scope 12", stripe: { session_id: SESSION }, subscription_id: SUB },
  });
  assert.deepEqual(state, { service: "local-ads", reference: "Scope 12", sessionId: SESSION, subscriptionId: SUB, ...EMPTY });
  assert.equal(retainerActive(state), true);
});

test("a lead the webhook created before the stamp carried its session reads it from the root; a shared lead's root stamp is never used", () => {
  const webhookLead = retainerFromDiagnostic({ source: "agency_payment", agency_payment: { service: "seo", billing: "monthly" }, stripe: { session_id: SESSION } });
  assert.equal(webhookLead?.sessionId, SESSION);
  const shared = retainerFromDiagnostic({ source: "package_page", agency_payment: { service: "seo", billing: "monthly" }, stripe: { session_id: SESSION } });
  assert.equal(shared?.sessionId, null, "the root stamp on a System Map lead is the System Map's session");
});

test("a retainer set to end or ended is not active, and a malformed id is dropped rather than trusted", () => {
  const ended = retainerFromDiagnostic({ agency_payment: { service: "seo", billing: "monthly", cancel_scheduled_at: "2026-09-27T15:00:00.000Z", cancelled_by: "Ryan", current_period_end: "2026-10-15T00:00:00.000Z" } });
  assert.equal(retainerActive(ended), false);
  assert.equal(ended?.currentPeriodEnd, "2026-10-15T00:00:00.000Z");
  const gone = retainerFromDiagnostic({ agency_payment: { service: "seo", billing: "monthly", ended_at: "2026-10-16T00:00:00.000Z" } });
  assert.equal(retainerActive(gone), false);
  const odd = retainerFromDiagnostic({ agency_payment: { service: "seo", billing: "monthly", subscription_id: "sub_x; drop", stripe: { session_id: "cs_1" } } });
  assert.equal(odd?.subscriptionId, null);
  assert.equal(odd?.sessionId, null);
  assert.equal(subscriptionIdOf({ id: SUB }), SUB);
  assert.equal(subscriptionIdOf("pi_123"), null);
});

test("ownership: Stripe's record must say agency payment and name this lead or its customer's email", async () => {
  const stripe = (overrides: Record<string, unknown>) => async (url: string, init?: RequestInit) => {
    assert.ok(url.startsWith(`https://api.stripe.com/v1/subscriptions/${SUB}?expand[]=customer`));
    assert.equal((init?.headers as Record<string, string>)["Stripe-Version"], STRIPE_API_VERSION);
    return new Response(JSON.stringify({ id: SUB, status: "active", cancel_at_period_end: false, metadata: { kind: "agency_payment" }, customer: { id: "cus_1", email: "Owner@Example.com" }, items: { data: [{ current_period_end: 1_800_000_000 }] }, ...overrides }), { status: 200 });
  };
  const byLink = await subscriptionBelongsToLead("sk_test_x", SUB, { id: LEAD, email: null }, stripe({ metadata: { kind: "agency_payment", lead_id: LEAD } }));
  assert.deepEqual(byLink, { ok: true, currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(), status: "active", cancelAtPeriodEnd: false });
  const byEmail = await subscriptionBelongsToLead("sk_test_x", SUB, { id: LEAD, email: "owner@example.com" }, stripe({}));
  assert.equal(byEmail.ok, true);
  // A forged stamp naming someone else's subscription stops here.
  const stranger = await subscriptionBelongsToLead("sk_test_x", SUB, { id: LEAD, email: "someone@else.com" }, stripe({}));
  assert.deepEqual(stranger, { ok: false, reason: "not_this_lead" });
  const plugin = await subscriptionBelongsToLead("sk_test_x", SUB, { id: LEAD, email: "owner@example.com" }, stripe({ metadata: { kind: "hq_subscription" } }));
  assert.deepEqual(plugin, { ok: false, reason: "not_agency" });
  const missing = await subscriptionBelongsToLead("sk_test_x", SUB, { id: LEAD, email: "owner@example.com" }, async () => new Response("{}", { status: 404 }));
  assert.deepEqual(missing, { ok: false, reason: "not_found" });
  const down = await subscriptionBelongsToLead("sk_test_x", SUB, { id: LEAD, email: "owner@example.com" }, async () => { throw new Error("network"); });
  assert.deepEqual(down, { ok: false, reason: "unreachable" });
  const badId = await subscriptionBelongsToLead("sk_test_x", "sub_short", { id: LEAD, email: "owner@example.com" }, async () => { throw new Error("must not be called"); });
  assert.deepEqual(badId, { ok: false, reason: "not_found" });
});

test("the cancellation asks Stripe for cancel_at_period_end only, on the pinned API version, and reads the period end from items", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: SUB, status: "active", cancel_at_period_end: true, items: { data: [{ current_period_end: 1_800_000_000 }] } }), { status: 200 });
  };
  const result = await cancelRetainerAtPeriodEnd("sk_test_x", SUB, fetcher);
  assert.deepEqual(result, { ok: true, currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(), alreadyScheduled: false });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.stripe.com/v1/subscriptions/${SUB}`);
  assert.equal(calls[0].init?.method, "POST");
  assert.equal((calls[0].init?.headers as Record<string, string>)["Stripe-Version"], STRIPE_API_VERSION);
  assert.equal(String(calls[0].init?.body), "cancel_at_period_end=true");
  assert.ok(!String(calls[0].init?.body).includes("prorate") && !String(calls[0].init?.body).includes("invoice_now"), "no refund and no immediate invoice");
  // The pre-basil top-level field still works.
  const legacy = await cancelRetainerAtPeriodEnd("sk_test_x", SUB, async () => new Response(JSON.stringify({ id: SUB, status: "active", current_period_end: 1_700_000_000 }), { status: 200 }));
  assert.equal(legacy.ok && legacy.currentPeriodEnd, new Date(1_700_000_000 * 1000).toISOString());
  // A refusal changes nothing and says so; a bad id never reaches Stripe.
  const refused = await cancelRetainerAtPeriodEnd("sk_test_x", SUB, async () => new Response("{}", { status: 402 }));
  assert.deepEqual(refused, { ok: false, reason: "stripe_refused" });
  const bad = await cancelRetainerAtPeriodEnd("sk_test_x", "sub_short", async () => { throw new Error("must not be called"); });
  assert.deepEqual(bad, { ok: false, reason: "stripe_refused" });
  const down = await cancelRetainerAtPeriodEnd("sk_test_x", SUB, async () => { throw new Error("network"); });
  assert.deepEqual(down, { ok: false, reason: "unreachable" });
});

test("an older stamp without the subscription id resolves it through the checkout session", async () => {
  const found = await subscriptionIdFromSession("sk_test_x", SESSION, async (url) => {
    assert.equal(url, `https://api.stripe.com/v1/checkout/sessions/${SESSION}`);
    return new Response(JSON.stringify({ id: SESSION, subscription: SUB }), { status: 200 });
  });
  assert.equal(found, SUB);
  assert.equal(await subscriptionIdFromSession("sk_test_x", SESSION, async () => new Response("{}", { status: 404 })), null);
  assert.equal(await subscriptionIdFromSession("sk_test_x", "not-a-session", async () => { throw new Error("must not be called"); }), null);
});

test("the copy names what stops, who is and is not emailed, and the real end date, without an em dash", () => {
  const state = retainerFromDiagnostic({ agency_payment: { service: "local-ads", billing: "monthly", reference: "Scope 12" } })!;
  const prompt = retainerCancelPrompt(state);
  assert.ok(prompt.includes("local-ads") && prompt.includes("Scope 12"));
  assert.ok(prompt.includes("Nothing is refunded") && prompt.includes("close of the paid period") && prompt.includes("emailed to the client"));
  const detail = retainerCancelDetail(state, SUB, "Ryan");
  assert.equal(detail, `Agency retainer (local-ads, Scope 12) set to end at the close of the paid period by Ryan. Subscription: ${SUB}.`);
  const scheduled = retainerEndedNote({ ...state, cancelScheduledAt: "2026-09-27T15:00:00.000Z", cancelledBy: "Ryan", currentPeriodEnd: "2026-10-15T00:00:00.000Z" });
  assert.equal(scheduled, "Agency retainer (local-ads) set to end at the close of the paid period on 2026-10-15 by Ryan (set 2026-09-27).");
  assert.equal(retainerEndedNote({ ...state, endedAt: "2026-10-16T00:00:00.000Z" }), "Agency retainer (local-ads) ended in Stripe on 2026-10-16.");
  for (const s of [prompt, detail, scheduled]) assert.ok(!s.includes("—"));
});

test("the admin route is owner-only, confirmed, fails closed without Stripe, proves ownership, and never refunds or emails", () => {
  const route = readFileSync(join(process.cwd(), "app/api/admin/leads/[id]/retainer/route.ts"), "utf8");
  const authAt = route.indexOf('profile?.role !== "admin"');
  const leadReadAt = route.indexOf('from("leads")');
  assert.ok(authAt > 0 && leadReadAt > authAt, "the admin check comes before the lead read");
  assert.ok(!route.includes('"sales"'), "sales users cannot end a retainer");
  assert.ok(route.includes("confirm !== true"), "the body must confirm");
  assert.ok(route.includes("STRIPE_SECRET_KEY") && route.includes("501"), "no Stripe key means a clear 501, not a silent no-op");
  const ownedAt = route.indexOf("await subscriptionBelongsToLead(");
  const cancelAt = route.indexOf("await cancelRetainerAtPeriodEnd(");
  assert.ok(ownedAt > 0 && cancelAt > ownedAt, "ownership is proven against Stripe before the cancel");
  assert.ok(route.includes("if (!owned.ok)") && route.includes('owned.status === "canceled"'), "a stranger's subscription and an ended one both stop before the write");
  assert.ok(!route.includes("api.stripe.com") && !route.includes("/refunds") && !route.includes("resend"), "cancel at period end through the helper only; no refund call, no email");
  assert.ok(route.includes('.is("deleted_at", null)'), "a deleted lead is not touched");
  assert.ok(route.includes("cancel_scheduled_at") && route.includes("cancelled_by") && route.includes("current_period_end"), "the stamp records who, when, and the period end");
  assert.ok(!route.includes("Stripe did not answer. Nothing changed. Try again in a moment.\"\n        : \"Stripe refused"), "a timeout no longer claims nothing changed");
  assert.ok(!route.includes("—"), "no em dashes");
});

test("the lead page shows the door only while the retainer renews, and the webhook stamps and merges the subscription", () => {
  const page = readFileSync(join(process.cwd(), "app/admin/leads/[id]/page.tsx"), "utf8");
  assert.ok(page.includes("retainer && retainerActive(retainer) && (") && page.includes("<CancelRetainer"));
  assert.ok(page.includes("retainerEndedNote(retainer)"), "the note prints the period end, not the click date");
  const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
  assert.ok(hook.includes('details.billing === "monthly" ? subscriptionIdOf('), "the agency flow reads the session's subscription");
  assert.equal((hook.match(/subscription_id: subscriptionId/g) ?? []).length, 2, "both agency stamps (found lead, new lead) carry it");
  assert.ok(hook.includes("const alreadyStamped = existingStripe?.session_id === sessionId") && hook.includes("{ ...existingPayment, ...freshStamp, stripe: existingStripe }"), "a redelivered event keeps the cancel keys written since");
  assert.ok(hook.includes("stripe: stripeStamp, ...(subscriptionId ? { subscription_id: subscriptionId } : {}) },\n          stripe: stripeStamp"), "the new-lead stamp carries its session inside agency_payment too");
  const stamp = hook.slice(hook.indexOf("async function stampRetainerEnd"), hook.indexOf("\nasync function ", hook.indexOf("async function stampRetainerEnd") + 1));
  assert.ok(stamp.includes('typeof payment.cancel_scheduled_at === "string") return') && stamp.includes('typeof payment.ended_at === "string") return'), "a key already set is never overwritten");
  assert.ok(stamp.includes("payment.subscription_id !== subId) return"), "a stamp naming another subscription is left alone");
  const button = readFileSync(join(process.cwd(), "app/admin/leads/[id]/CancelRetainer.tsx"), "utf8");
  assert.ok(button.includes("Keep it") && button.includes("confirm: true"));
  assert.ok(!button.includes("Nothing changed"), "a lost browser response never claims nothing changed");
});

test("renewals and cancellations find the lead by pay-link id, then the stamped subscription, then email, never email first", () => {
  const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
  const renewal = hook.slice(hook.indexOf('if (invoice.family === "agency_payment") {'), hook.indexOf("foundingPerksOnPaid(supabase, {", hook.indexOf('if (invoice.family === "agency_payment") {')));
  assert.ok(renewal.includes("await confirmLead(supabase, meta.lead_id.toLowerCase())"));
  const subAt = renewal.indexOf("findAgencyLeadBySubscription(supabase, invoice.subscriptionId)");
  const emailAt = renewal.indexOf("findAgencyLeadByEmail(supabase, invoice.email)");
  assert.ok(subAt > 0 && emailAt > subAt, "the stamped subscription wins over the email");
  const end = hook.slice(hook.indexOf("async function noteSubscriptionEnd"), hook.indexOf("async function stampRetainerEnd"));
  assert.ok(end.includes("findAgencyLeadBySubscription(supabase, subId)") && end.includes("await stampRetainerEnd(supabase, leadId, subId, scheduled, sub)"));
  const finder = hook.slice(hook.indexOf("async function findAgencyLeadBySubscription"), hook.indexOf("async function findAgencyLeadByEmail"));
  assert.ok(finder.includes('.eq("diagnostic->agency_payment->>subscription_id", subscriptionId)') && finder.includes('.is("deleted_at", null)'));
});

test("every paid flow links its purchases row to the lead, keyed by session or invoice, only when unlinked", () => {
  const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
  const helper = hook.slice(hook.indexOf("async function linkPurchaseLead"), hook.indexOf("async function markLeadActivity"));
  assert.ok(helper.includes('.is("lead_id", null)'), "a linked row is never moved");
  assert.ok(helper.includes("console.warn") && !helper.includes("throw"), "a link failure never fails the event");
  const calls = (hook.match(/await linkPurchaseLead\(supabase, /g) ?? []).length;
  assert.equal(calls, 8, "funnel claim, website launch, time back, follow-up, free build, agency, agency renewal, paid invoice");
  assert.ok(hook.includes("linkPurchaseLead(supabase, invoiceId, leadId)"), "invoice-keyed rows link by invoice id");
  const page = readFileSync(join(process.cwd(), "app/admin/purchases/page.tsx"), "utf8");
  assert.ok(page.includes("p.lead_id ??"), "the purchases page prefers the written link and keeps the checkout-id fallback");
});

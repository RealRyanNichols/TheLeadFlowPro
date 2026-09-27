import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  cancelRetainerAtPeriodEnd,
  retainerActive,
  retainerCancelDetail,
  retainerCancelPrompt,
  retainerFromDiagnostic,
  subscriptionIdFromSession,
  subscriptionIdOf,
} from "../lib/agencyRetainer.ts";

const SUB = "sub_1ABCDEFGHIJKLMNOP";
const SESSION = "cs_test_a1b2c3d4e5f6g7h8";

test("only a monthly agency payment is a retainer; one-time payments and other leads have nothing to end", () => {
  assert.equal(retainerFromDiagnostic(null), null);
  assert.equal(retainerFromDiagnostic({ source: "consultation" }), null);
  assert.equal(retainerFromDiagnostic({ agency_payment: { service: "local-ads", billing: "one_time" } }), null);
  const state = retainerFromDiagnostic({
    agency_payment: { service: "local-ads", billing: "monthly", reference: "Scope 12", stripe: { session_id: SESSION }, subscription_id: SUB },
  });
  assert.deepEqual(state, { service: "local-ads", reference: "Scope 12", sessionId: SESSION, subscriptionId: SUB, cancelScheduledAt: null, cancelledBy: null });
  assert.equal(retainerActive(state), true);
});

test("a retainer already set to end is not active, and a malformed id is dropped rather than trusted", () => {
  const ended = retainerFromDiagnostic({ agency_payment: { service: "seo", billing: "monthly", cancel_scheduled_at: "2026-09-27T15:00:00.000Z", cancelled_by: "Ryan" } });
  assert.equal(retainerActive(ended), false);
  assert.equal(ended?.cancelScheduledAt, "2026-09-27T15:00:00.000Z");
  const odd = retainerFromDiagnostic({ agency_payment: { service: "seo", billing: "monthly", subscription_id: "sub_x; drop", stripe: { session_id: "cs_1" } } });
  assert.equal(odd?.subscriptionId, null);
  assert.equal(odd?.sessionId, null);
  assert.equal(subscriptionIdOf({ id: SUB }), SUB);
  assert.equal(subscriptionIdOf("pi_123"), null);
});

test("the cancellation asks Stripe for cancel_at_period_end only, and reads the period end back", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: SUB, status: "active", cancel_at_period_end: true, current_period_end: 1_800_000_000 }), { status: 200 });
  };
  const result = await cancelRetainerAtPeriodEnd("sk_test_x", SUB, fetcher);
  assert.deepEqual(result, { ok: true, currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(), alreadyScheduled: false });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.stripe.com/v1/subscriptions/${SUB}`);
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(String(calls[0].init?.body), "cancel_at_period_end=true");
  assert.ok(!String(calls[0].init?.body).includes("prorate") && !String(calls[0].init?.body).includes("invoice_now"), "no refund and no immediate invoice");
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

test("the copy names what stops and what does not, without an em dash", () => {
  const state = retainerFromDiagnostic({ agency_payment: { service: "local-ads", billing: "monthly", reference: "Scope 12" } })!;
  const prompt = retainerCancelPrompt(state);
  assert.ok(prompt.includes("local-ads") && prompt.includes("Scope 12"));
  assert.ok(prompt.includes("Nothing is refunded") && prompt.includes("close of the paid period"));
  const detail = retainerCancelDetail(state, SUB, "Ryan");
  assert.equal(detail, `Agency retainer (local-ads, Scope 12) set to end at the close of the paid period by Ryan. Subscription: ${SUB}.`);
  assert.ok(!prompt.includes("—") && !detail.includes("—"));
});

test("the admin route is owner-only, confirmed, fails closed without Stripe, and never refunds or emails", () => {
  const route = readFileSync(join(process.cwd(), "app/api/admin/leads/[id]/retainer/route.ts"), "utf8");
  const authAt = route.indexOf('profile?.role !== "admin"');
  const leadReadAt = route.indexOf('from("leads")');
  assert.ok(authAt > 0 && leadReadAt > authAt, "the admin check comes before the lead read");
  assert.ok(!route.includes('"sales"'), "sales users cannot end a retainer");
  assert.ok(route.includes("confirm !== true"), "the body must confirm");
  assert.ok(route.includes("STRIPE_SECRET_KEY") && route.includes("501"), "no Stripe key means a clear 501, not a silent no-op");
  assert.ok(route.includes("cancelRetainerAtPeriodEnd(") && !route.includes("api.stripe.com") && !route.includes("/refunds") && !route.includes("resend"), "cancel at period end through the helper only; no refund call, no email");
  assert.ok(route.includes('.is("deleted_at", null)'), "a deleted lead is not touched");
  assert.ok(route.includes("cancel_scheduled_at") && route.includes("cancelled_by"), "the stamp records who and when");
  assert.ok(!route.includes("—"), "no em dashes");
});

test("the lead page shows the door only while the retainer renews, and the webhook stamps the subscription", () => {
  const page = readFileSync(join(process.cwd(), "app/admin/leads/[id]/page.tsx"), "utf8");
  assert.ok(page.includes("retainer && retainerActive(retainer) && (") && page.includes("<CancelRetainer"));
  assert.ok(page.includes("set to end at the close of the paid period"));
  const hook = readFileSync(join(process.cwd(), "app/api/stripe-webhook/route.ts"), "utf8");
  assert.ok(hook.includes('details.billing === "monthly" ? subscriptionIdOf('), "the agency flow reads the session's subscription");
  assert.equal((hook.match(/subscription_id: subscriptionId/g) ?? []).length, 2, "both agency stamps (found lead, new lead) carry it");
  const button = readFileSync(join(process.cwd(), "app/admin/leads/[id]/CancelRetainer.tsx"), "utf8");
  assert.ok(button.includes("Keep it") && button.includes("confirm: true"));
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

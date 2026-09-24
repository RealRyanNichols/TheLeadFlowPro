import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  TLFP_CREDITS,
  TLFP_FOUNDING,
  TLFP_FOUNDING_TIERS,
  foundingNetTaken,
  foundingRebateCredits,
  foundingReversalPlan,
  foundingSeatsLeft,
  foundingStartLabel,
  foundingTier,
  foundingTierFor,
  qualifiedBefore,
} from "../lib/tlfpCredits.ts";
import { PRICES } from "../lib/site/prices.ts";
import { AGENCY_PAYMENT } from "../lib/agencyPayment.ts";
import { CHATGPT_OPERATOR } from "../lib/chatgptOperatorCourse.ts";
import { CONTENT_ENGINE } from "../lib/contentEngineCourse.ts";
import { OPERATOR_ACADEMY } from "../lib/operatorAcademyCatalog.ts";

// Founding 100 is credits today: a numbered seat, a one-time bonus by what
// the buyer paid for, a monthly partner bonus, and a standing rebate. These
// tests hold the lines Ryan set: 100 seats and never a 101st, no balance past
// 1,999, cash paid is what counts, credit packs never qualify, a refund takes
// the award back, and the client copy carries no price talk.

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260924200000_tlfp_founding.sql");
const creditsMigration = read("supabase/migrations/20260923000000_tlfp_credits.sql");
const serverLib = read("lib/tlfp.ts");
const hook = read("app/api/stripe-webhook/route.ts");
const page = read("app/tlfp/page.tsx");
const terms = read("app/tlfp/terms/page.tsx");
const card = read("components/tlfp/TlfpBalanceCard.tsx");
const admin = read("app/admin/tlfp/page.tsx");

test("the playbook numbers: 100 seats, 1,000 build, 250 Learn It, 100 a month partner, rebate 5 or 10", () => {
  assert.equal(TLFP_FOUNDING.seats, 100);
  assert.equal(foundingTier("build").oneTimeCredits, 1000);
  assert.equal(foundingTier("learn").oneTimeCredits, 250);
  assert.equal(foundingTier("operations").oneTimeCredits, 0);
  assert.equal(foundingTier("operations").monthlyCredits, 100);
  assert.ok([5, 10].includes(TLFP_FOUNDING.rebatePercent), "Ryan picks 5 or 10");
  for (const tier of TLFP_FOUNDING_TIERS) {
    assert.ok(tier.oneTimeCredits <= TLFP_CREDITS.maxBalance, `${tier.id} bonus alone fits under the cap`);
    assert.ok(tier.oneTimeCredits > 0 || tier.monthlyCredits > 0, `${tier.id} pays something`);
    assert.ok(tier.minPaidCents > 0, `${tier.id} needs money paid`);
  }
});

test("the database refuses seat 101 on its own and agrees with the app's numbers", () => {
  assert.match(migration, /seat_no integer primary key check \(seat_no between 1 and 100\)/);
  assert.match(migration, /v_limit constant integer := 100;/);
  assert.ok(migration.includes(`between 1 and ${TLFP_FOUNDING.seats}`) && migration.includes(`v_limit constant integer := ${TLFP_FOUNDING.seats};`));
  assert.match(migration, /email text not null unique references public\.tlfp_accounts\(email\)/, "one seat per email");
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\('public\.tlfp_founding_seats'\)\)/, "seats are handed out under a lock");
  assert.match(migration, /coalesce\(max\(seat_no\), 0\) \+ 1/, "seat numbers are never reissued");
  assert.match(migration, /'error', 'sold_out'/);
  assert.ok(migration.indexOf("where email = v_account.email") < migration.indexOf("'sold_out'"), "an existing seat holder is answered before the sold-out check");
  assert.ok(migration.includes("'founding_bonus:' || v_account.email"), "one founding bonus per email, ever");
  assert.ok(migration.includes("public.tlfp_post("), "the bonus goes through tlfp_post, so the 1,999 cap applies");
  assert.match(creditsMigration, /v_cap constant integer := 1999/);
});

test("tlfp_post caps new credits against posted credits, so a released hold can never lift a balance past 1,999", () => {
  const post = migration.slice(migration.indexOf("create or replace function public.tlfp_post("), migration.indexOf("create table if not exists public.tlfp_founding_seats"));
  assert.ok(post.length > 500, "the founding migration replaces tlfp_post");
  assert.match(post, /v_cap constant integer := 1999;/);
  assert.match(post, /coalesce\(sum\(delta\) filter \(where status = 'posted'\), 0\)/, "posted credits alone are the cap basis");
  assert.match(post, /if v_delta > 0 and v_posted \+ v_delta > v_cap then/);
  assert.match(post, /v_delta := greatest\(v_cap - v_posted, 0\);/);
  assert.match(post, /if v_delta < 0 and p_require_funds and v_balance \+ v_delta < 0 then/, "spending still checks posted plus held");
  assert.ok(post.includes("grant execute on function public.tlfp_post(text, integer, text, text, text, integer, text, text, text, boolean) to service_role;"));
  assert.ok(post.includes("revoke all on function public.tlfp_post(text, integer, text, text, text, integer, text, text, text, boolean) from public, anon, authenticated;"));
});

test("the founding functions are service-role only, and clients read only their own seat", () => {
  assert.match(migration, /tlfp_founding_claim\([\s\S]*?security definer set search_path = public, pg_temp/);
  assert.ok(migration.includes("revoke all on function public.tlfp_founding_claim(text, text, text, integer, text) from public, anon, authenticated;"));
  assert.ok(migration.includes("grant execute on function public.tlfp_founding_claim(text, text, text, integer, text) to service_role;"));
  assert.ok(migration.includes("revoke all on public.tlfp_founding_seats from public, anon, authenticated;"));
  assert.ok(migration.includes("alter table public.tlfp_founding_seats enable row level security;"));
  assert.match(migration, /tlfp_founding_seats_own_read[\s\S]*lower\(p\.email\) = tlfp_founding_seats\.email/);
  assert.ok(!/grant (insert|update|delete)[^;]*to authenticated/.test(migration), "nobody but the service role writes");
});

test("every ledger reason the app posts is allowed by the database, old and new", () => {
  const union = serverLib.match(/export type TlfpReason =([\s\S]*?);/)?.[1] ?? "";
  const reasons = [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(reasons.length >= 14, "the union is readable");
  const check = migration.match(/add constraint tlfp_ledger_reason_check check \(reason in \(([\s\S]*?)\)\)/)?.[1] ?? "";
  const allowed = new Set([...check.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
  for (const reason of reasons) assert.ok(allowed.has(reason), `${reason} is allowed by tlfp_ledger_reason_check`);
  for (const old of ["pack_purchase", "pack_refund", "pack_restore", "course_completed", "event_attended", "referral_purchase", "redeem", "admin_grant", "admin_adjust"]) {
    assert.ok(allowed.has(old), `${old} is still allowed`);
  }
});

test("what counts as which tier: cash paid, by kind, with the build floor", () => {
  const floor = PRICES.websiteLaunchDeposit * 100;
  assert.equal(foundingTierFor({ kind: "package_deposit", amountCents: floor })?.id, "build", "the Website Launch deposit claims a build seat");
  assert.equal(foundingTierFor({ kind: "build_deposit", amountCents: floor - 1 }), null, "under the floor claims nothing");
  assert.equal(foundingTierFor({ kind: "build_deposit", amountCents: PRICES.buildDepositMin * 100 }), null, "the smallest build deposit waits for a bigger payment");
  assert.equal(foundingTierFor({ kind: "stripe_invoice", amountCents: 250_000 })?.id, "build", "a paid Sales Desk invoice is build work");
  assert.equal(foundingTierFor({ kind: "tool_studio_order", amountCents: PRICES.toolStudioFunnel * 100 })?.id, "build");
  assert.equal(foundingTierFor({ kind: AGENCY_PAYMENT.kind, amountCents: 100_000, billing: "one_time" })?.id, "build");
  assert.equal(foundingTierFor({ kind: AGENCY_PAYMENT.kind, amountCents: 30_000, billing: "monthly" })?.id, "operations", "a retainer month is a partner month, any amount");
  assert.equal(foundingTierFor({ kind: AGENCY_PAYMENT.kind, amountCents: 30_000, billing: "one_time" }), null, "a small one-time scope is not a build");
  assert.equal(foundingTierFor({ kind: CHATGPT_OPERATOR.purchaseKind, amountCents: PRICES.chatgptOperatorFounding * 100 })?.id, "learn");
  assert.equal(foundingTierFor({ kind: OPERATOR_ACADEMY.allAccessPurchaseKind, amountCents: 99_700 })?.id, "learn");
  assert.equal(foundingTierFor({ kind: "learn_it", amountCents: 49_700 })?.id, "learn");
  assert.equal(foundingTierFor({ kind: CONTENT_ENGINE.purchaseKind, amountCents: 12_700 }), null, "the $127 course does not carry a 250 credit seat");
  assert.equal(foundingTierFor({ kind: TLFP_CREDITS.purchaseKind, amountCents: PRICES.tlfpPackFounder * 100 }), null, "a credit pack never claims a seat");
  assert.equal(foundingTierFor({ kind: "system_map", amountCents: PRICES.systemMap * 100 }), null, "a System Map is a diagnosis, not a build");
  assert.equal(foundingTierFor({ kind: "hq_subscription", amountCents: 4_900 }), null);
  assert.equal(foundingTierFor({ kind: "package_full", amountCents: 0 }), null, "a checkout covered by credits claims nothing");
  assert.equal(foundingTierFor({ kind: "package_full", amountCents: null }), null);
  assert.equal(foundingTierFor({ kind: "package_full", amountCents: Number.NaN }), null);
});

test("an earlier qualifying purchase makes an existing client, not a founder", () => {
  assert.equal(qualifiedBefore([]), false);
  assert.equal(qualifiedBefore([{ kind: "chase_sheet_monthly", amount_cents: 2_000 }, { kind: "pro_bundle", amount_cents: 3_900 }]), false, "small buys do not count");
  assert.equal(qualifiedBefore([{ kind: "build_deposit", amount_cents: PRICES.buildDepositMin * 100 }]), false, "under the build floor does not count");
  assert.equal(qualifiedBefore([{ kind: "package_deposit", amount_cents: PRICES.websiteLaunchDeposit * 100 }]), true);
  assert.equal(qualifiedBefore([{ kind: AGENCY_PAYMENT.kind, amount_cents: 25_000 }]), true, "any paid agency payment, since billing is not stored");
  assert.equal(qualifiedBefore([{ kind: CHATGPT_OPERATOR.purchaseKind, amount_cents: 29_700 }]), true);
  assert.equal(qualifiedBefore([{ kind: null, amount_cents: 100_000 }]), false);
  assert.equal(foundingStartLabel(), new Date(`${TLFP_FOUNDING.startsAt}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }));
  assert.match(TLFP_FOUNDING.startsAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(serverLib.indexOf("await isExistingClient(service, email, key)") < serverLib.indexOf('service.rpc("tlfp_founding_claim"'), "checked before a seat is claimed");
  assert.ok(serverLib.includes('.lt("created_at", opened)') && serverLib.includes('.lt("paid_at", opened)'), "purchases and Sales Desk invoices before the start count");
});

test("a refund takes back what is on the account; a retry moves nothing; a refund after a dispute was won still takes it back", () => {
  const awards = [
    { id: "a1", email: "x@y.com", delta: 1000, reason: "founding_bonus", stripe_session_id: "in_1" },
    { id: "a2", email: "x@y.com", delta: 25, reason: "founding_rebate", stripe_session_id: "in_1" },
  ];
  const dispute = foundingReversalPlan(awards, [], false, "disputed:ch_1");
  assert.deepEqual(dispute.map((m) => [m.ref, m.delta, m.reason]), [
    ["founding_reversed:a1:disputed:ch_1", -1000, "founding_reversed"],
    ["founding_reversed:a2:disputed:ch_1", -25, "founding_reversed"],
  ]);
  assert.equal(dispute[0].key, "in_1", "the move carries the purchase key so it is found again");
  const afterDispute = dispute.map((m) => ({ ref: m.ref, delta: m.delta }));
  assert.deepEqual(foundingReversalPlan(awards, afterDispute, false, "disputed:ch_1"), [], "a retry of the same event moves nothing");
  assert.equal(foundingNetTaken("a1", afterDispute), 1000);

  const won = foundingReversalPlan(awards, afterDispute, true, "dispute_won:ch_1");
  assert.deepEqual(won.map((m) => [m.ref, m.delta]), [["founding_restored:a1:dispute_won:ch_1", 1000], ["founding_restored:a2:dispute_won:ch_1", 25]]);
  const afterWin = [...afterDispute, ...won.map((m) => ({ ref: m.ref, delta: m.delta }))];
  assert.deepEqual(foundingReversalPlan(awards, afterWin, true, "dispute_won:ch_1"), [], "a restore retry moves nothing");

  const refund = foundingReversalPlan(awards, afterWin, false, "refunded:ch_1");
  assert.deepEqual(refund.map((m) => [m.ref, m.delta]), [["founding_reversed:a1:refunded:ch_1", -1000], ["founding_reversed:a2:refunded:ch_1", -25]], "a later refund takes it back again");

  // A restore the cap cut short leaves the rest still taken, and a later put-back returns only that.
  const partialRestore = [...afterDispute, { ref: "founding_restored:a1:dispute_won:ch_1", delta: 400 }];
  assert.equal(foundingNetTaken("a1", partialRestore), 600);
  assert.equal(foundingReversalPlan([awards[0]], partialRestore, false, "refunded:ch_1")[0].delta, -400, "only what is on the account is taken");
  assert.deepEqual(foundingReversalPlan(awards, [], true, "dispute_won:ch_1"), [], "nothing to put back when nothing was taken");
  assert.equal(foundingNetTaken("a1", [{ ref: "founding_reversed:a10:x", delta: -5 }]), 0, "another award's moves never count");
});

test("the tier kinds are the real purchase kinds", () => {
  const kinds = new Set(TLFP_FOUNDING_TIERS.flatMap((tier) => tier.kinds));
  for (const kind of [AGENCY_PAYMENT.kind, CHATGPT_OPERATOR.purchaseKind, OPERATOR_ACADEMY.allAccessPurchaseKind]) {
    assert.ok(kinds.has(kind), `${kind} is mapped`);
  }
  assert.ok(TLFP_FOUNDING.rebateExcludedKinds.includes(TLFP_CREDITS.purchaseKind));
  assert.ok(hook.includes('kind: "stripe_invoice"'), "the webhook passes the invoice kind the build tier maps");
});

test("the rebate is a whole-credit percentage of cash paid, never on credit packs", () => {
  const pct = TLFP_FOUNDING.rebatePercent;
  assert.equal(foundingRebateCredits("build_deposit", 100_000), Math.floor(1000 * pct / 100));
  assert.equal(foundingRebateCredits("package_deposit", 49_999), Math.floor(499.99 * pct / 100), "floor, whole credits");
  assert.equal(foundingRebateCredits(TLFP_CREDITS.purchaseKind, 100_000), 0);
  assert.equal(foundingRebateCredits("build_deposit", 0), 0);
  assert.equal(foundingRebateCredits("build_deposit", null), 0);
  assert.equal(foundingRebateCredits("build_deposit", -500), 0);
});

test("seats left never goes negative or past the seat count", () => {
  assert.equal(foundingSeatsLeft(0), 100);
  assert.equal(foundingSeatsLeft(7), 93);
  assert.equal(foundingSeatsLeft(100), 0);
  assert.equal(foundingSeatsLeft(101), 0);
  assert.equal(foundingSeatsLeft(-3), 100);
});

test("the server posts every award idempotently on the purchase key, capped, with the key on the row", () => {
  assert.ok(serverLib.includes('service.rpc("tlfp_founding_claim"'));
  assert.ok(serverLib.includes("ref: `founding_monthly:${key}`"));
  assert.ok(serverLib.includes("ref: `founding_rebate:${key}`"));
  assert.ok(serverLib.includes("foundingReversalPlan(awards, moves, input.restore, input.eventTag)"), "reversals follow the pure plan");
  assert.ok((serverLib.match(/stripeSessionId: key,/g) ?? []).length >= 2, "monthly and rebate carry the purchase key so a refund finds them");
  assert.ok(serverLib.includes("outcome.claimedHere = claim.ref === key") && serverLib.includes("outcome.claimedHere = seat.data.ref === key"), "claimedHere is keyed on the purchase that claimed the seat, stable across retries");
  assert.ok(serverLib.includes('.update({ bonus_applied: stillOn })'), "the seat shows what is still on it after a refund");
  assert.ok(serverLib.includes("export class FoundingNotInstalledError"), "a missing migration is its own error");
});

test("the webhook runs Founding 100 on every paid path, after fulfilment, and never lets it block", () => {
  const checkoutCall = hook.lastIndexOf("await foundingPerksOnPaid(supabase, {");
  const dispatchEnd = hook.indexOf("await notifyUnhandledPurchase(supabase, customer.email, kind, amountCentsOf(session), session.id);");
  assert.ok(dispatchEnd > 0 && checkoutCall > dispatchEnd, "paid checkout: after the fulfilment dispatch");
  assert.ok(hook.includes('billing: typeof session.metadata?.billing === "string" ? session.metadata.billing : null'), "a monthly retainer checkout is a partner month");
  assert.ok(hook.includes('key: (typeof sessionInvoice === "string" && sessionInvoice ? sessionInvoice : session.id).slice(0, 200)'), "a subscription's first month is keyed on the invoice a refund maps to");
  assert.ok(hook.includes('{ tierKind: "tool_studio_order", tierCents: Math.min(amountCentsOf(session) ?? 0, bundledBuild.priceUsd * 100) }'), "a Tool Studio build bought with a monthly menu qualifies on the build price");
  const renewal = hook.indexOf("async function recordSubscriptionInvoice(");
  const renewalCall = hook.indexOf("await foundingPerksOnPaid(supabase, {", renewal);
  assert.ok(renewalCall > renewal && renewalCall < hook.indexOf("async function finishPaidInvoice("), "renewals: partner months and rebates");
  assert.ok(hook.includes('billing: invoice.family === "agency_payment" ? "monthly" : null'));
  const invoice = hook.indexOf("async function finishPaidInvoice(");
  const invoiceCall = hook.indexOf('await foundingPerksOnPaid(supabase, { email, kind: "stripe_invoice"', invoice);
  assert.ok(invoiceCall > hook.indexOf('title: taskTitle, due_date', invoice), "Sales Desk and dashboard invoices, after the lead is finished");
  const helper = hook.slice(hook.indexOf("async function foundingPerksOnPaid("), hook.indexOf("async function ensureSystemMapPaid("));
  assert.ok(helper.includes("if (error instanceof FoundingNotInstalledError)") && helper.indexOf("return;") < helper.indexOf("throw error;"), "a missing migration never fails a paid event");
  assert.ok(helper.includes("throw error;"), "any other founding failure is rethrown so Stripe redelivers");
  assert.ok(helper.includes("founding-failed:internal") && helper.includes("Do not grant founding credits by hand"), "the owner hears once, and is told not to grant by hand");
  assert.ok(/founding-seat:internal[\s\S]*\} catch \(error\) \{[\s\S]*seat alert failed/.test(helper), "the seat alert is best effort and never wedges the event");
  assert.ok(!/sendBuyerAcknowledgement|deliverPaymentEmail\(/.test(helper), "nothing goes to the buyer");
});

test("a full refund or dispute takes founding credits back; a dispute won puts them back", () => {
  const moneyBack = hook.slice(hook.indexOf("async function handleMoneyBack("), hook.indexOf("async function noteSubscriptionEnd("));
  assert.ok(moneyBack.includes("await reverseFoundingCredits(supabase, {") && moneyBack.includes("eventTag: `${outcome.status}:${outcome.chargeId"), "every move is tagged with its event");
  assert.ok(moneyBack.includes('if (!outcome.partial && !inquiry && (!restoring || willFlip || !purchase || purchase.status === "paid"))'), "never on a partial refund or an inquiry; restore on a flip back or its retry");
  assert.ok(moneyBack.includes("const foundingKeys = [...new Set([...(purchase ? [purchase.stripe_session_id] : []), ...candidates])];"), "every key the money maps to is tried");
  assert.ok(moneyBack.includes('disputeStatus.startsWith("warning_")'), "a dispute inquiry moves no founding credits");
  assert.ok(moneyBack.includes("await foundingAppliedLine(supabase, foundingKeys, outcome.partial, restoring, inquiry)"), "the owner is told in the refund alert");
  assert.ok(/foundingAwardedOn[\s\S]*?if \(error\) \{[\s\S]*?throw foundingError/.test(serverLib), "a read error throws instead of changing the alert body");
});

test("the client sees the seat in the playbook's words, and no price talk anywhere founding is shown", () => {
  assert.equal(TLFP_FOUNDING.valueLine, "A dollar of our work each. Yours to spend or hold.");
  assert.ok(!/send/i.test(TLFP_FOUNDING.valueLine), "credits are not transferable until they can be claimed as TLFP");
  assert.ok(card.includes("{TLFP_FOUNDING.valueLine}") && page.includes("{TLFP_FOUNDING.valueLine}"));
  assert.ok(page.includes("Your first qualifying purchase claims a numbered seat."), "only a qualifying purchase claims a seat");
  assert.ok(page.includes("One founding bonus per seat, set by the purchase that claims it."));
  assert.ok(page.includes("Credit packs do not count.") && card.includes("Credit packs do not count."), "the rebate excludes credit packs, and says so");
  assert.ok(page.includes("The ChatGPT Operator or Operator Academy all access") && terms.includes("The ChatGPT Operator course or Operator Academy all access"), "Learn It names what qualifies");
  assert.ok(!/any paid Operator Academy course|a paid Operator Academy course/.test(page + terms), "no promise the Content Engine course does not keep");
  assert.ok(terms.includes("is an existing client and does") && terms.includes("never a second bonus"), "the terms say who is not a founder and that the bonus is once");
  assert.ok(card.includes("founding_bonus:") && card.includes("founding_rebate:") && card.includes("founding_reversed:"), "the ledger rows read in plain words");
  for (const [name, source] of [["page", page], ["card", card], ["terms", terms]] as const) {
    assert.ok(!/[–—]/.test(source), `${name} carries no en or em dash`);
    assert.ok(!/invest/i.test(source.replace(/not an investment/gi, "")), `${name} never pitches an investment`);
    assert.ok(!/\breturns\b|bitcoin|could be worth|like .{0,10}early|price of TLFP|TLFP price/i.test(source), `${name} has no price talk`);
  }
});

test("the token stays off the public site except the one claimable-later sentence", () => {
  assert.equal((page.match(/claimable as TLFP later/g) ?? []).length, 1);
  for (const [name, source] of [["page", page], ["card", card], ["terms", terms]] as const) {
    assert.ok(!/\bXRPL?\b|\bledger wallet\b|\btokens?\b|\bXaman\b|\bmainnet\b/i.test(source), `${name} does not mention the token rails`);
  }
  assert.ok(!/claimable as TLFP/.test(card) && !/claimable as TLFP/.test(terms), "the sentence lives on /tlfp only");
});

test("the admin page shows founding seats left and every seat", () => {
  assert.ok(admin.includes('label: "Founding seats left"'));
  assert.ok(admin.includes("readFoundingSeats(createServiceClient())"));
  assert.ok(admin.includes("seats left`"));
});

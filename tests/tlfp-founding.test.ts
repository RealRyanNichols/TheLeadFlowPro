import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  TLFP_CREDITS,
  TLFP_FOUNDING,
  TLFP_FOUNDING_TIERS,
  foundingRebateCredits,
  foundingSeatsLeft,
  foundingTier,
  foundingTierFor,
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
  assert.ok(serverLib.includes("ref: `founding_reversed:${row.id}`") && serverLib.includes("ref: `founding_restored:${row.id}`"));
  assert.ok((serverLib.match(/stripeSessionId: key,/g) ?? []).length >= 2, "monthly and rebate carry the purchase key so a refund finds them");
  assert.ok(serverLib.includes("outcome.claimedHere = claim.ref === key"), "the seat alert is keyed on the purchase that claimed it, stable across retries");
});

test("the webhook runs Founding 100 on every paid path, after fulfilment, and never lets it block", () => {
  const checkoutCall = hook.lastIndexOf("await foundingPerksOnPaid(supabase, {");
  const dispatchEnd = hook.indexOf("await notifyUnhandledPurchase(supabase, customer.email, kind, amountCentsOf(session), session.id);");
  assert.ok(dispatchEnd > 0 && checkoutCall > dispatchEnd, "paid checkout: after the fulfilment dispatch");
  assert.ok(hook.includes('billing: typeof session.metadata?.billing === "string" ? session.metadata.billing : null'), "a monthly retainer checkout is a partner month");
  const renewal = hook.indexOf("async function recordSubscriptionInvoice(");
  const renewalCall = hook.indexOf("await foundingPerksOnPaid(supabase, {", renewal);
  assert.ok(renewalCall > renewal && renewalCall < hook.indexOf("async function finishPaidInvoice("), "renewals: partner months and rebates");
  assert.ok(hook.includes('billing: invoice.family === "agency_payment" ? "monthly" : null'));
  const invoice = hook.indexOf("async function finishPaidInvoice(");
  assert.ok(hook.indexOf('await foundingPerksOnPaid(supabase, { email, kind: "stripe_invoice"', invoice) > invoice, "Sales Desk and dashboard invoices");
  const helper = hook.slice(hook.indexOf("async function foundingPerksOnPaid("), hook.indexOf("async function ensureSystemMapPaid("));
  assert.ok(helper.includes("try {") && helper.includes("} catch (error) {"), "a founding failure never fails the event");
  assert.ok(helper.includes("founding-failed:internal"), "the owner hears when it could not run");
  assert.ok(!/sendBuyerAcknowledgement|deliverPaymentEmail\(/.test(helper), "nothing goes to the buyer");
});

test("a full refund or dispute takes founding credits back; a dispute won puts them back", () => {
  const moneyBack = hook.slice(hook.indexOf("async function handleMoneyBack("), hook.indexOf("async function noteSubscriptionEnd("));
  assert.ok(moneyBack.includes("await reverseFoundingCredits(supabase, { keys: foundingKeys, restore: restoring });"));
  assert.ok(moneyBack.includes("if (!outcome.partial && (!restoring || willFlip || !purchase))"), "never on a partial refund; restore only on a real flip back");
  assert.ok(moneyBack.includes("const foundingKeys = purchase ? [purchase.stripe_session_id] : candidates;"), "a Sales Desk invoice with no purchases row is still found");
  assert.ok(moneyBack.includes("await foundingAppliedLine(supabase, foundingKeys, outcome.partial, restoring)"), "the owner is told in the refund alert");
});

test("the client sees the seat in the playbook's words, and no price talk anywhere founding is shown", () => {
  assert.equal(TLFP_FOUNDING.valueLine, "A dollar of our work each. Yours to spend or hold.");
  assert.ok(!/send/i.test(TLFP_FOUNDING.valueLine), "credits are not transferable until they can be claimed as TLFP");
  assert.ok(card.includes("{TLFP_FOUNDING.valueLine}") && page.includes("{TLFP_FOUNDING.valueLine}"));
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

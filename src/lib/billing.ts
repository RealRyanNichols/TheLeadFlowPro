/**
 * Task-based micro-billing engine.
 *
 * Pricing model (per Ryan's directive 2026-04-17):
 *   - Tier prices stay fixed for accounts/leads/seats.
 *   - Heavy work (AI generations, audience scans, media renders, big syncs)
 *     is billed per-task on top.
 *   - Users can pre-set an auto-approve cap. If a task would push their
 *     credit balance below zero, we auto-charge a $5 micro-purchase up
 *     to the cap. Past the cap → ask, never silently bill.
 *
 * Key design choices:
 *   - One source of truth for per-task cost (TASK_COSTS) so the dashboard
 *     can preview "this will cost ~$0.06" before the user clicks.
 *   - Monthly anchor on User: we reset autoApproveSpentThisMonth when we
 *     cross a 30-day boundary from the anchor.
 *   - All Stripe writes go through `microPurchase()`. Success of the
 *     PaymentIntent is reflected back via the existing Stripe webhook
 *     handler, which calls `recordChargeSucceeded()`.
 *
 * Nothing here ever fakes a credit balance — if Stripe fails, the user
 * gets a real error, not a phantom charge.
 */

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { addCents, currency } from "@/lib/utils-money";

/* ---------- Per-task cost table -------------------------------------- */

export type BillableTaskKind =
  | "ai_action"
  | "social_sync"
  | "audience_scan"
  | "ad_generation"
  | "media_render"
  | "outreach_sms"
  | "custom";

/**
 * Default cost in cents for each billable task kind.
 * These are 70%+ margin over real LLM/API spend (see costs.ts notes).
 * `custom` lets callers pass an explicit cost (e.g. variable LLM tokens).
 */
export const TASK_COSTS: Record<BillableTaskKind, number> = {
  ai_action:    4,    // $0.04 — chatbot turn / insight refresh
  social_sync:  3,    // $0.03 — pull a single platform's metrics
  audience_scan: 90,  // $0.90 — full multi-platform crawl
  ad_generation: 25,  // $0.25 — Sonnet ad copy + scoring
  media_render:  35,  // $0.35 — image / short clip render
  outreach_sms:  3,   // $0.03 — Twilio + Flo handling
  custom:        0,   // caller supplies costCents explicitly
};

export const MICRO_PURCHASE_DEFAULT_CENTS = 500; // $5

/* ---------- Public surface ------------------------------------------- */

export interface ChargeResult {
  ok: boolean;
  /** Discriminator for the UI: "charged" debited credit, "topped_up" auto-purchased,
   *  "needs_purchase" means the cap is hit and the user must approve, "failed" = Stripe error. */
  outcome:
    | "charged"
    | "topped_up_and_charged"
    | "needs_purchase"
    | "blocked_disabled"
    | "failed";
  /** Updated credit balance in cents after this call. */
  creditsCents: number;
  /** Amount of the in-flight or completed micro-purchase, when one was triggered. */
  microPurchaseCents?: number;
  /** Stripe PaymentIntent client_secret if the user must approve a top-up. */
  clientSecret?: string;
  /** Human-readable explanation when something needs surfacing. */
  reason?: string;
  /** The BillableTask row id for ledger lookups. */
  billableTaskId?: string;
}

interface ChargeArgs {
  userId: string;
  kind: BillableTaskKind;
  /** Required when kind === "custom"; ignored otherwise. */
  costCentsOverride?: number;
  /** Free-form context stashed on the BillableTask for the user-facing ledger. */
  context?: Record<string, unknown>;
  /** Description shown in the auto-approve receipt. */
  description?: string;
}

/**
 * Charge for a task. Drives the auto-approve flow when needed.
 *
 * Behavior matrix:
 *   1. balance ≥ cost                     → debit + record (outcome: "charged")
 *   2. cap > 0 and (spent + $5) ≤ cap     → micro-purchase $5 then debit
 *      (outcome: "topped_up_and_charged"; clientSecret returned for SCA cases)
 *   3. cap === 0 OR cap exceeded          → no charge; UI must prompt
 *      (outcome: "needs_purchase")
 *   4. Stripe failure                     → outcome: "failed"
 */
export async function chargeForTask(args: ChargeArgs): Promise<ChargeResult> {
  const cost =
    args.kind === "custom"
      ? Math.max(0, args.costCentsOverride ?? 0)
      : TASK_COSTS[args.kind];

  if (cost <= 0) {
    return {
      ok: true, outcome: "charged",
      creditsCents: (await getUserBalance(args.userId)) ?? 0,
      reason: "Free task — no credit consumed.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: {
      taskCreditsCents: true,
      microPurchaseCents: true,
      autoApproveMonthlyCapCents: true,
      autoApproveSpentThisMonth: true,
      autoApproveMonthAnchor: true,
      stripeCustomerId: true,
    },
  });
  if (!user) {
    return { ok: false, outcome: "failed", creditsCents: 0, reason: "User not found." };
  }

  // Reset monthly counter if we're past the anchor + 30d
  await maybeResetMonthlyAnchor(args.userId, user.autoApproveMonthAnchor);

  // Branch 1: balance covers it
  if (user.taskCreditsCents >= cost) {
    return debitAndRecord(args, cost);
  }

  // Need a top-up. Determine if auto-approve covers it.
  const microSize = Math.max(100, user.microPurchaseCents || MICRO_PURCHASE_DEFAULT_CENTS);
  const cap = user.autoApproveMonthlyCapCents || 0;
  const spent = user.autoApproveSpentThisMonth || 0;
  const willSpend = spent + microSize;

  if (cap === 0) {
    return {
      ok: false,
      outcome: "needs_purchase",
      creditsCents: user.taskCreditsCents,
      microPurchaseCents: microSize,
      reason: "Auto-approve isn't on. Approve a top-up to keep going.",
    };
  }

  if (willSpend > cap) {
    return {
      ok: false,
      outcome: "needs_purchase",
      creditsCents: user.taskCreditsCents,
      microPurchaseCents: microSize,
      reason: `You've used $${currency(spent)} of your $${currency(cap)} monthly auto-approve cap. Approve another top-up to continue.`,
    };
  }

  // Branch 2: auto-approve micro-purchase
  const purchase = await microPurchase({
    userId: args.userId,
    cents: microSize,
    description: args.description ?? `Auto top-up for ${args.kind}`,
    autoApproved: true,
    stripeCustomerId: user.stripeCustomerId,
  });
  if (!purchase.ok) {
    return {
      ok: false,
      outcome: "failed",
      creditsCents: user.taskCreditsCents,
      reason: purchase.reason ?? "Stripe couldn't complete the top-up.",
    };
  }

  // Optimistically credit & debit so the user isn't blocked while the webhook
  // confirms. If the webhook later marks the charge failed, we'll claw the
  // credit back via `recordChargeFailed()`.
  await prisma.user.update({
    where: { id: args.userId },
    data: {
      taskCreditsCents: { increment: microSize },
      autoApproveSpentThisMonth: { increment: microSize },
    },
  });
  const debit = await debitAndRecord(args, cost);

  return {
    ...debit,
    outcome: "topped_up_and_charged",
    microPurchaseCents: microSize,
    clientSecret: purchase.clientSecret,
  };
}

/* ---------- Internal helpers ----------------------------------------- */

async function getUserBalance(userId: string): Promise<number | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { taskCreditsCents: true },
  });
  return u?.taskCreditsCents ?? null;
}

async function debitAndRecord(args: ChargeArgs, cost: number): Promise<ChargeResult> {
  const updated = await prisma.user.update({
    where: { id: args.userId },
    data: { taskCreditsCents: { decrement: cost } },
    select: { taskCreditsCents: true },
  });
  const task = await prisma.billableTask.create({
    data: {
      userId: args.userId,
      kind: args.kind as any,
      costCents: cost,
      context: (args.context ?? null) as any,
    },
    select: { id: true },
  });
  return {
    ok: true,
    outcome: "charged",
    creditsCents: updated.taskCreditsCents,
    billableTaskId: task.id,
  };
}

async function maybeResetMonthlyAnchor(userId: string, anchor: Date | null) {
  const now = Date.now();
  const needsReset = !anchor || now - anchor.getTime() > 30 * 24 * 60 * 60 * 1000;
  if (!needsReset) return;
  await prisma.user.update({
    where: { id: userId },
    data: {
      autoApproveSpentThisMonth: 0,
      autoApproveMonthAnchor: new Date(),
    },
  });
}

/* ---------- Stripe micro-purchase ------------------------------------ */

interface MicroPurchaseArgs {
  userId: string;
  cents: number;
  description: string;
  autoApproved: boolean;
  stripeCustomerId: string | null;
}

interface MicroPurchaseResult {
  ok: boolean;
  reason?: string;
  paymentIntentId?: string;
  clientSecret?: string;
}

let stripeClient: Stripe | null = null;
function stripe(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  // Pin to a known API version. The cast keeps TS happy across stripe lib bumps.
  stripeClient = new Stripe(key, { apiVersion: "2024-09-30.acacia" as any });
  return stripeClient;
}

export async function microPurchase(args: MicroPurchaseArgs): Promise<MicroPurchaseResult> {
  if (!args.stripeCustomerId) {
    return { ok: false, reason: "No Stripe customer on file. Add a payment method first." };
  }

  // Record the pending TaskCharge first so we have an idempotency anchor.
  const charge = await prisma.taskCharge.create({
    data: {
      userId: args.userId,
      kind: args.autoApproved ? ("auto_approved" as any) : ("user_approved" as any),
      status: "pending" as any,
      amountCents: args.cents,
      description: args.description,
    },
    select: { id: true },
  });

  try {
    const intent = await stripe().paymentIntents.create(
      {
        customer: args.stripeCustomerId,
        amount: args.cents,
        currency: "usd",
        description: args.description,
        metadata: {
          taskChargeId: charge.id,
          userId: args.userId,
          autoApproved: args.autoApproved ? "1" : "0",
        },
        // Off-session lets us auto-charge a saved card without an extra prompt.
        confirm: args.autoApproved,
        off_session: args.autoApproved,
        // Reuse the customer's default payment method. If none, Stripe will
        // throw and we surface a clear error to the user.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      },
      { idempotencyKey: `tc_${charge.id}` },
    );

    await prisma.taskCharge.update({
      where: { id: charge.id },
      data: { stripePaymentIntentId: intent.id },
    });

    return {
      ok: true,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret ?? undefined,
    };
  } catch (err) {
    const msg = err instanceof Stripe.errors.StripeError ? err.message : String(err);
    await prisma.taskCharge.update({
      where: { id: charge.id },
      data: { status: "failed" as any, description: `${args.description} — ${msg.slice(0, 200)}` },
    });
    return { ok: false, reason: msg };
  }
}

/* ---------- Webhook integration -------------------------------------- */

export async function recordChargeSucceeded(stripePaymentIntentId: string) {
  const charge = await prisma.taskCharge.findUnique({
    where: { stripePaymentIntentId },
  });
  if (!charge || charge.status === "succeeded") return;

  await prisma.$transaction([
    prisma.taskCharge.update({
      where: { id: charge.id },
      data: { status: "succeeded" as any },
    }),
    // The optimistic credit was already applied at chargeForTask() time.
    // Nothing else to do — webhook just promotes status.
  ]);
}

export async function recordChargeFailed(stripePaymentIntentId: string, reason: string) {
  const charge = await prisma.taskCharge.findUnique({
    where: { stripePaymentIntentId },
  });
  if (!charge || charge.status === "failed") return;
  await prisma.$transaction([
    prisma.taskCharge.update({
      where: { id: charge.id },
      data: { status: "failed" as any, description: `${charge.description} — ${reason.slice(0, 200)}` },
    }),
    // Roll the optimistic credit back.
    prisma.user.update({
      where: { id: charge.userId },
      data: {
        taskCreditsCents: { decrement: charge.amountCents },
        autoApproveSpentThisMonth: { decrement: charge.amountCents },
      },
    }),
  ]);
}

/* ---------- Re-exports for the dashboard ----------------------------- */

export function describeKind(kind: BillableTaskKind): string {
  switch (kind) {
    case "ai_action":     return "AI action";
    case "social_sync":   return "Social sync";
    case "audience_scan": return "Audience scan";
    case "ad_generation": return "Ad generation";
    case "media_render":  return "Media render";
    case "outreach_sms":  return "Outreach SMS";
    case "custom":        return "Custom task";
  }
}

export { addCents };

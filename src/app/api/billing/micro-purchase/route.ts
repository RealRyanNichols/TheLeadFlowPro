/**
 * POST /api/billing/micro-purchase
 *
 * One-tap user-approved $5 (or custom-sized) top-up. Used when the user
 * has auto-approve disabled, or when an auto-charge already hit the cap.
 *
 * Returns the Stripe PaymentIntent client_secret so the dashboard widget can
 * invoke `stripe.confirmCardPayment()` for SCA compliance, even though most
 * one-off charges on a saved card go through silently.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { microPurchase, MICRO_PURCHASE_DEFAULT_CENTS } from "@/lib/billing";

const Body = z.object({
  cents: z.number().int().min(100).max(5_000).optional(),
  description: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json().catch(() => ({})));
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof z.ZodError ? err.errors[0]?.message : "Invalid input" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { microPurchaseCents: true, stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { ok: false, reason: "Add a payment method on the Billing page first." },
      { status: 402 },
    );
  }

  const cents = parsed.cents ?? user.microPurchaseCents ?? MICRO_PURCHASE_DEFAULT_CENTS;
  const result = await microPurchase({
    userId,
    cents,
    description: parsed.description ?? "Manual top-up",
    autoApproved: false,
    stripeCustomerId: user.stripeCustomerId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 402 });
  }
  return NextResponse.json({
    ok: true,
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
  });
}

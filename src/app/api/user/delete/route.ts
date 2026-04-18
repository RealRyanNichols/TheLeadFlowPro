import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Cancel any active subscription at Stripe and delete the Stripe customer
  // (Stripe retains the data for your records but stops all billing).
  if (user.stripeSubscriptionId) {
    try {
      await stripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch { /* already gone, ignore */ }
  }
  if (user.stripeCustomerId) {
    try {
      await stripe().customers.del(user.stripeCustomerId);
    } catch { /* already gone, ignore */ }
  }

  // Deleting the User cascades to Leads, Automations, Insights, etc.
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}

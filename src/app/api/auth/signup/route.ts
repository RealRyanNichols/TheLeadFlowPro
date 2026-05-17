import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { stripe } from "@/lib/stripe";
import { isAdminEmail } from "@/lib/admin-identity";

export const runtime = "nodejs";

const SignupSchema = z.object({
  email:        z.string().email().transform((s) => s.toLowerCase().trim()),
  password:     z.string().min(8, "Password must be at least 8 characters"),
  name:         z.string().trim().min(1).max(80).optional(),
  businessName: z.string().trim().min(1).max(120).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { email, password, name, businessName } = parsed.data;

    if (isAdminEmail(email)) {
      return NextResponse.json(
        { error: "Admin accounts are created from the secure bootstrap path. Use the existing admin login." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists. Try signing in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    let stripeCustomerId: string | null = null;

    try {
      const customer = await stripe().customers.create({
        email,
        name: name || undefined,
        metadata: { app: "leadflowpro", businessName: businessName || "" }
      });
      stripeCustomerId = customer.id;
    } catch (err) {
      // Login should never be blocked by payment wiring. Checkout and the
      // billing portal both attach a Stripe customer later if this is missing.
      console.warn("signup_stripe_customer_skipped", {
        emailDomain: email.split("@")[1] || "unknown",
        reason: err instanceof Error ? err.message : "unknown",
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        businessName: businessName || null,
        passwordHash,
        stripeCustomerId,
        plan: "free"
      },
      select: { id: true, email: true, name: true, stripeCustomerId: true }
    });

    return NextResponse.json({ ok: true, user, stripeCustomerReady: Boolean(stripeCustomerId) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

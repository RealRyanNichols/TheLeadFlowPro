import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { stripe } from "@/lib/stripe";

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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists. Try signing in." },
        { status: 409 }
      );
    }

    // Create the Stripe customer first so we never orphan a user without one.
    // If Stripe is down, fail the signup — better than inconsistency.
    const customer = await stripe().customers.create({
      email,
      name: name || undefined,
      metadata: { app: "leadflowpro", businessName: businessName || "" }
    });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        businessName: businessName || null,
        passwordHash,
        stripeCustomerId: customer.id,
        plan: "free"
      },
      select: { id: true, email: true, name: true }
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { CHECKOUT_TYPES, createCheckoutOrder } from "@/lib/leadflow-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CheckoutCreateSchema = z.object({
  type: z.enum(CHECKOUT_TYPES),
  id: z.string().trim().min(2).max(180),
  intendedUse: z.string().trim().min(12).max(1200),
  confirmedAllowedUse: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const parsed = CheckoutCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid checkout request." }, { status: 400 });
  }

  const result = await createCheckoutOrder({
    ...parsed.data,
    origin: req.headers.get("origin"),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
  }
  return NextResponse.json(result);
}

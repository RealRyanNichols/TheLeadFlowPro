import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { weirdProductByKey } from "@/lib/weird-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  question: z.string().min(6).max(600),
  category: z.string().max(80).optional(),
  reason: z.string().max(1200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  displayName: z.string().max(120).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  urgency: z.enum(["standard", "priority"]).default("standard"),
  productKey: z.string().optional(),
  sourcePage: z.string().optional(),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors[0]?.message : "Invalid request" },
      { status: 400 },
    );
  }

  const product = weirdProductByKey(parsed.productKey);
  try {
    const row = await (prisma as any).statRequest.create({
      data: {
        question: parsed.question,
        category: parsed.category || "Internet",
        reason: parsed.reason || null,
        email: parsed.email ? parsed.email.toLowerCase() : null,
        displayName: parsed.displayName || null,
        visibility: parsed.visibility,
        urgency: parsed.urgency,
        status: "new",
        paymentStatus: "unpaid",
        paidAmount: product?.amount ?? 0,
      },
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      id: `pending_${Date.now()}`,
      source: "database_fallback",
      warning:
        "Request accepted in the browser fallback. Push the new stat_request table to persist it.",
      error: error instanceof Error ? error.message : "database unavailable",
    });
  }
}

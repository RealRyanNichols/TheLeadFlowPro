import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buyerAuthRedirectTo, sendBuyerMagicLink, SupabaseBuyerAuthConfigError } from "@/lib/supabase-buyer-auth";
import { trackBuyerEvent } from "@/lib/buyer-portal";

export const runtime = "nodejs";

const MagicLinkSchema = z.object({
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  next: z.string().trim().max(220).optional().default("/buyer"),
});

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/buyer";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = MagicLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid magic link request." }, { status: 400 });
    }

    const next = safeNext(parsed.data.next);
    await sendBuyerMagicLink(parsed.data.email, buyerAuthRedirectTo(req, next));
    await trackBuyerEvent("buyer_login_started", { method: "magic_link" }).catch(() => null);

    return NextResponse.json({
      ok: true,
      message: "Magic link sent. Open the email on this device to enter the buyer portal.",
    });
  } catch (error: unknown) {
    if (error instanceof SupabaseBuyerAuthConfigError) {
      return NextResponse.json({ error: "Supabase Auth is not configured for magic links yet." }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Magic link failed." }, { status: 500 });
  }
}

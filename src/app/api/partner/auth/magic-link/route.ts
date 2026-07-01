import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackPartnerEvent } from "@/lib/partner-portal";
import { partnerAuthRedirectTo, sendPartnerMagicLink, SupabaseBuyerAuthConfigError } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const MagicLinkSchema = z.object({
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  next: z.string().trim().max(220).optional().default("/partner"),
});

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/partner";
}

export async function POST(req: NextRequest) {
  try {
    const parsed = MagicLinkSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid partner magic link request." }, { status: 400 });
    }

    const next = safeNext(parsed.data.next);
    await sendPartnerMagicLink(parsed.data.email, partnerAuthRedirectTo(req, next));
    await trackPartnerEvent("partner_signup_started", { method: "magic_link", route: "/partner/login" }).catch(() => null);

    return NextResponse.json({
      ok: true,
      message: "Partner magic link sent. Open the email on this device to enter the partner portal.",
    });
  } catch (error: unknown) {
    if (error instanceof SupabaseBuyerAuthConfigError) {
      return NextResponse.json({ error: "Supabase Auth is not configured for partner magic links yet." }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Partner magic link failed." }, { status: 500 });
  }
}

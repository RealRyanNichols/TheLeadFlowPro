import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensurePartnerAccountForUser, trackPartnerEvent } from "@/lib/partner-portal";
import { getSupabaseBuyerUser, setBuyerAuthCookies } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const SessionSchema = z.object({
  access_token: z.string().trim().min(20),
  refresh_token: z.string().trim().min(20).optional(),
  expires_in: z.coerce.number().int().min(60).max(60 * 60 * 24 * 30).optional(),
  expires_at: z.coerce.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = SessionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid Supabase partner session." }, { status: 400 });
    }

    const session = parsed.data;
    const user = await getSupabaseBuyerUser(session.access_token);
    const account = await ensurePartnerAccountForUser(user).catch(() => null);
    await trackPartnerEvent("partner_signup_completed", {
      method: "magic_or_oauth",
      auth_user_id: user.id,
      partner_account_id: account?.id || "pending",
      route: "/partner/login",
    }).catch(() => null);

    const response = NextResponse.json({ ok: true, redirectTo: "/partner" });
    setBuyerAuthCookies(response, { ...session, user });
    return response;
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Partner session failed." }, { status: 500 });
  }
}

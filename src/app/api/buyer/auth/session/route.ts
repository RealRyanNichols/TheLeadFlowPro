import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureBuyerAccountForUser, trackBuyerEvent } from "@/lib/buyer-portal";
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
    const body = await req.json().catch(() => ({}));
    const parsed = SessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid Supabase session." }, { status: 400 });
    }

    const session = parsed.data;
    const user = await getSupabaseBuyerUser(session.access_token);
    await ensureBuyerAccountForUser(user).catch(() => null);
    await trackBuyerEvent("buyer_login", { method: "magic_or_oauth", auth_user_id: user.id }).catch(() => null);

    const response = NextResponse.json({ ok: true, redirectTo: "/buyer" });
    setBuyerAuthCookies(response, { ...session, user });
    return response;
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Buyer session failed." }, { status: 500 });
  }
}

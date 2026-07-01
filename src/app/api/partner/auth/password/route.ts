import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensurePartnerAccountForUser, trackPartnerEvent } from "@/lib/partner-portal";
import {
  setBuyerAuthCookies,
  signInBuyerWithPassword,
  signUpPartnerWithPassword,
  SupabaseBuyerAuthConfigError,
} from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const PartnerPasswordAuthSchema = z.object({
  mode: z.enum(["signin", "signup"]),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = PartnerPasswordAuthSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid partner auth request." }, { status: 400 });
    }

    const data = parsed.data;
    await trackPartnerEvent("partner_signup_started", { method: data.mode === "signup" ? "password_signup" : "password", route: "/partner/login" }).catch(() => null);

    const session =
      data.mode === "signin"
        ? await signInBuyerWithPassword(data.email, data.password)
        : await signUpPartnerWithPassword({ email: data.email, password: data.password, name: data.name, company: data.company });

    if (!session.access_token || !session.user) {
      return NextResponse.json({
        ok: true,
        needsEmailConfirmation: true,
        message: "Supabase accepted the request. Check email if confirmation is required before partner login.",
      });
    }

    const account = await ensurePartnerAccountForUser(session.user).catch(() => null);
    await trackPartnerEvent("partner_signup_completed", {
      method: data.mode === "signup" ? "password_signup" : "password",
      auth_user_id: session.user.id,
      partner_account_id: account?.id || "pending",
      route: "/partner/login",
    }).catch(() => null);

    const response = NextResponse.json({ ok: true, redirectTo: "/partner" });
    setBuyerAuthCookies(response, session);
    return response;
  } catch (error: unknown) {
    if (error instanceof SupabaseBuyerAuthConfigError) {
      return NextResponse.json({ error: "Supabase Auth is not configured for partner login yet." }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Partner auth failed." }, { status: 500 });
  }
}

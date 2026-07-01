import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  setBuyerAuthCookies,
  signInBuyerWithPassword,
  signUpBuyerWithPassword,
  SupabaseBuyerAuthConfigError,
} from "@/lib/supabase-buyer-auth";
import { ensureBuyerAccountForUser, trackBuyerEvent } from "@/lib/buyer-portal";

export const runtime = "nodejs";

const PasswordAuthSchema = z.object({
  mode: z.enum(["signin", "signup"]),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(120).optional().default(""),
  company: z.string().trim().max(160).optional().default(""),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = PasswordAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid buyer auth request." }, { status: 400 });
    }

    const data = parsed.data;
    if (data.mode === "signup") {
      await trackBuyerEvent("buyer_signup_started", { method: "password" }).catch(() => null);
    }

    const session =
      data.mode === "signin"
        ? await signInBuyerWithPassword(data.email, data.password)
        : await signUpBuyerWithPassword({ email: data.email, password: data.password, name: data.name, company: data.company });

    if (!session.access_token || !session.user) {
      return NextResponse.json({
        ok: true,
        needsEmailConfirmation: true,
        message: "Supabase accepted the request. Check email if confirmation is required before login.",
      });
    }

    await ensureBuyerAccountForUser(session.user).catch(() => null);
    await trackBuyerEvent(data.mode === "signup" ? "buyer_signup_completed" : "buyer_login", {
      method: "password",
      auth_user_id: session.user.id,
    }).catch(() => null);

    const response = NextResponse.json({ ok: true, redirectTo: "/buyer" });
    setBuyerAuthCookies(response, session);
    return response;
  } catch (error: unknown) {
    if (error instanceof SupabaseBuyerAuthConfigError) {
      return NextResponse.json({ error: "Supabase Auth is not configured for buyer login yet." }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Buyer auth failed." }, { status: 500 });
  }
}

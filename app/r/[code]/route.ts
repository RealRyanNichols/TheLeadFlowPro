import { NextResponse } from "next/server";
import { TLFP_CREDITS } from "@/lib/tlfpCredits";

// Referral landing: /r/<code> remembers who sent this visitor, then shows them
// TLFP Credits. The code is validated by shape only; the webhook checks it
// against a real account when a purchase clears, so a made-up code costs
// nothing and pays nobody. Nothing here reads or writes the database.

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const clean = String(code ?? "").trim().toUpperCase();
  // Relative to the request, so a preview deployment lands on its own /tlfp.
  const response = NextResponse.redirect(new URL(TLFP_CREDITS.path, request.url), 307);
  if (/^[A-Z0-9]{6,12}$/.test(clean)) {
    response.cookies.set(TLFP_CREDITS.referralCookie, clean, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TLFP_CREDITS.referralCookieDays * 24 * 60 * 60,
    });
  }
  return response;
}

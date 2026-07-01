import { NextRequest, NextResponse } from "next/server";
import { buyerAuthRedirectTo, hasSupabaseBuyerAuthConfig } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!hasSupabaseBuyerAuthConfig()) {
    return NextResponse.redirect(new URL("/login?mode=buyer&auth_error=supabase_not_configured", req.url));
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.LEADREP_BUS_URL || "").replace(/\/$/, "");
  const redirectTo = buyerAuthRedirectTo(req, "/buyer");
  const url = new URL(`${supabaseUrl}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);
  return NextResponse.redirect(url);
}

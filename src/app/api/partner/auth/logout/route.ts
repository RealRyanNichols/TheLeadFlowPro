import { NextResponse } from "next/server";
import { clearBuyerAuthCookies } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true, redirectTo: "/partner/login" });
  clearBuyerAuthCookies(response);
  return response;
}

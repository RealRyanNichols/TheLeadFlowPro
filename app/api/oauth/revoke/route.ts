import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revokeToken } from "@/lib/hq/server";

// RFC 7009. Always answers 200: the spec says a revocation request must
// not reveal whether the token existed.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  const form = new URLSearchParams(text);
  const token = form.get("token") ?? "";
  try {
    if (token) await revokeToken(createServiceClient(), token);
  } catch (e) {
    console.error("OAuth revoke failed:", e instanceof Error ? e.message : "unknown");
  }
  return new NextResponse(null, { status: 200, headers: { ...CORS, "Cache-Control": "no-store" } });
}

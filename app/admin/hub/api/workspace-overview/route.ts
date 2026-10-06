import { NextResponse } from "next/server";
import { nativeOwnerOverview } from "@/lib/adminOwnerSnapshot";
import { OperatorAuthError } from "@/lib/operatoros/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await nativeOwnerOverview(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) {
    if (error instanceof OperatorAuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ error: "The owner snapshot is temporarily unavailable. The native CRM remains available." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

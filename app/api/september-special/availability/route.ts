import { NextResponse } from "next/server";
import { STARTS_AT, ENDS_AT } from "@/lib/septemberSpecial";
import { specialAvailability } from "@/lib/septemberSpecialServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await specialAvailability(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { availableSpots: 0, startsAt: STARTS_AT, endsAt: ENDS_AT, status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

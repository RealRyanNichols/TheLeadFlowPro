import { NextResponse } from "next/server";
import { normalizeLeadRepHandoff, writeLeadRepHandoff } from "@/lib/leadrep-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const handoff = normalizeLeadRepHandoff(body);
    const result = await writeLeadRepHandoff(handoff);
    return NextResponse.json({
      ok: true,
      status: "received",
      package_type: handoff.package_type,
      target_agent: handoff.target_agent,
      dry_run: result.handoff.skipped,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LeadRep handoff failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

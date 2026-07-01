import { NextResponse } from "next/server";
import { normalizeLeadRepHandoff, writeLeadRepResult } from "@/lib/leadrep-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requiredSecret = process.env.LEADREP_API_SECRET;
  if (!requiredSecret) {
    return NextResponse.json({ ok: false, error: "LEADREP_API_SECRET is not configured." }, { status: 503 });
  }

  if (request.headers.get("x-leadrep-secret") !== requiredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = normalizeLeadRepHandoff({
      ...body,
      package_type: body.package_type || "leadsource_clarity",
      source_agent: body.source_agent || "grok",
      target_agent: body.target_agent || "Codex",
      status: body.status || "received",
    });
    const write = await writeLeadRepResult(result);
    return NextResponse.json({ ok: true, status: "received", result: write });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LeadRep result write failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runPulseForAll } from "@/lib/hq/pulse";
import { timingSafeEqualStrings } from "@/lib/hq/crypto";

// The Autopilot heartbeat. Vercel calls this every five minutes
// (vercel.json). Fails closed: no CRON_SECRET, no run.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqualStrings(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ skipped: "supabase service access is not configured" });
  }
  const started = Date.now();
  try {
    const summaries = await runPulseForAll(createServiceClient(), new Date());
    const totals = summaries.reduce(
      (t, s) => ({
        workspaces: t.workspaces + 1,
        newLeadsHandled: t.newLeadsHandled + s.newLeadsHandled,
        alertsSent: t.alertsSent + s.alertsSent,
        autoReplies: t.autoReplies + s.autoReplies,
        followUpsDrafted: t.followUpsDrafted + s.followUpsDrafted,
        briefs: t.briefs + (s.briefBuilt ? 1 : 0),
        reports: t.reports + (s.reportBuilt ? 1 : 0),
        contentDrafted: t.contentDrafted + s.contentDrafted,
        errors: t.errors + s.errors.length,
      }),
      { workspaces: 0, newLeadsHandled: 0, alertsSent: 0, autoReplies: 0, followUpsDrafted: 0, briefs: 0, reports: 0, contentDrafted: 0, errors: 0 },
    );
    for (const s of summaries) for (const e of s.errors) console.error(`hq-pulse ${s.workspaceId}: ${e}`);
    return NextResponse.json({ ok: true, ms: Date.now() - started, ...totals });
  } catch (e) {
    console.error("hq-pulse failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "pulse failed" }, { status: 500 });
  }
}

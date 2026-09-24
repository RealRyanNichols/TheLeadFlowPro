import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import { SPEED_TO_LEAD_SWEEP_LIMIT, speedToLeadEnabled } from "@/lib/speedToLead";
import { sweepSpeedToLeadJobs } from "@/lib/speedToLeadServer";

// Speed to lead, the safety net. Every minute (vercel.json) this delivers
// whatever the intake routes did not finish: leads from every other insert
// path, retries, first texts held overnight for quiet hours, and anything
// stuck mid-send. Off until SPEED_TO_LEAD_ENABLED is exactly "true".
//
// Needs CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY; sends need QUO_API_KEY
// (texts, and QUO_OUTBOUND_SMS_DISABLED="false") and RESEND_API_KEY (email).

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Fail closed: no secret configured means nobody can trigger a service-role run.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!speedToLeadEnabled(process.env)) {
    return NextResponse.json({ ok: true, skipped: "SPEED_TO_LEAD_ENABLED is not true" });
  }

  const runtimeIdentityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
  if (runtimeIdentityIssues.length) {
    console.error("Speed to lead sweep identity check failed:", runtimeIdentityIssues.join("; "));
    return NextResponse.json({ error: "LeadFlow database identity check failed" }, { status: 503 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    console.error("Speed to lead sweep unavailable: SUPABASE_SERVICE_ROLE_KEY missing");
    return NextResponse.json({ error: "Speed to lead sweep is not configured" }, { status: 503 });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const summary = await sweepSpeedToLeadJobs(supabase, SPEED_TO_LEAD_SWEEP_LIMIT);
    // A job that failed for good is on its row and in lead_activity; a 500
    // also puts it in the Vercel cron log where somebody will see it.
    const status = summary.failed > 0 || summary.errors > 0 ? 500 : 200;
    return NextResponse.json({ ok: status === 200, ...summary }, { status });
  } catch (error) {
    console.error("Speed to lead sweep failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Speed to lead sweep failed" }, { status: 500 });
  }
}

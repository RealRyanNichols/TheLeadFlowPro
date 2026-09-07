import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config";
import {
  leadEmailNotificationCronHttpStatus,
  retryPendingLeadEmailNotifications,
} from "@/lib/leadEmailNotifications";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import { retryContactNotifications } from "@/lib/contactNotifications";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runtimeIdentityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
  if (runtimeIdentityIssues.length) {
    console.error(
      "Lead email notification retry identity check failed:",
      runtimeIdentityIssues.join("; "),
    );
    return NextResponse.json({ error: "LeadFlow database identity check failed" }, { status: 503 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!serviceKey || !resendKey) {
    console.error(
      "Lead email notification retry unavailable: missing SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY",
    );
    return NextResponse.json(
      { error: "Lead email notification retry is not configured" },
      { status: 503 },
    );
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const [result, contact] = await Promise.all([
      // A provider outage can use the full five-second timeout per message.
      // Bound the serial lead batch so this 60-second cron can finish reliably.
      retryPendingLeadEmailNotifications(supabase, 8),
      retryContactNotifications(supabase),
    ]);
    const status = contact.failed > 0 ? 500 : leadEmailNotificationCronHttpStatus(result);
    if (status !== 200) {
      console.error(
        "Lead email notification retry produced permanent failures:",
        result.permanently_failed,
      );
      return NextResponse.json(
        {
          ok: false,
          error: "One or more lead email notifications require manual follow-up",
          ...result,
          contact,
        },
        { status },
      );
    }
    return NextResponse.json({ ok: true, ...result, contact }, { status });
  } catch (error) {
    console.error(
      "Lead email notification retry failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Lead email notification retry failed" }, { status: 500 });
  }
}

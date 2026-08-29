import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config";
import { retryPendingDiagnosticNotifications } from "@/lib/diagnosticNotifications";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!serviceKey || !resendKey) {
    console.error(
      "Diagnostic notification retry unavailable: missing SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY",
    );
    return NextResponse.json(
      { error: "Diagnostic notification retry is not configured" },
      { status: 503 },
    );
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await retryPendingDiagnosticNotifications(supabase, 50);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(
      "Diagnostic notification retry failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Diagnostic notification retry failed" }, { status: 500 });
  }
}

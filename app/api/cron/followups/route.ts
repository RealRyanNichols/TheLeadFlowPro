import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  enrollInEmailSeries,
  shouldEnrollInLegacyEmailSeries,
} from "@/lib/leadNotify";
import { runNurturePass } from "@/lib/nurture/sender";

// Daily legacy-series enrollment sweep. Runs on Vercel Cron (vercel.json),
// 10am Central.
//
// The 4-step hardcoded email sequence that used to live here is GONE on
// purpose (2026-08-12, Ryan's call). It overlapped the Resend "Free Build
// 30-Day Email Series" and a lead would have gotten both. The Resend series
// is the one follow-up sequence now.
//
// Eligible non-paid leads are enrolled instantly by notifyNewLead() at capture
// time. This cron is the safety net behind that: it sweeps recent live leads
// and enrolls anyone the instant path missed. Paid Website Launch, package,
// add-on, deposit, checkout, and other explicit product leads are excluded
// before a claim row is written.
//
// Step 0 in lead_emails is the enrollment marker, not an email. The table
// has UNIQUE (lead_id, step), so a lead can never be enrolled twice, even
// if two runs overlap. Steps 1-4 in that table are history from the retired
// sequence; leave them.

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!serviceKey || !resendKey) {
    return NextResponse.json({ ok: true, skipped: "missing SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY" });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);

  // The 30-day Meta lead nurture (steps 101-130 in lead_emails). Fully dark
  // until NURTURE_SEQUENCE_ENABLED=true and NURTURE_LINK_SECRET are set —
  // Ryan flips those only after approving the copy in lib/nurture/emails.ts.
  const nurture = await runNurturePass(supabase, {
    resendKey,
    linkSecret: process.env.NURTURE_LINK_SECRET ?? "",
  });

  // The Free Build 30-Day Email Series is retired. Keep the authenticated cron
  // route alive so scheduled calls remain healthy, but emit no new enrollment
  // events until replacement paid-ladder copy is approved.
  if (!shouldEnrollInLegacyEmailSeries({ interest: "", goals: "", source: "cron" })) {
    return NextResponse.json({
      ok: true,
      skipped: "legacy_free_build_series_retired",
      enrolled: 0,
      nurture,
    });
  }

  const since = new Date(Date.now() - 21 * 86400e3).toISOString();

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, email, status, is_test, email_unsubscribed_at, interest, goals, source",
    )
    .is("deleted_at", null)
    .is("email_unsubscribed_at", null) // never email someone who opted out
    .not("is_test", "is", true) // test rows are not people
    .in("status", ["new", "contacted"])
    .gte("created_at", since);

  const { data: sentRows } = await supabase
    .from("lead_emails")
    .select("lead_id, step")
    .eq("step", 0);
  const enrolledAlready = new Set((sentRows ?? []).map((r) => r.lead_id));

  let enrolled = 0;
  let excludedPaid = 0;
  for (const lead of leads ?? []) {
    if (enrolledAlready.has(lead.id)) continue;
    if (!shouldEnrollInLegacyEmailSeries(lead)) {
      excludedPaid++;
      continue;
    }

    // Claim first (unique constraint = no dupes even on overlapping runs)
    const { error: claimErr } = await supabase
      .from("lead_emails")
      .insert({ lead_id: lead.id, step: 0 });
    if (claimErr) continue;

    await enrollInEmailSeries(lead.email);
    await supabase.from("lead_activity").insert({
      lead_id: lead.id,
      // 'kind' has a CHECK constraint: stage_change | owner_change | note |
      // task | system | message | delete. Anything else throws.
      kind: "system",
      detail: "Enrolled in the 30-day email series",
    });
    enrolled++;
  }

  return NextResponse.json({
    ok: true,
    checked: (leads ?? []).length,
    enrolled,
    excluded_paid: excludedPaid,
    nurture,
  });
}

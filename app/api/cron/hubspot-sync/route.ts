import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/config";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import {
  ensureHubSpotProperties,
  hubspotConfigured,
  upsertContacts,
  type SyncableLead,
} from "@/lib/hubspot";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Supabase -> HubSpot, one direction. Supabase stays the system of record.
 *
 * Re-syncs a rolling window rather than tracking a cursor: the upsert is keyed
 * on email, so replaying a lead is a no-op update. That makes a missed run
 * self-healing instead of a permanent gap.
 */
const WINDOW_HOURS = 72;
const MAX_LEADS_PER_RUN = 500;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runtimeIdentityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
  if (runtimeIdentityIssues.length) {
    console.error("HubSpot sync identity check failed:", runtimeIdentityIssues.join("; "));
    return NextResponse.json({ error: "LeadFlow database identity check failed" }, { status: 503 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }
  if (!hubspotConfigured()) {
    // Not an error. The sync is simply not turned on yet.
    return NextResponse.json(
      { skipped: true, reason: "HUBSPOT_PRIVATE_APP_TOKEN is not set" },
      { status: 200 },
    );
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, email, phone, business_name, website_url, status, source, utm_campaign, interest, timeline",
    )
    .gte("created_at", since)
    .is("deleted_at", null)
    .or("is_test.is.null,is_test.eq.false")
    .order("created_at", { ascending: true })
    .limit(MAX_LEADS_PER_RUN);

  if (error) {
    console.error("HubSpot sync could not read leads:", error.message);
    return NextResponse.json({ error: "Could not read leads" }, { status: 500 });
  }

  const leads = (data ?? []) as SyncableLead[];
  if (leads.length === 0) {
    return NextResponse.json({ ok: true, considered: 0, upserted: 0 });
  }

  const propertyProblems = await ensureHubSpotProperties();
  if (propertyProblems.length) {
    console.error("HubSpot property setup problems:", propertyProblems.join("; "));
  }

  const result = await upsertContacts(leads);

  if (result.errors.length) {
    console.error("HubSpot sync errors:", result.errors.join("; "));
  }

  return NextResponse.json({
    ok: result.failed === 0,
    windowHours: WINDOW_HOURS,
    ...result,
    propertyProblems,
  });
}

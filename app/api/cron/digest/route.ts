import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Monday-morning owner digest → hello@theleadflowpro.com.
// Runs on Vercel Cron. Needs CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!serviceKey || !resendKey) {
    return NextResponse.json({ ok: true, skipped: "missing env" });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString();

  const [{ data: summary }, { data: weekLeads }, { data: weekPurchases }, { data: weekRegs }] =
    await Promise.all([
      supabase.rpc("analytics_summary", { days: 7 }),
      supabase.from("leads").select("full_name, interest, status, utm_source, created_at").is("deleted_at", null).gte("created_at", weekAgo),
      supabase.from("purchases").select("email, kind, amount_cents, created_at").gte("created_at", weekAgo),
      supabase.from("event_registrations").select("full_name, created_at").gte("created_at", weekAgo),
    ]);

  const s = (summary ?? {}) as {
    total_views?: number;
    unique_visitors?: number;
    top_sources?: { source: string; views: number }[];
    top_pages?: { path: string; views: number }[];
  };
  const leads = weekLeads ?? [];
  const purchases = weekPurchases ?? [];
  const revenue = purchases.reduce((t, p) => t + (p.amount_cents ?? 0), 0) / 100;
  const needAction = leads.filter((l) => l.status === "new").length;

  const lines = [
    `THE LEADFLOW PRO — WEEKLY DIGEST`,
    `Straight from your own database. Last 7 days.`,
    ``,
    `MONEY`,
    `  Purchases: ${purchases.length}${revenue ? ` — $${revenue.toLocaleString()}` : ""}`,
    `  Event signups: ${(weekRegs ?? []).length}`,
    ``,
    `LEADS: ${leads.length} new this week${needAction ? ` — ${needAction} still marked "new" and waiting on you` : ""}`,
    ...leads.slice(0, 10).map((l) => `  • ${l.full_name} — ${l.interest}${l.utm_source ? ` (via ${l.utm_source})` : ""} [${l.status}]`),
    leads.length > 10 ? `  …and ${leads.length - 10} more in /admin` : ``,
    ``,
    `TRAFFIC`,
    `  Views: ${s.total_views ?? 0} · Visitors: ${s.unique_visitors ?? 0}`,
    ...(s.top_sources ?? []).slice(0, 5).map((t) => `  • ${t.source}: ${t.views} views`),
    ``,
    `TOP PAGES`,
    ...(s.top_pages ?? []).slice(0, 5).map((p) => `  • ${p.path}: ${p.views}`),
    ``,
    `Next move: clear the "new" leads. https://www.theleadflowpro.com/admin`,
  ];

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "The LeadFlow Pro <hello@theleadflowpro.com>",
      to: ["hello@theleadflowpro.com"],
      subject: `Weekly digest: ${leads.length} leads · ${purchases.length} purchases · ${s.total_views ?? 0} views`,
      text: lines.join("\n"),
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, leads: leads.length, purchases: purchases.length });
}

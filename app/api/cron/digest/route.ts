import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { BUSINESS } from "@/lib/site/business";

// Monday-morning owner digest -> hello@theleadflowpro.com.
// Runs on Vercel Cron. Needs CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

export const dynamic = "force-dynamic";

const money = (cents: number) => (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function GET(request: Request) {
  // Fail closed, like the call sheet cron: no secret configured means nobody
  // can trigger a service-role read of the money tables.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!serviceKey || !resendKey) {
    return NextResponse.json({ ok: true, skipped: "missing env" });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString();

  const [
    { data: summary },
    { data: weekLeads },
    { data: weekPurchases },
    { data: weekRegs },
    { data: weekInvoices },
    { data: workspaces },
  ] = await Promise.all([
    supabase.rpc("analytics_summary", { days: 7 }),
    supabase.from("leads").select("full_name, interest, status, utm_source, created_at").is("deleted_at", null).gte("created_at", weekAgo),
    // Only settled money counts. Refunded, disputed and payment_failed rows stay out of the total.
    supabase.from("purchases").select("email, kind, amount_cents, created_at").eq("status", "paid").gte("created_at", weekAgo),
    supabase.from("event_registrations").select("full_name, created_at").gte("created_at", weekAgo),
    supabase.from("sales_invoices").select("customer_email, subtotal_cents, paid_at").eq("status", "paid").gte("paid_at", weekAgo),
    supabase.from("hq_workspaces").select("plan"),
  ]);

  const s = (summary ?? {}) as {
    total_views?: number;
    unique_visitors?: number;
    top_sources?: { source: string; views: number }[];
    top_pages?: { path: string; views: number }[];
  };
  const leads = weekLeads ?? [];
  const purchases = weekPurchases ?? [];
  const invoices = weekInvoices ?? [];
  const plans = workspaces ?? [];
  const purchaseCents = purchases.reduce((t, p) => t + (p.amount_cents ?? 0), 0);
  const invoiceCents = invoices.reduce((t, i) => t + (i.subtotal_cents ?? 0), 0);
  const pluginActive = plans.filter((w) => w.plan === "active").length;
  const pluginTrial = plans.filter((w) => w.plan === "trial").length;
  const needAction = leads.filter((l) => l.status === "new").length;

  const lines = [
    `THE LEADFLOW PRO | WEEKLY DIGEST`,
    `Straight from your own database. Last 7 days.`,
    ``,
    `MONEY`,
    `  Purchases: ${purchases.length} | $${money(purchaseCents)}`,
    `  Invoices paid: ${invoices.length} | $${money(invoiceCents)}`,
    `  Plugin: ${pluginActive} active, ${pluginTrial} on trial`,
    `  Event signups: ${(weekRegs ?? []).length}`,
    ``,
    `LEADS: ${leads.length} new this week${needAction ? ` | ${needAction} still marked "new" and waiting on you` : ""}`,
    ...leads.slice(0, 10).map((l) => `  • ${l.full_name} | ${l.interest}${l.utm_source ? ` (via ${l.utm_source})` : ""} [${l.status}]`),
    leads.length > 10 ? `  ...and ${leads.length - 10} more in /admin` : ``,
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

  // A rejected or failed send is a failed cron run: return 500 so the Vercel
  // cron log shows it instead of a green "ok" on an email that never left.
  let sent: Response;
  try {
    sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
        to: [BUSINESS.email.hello],
        subject: `Weekly digest: ${leads.length} leads · ${purchases.length} purchases · ${invoices.length} invoices · ${s.total_views ?? 0} views`,
        text: lines.join("\n"),
      }),
    });
  } catch (e: unknown) {
    console.error("digest send failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "digest_send_rejected" }, { status: 500 });
  }
  if (!sent.ok) {
    console.error("digest send rejected:", sent.status);
    return NextResponse.json({ ok: false, error: "digest_send_rejected" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    leads: leads.length,
    purchases: purchases.length,
    invoices: invoices.length,
    plugin: { active: pluginActive, trial: pluginTrial },
  });
}

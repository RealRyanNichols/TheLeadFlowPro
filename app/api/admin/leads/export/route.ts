import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Admin-only CSV export of the full leads table. Gated on profiles.role =
// 'admin'; RLS provides the second wall.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }

  const columns = [
    "id",
    "created_at",
    "full_name",
    "email",
    "phone",
    "business_name",
    "website_url",
    "industry",
    "current_platform",
    "interest",
    "status",
    "owner",
    "budget_range",
    "timeline",
    "best_contact_method",
    "desired_modules",
    "goals",
    "source",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "sms_consent",
    "marketing_email_consent",
    "consent_at",
    "email_unsubscribed_at",
    "sms_unsubscribed_at",
    "is_test",
    "diagnostic",
  ];

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v)
      ? v.join("; ")
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = [
    columns.join(","),
    ...(leads ?? []).map((l) =>
      columns.map((c) => escape((l as Record<string, unknown>)[c])).join(","),
    ),
  ];

  return new NextResponse(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leadflow-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

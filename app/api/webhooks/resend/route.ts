import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import { activityDetail, resendEventActivity, verifyResendSignature } from "@/lib/resendEvents";

// Resend webhook: opens, clicks, bounces and spam reports land on the lead's
// timeline in the Back Office (lib/resendEvents.ts says what is kept).
// Fails CLOSED: no signing secret, no service key, or a bad signature, and
// nothing is read or written. Resend retries a non-2xx for a day, so a missing
// secret only delays events; it never loses them silently.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });

  const body = await request.text();
  const verified = verifyResendSignature(
    secret,
    request.headers.get("svix-id"),
    request.headers.get("svix-timestamp"),
    request.headers.get("svix-signature"),
    body,
    Date.now(),
  );
  if (!verified) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const activity = resendEventActivity(event);
  if (!activity) return NextResponse.json({ ok: true, recorded: false });

  const identityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (identityIssues.length || !serviceKey) {
    return NextResponse.json({ error: "database not available" }, { status: 503 });
  }
  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);

  // Which lead: the lead_id tag first, the recipient address second.
  let leadId: string | null = null;
  if (activity.leadId) {
    const { data } = await supabase.from("leads").select("id").eq("id", activity.leadId).maybeSingle();
    leadId = (data as { id: string } | null)?.id ?? null;
  }
  if (!leadId && activity.email) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .ilike("email", activity.email)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    leadId = ((data as { id: string }[] | null) ?? [])[0]?.id ?? null;
  }
  // Mail to someone who is not a lead (an owner alert, a test) is not recorded.
  if (!leadId) return NextResponse.json({ ok: true, recorded: false, reason: "no lead" });

  const detail = activityDetail(activity);
  const { data: seen } = await supabase
    .from("lead_activity")
    .select("id")
    .eq("lead_id", leadId)
    .like("detail", `%Ref ${activity.ref}`)
    .limit(1);
  if ((seen as unknown[] | null)?.length) return NextResponse.json({ ok: true, recorded: false, duplicate: true });

  const { error } = await supabase.from("lead_activity").insert({ lead_id: leadId, kind: "email", detail });
  if (error) {
    console.error("Resend webhook activity insert failed:", error.message);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  if (activity.stopEmails) {
    await supabase
      .from("leads")
      .update({ email_unsubscribed_at: new Date().toISOString() })
      .eq("id", leadId)
      .is("email_unsubscribed_at", null);
  }

  return NextResponse.json({ ok: true, recorded: true });
}

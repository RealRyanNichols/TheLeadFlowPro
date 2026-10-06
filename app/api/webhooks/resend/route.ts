import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import { recordResendActivity, resendEventActivity, verifyResendSignature } from "@/lib/resendEvents";

// Resend webhook: acceptance, delivery, opens, clicks, bounces and spam reports land on the lead's
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

  try {
    const result = await recordResendActivity(activity, {
      async findLead(item) {
        // Which lead: the lead_id tag first, the recipient address second.
        if (item.leadId) {
          const { data, error } = await supabase.from("leads").select("id").eq("id", item.leadId).maybeSingle();
          if (error) throw new Error("lead lookup failed");
          const taggedId = (data as { id: string } | null)?.id;
          if (taggedId) return taggedId;
        }
        if (!item.email) return null;
        const { data, error } = await supabase
          .from("leads")
          .select("id")
          .ilike("email", item.email)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw new Error("recipient lookup failed");
        return ((data as { id: string }[] | null) ?? [])[0]?.id ?? null;
      },
      async suppressEmails(leadId) {
        const { error } = await supabase
          .from("leads")
          .update({ email_unsubscribed_at: new Date().toISOString() })
          .eq("id", leadId)
          .is("email_unsubscribed_at", null);
        if (error) throw new Error("email suppression failed");
      },
      async hasLegacyActivity(leadId, ref) {
        // Preserve dedupe against random-id rows written by the older handler.
        const { data, error } = await supabase
          .from("lead_activity")
          .select("id")
          .eq("lead_id", leadId)
          .like("detail", `%Ref ${ref}`)
          .limit(1);
        if (error) throw new Error("activity lookup failed");
        return Boolean((data as unknown[] | null)?.length);
      },
      async insertActivity(row) {
        const { error } = await supabase.from("lead_activity").insert(row);
        // A concurrent copy has the same UUID and meets the existing primary key.
        if (error?.code === "23505") return "duplicate";
        if (error) throw new Error("activity insert failed");
        return "inserted";
      },
    });
    return NextResponse.json(result);
  } catch {
    // Never log provider payloads or database errors that could contain PII.
    console.error("Resend webhook storage failed");
    return NextResponse.json({ error: "storage failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Inbound SMS from Quo. This is the half that makes the lead thread an actual
// conversation instead of a send log: when someone texts (903) 500-8898 back,
// their reply lands on their own lead record.
//
// SETUP (one time, in the Quo dashboard):
//   Webhooks -> new webhook -> event "message.received"
//   URL: https://www.theleadflowpro.com/api/quo-inbound?secret=<QUO_WEBHOOK_SECRET>
// Set QUO_WEBHOOK_SECRET in Vercel to any long random string.
//
// Until that webhook is pointed here this route simply never fires, and the
// thread still works for outbound plus anything logged by hand.
//
// Uses the service role key because Quo is unauthenticated to Supabase and
// lead_messages is admin-only under RLS. The shared secret is the gate.

function normalize(phone: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  return digits.slice(-10); // match on the last 10 so +1/1/formatting all agree
}

export async function POST(request: Request) {
  const secret = process.env.QUO_WEBHOOK_SECRET;
  const given = new URL(request.url).searchParams.get("secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("quo-inbound: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  // Quo wraps the message in data.object for message.* events.
  const obj = payload?.data?.object ?? payload?.data ?? payload;
  const text = String(obj?.text ?? obj?.body ?? obj?.content ?? "").trim();
  const from = obj?.from?.phoneNumber ?? obj?.from ?? "";
  const providerId = obj?.id ? String(obj.id) : null;
  const direction = String(obj?.direction ?? "incoming");

  // Ignore our own outbound echo, and anything with no usable content.
  if (direction !== "incoming" || !text || !from) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });

  const last10 = normalize(from);
  if (last10.length < 10) return NextResponse.json({ ok: true, skipped: true });

  // Most recent live lead with this number. Phone formats vary by intake
  // source, so match on the trailing 10 digits rather than exact string.
  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone, full_name")
    .not("phone", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const lead = (leads ?? []).find((l) => normalize(l.phone as string) === last10);
  if (!lead) {
    // Not a known lead. Log it rather than dropping it, so a reply from a
    // number we never captured is still visible somewhere.
    console.warn("quo-inbound: no lead matches", last10);
    return NextResponse.json({ ok: true, matched: false });
  }

  // Idempotency: Quo retries webhooks, and a duplicate would show the same
  // reply twice in the thread.
  if (providerId) {
    const { data: existing } = await supabase
      .from("lead_messages")
      .select("id")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabase.from("lead_messages").insert({
    lead_id: lead.id,
    direction: "in",
    channel: "sms",
    body: text.slice(0, 3000),
    author: lead.full_name,
    delivered: true,
    provider_id: providerId,
  });

  await supabase.from("lead_activity").insert({
    lead_id: lead.id,
    kind: "message",
    detail: "They replied by text",
  });

  return NextResponse.json({ ok: true, matched: true });
}

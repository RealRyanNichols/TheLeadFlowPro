import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// A token identifies one registration. Paid access always comes from the
// server's seat record, never the redirect's session_id or a browser flag.
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers });
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!/^[a-f0-9]{48}$/.test(token)) return reply({ error: "Missing or invalid registration token" }, 400);

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("event_confirmed_details", { p_token: token });
  if (error) return reply({ error: "Registration lookup failed. Please try again." }, 503);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.registration_id) return reply({ error: "Registration not found" }, 404);

  let amountPaidCents: number | null = null;
  let confirmationSent = false;
  let paymentState = ["paid", "attended", "no_show"].includes(row.seat_status) ? "paid" : "unpaid";
  if (row.seat_status === "overbooked") paymentState = "review";
  if (["cancelled", "transferred", "refunded"].includes(row.seat_status)) paymentState = row.seat_status;

  // Optional enrichment does not change the seat's access state. If Stripe is
  // still processing, tell the buyer to wait instead of inviting a second pay.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createSupabaseClient(SUPABASE_URL, serviceKey);
    const saved = await admin.from("event_registrations")
      .select("amount_paid_cents,confirmation_sent_at,stripe_session_id")
      .eq("id", row.registration_id).eq("access_token", token).maybeSingle();
    if (!saved.error && saved.data) {
      amountPaidCents = typeof saved.data.amount_paid_cents === "number" ? saved.data.amount_paid_cents : null;
      confirmationSent = Boolean(saved.data.confirmation_sent_at);
      if (row.seat_status === "pending" && saved.data.stripe_session_id && process.env.STRIPE_SECRET_KEY) {
        try {
          const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(saved.data.stripe_session_id)}?expand%5B%5D=payment_intent`, {
            headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }, cache: "no-store",
          });
          const session = response.ok ? await response.json() : null;
          if (session?.metadata?.registration_id === row.registration_id && session?.metadata?.kind === "event") {
            const intentStatus = typeof session.payment_intent === "object" ? session.payment_intent?.status : null;
            if (session.payment_status === "paid") paymentState = "confirming";
            else if (session.status === "complete" && ["requires_payment_method", "canceled"].includes(intentStatus)) paymentState = "failed";
            else if (session.status === "complete") paymentState = "processing";
          }
        } catch {
          // The DB is authoritative. The same checkout endpoint also prevents
          // duplicate payments if payment-provider status is unavailable.
        }
      }
    }
  }

  return reply({
    price_usd: amountPaidCents === null ? null : amountPaidCents / 100,
    amount_paid_cents: amountPaidCents,
    confirmation_sent: confirmationSent,
    payment_state: paymentState,
    can_retry_payment: row.seat_status === "pending" && ["unpaid", "failed"].includes(paymentState),
    first_name: row.first_name,
    event_slug: row.event_slug,
    event_title: row.event_title,
    seat_status: row.seat_status,
    seat_number: row.seat_number,
    has_bottleneck: row.has_bottleneck,
    exact_address: row.exact_address ?? null,
    arrival_notes: row.arrival_notes ?? null,
  });
}

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Stripe Checkout: Learn It ($497) + paid event seats. Activates when
// STRIPE_SECRET_KEY is set in Vercel env vars (same pattern as RESEND_API_KEY).
// Without it, the UI falls back gracefully. No Stripe SDK — plain REST.

const PRODUCTS: Record<string, { name: string; amount: number }> = {
  learn_it: { name: "Learn It — The LeadFlow Pro (lifetime access)", amount: 49700 },
};

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
    const site = "https://www.theleadflowpro.com";

    let kind: string;
    let name: string;
    let amount: number;
    let cancelUrl = `${site}/pricing/learn-it?cancelled=1`;
    const metadata: Record<string, string> = {};

    if (body.kind === "event") {
      // Paid event seat — price comes from the database, never the client.
      const eventId = String(body.event_id ?? "");
      const registrationId = String(body.registration_id ?? "");
      if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });
      const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: ev } = await supabase
        .from("events")
        .select("id, title, price_usd, is_published")
        .eq("id", eventId)
        .eq("is_published", true)
        .single();
      if (!ev || Number(ev.price_usd) <= 0) {
        return NextResponse.json({ error: "Event not available for online payment" }, { status: 400 });
      }
      kind = "event";
      name = `Seat: ${ev.title}`;
      amount = Math.round(Number(ev.price_usd) * 100);
      cancelUrl = `${site}/events?cancelled=1`;
      metadata.kind = "event";
      metadata.event_id = ev.id;
      if (registrationId) metadata.registration_id = registrationId;
    } else {
      kind = PRODUCTS[body.kind] ? body.kind : "learn_it";
      const product = PRODUCTS[kind];
      name = product.name;
      amount = product.amount;
      metadata.kind = kind;
    }

    const params = new URLSearchParams({
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][product_data][name]": name,
      success_url: `${site}/thank-you?purchase=${kind}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: "true",
    });
    for (const [k, v] of Object.entries(metadata)) params.set(`metadata[${k}]`, v);
    if (email) params.set("customer_email", email);

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const j = await r.json();
    if (!r.ok || !j.url) {
      console.error("Stripe session failed:", j?.error?.message);
      return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
    }
    return NextResponse.json({ url: j.url });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

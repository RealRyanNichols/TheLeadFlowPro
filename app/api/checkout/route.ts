import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Stripe Checkout: Learn It ($497) + paid event seats. Activates when
// STRIPE_SECRET_KEY is set in Vercel env vars (same pattern as RESEND_API_KEY).
// Without it, the UI falls back gracefully. No Stripe SDK — plain REST.

const PRODUCTS: Record<string, { name: string; amount: number }> = {
  learn_it: { name: "Learn It — The LeadFlow Pro (lifetime access)", amount: 49700 },
  system_map: {
    name: "System Map — The LeadFlow Pro (credited toward your build)",
    amount: 49700,
  },
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
    } else if (body.kind === "build_deposit") {
      // Down payment on a custom scope or anything Ryan quoted outside the
      // package ladder. Amount is customer-chosen and clamped server-side.
      const requested = Math.round(Number(body.amount_usd));
      if (!Number.isFinite(requested)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      const dollars = Math.max(250, Math.min(25000, requested));
      kind = "build_deposit";
      name = "Build down payment (credited in full toward your build)";
      amount = dollars * 100;
      cancelUrl = `${site}/deposit?cancelled=1`;
      metadata.kind = kind;
      metadata.deposit_usd = String(dollars);
      if (typeof body.reference === "string" && body.reference.trim()) {
        metadata.reference = body.reference.trim().slice(0, 120);
      }
    } else if (body.kind === "package_deposit" || body.kind === "package_full") {
      // Build payments straight from the package sales pages. Deposit amount is
      // chosen by the customer but validated server-side; full payment charges
      // the base scope price. Everything is credited toward the final build.
      const PACKAGES: Record<string, { label: string; base: number }> = {
        "system-map": { label: "System Map", base: 49700 },
        launch: { label: "Website Launch", base: 100000 },
        "industry-os": { label: "Industry OS", base: 1500000 },
      };
      const pkg = PACKAGES[String(body.package ?? "")];
      if (!pkg) return NextResponse.json({ error: "Unknown package" }, { status: 400 });
      kind = body.kind;
      metadata.kind = kind;
      metadata.package = String(body.package);
      cancelUrl = `${site}/packages/${body.package}?cancelled=1`;
      if (body.kind === "package_full") {
        name = `${pkg.label} — pay in full (base scope)`;
        amount = pkg.base;
      } else {
        // Whole dollars, validated server-side and never above the base price.
        const requested = Math.round(Number(body.amount_usd));
        if (!Number.isFinite(requested)) {
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        if (String(body.package) === "launch" && requested !== 500) {
          return NextResponse.json(
            { error: "Website Launch deposit must be $500" },
            { status: 400 },
          );
        }
        const min = 250;
        const max = Math.min(25000, pkg.base / 100);
        const dollars = Math.max(min, Math.min(max, requested));
        name = `${pkg.label} — build down payment (credited in full)`;
        amount = dollars * 100;
        metadata.deposit_usd = String(dollars);
      }
    } else {
      kind = PRODUCTS[body.kind] ? body.kind : "learn_it";
      const product = PRODUCTS[kind];
      name = product.name;
      amount = product.amount;
      metadata.kind = kind;
      if (kind === "system_map") cancelUrl = `${site}/packages/system-map?cancelled=1`;
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

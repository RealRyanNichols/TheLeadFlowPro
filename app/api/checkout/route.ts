import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { priceOrder } from "@/lib/timeback";

// Stripe Checkout for fixed products, approved package payments, and paid event seats. Activates when
// STRIPE_SECRET_KEY is set in Vercel env vars (same pattern as RESEND_API_KEY).
// Without it, the UI falls back gracefully. No Stripe SDK, just plain REST.

const PRODUCTS: Record<string, { name: string; amount: number }> = {
  system_map: {
    name: "System Map | The LeadFlow Pro (credited toward your build)",
    amount: 49700,
  },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const requestedPackage = String(body.package ?? "");
  if (
    (body.kind === "package_deposit" || body.kind === "package_full") &&
    (requestedPackage === "industry-os" || requestedPackage === "company_os")
  ) {
    return NextResponse.json(
      { error: "Company OS requires a System Map before checkout" },
      { status: 400 },
    );
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  try {
    const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
    const site = "https://www.theleadflowpro.com";

    let kind: string;
    let name: string;
    let amount: number;
    let cancelUrl = `${site}/training?cancelled=1`;
    const metadata: Record<string, string> = {};

    if (body.kind === "event") {
      // Paid event seat. Price comes from the database, never the client.
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
      cancelUrl = `${site}/deposit/custom?cancelled=1`;
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
      };
      const packageId = requestedPackage;
      const pkg = PACKAGES[packageId];
      if (!pkg) return NextResponse.json({ error: "Unknown package" }, { status: 400 });
      kind = body.kind;
      metadata.kind = kind;
      metadata.package = packageId;
      cancelUrl = `${site}/packages/${packageId}?cancelled=1`;
      if (body.kind === "package_full") {
        name = `${pkg.label} | pay in full (base scope)`;
        amount = pkg.base;
      } else {
        // Whole dollars, validated server-side and never above the base price.
        const requested = Math.round(Number(body.amount_usd));
        if (!Number.isFinite(requested)) {
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        if (packageId === "launch" && requested !== 500) {
          return NextResponse.json(
            { error: "Website Launch deposit must be $500" },
            { status: 400 },
          );
        }
        const min = 250;
        const max = Math.min(25000, pkg.base / 100);
        const dollars = Math.max(min, Math.min(max, requested));
        name = `${pkg.label} | build down payment (credited in full)`;
        amount = dollars * 100;
        metadata.deposit_usd = String(dollars);
      }
    } else if (body.kind === "timeback_order") {
      // Time Back funnel (/go/time-back). The client sends selections, never
      // prices. The total comes from lib/timeback.ts so nobody can edit a
      // number in the browser and pay it.
      const priced = priceOrder({
        downsell: body.downsell === true,
        days: Number(body.days) || undefined,
        perDay: Number(body.per_day) || undefined,
        emailSeries:
          typeof body.email_series === "string" && body.email_series ? body.email_series : null,
        extras: Array.isArray(body.extras) ? body.extras.map(String).slice(0, 10) : [],
      });
      if (!priced) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
      kind = "timeback_order";
      name = priced.lines.map((l) => l.label).join(" + ").slice(0, 250) || "Time Back order";
      amount = priced.total * 100;
      cancelUrl = `${site}/go/time-back?cancelled=1`;
      metadata.kind = kind;
      metadata.order = priced.lines
        .map((l) => `${l.label} $${l.amount}`)
        .join(" | ")
        .slice(0, 480);
      metadata.total_usd = String(priced.total);
      if (Array.isArray(body.platforms)) {
        metadata.platforms = body.platforms.map(String).join(",").slice(0, 100);
      }
    } else {
      if (!PRODUCTS[body.kind]) {
        return NextResponse.json({ error: "Unknown product" }, { status: 400 });
      }
      kind = body.kind;
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

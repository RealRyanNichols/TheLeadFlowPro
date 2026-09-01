import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { priceOrder } from "@/lib/timeback";
import { LEAD_FOLLOW_UP } from "@/lib/leadFollowUp";
import { FREE_BUILD } from "@/lib/freeBuild";
import { priceToolStudio } from "@/lib/toolStudio";

// Stripe Checkout for fixed products, approved package payments, and paid event seats. Activates when
// STRIPE_SECRET_KEY is set in Vercel env vars (same pattern as RESEND_API_KEY).
// Without it, the UI falls back gracefully. No Stripe SDK, just plain REST.

const PRODUCTS: Record<string, { name: string; amount: number }> = {
  system_map: {
    name: "System Map | The LeadFlow Pro (credited toward your build)",
    amount: 49700,
  },
  // Amount comes from lib/leadFollowUp.ts so the page and the charge can
  // never drift apart. The funnel posts no price field at all.
  [LEAD_FOLLOW_UP.id]: {
    name: `${LEAD_FOLLOW_UP.name} | The LeadFlow Pro`,
    amount: LEAD_FOLLOW_UP.priceCents,
  },
  // The Free Build (/free-build). Three tiers, one price each, all read from
  // lib/freeBuild.ts. The site itself is $0 at every tier: what is charged
  // here is the engine that runs behind it.
  ...Object.fromEntries(
    FREE_BUILD.tiers.map((tier) => [
      tier.id,
      { name: `${tier.name} | The LeadFlow Pro`, amount: tier.priceCents },
    ]),
  ),
};

const FREE_BUILD_IDS = new Set<string>(FREE_BUILD.tiers.map((tier) => tier.id));

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
    let successUrl: string | null = null;
    let checkoutMode: "payment" | "subscription" = "payment";
    let checkoutLines: Array<{
      name: string;
      amount: number;
      recurring: boolean;
    }> | null = null;
    const metadata: Record<string, string> = {};

    if (body.kind === "event") {
      // Paid event seat. Price, publish state, and remaining capacity all come
      // from the database. The browser only proves which registration it holds
      // by sending back the token that registration handed it.
      const token = typeof body.registration_token === "string" ? body.registration_token : "";
      if (token.length < 24) {
        return NextResponse.json({ error: "Register before checkout." }, { status: 400 });
      }
      const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data: lookup } = await supabase.rpc("event_registration_by_token", {
        p_token: token,
      });
      const registration = Array.isArray(lookup) ? lookup[0] : lookup;
      if (!registration?.registration_id) {
        return NextResponse.json({ error: "Register before checkout." }, { status: 400 });
      }
      if (["paid", "attended", "no_show"].includes(registration.seat_status)) {
        return NextResponse.json({ error: "This seat is already paid for." }, { status: 409 });
      }
      if (["cancelled", "refunded"].includes(registration.seat_status)) {
        return NextResponse.json({ error: "This registration was cancelled." }, { status: 409 });
      }

      const { data: ev } = await supabase
        .from("events")
        .select("id, slug, title, price_usd, is_published")
        .eq("slug", registration.event_slug)
        .eq("is_published", true)
        .single();
      if (!ev || Number(ev.price_usd) <= 0) {
        return NextResponse.json(
          { error: "Event not available for online payment" },
          { status: 400 },
        );
      }

      // Capacity is checked again here, after registration, because the room
      // can fill between the two steps.
      const { data: seats } = await supabase.rpc("event_availability", { p_slug: ev.slug });
      const availability = Array.isArray(seats) ? seats[0] : seats;
      if (!availability?.registration_open) {
        return NextResponse.json(
          { error: "This workshop is sold out. Nothing was charged." },
          { status: 409 },
        );
      }

      kind = "event";
      name = `Seat: ${ev.title}`;
      amount = Math.round(Number(ev.price_usd) * 100);
      cancelUrl = `${site}/events/${ev.slug}?cancelled=1`;
      successUrl = `${site}/events/${ev.slug}/confirmed?t=${encodeURIComponent(
        token,
      )}&session_id={CHECKOUT_SESSION_ID}`;
      metadata.kind = "event";
      metadata.event_id = ev.id;
      metadata.event_slug = ev.slug;
      metadata.registration_id = registration.registration_id;
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
    } else if (body.kind === "tool_studio") {
      // Tool Studio prices are rebuilt here from IDs. The browser never sends
      // a dollar amount. When monthly menu items are selected, Stripe Checkout
      // creates a subscription; a one-time build can share the first invoice.
      const priced = priceToolStudio({
        buildId: typeof body.build_id === "string" ? body.build_id : null,
        monthlyIds: Array.isArray(body.monthly_ids)
          ? body.monthly_ids.map(String).slice(0, 10)
          : [],
      });
      if (!priced) {
        return NextResponse.json({ error: "Invalid Tool Studio selection" }, { status: 400 });
      }
      kind = priced.monthly.length ? "tool_monthly_menu" : "tool_studio_order";
      name = priced.build?.name ?? priced.monthly.map((item) => item.name).join(" + ");
      amount = priced.dueTodayUsd * 100;
      checkoutMode = priced.monthly.length ? "subscription" : "payment";
      checkoutLines = [
        ...(priced.build
          ? [{
              name: `${priced.build.name} | The LeadFlow Pro`,
              amount: priced.build.priceUsd * 100,
              recurring: false,
            }]
          : []),
        ...priced.monthly.map((item) => ({
          name: `${item.name} | The LeadFlow Pro`,
          amount: item.priceUsd * 100,
          recurring: true,
        })),
      ];
      cancelUrl = `${site}/go/tools?cancelled=1`;
      successUrl = `${site}/go/tools/welcome?session_id={CHECKOUT_SESSION_ID}`;
      metadata.kind = kind;
      metadata.build_id = priced.build?.id ?? "none";
      metadata.monthly_ids = priced.monthly.map((item) => item.id).join(",").slice(0, 400);
      metadata.due_today_usd = String(priced.dueTodayUsd);
      metadata.renews_monthly_usd = String(priced.renewsMonthlyUsd);
      metadata.order = [
        priced.build ? `${priced.build.name} $${priced.build.priceUsd}` : "",
        ...priced.monthly.map((item) => `${item.name} $${item.priceUsd}/mo`),
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 480);
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
      // Buyers land on the welcome flow, not the generic thank-you: it
      // collects the business, the access grants, and the voice samples.
      successUrl = `${site}/go/time-back/welcome?session_id={CHECKOUT_SESSION_ID}`;
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
      if (kind === LEAD_FOLLOW_UP.id) {
        // Buyers land on the writing intake, not the generic thank-you.
        // Nothing gets written until that form comes back.
        cancelUrl = `${site}/go/lead-follow-up?cancelled=1`;
        successUrl = `${site}/go/lead-follow-up/intake?session_id={CHECKOUT_SESSION_ID}`;
      }
      if (FREE_BUILD_IDS.has(kind)) {
        // Free Build buyers land on a page that books the twenty minute call
        // and lists what to send. The build clock starts at that call, so the
        // next action has to be on screen the second the card clears.
        cancelUrl = `${site}/free-build?cancelled=1`;
        successUrl = `${site}/free-build/welcome?tier=${encodeURIComponent(kind)}&session_id={CHECKOUT_SESSION_ID}`;
        metadata.offer = "free_build";
      }
    }

    const params = new URLSearchParams({
      mode: checkoutMode,
      success_url:
        successUrl ?? `${site}/thank-you?purchase=${kind}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: "true",
    });
    const lines = checkoutLines ?? [{ name, amount, recurring: false }];
    lines.forEach((line, index) => {
      params.set(`line_items[${index}][quantity]`, "1");
      params.set(`line_items[${index}][price_data][currency]`, "usd");
      params.set(`line_items[${index}][price_data][unit_amount]`, String(line.amount));
      params.set(`line_items[${index}][price_data][product_data][name]`, line.name);
      if (line.recurring) {
        params.set(`line_items[${index}][price_data][recurring][interval]`, "month");
      }
    });
    for (const [k, v] of Object.entries(metadata)) params.set(`metadata[${k}]`, v);
    if (checkoutMode === "subscription") {
      for (const [k, v] of Object.entries(metadata)) {
        params.set(`subscription_data[metadata][${k}]`, v);
      }
      params.set(
        "custom_text[submit][message]",
        "Your selected monthly services renew on the same calendar date until canceled or changed. Submit menu changes at least three business days before renewal.",
      );
    }
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

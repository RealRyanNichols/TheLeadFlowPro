import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Confirmation lookup for /events/[slug]/confirmed. The token IS the
// credential: it was generated server-side at registration and only ever
// handed to the registrant (in the checkout redirect and the confirmation
// email). event_confirmed_details() releases the street address only for a
// paid seat.

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (token.length < 24) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("event_confirmed_details", { p_token: token });
  if (error) {
    console.error("event_confirmed_details failed:", error.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.registration_id) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  // The seat price rides along so the confirmation page can report the real
  // purchase value instead of a constant. Public field, anon-readable.
  let priceUsd: number | null = null;
  if (row.event_slug) {
    const { data: event } = await supabase
      .from("events")
      .select("price_usd")
      .eq("slug", row.event_slug)
      .maybeSingle();
    const parsed = Number(event?.price_usd);
    if (Number.isFinite(parsed) && parsed > 0) priceUsd = parsed;
  }

  return NextResponse.json({
    price_usd: priceUsd,
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

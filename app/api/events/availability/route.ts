import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { missingEventPaymentConfig } from "@/lib/eventPayments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug =
    new URL(request.url).searchParams.get("slug") ||
    "chatgpt-for-business-owners-longview";
  const headers = {
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "https://workshop.theleadflowpro.com",
  };
  if (!/^[a-z0-9-]{1,100}$/.test(slug))
    return NextResponse.json(
      { registration_open: false },
      { status: 400, headers },
    );
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const [eventResult, seatResult] = await Promise.all([
    db
      .from("events")
      .select(
        "title,slug,starts_at,price_usd,capacity,clinic_enabled,date_confirmed,registration_closed",
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle(),
    db.rpc("event_availability", { p_slug: slug }),
  ]);
  const event = eventResult.data;
  const seats = Array.isArray(seatResult.data)
    ? seatResult.data[0]
    : seatResult.data;
  if (eventResult.error || seatResult.error || !event || !seats)
    return NextResponse.json(
      { registration_open: false },
      { status: 503, headers },
    );
  const paymentReady = missingEventPaymentConfig(process.env).length === 0;
  const remaining = Number(seats.seats_remaining);
  return NextResponse.json(
    {
      title: event.title,
      slug: event.slug,
      starts_at: event.starts_at,
      price_usd: event.price_usd,
      capacity: event.capacity,
      clinic_enabled: event.clinic_enabled,
      seats_remaining:
        Number.isSafeInteger(remaining) && remaining >= 0 ? remaining : null,
      payment_ready: paymentReady,
      registration_open:
        paymentReady &&
        event.date_confirmed &&
        !event.registration_closed &&
        Date.parse(event.starts_at) > Date.now() &&
        Number.isSafeInteger(remaining) &&
        remaining > 0,
      registration_url: `https://www.theleadflowpro.com/events/${event.slug}`,
    },
    { headers },
  );
}

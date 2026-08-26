import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { sendInternalAlert } from "@/lib/leadNotify";

// Event registration. Everything that decides whether this person may register
// — published state, closed registration, remaining capacity — is decided
// inside register_for_event() in the database, not here and never in the
// browser. The route only shapes the request and translates the failure.
//
// A registration is a lead, not a seat. The seat is claimed by the Stripe
// webhook after payment clears.
//
// WHICH IS EXACTLY WHY THE ALERT BELOW MATTERS. Because the seat is what the
// webhook announces, somebody who registered and then abandoned checkout used
// to produce nothing at all: a row with status 'pending' that nobody was told
// about and no screen surfaced. That person raised their hand for a paid
// workshop and got no follow-up, which is the single most recoverable lead
// this site produces. The alert is what makes them visible.

const ERRORS: Record<string, { status: number; message: string }> = {
  event_not_available: { status: 404, message: "This event is not open for registration." },
  registration_closed: { status: 409, message: "Registration for this workshop is closed." },
  sold_out: { status: 409, message: "This workshop is sold out." },
  missing_contact: { status: 400, message: "Name and email are both required." },
  invalid_email: { status: 400, message: "That email address does not look right." },
};

function pickError(message: string) {
  for (const [key, value] of Object.entries(ERRORS)) {
    if (message.includes(key)) return value;
  }
  return { status: 500, message: "Could not register. Try again." };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

  const eventId = text(body.event_id, 60);
  const fullName = text(body.full_name, 200);
  const email = text(body.email, 200);
  if (!eventId || !fullName || !email) {
    return NextResponse.json({ error: "Name and email are both required." }, { status: 400 });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_full_name: fullName,
    p_email: email,
    p_phone: text(body.phone, 50),
    p_business_name: text(body.business_name, 200),
    p_notes: text(body.notes, 1000),
    p_bottleneck: text(body.bottleneck, 1000),
    p_recording_consent: body.recording_consent === true,
    p_marketing_consent: body.marketing_consent === true,
    p_utm: {
      source: text(body.utm_source, 120),
      medium: text(body.utm_medium, 120),
      campaign: text(body.utm_campaign, 120),
      content: text(body.utm_content, 120),
    },
  });

  if (error) {
    const mapped = pickError(error.message ?? "");
    if (mapped.status === 500) console.error("register_for_event failed:", error.message);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.registration_id) {
    return NextResponse.json({ error: "Could not register. Try again." }, { status: 500 });
  }

  const priceUsd = Number(row.price_usd ?? 0);
  const paidSeat = priceUsd > 0;
  try {
    await sendInternalAlert(
      `WORKSHOP REGISTRATION: ${fullName}${paidSeat ? " (checkout pending)" : ""}`,
      [
        paidSeat
          ? `Registered for a $${priceUsd} seat. Nothing is paid yet. The seat is claimed only when Stripe clears, so if no payment alert follows this one, they dropped at checkout and are worth a message.`
          : "Registered for a free seat.",
        "",
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Phone: ${text(body.phone, 50) || "-"}`,
        `Business: ${text(body.business_name, 200) || "-"}`,
        `Bottleneck: ${text(body.bottleneck, 1000) || "not submitted yet"}`,
        `Notes: ${text(body.notes, 1000) || "-"}`,
        `Source: ${text(body.utm_source, 120) || "website"}`,
        `Seats remaining: ${row.seats_remaining ?? "-"}`,
        "",
        "Admin: https://www.theleadflowpro.com/admin/events",
      ],
    );
  } catch (e) {
    // The registration is saved. Never fail it over the alert.
    console.error("registration alert failed:", e);
  }

  return NextResponse.json({
    ok: true,
    registration_id: row.registration_id,
    registration_token: row.access_token,
    price_usd: priceUsd,
    seats_remaining: row.seats_remaining,
  });
}

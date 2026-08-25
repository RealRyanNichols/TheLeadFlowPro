import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import {
  EVENT_PUBLIC_FIELDS,
  buildEventIcs,
  type EventRow,
} from "@/lib/events";

// Add-to-calendar download. Token-gated the same way as the confirmation
// page: a paid seat gets the exact address in the LOCATION line; anyone else
// gets nothing, because the token is the only way in.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  if (token.length < 24) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await supabase.rpc("event_confirmed_details", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.registration_id) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const { data: eventData } = await supabase
    .from("events")
    .select(EVENT_PUBLIC_FIELDS)
    .eq("slug", row.event_slug)
    .maybeSingle();
  const event = eventData as EventRow | null;
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // The paid attendee's calendar entry carries the exact address from the
  // private details, without ever writing it into the public events row.
  const eventForIcs: EventRow = {
    ...event,
    address_line: row.exact_address ?? event.address_line,
  };
  const ics = buildEventIcs(eventForIcs, {
    includeAddress: Boolean(row.exact_address),
    url: `https://www.theleadflowpro.com/events/${event.slug}`,
  });
  if (!ics) {
    return NextResponse.json({ error: "Event has no date yet" }, { status: 409 });
  }

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

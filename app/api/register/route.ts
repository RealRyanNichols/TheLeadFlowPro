import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    for (const f of ["event_id", "full_name", "email"]) {
      if (!body[f] || typeof body[f] !== "string") {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
      }
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);
    const { data: event } = await supabase
      .from("events")
      .select("id, capacity, is_published")
      .eq("id", body.event_id)
      .eq("is_published", true)
      .maybeSingle();
    if (!event) {
      return NextResponse.json({ error: "This workshop is not open for registration." }, { status: 404 });
    }

    if (serviceKey && event.capacity) {
      const { count } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "confirmed");
      if ((count ?? 0) >= Number(event.capacity)) {
        return NextResponse.json({ error: "This workshop is sold out." }, { status: 409 });
      }
    }
    // Generate the id here so we can hand it back without needing read access
    // (RLS keeps registrations admin-read-only).
    const regId = crypto.randomUUID();
    const { error } = await supabase.from("event_registrations").insert({
      id: regId,
      event_id: body.event_id,
      full_name: String(body.full_name).slice(0, 200),
      email: String(body.email).trim().toLowerCase().slice(0, 200),
      phone: body.phone ? String(body.phone).slice(0, 50) : null,
      business_name: body.business_name ? String(body.business_name).slice(0, 200) : null,
      notes: body.notes ? String(body.notes).slice(0, 1000) : null,
    });
    if (error) {
      return NextResponse.json({ error: "Could not register. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, registration_id: regId });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

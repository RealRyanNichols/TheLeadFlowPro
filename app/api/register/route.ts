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
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Generate the id here so we can hand it back without needing read access
    // (RLS keeps registrations admin-read-only).
    const regId = crypto.randomUUID();
    const { error } = await supabase.from("event_registrations").insert({
      id: regId,
      event_id: body.event_id,
      full_name: String(body.full_name).slice(0, 200),
      email: String(body.email).slice(0, 200),
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

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Bottleneck intake from the confirmation page. Token-gated in the database;
// one bottleneck per attendee, editable until the workshop starts.

export async function POST(request: Request) {
  let body: { token?: unknown; bottleneck?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const bottleneck =
    typeof body.bottleneck === "string" ? body.bottleneck.trim().slice(0, 1000) : "";
  if (token.length < 24 || !bottleneck) {
    return NextResponse.json({ error: "Missing bottleneck" }, { status: 400 });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.rpc("submit_event_bottleneck", {
    p_token: token,
    p_bottleneck: bottleneck,
  });
  if (error || data !== true) {
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

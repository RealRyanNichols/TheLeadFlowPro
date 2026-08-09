import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    for (const f of ["visitor_name", "visitor_email", "body"]) {
      if (!body[f] || typeof body[f] !== "string") {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
      }
    }
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from("messages").insert({
      visitor_name: String(body.visitor_name).slice(0, 200),
      visitor_email: String(body.visitor_email).slice(0, 200),
      body: String(body.body).slice(0, 3000),
      sender: "visitor",
    });
    if (error) {
      return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

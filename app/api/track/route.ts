import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.path || typeof body.path !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.from("page_views").insert({
      path: String(body.path).slice(0, 300),
      referrer: body.referrer ? String(body.referrer).slice(0, 500) : null,
      visitor_id: body.visitor_id ? String(body.visitor_id).slice(0, 100) : null,
      utm_source: body.utm_source ? String(body.utm_source).slice(0, 100) : null,
      utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 100) : null,
      utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 100) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

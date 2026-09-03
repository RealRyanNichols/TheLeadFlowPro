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

    // The page says "Ryan reads every message himself." Until now that only
    // happened if he opened /admin/messages. Fail soft: the message is saved
    // either way, and a Resend hiccup must not turn into a visitor error.
    const key = process.env.RESEND_API_KEY?.trim();
    if (key) {
      const visitorName = String(body.visitor_name).slice(0, 200);
      const visitorEmail = String(body.visitor_email).slice(0, 200);
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
            to: [process.env.LEADFLOW_NOTIFY_EMAIL?.trim() || "hello@theleadflowpro.com"],
            reply_to: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail) ? visitorEmail : undefined,
            subject: `CONTACT: ${visitorName}`,
            text: [
              `From: ${visitorName} <${visitorEmail}>`,
              ``,
              String(body.body).slice(0, 3000),
              ``,
              `Reply to this email to answer them directly.`,
              `Thread: https://www.theleadflowpro.com/admin/messages`,
            ].join("\n"),
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (e) {
        console.error("contact alert failed:", e instanceof Error ? e.message : e);
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

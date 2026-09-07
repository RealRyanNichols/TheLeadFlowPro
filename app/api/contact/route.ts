import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { SUPABASE_URL } from "@/lib/config";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import {
  contactNotificationStore,
  deliverContactNotification,
} from "@/lib/contactNotifications";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    for (const f of ["visitor_name", "visitor_email", "body"]) {
      if (!body?.[f] || typeof body[f] !== "string" || !body[f].trim()) {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
      }
    }
    const name = body.visitor_name.trim();
    const email = body.visitor_email.trim();
    const message = body.body.trim();
    if (
      name.length > 200 ||
      email.length > 200 ||
      message.length > 3000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Check your name, email address and message length." },
        { status: 400 },
      );
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey || leadFlowSupabaseRuntimeIssues(SUPABASE_URL).length) {
      return NextResponse.json(
        {
          error:
            "The contact form is temporarily unavailable. Please call or text us.",
        },
        { status: 503 },
      );
    }
    const id = randomUUID();
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("messages").insert({
      id,
      visitor_name: name,
      visitor_email: email,
      body: message,
      sender: "visitor",
    });
    if (error) {
      return NextResponse.json(
        { error: "Could not send. Try again." },
        { status: 500 },
      );
    }

    // The database transaction also saved the alert job. Failed delivery stays
    // in the private inbox and the protected cron retries automatically.
    try {
      await deliverContactNotification(contactNotificationStore(supabase), id);
    } catch {
      console.error("Contact alert is saved for retry", { messageId: id });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

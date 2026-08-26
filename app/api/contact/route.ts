import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { sendInternalAlert } from "@/lib/leadNotify";

// The /contact form.
//
// It writes to `messages`, which is a different table from `leads`, so none of
// the lead notification path runs for it. Until the alert below existed that
// meant a contact submission produced no email, no text, and no activity row:
// it was visible only to somebody who happened to open /admin/messages. A
// stranger writing in through the contact page got silence for as long as
// nobody thought to check that screen.
//
// The alert is sent after the row is saved and never blocks the response. A
// message we have but did not get told about is recoverable. A message we
// refused because Resend was down is gone.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    for (const f of ["visitor_name", "visitor_email", "body"]) {
      if (!body[f] || typeof body[f] !== "string") {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
      }
    }
    const message = {
      visitor_name: String(body.visitor_name).slice(0, 200),
      visitor_email: String(body.visitor_email).slice(0, 200),
      body: String(body.body).slice(0, 3000),
      sender: "visitor" as const,
    };

    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from("messages").insert(message);
    if (error) {
      return NextResponse.json({ error: "Could not send. Try again." }, { status: 500 });
    }

    try {
      await sendInternalAlert(
        `NEW MESSAGE: ${message.visitor_name} | /contact`,
        [
          `Name: ${message.visitor_name}`,
          `Email: ${message.visitor_email}`,
          ``,
          `What they wrote:`,
          message.body,
          ``,
          `Reply to them directly, or read it here:`,
          `https://www.theleadflowpro.com/admin/messages`,
        ],
      );
    } catch (e) {
      // Saved either way. Never fail the submission over the alert.
      console.error("contact alert failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

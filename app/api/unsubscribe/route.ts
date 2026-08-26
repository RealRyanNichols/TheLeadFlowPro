import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { unsubscribeSecret, verifyUnsubscribe } from "@/lib/unsubscribe";

// One click unsubscribe. Reached two ways:
//   GET  - the link at the bottom of every nurture email
//   POST - Gmail and Apple Mail's own unsubscribe button, via the
//          List-Unsubscribe-Post header the cron sets
//
// Both stamp leads.email_unsubscribed_at, which every sending path already
// checks before it sends anything. No login, no confirmation step, no dark
// pattern: the click is the unsubscribe.

async function unsubscribe(request: Request): Promise<{ ok: boolean; status: number }> {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "");
  const token = String(url.searchParams.get("t") ?? "");
  const secret = unsubscribeSecret();

  if (!id || !token || !secret) return { ok: false, status: 400 };
  if (!verifyUnsubscribe(id, token, secret)) return { ok: false, status: 403 };

  const supabase = createSupabaseClient(SUPABASE_URL, secret);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("leads")
    .update({ email_unsubscribed_at: now, marketing_email_consent: false })
    .eq("id", id)
    .is("email_unsubscribed_at", null);

  // A second click on the same link is not an error. The person is already
  // unsubscribed, which is exactly what they asked for.
  if (error) {
    console.error("Unsubscribe update failed:", error.message);
    return { ok: false, status: 500 };
  }

  await supabase
    .from("lead_activity")
    .insert({ lead_id: id, kind: "system", detail: "Unsubscribed from email" })
    .then(
      () => undefined,
      () => undefined,
    );

  return { ok: true, status: 200 };
}

export async function GET(request: Request) {
  const result = await unsubscribe(request);
  const site = "https://www.theleadflowpro.com";
  return NextResponse.redirect(result.ok ? `${site}/unsubscribed` : `${site}/unsubscribed?e=1`, {
    status: 302,
  });
}

export async function POST(request: Request) {
  const result = await unsubscribe(request);
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : result.status });
}

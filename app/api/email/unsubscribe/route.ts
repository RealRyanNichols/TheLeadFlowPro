import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { verifyUnsubscribe } from "@/lib/nurture/sequence";

// Signed one-click unsubscribe for the nurture sequence.
//
//   GET  — the human path: link in the email footer, shows a plain
//          confirmation page after flipping the flag.
//   POST — RFC 8058 List-Unsubscribe=One-Click, called by mail clients.
//
// The link carries lead_id + an HMAC over it (lib/nurture/sequence.ts), so
// only someone holding an email we sent can unsubscribe that lead, and no
// token column or schema change is needed. Unsubscribing sets
// leads.email_unsubscribed_at, which every sender in the codebase already
// honors. It never deletes data and cannot be reversed from this route; an
// admin re-consents from the lead workspace if someone asks to come back.

async function unsubscribe(leadId: string, signature: string): Promise<boolean> {
  const secret = process.env.NURTURE_LINK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey) return false;
  if (!leadId || !verifyUnsubscribe(leadId, signature, secret)) return false;

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const { error } = await supabase
    .from("leads")
    .update({ email_unsubscribed_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("email_unsubscribed_at", null);
  // Already-unsubscribed is success, not failure; only a real error fails.
  return !error;
}

function page(title: string, message: string) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${title}</title>` +
      `<body style="font-family:system-ui,sans-serif;background:#f7f5f2;color:#0a1220;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px">` +
      `<div style="max-width:420px;background:#fff;border:1px solid #0a12201f;border-radius:16px;padding:32px;text-align:center">` +
      `<h1 style="font-size:22px;margin:0 0 10px">${title}</h1>` +
      `<p style="margin:0;line-height:1.6;color:#4e5866">${message}</p>` +
      `</div></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribe(url.searchParams.get("l") ?? "", url.searchParams.get("s") ?? "");
  if (!ok) {
    return page(
      "That link did not work",
      "The unsubscribe link looks incomplete. Reply to any email from Ryan and a human will take you off the list.",
    );
  }
  return page(
    "You are unsubscribed",
    "No more emails from this series. The free tools at TheLeadFlowPro.com/tools stay free either way.",
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribe(url.searchParams.get("l") ?? "", url.searchParams.get("s") ?? "");
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCallSheet } from "@/lib/callSheetServer";
import { callSheetEmail, callSheetEmailEnabled, callSheetRecipients } from "@/lib/callSheet";
import { BUSINESS } from "@/lib/site/business";

// The morning call sheet, by email, to the owner inbox only.
//
// Off by default. It sends nothing until CALL_SHEET_EMAIL_ENABLED is exactly
// "true" in the runtime environment, and even then only to the addresses in
// LEADFLOW_NOTIFY_EMAIL (never to a lead) and only when there is somebody to
// call. Scheduled in vercel.json for 7:30 in the morning Central during
// daylight time; the same page is always at /admin/call-sheet.
//
// Needs CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Fail closed, like the newer crons: no secret configured means nobody
  // can trigger a service-role read of the lead table.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!callSheetEmailEnabled(process.env)) {
    return NextResponse.json({ ok: true, skipped: "CALL_SHEET_EMAIL_ENABLED is not true" });
  }
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !resendKey) {
    return NextResponse.json({ ok: true, skipped: "missing env" });
  }

  const now = new Date();
  const loaded = await loadCallSheet(createServiceClient(), now);
  if (!loaded.ok) {
    console.error("call sheet load failed:", loaded.error);
    return NextResponse.json({ ok: false, error: "load failed" }, { status: 500 });
  }
  const email = callSheetEmail(loaded.sheet, BUSINESS.siteUrl);
  if (!email) return NextResponse.json({ ok: true, sent: false, reason: "nothing to call", rows: 0 });

  // One send per Central day: the key makes a retried cron a no-op at Resend.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `call-sheet/${day}`,
    },
    body: JSON.stringify({
      from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
      to: callSheetRecipients(process.env, BUSINESS.email.hello),
      subject: email.subject,
      text: email.text,
    }),
  }).catch((e: unknown) => {
    console.error("call sheet send failed:", e instanceof Error ? e.message : e);
    return null;
  });
  if (!r || !r.ok) {
    return NextResponse.json({ ok: false, error: `send failed${r ? ` (${r.status})` : ""}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent: true, rows: loaded.sheet.rows.length, counts: loaded.sheet.counts });
}

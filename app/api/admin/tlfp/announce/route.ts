import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BUSINESS } from "@/lib/site/business";
import { TLFP_ANNOUNCE, launchEmail, pickRecipients } from "@/lib/tlfpAnnounce";
import { unsubscribeSecret, unsubscribeUrl } from "@/lib/unsubscribe";

// Admin: send the TLFP Credits launch email to the list, one email per person
// through Resend, each with that person's own one-click unsubscribe link and
// List-Unsubscribe headers (the same mechanism the 30 day series uses).
//
// POST { dry_run: true }   counts only, nothing sent
// POST { dry_run: false }  sends to everyone not yet sent, records each send
//
// Who gets it: leads that gave marketing consent and are not deleted, test, or
// unsubscribed. Each send is written to lead_activity, and anyone with that
// row already is skipped, so the route can run again after a timeout and only
// the people who were missed get the email.
//
// Runs server-side because the Resend and service keys live in env vars. The
// browser only ever posts { dry_run }. The Resend key on this site can only
// send, so audiences and broadcasts are not an option here.

export const runtime = "nodejs";
export const maxDuration = 120;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dry_run !== false;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY is not set." }, { status: 500 });
  const secret = unsubscribeSecret();
  if (!secret) return NextResponse.json({ error: "No unsubscribe signing secret. Nothing sent." }, { status: 500 });

  try {
    const service = createServiceClient();
    const leadsRes = await service
      .from("leads")
      .select("id, email, full_name")
      .or("is_test.is.null,is_test.eq.false")
      .is("deleted_at", null)
      .is("email_unsubscribed_at", null)
      .eq("marketing_email_consent", true)
      .limit(2000);
    if (leadsRes.error) throw new Error(leadsRes.error.message);
    const unsubRes = await service.from("leads").select("email").not("email_unsubscribed_at", "is", null).limit(2000);
    if (unsubRes.error) throw new Error(unsubRes.error.message);

    const rows = (leadsRes.data ?? []) as Array<{ id: string; email: string; full_name: string | null }>;
    const picked = pickRecipients({
      leads: rows,
      customers: [],
      unsubscribed: (unsubRes.data ?? []).map((row) => String(row.email ?? "")),
    });
    const byEmail = new Map(rows.map((row) => [String(row.email ?? "").trim().toLowerCase(), row]));

    // Already sent: one lead_activity row per send.
    const sentRes = await service.from("lead_activity").select("lead_id").eq("detail", TLFP_ANNOUNCE.activityDetail).limit(5000);
    if (sentRes.error) throw new Error(sentRes.error.message);
    const alreadySent = new Set((sentRes.data ?? []).map((row) => String(row.lead_id)));

    const queue = picked.recipients
      .map((person) => ({ person, lead: byEmail.get(person.email) }))
      .filter((item): item is { person: (typeof picked.recipients)[number]; lead: (typeof rows)[number] } => Boolean(item.lead) && !alreadySent.has(item.lead!.id));

    const summary = {
      consented_leads: picked.recipients.length,
      removed_unsubscribed: picked.removed,
      already_sent: picked.recipients.length - queue.length,
      to_send: queue.length,
    };
    if (dryRun) return NextResponse.json({ ok: true, dry_run: true, ...summary });
    if (queue.length === 0) return NextResponse.json({ ok: true, dry_run: false, ...summary, sent: 0, failed: 0 });
    if (picked.recipients.length > TLFP_ANNOUNCE.maxRecipients) {
      return NextResponse.json({ error: "Recipient count is outside the expected range. Nothing sent.", ...summary }, { status: 409 });
    }

    const from = `${BUSINESS.operator} <${BUSINESS.email.hello}>`;
    let sent = 0;
    let failed = 0;
    let lastError: string | null = null;
    const startedAt = Date.now();
    for (const { person, lead } of queue) {
      // Leave time to answer before the function is cut off. What is left runs next call.
      if (Date.now() - startedAt > 95_000) break;
      const unsub = unsubscribeUrl(lead.id, secret);
      const email = launchEmail(unsub);
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [person.email],
            reply_to: BUSINESS.email.hello,
            subject: email.subject,
            html: email.html,
            text: email.text,
            headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
            tags: [{ name: "campaign", value: TLFP_ANNOUNCE.campaignTag }],
          }),
        });
        const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
        if (!r.ok) throw new Error(j.message || `Resend ${r.status}`);
        sent += 1;
        await service.from("lead_activity").insert({ lead_id: lead.id, kind: "system", detail: TLFP_ANNOUNCE.activityDetail });
        await service
          .from("leads")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", lead.id)
          .then(
            () => undefined,
            () => undefined,
          );
      } catch (error) {
        failed += 1;
        lastError = error instanceof Error ? error.message : "unknown";
        console.error("TLFP announce: send failed:", lastError);
      }
      await sleep(600); // Resend allows two requests a second
    }

    console.log(`TLFP announce by ${user.email}: sent ${sent}, failed ${failed}, left ${queue.length - sent - failed}`);
    return NextResponse.json({ ok: failed === 0, dry_run: false, ...summary, sent, failed, left: queue.length - sent - failed, last_error: lastError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("TLFP announce failed:", message);
    return NextResponse.json({ error: `Did not send: ${message}` }, { status: 500 });
  }
}

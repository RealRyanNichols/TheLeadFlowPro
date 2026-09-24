import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { BUSINESS } from "@/lib/site/business";
import { TLFP_ANNOUNCE, launchEmail, pickRecipients } from "@/lib/tlfpAnnounce";

// Admin: send the TLFP Credits launch email to the list, through Resend, as a
// broadcast (so every copy carries a real unsubscribe link and the opens and
// clicks land in one place).
//
// POST { dry_run: true }   counts only, nothing created, nothing sent
// POST { dry_run: false }  creates the audience if needed, adds contacts,
//                          creates the broadcast, sends it
//
// Who gets it: leads that gave marketing consent and are not deleted, test, or
// unsubscribed, plus anyone who has paid us through Stripe. Anyone Resend
// already knows as unsubscribed, in any audience, is removed. Sends once: if a
// broadcast with this name already left, the route refuses.
//
// Runs server-side because the Resend, Stripe and service keys live in env
// vars. The browser only ever posts { dry_run }.

export const runtime = "nodejs";
export const maxDuration = 120;

type ResendAudience = { id: string; name: string };
type ResendContact = { email: string; unsubscribed?: boolean };
type ResendBroadcast = { id: string; name?: string | null; status?: string | null };

async function resend(key: string, method: "GET" | "POST", path: string, body?: unknown) {
  const r = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { data?: unknown; message?: string };
  if (!r.ok) throw new Error(`Resend ${r.status} on ${method} ${path}: ${typeof j.message === "string" ? j.message : "no detail"}`);
  return j;
}

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

  try {
    // 1. Leads with marketing consent, mailable.
    const service = createServiceClient();
    const leadsRes = await service
      .from("leads")
      .select("email, full_name")
      .eq("is_test", false)
      .is("deleted_at", null)
      .is("email_unsubscribed_at", null)
      .eq("marketing_email_consent", true)
      .limit(2000);
    if (leadsRes.error) throw new Error(leadsRes.error.message);
    const unsubRes = await service.from("leads").select("email").not("email_unsubscribed_at", "is", null).limit(2000);
    if (unsubRes.error) throw new Error(unsubRes.error.message);

    // 2. Paying customers: succeeded charges and completed checkouts.
    const customers: Array<{ email: unknown; name?: unknown }> = [];
    try {
      const stripe = getStripe();
      const charges = await stripe.charges.list({ limit: 100 });
      for (const charge of charges.data) {
        if (charge.status !== "succeeded" || charge.refunded) continue;
        customers.push({ email: charge.billing_details?.email ?? charge.receipt_email, name: charge.billing_details?.name });
      }
      const sessions = await stripe.checkout.sessions.list({ limit: 100, status: "complete" });
      for (const session of sessions.data) {
        customers.push({ email: session.customer_details?.email ?? session.customer_email, name: session.customer_details?.name });
      }
    } catch (error) {
      // Stripe down or unconfigured: the leads still go. Say so in the answer.
      console.error("TLFP announce: Stripe read failed:", error instanceof Error ? error.message : "unknown");
    }

    // 3. Every unsubscribe Resend already knows about, in any audience.
    const audiences = ((await resend(resendKey, "GET", "/audiences")).data ?? []) as ResendAudience[];
    const unsubscribed: string[] = (unsubRes.data ?? []).map((row) => String(row.email ?? ""));
    for (const audience of audiences) {
      const contacts = ((await resend(resendKey, "GET", `/audiences/${audience.id}/contacts`)).data ?? []) as ResendContact[];
      for (const contact of contacts) if (contact.unsubscribed) unsubscribed.push(contact.email);
    }

    const picked = pickRecipients({ leads: leadsRes.data ?? [], customers, unsubscribed });
    const summary = {
      leads: picked.leadCount,
      customers: picked.customerCount,
      removed_unsubscribed: picked.removed,
      recipients: picked.recipients.length,
      audiences_seen: audiences.length,
    };

    // 4. Sent once. A broadcast by this name that already left blocks a second send.
    const broadcasts = ((await resend(resendKey, "GET", "/broadcasts")).data ?? []) as ResendBroadcast[];
    const existing = broadcasts.find((b) => b.name === TLFP_ANNOUNCE.broadcastName && b.status && b.status !== "draft");
    if (existing) {
      return NextResponse.json(
        { error: `Already sent: broadcast ${existing.id} is ${existing.status}. Nothing sent again.`, ...summary, broadcast_id: existing.id },
        { status: 409 },
      );
    }

    if (dryRun) return NextResponse.json({ ok: true, dry_run: true, ...summary });

    if (picked.recipients.length < TLFP_ANNOUNCE.minRecipients || picked.recipients.length > TLFP_ANNOUNCE.maxRecipients) {
      return NextResponse.json({ error: "Recipient count is outside the expected range. Nothing sent.", ...summary }, { status: 409 });
    }

    // 5. Audience and contacts.
    let audience = audiences.find((a) => a.name === TLFP_ANNOUNCE.audienceName);
    if (!audience) audience = (await resend(resendKey, "POST", "/audiences", { name: TLFP_ANNOUNCE.audienceName })) as unknown as ResendAudience;
    let added = 0;
    let alreadyThere = 0;
    for (const person of picked.recipients) {
      try {
        await resend(resendKey, "POST", `/audiences/${audience.id}/contacts`, {
          email: person.email,
          first_name: person.firstName || undefined,
          unsubscribed: false,
        });
        added += 1;
      } catch (error) {
        if (/409|already exists/i.test(error instanceof Error ? error.message : "")) alreadyThere += 1;
        else throw error;
      }
      await sleep(120);
    }

    // 6. The broadcast.
    const email = launchEmail();
    const broadcast = (await resend(resendKey, "POST", "/broadcasts", {
      audience_id: audience.id,
      from: `${BUSINESS.operator} <${BUSINESS.email.hello}>`,
      reply_to: BUSINESS.email.hello,
      subject: email.subject,
      name: TLFP_ANNOUNCE.broadcastName,
      html: email.html,
      text: email.text,
    })) as unknown as ResendBroadcast;
    await resend(resendKey, "POST", `/broadcasts/${broadcast.id}/send`, {});

    console.log(`TLFP announce sent by ${user.email}: broadcast ${broadcast.id} to ${picked.recipients.length}`);
    return NextResponse.json({ ok: true, dry_run: false, ...summary, audience_id: audience.id, contacts_added: added, contacts_already_there: alreadyThere, broadcast_id: broadcast.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("TLFP announce failed:", message);
    return NextResponse.json({ error: `Did not send: ${message}` }, { status: 500 });
  }
}

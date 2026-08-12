import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Daily follow-up sequence for leads that haven't booked. Runs on Vercel Cron
// (vercel.json). Needs env vars: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
// RESEND_API_KEY. Missing any → safe no-op.
// Sends at most ONE step per lead per day, in order, and never re-sends a step.

const SITE = "https://www.theleadflowpro.com";

const STEPS: { step: number; afterDays: number; subject: (first: string) => string; body: (first: string) => string }[] = [
  {
    step: 1,
    afterDays: 1,
    subject: (f) => `${f}, run your real numbers`,
    body: (f) =>
      [
        `${f},`,
        ``,
        `Yesterday you told me a bit about your business. Before we ever get on a call, do one thing:`,
        ``,
        `Run your actual numbers through the calculator — your platform, your list size, your traffic:`,
        `${SITE}/?utm_source=email&utm_medium=followup&utm_campaign=followup-day1#receipt`,
        ``,
        `Line by line, published vendor pricing, sources shown. Most owners find out they're handing $7,000 to $18,000 to rented platforms every 3 years — and owning nothing at the end of it.`,
        ``,
        `The tape is the tape. Run it.`,
        ``,
        `Ryan Nichols`,
        `The LeadFlow Pro | Own your platform.`,
      ].join("\n"),
  },
  {
    step: 2,
    afterDays: 3,
    subject: () => `What a build actually looks like`,
    body: (f) =>
      [
        `${f},`,
        ``,
        `Talk is cheap, so I built a demo you can walk through: a sample local business running on the exact system I build for clients.`,
        ``,
        `${SITE}/demo?utm_source=email&utm_medium=followup&utm_campaign=followup-day3`,
        ``,
        `Look at the annotations. The funnel, the tracking, the lead capture that answers in under a second, the back office the owner actually sees. That's not a template from a page builder. That's a platform — and the client owns every piece of it.`,
        ``,
        `When you're ready to see yours: ${SITE}/book`,
        ``,
        `Ryan Nichols`,
      ].join("\n"),
  },
  {
    step: 3,
    afterDays: 5,
    subject: () => `The part nobody else shows you`,
    body: (f) =>
      [
        `${f},`,
        ``,
        `Websites are easy. What nobody hands you is the command center — live traffic, every lead attributed to the ad that earned it, AI agents doing the follow-up while you sleep.`,
        ``,
        `I put a live demo of it here:`,
        `${SITE}/showcase?utm_source=email&utm_medium=followup&utm_campaign=followup-day5`,
        ``,
        `If your online life feels like chaos, this is what the other side looks like.`,
        ``,
        `Ryan Nichols`,
      ].join("\n"),
  },
  {
    step: 4,
    afterDays: 7,
    subject: (f) => `${f} — straight question`,
    body: (f) =>
      [
        `${f},`,
        ``,
        `A week ago you reached out. Straight question: do you want this fixed or not?`,
        ``,
        `Thirty minutes. I'll come with your numbers already run and give you your next three moves — whether you hire me or not. No pressure, no scripts.`,
        ``,
        `Grab the call: ${SITE}/book?utm_source=email&utm_medium=followup&utm_campaign=followup-day7`,
        ``,
        `If the timing's wrong, reply and tell me — I'd rather hear "not yet" than silence.`,
        ``,
        `Ryan Nichols`,
        `The LeadFlow Pro | Own your platform.`,
      ].join("\n"),
  },
];

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!serviceKey || !resendKey) {
    return NextResponse.json({ ok: true, skipped: "missing SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY" });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const since = new Date(Date.now() - 21 * 86400e3).toISOString();

  const { data: leads } = await supabase
    .from("leads")
    .select("id, created_at, full_name, email, status")
    .is("deleted_at", null)
    .in("status", ["new", "contacted"])
    .gte("created_at", since);

  const { data: sentRows } = await supabase
    .from("lead_emails")
    .select("lead_id, step");
  const sent = new Set((sentRows ?? []).map((r) => `${r.lead_id}:${r.step}`));

  let delivered = 0;
  for (const lead of leads ?? []) {
    const days = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400e3);
    // lowest unsent step whose day has arrived → keeps sequence order, one per run
    const next = STEPS.find((s) => days >= s.afterDays && !sent.has(`${lead.id}:${s.step}`));
    if (!next) continue;

    // Claim the step first (unique constraint = no dupes even on overlapping runs)
    const { error: claimErr } = await supabase
      .from("lead_emails")
      .insert({ lead_id: lead.id, step: next.step });
    if (claimErr) continue;

    const first = (lead.full_name ?? "there").split(" ")[0];
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ryan Nichols <hello@theleadflowpro.com>",
        to: [lead.email],
        reply_to: "hello@theleadflowpro.com",
        subject: next.subject(first),
        text: next.body(first),
      }),
    }).catch(() => {});
    delivered++;
  }

  return NextResponse.json({ ok: true, checked: (leads ?? []).length, delivered });
}

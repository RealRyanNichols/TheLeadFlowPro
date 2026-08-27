import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { NURTURE_STEPS, stepsDueBy, type NurtureStep } from "@/lib/nurture";
import { unsubscribeSecret, unsubscribeUrl } from "@/lib/unsubscribe";

// The 30 day sequence sender. Runs once a day on Vercel Cron.
//
// ONE EMAIL PER LEAD PER RUN. A lead that has been sitting for three weeks
// with nothing sent does not get slammed with six emails at once. It gets the
// oldest one it is owed today and the next one tomorrow. Slower, but it never
// looks like a broken robot.
//
// IDEMPOTENCY: the claim row in lead_emails goes in BEFORE the send, and the
// table has UNIQUE (lead_id, step). Two overlapping runs cannot both claim the
// same step. If the send then fails, the claim is deleted so tomorrow retries
// it. A missed email is recoverable. A duplicate is not.
//
// WHO IS ELIGIBLE (all must be true):
//   - not deleted, not a test row
//   - marketing_email_consent is true. They ticked the box. No box, no series.
//   - email_unsubscribed_at is null
//   - status is new or contacted. Somebody who already bought or already said
//     no does not get sold to.
//   - created in the last 45 days

export const maxDuration = 60;

const MAX_SENDS_PER_RUN = 200;
const LOOKBACK_DAYS = 45;
// Minimum gap between two emails to the SAME lead. 20 rather than 24 so a cron
// that drifts a few minutes early does not skip a day.
const MIN_HOURS_BETWEEN_SENDS = 20;

type EligibleLead = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

function firstNameOf(fullName: string | null): string {
  return String(fullName ?? "").trim().split(" ")[0] || "there";
}

function ageInDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

function renderBody(step: NurtureStep, lead: EligibleLead, unsubUrl: string): string {
  return [
    step.body(firstNameOf(lead.full_name)),
    "",
    "Ryan Nichols",
    "The LeadFlow Pro",
    "(903) 500-8898",
    "Longview, Texas",
    "",
    "You are getting this because you asked me to send you business emails.",
    `Stop them any time, one click, no login: ${unsubUrl}`,
  ].join("\n");
}

export async function GET(request: Request) {
  // Fail CLOSED. This used to be `if (cronSecret && ...)`, which meant that
  // with CRON_SECRET unset the endpoint was open to anyone who guessed the URL
  // and every hit advanced the whole list by one email. Refusing to run
  // without the secret is the safe direction: a missed day is recoverable,
  // thirty emails fired at somebody in an afternoon is not.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const secret = unsubscribeSecret();

  // No unsubscribe secret means no working unsubscribe link, which means we do
  // not send. That is not a technicality, it is the rule.
  if (!serviceKey || !resendKey || !secret) {
    return NextResponse.json({
      ok: true,
      skipped: "missing SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, or unsubscribe secret",
      sent: 0,
    });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400e3).toISOString();

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, created_at, full_name, email")
    .is("deleted_at", null)
    .is("email_unsubscribed_at", null)
    .not("is_test", "is", true)
    .eq("marketing_email_consent", true)
    .in("status", ["new", "contacted"])
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (leadsError) {
    console.error("Nurture lead query failed:", leadsError.message);
    return NextResponse.json({ error: "lead query failed" }, { status: 500 });
  }

  const ids = (leads ?? []).map((l) => l.id);
  if (!ids.length) return NextResponse.json({ ok: true, checked: 0, sent: 0 });

  // One read for the whole batch instead of a query per lead.
  const { data: sentRows } = await supabase
    .from("lead_emails")
    .select("lead_id, step, created_at")
    .in("lead_id", ids)
    .gte("step", NURTURE_STEPS[0].step);

  const alreadySent = new Map<string, Set<number>>();
  const lastSentAt = new Map<string, number>();
  for (const row of sentRows ?? []) {
    const set = alreadySent.get(row.lead_id) ?? new Set<number>();
    set.add(row.step);
    alreadySent.set(row.lead_id, set);

    const at = row.created_at ? new Date(row.created_at).getTime() : NaN;
    if (Number.isFinite(at)) {
      lastSentAt.set(row.lead_id, Math.max(lastSentAt.get(row.lead_id) ?? 0, at));
    }
  }

  let sent = 0;
  let failed = 0;
  let throttled = 0;
  const errors: string[] = [];

  for (const lead of (leads ?? []) as EligibleLead[]) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    // Sentinel addresses: Meta leads with no email, and text-in leads who
    // never gave one. Mailing them is a guaranteed hard bounce against the
    // sending domain, which hurts delivery for everybody else on the list.
    if (!lead.email || lead.email.includes("@no-email.")) continue;

    const due = stepsDueBy(ageInDays(lead.created_at));
    if (!due.length) continue;

    const done = alreadySent.get(lead.id) ?? new Set<number>();
    const next = due.find((s) => !done.has(s.step));
    if (!next) continue;

    // One email per lead per DAY, enforced here rather than assumed from the
    // cron schedule. "Once a day" used to be true only because vercel.json
    // fires this once a day; any second invocation - a retry, a manual hit, a
    // probe - immediately walked every lead to their next step. That is
    // exactly what happened on 27 Aug 2026: steps 101 and 102 went to the same
    // three people 1h46m apart. The claim row and UNIQUE(lead_id, step) stop
    // the same step going twice; nothing stopped the NEXT step going too soon.
    // This does.
    const last = lastSentAt.get(lead.id);
    if (last && Date.now() - last < MIN_HOURS_BETWEEN_SENDS * 3600_000) {
      throttled++;
      continue;
    }

    // Claim first. UNIQUE (lead_id, step) makes this the lock.
    const claim = await supabase
      .from("lead_emails")
      .insert({ lead_id: lead.id, step: next.step });
    if (claim.error) continue; // already claimed by an overlapping run

    const unsubUrl = unsubscribeUrl(lead.id, secret);
    let ok = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Ryan Nichols <ryan@theleadflowpro.com>",
          reply_to: "hello@theleadflowpro.com",
          to: [lead.email],
          subject: next.subject,
          text: renderBody(next, lead, unsubUrl),
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      ok = response.ok;
      if (!ok) errors.push(`step ${next.step}: ${response.status}`);
    } catch (e) {
      errors.push(`step ${next.step}: ${e instanceof Error ? e.message : "send error"}`);
    }

    if (ok) {
      sent++;
      await supabase
        .from("lead_activity")
        .insert({
          lead_id: lead.id,
          kind: "system",
          detail: `Sent day ${next.day} follow-up email: ${next.subject}`,
        })
        .then(
          () => undefined,
          () => undefined,
        );
    } else {
      // Give the step back so tomorrow tries again.
      failed++;
      await supabase
        .from("lead_emails")
        .delete()
        .eq("lead_id", lead.id)
        .eq("step", next.step)
        .then(
          () => undefined,
          () => undefined,
        );
    }
  }

  return NextResponse.json({
    ok: true,
    checked: (leads ?? []).length,
    sent,
    failed,
    throttled,
    errors: errors.slice(0, 5),
  });
}

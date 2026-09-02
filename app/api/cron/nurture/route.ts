import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  isBusinessDiagnosticLead,
  NURTURE_FIRST_STEP,
  NURTURE_LAST_STEP,
  NURTURE_STEPS,
  stepsDueBy,
  type NurtureStep,
} from "@/lib/nurture";
import {
  nurtureEmailIdempotencyKey,
  nurtureRetryWindowExpired,
  sendNurtureEmail,
} from "@/lib/nurtureDelivery";
import { unsubscribeSecret, unsubscribeUrl } from "@/lib/unsubscribe";

// The 30 day sequence sender. Runs hourly so an uncertain provider response can
// be retried inside Resend's 24-hour idempotency window.
//
// ONE SUCCESSFUL EMAIL PER LEAD PER 24 HOURS. A lead that has been sitting for
// three weeks with nothing sent does not get slammed with six emails at once.
// It gets the oldest one it is owed today and the next one tomorrow.
//
// IDEMPOTENCY: the claim row in lead_emails goes in BEFORE the send, and the
// table has UNIQUE (lead_id, step). Two overlapping runs cannot both claim the
// same step. The row stays pending after any ambiguous response and every
// retry uses one stable Resend key for the sequence + lead + step. Automated
// retries stop at 23 hours, before Resend forgets the key. The claim is never
// deleted on failure because replaying it outside that window could duplicate
// an email the provider accepted while the response was lost.
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
const MIN_HOURS_BETWEEN_SENDS = 24;
const MIN_RETRY_INTERVAL_MS = 30 * 60 * 1000;

type EligibleLead = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  source: string | null;
  diagnostic: unknown;
};

type NurtureDeliveryRow = {
  id: string;
  lead_id: string;
  step: number;
  sent_at: string;
  delivery_status: "pending" | "sent" | "failed";
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  attempt_count: number;
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
    .select("id, created_at, full_name, email, source, diagnostic")
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

  // Business diagnostic submissions have a separate seven-day campaign whose
  // clock starts at business_growth_diagnostics.submitted_at. Never mix those
  // leads into this created_at-based 30-day campaign, even when they also gave
  // general marketing consent.
  const eligibleLeads = ((leads ?? []) as EligibleLead[]).filter(
    (lead) => !isBusinessDiagnosticLead(lead),
  );
  const excludedDiagnostic = (leads ?? []).length - eligibleLeads.length;
  const ids = eligibleLeads.map((lead) => lead.id);
  if (!ids.length) {
    return NextResponse.json({
      ok: true,
      checked: 0,
      excludedDiagnostic,
      sent: 0,
    });
  }

  // One read for the whole batch instead of a query per lead.
  const { data: sentRows, error: sentRowsError } = await supabase
    .from("lead_emails")
    .select(
      "id, lead_id, step, sent_at, delivery_status, first_attempt_at, last_attempt_at, attempt_count",
    )
    .in("lead_id", ids)
    .gte("step", NURTURE_FIRST_STEP)
    .lte("step", NURTURE_LAST_STEP);

  if (sentRowsError) {
    console.error("Nurture send-history query failed:", sentRowsError.message);
    return NextResponse.json({ error: "send history query failed" }, { status: 500 });
  }

  const alreadySent = new Map<string, Set<number>>();
  const lastSentAt = new Map<string, number>();
  const deliveryRowsByLead = new Map<string, NurtureDeliveryRow[]>();
  for (const row of (sentRows ?? []) as NurtureDeliveryRow[]) {
    const rows = deliveryRowsByLead.get(row.lead_id) ?? [];
    rows.push(row);
    deliveryRowsByLead.set(row.lead_id, rows);

    if (row.delivery_status !== "sent") continue;
    const set = alreadySent.get(row.lead_id) ?? new Set<number>();
    set.add(row.step);
    alreadySent.set(row.lead_id, set);

    const at = row.sent_at ? new Date(row.sent_at).getTime() : NaN;
    if (Number.isFinite(at)) {
      lastSentAt.set(row.lead_id, Math.max(lastSentAt.get(row.lead_id) ?? 0, at));
    }
  }

  let sent = 0;
  let failed = 0;
  let throttled = 0;
  let retried = 0;
  let retryDeferred = 0;
  let blocked = 0;
  const errors: string[] = [];

  for (const lead of eligibleLeads) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    // Sentinel addresses: Meta leads with no email, and text-in leads who
    // never gave one. Mailing them is a guaranteed hard bounce against the
    // sending domain, which hurts delivery for everybody else on the list.
    if (!lead.email || lead.email.includes("@no-email.")) continue;

    const due = stepsDueBy(ageInDays(lead.created_at));
    if (!due.length) continue;

    const deliveryRows = deliveryRowsByLead.get(lead.id) ?? [];
    const failedRow = deliveryRows.find((row) => row.delivery_status === "failed");
    if (failedRow) {
      blocked++;
      continue;
    }

    const pendingRow = deliveryRows
      .filter((row) => row.delivery_status === "pending")
      .sort((a, b) => a.step - b.step)[0];
    let next: NurtureStep | undefined;
    let deliveryRow: NurtureDeliveryRow | null = null;

    if (pendingRow) {
      next = NURTURE_STEPS.find((step) => step.step === pendingRow.step);
      if (!next || nurtureRetryWindowExpired(pendingRow.first_attempt_at)) {
        const reason = next
          ? "Automatic retry stopped before Resend's 24-hour idempotency key expired"
          : `Pending nurture step ${pendingRow.step} is not in the active sequence`;
        await supabase
          .from("lead_emails")
          .update({ delivery_status: "failed", last_error: reason })
          .eq("id", pendingRow.id)
          .eq("delivery_status", "pending");
        failed++;
        blocked++;
        errors.push(`step ${pendingRow.step}: ${reason}`);
        continue;
      }

      const lastAttemptMs = pendingRow.last_attempt_at
        ? Date.parse(pendingRow.last_attempt_at)
        : Number.NaN;
      if (Number.isFinite(lastAttemptMs) && Date.now() - lastAttemptMs < MIN_RETRY_INTERVAL_MS) {
        retryDeferred++;
        continue;
      }

      const attemptAt = new Date().toISOString();
      const retryClaim = await supabase
        .from("lead_emails")
        .update({
          attempt_count: pendingRow.attempt_count + 1,
          last_attempt_at: attemptAt,
          last_error: null,
        })
        .eq("id", pendingRow.id)
        .eq("delivery_status", "pending")
        .eq("attempt_count", pendingRow.attempt_count)
        .select(
          "id, lead_id, step, sent_at, delivery_status, first_attempt_at, last_attempt_at, attempt_count",
        )
        .maybeSingle();
      if (retryClaim.error) {
        failed++;
        errors.push(`step ${pendingRow.step} retry claim: ${retryClaim.error.message}`);
        continue;
      }
      if (!retryClaim.data) {
        retryDeferred++;
        continue;
      }
      deliveryRow = retryClaim.data as NurtureDeliveryRow;
      retried++;
    } else {
      const done = alreadySent.get(lead.id) ?? new Set<number>();
      next = due.find((step) => !done.has(step.step));
      if (!next) continue;

      // One successful email per lead per 24 hours. The hourly cron is for
      // retrying the SAME pending step, never for advancing the sequence.
      const last = lastSentAt.get(lead.id);
      if (last && Date.now() - last < MIN_HOURS_BETWEEN_SENDS * 3600_000) {
        throttled++;
        continue;
      }

      const attemptAt = new Date().toISOString();
      const claim = await supabase
        .from("lead_emails")
        .insert({
          lead_id: lead.id,
          step: next.step,
          delivery_status: "pending",
          first_attempt_at: attemptAt,
          last_attempt_at: attemptAt,
          attempt_count: 1,
        })
        .select(
          "id, lead_id, step, sent_at, delivery_status, first_attempt_at, last_attempt_at, attempt_count",
        )
        .single();
      if (claim.error) {
        // 23505 is the expected loser in an overlapping run. Any other failure
        // means the lock could not be acquired for an operational reason.
        if (claim.error.code !== "23505") {
          failed++;
          errors.push(`step ${next.step} claim: ${claim.error.message}`);
        }
        continue;
      }
      deliveryRow = claim.data as NurtureDeliveryRow;
    }

    const unsubUrl = unsubscribeUrl(lead.id, secret);
    const delivery = await sendNurtureEmail(
      resendKey,
      nurtureEmailIdempotencyKey(lead.id, next.step),
      {
        from: "Ryan Nichols <ryan@theleadflowpro.com>",
        reply_to: "hello@theleadflowpro.com",
        to: [lead.email],
        subject: next.subject,
        text: renderBody(next, lead, unsubUrl),
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
    );

    if (delivery.ok) {
      const acceptedAt = new Date().toISOString();
      const finalized = await supabase
        .from("lead_emails")
        .update({
          delivery_status: "sent",
          sent_at: acceptedAt,
          last_attempt_at: acceptedAt,
          provider_message_id: delivery.providerMessageId,
          last_error: null,
        })
        .eq("id", deliveryRow.id)
        .eq("delivery_status", "pending")
        .select("id")
        .maybeSingle();
      if (finalized.error) {
        // The provider accepted the request but the ledger is still pending.
        // The next hourly retry uses the same key and cannot duplicate it.
        failed++;
        errors.push(`step ${next.step} finalize: ${finalized.error.message}`);
        continue;
      }
      if (!finalized.data) {
        // Another invocation finalized the same provider-keyed request first.
        // It also owns the activity row and response counters.
        retryDeferred++;
        continue;
      }

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
      // Retain the unique claim. The hourly cron can replay the identical key
      // inside the safe window, but never after provider deduplication expires.
      failed++;
      await supabase
        .from("lead_emails")
        .update({ last_error: delivery.error, last_attempt_at: new Date().toISOString() })
        .eq("id", deliveryRow.id)
        .eq("delivery_status", "pending");
      errors.push(`step ${next.step}: ${delivery.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: eligibleLeads.length,
    excludedDiagnostic,
    sent,
    failed,
    throttled,
    retried,
    retry_deferred: retryDeferred,
    blocked,
    errors: errors.slice(0, 5),
  });
}

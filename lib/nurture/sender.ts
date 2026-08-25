// The nurture pass the daily cron runs. All decisions come from
// lib/nurture/sequence.ts (pure, unit-tested); this file is the I/O shell:
// query leads, claim the step in the ledger, send through Resend, release the
// claim if the provider refuses.
//
// Hard rules honored here:
//   - NURTURE_SEQUENCE_ENABLED must be "true" or nothing sends. The code can
//     ship fully dark and Ryan activates it with one env var after approving
//     the copy.
//   - Sends only between 8am and 6pm America/Chicago.
//   - One email max per lead per run; a lead never gets a step twice
//     (UNIQUE(lead_id, step) claim inserted before the send).
//   - Consent gate, unsubscribe, conversion, and purchase stops before send.
//   - From theleadflowpro.com only. Never Premier Dental's account or domain.
//   - No Quo, no SMS, nothing here touches a phone number.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FIRST_STEP,
  LAST_STEP,
  dueStep,
  ineligibleReason,
  inSendWindow,
  unsubscribeUrl,
  type NurtureLead,
} from "./sequence";
import { emailForStep } from "./emails";

const FOOTER = (unsubscribe: string) =>
  [
    ``,
    `Ryan Nichols`,
    `The LeadFlow Pro | Longview, Texas`,
    `https://www.theleadflowpro.com`,
    ``,
    `You are getting these because you checked the optional box asking for`,
    `business emails. One click stops them: ${unsubscribe}`,
  ].join("\n");

export type NurtureRunResult = {
  enabled: boolean;
  inWindow: boolean;
  considered: number;
  sent: number;
  skipped: Record<string, number>;
  errors: number;
};

export async function runNurturePass(
  supabase: SupabaseClient,
  {
    resendKey,
    linkSecret,
    now = new Date(),
    limit = 200,
  }: { resendKey: string; linkSecret: string; now?: Date; limit?: number },
): Promise<NurtureRunResult> {
  const result: NurtureRunResult = {
    enabled: process.env.NURTURE_SEQUENCE_ENABLED === "true",
    inWindow: inSendWindow(now),
    considered: 0,
    sent: 0,
    skipped: {},
    errors: 0,
  };
  const skip = (reason: string) => {
    result.skipped[reason] = (result.skipped[reason] ?? 0) + 1;
  };
  if (!result.enabled || !result.inWindow || !resendKey || !linkSecret) return result;

  // Candidate pool: consented Meta leads young enough to still be in the
  // 30-day arc (a generous 45-day lookback covers late starts).
  const since = new Date(now.getTime() - 45 * 86_400_000).toISOString();
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      "id, full_name, email, goals, source, status, is_test, deleted_at, " +
        "marketing_email_consent, email_unsubscribed_at, consent_at, created_at",
    )
    .eq("source", "meta_lead_ad")
    .eq("marketing_email_consent", true)
    .is("deleted_at", null)
    .is("email_unsubscribed_at", null)
    .gte("created_at", since)
    .limit(limit);
  if (leadsError) {
    result.errors++;
    return result;
  }
  const pool = (leads ?? []) as unknown as (NurtureLead & { goals: string | null })[];
  result.considered = pool.length;
  if (pool.length === 0) return result;

  // Purchases by email = converted to the customer track.
  const emails = [...new Set(pool.map((lead) => lead.email.toLowerCase()))];
  const { data: purchaseRows } = await supabase
    .from("purchases")
    .select("email")
    .eq("status", "paid")
    .in("email", emails);
  const purchased = new Set((purchaseRows ?? []).map((r) => String(r.email).toLowerCase()));

  // Ledger for this sequence's steps, one query for the whole pool.
  const { data: sentRows } = await supabase
    .from("lead_emails")
    .select("lead_id, step")
    .gte("step", FIRST_STEP)
    .lte("step", LAST_STEP)
    .in("lead_id", pool.map((lead) => lead.id));
  const ledger = new Map<string, Set<number>>();
  for (const row of sentRows ?? []) {
    const set = ledger.get(row.lead_id) ?? new Set<number>();
    set.add(row.step);
    ledger.set(row.lead_id, set);
  }

  for (const lead of pool) {
    const reason = ineligibleReason(lead, {
      hasPurchase: purchased.has(lead.email.toLowerCase()),
    });
    if (reason) {
      skip(reason);
      continue;
    }

    const sentSteps = ledger.get(lead.id) ?? new Set<number>();
    const step = dueStep(lead, sentSteps, now);
    if (step === null) {
      skip("nothing_due");
      continue;
    }
    const email = emailForStep(step);
    if (!email) {
      skip("no_template");
      continue;
    }

    // Claim before sending. The UNIQUE constraint makes overlapping runs
    // fight over this insert; the loser skips.
    const claim = await supabase
      .from("lead_emails")
      .insert({ lead_id: lead.id, step });
    if (claim.error) {
      skip(claim.error.code === "23505" ? "already_claimed" : "claim_failed");
      continue;
    }

    const first = String(lead.full_name ?? "").trim().split(" ")[0] || "there";
    const unsubscribe = unsubscribeUrl(lead.id, linkSecret);
    const body = email.body({ first, goals: lead.goals }) + "\n" + FOOTER(unsubscribe);

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ryan Nichols <ryan@theleadflowpro.com>",
        to: [lead.email],
        reply_to: "hello@theleadflowpro.com",
        subject: email.subject,
        text: body,
        headers: {
          "List-Unsubscribe": `<${unsubscribe}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    }).catch(() => null);

    if (sendResponse?.ok) {
      result.sent++;
    } else {
      // Release the claim so tomorrow's run retries this step.
      await supabase.from("lead_emails").delete().eq("lead_id", lead.id).eq("step", step);
      result.errors++;
      console.error(
        "nurture send failed:",
        step,
        sendResponse?.status ?? "network",
        await sendResponse?.text().catch(() => ""),
      );
    }
  }

  return result;
}

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  BUSINESS_DIAGNOSTIC_CAMPAIGN,
  cleanDiagnosticAnswers,
  type DiagnosticAnswers,
} from "@/lib/businessDiagnostic";
import {
  DIAGNOSTIC_EMAIL_STEPS,
  diagnosticServerResumeUrl,
  diagnosticStepsDueBy,
  sendDiagnosticNurtureStep,
} from "@/lib/businessDiagnosticEmails";
import { SUPABASE_URL } from "@/lib/config";
import { unsubscribeSecret } from "@/lib/unsubscribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SENDS_PER_RUN = 200;
const MAX_DIAGNOSTICS_PER_RUN = 500;
const LOOKBACK_DAYS = 45;
const MIN_HOURS_BETWEEN_SENDS = 20;

type ActiveDiagnostic = {
  id: string;
  lead_id: string;
  request_id: string;
  submitted_at: string;
  answers: DiagnosticAnswers;
  consent_snapshot: Record<string, unknown>;
  email_campaign_enrolled_at: string | null;
  resume_state: "active" | "revoked";
  resume_expires_at: string;
};

type CampaignLead = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  marketing_email_consent: boolean;
  email_unsubscribed_at: string | null;
  deleted_at: string | null;
  is_test: boolean;
};

function ageInDays(submittedAt: string): number {
  const age = Date.now() - Date.parse(submittedAt);
  return Number.isFinite(age) ? Math.max(0, Math.floor(age / 86_400_000)) : 0;
}

function stoppedAtAfterEnrollment(diagnostic: ActiveDiagnostic): string {
  const enrolled = Date.parse(diagnostic.email_campaign_enrolled_at || diagnostic.submitted_at);
  return new Date(Math.max(Date.now(), Number.isFinite(enrolled) ? enrolled : 0)).toISOString();
}

async function stopCampaign(
  supabase: SupabaseClient,
  diagnostic: ActiveDiagnostic,
  reason: string,
) {
  const update = await supabase
    .from("business_growth_diagnostics")
    .update({
      email_campaign_status: "stopped",
      email_campaign_stopped_at: stoppedAtAfterEnrollment(diagnostic),
      email_campaign_stop_reason: reason.slice(0, 200),
    })
    .eq("id", diagnostic.id)
    .eq("email_campaign_status", "active");
  if (update.error) console.error("Diagnostic campaign stop failed:", update.error.code);
}

async function completeCampaign(supabase: SupabaseClient, diagnostic: ActiveDiagnostic) {
  const enrolled = Date.parse(diagnostic.email_campaign_enrolled_at || diagnostic.submitted_at);
  const completedAt = new Date(
    Math.max(Date.now(), Number.isFinite(enrolled) ? enrolled : 0),
  ).toISOString();
  const update = await supabase
    .from("business_growth_diagnostics")
    .update({
      email_campaign_status: "completed",
      email_campaign_completed_at: completedAt,
    })
    .eq("id", diagnostic.id)
    .eq("email_campaign_status", "active");
  if (update.error) console.error("Diagnostic campaign completion failed:", update.error.code);
}

function suppressionReason(
  diagnostic: ActiveDiagnostic,
  lead: CampaignLead | undefined,
): string | null {
  if (diagnostic.consent_snapshot?.seven_day_email_consent !== true) {
    return "Seven-day email consent is no longer present";
  }
  if (diagnostic.resume_state !== "active" || Date.parse(diagnostic.resume_expires_at) <= Date.now()) {
    return "Private diagnostic resume access expired or was revoked";
  }
  if (!lead) return "Lead record is unavailable";
  if (lead.deleted_at) return "Lead was deleted";
  if (lead.is_test) return "Test lead";
  if (lead.email_unsubscribed_at || !lead.marketing_email_consent) {
    return "Lead unsubscribed or withdrew email consent";
  }
  if (!["new", "contacted"].includes(lead.status)) {
    return "Lead lifecycle is no longer eligible for nurture";
  }
  if (!lead.email || lead.email.includes("@no-email.")) return "Lead has no deliverable email";
  return null;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const unsubscribe = unsubscribeSecret();
  if (!serviceKey || !resendKey || !unsubscribe) {
    return NextResponse.json({
      ok: true,
      skipped: "missing SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, or unsubscribe secret",
      sent: 0,
    });
  }

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const diagnosticsResult = await supabase
    .from("business_growth_diagnostics")
    .select(
      "id, lead_id, request_id, submitted_at, answers, consent_snapshot, email_campaign_enrolled_at, resume_state, resume_expires_at",
    )
    .eq("status", "submitted")
    .eq("email_campaign", BUSINESS_DIAGNOSTIC_CAMPAIGN)
    .eq("email_campaign_status", "active")
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: true })
    .limit(MAX_DIAGNOSTICS_PER_RUN);
  if (diagnosticsResult.error) {
    console.error("Diagnostic nurture query failed:", diagnosticsResult.error.code);
    return NextResponse.json({ error: "diagnostic query failed" }, { status: 500 });
  }

  const diagnostics = (diagnosticsResult.data ?? []) as ActiveDiagnostic[];
  if (!diagnostics.length) return NextResponse.json({ ok: true, checked: 0, sent: 0 });

  const leadIds = [...new Set(diagnostics.map((diagnostic) => diagnostic.lead_id))];
  const leadsResult = await supabase
    .from("leads")
    .select(
      "id, full_name, email, status, marketing_email_consent, email_unsubscribed_at, deleted_at, is_test",
    )
    .in("id", leadIds);
  if (leadsResult.error) {
    console.error("Diagnostic nurture lead query failed:", leadsResult.error.code);
    return NextResponse.json({ error: "lead query failed" }, { status: 500 });
  }
  const leads = new Map(
    ((leadsResult.data ?? []) as CampaignLead[]).map((lead) => [lead.id, lead]),
  );

  const sendHistory = await supabase
    .from("lead_emails")
    .select("lead_id, step, sent_at")
    .in("lead_id", leadIds)
    .gte("step", DIAGNOSTIC_EMAIL_STEPS[0].step)
    .lte("step", DIAGNOSTIC_EMAIL_STEPS[DIAGNOSTIC_EMAIL_STEPS.length - 1].step);
  if (sendHistory.error) {
    console.error("Diagnostic nurture history query failed:", sendHistory.error.code);
    return NextResponse.json({ error: "send history query failed" }, { status: 500 });
  }

  const sentSteps = new Map<string, Set<number>>();
  const lastSentAt = new Map<string, number>();
  for (const row of sendHistory.data ?? []) {
    const steps = sentSteps.get(row.lead_id) ?? new Set<number>();
    steps.add(row.step);
    sentSteps.set(row.lead_id, steps);
    const sentAt = row.sent_at ? Date.parse(row.sent_at) : Number.NaN;
    if (Number.isFinite(sentAt)) {
      lastSentAt.set(row.lead_id, Math.max(lastSentAt.get(row.lead_id) ?? 0, sentAt));
    }
  }

  let sent = 0;
  let failed = 0;
  let stopped = 0;
  let completed = 0;
  let throttled = 0;
  let alreadyClaimed = 0;

  for (const diagnostic of diagnostics) {
    if (sent >= MAX_SENDS_PER_RUN) break;
    const lead = leads.get(diagnostic.lead_id);
    const reason = suppressionReason(diagnostic, lead);
    if (reason) {
      await stopCampaign(supabase, diagnostic, reason);
      stopped += 1;
      continue;
    }
    if (!lead) continue;

    const done = sentSteps.get(lead.id) ?? new Set<number>();
    if (DIAGNOSTIC_EMAIL_STEPS.every((step) => done.has(step.step))) {
      await completeCampaign(supabase, diagnostic);
      completed += 1;
      continue;
    }

    const due = diagnosticStepsDueBy(ageInDays(diagnostic.submitted_at));
    const next = due.find((step) => !done.has(step.step));
    if (!next) continue;

    const last = lastSentAt.get(lead.id);
    if (last && Date.now() - last < MIN_HOURS_BETWEEN_SENDS * 3_600_000) {
      throttled += 1;
      continue;
    }

    const resumeUrl = diagnosticServerResumeUrl(diagnostic.request_id);
    if (!resumeUrl) {
      await stopCampaign(supabase, diagnostic, "Private resume link could not be signed");
      stopped += 1;
      continue;
    }

    const result = await sendDiagnosticNurtureStep(
      supabase,
      lead,
      cleanDiagnosticAnswers(diagnostic.answers),
      resumeUrl,
      next,
    );
    if (result === "sent") {
      sent += 1;
      done.add(next.step);
      sentSteps.set(lead.id, done);
      lastSentAt.set(lead.id, Date.now());
      if (next.step === DIAGNOSTIC_EMAIL_STEPS[DIAGNOSTIC_EMAIL_STEPS.length - 1].step) {
        await completeCampaign(supabase, diagnostic);
        completed += 1;
      }
    } else if (result === "already_claimed") {
      alreadyClaimed += 1;
    } else if (result === "failed") {
      failed += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: diagnostics.length,
    sent,
    failed,
    stopped,
    completed,
    throttled,
    already_claimed: alreadyClaimed,
  });
}

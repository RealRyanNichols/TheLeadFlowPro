import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendLeadEmailNotification,
  type LeadEmailNotificationType,
  type NotifiableLead,
} from "@/lib/leadNotify";

const OUTBOX_TABLE = "lead_email_notifications";
const CLAIM_LEASE_MINUTES = 5;
export const LEAD_EMAIL_NOTIFICATION_SAFE_WINDOW_MS = 23 * 60 * 60 * 1000;
const RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 180, 360] as const;

// Attempt one is the synchronous send. Six retries finish inside Resend's
// provider-idempotency window, so an accepted response lost on the network can
// be replayed with the same key without delivering a second email.
export const MAX_LEAD_EMAIL_NOTIFICATION_ATTEMPTS = 7;

type LeadEmailNotificationStatus = "pending" | "sent" | "failed";

type LeadEmailNotificationRow = {
  id: string;
  lead_id: string;
  notification_type: LeadEmailNotificationType;
  lead_snapshot: unknown;
  status: LeadEmailNotificationStatus;
  attempt_count: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type LeadLifecycle = {
  deleted_at: string | null;
  email_unsubscribed_at: string | null;
};

export type LeadEmailNotificationDelivery =
  | "sent"
  | "queued_for_retry"
  | "already_sent"
  | "already_claimed"
  | "permanently_failed";

export type LeadEmailNotificationRetrySummary = {
  checked: number;
  sent: number;
  queued_for_retry: number;
  already_claimed: number;
  permanently_failed: number;
};

export function leadEmailNotificationCronHttpStatus(
  summary: Pick<LeadEmailNotificationRetrySummary, "permanently_failed">,
): 200 | 500 {
  return summary.permanently_failed > 0 ? 500 : 200;
}

export function leadEmailNotificationRetryDelayMinutes(attemptCount: number): number {
  const index = Math.max(0, Math.min(RETRY_DELAYS_MINUTES.length - 1, attemptCount - 1));
  return RETRY_DELAYS_MINUTES[index];
}

export function leadEmailNotificationIdempotencyKey(
  leadId: string,
  notificationType: LeadEmailNotificationType,
): string {
  return `lead-${leadId}-${notificationType}-v1`;
}

export function leadEmailNotificationWindowExpired(
  createdAt: string,
  nowMs = Date.now(),
): boolean {
  const createdAtMs = Date.parse(createdAt);
  return (
    !Number.isFinite(createdAtMs) ||
    nowMs - createdAtMs >= LEAD_EMAIL_NOTIFICATION_SAFE_WINDOW_MS
  );
}

function timeAtOrAfter(...timestamps: Array<string | null | undefined>): number {
  return timestamps.reduce((latest, value) => {
    const parsed = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(parsed) ? Math.max(latest, parsed) : latest;
  }, Date.now());
}

function emptySummary(): LeadEmailNotificationRetrySummary {
  return {
    checked: 0,
    sent: 0,
    queued_for_retry: 0,
    already_claimed: 0,
    permanently_failed: 0,
  };
}

function recordResult(
  summary: LeadEmailNotificationRetrySummary,
  result: LeadEmailNotificationDelivery,
) {
  summary.checked += 1;
  if (result === "sent" || result === "already_sent") summary.sent += 1;
  else if (result === "queued_for_retry") summary.queued_for_retry += 1;
  else if (result === "already_claimed") summary.already_claimed += 1;
  else summary.permanently_failed += 1;
}

async function addActivity(supabase: SupabaseClient, leadId: string, detail: string) {
  const result = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    kind: "system",
    detail: detail.slice(0, 1000),
  });
  if (result.error) console.error("Lead email notification activity failed:", result.error.code);
}

async function claimNotification(
  supabase: SupabaseClient,
  row: LeadEmailNotificationRow,
): Promise<LeadEmailNotificationRow | null> {
  const now = new Date(timeAtOrAfter(row.created_at));
  const claimed = await supabase
    .from(OUTBOX_TABLE)
    .update({
      attempt_count: row.attempt_count + 1,
      last_attempt_at: now.toISOString(),
      next_attempt_at: new Date(now.getTime() + CLAIM_LEASE_MINUTES * 60_000).toISOString(),
      last_error: null,
      updated_at: now.toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .eq("attempt_count", row.attempt_count)
    .lte("next_attempt_at", now.toISOString())
    .select("*")
    .maybeSingle();
  if (claimed.error) throw new Error(`lead email notification claim failed: ${claimed.error.code}`);
  return (claimed.data as LeadEmailNotificationRow | null) ?? null;
}

function optionalString(value: unknown, maxLength: number): string | null {
  return typeof value === "string" ? value.slice(0, maxLength) : null;
}

function leadFromSnapshot(snapshot: unknown): NotifiableLead | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const value = snapshot as Record<string, unknown>;
  if (
    typeof value.full_name !== "string" ||
    typeof value.email !== "string" ||
    typeof value.interest !== "string"
  ) {
    return null;
  }
  return {
    full_name: value.full_name.slice(0, 200),
    email: value.email.slice(0, 200),
    phone: optionalString(value.phone, 50),
    business_name: optionalString(value.business_name, 200),
    interest: value.interest.slice(0, 100),
    goals: optionalString(value.goals, 2000),
    current_platform: optionalString(value.current_platform, 100),
    timeline: optionalString(value.timeline, 100),
    source: optionalString(value.source, 100),
    sms_consent: value.sms_consent === true,
    funnel: optionalString(value.funnel, 100),
  };
}

async function getLeadLifecycle(
  supabase: SupabaseClient,
  leadId: string,
): Promise<LeadLifecycle | null> {
  const result = await supabase
    .from("leads")
    .select("deleted_at,email_unsubscribed_at")
    .eq("id", leadId)
    .maybeSingle();
  if (result.error) throw new Error(`lead email notification lead lookup failed: ${result.error.code}`);
  return (result.data as LeadLifecycle | null) ?? null;
}

async function finishFailure(
  supabase: SupabaseClient,
  claimed: LeadEmailNotificationRow,
  error: string,
  forceTerminal = false,
): Promise<LeadEmailNotificationDelivery> {
  const finishedAtMs = timeAtOrAfter(claimed.created_at, claimed.last_attempt_at);
  const finishedAt = new Date(finishedAtMs).toISOString();
  const terminal = forceTerminal || claimed.attempt_count >= MAX_LEAD_EMAIL_NOTIFICATION_ATTEMPTS;
  const nextAttempt = terminal
    ? finishedAt
    : new Date(
        finishedAtMs + leadEmailNotificationRetryDelayMinutes(claimed.attempt_count) * 60_000,
      ).toISOString();
  const message = error.replace(/\0/g, "").slice(0, 1000) || "Unknown delivery failure";
  const saved = await supabase
    .from(OUTBOX_TABLE)
    .update({
      status: terminal ? "failed" : "pending",
      next_attempt_at: nextAttempt,
      last_error: message,
      updated_at: finishedAt,
    })
    .eq("id", claimed.id)
    .eq("status", "pending")
    .eq("attempt_count", claimed.attempt_count)
    .select("id")
    .maybeSingle();
  if (saved.error || !saved.data) {
    throw new Error(`lead email notification failure log failed: ${saved.error?.code || "stale"}`);
  }

  if (terminal) {
    // Do not try to report a dead email provider through that same provider.
    // Vercel captures this structured server log, while the private outbox row
    // and lead activity retain the detailed error for manual follow-up.
    console.error("Lead email notification permanently failed:", {
      notificationId: claimed.id,
      leadId: claimed.lead_id,
      notificationType: claimed.notification_type,
      attemptCount: claimed.attempt_count,
    });
  }

  if (claimed.attempt_count === 1 || terminal) {
    await addActivity(
      supabase,
      claimed.lead_id,
      terminal
        ? `${claimed.notification_type} email failed after ${claimed.attempt_count} attempt(s). Manual follow-up is required. Last error: ${message}`
        : `${claimed.notification_type} email failed and is queued for automatic retry. Error: ${message}`,
    );
  }
  return terminal ? "permanently_failed" : "queued_for_retry";
}

async function deliverNotification(
  supabase: SupabaseClient,
  row: LeadEmailNotificationRow,
): Promise<LeadEmailNotificationDelivery> {
  if (row.status === "sent") return "already_sent";
  if (row.status === "failed") return "permanently_failed";

  const claimed = await claimNotification(supabase, row);
  if (!claimed) return "already_claimed";

  if (leadEmailNotificationWindowExpired(claimed.created_at)) {
    return finishFailure(
      supabase,
      claimed,
      "Retry window expired before delivery; manual review is required",
      true,
    );
  }

  const lead = leadFromSnapshot(claimed.lead_snapshot);
  if (!lead) return finishFailure(supabase, claimed, "Lead snapshot is invalid", true);
  const lifecycle = await getLeadLifecycle(supabase, claimed.lead_id);
  if (!lifecycle) return finishFailure(supabase, claimed, "Lead record no longer exists", true);
  if (lifecycle.deleted_at) {
    return finishFailure(supabase, claimed, "Lead was deleted before delivery", true);
  }
  if (
    claimed.notification_type === "lead_welcome" &&
    (lifecycle.email_unsubscribed_at || !lead.email || lead.email.includes("@no-email."))
  ) {
    return finishFailure(
      supabase,
      claimed,
      "Welcome email is no longer deliverable or the lead unsubscribed before delivery",
      true,
    );
  }

  const result = await sendLeadEmailNotification(
    lead,
    claimed.notification_type,
    leadEmailNotificationIdempotencyKey(claimed.lead_id, claimed.notification_type),
  );
  if (!result.ok) return finishFailure(supabase, claimed, result.error);

  const finishedAt = new Date(
    timeAtOrAfter(claimed.created_at, claimed.last_attempt_at),
  ).toISOString();
  const saved = await supabase
    .from(OUTBOX_TABLE)
    .update({
      status: "sent",
      sent_at: finishedAt,
      provider_message_id: result.providerMessageId,
      last_error: null,
      next_attempt_at: finishedAt,
      updated_at: finishedAt,
    })
    .eq("id", claimed.id)
    .eq("status", "pending")
    .eq("attempt_count", claimed.attempt_count)
    .select("id")
    .maybeSingle();
  if (saved.error || !saved.data) {
    throw new Error(`lead email notification success log failed: ${saved.error?.code || "stale"}`);
  }

  await addActivity(
    supabase,
    claimed.lead_id,
    `${claimed.notification_type} email delivered on attempt ${claimed.attempt_count}.`,
  );
  return "sent";
}

async function deliverRows(
  supabase: SupabaseClient,
  rows: LeadEmailNotificationRow[],
): Promise<LeadEmailNotificationRetrySummary> {
  const summary = emptySummary();
  for (const row of rows) {
    const result = await deliverNotification(supabase, row);
    recordResult(summary, result);
  }
  return summary;
}

export async function deliverLeadEmailNotificationsForLead(
  supabase: SupabaseClient,
  leadId: string,
): Promise<LeadEmailNotificationRetrySummary> {
  const pending = await supabase
    .from(OUTBOX_TABLE)
    .select("*")
    .eq("lead_id", leadId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (pending.error) throw new Error(`lead email notification query failed: ${pending.error.code}`);
  return deliverRows(supabase, (pending.data ?? []) as LeadEmailNotificationRow[]);
}

export async function retryPendingLeadEmailNotifications(
  supabase: SupabaseClient,
  limit = 50,
): Promise<LeadEmailNotificationRetrySummary> {
  const now = new Date().toISOString();
  const pending = await supabase
    .from(OUTBOX_TABLE)
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, limit)));
  if (pending.error) throw new Error(`lead email notification retry query failed: ${pending.error.code}`);
  return deliverRows(supabase, (pending.data ?? []) as LeadEmailNotificationRow[]);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sendDiagnosticInternalAlert,
  type DiagnosticInternalAlertEvent,
  type DiagnosticInternalAlertInput,
} from "@/lib/businessDiagnosticEmails";

const NOTIFICATION_TABLE = "diagnostic_notifications";
const CLAIM_LEASE_MINUTES = 5;
const RETRY_DELAYS_MINUTES = [5, 15, 60, 180, 360] as const;

export const MAX_DIAGNOSTIC_NOTIFICATION_ATTEMPTS = 6;

type DiagnosticNotificationPayload = Omit<
  DiagnosticInternalAlertInput,
  "eventType" | "idempotencyKey" | "leadId"
>;

type DiagnosticNotificationStatus = "pending" | "sent" | "failed";

type DiagnosticNotificationRow = {
  id: string;
  diagnostic_id: string;
  lead_id: string;
  event_type: DiagnosticInternalAlertEvent;
  status: DiagnosticNotificationStatus;
  payload: DiagnosticNotificationPayload;
  attempt_count: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type DiagnosticNotificationContext = DiagnosticNotificationPayload & {
  diagnosticId: string;
  leadId: string;
};

export type DiagnosticNotificationDelivery =
  | "sent"
  | "queued_for_retry"
  | "already_sent"
  | "already_claimed"
  | "permanently_failed";

export type DiagnosticNotificationRetrySummary = {
  checked: number;
  sent: number;
  queued_for_retry: number;
  already_claimed: number;
  permanently_failed: number;
};

export function diagnosticNotificationRetryDelayMinutes(attemptCount: number): number {
  const index = Math.max(0, Math.min(RETRY_DELAYS_MINUTES.length - 1, attemptCount - 1));
  return RETRY_DELAYS_MINUTES[index];
}

export function diagnosticNotificationIdempotencyKey(
  diagnosticId: string,
  eventType: DiagnosticInternalAlertEvent,
): string {
  return `diagnostic-${diagnosticId}-${eventType}`;
}

function cleanString(value: unknown, max: number, fallback = "-"): string {
  if (typeof value !== "string") return fallback;
  return value.replace(/\0/g, "").trim().slice(0, max) || fallback;
}

function cleanScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/\0/g, "").trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 40);
}

function timeAtOrAfter(...timestamps: Array<string | null | undefined>): number {
  return timestamps.reduce((latest, value) => {
    const parsed = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(parsed) ? Math.max(latest, parsed) : latest;
  }, Date.now());
}

function alertInput(row: DiagnosticNotificationRow): DiagnosticInternalAlertInput {
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  const phone = cleanString(payload.phone, 50, "");
  return {
    eventType: row.event_type,
    idempotencyKey: diagnosticNotificationIdempotencyKey(row.diagnostic_id, row.event_type),
    leadId: row.lead_id,
    fullName: cleanString(payload.fullName, 200),
    businessName: cleanString(payload.businessName, 200),
    email: cleanString(payload.email, 200, "hello@theleadflowpro.com"),
    phone: phone || null,
    sourceChannel: cleanString(payload.sourceChannel, 100, "website"),
    priority: cleanString(payload.priority, 20, "normal"),
    completenessScore: cleanScore(payload.completenessScore),
    opportunityScore: cleanScore(payload.opportunityScore),
    summary: cleanString(payload.summary, 4_000, "No summary provided."),
    tags: cleanTags(payload.tags),
  };
}

function fallbackTaskTitle(eventType: DiagnosticInternalAlertEvent): string {
  return eventType === "submitted"
    ? "URGENT: Submitted diagnostic email alert failed"
    : "URGENT: Draft diagnostic email alert failed";
}

async function addActivity(supabase: SupabaseClient, leadId: string, detail: string) {
  const result = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    kind: "system",
    detail: detail.slice(0, 1000),
  });
  if (result.error) console.error("Diagnostic notification activity failed:", result.error.code);
}

async function ensureFallbackTask(
  supabase: SupabaseClient,
  leadId: string,
  eventType: DiagnosticInternalAlertEvent,
) {
  const title = fallbackTaskTitle(eventType);
  const existing = await supabase
    .from("lead_tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", title)
    .is("completed_at", null)
    .limit(1)
    .maybeSingle();
  if (existing.error) {
    console.error("Diagnostic notification fallback task lookup failed:", existing.error.code);
    return;
  }
  if (existing.data) return;

  const insert = await supabase.from("lead_tasks").insert({
    lead_id: leadId,
    title,
    due_date: new Date().toISOString().slice(0, 10),
    priority: "high",
    task_type: "email",
  });
  if (insert.error) console.error("Diagnostic notification fallback task failed:", insert.error.code);
}

async function completeFallbackTask(
  supabase: SupabaseClient,
  leadId: string,
  eventType: DiagnosticInternalAlertEvent,
  completedAt: string,
) {
  const result = await supabase
    .from("lead_tasks")
    .update({ completed_at: completedAt })
    .eq("lead_id", leadId)
    .eq("title", fallbackTaskTitle(eventType))
    .is("completed_at", null);
  if (result.error) console.error("Diagnostic notification fallback completion failed:", result.error.code);
}

async function claimNotification(
  supabase: SupabaseClient,
  row: DiagnosticNotificationRow,
): Promise<DiagnosticNotificationRow | null> {
  const now = new Date(timeAtOrAfter(row.created_at));
  const claimed = await supabase
    .from(NOTIFICATION_TABLE)
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
  if (claimed.error) throw new Error(`diagnostic notification claim failed: ${claimed.error.code}`);
  return (claimed.data as DiagnosticNotificationRow | null) ?? null;
}

async function deliverNotification(
  supabase: SupabaseClient,
  row: DiagnosticNotificationRow,
): Promise<DiagnosticNotificationDelivery> {
  if (row.status === "sent") return "already_sent";
  if (row.status === "failed") return "permanently_failed";

  const claimed = await claimNotification(supabase, row);
  if (!claimed) return "already_claimed";

  const result = await sendDiagnosticInternalAlert(alertInput(claimed));
  const finishedAtMs = timeAtOrAfter(claimed.created_at, claimed.last_attempt_at);
  const finishedAt = new Date(finishedAtMs).toISOString();
  if (result.ok) {
    const saved = await supabase
      .from(NOTIFICATION_TABLE)
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
      throw new Error(`diagnostic notification success log failed: ${saved.error?.code || "stale"}`);
    }
    await completeFallbackTask(supabase, claimed.lead_id, claimed.event_type, finishedAt);
    await addActivity(
      supabase,
      claimed.lead_id,
      `${claimed.event_type === "submitted" ? "Submission" : "Draft"} email alert delivered to the LeadFlow Pro inbox on attempt ${claimed.attempt_count}.`,
    );
    return "sent";
  }

  const terminal = claimed.attempt_count >= MAX_DIAGNOSTIC_NOTIFICATION_ATTEMPTS;
  const nextAttempt = terminal
    ? finishedAt
    : new Date(
        finishedAtMs + diagnosticNotificationRetryDelayMinutes(claimed.attempt_count) * 60_000,
      ).toISOString();
  const failed = await supabase
    .from(NOTIFICATION_TABLE)
    .update({
      status: terminal ? "failed" : "pending",
      next_attempt_at: nextAttempt,
      last_error: result.error.slice(0, 1000),
      updated_at: finishedAt,
    })
    .eq("id", claimed.id)
    .eq("status", "pending")
    .eq("attempt_count", claimed.attempt_count)
    .select("id")
    .maybeSingle();
  if (failed.error || !failed.data) {
    throw new Error(`diagnostic notification failure log failed: ${failed.error?.code || "stale"}`);
  }

  await ensureFallbackTask(supabase, claimed.lead_id, claimed.event_type);
  if (claimed.attempt_count === 1 || terminal) {
    await addActivity(
      supabase,
      claimed.lead_id,
      terminal
        ? `Diagnostic ${claimed.event_type} email alert failed after ${claimed.attempt_count} attempts. Manual CRM follow-up is required. Last error: ${result.error}`
        : `Diagnostic ${claimed.event_type} email alert failed and is queued for automatic retry. Error: ${result.error}`,
    );
  }
  return terminal ? "permanently_failed" : "queued_for_retry";
}

async function getOrCreateNotification(
  supabase: SupabaseClient,
  eventType: DiagnosticInternalAlertEvent,
  context: DiagnosticNotificationContext,
): Promise<DiagnosticNotificationRow> {
  const { diagnosticId, leadId, ...payload } = context;
  const inserted = await supabase
    .from(NOTIFICATION_TABLE)
    .insert({
      diagnostic_id: diagnosticId,
      lead_id: leadId,
      event_type: eventType,
      payload,
    })
    .select("*")
    .single();
  if (!inserted.error && inserted.data) return inserted.data as DiagnosticNotificationRow;
  if (inserted.error?.code !== "23505") {
    throw new Error(`diagnostic notification queue failed: ${inserted.error?.code || "unknown"}`);
  }

  const existing = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("diagnostic_id", diagnosticId)
    .eq("event_type", eventType)
    .single();
  if (existing.error || !existing.data) {
    throw new Error(`diagnostic notification lookup failed: ${existing.error?.code || "missing"}`);
  }
  return existing.data as DiagnosticNotificationRow;
}

export async function queueAndDeliverDiagnosticNotification(
  supabase: SupabaseClient,
  eventType: DiagnosticInternalAlertEvent,
  context: DiagnosticNotificationContext,
): Promise<DiagnosticNotificationDelivery> {
  try {
    const notification = await getOrCreateNotification(supabase, eventType, context);
    return await deliverNotification(supabase, notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown notification error";
    await ensureFallbackTask(supabase, context.leadId, eventType);
    await addActivity(
      supabase,
      context.leadId,
      `Diagnostic ${eventType} email alert could not be queued or logged. Manual CRM follow-up is required. Error: ${message}`,
    );
    throw error;
  }
}

export async function retryPendingDiagnosticNotifications(
  supabase: SupabaseClient,
  limit = 50,
): Promise<DiagnosticNotificationRetrySummary> {
  const now = new Date().toISOString();
  const pending = await supabase
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, limit)));
  if (pending.error) throw new Error(`diagnostic notification retry query failed: ${pending.error.code}`);

  const summary: DiagnosticNotificationRetrySummary = {
    checked: 0,
    sent: 0,
    queued_for_retry: 0,
    already_claimed: 0,
    permanently_failed: 0,
  };
  for (const raw of pending.data ?? []) {
    summary.checked += 1;
    const result = await deliverNotification(supabase, raw as DiagnosticNotificationRow);
    if (result === "sent" || result === "already_sent") summary.sent += 1;
    else if (result === "queued_for_retry") summary.queued_for_retry += 1;
    else if (result === "already_claimed") summary.already_claimed += 1;
    else summary.permanently_failed += 1;
  }
  return summary;
}

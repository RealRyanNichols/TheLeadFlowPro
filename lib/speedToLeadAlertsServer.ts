import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendLeadTextDetailed, sendStaffAlertText, type QuoSendResult } from "@/lib/quo";
import { sendOwnerAlertEmail } from "@/lib/leadNotify";
import { BUSINESS } from "@/lib/site/business";
import { nextSendWindowOpen } from "@/lib/smsPolicy";
import {
  SPEED_TO_LEAD_CLAIM_LEASE_MINUTES,
  SPEED_TO_LEAD_LEAD_COLUMNS,
  SPEED_TO_LEAD_MAX_ATTEMPTS,
  SPEED_TO_LEAD_SWEEP_LIMIT,
  channelNoun,
  decideSpeedToLeadJob,
  leadFirstText,
  outcomeForQuoRefusal,
  parseStaffPhones,
  smsKillSwitchOn,
  speedToLeadActivityDetail,
  speedToLeadEnabled,
  speedToLeadRetryDelayMinutes,
  staffAlertEmail,
  staffAlertText,
  staffEmailIdempotencyKey,
  staffPhoneE164,
  type SpeedToLeadJob,
  type SpeedToLeadLead,
} from "@/lib/speedToLeadAlerts";

// Speed to lead: the half that talks to the database and the providers.
// The rules and the words are in lib/speedToLeadAlerts.ts.
//
// Two callers, one path:
//   - the intake routes call dispatchSpeedToLeadWithBudget right after a lead
//     is inserted, so the alerts and the first text go out in seconds;
//   - /api/cron/speed-to-lead calls sweepSpeedToLeadJobs every minute, which
//     picks up every other insert path, retries, and texts held overnight.
//
// Every job is claimed with one conditional UPDATE (pending -> sending, on
// the attempt count it was read with) before anything is sent, so the route
// and the cron can never both send the same job. A job stuck in "sending"
// for five minutes is taken to have crashed and is claimed again. Every
// outcome is written to the job row; a send and a final failure also write
// one lead_activity line. Message bodies are never logged to the console.

const JOBS = "speed_to_lead_jobs";
const FIRST_TEXT_AUTHOR = "Ryan Nichols (automatic first text)";
// The question every first text asks; finding it on the lead's thread means
// the text already went (the Quo webhook echo, or our own row).
const FIRST_TEXT_THREAD_MARKER = "Quick question so I call you ready";
const SWEEP_CONCURRENCY = 5;

type Env = Record<string, string | undefined>;

export type SpeedToLeadOutcome =
  | "sent"
  | "skipped"
  | "held"
  | "retry"
  | "failed"
  | "already_claimed"
  | "staff_number";

export type SpeedToLeadSummary = {
  enabled: boolean;
  checked: number;
  sent: number;
  skipped: number;
  held: number;
  retry: number;
  failed: number;
  already_claimed: number;
  staff_number: number;
  errors: number;
};

export type SpeedToLeadRunOptions = {
  /** Test seam: the clock the rules use. Providers keep their own. */
  now?: () => Date;
  env?: Env;
};

type Context = {
  supabase: SupabaseClient;
  now: () => Date;
  env: Env;
  staffPhones: string[];
  siteUrl: string;
  leads: Map<string, Promise<SpeedToLeadLead | null>>;
};

function makeContext(supabase: SupabaseClient, options: SpeedToLeadRunOptions): Context {
  const env = options.env ?? process.env;
  return {
    supabase,
    now: options.now ?? (() => new Date()),
    env,
    staffPhones: parseStaffPhones(env.SPEED_TO_LEAD_STAFF_PHONES),
    siteUrl: BUSINESS.siteUrl,
    leads: new Map(),
  };
}

function emptySummary(enabled: boolean): SpeedToLeadSummary {
  return { enabled, checked: 0, sent: 0, skipped: 0, held: 0, retry: 0, failed: 0, already_claimed: 0, staff_number: 0, errors: 0 };
}

function errorText(error: unknown): string {
  return (error instanceof Error ? error.message : String(error ?? "unknown error")).replace(/\0/g, "").slice(0, 1000) || "unknown error";
}

function dbCode(error: { code?: string; message?: string } | null | undefined): string {
  return error?.code || error?.message || "stale";
}

// ------------------------------------------------------------------ claim ---

async function claimJob(ctx: Context, job: SpeedToLeadJob, now: Date): Promise<SpeedToLeadJob | null> {
  // A job the trigger just wrote is due at the database's now(); allow for
  // the app clock trailing it by a hair so the immediate dispatch is not left
  // to the cron. A rescheduled job (retry, quiet hours) gets no such slack.
  const nextAt = Date.parse(job.next_attempt_at);
  const fresh = Number.isFinite(nextAt) && nextAt <= Date.parse(job.created_at) + 1_000;
  const claimAt = new Date(fresh ? Math.max(now.getTime(), nextAt) : now.getTime()).toISOString();
  const nowIso = now.toISOString();

  let query = ctx.supabase
    .from(JOBS)
    .update({
      status: "sending",
      attempt_count: job.attempt_count + 1,
      last_attempt_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", job.id)
    .eq("attempt_count", job.attempt_count);
  if (job.status === "pending") {
    query = query.eq("status", "pending").lte("next_attempt_at", claimAt);
  } else if (job.status === "sending") {
    const leaseCutoff = new Date(now.getTime() - SPEED_TO_LEAD_CLAIM_LEASE_MINUTES * 60_000).toISOString();
    query = query.eq("status", "sending").lt("last_attempt_at", leaseCutoff);
  } else {
    return null;
  }
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw new Error(`speed to lead claim failed: ${dbCode(error)}`);
  return (data as SpeedToLeadJob | null) ?? null;
}

// ---------------------------------------------------------------- finish ---

/** Every finish is a compare-and-swap on the claim, so a stale worker cannot overwrite a newer outcome. */
async function finishClaim(ctx: Context, claimed: SpeedToLeadJob, values: Record<string, unknown>): Promise<void> {
  const { data, error } = await ctx.supabase
    .from(JOBS)
    .update(values)
    .eq("id", claimed.id)
    .eq("status", "sending")
    .eq("attempt_count", claimed.attempt_count)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error(`speed to lead job update failed: ${dbCode(error)}`);
}

/** Never throws: it runs after messages have gone out. */
async function addActivity(ctx: Context, leadId: string, detail: string): Promise<void> {
  try {
    const { error } = await ctx.supabase.from("lead_activity").insert({ lead_id: leadId, kind: "system", detail: detail.slice(0, 1000) });
    if (error) console.error("Speed to lead activity write failed:", dbCode(error));
  } catch (error) {
    console.error("Speed to lead activity write failed:", errorText(error));
  }
}

async function finishSkip(ctx: Context, claimed: SpeedToLeadJob, reason: string, now: Date): Promise<SpeedToLeadOutcome> {
  const at = now.toISOString();
  await finishClaim(ctx, claimed, {
    status: "skipped",
    skip_reason: reason.slice(0, 300),
    // Deciding not to send is not an attempt.
    attempt_count: Math.max(0, claimed.attempt_count - 1),
    last_error: null,
    next_attempt_at: at,
    updated_at: at,
  });
  return "skipped";
}

async function finishHold(ctx: Context, claimed: SpeedToLeadJob, until: Date, now: Date): Promise<SpeedToLeadOutcome> {
  await finishClaim(ctx, claimed, {
    status: "pending",
    attempt_count: Math.max(0, claimed.attempt_count - 1),
    next_attempt_at: until.toISOString(),
    last_error: null,
    updated_at: now.toISOString(),
  });
  return "held";
}

async function finishSent(
  ctx: Context,
  claimed: SpeedToLeadJob,
  providerIds: string[],
  now: Date,
  note: string | null = null,
): Promise<SpeedToLeadOutcome> {
  const at = now.toISOString();
  const values = {
    status: "sent",
    sent_at: at,
    provider_message_ids: providerIds.map((id) => id.slice(0, 200)).slice(0, 20),
    last_error: note ? note.slice(0, 1000) : null,
    skip_reason: null,
    next_attempt_at: at,
    updated_at: at,
  };
  // The message is out. A failed bookkeeping write must never turn into a
  // retry (that would send it twice), so try the write a few times and then
  // say so loudly; the reclaimed job finds the first text on the thread.
  let lastError: unknown = null;
  for (let i = 0; i < 3; i += 1) {
    try {
      await finishClaim(ctx, claimed, values);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    console.error("Speed to lead: sent but the job row could not be marked sent", {
      jobId: claimed.id,
      leadId: claimed.lead_id,
      channel: claimed.channel,
      error: errorText(lastError),
    });
  }
  await addActivity(ctx, claimed.lead_id, speedToLeadActivityDetail(claimed.channel, "sent"));
  return "sent";
}

async function finishFailure(ctx: Context, claimed: SpeedToLeadJob, error: string, now: Date): Promise<SpeedToLeadOutcome> {
  const terminal = claimed.attempt_count >= SPEED_TO_LEAD_MAX_ATTEMPTS;
  const message = error.replace(/\0/g, "").slice(0, 1000) || "unknown error";
  const at = now.toISOString();
  await finishClaim(ctx, claimed, {
    status: terminal ? "failed" : "pending",
    next_attempt_at: terminal ? at : new Date(now.getTime() + speedToLeadRetryDelayMinutes(claimed.attempt_count) * 60_000).toISOString(),
    last_error: message,
    updated_at: at,
  });
  if (terminal) {
    console.error("Speed to lead job permanently failed", {
      jobId: claimed.id,
      leadId: claimed.lead_id,
      channel: claimed.channel,
      attempts: claimed.attempt_count,
    });
    await addActivity(ctx, claimed.lead_id, speedToLeadActivityDetail(claimed.channel, "failed", message));
    return "failed";
  }
  return "retry";
}

// ----------------------------------------------------------------- reads ---

function loadLead(ctx: Context, leadId: string): Promise<SpeedToLeadLead | null> {
  let pending = ctx.leads.get(leadId);
  if (!pending) {
    pending = (async () => {
      const { data, error } = await ctx.supabase.from("leads").select(SPEED_TO_LEAD_LEAD_COLUMNS).eq("id", leadId).maybeSingle();
      if (error) throw new Error(`speed to lead lead lookup failed: ${dbCode(error)}`);
      return (data as SpeedToLeadLead | null) ?? null;
    })();
    ctx.leads.set(leadId, pending);
  }
  return pending;
}

/** What a text-in lead actually wrote: the NEW LEAD email should say it, as the old text-in alert did. */
async function firstInboundMessage(ctx: Context, lead: SpeedToLeadLead): Promise<string | null> {
  if (lead.source !== "quo_inbound" || String(lead.goals ?? "").trim()) return null;
  const { data, error } = await ctx.supabase
    .from("lead_messages")
    .select("body")
    .eq("lead_id", lead.id)
    .eq("direction", "in")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) return null;
  const row = (data as { body?: string }[] | null)?.[0];
  return row?.body ? String(row.body).slice(0, 1000) : null;
}

async function firstTextAlreadyOnThread(ctx: Context, leadId: string): Promise<string | null | false> {
  const { data, error } = await ctx.supabase
    .from("lead_messages")
    .select("id, provider_id")
    .eq("lead_id", leadId)
    .eq("direction", "out")
    .ilike("body", `%${FIRST_TEXT_THREAD_MARKER}%`)
    .limit(1);
  if (error) throw new Error(`speed to lead thread check failed: ${dbCode(error)}`);
  const row = (data as { id: string; provider_id: string | null }[] | null)?.[0];
  if (!row) return false;
  return row.provider_id ?? null;
}

/** The first text on the lead's own thread, so it shows in the CRM even before the Quo echo lands. */
async function recordFirstTextOnThread(ctx: Context, leadId: string, body: string, providerId: string | null): Promise<void> {
  const row = {
    lead_id: leadId,
    direction: "out",
    channel: "sms",
    body,
    author: FIRST_TEXT_AUTHOR,
    delivered: true,
    provider_id: providerId,
  };
  // The Quo webhook echo writes the same provider_id; whichever lands second
  // is dropped by the unique index instead of making a second row. Never
  // throws: the text is already out.
  try {
    const { error } = providerId
      ? await ctx.supabase.from("lead_messages").upsert(row, { onConflict: "provider_id", ignoreDuplicates: true })
      : await ctx.supabase.from("lead_messages").insert(row);
    if (error) console.error("Speed to lead: first text sent but not written to the thread:", dbCode(error));
  } catch (error) {
    console.error("Speed to lead: first text sent but not written to the thread:", errorText(error));
  }
}

// ------------------------------------------------------------------ sends ---

async function sendStaffSms(ctx: Context, claimed: SpeedToLeadJob, lead: SpeedToLeadLead, now: Date): Promise<SpeedToLeadOutcome> {
  const body = staffAlertText(lead, ctx.siteUrl, now);
  const ids: string[] = [];
  const refusals: Extract<QuoSendResult, { ok: false }>[] = [];
  for (const last10 of ctx.staffPhones) {
    const result = await sendStaffAlertText(staffPhoneE164(last10), body);
    if (result.ok) ids.push(result.providerMessageId ?? "accepted");
    else refusals.push(result);
  }
  if (ids.length > 0) {
    const note = refusals.length
      ? `${refusals.length} of ${ctx.staffPhones.length} staff texts not sent: ${refusals.map((r) => r.detail).join("; ")}`
      : null;
    return finishSent(ctx, claimed, ids, now, note);
  }
  const outcomes = refusals.map((r) => outcomeForQuoRefusal(r, "staff_sms"));
  const firstSkip = outcomes.find((o) => o.kind === "skip");
  if (firstSkip && outcomes.every((o) => o.kind === "skip") && firstSkip.kind === "skip") {
    return finishSkip(ctx, claimed, firstSkip.reason, now);
  }
  return finishFailure(ctx, claimed, refusals.map((r) => r.detail).join("; ") || "no staff text accepted", now);
}

async function sendStaffEmail(ctx: Context, claimed: SpeedToLeadJob, lead: SpeedToLeadLead, now: Date): Promise<SpeedToLeadOutcome> {
  const content = staffAlertEmail(lead, ctx.siteUrl, { firstMessage: await firstInboundMessage(ctx, lead) });
  const result = await sendOwnerAlertEmail(content, staffEmailIdempotencyKey(lead.id));
  if (result.ok) return finishSent(ctx, claimed, result.providerMessageId ? [result.providerMessageId] : [], now);
  return finishFailure(ctx, claimed, result.error, now);
}

async function sendLeadSms(ctx: Context, claimed: SpeedToLeadJob, lead: SpeedToLeadLead, now: Date): Promise<SpeedToLeadOutcome> {
  // Exactly one first text per lead. If a crashed attempt already got it out
  // (it is on the thread), record that instead of texting the person again.
  const onThread = await firstTextAlreadyOnThread(ctx, lead.id);
  if (onThread !== false) {
    return finishSent(ctx, claimed, onThread ? [onThread] : [], now, "found on the lead's thread; not sent again");
  }

  const body = leadFirstText(lead);
  const result = await sendLeadTextDetailed(lead.phone as string, body);
  if (result.ok) {
    await recordFirstTextOnThread(ctx, lead.id, body, result.providerMessageId);
    return finishSent(ctx, claimed, result.providerMessageId ? [result.providerMessageId] : [], now);
  }
  const outcome = outcomeForQuoRefusal(result, "lead_sms");
  if (outcome.kind === "skip") return finishSkip(ctx, claimed, outcome.reason, now);
  if (outcome.kind === "hold") {
    const open = nextSendWindowOpen(now);
    const until = open.getTime() > now.getTime() ? open : new Date(now.getTime() + 60_000);
    return finishHold(ctx, claimed, until, now);
  }
  return finishFailure(ctx, claimed, result.detail, now);
}

async function handleStaffNumber(ctx: Context, claimed: SpeedToLeadJob, lead: SpeedToLeadLead, now: Date): Promise<SpeedToLeadOutcome> {
  // The Quo webhook logs our alert texts too, and creates a lead for the
  // number they went to. That number is Ryan's or Pat's: mark the record as
  // a test so it leaves every list, and never alert about it.
  const marked = await ctx.supabase.from("leads").update({ is_test: true }).eq("id", lead.id);
  if (marked.error) throw new Error(`speed to lead staff-number mark failed: ${dbCode(marked.error)}`);
  const at = now.toISOString();
  const { data, error } = await ctx.supabase
    .from(JOBS)
    .update({ status: "skipped", skip_reason: "staff number", last_error: null, next_attempt_at: at, updated_at: at })
    .eq("lead_id", lead.id)
    .in("status", ["pending", "sending"])
    .select("id");
  if (error) throw new Error(`speed to lead staff-number skip failed: ${dbCode(error)}`);
  // Whichever worker actually flipped the rows writes the one activity line.
  if ((data as unknown[] | null)?.length) {
    await addActivity(ctx, lead.id, speedToLeadActivityDetail(claimed.channel, "staff_number"));
  }
  return "staff_number";
}

async function processJob(ctx: Context, job: SpeedToLeadJob): Promise<SpeedToLeadOutcome> {
  const now = ctx.now();
  const claimed = await claimJob(ctx, job, now);
  if (!claimed) return "already_claimed";

  let lead: SpeedToLeadLead | null;
  try {
    lead = await loadLead(ctx, claimed.lead_id);
  } catch (error) {
    return finishFailure(ctx, claimed, errorText(error), now);
  }

  const decision = decideSpeedToLeadJob({
    channel: claimed.channel,
    lead,
    now,
    staffPhones: ctx.staffPhones,
    killSwitchOn: smsKillSwitchOn(ctx.env),
  });
  if (decision.kind === "skip") return finishSkip(ctx, claimed, decision.reason, now);
  if (decision.kind === "hold") return finishHold(ctx, claimed, decision.until, now);
  if (!lead) return finishSkip(ctx, claimed, "lead not found", now);
  if (decision.kind === "staff_number") return handleStaffNumber(ctx, claimed, lead, now);

  // Anything that throws before a provider accepted the message is a failed
  // attempt and is retried; after acceptance the send helpers never throw.
  try {
    if (claimed.channel === "staff_sms") return await sendStaffSms(ctx, claimed, lead, now);
    if (claimed.channel === "staff_email") return await sendStaffEmail(ctx, claimed, lead, now);
    return await sendLeadSms(ctx, claimed, lead, now);
  } catch (error) {
    return finishFailure(ctx, claimed, `${channelNoun(claimed.channel)}: ${errorText(error)}`, now);
  }
}

function record(summary: SpeedToLeadSummary, outcome: SpeedToLeadOutcome) {
  summary.checked += 1;
  summary[outcome] += 1;
}

async function runJobs(ctx: Context, jobs: SpeedToLeadJob[], summary: SpeedToLeadSummary): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      try {
        record(summary, await processJob(ctx, job));
      } catch (error) {
        summary.checked += 1;
        summary.errors += 1;
        console.error("Speed to lead job error", { jobId: job.id, leadId: job.lead_id, channel: job.channel, error: errorText(error) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(SWEEP_CONCURRENCY, jobs.length) }, worker));
}

// ------------------------------------------------------------ public API ---

/** Deliver one lead's due jobs now. The intake routes call this right after the insert. */
export async function dispatchSpeedToLeadForLead(
  supabase: SupabaseClient,
  leadId: string,
  options: SpeedToLeadRunOptions = {},
): Promise<SpeedToLeadSummary> {
  const ctx = makeContext(supabase, options);
  const summary = emptySummary(speedToLeadEnabled(ctx.env));
  // Dormant: the jobs wait, untouched, until the switch is exactly "true".
  if (!summary.enabled) return summary;
  const { data, error } = await supabase.from(JOBS).select("*").eq("lead_id", leadId).in("status", ["pending", "sending"]);
  if (error) throw new Error(`speed to lead job query failed: ${dbCode(error)}`);
  await runJobs(ctx, (data ?? []) as SpeedToLeadJob[], summary);
  return summary;
}

/** The cron: every due job, and every job stuck mid-send past its lease, oldest first. */
export async function sweepSpeedToLeadJobs(
  supabase: SupabaseClient,
  limit: number = SPEED_TO_LEAD_SWEEP_LIMIT,
  options: SpeedToLeadRunOptions = {},
): Promise<SpeedToLeadSummary> {
  const ctx = makeContext(supabase, options);
  const summary = emptySummary(speedToLeadEnabled(ctx.env));
  if (!summary.enabled) return summary;
  const cap = Math.max(1, Math.min(100, Math.floor(limit)));
  const now = ctx.now();
  const leaseCutoff = new Date(now.getTime() - SPEED_TO_LEAD_CLAIM_LEASE_MINUTES * 60_000).toISOString();
  const [stuck, due] = await Promise.all([
    supabase.from(JOBS).select("*").eq("status", "sending").lt("last_attempt_at", leaseCutoff).order("last_attempt_at", { ascending: true }).limit(cap),
    supabase.from(JOBS).select("*").eq("status", "pending").lte("next_attempt_at", now.toISOString()).order("next_attempt_at", { ascending: true }).limit(cap),
  ]);
  if (stuck.error) throw new Error(`speed to lead sweep query failed: ${dbCode(stuck.error)}`);
  if (due.error) throw new Error(`speed to lead sweep query failed: ${dbCode(due.error)}`);
  const jobs = [...((stuck.data ?? []) as SpeedToLeadJob[]), ...((due.data ?? []) as SpeedToLeadJob[])].slice(0, cap);
  await runJobs(ctx, jobs, summary);
  return summary;
}

/** How long an intake request will wait on speed to lead before answering anyway. */
export const SPEED_TO_LEAD_ROUTE_BUDGET_MS = 8_000;

/**
 * The route-side call: never throws, never holds a request past the budget.
 * Anything unfinished when the budget runs out is still on the job rows, and
 * the one-minute sweep finishes it.
 */
export async function dispatchSpeedToLeadWithBudget(
  supabase: SupabaseClient,
  leadId: string,
  budgetMs: number = SPEED_TO_LEAD_ROUTE_BUDGET_MS,
): Promise<void> {
  if (!speedToLeadEnabled(process.env)) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const run = dispatchSpeedToLeadForLead(supabase, leadId).then(
      () => "done" as const,
      (error: unknown) => {
        console.error("Speed to lead dispatch failed; the sweep retries", { leadId, error: errorText(error) });
        return "error" as const;
      },
    );
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), budgetMs);
    });
    const result = await Promise.race([run, timeout]);
    if (result === "timeout") console.warn("Speed to lead dispatch passed its time budget; the sweep finishes it", { leadId });
  } catch (error) {
    console.error("Speed to lead dispatch failed; the sweep retries", { leadId, error: errorText(error) });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

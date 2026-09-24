// Quo (OpenPhone) SMS: instant text-back on new leads. Fails closed — if the
// key is missing or the API errors, the lead flow continues untouched.
//
// IDENTITY, READ THIS BEFORE CHANGING ANYTHING HERE.
//
// Every outbound lead text must read as Ryan Nichols / The LeadFlow Pro from
// (903) 500-8898. It must never read as another member of the workspace or
// another business.
//
// The Quo workspace is shared. It holds two phone numbers: The LeadFlow Pro
// (903) 500-8898 and Premier Dental Academy (903) 913-6444. When you POST to
// /v1/messages WITHOUT a userId, Quo attributes the message to the OWNER of
// the `from` number, not to whoever created the API key. That number was
// owned by the other member, so texts went out with her name and her business
// logo on them even though the body said "this is Ryan with The LeadFlow Pro".
// Number ownership was moved to Ryan Nichols on Aug 11 2026, and QUO_USER_ID
// below pins the attribution in code so a future ownership change in the Quo
// UI cannot silently rename the sender again.
//
// If a text ever shows the wrong name again, hit /api/quo-status?secret=...
// It prints every number, its owner, and every user id in the workspace.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { decideSend } from "@/lib/smsPolicy";

const QUO_API = "https://api.openphone.com/v1/messages";

// The LeadFlow Pro line. Hardcoded fallback on purpose: an unset or wrong env
// var must never silently move outbound lead texts onto another business line.
export const LEADFLOW_FROM = "+19035008898";

/**
 * Resolve the only Quo number this application is allowed to send from.
 *
 * The Quo workspace is shared with Premier Dental Academy. An environment
 * override is therefore a constraint to verify, not a free-form destination.
 * Missing keeps the compiled LeadFlow number; any different value fails
 * closed instead of silently selecting another business line.
 */
export function leadFlowQuoFromNumber(
  configured: string | null | undefined = process.env.QUO_FROM_NUMBER,
): typeof LEADFLOW_FROM | null {
  const candidate = String(configured ?? "").trim();
  if (!candidate) return LEADFLOW_FROM;
  return candidate === LEADFLOW_FROM ? LEADFLOW_FROM : null;
}

/**
 * Pin an optional Quo sender attribution to a separately verified user id.
 * If QUO_USER_ID is used, QUO_LEADFLOW_USER_ID must independently allow the
 * same value. Leaving both blank safely falls back to the verified number's
 * owner; a partial or mismatched configuration blocks the send.
 */
export function leadFlowQuoUserId(
  configured: string | null | undefined = process.env.QUO_USER_ID,
  allowed: string | null | undefined = process.env.QUO_LEADFLOW_USER_ID,
): string | undefined | null {
  const configuredId = String(configured ?? "").trim();
  const allowedId = String(allowed ?? "").trim();
  if (!configuredId && !allowedId) return undefined;
  if (!configuredId || !allowedId || configuredId !== allowedId) return null;
  return configuredId;
}

export type QuoInboundIdentityResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "inbound_not_configured"
        | "not_message_received"
        | "not_incoming"
        | "unapproved_phone_number_id"
        | "unapproved_destination";
    };

function inboundDestinationNumbers(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      const nested = record.phoneNumber ?? record.number ?? record.formattedNumber;
      return typeof nested === "string" ? nested.trim() : "";
    })
    .filter(Boolean);
}

/**
 * Admit only message.received events for the exact LeadFlow Quo resource.
 *
 * Quo's app-webhook payloads use a string `to`; API webhook v4 uses an array.
 * Both include `phoneNumberId`. The PN id is intentionally runtime-only
 * because it must be copied from the verified LeadFlow number in Quo. With no
 * verified id configured, inbound CRM ingestion stays disabled by default.
 */
export function verifyLeadFlowQuoInboundIdentity(input: {
  eventType: unknown;
  direction: unknown;
  phoneNumberId: unknown;
  to: unknown;
  allowedPhoneNumberId: string | null | undefined;
}): QuoInboundIdentityResult {
  const allowedPhoneNumberId = String(input.allowedPhoneNumberId ?? "").trim();
  if (!allowedPhoneNumberId) return { ok: false, reason: "inbound_not_configured" };
  if (input.eventType !== "message.received") {
    return { ok: false, reason: "not_message_received" };
  }
  if (input.direction !== "incoming") return { ok: false, reason: "not_incoming" };
  if (String(input.phoneNumberId ?? "").trim() !== allowedPhoneNumberId) {
    return { ok: false, reason: "unapproved_phone_number_id" };
  }

  const destinations = inboundDestinationNumbers(input.to);
  if (destinations.length !== 1 || destinations[0] !== LEADFLOW_FROM) {
    return { ok: false, reason: "unapproved_destination" };
  }
  return { ok: true };
}

/** Digits to +1XXXXXXXXXX, or null when it cannot be a US mobile number. */
export function toE164(raw: string): string | null {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+1${digits.replace(/^1/, "")}`;
  return e164.length < 12 ? null : e164;
}

export type SendLeadTextOptions = {
  /**
   * A person pressed send in the CRM. Skips the Central-time send window
   * (lib/smsPolicy.ts) because the human made the call. Never skips the
   * STOP list.
   */
  humanInitiated?: boolean;
};

/**
 * Why a text did or did not go. Callers that only need yes or no use
 * sendLeadText; the speed-to-lead dispatcher needs the reason, because a text
 * held for quiet hours waits for the morning while a STOP is final.
 */
export type QuoSendResult =
  | { ok: true; providerMessageId: string | null }
  | {
      ok: false;
      reason:
        | "kill_switch"
        | "from_number_not_allowed"
        | "user_id_not_allowed"
        | "not_configured"
        | "invalid_phone"
        | "suppressed"
        | "quiet_hours"
        | "provider_error";
      detail: string;
    };

/** Outbound application texting is off unless QUO_OUTBOUND_SMS_DISABLED is exactly "false". */
export function quoOutboundDisabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.QUO_OUTBOUND_SMS_DISABLED !== "false";
}

export async function sendLeadText(to: string, content: string, options: SendLeadTextOptions = {}): Promise<boolean> {
  return (await sendLeadTextDetailed(to, content, options)).ok;
}

export async function sendLeadTextDetailed(
  to: string,
  content: string,
  options: SendLeadTextOptions = {},
): Promise<QuoSendResult> {
  // Emergency compliance stop: outbound Quo SMS is disabled by default while
  // delivery failures and consent/automation rules are audited. Lead capture,
  // CRM storage, and internal email alerts continue normally. Re-enabling is
  // deliberate: set QUO_OUTBOUND_SMS_DISABLED=false in the runtime environment.
  if (quoOutboundDisabled()) {
    console.warn("Quo outbound SMS blocked by emergency compliance stop");
    return { ok: false, reason: "kill_switch", detail: "QUO_OUTBOUND_SMS_DISABLED is not \"false\"" };
  }

  const from = leadFlowQuoFromNumber();
  if (!from) {
    console.error("Quo outbound SMS blocked: QUO_FROM_NUMBER is not the LeadFlow line");
    return { ok: false, reason: "from_number_not_allowed", detail: "QUO_FROM_NUMBER is not the LeadFlow line" };
  }

  const userId = leadFlowQuoUserId();
  if (userId === null) {
    console.error("Quo outbound SMS blocked: sender user id is not LeadFlow-allowlisted");
    return { ok: false, reason: "user_id_not_allowed", detail: "QUO_USER_ID is not LeadFlow-allowlisted" };
  }

  const key = process.env.QUO_API_KEY;
  if (!key) return { ok: false, reason: "not_configured", detail: "QUO_API_KEY is not set" };
  const e164 = to ? toE164(to) : null;
  if (!e164) return { ok: false, reason: "invalid_phone", detail: "phone number is not textable" };

  // STOP is global and the send window is for software, not people
  // (lib/smsPolicy.ts). Both sit here, in the one function every
  // application-originated lead text goes through, so no caller can forget them.
  const decision = decideSend({
    now: new Date(),
    suppressed: await smsSuppressedGlobally(e164),
    humanInitiated: Boolean(options.humanInitiated),
  });
  if (!decision.allow) {
    console.warn(`Quo outbound SMS withheld: ${decision.reason}`);
    return {
      ok: false,
      reason: decision.reason,
      detail: decision.reason === "suppressed" ? "number is on the STOP list" : "outside 8 am to 9 pm Central",
    };
  }

  const body: Record<string, unknown> = { content, from, to: [e164] };
  // Omitted rather than sent empty: Quo rejects a blank userId outright, and
  // falling back to the number's owner (now Ryan) is the correct default.
  if (userId) body.userId = userId;

  try {
    const r = await fetch(QUO_API, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await quoResult(r, "Quo send failed:");
  } catch (e) {
    console.error("Quo send error:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "provider_error", detail: `Quo request failed: ${e instanceof Error ? e.message : "unknown error"}`.slice(0, 500) };
  }
}

/**
 * An internal alert to a staff phone (Ryan, Pat) about a new lead. Not a text
 * to a lead, so the Central-time quiet hours do not apply: a lead at 11 pm is
 * worth knowing about at 11 pm. Everything else still does: the emergency
 * kill switch, the LeadFlow from-number and user guards, and the STOP list.
 * Only the speed-to-lead dispatcher calls this.
 */
export async function sendStaffAlertText(to: string, content: string): Promise<QuoSendResult> {
  if (quoOutboundDisabled()) {
    return { ok: false, reason: "kill_switch", detail: "QUO_OUTBOUND_SMS_DISABLED is not \"false\"" };
  }
  const from = leadFlowQuoFromNumber();
  if (!from) {
    console.error("Quo staff alert blocked: QUO_FROM_NUMBER is not the LeadFlow line");
    return { ok: false, reason: "from_number_not_allowed", detail: "QUO_FROM_NUMBER is not the LeadFlow line" };
  }
  const userId = leadFlowQuoUserId();
  if (userId === null) {
    console.error("Quo staff alert blocked: sender user id is not LeadFlow-allowlisted");
    return { ok: false, reason: "user_id_not_allowed", detail: "QUO_USER_ID is not LeadFlow-allowlisted" };
  }
  const key = process.env.QUO_API_KEY;
  if (!key) return { ok: false, reason: "not_configured", detail: "QUO_API_KEY is not set" };
  const e164 = to ? toE164(to) : null;
  if (!e164) return { ok: false, reason: "invalid_phone", detail: "staff phone number is not textable" };
  if (await smsSuppressedGlobally(e164)) {
    return { ok: false, reason: "suppressed", detail: "staff number is on the STOP list" };
  }

  const body: Record<string, unknown> = { content, from, to: [e164] };
  if (userId) body.userId = userId;
  try {
    const r = await fetch(QUO_API, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await quoResult(r, "Quo staff alert failed:");
  } catch (e) {
    console.error("Quo staff alert error:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "provider_error", detail: `Quo request failed: ${e instanceof Error ? e.message : "unknown error"}`.slice(0, 500) };
  }
}

/** Accepted with the provider's message id when it gives one; otherwise the status and a short reason, never the message body. */
async function quoResult(r: Response, logLabel: string): Promise<QuoSendResult> {
  const raw = await r.text().catch(() => "");
  if (!r.ok) {
    console.error(logLabel, r.status, raw.slice(0, 300));
    return { ok: false, reason: "provider_error", detail: `Quo returned HTTP ${r.status}${raw ? `: ${raw.slice(0, 300)}` : ""}` };
  }
  let providerMessageId: string | null = null;
  try {
    const parsed = JSON.parse(raw) as { data?: { id?: unknown }; id?: unknown };
    const id = parsed?.data?.id ?? parsed?.id;
    if (typeof id === "string" && id) providerMessageId = id.slice(0, 200);
  } catch {
    // A 2xx is accepted even without a readable id.
  }
  return { ok: true, providerMessageId };
}

/**
 * Is this number on the STOP list (public.sms_suppressions)? Reads with the
 * service role because the callers run as the application, not as a user.
 * Fails closed: no service key, or a failed read, means the text is withheld.
 * The lead still gets the email and lands on the call sheet.
 */
export async function smsSuppressedGlobally(phone: string): Promise<boolean> {
  const norm = normalizePhoneLast10(phone);
  if (norm.length < 10) return true;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("sms_suppressions lookup skipped: no service key; texting withheld");
    return true;
  }
  try {
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.from("sms_suppressions").select("phone_norm").eq("phone_norm", norm).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return !!data;
  } catch (e) {
    console.error("sms_suppressions lookup failed, texting withheld:", e instanceof Error ? e.message : e);
    return true;
  }
}

// ---------------------------------------------------------------------------
// INBOUND-TRIGGERED AUTO-REPLY
// ---------------------------------------------------------------------------
//
// History: from August 26 Ryan's rule was that nobody gets a text unless they
// texted first. On September 22 he asked for speed to lead: one first text,
// within a minute, to a new lead who ticked the text consent box
// (lib/speedToLeadAlertsServer.ts, dormant until SPEED_TO_LEAD_ENABLED). That path
// goes through sendLeadTextDetailed(), so the kill switch, the STOP list and
// quiet hours all still apply. Anyone without recorded consent is never
// texted first.
//
// That is why this does NOT go through sendLeadText() and is NOT unblocked by
// QUO_OUTBOUND_SMS_DISABLED. The August 21 emergency stop on application
// originated outbound stays exactly where it is. This is a different thing
// with a different switch: a reply to a message a human just sent to our
// number, which is the one case where a text is invited by definition.
//
// It is off until QUO_INBOUND_AUTOREPLY_ENABLED is exactly "true".
//
// Everything that keeps this clean lives in the caller (/api/quo-inbound):
// once per person ever, never after they send STOP, never on our own outbound
// echo. Do not call this from anywhere else.
export async function sendInboundAutoReply(to: string, content: string): Promise<boolean> {
  if (process.env.QUO_INBOUND_AUTOREPLY_ENABLED !== "true") {
    console.warn("Quo inbound auto-reply is switched off");
    return false;
  }

  const from = leadFlowQuoFromNumber();
  if (!from) {
    console.error("Quo auto-reply blocked: QUO_FROM_NUMBER is not the LeadFlow line");
    return false;
  }

  const userId = leadFlowQuoUserId();
  if (userId === null) {
    console.error("Quo auto-reply blocked: sender user id is not LeadFlow-allowlisted");
    return false;
  }

  const key = process.env.QUO_API_KEY;
  if (!key || !to) return false;

  const e164 = toE164(to);
  if (!e164) return false;

  const body: Record<string, unknown> = { content, from, to: [e164] };
  if (userId) body.userId = userId;

  try {
    const r = await fetch(QUO_API, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error("Quo auto-reply failed:", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("Quo auto-reply error:", e);
    return false;
  }
}

/** The one message anybody who texts us first gets back. Once, ever. */
export const INBOUND_AUTO_REPLY =
  "This is Ryan with The LeadFlow Pro. Got your text and I will answer you " +
  "myself. If it is after hours it will be first thing in the morning. " +
  "(903) 500-8898 is my direct line, save it. Reply STOP to opt out.";

// STOP is NOT evaluated here any more. It is decided by
// public.is_sms_stop_word in the database, called from public.log_quo_activity
// before that function creates anything, and the opt-out is recorded in
// public.sms_suppressions so an unknown number that texts STOP is not lost.
//
// The TypeScript copy that used to live here is deleted rather than kept in
// sync, because the two had already drifted: this list carried "opt-out" with
// the hyphen preserved and the SQL one strips non-letters, so "stop-" matched
// in SQL and not here, and "opt-out" matched here and not in SQL. One list, in
// one place, is the only version of this that stays correct.
//
// lib/hq/inbound.ts still has a third, narrower regex for the HQ plugin, which
// runs on the separate hq_* schema. That one is out of scope here and is a
// known divergence, not an oversight.

/** Last 10 digits. Mirrors public.normalize_phone so TS and SQL agree on identity. */
export function normalizePhoneLast10(phone: string): string {
  return String(phone ?? "").replace(/[^\d]/g, "").slice(-10);
}

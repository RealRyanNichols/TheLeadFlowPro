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

export async function sendLeadText(to: string, content: string): Promise<boolean> {
  // Emergency compliance stop: outbound Quo SMS is disabled by default while
  // delivery failures and consent/automation rules are audited. Lead capture,
  // CRM storage, and internal email alerts continue normally. Re-enabling is
  // deliberate: set QUO_OUTBOUND_SMS_DISABLED=false in the runtime environment.
  const outboundDisabled = process.env.QUO_OUTBOUND_SMS_DISABLED !== "false";
  if (outboundDisabled) {
    console.warn("Quo outbound SMS blocked by emergency compliance stop");
    return false;
  }

  const from = leadFlowQuoFromNumber();
  if (!from) {
    console.error("Quo outbound SMS blocked: QUO_FROM_NUMBER is not the LeadFlow line");
    return false;
  }

  const userId = leadFlowQuoUserId();
  if (userId === null) {
    console.error("Quo outbound SMS blocked: sender user id is not LeadFlow-allowlisted");
    return false;
  }

  const key = process.env.QUO_API_KEY;
  if (!key || !to) return false;
  const e164 = toE164(to);
  if (!e164) return false;

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
    if (!r.ok) console.error("Quo send failed:", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("Quo send error:", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// INBOUND-TRIGGERED AUTO-REPLY
// ---------------------------------------------------------------------------
//
// Ryan's rule, and it is a good one: nobody gets a text from us unless they
// texted us first. No cold outbound, no "you filled in a form so now you get a
// text." They start the conversation or there is no conversation.
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

/** Carrier standard opt-out words. Case and punctuation insensitive. */
const STOP_WORDS = new Set([
  "stop",
  "stopall",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "optout",
  "opt-out",
  "remove",
]);

export function isStopMessage(text: string): boolean {
  const cleaned = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z-]/g, "");
  return STOP_WORDS.has(cleaned);
}

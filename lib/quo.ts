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

  const key = process.env.QUO_API_KEY;
  const from = process.env.QUO_FROM_NUMBER || LEADFLOW_FROM;
  const userId = process.env.QUO_USER_ID; // Ryan's Quo user id (US...)
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

  const key = process.env.QUO_API_KEY;
  const from = process.env.QUO_FROM_NUMBER || LEADFLOW_FROM;
  const userId = process.env.QUO_USER_ID;
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

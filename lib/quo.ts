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
  const digits = to.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+") ? digits : `+1${digits.replace(/^1/, "")}`;
  if (e164.length < 12) return false;

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

/**
 * Thin Twilio SMS wrapper.
 *
 * Degrades gracefully when Twilio isn't configured yet — logs a
 * "would send" line and returns `{ ok: false, skipped: true }` so the
 * missed-call webhook doesn't explode before Ryan provisions a number.
 *
 * Env:
 *   TWILIO_ACCOUNT_SID    ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN     (the live auth token — never the test one)
 *   TWILIO_FROM_NUMBER    +1XXXXXXXXXX  (E.164, must be SMS-capable)
 */

interface SendSmsInput {
  to: string;                   // E.164 destination — webhook gives us this shape already
  body: string;
  statusCallback?: string;      // optional delivery-receipt webhook
}

interface SendSmsResult {
  ok: boolean;
  skipped?: boolean;            // true when creds missing
  sid?: string;
  error?: string;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.warn(
      "[sms] Twilio not configured — would have sent:",
      JSON.stringify({ to: input.to, body: input.body.slice(0, 80) }),
    );
    return { ok: false, skipped: true };
  }

  const to = input.to.startsWith("+") ? input.to : `+${input.to.replace(/\D+/g, "")}`;

  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", from);
  form.set("Body", input.body);
  if (input.statusCallback) form.set("StatusCallback", input.statusCallback);

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[sms] Twilio rejected:", res.status, text.slice(0, 300));
      return { ok: false, error: `Twilio ${res.status}` };
    }

    const json = (await res.json()) as { sid?: string };
    return { ok: true, sid: json.sid };
  } catch (err) {
    console.error("[sms] send failed:", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Shared default — shown in the missed-call settings page as a placeholder
 * AND used as the fallback when a user hasn't customized their template yet.
 */
export const DEFAULT_MISSED_CALL_REPLY =
  "Hey{{first_name}} — sorry I missed you. I just got pulled away for a second. " +
  "What can I help you with? Text me here and I'll get right back to you. — {{business}}";

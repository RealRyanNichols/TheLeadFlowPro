import { publishFacebookPost } from "../meta-publishing";
import type { Connection, Workspace } from "./types";
import { toE164 } from "./phone";

// How a message leaves the building. Texts go out through the business's
// own connected line (OpenPhone, which is what Quo is, or Twilio). Email
// goes out through Resend from a LeadFlow address with the business's name
// on it and their address as reply-to, so a reply lands in their inbox.
// Facebook posts go through the connected Page. Every sender returns a
// result instead of throwing, so a failed send becomes a logged row.

export type SendResult = { ok: boolean; provider: string; providerId?: string | null; error?: string | null };

const TIMEOUT_MS = 12_000;

export const HQ_FROM_EMAIL = "hq@theleadflowpro.com";
export const HQ_ALERT_FROM = "The LeadFlow Pro <hq@theleadflowpro.com>";

function fromNameFor(ws: Workspace): string {
  const name = ws.name.replace(/[<>"\r\n]/g, "").trim() || "Your business";
  return `${name} via The LeadFlow Pro <${HQ_FROM_EMAIL}>`;
}

/* --------------------------------- sms ---------------------------------- */

export async function sendSms(
  connection: Connection,
  secret: string | null,
  to: string,
  body: string,
): Promise<SendResult> {
  const e164 = toE164(to);
  if (!e164) return { ok: false, provider: connection.kind, error: "That phone number is not valid." };
  if (!secret) return { ok: false, provider: connection.kind, error: "The text line is missing its key. Reconnect it in Settings." };
  const from = typeof connection.config.from === "string" ? toE164(connection.config.from) : null;
  if (!from) return { ok: false, provider: connection.kind, error: "The text line has no sending number." };

  try {
    if (connection.kind === "openphone") {
      const r = await fetch("https://api.openphone.com/v1/messages", {
        method: "POST",
        headers: { Authorization: secret, "Content-Type": "application/json" },
        body: JSON.stringify({ content: body, from, to: [e164] }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const raw = await r.text().catch(() => "");
      if (!r.ok) return { ok: false, provider: "openphone", error: `OpenPhone ${r.status}: ${raw.slice(0, 200)}` };
      let id: string | null = null;
      try {
        const j = JSON.parse(raw) as { data?: { id?: string }; id?: string };
        id = j.data?.id ?? j.id ?? null;
      } catch {
        // A 2xx without a body is still sent.
      }
      return { ok: true, provider: "openphone", providerId: id };
    }
    if (connection.kind === "twilio") {
      const sid = typeof connection.config.account_sid === "string" ? connection.config.account_sid : "";
      if (!/^AC[a-zA-Z0-9]{32}$/.test(sid)) return { ok: false, provider: "twilio", error: "The Twilio account SID is missing." };
      const params = new URLSearchParams({ To: e164, From: from, Body: body });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const j = (await r.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!r.ok) return { ok: false, provider: "twilio", error: `Twilio ${r.status}: ${(j.message ?? "").slice(0, 200)}` };
      return { ok: true, provider: "twilio", providerId: j.sid ?? null };
    }
    return { ok: false, provider: connection.kind, error: "That connection does not send texts." };
  } catch (e) {
    return { ok: false, provider: connection.kind, error: `Send failed: ${e instanceof Error ? e.message : "unknown"}`.slice(0, 300) };
  }
}

/** Confirm a text line's key works without sending anything. */
export async function checkSmsConnection(kind: "openphone" | "twilio", secret: string, config: Record<string, unknown>): Promise<{ ok: boolean; error?: string; numbers?: string[] }> {
  try {
    if (kind === "openphone") {
      const r = await fetch("https://api.openphone.com/v1/phone-numbers", { headers: { Authorization: secret }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!r.ok) return { ok: false, error: r.status === 401 ? "OpenPhone did not accept that API key." : `OpenPhone returned ${r.status}.` };
      const j = (await r.json().catch(() => ({}))) as { data?: { number?: string }[] };
      const numbers = (j.data ?? []).map((n) => n.number).filter((n): n is string => typeof n === "string");
      return { ok: true, numbers };
    }
    const sid = typeof config.account_sid === "string" ? config.account_sid : "";
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return { ok: false, error: r.status === 401 ? "Twilio did not accept that SID and token." : `Twilio returned ${r.status}.` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach the provider." };
  }
}

/** The token must actually administer the Page it claims, or the Page is not connected. */
export async function checkFacebookPage(pageId: string, token: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}?fields=id,name`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; name?: string; error?: { message?: string } };
    if (!r.ok || j.id !== pageId) return { ok: false, error: j.error?.message?.slice(0, 200) || "Meta did not accept that token for this Page." };
    // A token that can read the Page is not always one that can post to it.
    const me = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}?fields=id,access_token`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const mj = (await me.json().catch(() => ({}))) as { access_token?: string };
    if (!me.ok || !mj.access_token) return { ok: false, error: "That token can read the Page but cannot post to it. Use a Page access token from a Page admin." };
    return { ok: true, name: j.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Meta." };
  }
}

/* --------------------------------- email -------------------------------- */

type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  reply_to?: string;
  headers?: Record<string, string>;
};

async function resend(payload: EmailPayload, idempotencyKey?: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, provider: "resend", error: "Email sending is not configured on the server." };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await r.text().catch(() => "");
    if (!r.ok) return { ok: false, provider: "resend", error: `Resend ${r.status}: ${raw.slice(0, 200)}` };
    let id: string | null = null;
    try {
      id = (JSON.parse(raw) as { id?: string }).id ?? null;
    } catch {
      // fine
    }
    return { ok: true, provider: "resend", providerId: id };
  } catch (e) {
    return { ok: false, provider: "resend", error: `Email failed: ${e instanceof Error ? e.message : "unknown"}`.slice(0, 300) };
  }
}

/** A message to a lead, from the business. Replies go to the business. */
export async function sendEmailOnBehalf(ws: Workspace, to: string, subject: string, text: string, idempotencyKey?: string): Promise<SendResult> {
  const replyTo = ws.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ws.email) ? ws.email : undefined;
  const footer = `\n\n${ws.name}${ws.phone ? ` | ${ws.phone}` : ""}${ws.website ? ` | ${ws.website}` : ""}\nSent through The LeadFlow Pro on behalf of ${ws.name}.`;
  return resend({ from: fromNameFor(ws), to: [to], subject: subject.slice(0, 200), text: `${text}${footer}`, ...(replyTo ? { reply_to: replyTo } : {}) }, idempotencyKey);
}

/** A message to the owner, from the engine. */
export async function sendOwnerEmail(ws: Workspace, subject: string, text: string, idempotencyKey?: string): Promise<SendResult> {
  const to = ws.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ws.email) ? ws.email : null;
  if (!to) return { ok: false, provider: "resend", error: "The business has no email address on file." };
  return resend(
    {
      from: HQ_ALERT_FROM,
      to: [to],
      subject: subject.slice(0, 200),
      text: `${text}\n\nThe LeadFlow Pro Plugin for ${ws.name}\nSettings: https://www.theleadflowpro.com/hq/settings`,
      reply_to: "hello@theleadflowpro.com",
    },
    idempotencyKey,
  );
}

/* -------------------------------- facebook ------------------------------ */

export async function publishToFacebook(connection: Connection, secret: string | null, message: string): Promise<SendResult> {
  const pageId = typeof connection.config.page_id === "string" ? connection.config.page_id : "";
  if (!pageId || !secret) return { ok: false, provider: "facebook", error: "The Facebook Page is not fully connected." };
  try {
    const result = await publishFacebookPost({ pageId, sourceToken: secret, message, mediaType: "text" });
    return { ok: true, provider: "facebook", providerId: result.permalink ?? result.postId ?? result.objectId ?? null };
  } catch (e) {
    return { ok: false, provider: "facebook", error: (e instanceof Error ? e.message : "Facebook rejected the post.").slice(0, 300) };
  }
}

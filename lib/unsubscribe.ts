// One click unsubscribe links.
//
// Before this file, nothing we sent had an unsubscribe link at all. That was
// fine when the only automated email was a single welcome reply. The moment a
// 30 day sequence starts running it stops being fine, legally and morally, so
// every nurture email now carries a working link that needs no login.
//
// The token is an HMAC of the lead id. It cannot be guessed, it does not
// expire, and it reveals nothing about the person if it leaks: the worst a
// stranger with a token can do is stop emails going to somebody who did not
// ask for that, which is the safe direction for a mistake to fall.

import crypto from "node:crypto";

/**
 * Signing key. UNSUBSCRIBE_SECRET is preferred so the link survives a Supabase
 * key rotation. Falls back to the service role key, which is already required
 * for the cron to send anything at all.
 */
export function unsubscribeSecret(): string | null {
  return (
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

export function signUnsubscribe(leadId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`unsub:${leadId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribe(leadId: string, token: string, secret: string): boolean {
  const expected = signUnsubscribe(leadId, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(leadId: string, secret: string): string {
  return `https://www.theleadflowpro.com/api/unsubscribe?id=${encodeURIComponent(
    leadId,
  )}&t=${signUnsubscribe(leadId, secret)}`;
}

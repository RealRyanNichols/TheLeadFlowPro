import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SELLERPROOF, validPacketId, type Packet } from "./packet";

export const ACCESS_COOKIE = "lfp_sellerproof_access";
export const ACCESS_SECONDS = 60 * 60 * 24 * 365;
export type Access = {
  v: 1;
  packetId: string;
  caseHash: string;
  sessionId: string;
  issued: number;
};
export function accessSecrets(): string[] {
  return [
    process.env.SELLERPROOF_SECRET,
    process.env.PRO_TOOLS_SECRET,
    process.env.UNSUBSCRIBE_SECRET,
  ]
    .map((x) => x?.trim() || "")
    .filter(Boolean);
}
// Only this opaque digest goes to Stripe. No merchant evidence, name, or order reference.
export function caseHash(p: Packet): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        p.platform,
        p.orderId.trim(),
        p.disputeId.trim(),
        Number(p.amount).toFixed(2),
        p.currency,
      ]),
    )
    .digest("hex");
}
export function signAccess(access: Access, secret: string): string {
  const body = Buffer.from(JSON.stringify(access)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(`sellerproof:v1:${body}`).digest("base64url")}`;
}
export function verifyAccess(
  token: unknown,
  secrets: string[],
  now = Math.floor(Date.now() / 1000),
): Access | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra) return null;
  const received = Buffer.from(sig, "base64url");
  if (
    !secrets.some((s) => {
      const expected = createHmac("sha256", s)
        .update(`sellerproof:v1:${body}`)
        .digest();
      return (
        expected.length === received.length &&
        timingSafeEqual(expected, received)
      );
    })
  )
    return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      p.v !== 1 ||
      !validPacketId(p.packetId) ||
      typeof p.caseHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(p.caseHash) ||
      !validSessionId(p.sessionId) ||
      !Number.isInteger(p.issued) ||
      p.issued > now + 60 ||
      now - p.issued > ACCESS_SECONDS
    )
      return null;
    return p as Access;
  } catch {
    return null;
  }
}
export function validSessionId(s: unknown): s is string {
  return (
    typeof s === "string" && /^cs_(?:test|live)_[a-zA-Z0-9]{10,220}$/.test(s)
  );
}
export type CheckoutSession = {
  id?: string;
  created?: number;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  livemode?: boolean;
  metadata?: Record<string, string>;
  payment_intent?: {
    latest_charge?: {
      refunded?: boolean;
      amount_refunded?: number;
      disputed?: boolean;
    } | null;
  } | null;
};
export function accessFromSession(
  s: CheckoutSession,
  expectedLive: boolean,
  now = Math.floor(Date.now() / 1000),
): Access | null {
  const m = s.metadata;
  const charge = s.payment_intent?.latest_charge;
  if (
    !validSessionId(s.id) ||
    s.mode !== "payment" ||
    s.status !== "complete" ||
    s.payment_status !== "paid" ||
    s.currency !== "usd" ||
    s.amount_total !== SELLERPROOF.priceCents ||
    s.livemode !== expectedLive ||
    m?.kind !== SELLERPROOF.kind ||
    !validPacketId(m.packet_id) ||
    !/^[a-f0-9]{64}$/.test(m.case_hash || "") ||
    !charge ||
    charge.refunded ||
    (charge.amount_refunded ?? 0) > 0 ||
    charge.disputed
  )
    return null;
  return {
    v: 1,
    packetId: m.packet_id,
    caseHash: m.case_hash,
    sessionId: s.id,
    issued: s.created ?? now,
  };
}

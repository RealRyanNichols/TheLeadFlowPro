// Resend webhook events turned into CRM activity, so Ryan sees who opened and
// who clicked on the lead itself (Back Office timeline), not only in Resend.
//
// Resend signs every webhook the Svix way: HMAC SHA-256 over
// "<svix-id>.<svix-timestamp>.<raw body>" with the endpoint's signing secret
// ("whsec_" + base64). The route refuses anything unsigned, badly signed or
// older than five minutes.
//
// What is recorded (lead_activity, kind "email"):
//   email.sent        Resend accepted the request; delivery is still pending
//   email.delivered   the recipient's mail server accepted the email
//   email.opened      the FIRST open of each email (opens repeat; one is enough)
//   email.clicked     every distinct link clicked in each email
//   email.bounced     the bounce; a permanent bounce stops future emails
//   email.complained  the spam report; it stops future emails at once
// Everything else is ignored. A delivery receipt proves mail-server
// acceptance; it does not prove inbox placement or that a person read it.
//
// Each detail ends with "Ref <id>", which the timeline hides
// (lib/leadTimeline.ts ACTIVITY_MARKER_TAIL) and the route uses to skip
// duplicates when Resend retries a delivery.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_MS = 5 * 60 * 1000;

/** True when the Svix headers prove Resend sent this exact body recently. */
export function verifyResendSignature(
  secret: string,
  id: string | null,
  timestamp: string | null,
  signatureHeader: string | null,
  body: string,
  nowMs: number,
): boolean {
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(nowMs - seconds * 1000) > TOLERANCE_MS) return false;
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  if (!key.length) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  for (const part of signatureHeader.split(" ")) {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) continue;
    const given = Buffer.from(value, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}

type Tags = Record<string, string>;

/** Resend sends tags as an object in webhooks and as a list on the send; accept both. */
export function resendTags(raw: unknown): Tags {
  const out: Tags = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object") {
        const { name, value } = item as { name?: unknown; value?: unknown };
        if (typeof name === "string" && typeof value === "string") out[name] = value;
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "string") out[name] = value;
    }
  }
  return out;
}

export type ResendActivity = {
  /** From the lead_id tag when the send carried one. */
  leadId: string | null;
  /** The first recipient, lowercased, for sends without a lead_id tag. */
  email: string | null;
  detail: string;
  /** The hidden "Ref" marker that makes a retried delivery a no op. */
  ref: string;
  /** Stop all future emails to this lead (spam report or permanent bounce). */
  stopEmails: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shortLink(link: string): string {
  try {
    const url = new URL(link);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.hostname.replace(/^www\./, "")}${path}${url.hash}`.slice(0, 120);
  } catch {
    return link.slice(0, 120);
  }
}

function which(tags: Tags): string {
  const parts = [tags.campaign, tags.day ? `day ${tags.day}` : ""].filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

/** The activity row for a Resend event, or null for events that are not recorded. */
export function resendEventActivity(event: unknown): ResendActivity | null {
  if (!event || typeof event !== "object") return null;
  const { type, data } = event as { type?: unknown; data?: unknown };
  if (typeof type !== "string" || !data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const emailId = typeof d.email_id === "string" ? d.email_id : "";
  if (!UUID.test(emailId)) return null;
  const tags = resendTags(d.tags);
  const leadId = tags.lead_id && UUID.test(tags.lead_id) ? tags.lead_id : null;
  const to = Array.isArray(d.to) ? d.to : typeof d.to === "string" ? [d.to] : [];
  const email = typeof to[0] === "string" ? to[0].trim().toLowerCase() : null;
  const subject = typeof d.subject === "string" && d.subject.trim() ? `"${d.subject.trim().slice(0, 160)}"` : "an email";
  const base = { leadId, email };

  switch (type) {
    case "email.sent":
      return {
        ...base,
        detail: `Resend accepted ${subject}${which(tags)} for delivery.`,
        ref: `sent-${emailId}`,
        stopEmails: false,
      };
    case "email.delivered":
      return {
        ...base,
        detail: `Delivered ${subject}${which(tags)} to the recipient's mail server.`,
        ref: `delivered-${emailId}`,
        stopEmails: false,
      };
    case "email.opened":
      return { ...base, detail: `Opened ${subject}${which(tags)}.`, ref: `open-${emailId}`, stopEmails: false };
    case "email.clicked": {
      const click = (d.click ?? {}) as Record<string, unknown>;
      const link = typeof click.link === "string" ? click.link : "";
      if (!link) return null;
      const linkHash = createHash("sha256").update(link).digest("hex").slice(0, 8);
      return {
        ...base,
        detail: `Clicked ${shortLink(link)} in ${subject}${which(tags)}.`,
        ref: `click-${emailId}-${linkHash}`,
        stopEmails: false,
      };
    }
    case "email.bounced": {
      const bounce = (d.bounce ?? {}) as Record<string, unknown>;
      const kind = typeof bounce.type === "string" ? bounce.type : "Unknown";
      const permanent = /permanent|hard/i.test(kind);
      return {
        ...base,
        detail: permanent
          ? `Email bounced for good (${subject}). Emails stopped. Reach them by phone.`
          : `Email bounced, temporary (${subject}). Resend will keep trying.`,
        ref: `bounce-${emailId}`,
        stopEmails: permanent,
      };
    }
    case "email.complained":
      return {
        ...base,
        detail: `Marked ${subject} as spam. Emails stopped for this lead.`,
        ref: `spam-${emailId}`,
        stopEmails: true,
      };
    default:
      return null;
  }
}

/** The stored detail: the readable line plus the hidden reference marker. */
export function activityDetail(activity: ResendActivity): string {
  return `${activity.detail} Ref ${activity.ref}`.slice(0, 1000);
}

/** Stable UUID for the existing primary key: concurrent retries can insert once. */
export function resendActivityId(leadId: string, ref: string): string {
  const bytes = createHash("sha256").update(`resend-activity:${leadId.toLowerCase()}:${ref}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type ResendActivityStore = {
  findLead(activity: ResendActivity): Promise<string | null>;
  suppressEmails(leadId: string): Promise<void>;
  hasLegacyActivity(leadId: string, ref: string): Promise<boolean>;
  insertActivity(row: { id: string; lead_id: string; kind: "email"; detail: string }): Promise<"inserted" | "duplicate">;
};

export type ResendRecordResult =
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: "no lead" }
  | { ok: true; recorded: false; duplicate: true };

/** Throw on storage failures so the provider retries; never acknowledge a lost opt-out. */
export async function recordResendActivity(
  activity: ResendActivity,
  store: ResendActivityStore,
): Promise<ResendRecordResult> {
  const leadId = await store.findLead(activity);
  if (!leadId) return { ok: true, recorded: false, reason: "no lead" };

  // Retry suppression even when an older handler already wrote the activity.
  // Only set an unset opt-out; no open, click or delivery ever restores consent.
  if (activity.stopEmails) await store.suppressEmails(leadId);
  if (await store.hasLegacyActivity(leadId, activity.ref)) {
    return { ok: true, recorded: false, duplicate: true };
  }

  const result = await store.insertActivity({
    id: resendActivityId(leadId, activity.ref),
    lead_id: leadId,
    kind: "email",
    detail: activityDetail(activity),
  });
  return result === "duplicate"
    ? { ok: true, recorded: false, duplicate: true }
    : { ok: true, recorded: true };
}

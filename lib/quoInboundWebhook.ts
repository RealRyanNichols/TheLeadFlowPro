import { timingSafeEqual } from "node:crypto";
// Current Quo and Resend signatures use the same Standard Webhooks scheme.
import { verifyResendSignature as verifyStandardWebhookSignature } from "./resendEvents";

/** Current provider keys require signatures; legacy shared tokens keep their existing mode. */
export function verifyQuoInboundAuthentication(input: {
  secret: string | null | undefined;
  querySecret: string | null;
  headers: Headers;
  body: string;
  nowMs: number;
}): boolean {
  const secret = input.secret ?? "";
  if (!secret) return false;
  if (secret.startsWith("whsec_")) {
    // Never accept the query token as a bypass once a provider key is installed.
    return verifyStandardWebhookSignature(
      secret,
      input.headers.get("webhook-id"),
      input.headers.get("webhook-timestamp"),
      input.headers.get("webhook-signature"),
      input.body,
      input.nowMs,
    );
  }
  const expected = Buffer.from(secret);
  const given = Buffer.from(input.querySecret ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type QuoInboundMessage = {
  eventType: string | null;
  id: string | null;
  direction: string | null;
  phoneNumberId: string | null;
  to: unknown;
  from: string;
  text: string;
  conversationId: string | null;
  createdAt: string | null;
  userId: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Normalize current resource/context and legacy app/v4 envelopes without guessing direction. */
export function quoInboundMessage(payload: unknown): QuoInboundMessage | null {
  const event = record(payload);
  if (!event) return null;
  const data = record(event.data);
  const resource = record(data?.resource);
  const context = record(data?.context);
  if (resource && !context) return null;
  const obj = resource ?? record(data?.object) ?? data ?? event;
  const legacyFrom = record(obj.from)?.phoneNumber ?? obj.from;
  const sender = text(resource ? context?.senderIdentifier : legacyFrom) ?? "";
  // Current identifiers can be internal IDs. Only a real phone can become a lead.
  const from = resource && !/^\+[1-9]\d{7,14}$/.test(sender) ? "" : sender;
  return {
    eventType: text(event.type),
    id: text(obj.id),
    direction: text(obj.direction),
    phoneNumberId: text(resource ? context?.phoneNumberId : obj.phoneNumberId),
    to: resource ? context?.recipientIdentifiers : obj.to,
    from,
    text: (text(obj.text ?? obj.body ?? obj.content) ?? "").trim(),
    conversationId: text(resource ? context?.conversationId : obj.conversationId),
    createdAt: text(obj.createdAt ?? event.createdAt),
    userId: text(resource ? context?.userId : obj.userId),
  };
}

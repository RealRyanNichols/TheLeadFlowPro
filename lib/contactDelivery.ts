import { resendTags } from "./resendEvents";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ContactDeliveryFailure = {
  providerId: string;
  contactId: string | null;
  reason: string;
};
export type ContactDeliveryRow = {
  message_id: string;
  provider_message_id: string | null;
  status: "pending" | "sent" | "failed";
  attempt_count: number;
};
export type ContactDeliveryStore = {
  byProviderId(id: string): Promise<ContactDeliveryRow | null>;
  byContactId(id: string): Promise<ContactDeliveryRow | null>;
  fail(row: ContactDeliveryRow, reason: string): Promise<void>;
};

/** Call only after the existing signed-webhook check. No raw provider details persist. */
export function contactDeliveryFailure(event: unknown): ContactDeliveryFailure | null {
  if (!event || typeof event !== "object") return null;
  const { type, data } = event as { type?: unknown; data?: unknown };
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.email_id !== "string" || !UUID.test(d.email_id)) return null;
  const bounce = d.bounce && typeof d.bounce === "object" ? d.bounce as Record<string, unknown> : {};
  const permanent = typeof bounce.type === "string" && /^(?:permanent|hard)$/i.test(bounce.type.trim());
  if (type !== "email.complained" && !(type === "email.bounced" && permanent)) return null;
  const tags = resendTags(d.tags);
  return {
    providerId: d.email_id,
    contactId: tags.contact_message_id && UUID.test(tags.contact_message_id) ? tags.contact_message_id : null,
    reason: type === "email.complained"
      ? "Owner alert was reported as spam. Inquiry is saved; follow up in the private inbox."
      : "Owner alert permanently bounced. Inquiry is saved; check the destination and follow up in the private inbox.",
  };
}

/** The existing failed status is terminal: retry workers select pending rows only. */
export async function recordContactDeliveryFailure(
  failure: ContactDeliveryFailure,
  store: ContactDeliveryStore,
): Promise<boolean> {
  let row = await store.byProviderId(failure.providerId);
  if (!row && failure.contactId) {
    row = await store.byContactId(failure.contactId);
    // New sends are tagged before provider acceptance. A bounce can arrive
    // before its response ID is saved; mismatched known IDs must never match.
    if (row?.provider_message_id && row.provider_message_id !== failure.providerId) return false;
  }
  if (!row) return false;
  if (row.status === "failed") return true;
  await store.fail(row, failure.reason);
  return true;
}

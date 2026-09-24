// Why a lead has no text button or no email button, in words Ryan can act on.
//
// The call card and the Call Closer's pay-link card only offer a text when
// the lead consented and never replied STOP, and only offer an email for a
// real address. A missing button with no reason reads like a bug, so each one
// comes with the reason instead: the same wording the call sheet already uses
// for texting ("Replied STOP. Call instead.", "No text consent"), and for
// email the two cases that actually happen: nothing on file, or a Facebook
// lead form that did not share one (app/api/meta-leads/route.ts stores a
// placeholder address on the no-email.facebook.lead domain).
//
// Leaf module, safe in a "use client" component: no reads, no sends.

import { hasLeadEmailAddress } from "@/lib/leadMessageAuthor";

/** The placeholder domain the Meta lead importer uses when Facebook shares no email. */
export const FACEBOOK_PLACEHOLDER_EMAIL_DOMAIN = "@no-email.facebook.lead";

/** A short label for the button row, and the same reason as a clause for a sentence. */
export type ContactGap = { label: string; reason: string };

/** Why there is no text button, or null when this lead can be texted. */
export function textGap(lead: { phone: string | null; sms_consent: boolean | null; sms_unsubscribed_at: string | null }): ContactGap | null {
  if (!lead.phone) return { label: "No phone on file", reason: "there is no phone on file" };
  if (lead.sms_unsubscribed_at) return { label: "Replied STOP. Call instead.", reason: "they replied STOP" };
  if (!lead.sms_consent) return { label: "No text consent", reason: "there is no text consent on file" };
  return null;
}

/** Why there is no email button, or null when this lead has a real address. */
export function emailGap(email: string | null | undefined): ContactGap | null {
  const placeholder = typeof email === "string" && email.trim().toLowerCase().endsWith(FACEBOOK_PLACEHOLDER_EMAIL_DOMAIN);
  if (placeholder) return { label: "Facebook did not share an email", reason: "Facebook did not share an email" };
  if (hasLeadEmailAddress(email)) return null;
  return { label: "No email on file", reason: "there is no email on file" };
}

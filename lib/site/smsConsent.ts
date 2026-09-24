// One text message consent disclosure for every public form on the site.
//
// Carrier review for business texting (A2P 10DLC) checks each opt in for: who is
// texting, what the texts are about, how often, that rates may apply, HELP and STOP,
// that consent is not required to buy, and links to the terms and privacy policy.
// Change the wording here and every form changes with it. No dashes in public copy.

export const SMS_CONSENT_DISCLOSURE =
  "Message frequency varies. Message and data rates may apply. Reply HELP for help or STOP to cancel. Consent is not a condition of purchase.";

/** The plain text consent sentence for a form, e.g. smsConsentLabel("this consultation"). */
export function smsConsentLabel(topic = "this request"): string {
  return `If I provided a mobile number, The LeadFlow Pro may call or text me about ${topic}. ${SMS_CONSENT_DISCLOSURE}`;
}

export const SMS_TERMS_HREF = "/terms#sms";
export const PRIVACY_HREF = "/privacy#sms";

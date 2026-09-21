// One-tap texting. Every "call or text" placement on the public site pairs a
// tel: link with an sms: link whose body says where the person was when they
// tapped, so Ryan's phone shows the context before he reads the name. The
// number comes from lib/site/business.ts; nothing here defines a destination.
//
// Leaf module: safe in client components, middleware, and tests.

import { BUSINESS } from "./business";

export const TEXT_BODIES = {
  home_how_it_works: "Hi Ryan, I want the free 30-minute consultation. ",
  home_final: "Hi Ryan, I want the free 30-minute consultation. ",
  consultation_sent: "Hi Ryan, I just sent the consultation form. ",
  header_mobile: "Hi Ryan, question from your website: ",
  footer: "Hi Ryan, question from your website: ",
  services: "Hi Ryan, question about the website work: ",
  longview: "Hi Ryan, I am in East Texas and want the free consultation. ",
} as const;

export type TextPlacement = keyof typeof TEXT_BODIES;

/** sms: link with the placement's opening line prefilled. iOS and Android both read `?&body=`. */
export function smsHref(placement: TextPlacement): string {
  return `${BUSINESS.phone.sms}?&body=${encodeURIComponent(TEXT_BODIES[placement])}`;
}

export const TEXT_LABEL = "Text Ryan";
export const CALL_LABEL = `Call ${BUSINESS.phone.display}`;

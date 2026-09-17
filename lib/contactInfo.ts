// The business phone number, re-exported from the business config so client
// components can import it without dragging the tools and articles catalogs
// into the bundle. Change the number in lib/site/business.ts, nowhere else.
import { BUSINESS } from "@/lib/site/business";

export const PHONE_DISPLAY = BUSINESS.phone.display;
export const PHONE_TEL = BUSINESS.phone.tel;
export const PHONE_SMS = BUSINESS.phone.sms;

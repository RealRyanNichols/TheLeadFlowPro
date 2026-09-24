// Shared shapes for Chase Sheet. Leaf module: types and tiny guards only, safe
// in client components.

import type { Channel, StepRole, Urgency } from "./cadence";
import type { Tone } from "./messages";

export type QuoteStatus = "open" | "won" | "lost" | "archived";

export const QUOTE_STATUSES: QuoteStatus[] = ["open", "won", "lost", "archived"];

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && (QUOTE_STATUSES as string[]).includes(value);
}

export type Quote = {
  id: string;
  customerName: string;
  /** Digits only, with country code, or "" when the owner did not enter one. */
  customerPhone: string;
  customerEmail: string;
  /** What was quoted, in the owner's words. Goes into every message. */
  job: string;
  amountCents: number;
  /** YYYY-MM-DD the quote went out. */
  sentOn: string;
  urgency: Urgency;
  status: QuoteStatus;
  /** Touches completed so far (the step index of the next one). */
  done: number;
  /** YYYY-MM-DD the next touch is due, or null when the sequence has run out. */
  nextOn: string | null;
  /** YYYY-MM-DD of the last touch actually sent. */
  lastTouchOn: string | null;
  notes: string;
  wonOn: string | null;
  lostOn: string | null;
  lostReason: string;
  createdAt: string;
  updatedAt: string;
};

export type TouchOutcome = "sent" | "no_answer" | "replied" | "skipped";

export const TOUCH_OUTCOMES: TouchOutcome[] = ["sent", "no_answer", "replied", "skipped"];

export function isTouchOutcome(value: unknown): value is TouchOutcome {
  return typeof value === "string" && (TOUCH_OUTCOMES as string[]).includes(value);
}

export type Touch = {
  id: string;
  quoteId: string;
  step: number;
  role: StepRole;
  channel: Channel;
  outcome: TouchOutcome;
  note: string;
  /** ISO timestamp. */
  at: string;
};

export type Profile = {
  business: string;
  /** The owner's first name, signs every message. Blank signs with the business. */
  owner: string;
  /** The owner's own number, digits with country code. Only used for the sheet's own display. */
  phone: string;
  tradeId: string;
  tone: Tone;
  /** The honest start window: "the week after next". */
  window: string;
  timezone: string;
};

export const DEFAULT_PROFILE: Profile = {
  business: "",
  owner: "",
  phone: "",
  tradeId: "general",
  tone: "friendly",
  window: "the week after next",
  timezone: "America/Chicago",
};

export type AccountPlan = "monthly" | "lifetime";
export type AccountStatus = "active" | "past_due" | "canceled";

export type Account = {
  email: string;
  plan: AccountPlan;
  status: AccountStatus;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** Unix seconds of the newest Stripe event applied. */
  stripeEventAt: number;
  profile: Profile;
  createdAt: string;
};

/** What the browser is told about the plan. Never the Stripe ids. */
export type AccountView = {
  email: string;
  plan: AccountPlan;
  status: AccountStatus;
  renewsOn: string | null;
  endsOn: string | null;
  canManageBilling: boolean;
};

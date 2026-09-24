// Every email Post Creator sends, as plain Resend payloads.
//
// Pure: no network, no clock, no database. Each payload is built only from
// the purchase, the key, and Stripe ids, never from whether the account was
// new or from what Stripe answered, so a retried webhook rebuilds the exact
// same bytes and the delivery ledger (lib/paymentEmailDelivery.ts) accepts
// the retry instead of parking it for review.
//
// Buyer mail comes from Ryan with replies to the public inbox. Owner mail
// comes from the business and goes to the public inbox.

import { BUSINESS } from "../site/business";
import { POST_CREATOR, aiCapLine } from "./product";
import type { PostCreatorPlan } from "./types";

export type ResendPayload = { from: string; to: string[]; reply_to?: string; subject: string; text: string };

const SITE = BUSINESS.siteUrl;
const APP = `${SITE}${POST_CREATOR.appPath}`;
const PURCHASES = `Purchases: ${SITE}/admin/purchases`;

function toBuyer(email: string, subject: string, lines: string[]): ResendPayload {
  return {
    from: `${BUSINESS.operator} <${BUSINESS.email.hello}>`,
    to: [email],
    reply_to: BUSINESS.email.hello,
    subject,
    text: lines.join("\n"),
  };
}

function toOwner(subject: string, lines: string[]): ResendPayload {
  return {
    from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
    to: [BUSINESS.email.hello],
    subject,
    text: lines.join("\n"),
  };
}

/** The app link that signs a new device in with the email and the key. */
function deviceLink(email: string, key: string): string {
  return `${APP}?email=${encodeURIComponent(email)}&key=${encodeURIComponent(key)}`;
}

/** The receipt: the key, the two links, the plan, and what the buyer does next. */
export function buyerReceipt(input: { email: string; plan: PostCreatorPlan; key: string }): ResendPayload {
  const { email, plan, key } = input;
  const planLine = plan === "monthly"
    ? `${POST_CREATOR.monthlyLabel}. It renews on the same date each month until you cancel from Settings inside Post Creator; it stops at the end of the paid month.`
    : `${POST_CREATOR.lifetimeLabel}. Nothing renews and there is nothing to cancel.`;
  return toBuyer(email, "Your Post Creator key and how to open it", [
    "Post Creator is yours.",
    "",
    "If it did not open after checkout, or you want it on your phone, use the link and key below. Keep this email: it is how you open Post Creator anywhere.",
    "",
    `Your key: ${key}`,
    "",
    `Open Post Creator: ${APP}`,
    `Open it on another device: ${deviceLink(email, key)}`,
    "",
    "A few minutes to set up:",
    "1. Fill in your business profile: name, town, services, and how you talk.",
    "2. Press Next idea until one fits, then tap Write it in my voice.",
    "3. Read the draft, fill in anything in [brackets], copy it, and post it yourself.",
    "",
    `Plan: ${planLine}`,
    aiCapLine(plan),
    AI_PAUSE_LINE,
    AI_OFF_FOR_GOOD_LINE,
    ...(plan === "lifetime"
      ? ["Buying the one payment plan stops any monthly Post Creator plan on this email from renewing, so you are not charged for both."]
      : []),
    "",
    "Nothing is posted for you. You read every draft and you post it yourself.",
    "",
    "If this purchase was not you, reply to this email and we will close it.",
    "",
    BUSINESS.operator,
    BUSINESS.name,
    BUSINESS.phone.display,
  ]);
}

/** When AI writing can pause, in the same terms as /post-creator/terms. */
export const AI_PAUSE_LINE =
  "AI writing can pause: for everyone until midnight Central time if the shared daily budget runs out, for your account until the 1st if it reaches its monthly cost limit, or while a problem with it is being fixed. The idea machine works either way.";
/** The terms' promise: AI writing is never quietly switched off for good. */
export const AI_OFF_FOR_GOOD_LINE =
  "Switching AI writing off for good would count as discontinuing Post Creator, with at least 90 days' notice by email.";

/** The owner's sale alert. */
export function ownerSaleAlert(input: { email: string; plan: PostCreatorPlan; sessionId: string }): ResendPayload {
  const { email, plan, sessionId } = input;
  return toOwner(`💰 POST CREATOR ${plan === "monthly" ? "MONTHLY" : "ONE PAYMENT"}: ${email}`, [
    `Post Creator was purchased (${plan}).`,
    `Buyer: ${email}`,
    `Stripe session: ${sessionId}`,
    "",
    "The key and the app link were emailed to the buyer through the ledger.",
    PURCHASES,
  ]);
}

/** A monthly checkout on an account that already owns the one payment plan. */
export function overlapBuyerNotice(input: { email: string }): ResendPayload {
  return toBuyer(input.email, "About your Post Creator monthly plan", [
    "You already own the one payment Post Creator plan on this email, so we are stopping the monthly plan you just bought so it does not renew. Reply to this email about the charge.",
    "",
    BUSINESS.operator,
    BUSINESS.name,
  ]);
}

export function overlapOwnerAlert(input: { email: string; sessionId: string; subscriptionId: string }): ResendPayload {
  const { email, sessionId, subscriptionId } = input;
  return toOwner(`POST CREATOR OVERLAP: ${email}`, [
    "A monthly checkout landed on an account that already owns the one payment plan.",
    `Buyer: ${email}`,
    `Stripe session: ${sessionId}`,
    `Subscription: ${subscriptionId}`,
    "",
    "The code asked Stripe to stop the new subscription at the end of its first month. Check it in Stripe and refund the first month by hand if the buyer asks.",
    PURCHASES,
  ]);
}

/** A one payment purchase on an account with a monthly plan: the monthly plan was told to stop. */
export function endedMonthlyOwnerAlert(input: { email: string; sessionId: string; subscriptionId: string }): ResendPayload {
  const { email, sessionId, subscriptionId } = input;
  return toOwner(`POST CREATOR ONE PAYMENT OVER MONTHLY: ${email}`, [
    `A one payment purchase landed on an account with a monthly plan. ${STOP_LINE(subscriptionId)} Check it in Stripe.`,
    `Buyer: ${email}`,
    `Stripe session: ${sessionId}`,
    "",
    PURCHASES,
  ]);
}

/** What the code asks Stripe to do with a subscription an account has moved on from. */
const STOP_LINE = (subscriptionId: string) =>
  `The code asked Stripe to stop subscription ${subscriptionId}: at the end of its paid month, or right away if its last renewal had failed, so Stripe stops retrying the card.`;

/** A second monthly checkout on an email whose monthly plan was still running. */
export function replacedMonthlyBuyerNotice(input: { email: string }): ResendPayload {
  return toBuyer(input.email, "About your Post Creator monthly plan", [
    "This email already had a monthly Post Creator plan, so the one you just bought replaces it. We asked Stripe to stop the older plan from renewing, so you are not billed for two plans going forward. Reply to this email about any overlap in charges.",
    "",
    "If you did not make this purchase, reply to this email and we will look into it.",
    "",
    BUSINESS.operator,
    BUSINESS.name,
  ]);
}

export function replacedMonthlyOwnerAlert(input: { email: string; sessionId: string; subscriptionId: string }): ResendPayload {
  const { email, sessionId, subscriptionId } = input;
  return toOwner(`POST CREATOR SECOND MONTHLY: ${email}`, [
    "A monthly checkout landed on an email whose monthly plan was still running. The account now follows the new subscription.",
    STOP_LINE(subscriptionId),
    `Buyer: ${email}`,
    `Stripe session: ${sessionId}`,
    `Older subscription: ${subscriptionId}`,
    "",
    "Check both in Stripe. Refund any overlap by hand if the buyer asks. If the buyer says they did not make this purchase, refund it, cancel the new subscription, keep the older one in Stripe, and point the account back at it (release doc runbook).",
    PURCHASES,
  ]);
}

/** A refund or a dispute closed a monthly plan: its subscription was cancelled in Stripe. */
export function moneyBackOwnerAlert(input: { email: string; subscriptionId: string }): ResendPayload {
  const { email, subscriptionId } = input;
  return toOwner(`POST CREATOR MONTHLY CLOSED: ${email}`, [
    `A refund or a dispute closed the Post Creator monthly plan for ${email}. The code asked Stripe to cancel subscription ${subscriptionId} right away, so it does not renew.`,
    `Subscription: ${subscriptionId}`,
    "",
    "Check it in Stripe. The plan stays closed whatever Stripe sends later; only a dispute won or a new purchase opens it again.",
    PURCHASES,
  ]);
}

/** Stripe ended a monthly plan (customer.subscription.deleted). */
export function subscriptionEndedOwnerAlert(input: { email: string; subscriptionId: string }): ResendPayload {
  const { email, subscriptionId } = input;
  return toOwner(`POST CREATOR ENDED: ${email}`, [
    `The Post Creator monthly plan for ${email} ended in Stripe.`,
    `Subscription: ${subscriptionId}`,
    "",
    "Nothing to do unless you want to reach out.",
    PURCHASES,
  ]);
}

/** "Email me my key" on the restore form. Sent by the restore route, not the webhook. */
export function keyResendEmail(input: { email: string; key: string }): ResendPayload {
  const { email, key } = input;
  return toBuyer(email, "Your Post Creator key", [
    "Here is the key for the Post Creator bought with this email.",
    "",
    `Key: ${key}`,
    `Open on this device: ${deviceLink(email, key)}`,
    "",
    "Use this email and key on any device and Post Creator opens there too. If you did not ask for this, you can ignore it.",
    "",
    BUSINESS.operator,
    BUSINESS.name,
  ]);
}

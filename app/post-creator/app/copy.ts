// The words in the Post Creator buyer app (/post-creator/app): the locked
// screen, the notes a checkout return or a lapsed plan leaves, the usage
// meter, the writer, the profile form, and the account panel.
//
// Every number is read from lib/postCreator/product.ts (the same record the
// write route meters against) or from the allowance the server sent, and
// every date is a Chicago calendar day, the one the database counts in. The
// email address comes from BUSINESS. tests/post-creator-app.test.ts runs all
// of it through the house copy rules.
//
// Pure: no browser calls, safe in server and client components.

import { chicagoParts, monthDayLabel } from "@/lib/postCreator/plan";
import { AI_OFF_LINE, POST_CREATOR } from "@/lib/postCreator/product";
import type { AccountView, Allowance, EntitlementReason } from "@/lib/postCreator/types";
import { BUSINESS } from "@/lib/site/business";

const MAX_PLATFORMS = POST_CREATOR.ai.maxPlatformsPerWrite;

/* ---------------------------------- claim ---------------------------------- */

/** The `?claim=` codes the claim route sends back to the app page. */
export const CLAIM_CODES = ["existing", "used", "expired", "missing", "notfound", "unpaid", "unavailable", "other_account"] as const;
export type ClaimCode = (typeof CLAIM_CODES)[number];

export function isClaimCode(x: unknown): x is ClaimCode {
  return typeof x === "string" && (CLAIM_CODES as readonly string[]).includes(x);
}

export const CLAIM_NOTES: Record<ClaimCode, string> = {
  existing:
    "Payment received. This email already had a Post Creator, so this browser was not signed in automatically and every device was signed out for safety. Open it with the key we just emailed to the address you paid with.",
  used: "This checkout link was already used to open Post Creator. Open it with the key from your email.",
  expired: "This checkout link is more than a day old. Open Post Creator with the key from your email.",
  missing: "That link is missing its checkout details. Open Post Creator with the key from your email.",
  notfound: `We could not find that checkout. If you paid, open Post Creator with the key from your email, or email ${BUSINESS.email.hello}.`,
  // Reloading this page never re-runs the checkout check (only Stripe's
  // return link does), so neither note says to reload: the emailed key is the way in.
  unpaid:
    "That checkout has not finished paying yet. When the payment goes through, we email your key to the address you paid with. Open Post Creator with it below.",
  unavailable:
    "We could not open Post Creator right now. Your payment is safe. Open it below with the key from your receipt email. If the key does not work yet, try again in a few minutes.",
  // The claim route never swaps a browser already signed in to another live
  // account. On the locked screen the key form is right there.
  other_account:
    "Payment received. This browser was already signed in to a different Post Creator account, so it was not switched. To open the one you just bought, use the email you paid with and the key we emailed to it.",
};

/** other_account on the open app: the key form only shows after signing out. */
export const OTHER_ACCOUNT_APP_NOTE =
  "Payment received. This browser is signed in to a different Post Creator account, so it was not switched. To open the one you just bought, sign out on this device in Settings, then open it with the email you paid with and the key we emailed to it.";

/**
 * Claim notes the open app shows. A signed-in buyer who reloads the page
 * checkout sent them to sees "used" or "expired" for a link that already did
 * its job, so those two only show on the locked screen.
 */
export function appClaimNote(claim: ClaimCode | null): string | null {
  if (!claim || claim === "used" || claim === "expired") return null;
  if (claim === "other_account") return OTHER_ACCOUNT_APP_NOTE;
  return CLAIM_NOTES[claim];
}

/* --------------------------------- reasons --------------------------------- */

/** Why the app is locked on this device. Empty means there is nothing to explain. */
export const REASON_NOTES: Record<EntitlementReason, string> = {
  visitor: "",
  no_account: "We could not find a Post Creator for this email. If you just paid, give it a minute and reload.",
  signed_out: "You were signed out on this device. Open it again with your email and key.",
  unconfigured: "Post Creator accounts are not switched on yet. The free idea machine works now.",
  past_due: "Your last payment did not go through, so AI writing is off. Update your card to turn it back on.",
  canceled: "Your plan has ended. The free idea machine still works.",
  ok: "",
};

/* --------------------------------- errors ---------------------------------- */

/**
 * A write whose answer never arrived (a dropped connection, the client
 * timeout, or a gateway error page). The retry reuses the request id, so it
 * cannot count twice. The server keeps no draft text, so a write that had
 * already finished cannot be shown again, and this says so up front.
 */
export const NETWORK_ERROR =
  "The connection dropped before your drafts arrived. Tap Try again: it will not count twice. If the write had already finished, it counts once, but its drafts cannot be shown here again.";

/** Any other call that could not reach the server. */
export const OFFLINE_ERROR = "Could not reach Post Creator. Check your connection and try again.";

/** A server answer with no message of its own. */
export const GENERIC_ERROR = "Something broke on our side. Try again in a minute.";

/* ------------------------------- fixed copy -------------------------------- */

export const APP_COPY = {
  byline: `By ${BUSINESS.name}`,
  locked: {
    title: "Open your Post Creator",
    body: "Use the email you paid with and the key from your receipt. It works on any device.",
    emailLabel: "Email",
    keyLabel: "Key",
    keyPlaceholder: "LFP-XXXX-XXXX-XXXX-XXXX",
    open: "Open Post Creator",
    opening: "Opening...",
    sendKey: "Email me my key",
    sending: "Sending...",
    sent: "If that email bought Post Creator, the key is on its way. Check spam if it is not there in a few minutes.",
    badEmail: "Enter the email you used at checkout.",
    badKey: "That does not look like a key. It reads LFP-XXXX-XXXX-XXXX-XXXX.",
    updateCard: "Update your card",
    /** On a signed-in device whose plan lapsed, the key form folds away under this. */
    otherAccount: "Open a different Post Creator with its email and key",
    notBuyer: "Not a buyer yet?",
    seeAi: "See what AI writing adds.",
    useFree: "Or use the free idea machine.",
  },
  /** A device still signed in to a plan that lapsed: the plan is the page's news, not the key form. */
  lapsed: {
    past_due: {
      title: "Your last payment did not go through",
      body: "AI writing is off until a payment goes through. Update your card to turn it back on. The free idea machine still works.",
    },
    canceled: {
      title: "Your plan has ended",
      body: "AI writing is off on this account. The free idea machine still works.",
    },
  },
  app: {
    title: "Your Post Creator",
    tabsLabel: "Post Creator sections",
    tabs: { ideas: "Ideas", plan: "Plan", saved: "Saved", settings: "Settings" },
    welcome: "You are in. Fill in your business profile in Settings and your first AI write is one tap away.",
    aiOff: AI_OFF_LINE,
    profileNeeded: "Add your business name and trade in Settings so the writer knows who it is writing for.",
    openSettings: "Open Settings",
    meterUnavailable: "Could not load your AI writes right now.",
    /** SavedList shows its paid-mode empty line under this title. */
    savedTitle: "Saved on this device",
  },
  writer: {
    action: "Write it in my voice",
    blocked: {
      aiOff: "AI writing is not switched on right now",
      profile: "Set up your profile to use AI",
      today: "No AI writes left today",
      month: "No AI writes left this month",
      /** Tries count every write and every failed try; these show when failed tries used them up first. */
      triesToday: "No tries left today",
      triesMonth: "No tries left this month",
    },
    heading: "Write it in my voice",
    platformsLegend: `Write for (pick up to ${MAX_PLATFORMS})`,
    platformsHint: `Up to ${MAX_PLATFORMS} at a time.`,
    pickOne: "Pick at least one place to write for.",
    noteLabel: "Anything to add? (optional)",
    notePlaceholder: "Mention the fall tune up special",
    noteHelp: "Only facts you add here or in your profile can appear in the draft.",
    submit: "Write it",
    busy: "Writing in your voice. This can take up to a minute. Keep this screen open.",
    resultTitle: "Your drafts",
    resultNote: "Fill in anything in [brackets] before you post.",
    otherHooks: "Other first lines",
    copy: "Copy",
    photoIdea: "Photo idea:",
    savedNote: "Saved on this device.",
    again: "Try again (uses 1 AI write)",
    retry: "Try again",
  },
  profile: {
    title: "Tell the writer about your business",
    sub: "A few minutes. Only what is true, in your own words. You can change it any time.",
    required: "(required)",
    save: "Save profile",
    saving: "Saving...",
    saved: "Saved. The writer will use this from now on.",
    error: "Could not save right now. Try again.",
  },
  account: {
    title: "Your account",
    manageBilling: "Manage billing",
    openingBilling: "Opening billing...",
    signOut: "Sign out on this device",
    signOutConfirm: "Sign out here? You will need your email and key to open it again.",
    signOutYes: "Sign out",
    signOutNo: "Cancel",
    /** The delete line up to the address, which the panel renders as a mailto link. */
    deleteLead: "To delete your account and profile, email",
    deleteLine: `To delete your account and profile, email ${BUSINESS.email.hello}.`,
  },
} as const;

/** The settings form, field by field, in the order it shows. The limits are PROFILE_LIMITS (lib/postCreator/profile.ts). */
export const PROFILE_FIELD_COPY = {
  businessName: { label: "Business name", help: "As customers know it." },
  town: { label: "Town", help: "Where most of your customers are." },
  trade: { label: "Trade", help: "" },
  tradeLabel: { label: "Your trade, in your words", help: "" },
  services: { label: `Services (up to ${POST_CREATOR.maxServices}, one per line)`, help: "Add the jobs you want more of." },
  difference: { label: "What makes you different", help: "In your words. Only things that are true." },
  facts: {
    label: "Facts the writer may use",
    help: "Things you can back up, like Family owned since 2009 or Licensed in Texas. The writer will not claim anything that is not here or in your note.",
  },
  voice: { label: "How you talk", help: "" },
  wordsToUse: { label: "Words you like to use", help: "" },
  wordsToAvoid: { label: "Words to never use", help: "" },
  audience: { label: "Who you want to reach", help: "" },
  cta: { label: "Preferred call to action", help: "" },
  ctaDetail: {
    label: "Booking link or how to reach you (optional)",
    help: "A booking link or a phone number for the call to action. Email addresses are always left out of drafts.",
  },
  samplePost: { label: "A post you liked (optional)", help: "Paste one of your past posts so the writer can match your voice." },
} as const;

/* -------------------------------- built copy ------------------------------- */

/** A stored instant (or a YYYY-MM-DD day) as the Chicago calendar day it falls on: "October 1". */
export function dayLabel(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return monthDayLabel(iso);
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return monthDayLabel(iso);
  return monthDayLabel(chicagoParts(when).day);
}

/** "{n} of {max}", the counter under a field. */
export function counterLine(n: number, max: number): string {
  return `${n.toLocaleString("en-US")} of ${max.toLocaleString("en-US")}`;
}

/**
 * The tries line, or "" while the writes left are the tighter limit. Tries
 * count every write and every failed try (triesLine in product.ts), so only
 * failed tries can bring them below the writes left. The month is checked
 * first: its tries come back on the 1st, not at midnight.
 */
export function triesLeftLine(a: Allowance): string {
  const month = a.triesLeftThisMonth;
  const today = a.triesLeftToday;
  if (typeof month === "number" && month < a.leftThisMonth) {
    const n = Math.max(0, month);
    return `Failed tries count toward a ceiling: ${n} ${n === 1 ? "try" : "tries"} left this month, back on ${monthDayLabel(a.resetsMonthOn)}.`;
  }
  if (typeof today === "number" && today < a.leftToday) {
    const n = Math.max(0, today);
    return `Failed tries count toward a ceiling: ${n} ${n === 1 ? "try" : "tries"} left today, more at midnight Central time.`;
  }
  return "";
}

/** The usage meter. `\u00b7` is a middle dot. */
export function meterLine(a: Allowance | null): string {
  if (!a) return APP_COPY.app.meterUnavailable;
  const base = `${a.leftThisMonth} of ${a.perMonth} AI writes left this month \u00b7 ${a.leftToday} left today. Resets ${monthDayLabel(a.resetsMonthOn)}.`;
  const tries = triesLeftLine(a);
  return tries ? `${base} ${tries}` : base;
}

/** The running-low banner, or null while there are plenty (or none) left. */
export function lowLine(a: Allowance | null): string | null {
  if (!a || a.leftThisMonth <= 0 || a.leftThisMonth > 10) return null;
  const n = a.leftThisMonth;
  return `Running low: ${n} AI ${n === 1 ? "write" : "writes"} left this month.`;
}

/** The helper under "Write it in my voice". */
export function writeCostLine(a: Allowance | null): string {
  return a ? `Uses 1 of your ${a.leftThisMonth} AI writes` : "Uses 1 AI write";
}

/** The banner for a failed renewal still inside the grace window. */
export function graceLine(graceEndsOn: string): string {
  return `Your last payment did not go through. Update your card by ${dayLabel(graceEndsOn)} to keep AI writing on.`;
}

/**
 * The line under a write that came back for only some of its platforms: which
 * ones, that the write still counted, and how to get the rest. The server
 * words it the same way (lib/postCreator/ai/messages.ts).
 */
export { missingPlatformsLine } from "@/lib/postCreator/ai/messages";

/** How many sentences the claim filter took out of the drafts. */
export function trimmedLine(n: number): string {
  return n === 1
    ? "We removed 1 sentence that made a claim we cannot check."
    : `We removed ${n} sentences that made claims we cannot check.`;
}

/** The plan line in Settings. */
export function planLine(account: AccountView): string {
  if (account.plan === "lifetime") return "Your plan: One payment. Nothing renews.";
  if (account.endsOn) return `Your plan: Monthly. Ends on ${dayLabel(account.endsOn)}.`;
  const base = `Your plan: Monthly, ${POST_CREATOR.monthlyLabel}.`;
  return account.renewsOn ? `${base} Renews on ${dayLabel(account.renewsOn)}.` : base;
}

/**
 * Why "Write it in my voice" cannot run right now, or null when it can. The
 * month is checked before the day: with none left this month there are none
 * left today either, and the month is the true reason. Writes come before
 * tries, since every write is also a try; the tries ceiling only blocks on
 * its own when failed tries used it up.
 */
export function writeBlockedLabel(s: { aiOn: boolean; profileReady: boolean; allowance: Allowance | null }): string | null {
  if (!s.aiOn) return APP_COPY.writer.blocked.aiOff;
  if (!s.profileReady) return APP_COPY.writer.blocked.profile;
  const a = s.allowance;
  if (!a) return null;
  if (a.leftThisMonth <= 0) return APP_COPY.writer.blocked.month;
  if (typeof a.triesLeftThisMonth === "number" && a.triesLeftThisMonth <= 0) return APP_COPY.writer.blocked.triesMonth;
  if (a.leftToday <= 0) return APP_COPY.writer.blocked.today;
  if (typeof a.triesLeftToday === "number" && a.triesLeftToday <= 0) return APP_COPY.writer.blocked.triesToday;
  return null;
}

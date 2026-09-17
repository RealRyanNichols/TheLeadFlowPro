// Plugin onboarding and retention emails, version 1. DRAFTS ONLY.
//
// Not wired to a send path. The engine already sends a plan-started note
// (lib/hq/subscription.ts), trial reminders, and the daily brief. These
// templates are the customer-facing onboarding and the monthly "what's new"
// note for Ryan to approve; once approved they replace or extend those sends
// as a separate change.
//
// TRIGGER        401: hq_workspaces.plan enters trial or active (Stripe webhook).
//                402: three days after 401, if no connector token or API key
//                     exists for the workspace yet (nothing installed).
//                403: the first weekday of each month, to every live workspace.
// ELIGIBILITY    a workspace with an owner email; 402 only while not installed.
// CONSENT        Account and service messages to the subscriber. Not marketing.
// EXCLUSIONS     plan none or canceled; bounced address; owner asked for no
//                product email (settings.briefEmail off also silences 403).
// TEMPLATE       PLUGIN_ONBOARDING_VERSION. Bump on copy change.
// FALLBACK       first name -> "there"; business name -> "your business".
// DELAY / HOURS  401 immediately; 402 and 403 at 9:00 AM in the workspace's
//                own timezone.
// STOP           the workspace installs (402), cancels, or the owner replies.
// IDEMPOTENCY    hq_events.dedupe_key = dedupeKey(workspaceId, step, period).
// DELIVERY       sendOwnerEmail from hq@ with hello@ as reply-to.
// OWNER          Ryan.
// ANALYTICS      hq_events kind "system" with the step in detail.

import { HQ_PLAN } from "@/lib/hq/types";
import { PLUGIN, PLUGIN_CHANGELOG } from "@/lib/pluginDocs";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";

export const PLUGIN_ONBOARDING_VERSION = "plugin-onboarding-v1";

export type PluginEmailContext = {
  first: string;
  businessName: string;
  /** ISO date the trial ends, when on trial. */
  trialEndsAt: string | null;
};

export type PluginEmailStep = {
  step: number;
  key: "welcome" | "quick_start" | "monthly_note";
  subject: (ctx: PluginEmailContext) => string;
  body: (ctx: PluginEmailContext) => string;
};

const SITE = BUSINESS.siteUrl;
const SIGNATURE = ["", "Talk soon,", BUSINESS.operator, BUSINESS.name, BUSINESS.phone.display].join("\n");

function first(ctx: PluginEmailContext): string {
  return String(ctx.first ?? "").trim().split(" ")[0] || "there";
}

function business(ctx: PluginEmailContext): string {
  return String(ctx.businessName ?? "").trim() || "your business";
}

function trialLine(ctx: PluginEmailContext): string {
  if (!ctx.trialEndsAt) return "";
  const date = new Date(ctx.trialEndsAt).toLocaleDateString("en-US", {
    timeZone: BUSINESS.timezone,
    month: "long",
    day: "numeric",
  });
  return `Your free trial runs through ${date}. Cancel any time before then from HQ and you are not charged.`;
}

export const PLUGIN_EMAIL_STEPS: readonly PluginEmailStep[] = [
  {
    step: 401,
    key: "welcome",
    subject: (ctx) => `${first(ctx)}, your ${HQ_PLAN.shortName} is on. Here is the install.`,
    body: (ctx) =>
      [
        `${first(ctx)},`,
        "",
        `${business(ctx)} is live on ${HQ_PLAN.name}. ${trialLine(ctx)}`.trim(),
        "",
        "Three things to do now, in order:",
        "",
        `1. Install the connector where you already work. ChatGPT and Claude take about sixty seconds: ${SITE}/hq/plugin`,
        `2. Point your website form at your lead address so new leads land in the inbox. It is on the Settings page: ${SITE}/hq/settings`,
        `3. Ask the assistant: run my morning brief. If it answers, you are done.`,
        "",
        `The manual is here if you want every step written out: ${SITE}${PLUGIN.docsHref}`,
        "",
        `Stuck anywhere? Reply to this email or text ${BUSINESS.phone.display}. A person answers.`,
        SIGNATURE,
      ].join("\n"),
  },
  {
    step: 402,
    key: "quick_start",
    subject: (ctx) => `${first(ctx)}, one paste and it is working`,
    body: (ctx) =>
      [
        `${first(ctx)},`,
        "",
        `The plugin for ${business(ctx)} is running, but nothing is connected to it yet, so the assistant cannot answer about your leads.`,
        "",
        "The whole install is one address pasted into ChatGPT or Claude:",
        PLUGIN.mcpUrl,
        "",
        "ChatGPT: Settings, then Apps and Connectors, then Add. Paste, save, sign in with this email, approve.",
        "Claude: Settings, then Connectors, then Add custom connector. Paste, save, sign in, approve.",
        "",
        "Then say: who should I call right now?",
        "",
        `If you would rather I do it with you on a five minute call, reply with a time. ${SITE}${PLUGIN.docsHref}#install has every step with pictures.`,
        SIGNATURE,
      ].join("\n"),
  },
  {
    step: 403,
    key: "monthly_note",
    subject: () => `What changed in ${HQ_PLAN.shortName} this month`,
    body: (ctx) => {
      const latest = PLUGIN_CHANGELOG[0];
      return [
        `${first(ctx)},`,
        "",
        `One note a month, and this is it. Here is what changed in the plugin for ${business(ctx)}:`,
        "",
        ...latest.notes.map((note) => `- ${note}`),
        "",
        `Full changelog: ${SITE}${PLUGIN.docsHref}#changelog`,
        "",
        `Something you wish it did? Reply and tell me. The next month's note usually comes from those replies.`,
        "",
        `You are on ${HQ_PLAN.name} at ${usd(HQ_PLAN.priceUsd)} a month. Cancel any time from HQ, then Billing: ${SITE}${PLUGIN.billingHref}`,
        SIGNATURE,
      ].join("\n");
    },
  },
];

export function pluginEmailDedupeKey(workspaceId: string, step: number, period: string): string {
  return `${PLUGIN_ONBOARDING_VERSION}:${workspaceId}:${step}:${period}`;
}

export const PLUGIN_ONBOARDING_SEQUENCE = {
  version: PLUGIN_ONBOARDING_VERSION,
  activated: false,
  owner: BUSINESS.operator,
  from: BUSINESS.email.hq,
  replyTo: BUSINESS.email.hello,
  steps: PLUGIN_EMAIL_STEPS,
} as const;

// The daily call sheet: who Ryan should call today, in order, and why.
//
// Ground truth on 2026-09-20: the site was producing leads (47 Meta lead-ad
// leads in thirty days) and the automation answered nearly all of them by
// email, but 45 of the last 56 leads were still marked "new" with no note,
// no call, and no text from a person. Nothing on the site turns a lead into a
// customer; a conversation does. This module ranks the leads that have not
// had one yet, as a pure function over rows the page and the cron read.
//
// A "touch" is a human action on the record: a note, a call in either
// direction, or an outbound text or email logged on the thread. The
// automation's own welcome email and text-back are deliberately not touches:
// an owner who reads "answered" when the software replied would stop calling.
// An inbound message from the lead is not a touch either; it is the opposite,
// a reply owed, and it goes to the top.
//
// Nothing here writes to the database or contacts anyone.

import { INTEREST_LABELS } from "@/lib/leadNotify";

export type CallSheetLead = {
  id: string;
  created_at: string;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string;
  status: string;
  source: string | null;
  utm_source: string | null;
  best_contact_method: string | null;
  sms_consent: boolean | null;
  is_test: boolean | null;
};

export type CallSheetTouch = {
  lead_id: string;
  at: string;
  kind: "note" | "call" | "message_out" | "message_in";
};

export type CallSheetTier = "reply" | "answer" | "waiting" | "follow_up";

export type CallSheetRow = {
  lead: CallSheetLead;
  tier: CallSheetTier;
  /** One plain sentence: why this row is here and where it sits. */
  reason: string;
  sourceLabel: string;
  interestLabel: string;
  ageHours: number;
  lastTouchAt: string | null;
  href: string;
};

export type CallSheet = {
  generatedAt: string;
  rows: CallSheetRow[];
  counts: Record<CallSheetTier, number>;
  /** Leads read but left off, with the reason, so an empty sheet is explainable. */
  excluded: { id: string; reason: string }[];
};

export const TIER_LABELS: Record<CallSheetTier, { title: string; lead: string }> = {
  reply: { title: "They wrote to you", lead: "A message from the lead is the last thing on the thread. Answer these first." },
  answer: { title: "Answer now", lead: "New in the last three days and nobody has called, texted, or written a note. The software replied; a person has not." },
  waiting: { title: "Still waiting", lead: "Older than three days and still untouched by a person. Newest first, because they are the most likely to pick up." },
  follow_up: { title: "Follow up", lead: "You touched these once, then nothing for five days or more, and the lead is still open." },
};

/** Statuses that mean the conversation is over, one way or the other. */
export const CLOSED_STATUSES = ["won", "lost"] as const;

/** Hours a new lead can sit before "answer now" becomes "still waiting". */
export const ANSWER_WINDOW_HOURS = 72;
/** Days since the last human touch before an open lead comes back as a follow-up. */
export const FOLLOW_UP_AFTER_DAYS = 5;
/** Rows the email carries; the page shows everything. */
export const EMAIL_ROW_LIMIT = 25;

const TIER_ORDER: CallSheetTier[] = ["reply", "answer", "waiting", "follow_up"];

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: "Meta lead ad",
  "facebook-lead-ad": "Meta lead ad",
  facebook_lead_ad: "Meta lead ad",
  website: "Website form",
  quo_inbound: "Texted or called in",
  quo_call: "Called in",
  plugin: "Plugin",
  manual: "Added by hand",
};

export function sourceLabel(lead: Pick<CallSheetLead, "source" | "utm_source">): string {
  const source = (lead.source ?? "").trim();
  if (source && SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  const utm = (lead.utm_source ?? "").trim().toLowerCase();
  if (["facebook", "fb", "meta", "instagram", "ig"].includes(utm)) return "Meta";
  if (utm === "google") return "Google";
  if (source) return source.replace(/[_-]+/g, " ");
  return utm ? `via ${utm}` : "Website";
}

export function interestLabel(interest: string): string {
  return INTEREST_LABELS[interest] ?? interest.replace(/[_-]+/g, " ");
}

function hoursBetween(later: Date, earlier: Date): number {
  return Math.max(0, (later.getTime() - earlier.getTime()) / 3_600_000);
}

export function ageLabel(hours: number): string {
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function displayName(lead: CallSheetLead): string {
  return String(lead.full_name || "").trim() || "Unnamed lead";
}

/**
 * Build the sheet. Touches may be in any order; only the latest per lead per
 * direction matters. `now` is injected so the ranking is testable and so the
 * page and the cron agree on the same instant.
 */
export function buildCallSheet(leads: CallSheetLead[], touches: CallSheetTouch[], now: Date): CallSheet {
  const lastHuman = new Map<string, Date>();
  const lastInbound = new Map<string, Date>();
  for (const t of touches) {
    const at = new Date(t.at);
    if (Number.isNaN(at.getTime())) continue;
    const bucket = t.kind === "message_in" ? lastInbound : lastHuman;
    const prev = bucket.get(t.lead_id);
    if (!prev || at > prev) bucket.set(t.lead_id, at);
  }

  const rows: CallSheetRow[] = [];
  const excluded: CallSheet["excluded"] = [];

  for (const lead of leads) {
    if (lead.is_test) {
      excluded.push({ id: lead.id, reason: "test record" });
      continue;
    }
    if ((CLOSED_STATUSES as readonly string[]).includes(lead.status)) {
      excluded.push({ id: lead.id, reason: `status ${lead.status}` });
      continue;
    }
    if (!lead.phone && !lead.email) {
      excluded.push({ id: lead.id, reason: "no phone and no email" });
      continue;
    }
    const created = new Date(lead.created_at);
    if (Number.isNaN(created.getTime())) {
      excluded.push({ id: lead.id, reason: "bad created_at" });
      continue;
    }

    const human = lastHuman.get(lead.id) ?? null;
    const inbound = lastInbound.get(lead.id) ?? null;
    const ageHours = hoursBetween(now, created);
    const base = {
      lead,
      sourceLabel: sourceLabel(lead),
      interestLabel: interestLabel(lead.interest),
      ageHours,
      lastTouchAt: human ? human.toISOString() : null,
      href: `/admin/leads/${lead.id}`,
    };
    const who = `${displayName(lead)}${lead.business_name ? ` at ${lead.business_name}` : ""}`;

    if (inbound && (!human || inbound > human)) {
      rows.push({
        ...base,
        tier: "reply",
        reason: `${who} sent a message ${ageLabel(hoursBetween(now, inbound))} and nothing has gone back since.`,
      });
      continue;
    }
    if (!human) {
      const tier: CallSheetTier = ageHours <= ANSWER_WINDOW_HOURS ? "answer" : "waiting";
      rows.push({
        ...base,
        tier,
        reason: `${who} came in ${ageLabel(ageHours)} from ${base.sourceLabel} asking about ${base.interestLabel}. No call, text, or note from a person yet.`,
      });
      continue;
    }
    const sinceTouch = hoursBetween(now, human);
    if (sinceTouch >= FOLLOW_UP_AFTER_DAYS * 24) {
      rows.push({
        ...base,
        tier: "follow_up",
        reason: `${who} was last touched ${ageLabel(sinceTouch)} and is still ${lead.status.replace(/_/g, " ")}.`,
      });
      continue;
    }
    excluded.push({ id: lead.id, reason: `touched ${ageLabel(sinceTouch)}` });
  }

  rows.sort((a, b) => {
    const tier = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (tier !== 0) return tier;
    if (a.tier === "follow_up") {
      // Longest since a touch first.
      return (a.lastTouchAt ?? "").localeCompare(b.lastTouchAt ?? "");
    }
    // Newest first: they are most likely to remember filling in the form.
    return b.lead.created_at.localeCompare(a.lead.created_at);
  });

  const counts: Record<CallSheetTier, number> = { reply: 0, answer: 0, waiting: 0, follow_up: 0 };
  for (const r of rows) counts[r.tier] += 1;

  return { generatedAt: now.toISOString(), rows, counts, excluded };
}

/** Group rows by tier in display order, omitting empty tiers. */
export function tiers(sheet: CallSheet): { tier: CallSheetTier; rows: CallSheetRow[] }[] {
  return TIER_ORDER.map((tier) => ({ tier, rows: sheet.rows.filter((r) => r.tier === tier) })).filter((g) => g.rows.length > 0);
}

/**
 * The internal email. Goes only to the owner inbox, never to a lead, and only
 * when the sheet has rows. Names and numbers are the owner's own records,
 * the same ones the owner alert already carries.
 */
export function callSheetEmail(sheet: CallSheet, siteUrl: string): { subject: string; text: string } | null {
  if (sheet.rows.length === 0) return null;
  const parts: string[] = [];
  if (sheet.counts.reply) parts.push(`${sheet.counts.reply} to reply to`);
  if (sheet.counts.answer) parts.push(`${sheet.counts.answer} to answer now`);
  if (sheet.counts.waiting) parts.push(`${sheet.counts.waiting} still waiting`);
  if (sheet.counts.follow_up) parts.push(`${sheet.counts.follow_up} to follow up`);
  const subject = `Call sheet: ${parts.join(", ")}`;

  const lines: string[] = [
    "THE LEADFLOW PRO. TODAY'S CALL SHEET",
    "Straight from your own database. The software has replied to these people; a person has not.",
    "",
  ];
  let printed = 0;
  for (const group of tiers(sheet)) {
    lines.push(TIER_LABELS[group.tier].title.toUpperCase());
    for (const row of group.rows) {
      if (printed >= EMAIL_ROW_LIMIT) break;
      printed += 1;
      const contact = [row.lead.phone, row.lead.email].filter(Boolean).join(" | ");
      lines.push(`  ${printed}. ${displayName(row.lead)}${row.lead.business_name ? ` (${row.lead.business_name})` : ""}`);
      lines.push(`     ${contact}`);
      lines.push(`     ${row.reason}`);
      lines.push(`     ${siteUrl}${row.href}`);
    }
    lines.push("");
  }
  if (sheet.rows.length > printed) lines.push(`...and ${sheet.rows.length - printed} more on the page.`, "");
  lines.push(`The full sheet, with one-tap call and text: ${siteUrl}/admin/call-sheet`);
  lines.push("");
  lines.push("Texts go only to people who ticked the consent box; the sheet marks who did. This email is for you and is not sent to anyone on it.");
  return { subject, text: lines.join("\n") };
}

/** The cron sends nothing unless this is exactly "true". Default off. */
export function callSheetEmailEnabled(env: Record<string, string | undefined>): boolean {
  return env.CALL_SHEET_EMAIL_ENABLED === "true";
}

/** Owner inboxes only: LEADFLOW_NOTIFY_EMAIL, at most five, else the fallback. */
export function callSheetRecipients(env: Record<string, string | undefined>, fallback: string): string[] {
  const configured = (env.LEADFLOW_NOTIFY_EMAIL ?? "").trim();
  const list = configured
    ? configured
        .split(/[;,]/)
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  return list.length ? list : [fallback];
}

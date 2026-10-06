// The pulse: the silent failures the board has to shout about.
//
// Ryan's October 1 and 2 recordings: "the LeadFlow's not even running, over
// a week", "there have been no leads today", "my command is not updated in
// eight days". Each of those was a system going quiet with nobody watching.
// This module turns "when did X last happen" into a line with a clock on it
// and a warning when the gap is longer than the business can afford. Pure:
// rows in, rows out; the page supplies the rows it already loaded.

import { isHumanOutboundText, classifyCall, type CallSheetCallRow, type CallSheetMessageRow } from "@/lib/callSheet";
import { sourceKey, type BoardLead, type BoardPurchase } from "@/lib/commandCenter";

export type PulseRow = {
  key: "lead_any" | "lead_meta" | "lead_site" | "call_had" | "text_in" | "paid";
  label: string;
  /** ISO of the last event, or null when none is in the rows read. */
  at: string | null;
  hoursAgo: number | null;
  /** True when the gap is longer than the threshold for this lane. */
  warn: boolean;
  /** What the gap means and what to check, in one line. */
  note: string;
};

const HOUR_MS = 3_600_000;

function ms(value: string | null | undefined): number {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : NaN;
}

function latest(values: (string | null | undefined)[]): string | null {
  let best = -Infinity;
  for (const value of values) {
    const at = ms(value);
    if (Number.isFinite(at) && at > best) best = at;
  }
  return Number.isFinite(best) ? new Date(best).toISOString() : null;
}

/** Whole hours since `at`, or null. */
export function hoursSince(at: string | null, now: Date): number | null {
  const t = ms(at);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / HOUR_MS));
}

export function agoLabel(hours: number | null): string {
  if (hours === null) return "never in the rows read";
  if (hours < 1) return "under an hour ago";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function pulse(input: {
  leads: readonly BoardLead[];
  calls: readonly CallSheetCallRow[];
  messages: readonly CallSheetMessageRow[];
  purchases: readonly BoardPurchase[];
  now: Date;
  /** True when Meta reports at least one campaign delivering right now; null when Meta was not read. */
  metaCampaignActive: boolean | null;
}): PulseRow[] {
  const { now } = input;
  const leadAny = latest(input.leads.map((l) => l.created_at));
  const leadMeta = latest(input.leads.filter((l) => sourceKey(l) === "meta_lead_ad").map((l) => l.created_at));
  const leadSite = latest(input.leads.filter((l) => sourceKey(l) !== "meta_lead_ad").map((l) => l.created_at));
  const callHad = latest(
    input.calls
      .filter((c) => c.lead_id && c.started_at && (!c.scope_status || c.scope_status === "company") && classifyCall(c.direction, c.outcome) === "call")
      .map((c) => c.started_at),
  );
  const textIn = latest(input.messages.filter((m) => m.direction === "in" && m.channel !== "note").map((m) => m.created_at));
  const textOutHuman = latest(input.messages.filter((m) => m.direction !== "in" && m.delivered !== false && isHumanOutboundText(String(m.body ?? ""))).map((m) => m.created_at));
  const paid = latest(input.purchases.filter((p) => ["paid", "complete", "completed", "succeeded"].includes(String(p.status ?? "").toLowerCase())).map((p) => p.created_at));

  const h = (at: string | null) => hoursSince(at, now);
  const rows: PulseRow[] = [];

  const anyHours = h(leadAny);
  rows.push({
    key: "lead_any",
    label: "Last lead, any source",
    at: leadAny,
    hoursAgo: anyHours,
    warn: anyHours === null || anyHours >= 72,
    note:
      anyHours === null || anyHours >= 72
        ? "Nothing has come in for three days. Check the ads, the forms, and the lead poll before trusting any count."
        : "Leads are landing.",
  });

  const metaHours = h(leadMeta);
  const metaWarn = input.metaCampaignActive === true ? metaHours === null || metaHours >= 48 : metaHours !== null && metaHours >= 24 * 7;
  rows.push({
    key: "lead_meta",
    label: "Last Meta lead",
    at: leadMeta,
    hoursAgo: metaHours,
    warn: metaWarn,
    note:
      input.metaCampaignActive === true && (metaHours === null || metaHours >= 48)
        ? "A campaign is delivering and no Meta lead has landed in two days: the form, the webhook, or the five-minute poll is off."
        : input.metaCampaignActive === false
          ? "No campaign is delivering right now, so no Meta lead is expected."
          : metaHours !== null && metaHours >= 24 * 7
            ? "No Meta lead in a week. If an ad is meant to be running, it is not."
            : "Meta leads are landing.",
  });

  const siteHours = h(leadSite);
  rows.push({
    key: "lead_site",
    label: "Last website or phone lead",
    at: leadSite,
    hoursAgo: siteHours,
    warn: false,
    note: siteHours === null ? "None in the rows read." : "Forms and the phone line are writing leads.",
  });

  const callHours = h(callHad);
  rows.push({
    key: "call_had",
    label: "Last call somebody had",
    at: callHad,
    hoursAgo: callHours,
    warn: callHours === null || callHours >= 72,
    note:
      callHours === null || callHours >= 72
        ? "No logged call in three days. Either nobody called, or calls are happening off the business line and are not logged."
        : "Calls are being logged.",
  });

  const inHours = h(textIn);
  const outHours = h(textOutHuman);
  rows.push({
    key: "text_in",
    label: "Last text from a lead",
    at: textIn,
    hoursAgo: inHours,
    warn: inHours !== null && (outHours === null || ms(textOutHuman) < ms(textIn)) && inHours >= 2,
    note:
      inHours !== null && (outHours === null || ms(textOutHuman) < ms(textIn)) && inHours >= 2
        ? "A lead texted and no person has texted since. That is a reply owed."
        : inHours === null
          ? "No inbound text in the rows read."
          : "The last inbound text has a human reply after it.",
  });

  const paidHours = h(paid);
  rows.push({
    key: "paid",
    label: "Last payment recorded",
    at: paid,
    hoursAgo: paidHours,
    warn: paidHours === null || paidHours >= 24 * 28,
    note: paidHours === null || paidHours >= 24 * 28 ? "No paid checkout in 28 days. A check or a card taken by hand is not in this number." : "Money is landing.",
  });

  return rows;
}

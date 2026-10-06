// The command center's money board: lead to cash, as pure functions.
//
// Ryan's question on October 6, 2026 was "where are we broken at?" The
// September 20 plan already answered it once from the database: ads produce
// leads, the software emails every one of them, and then no person calls.
// This board keeps that question in front of the owner every day, in the
// order money moves: attention, leads in, a person reached them, they asked
// for a proposal, they paid. Every number has a definition the page prints,
// and every number comes from a row that already exists (leads, lead_notes,
// lead_calls, lead_messages, purchases). Nothing here reads a database or
// contacts anyone; the server half is lib/commandCenterServer.ts.
//
// Two windows, 7 and 28 days, because that is what Ryan asked for on the
// recordings ("7 and 28 day views"): one for this week's work, one for the
// month's trend. A "human touch" is the call sheet's definition
// (lib/callSheet.ts): a note, a call somebody had, or a text a person typed.
// The welcome email, the automatic first text and the auto-reply are not
// touches, so "reached by a person" can never be inflated by the software.

import {
  CLOSED_STATUSES,
  isHumanTouch,
  type CallSheetLead,
  type CallSheetTouch,
} from "@/lib/callSheet";
import { leadSourceLabel } from "@/lib/leadTimeline";

export type BoardWindow = 7 | 28;

export const BOARD_WINDOWS: readonly BoardWindow[] = [7, 28];

/** "7" or "28" from the query string; anything else is the 7-day board. */
export function parseWindow(value: unknown): BoardWindow {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").trim() === "28" ? 28 : 7;
}

export function windowStart(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

export type BoardLead = CallSheetLead & {
  priority?: string | null;
  expected_value_cents?: number | null;
  last_contacted_at?: string | null;
  owner?: string | null;
};

export type BoardPurchase = {
  id: string;
  kind: string | null;
  amount_cents: number | null;
  status: string | null;
  created_at: string;
};

export type SourceCount = { key: string; label: string; count: number };

export type MoneyBoard = {
  days: BoardWindow;
  since: string;
  /** Leads created in the window (test and deleted rows excluded by the reader). */
  leadsIn: number;
  bySource: SourceCount[];
  /** Leads in the window with at least one human touch, ever. */
  reached: number;
  /** reached / leadsIn as a whole percentage, null with no leads. */
  reachedPct: number | null;
  /** Leads in the window whose first human touch came within 24 hours. */
  reachedIn24h: number;
  /** Open leads in the window no person has touched. */
  untouched: number;
  /** Open leads, any age, whose latest event is the lead reaching out. */
  repliesOwed: number;
  /** Open leads, any age, in each stage. */
  stages: { contacted: number; booked: number; proposal: number };
  /** Open leads in the proposal stage and the dollar value typed on them. */
  proposalsOut: { count: number; cents: number; valued: number };
  /** Paid purchase rows created in the window. */
  paid: { count: number; cents: number };
  /** Notes logged in the window, by the author name on the note. */
  notesByAuthor: { author: string; count: number }[];
  /** Calls somebody had in the window (lead_calls, company scope). */
  callsHad: number;
};

const PAID_STATUSES = new Set(["paid", "complete", "completed", "succeeded"]);
const HOUR_MS = 3_600_000;

function ms(value: string | null | undefined): number {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isOpen(lead: Pick<BoardLead, "status">): boolean {
  return !(CLOSED_STATUSES as readonly string[]).includes(lead.status);
}

/** Meta lead ads under one key so the source list reads as a channel list. */
export function sourceKey(lead: Pick<BoardLead, "source" | "utm_source">): string {
  const source = String(lead.source ?? "").trim().toLowerCase();
  if (["meta_lead_ad", "facebook-lead-ad", "facebook_lead_ad", "facebook", "meta"].includes(source)) return "meta_lead_ad";
  if (!source) {
    const utm = String(lead.utm_source ?? "").trim().toLowerCase();
    if (utm === "facebook" || utm === "meta" || utm === "instagram") return "meta_lead_ad";
    return "unknown";
  }
  return source;
}

export function sourceCounts(leads: readonly BoardLead[]): SourceCount[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const key = sourceKey(lead);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key === "unknown" ? "Source not recorded" : leadSourceLabel(key), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

type TouchIndex = {
  /** Earliest human touch per lead, epoch ms. */
  firstHuman: Map<string, number>;
  /** Latest event of any kind per lead: when and whether a person made it. */
  latest: Map<string, { at: number; human: boolean }>;
};

function indexTouches(touches: readonly CallSheetTouch[]): TouchIndex {
  const firstHuman = new Map<string, number>();
  const latest = new Map<string, { at: number; human: boolean }>();
  for (const touch of touches) {
    const at = ms(touch.at);
    if (!Number.isFinite(at)) continue;
    const human = isHumanTouch(touch);
    if (human) {
      const prior = firstHuman.get(touch.lead_id);
      if (prior === undefined || at < prior) firstHuman.set(touch.lead_id, at);
    }
    const last = latest.get(touch.lead_id);
    if (!last || at > last.at) latest.set(touch.lead_id, { at, human });
  }
  return { firstHuman, latest };
}

export function moneyBoard(input: {
  /** Every open lead plus every lead created in the window. Duplicates are fine. */
  leads: readonly BoardLead[];
  touches: readonly CallSheetTouch[];
  purchases: readonly BoardPurchase[];
  notes: readonly { author: string | null; created_at: string }[];
  calls: readonly { started_at: string | null; direction: string | null; outcome: string | null; scope_status?: string | null }[];
  now: Date;
  days: BoardWindow;
}): MoneyBoard {
  const since = windowStart(input.now, input.days);
  const sinceMs = since.getTime();
  const nowMs = input.now.getTime();

  const byId = new Map<string, BoardLead>();
  for (const lead of input.leads) byId.set(lead.id, lead);
  const leads = [...byId.values()];
  const inWindow = leads.filter((lead) => {
    const at = ms(lead.created_at);
    return Number.isFinite(at) && at >= sinceMs && at <= nowMs;
  });
  const open = leads.filter(isOpen);
  const index = indexTouches(input.touches);

  let reached = 0;
  let reachedIn24h = 0;
  let untouched = 0;
  for (const lead of inWindow) {
    const first = index.firstHuman.get(lead.id);
    if (first !== undefined) {
      reached += 1;
      const created = ms(lead.created_at);
      if (Number.isFinite(created) && first - created <= 24 * HOUR_MS) reachedIn24h += 1;
    } else if (isOpen(lead)) {
      untouched += 1;
    }
  }

  let repliesOwed = 0;
  const stages = { contacted: 0, booked: 0, proposal: 0 };
  let proposalCents = 0;
  let proposalValued = 0;
  for (const lead of open) {
    const last = index.latest.get(lead.id);
    if (last && !last.human) repliesOwed += 1;
    if (lead.status === "contacted") stages.contacted += 1;
    if (lead.status === "call_booked") stages.booked += 1;
    if (lead.status === "proposal") {
      stages.proposal += 1;
      const cents = Number(lead.expected_value_cents ?? 0);
      if (cents > 0) {
        proposalCents += cents;
        proposalValued += 1;
      }
    }
  }

  let paidCount = 0;
  let paidCents = 0;
  for (const purchase of input.purchases) {
    const at = ms(purchase.created_at);
    if (!Number.isFinite(at) || at < sinceMs) continue;
    if (!PAID_STATUSES.has(String(purchase.status ?? "").toLowerCase())) continue;
    paidCount += 1;
    paidCents += Math.max(0, Number(purchase.amount_cents ?? 0));
  }

  const authors = new Map<string, number>();
  for (const note of input.notes) {
    const at = ms(note.created_at);
    if (!Number.isFinite(at) || at < sinceMs) continue;
    const author = String(note.author ?? "").trim() || "Unsigned";
    authors.set(author, (authors.get(author) ?? 0) + 1);
  }

  let callsHad = 0;
  for (const call of input.calls) {
    const at = ms(call.started_at);
    if (!Number.isFinite(at) || at < sinceMs) continue;
    if (call.scope_status && call.scope_status !== "company") continue;
    const missed = call.direction === "incoming" && ["missed", "voicemail", "no_answer"].includes(call.outcome ?? "");
    if (!missed) callsHad += 1;
  }

  return {
    days: input.days,
    since: since.toISOString(),
    leadsIn: inWindow.length,
    bySource: sourceCounts(inWindow),
    reached,
    reachedPct: inWindow.length ? Math.round((reached / inWindow.length) * 100) : null,
    reachedIn24h,
    untouched,
    repliesOwed,
    stages,
    proposalsOut: { count: stages.proposal, cents: proposalCents, valued: proposalValued },
    paid: { count: paidCount, cents: paidCents },
    notesByAuthor: [...authors.entries()].map(([author, count]) => ({ author, count })).sort((a, b) => b.count - a.count || a.author.localeCompare(b.author)),
    callsHad,
  };
}

export type Promise_ = {
  lead: BoardLead;
  /** The promised instant, ISO. */
  at: string;
  /** Hours past the promise; negative means later today. */
  overdueHours: number;
};

/**
 * Open leads whose follow-up time is at or before the end of today in Central
 * time: overdue first, then the rest of today. A promise is only honoured on
 * a lead a person has touched (the diagnostic route stamps untouched leads
 * with a review time that is not a promise), the call sheet's own rule.
 */
export function promisesDue(leads: readonly BoardLead[], touches: readonly CallSheetTouch[], now: Date, endOfToday: Date): Promise_[] {
  const touched = new Set<string>();
  for (const touch of touches) if (isHumanTouch(touch)) touched.add(touch.lead_id);
  const seen = new Set<string>();
  const out: Promise_[] = [];
  for (const lead of leads) {
    if (seen.has(lead.id)) continue;
    seen.add(lead.id);
    if (!isOpen(lead) || !touched.has(lead.id)) continue;
    const at = ms(lead.next_follow_up_at);
    if (!Number.isFinite(at) || at > endOfToday.getTime()) continue;
    out.push({ lead, at: new Date(at).toISOString(), overdueHours: Math.round(((now.getTime() - at) / HOUR_MS) * 10) / 10 });
  }
  return out.sort((a, b) => ms(a.at) - ms(b.at));
}

export type ProposalRow = {
  lead: BoardLead;
  cents: number | null;
  /** Days since a person last touched the lead, null when never. */
  quietDays: number | null;
};

/** Open leads in the proposal stage: the money on the table, quietest first. */
export function proposalsOnTable(leads: readonly BoardLead[], touches: readonly CallSheetTouch[], now: Date): ProposalRow[] {
  const lastHuman = new Map<string, number>();
  for (const touch of touches) {
    if (!isHumanTouch(touch)) continue;
    const at = ms(touch.at);
    if (!Number.isFinite(at)) continue;
    const prior = lastHuman.get(touch.lead_id);
    if (prior === undefined || at > prior) lastHuman.set(touch.lead_id, at);
  }
  const seen = new Set<string>();
  const out: ProposalRow[] = [];
  for (const lead of leads) {
    if (seen.has(lead.id) || lead.status !== "proposal") continue;
    seen.add(lead.id);
    const cents = Number(lead.expected_value_cents ?? 0);
    const last = lastHuman.get(lead.id) ?? ms(lead.last_contacted_at);
    out.push({
      lead,
      cents: cents > 0 ? cents : null,
      quietDays: Number.isFinite(last) ? Math.floor((now.getTime() - last) / 86_400_000) : null,
    });
  }
  return out.sort((a, b) => (b.quietDays ?? Infinity) - (a.quietDays ?? Infinity) || (b.cents ?? 0) - (a.cents ?? 0));
}

export type BusinessRow = {
  key: string;
  name: string;
  /** Where to work this business's leads. */
  href: string;
  leads7: number;
  leads28: number;
  lastLeadAt: string | null;
  /** Null when this server cannot count it (a different database). */
  counted: boolean;
};

/** Lead counts per business over both windows, from rows that carry a business key. */
export function businessCounts(
  rows: readonly { key: string; created_at: string }[],
  businesses: readonly { key: string; name: string; href: string }[],
  now: Date,
): BusinessRow[] {
  const since7 = windowStart(now, 7).getTime();
  const since28 = windowStart(now, 28).getTime();
  const nowMs = now.getTime();
  return businesses.map((business) => {
    let leads7 = 0;
    let leads28 = 0;
    let last = -Infinity;
    for (const row of rows) {
      if (row.key !== business.key) continue;
      const at = ms(row.created_at);
      if (!Number.isFinite(at) || at > nowMs) continue;
      if (at > last) last = at;
      if (at >= since28) leads28 += 1;
      if (at >= since7) leads7 += 1;
    }
    return {
      key: business.key,
      name: business.name,
      href: business.href,
      leads7,
      leads28,
      lastLeadAt: Number.isFinite(last) ? new Date(last).toISOString() : null,
      counted: true,
    };
  });
}

/** Meta insight rows as the Ads Brain pull already shapes them (campaign level is enough here). */
export type AdInsightRow = {
  /** YYYY-MM-DD, the platform's reporting day. */
  date: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  link_clicks: number;
  platform_leads: number;
};

export type AdSummary = {
  days: BoardWindow;
  /** The first reporting day counted, YYYY-MM-DD. */
  fromDate: string;
  spendCents: number;
  impressions: number;
  linkClicks: number;
  platformLeads: number;
  /** Spend over the platform's own lead count, cents; null without leads. */
  costPerPlatformLeadCents: number | null;
  /** Spend over Meta leads in our own records for the same window, cents; null without leads. */
  costPerCrmLeadCents: number | null;
  campaigns: { id: string; name: string; spendCents: number; linkClicks: number; platformLeads: number; costPerPlatformLeadCents: number | null }[];
};

/** Today minus (days - 1) as YYYY-MM-DD, so a 7-day window is seven reporting days including today. */
export function reportingWindowStart(todayLocalDate: string, days: number): string {
  const [y, m, d] = todayLocalDate.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - (days - 1)));
  return start.toISOString().slice(0, 10);
}

export function adSummary(rows: readonly AdInsightRow[], days: BoardWindow, todayLocalDate: string, crmMetaLeads: number): AdSummary {
  const fromDate = reportingWindowStart(todayLocalDate, days);
  const campaigns = new Map<string, AdSummary["campaigns"][number]>();
  let spend = 0;
  let impressions = 0;
  let linkClicks = 0;
  let platformLeads = 0;
  for (const row of rows) {
    if (!row.date || row.date < fromDate || row.date > todayLocalDate) continue;
    const rowSpendCents = Math.round(Math.max(0, Number(row.spend) || 0) * 100);
    spend += rowSpendCents;
    impressions += Math.max(0, Math.round(Number(row.impressions) || 0));
    linkClicks += Math.max(0, Math.round(Number(row.link_clicks) || 0));
    platformLeads += Math.max(0, Math.round(Number(row.platform_leads) || 0));
    const id = row.campaign_id || row.campaign_name || "unnamed";
    const entry = campaigns.get(id) ?? { id, name: row.campaign_name || "Unnamed campaign", spendCents: 0, linkClicks: 0, platformLeads: 0, costPerPlatformLeadCents: null };
    entry.spendCents += rowSpendCents;
    entry.linkClicks += Math.max(0, Math.round(Number(row.link_clicks) || 0));
    entry.platformLeads += Math.max(0, Math.round(Number(row.platform_leads) || 0));
    campaigns.set(id, entry);
  }
  const perLead = (cents: number, leads: number) => (leads > 0 ? Math.round(cents / leads) : null);
  return {
    days,
    fromDate,
    spendCents: spend,
    impressions,
    linkClicks,
    platformLeads,
    costPerPlatformLeadCents: perLead(spend, platformLeads),
    costPerCrmLeadCents: perLead(spend, crmMetaLeads),
    campaigns: [...campaigns.values()]
      .map((c) => ({ ...c, costPerPlatformLeadCents: perLead(c.spendCents, c.platformLeads) }))
      .filter((c) => c.spendCents > 0 || c.platformLeads > 0)
      .sort((a, b) => b.spendCents - a.spendCents),
  };
}

export type BreakEven = {
  /** What the owner typed as the month's known costs, cents. */
  monthlyCostsCents: number;
  /** Paid in the last 28 days, cents. */
  paidCents: number;
  /** The price one client pays up front, cents. */
  pricePerClientCents: number;
  /** Whole clients needed to cover the month's costs from zero. */
  clientsToCover: number;
  /** Whole clients still needed after what has been paid; 0 means the month is covered. */
  clientsRemaining: number;
  /** Paid minus costs, cents; negative until the month is covered. */
  marginCents: number;
};

/** Dollars from a typed env value ("1352.21", "$1,352"), or null when unset or not a number. */
export function parseUsd(value: string | undefined): number | null {
  const cleaned = String(value ?? "").replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

/**
 * Ryan's "live counter" from the October 2 recording: all known costs, the
 * money coming in, and how many sales it takes to be in the profit zone. The
 * costs are typed by the owner (COMMAND_CENTER_MONTHLY_COSTS_USD), never
 * guessed; without them the board shows how to turn the counter on.
 */
export function breakEven(input: { monthlyCostsCents: number; paidCents: number; pricePerClientCents: number }): BreakEven {
  const price = Math.max(1, Math.round(input.pricePerClientCents));
  const costs = Math.max(0, Math.round(input.monthlyCostsCents));
  const paid = Math.max(0, Math.round(input.paidCents));
  const clientsToCover = Math.ceil(costs / price);
  const clientsRemaining = Math.max(0, Math.ceil((costs - paid) / price));
  return { monthlyCostsCents: costs, paidCents: paid, pricePerClientCents: price, clientsToCover, clientsRemaining, marginCents: paid - costs };
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function moneyExact(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** The one line the board leads with: where the money stopped moving in this window. */
export function bottleneckLine(board: MoneyBoard): string {
  if (board.repliesOwed > 0) {
    return `${board.repliesOwed} ${board.repliesOwed === 1 ? "lead is" : "leads are"} waiting on a reply from a person. Answer them before anything else.`;
  }
  if (board.untouched > 0) {
    return `${board.untouched} of the last ${board.days} days' leads ${board.untouched === 1 ? "has" : "have"} never heard from a person. Call them.`;
  }
  if (board.proposalsOut.count > 0 && board.paid.count === 0) {
    return `${board.proposalsOut.count} proposal${board.proposalsOut.count === 1 ? "" : "s"} out and nothing paid in ${board.days} days. Follow the money on the table.`;
  }
  if (board.leadsIn === 0) {
    return `No new leads in ${board.days} days. The board is clear because nothing came in, not because the work is done.`;
  }
  if (board.paid.count === 0) {
    return `Every lead has been reached and nothing has been paid in ${board.days} days. Book the sit-down and send the proposal.`;
  }
  return `${board.paid.count} paid in ${board.days} days. Keep the queue at zero.`;
}

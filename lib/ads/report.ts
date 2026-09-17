// The weekly ads report. Pure: rows in, report out. Every number is either
// a sum of what the platform reported or a count of the client's own lead
// records, and the definitions that say which is which print on every
// report. There is no return-on-ad-spend figure: the report shows spend and
// the value the client recorded on won leads, side by side, and stops there.

import type { Lead, Workspace } from "../hq/types";
import { localDateShift, localParts } from "../hq/time";
import { AD_PLATFORMS, PLATFORM_LABEL, type AdPlatform, type AdsDailyRow } from "./types";

export const ADS_DEFINITIONS: { term: string; meaning: string }[] = [
  { term: "Spend", meaning: "What the ad platform reported charging your account for the week, in your account's currency." },
  { term: "Leads (your records)", meaning: "People who arrived in your lead list during the week and were tagged to that platform. Spam is excluded. This is the number the rest of the report uses." },
  { term: "Platform-reported leads", meaning: "What the platform's own pixel or lead form counted. It can differ from your records and is shown for comparison only." },
  { term: "Cost per lead", meaning: "Spend divided by leads in your records. Shown only when there was at least one lead." },
  { term: "Contacted", meaning: "Leads from that platform that got a first reply from you, by any channel." },
  { term: "Booked and won", meaning: "Leads you moved to booked or won, whenever that happened in the week." },
  { term: "Won value recorded", meaning: "The dollar value you typed on won leads. Blank when you did not record one. It is not an estimate." },
  { term: "Prior week", meaning: "The same seven-day window one week earlier, from the same sources, when data exists for it." },
];

export type PlatformSummary = {
  platform: AdPlatform;
  label: string;
  spendCents: number;
  currency: string;
  impressions: number;
  clicks: number;
  platformLeads: number;
  leads: number;
  contacted: number;
  booked: number;
  won: number;
  wonValueCents: number | null;
  /** Cents, or null when there were no leads. */
  costPerLeadCents: number | null;
  priorSpendCents: number | null;
  priorLeads: number | null;
  priorCostPerLeadCents: number | null;
  campaigns: { campaign: string; spendCents: number; leads: number; platformLeads: number }[];
};

export type TraceRow = {
  leadId: string;
  name: string;
  platform: AdPlatform;
  campaign: string | null;
  arrived: string;
  action: string;
  outcome: string;
  valueCents: number | null;
};

export type WeeklyAdsReport = {
  workspaceId: string;
  businessName: string;
  weekStart: string;
  weekEnd: string;
  title: string;
  hasAdsData: boolean;
  platforms: PlatformSummary[];
  totalSpendCents: number;
  totalLeads: number;
  leadsBySource: { source: string; count: number }[];
  trace: TraceRow[];
  chain: { leads: number; contacted: number; booked: number; won: number; wonValueCents: number | null };
  decision: { headline: string; why: string };
  definitions: typeof ADS_DEFINITIONS;
  text: string;
};

export type AdsReportInput = {
  workspace: Workspace;
  rows: AdsDailyRow[];
  leads: Lead[];
  now: Date;
};

export function usdCents(cents: number, currency = "USD"): string {
  const dollars = cents / 100;
  const formatted = dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
}

/** Which platform a lead came from, from the client's own tagging. Null when it was not an ad. */
export function platformForLead(lead: Lead): AdPlatform | null {
  const meta = lead.meta ?? {};
  const utm = String(meta.utm_source ?? meta.utmSource ?? "").toLowerCase();
  const detail = (lead.source_detail ?? "").toLowerCase();
  if (lead.source === "meta") return "meta";
  if (["facebook", "fb", "instagram", "ig", "meta"].includes(utm) || /\b(meta|facebook|instagram)\b/.test(detail)) return "meta";
  if (["google", "adwords", "googleads"].includes(utm) || /\bgoogle[ _-]?ads?\b/.test(detail) || detail === "google") return "google";
  return null;
}

function campaignForLead(lead: Lead): string | null {
  const meta = lead.meta ?? {};
  const c = meta.utm_campaign ?? meta.campaign ?? meta.campaign_name;
  return typeof c === "string" && c.trim() ? c.trim() : null;
}

function firstAction(lead: Lead): string {
  if (!lead.first_contact_at) return "No reply yet";
  const via = lead.auto_replied_at && lead.auto_replied_at <= lead.first_contact_at ? "instant text-back" : "you";
  return `Replied (${via})`;
}

function outcomeFor(lead: Lead): string {
  switch (lead.status) {
    case "won":
      return lead.value_cents ? `Won, ${usdCents(lead.value_cents)} recorded` : "Won, no value recorded";
    case "booked":
      return "Booked";
    case "quoted":
      return "Quoted, waiting";
    case "lost":
      return "Lost";
    case "contacted":
      return "In conversation";
    default:
      return "New";
  }
}

export function buildAdsWeeklyReport(input: AdsReportInput): WeeklyAdsReport {
  const { workspace: ws, now } = input;
  const foreign = input.rows.find((r) => r.workspace_id !== ws.id) ?? input.leads.find((l) => l.workspace_id !== ws.id);
  if (foreign) throw new Error("ads report: a row from another workspace was passed in");

  const tz = ws.timezone;
  const weekEnd = localDateShift(now, tz, -1);
  const weekStart = localDateShift(now, tz, -7);
  const priorEnd = localDateShift(now, tz, -8);
  const priorStart = localDateShift(now, tz, -14);
  const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

  const rows = input.rows.filter((r) => inRange(r.date, weekStart, weekEnd));
  const priorRows = input.rows.filter((r) => inRange(r.date, priorStart, priorEnd));
  const leads = input.leads.filter((l) => l.status !== "spam");
  const leadDate = (l: Lead) => localParts(new Date(l.created_at), tz).date;
  const weekLeads = leads.filter((l) => inRange(leadDate(l), weekStart, weekEnd));
  const priorLeads = leads.filter((l) => inRange(leadDate(l), priorStart, priorEnd));

  const platforms: PlatformSummary[] = [];
  for (const platform of AD_PLATFORMS) {
    const pr = rows.filter((r) => r.platform === platform);
    const pp = priorRows.filter((r) => r.platform === platform);
    const pl = weekLeads.filter((l) => platformForLead(l) === platform);
    const ppl = priorLeads.filter((l) => platformForLead(l) === platform);
    if (pr.length === 0 && pl.length === 0 && pp.length === 0) continue;
    const spendCents = pr.reduce((s, r) => s + r.spend_cents, 0);
    const priorSpendCents = pp.length ? pp.reduce((s, r) => s + r.spend_cents, 0) : null;
    const won = pl.filter((l) => l.status === "won");
    const wonWithValue = won.filter((l) => l.value_cents);
    const campaignMap = new Map<string, { spendCents: number; platformLeads: number; leads: number }>();
    for (const r of pr) {
      const c = campaignMap.get(r.campaign) ?? { spendCents: 0, platformLeads: 0, leads: 0 };
      c.spendCents += r.spend_cents;
      c.platformLeads += r.platform_leads;
      campaignMap.set(r.campaign, c);
    }
    for (const l of pl) {
      const name = campaignForLead(l);
      if (!name) continue;
      const c = campaignMap.get(name) ?? { spendCents: 0, platformLeads: 0, leads: 0 };
      c.leads += 1;
      campaignMap.set(name, c);
    }
    platforms.push({
      platform,
      label: PLATFORM_LABEL[platform],
      spendCents,
      currency: pr[0]?.currency ?? pp[0]?.currency ?? "USD",
      impressions: pr.reduce((s, r) => s + r.impressions, 0),
      clicks: pr.reduce((s, r) => s + r.clicks, 0),
      platformLeads: pr.reduce((s, r) => s + r.platform_leads, 0),
      leads: pl.length,
      contacted: pl.filter((l) => l.first_contact_at).length,
      booked: pl.filter((l) => l.status === "booked").length,
      won: won.length,
      wonValueCents: wonWithValue.length ? wonWithValue.reduce((s, l) => s + (l.value_cents ?? 0), 0) : null,
      costPerLeadCents: pl.length ? Math.round(spendCents / pl.length) : null,
      priorSpendCents,
      priorLeads: pp.length || ppl.length ? ppl.length : null,
      priorCostPerLeadCents: priorSpendCents !== null && ppl.length ? Math.round(priorSpendCents / ppl.length) : null,
      campaigns: [...campaignMap.entries()].map(([campaign, c]) => ({ campaign, ...c })).sort((a, b) => b.spendCents - a.spendCents),
    });
  }

  const sources = new Map<string, number>();
  for (const l of weekLeads) {
    const p = platformForLead(l);
    const key = p ? PLATFORM_LABEL[p] : l.source;
    sources.set(key, (sources.get(key) ?? 0) + 1);
  }
  const leadsBySource = [...sources.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

  const adLeads = weekLeads.filter((l) => platformForLead(l) !== null);
  const trace: TraceRow[] = adLeads
    .map((l) => ({
      leadId: l.id,
      name: l.name || "No name",
      platform: platformForLead(l) as AdPlatform,
      campaign: campaignForLead(l),
      arrived: leadDate(l),
      action: firstAction(l),
      outcome: outcomeFor(l),
      valueCents: l.status === "won" ? l.value_cents : null,
    }))
    .sort((a, b) => a.arrived.localeCompare(b.arrived));
  const wonAd = adLeads.filter((l) => l.status === "won" && l.value_cents);
  const chain = {
    leads: adLeads.length,
    contacted: adLeads.filter((l) => l.first_contact_at).length,
    booked: adLeads.filter((l) => l.status === "booked").length,
    won: adLeads.filter((l) => l.status === "won").length,
    wonValueCents: wonAd.length ? wonAd.reduce((s, l) => s + (l.value_cents ?? 0), 0) : null,
  };

  const totalSpendCents = platforms.reduce((s, p) => s + p.spendCents, 0);
  const decision = recommendDecision({ platforms, chain, totalSpendCents, adLeads });
  const title = `${ws.name}: ads report for the week of ${weekStart}`;
  const hasAdsData = rows.length > 0 || priorRows.length > 0;

  const report: WeeklyAdsReport = {
    workspaceId: ws.id,
    businessName: ws.name,
    weekStart,
    weekEnd,
    title,
    hasAdsData,
    platforms,
    totalSpendCents,
    totalLeads: weekLeads.length,
    leadsBySource,
    trace,
    chain,
    decision,
    definitions: ADS_DEFINITIONS,
    text: "",
  };
  report.text = reportText(report);
  return report;
}

function recommendDecision(x: { platforms: PlatformSummary[]; chain: WeeklyAdsReport["chain"]; totalSpendCents: number; adLeads: Lead[] }): WeeklyAdsReport["decision"] {
  const unanswered = x.chain.leads - x.chain.contacted;
  if (unanswered > 0) {
    return {
      headline: `Answer the ${unanswered} ad lead${unanswered === 1 ? "" : "s"} still waiting before changing any budget.`,
      why: "Spend only turns into work when someone replies. Until every ad lead has a first reply, the ads are not the problem to fix.",
    };
  }
  if (x.totalSpendCents > 0 && x.chain.leads === 0) {
    return {
      headline: `Check lead tagging before judging the ads: ${usdCents(x.totalSpendCents)} was spent and no lead in your records is tagged to a platform.`,
      why: "Either the form is not passing the source through, or the ads produced no leads. The report cannot tell which until tagging is confirmed.",
    };
  }
  const reconcile = x.platforms.find((p) => p.platformLeads > 0 && Math.abs(p.platformLeads - p.leads) >= Math.max(2, Math.ceil(p.platformLeads * 0.5)));
  if (reconcile) {
    return {
      headline: `Reconcile ${reconcile.label}: the platform counted ${reconcile.platformLeads} lead${reconcile.platformLeads === 1 ? "" : "s"}, your records show ${reconcile.leads}.`,
      why: "Platform counts include duplicates and people who never reached you. Your records are the number that pays the bills. Fix the gap before trusting either.",
    };
  }
  const priced = x.platforms.filter((p) => p.costPerLeadCents !== null && p.leads >= 5);
  if (priced.length === 2) {
    const [a, b] = priced.sort((m, n) => (m.costPerLeadCents ?? 0) - (n.costPerLeadCents ?? 0));
    if ((b.costPerLeadCents ?? 0) >= (a.costPerLeadCents ?? 0) * 1.5) {
      return {
        headline: `Review the ${b.label} campaigns: ${usdCents(b.costPerLeadCents ?? 0)} per lead against ${usdCents(a.costPerLeadCents ?? 0)} on ${a.label}.`,
        why: "One week is not enough to move budget on. Look at which campaign carries the cost, then decide next week with two weeks of data.",
      };
    }
  }
  const unpricedWon = x.adLeads.filter((l) => l.status === "won" && !l.value_cents).length;
  if (unpricedWon > 0) {
    return {
      headline: `Record the value on the ${unpricedWon} won ad lead${unpricedWon === 1 ? "" : "s"} so next week's report can show what the ads returned.`,
      why: "The report only prints value you typed. Without it, spend has nothing to stand next to.",
    };
  }
  return {
    headline: "Keep the current setup one more week and record the outcome on every ad lead.",
    why: "Nothing in this week's numbers argues for a change. Two clean weeks in a row is the earliest a budget decision makes sense.",
  };
}

function reportText(r: WeeklyAdsReport): string {
  const lines: string[] = [r.title, `${r.weekStart} to ${r.weekEnd}`, ""];
  if (!r.hasAdsData) lines.push("No ad spend was reported for this week.", "");
  for (const p of r.platforms) {
    lines.push(p.label.toUpperCase());
    lines.push(`Spend: ${usdCents(p.spendCents, p.currency)}${p.priorSpendCents !== null ? ` (prior week ${usdCents(p.priorSpendCents, p.currency)})` : ""}`);
    lines.push(`Leads (your records): ${p.leads}${p.priorLeads !== null ? ` (prior week ${p.priorLeads})` : ""}`);
    lines.push(`Platform-reported leads: ${p.platformLeads}`);
    lines.push(`Cost per lead: ${p.costPerLeadCents === null ? "n/a (no leads)" : usdCents(p.costPerLeadCents, p.currency)}${p.priorCostPerLeadCents !== null ? ` (prior week ${usdCents(p.priorCostPerLeadCents, p.currency)})` : ""}`);
    lines.push(`Contacted: ${p.contacted} of ${p.leads}. Booked: ${p.booked}. Won: ${p.won}${p.wonValueCents !== null ? ` (${usdCents(p.wonValueCents)} recorded)` : ""}.`);
    for (const c of p.campaigns) lines.push(`- ${c.campaign}: ${usdCents(c.spendCents, p.currency)}, ${c.leads} lead${c.leads === 1 ? "" : "s"} in your records, ${c.platformLeads} platform-reported`);
    lines.push("");
  }
  if (r.leadsBySource.length) {
    lines.push("ALL LEADS BY SOURCE");
    for (const s of r.leadsBySource) lines.push(`- ${s.source}: ${s.count}`);
    lines.push("");
  }
  lines.push("TRACE THE SALE (ad leads only)");
  if (r.trace.length === 0) lines.push("No ad-tagged leads this week.");
  for (const t of r.trace) lines.push(`- ${t.arrived} ${t.name} · ${PLATFORM_LABEL[t.platform]}${t.campaign ? ` / ${t.campaign}` : ""} → ${t.action} → ${t.outcome}`);
  lines.push(`Chain: ${r.chain.leads} leads → ${r.chain.contacted} contacted → ${r.chain.booked} booked → ${r.chain.won} won${r.chain.wonValueCents !== null ? ` (${usdCents(r.chain.wonValueCents)} recorded)` : ""}`);
  lines.push("");
  lines.push("ONE DECISION FOR THIS WEEK");
  lines.push(r.decision.headline);
  lines.push(r.decision.why);
  lines.push("");
  lines.push("DEFINITIONS");
  for (const d in r.definitions) lines.push(`${r.definitions[d].term}: ${r.definitions[d].meaning}`);
  return lines.join("\n");
}

/** The emailed version. A draft: nothing in this module sends. */
export function adsReportEmail(r: WeeklyAdsReport): { subject: string; text: string } {
  return {
    subject: `Ads report for ${r.businessName}: week of ${r.weekStart}`,
    text: `${r.text}\n\nThis report was built from your own ad account and your own lead list. Nothing in it is estimated.`,
  };
}

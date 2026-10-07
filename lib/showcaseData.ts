export type ShowcaseData = {
  asOf: string | null; freshness: "current" | "stale" | "unavailable";
  proposals: { prepared: number | null; shared: number | null; reviewed: number | null; accepted: number | null; openValue: number | null; sharedValue: number | null; goal: number };
  agency: { leads: number | null; spend: number | null; cpl: number | null; days: number; observedAt: string | null };
  clientMetrics: { dirt: { cpl: number | null; cpa: number | null }; education: { cpl: number | null; cpa: number | null } };
};
const finite = (x: unknown): number | null => typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
/** Strict projection: raw client identities, campaign names, contact details, notes, invoices and links never reach the showcase client. */
export function showcaseData(raw: any, now = Date.now()): ShowcaseData {
  const at = typeof raw?.generatedAt === "string" && Number.isFinite(Date.parse(raw.generatedAt)) ? raw.generatedAt : null;
  const fresh = at && now - Date.parse(at) <= 2 * 3600000 && Date.parse(at) <= now + 300000;
  const p = raw?.proposalPlanner, m = raw?.clientCampaigns?.brands?.leadflow?.windows?.["28"];
  const actual = m?.status === "available" ? m.totals : null;
  const client = (key: string) => { const x = raw?.clientCampaigns?.brands?.[key]?.windows?.["28"]; return x?.status === "available" ? { cpl: finite(x?.totals?.cpl), cpa: finite(x?.totals?.cac) } : { cpl: null, cpa: null }; };
  return {
    asOf: at, freshness: at ? fresh ? "current" : "stale" : "unavailable",
    proposals: { prepared: finite(p?.metrics?.prepared), shared: finite(p?.metrics?.shared), reviewed: finite(p?.metrics?.reviewed), accepted: finite(p?.metrics?.accepted), openValue: finite(p?.valueTotals?.openCents) === null ? null : p.valueTotals.openCents / 100, sharedValue: finite(p?.valueTotals?.sharedOpenCents) === null ? null : p.valueTotals.sharedOpenCents / 100, goal: 100000 },
    agency: { leads: finite(actual?.leads), spend: finite(actual?.spend), cpl: finite(actual?.cpl), days: 28, observedAt: typeof raw?.clientCampaigns?.brands?.leadflow?.observedAt === "string" && Number.isFinite(Date.parse(raw.clientCampaigns.brands.leadflow.observedAt)) ? raw.clientCampaigns.brands.leadflow.observedAt : null },
    clientMetrics: { dirt: client("scott"), education: client("premier") },
  };
}
export type ModelInput = { budget: number; cpl: number; ticket: number; margin: number; fee: number; convert: number; repeat: number; booking: number; show: number; enrollment: number; capacity: number };
export function forecast(industry: "dirt" | "education", input: ModelInput) {
  const budget = Math.max(0, input.budget), leads = input.cpl > 0 ? budget / input.cpl : 0;
  const appointments = industry === "education" ? leads * input.booking / 100 : leads * .55;
  const rawUnits = Math.floor(industry === "dirt" ? leads * input.convert / 100 : appointments * input.show / 100 * input.enrollment / 100);
  const capacity = Math.max(0, Math.floor(input.capacity));
  const units = Math.min(rawUnits, capacity);
  const totalJobs = industry === "dirt" ? units + Math.min(Math.max(0, capacity - units), units ? Math.max(0, Math.floor(input.repeat)) : 0) : units;
  const revenue = totalJobs * Math.max(0, input.ticket), gross = revenue * Math.max(0, Math.min(100, input.margin)) / 100;
  const cost = budget + Math.max(0, input.fee), contribution = gross - cost;
  return { leads, appointments, units, totalJobs, revenue, gross, cost, contribution, roi: cost > 0 ? contribution / cost * 100 : null, roas: budget > 0 ? revenue / budget : null, cpa: units > 0 ? budget / units : null, cac: units > 0 ? cost / units : null, breakEven: input.ticket > 0 && input.margin > 0 ? Math.ceil(cost / (input.ticket * input.margin / 100)) : null };
}

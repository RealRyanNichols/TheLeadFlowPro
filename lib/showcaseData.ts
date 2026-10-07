export type ShowcaseData = {
  asOf: string | null;
  clientMetrics: { dirt: { cpa: number | null }; education: { cpa: number | null } };
};
const finite = (x: unknown): number | null => typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null;
/** Customer-facing allowlist: no agency economics, proposal pipeline, CPL, leads, identities or raw source fields. */
export function showcaseData(raw: any): ShowcaseData {
  const at = typeof raw?.generatedAt === "string" && Number.isFinite(Date.parse(raw.generatedAt)) ? raw.generatedAt : null;
  const client = (key: string) => { const x = raw?.clientCampaigns?.brands?.[key]?.windows?.["28"]; return { cpa: x?.status === "available" ? finite(x?.totals?.cac) : null }; };
  return { asOf: at, clientMetrics: { dirt: client("scott"), education: client("premier") } };
}
export type ModelInput = { investment: number; targetUnits: number; ticket: number; margin: number; repeat: number; capacity: number };
export function forecast(industry: "dirt" | "education", input: ModelInput) {
  const capacity = Math.max(0, Math.floor(input.capacity));
  const units = Math.min(Math.max(0, Math.floor(input.targetUnits)), capacity);
  const totalJobs = industry === "dirt" ? units + Math.min(Math.max(0, capacity - units), units ? Math.max(0, Math.floor(input.repeat)) : 0) : units;
  const revenue = totalJobs * Math.max(0, input.ticket), gross = revenue * Math.max(0, Math.min(100, input.margin)) / 100;
  const cost = Math.max(0, input.investment), contribution = gross - cost;
  return { units, totalJobs, revenue, gross, cost, contribution,
    roi: cost > 0 ? contribution / cost * 100 : null,
    acquisitionCost: units > 0 ? cost / units : null,
    breakEven: input.ticket > 0 && input.margin > 0 ? Math.ceil(cost / (input.ticket * input.margin / 100)) : null,
  };
}

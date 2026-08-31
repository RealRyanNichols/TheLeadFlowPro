export const LEADFLOW_GROWTH_LOOP = [
  "BUILD",
  "MEASURE",
  "SHOW",
  "ATTRACT",
  "CAPTURE",
  "SELL",
  "BUILD",
] as const;

export type GrowthAssumptions = {
  contact_to_reply: number;
  reply_to_qualified: number;
  qualified_to_proposal: number;
  proposal_to_close: number;
};

export const DEFAULT_GROWTH_ASSUMPTIONS: GrowthAssumptions = {
  contact_to_reply: 0.12,
  reply_to_qualified: 0.5,
  qualified_to_proposal: 0.7,
  proposal_to_close: 0.3,
};

export const DEFAULT_SEPTEMBER_OFFER_MIX = [
  { name: "OperatorOS", setup: 9997, closes: 3 },
  { name: "FlowOps", setup: 4997, closes: 5 },
  { name: "FlowDesk", setup: 2997, closes: 5 },
  { name: "FlowWorker", setup: 1497, closes: 4 },
] as const;

export function funnelTargets(
  closeTarget: number,
  assumptions: GrowthAssumptions = DEFAULT_GROWTH_ASSUMPTIONS,
) {
  const closes = Math.max(0, Math.ceil(closeTarget));
  const proposals = Math.ceil(closes / Math.max(assumptions.proposal_to_close, 0.01));
  const qualified = Math.ceil(proposals / Math.max(assumptions.qualified_to_proposal, 0.01));
  const replies = Math.ceil(qualified / Math.max(assumptions.reply_to_qualified, 0.01));
  const contacts = Math.ceil(replies / Math.max(assumptions.contact_to_reply, 0.01));
  return { contacts, replies, qualified, proposals, closes };
}

export function centralDate(value: Date | string = new Date()) {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

export function businessDaysInclusive(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return 0;
  let count = 0;
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export function clampDate(value: string, min: string, max: string) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function number(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function pct(value: number) {
  return `${Math.round(Math.max(0, value) * 100)}%`;
}

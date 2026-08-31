export type ContentRevenueInputs = {
  qualifiedViews: number;
  visitRatePercent: number;
  buyerRatePercent: number;
  orderValue: number;
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function safePercent(value: number) {
  return Math.min(100, safeNumber(value));
}

export function estimateContentRevenue(inputs: ContentRevenueInputs) {
  const qualifiedViews = safeNumber(inputs.qualifiedViews);
  const visitRatePercent = safePercent(inputs.visitRatePercent);
  const buyerRatePercent = safePercent(inputs.buyerRatePercent);
  const orderValue = safeNumber(inputs.orderValue);
  const pageVisits = qualifiedViews * (visitRatePercent / 100);
  const buyers = pageVisits * (buyerRatePercent / 100);

  return {
    pageVisits,
    buyers,
    revenue: buyers * orderValue,
  };
}

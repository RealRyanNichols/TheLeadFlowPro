export type ContentRevenueInputs = {
  qualifiedViews: number;
  visitRatePercent: number;
  buyerRatePercent: number;
  orderValue: number;
};

function safeNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function estimateContentRevenue(inputs: ContentRevenueInputs) {
  const qualifiedViews = safeNumber(inputs.qualifiedViews);
  const visitRatePercent = safeNumber(inputs.visitRatePercent);
  const buyerRatePercent = safeNumber(inputs.buyerRatePercent);
  const orderValue = safeNumber(inputs.orderValue);
  const pageVisits = qualifiedViews * (visitRatePercent / 100);
  const buyers = pageVisits * (buyerRatePercent / 100);

  return {
    pageVisits,
    buyers,
    revenue: buyers * orderValue,
  };
}

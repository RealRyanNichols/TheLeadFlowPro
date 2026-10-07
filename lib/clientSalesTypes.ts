export type SalesMetricKey = "callsMade" | "answeredCalls" | "missedCalls" | "discoveryCompleted" | "proposalsSent";
export type SalesMetric = { value: number | null; previous: number | null; delta: number | null; percent: number | null; coverage?: string };
export type SalesPeriod = { label: string; start: string; end: string; previousStart: string; previousEnd: string; metrics: Record<SalesMetricKey, SalesMetric> };
export type ClientOpportunity = { id: string; name: string; businessName?: string | null; phone: string | null; source: string | null; status: string; createdAt: string; lastTouch?: { name: string | null; at: string | null }; brief?: string | null; href?: string | null; heat?: number | null; priority?: string | null; closeProbability?: number | null; nextFollowUpAt?: string | null };
export type SalesCall = { id: string; at: string; direction: string; status: string; durationSeconds: number | null; actor?: string | null; outcome?: string | null; source: string; leadName?: string | null };
export type ClientSalesData = { key: string; label: string; status: "available" | "partial" | "unavailable"; message?: string; opportunities: ClientOpportunity[]; periods: Record<"week" | "month" | "year", SalesPeriod>; calls: SalesCall[]; coverage?: string; openProposals?: number | null };
export type SalesReport = { schema: 1; publishedAt: string; clients: ClientSalesData[] };

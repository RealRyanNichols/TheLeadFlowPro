"use client";

import { Analytics } from "@vercel/analytics/next";
import { leadFlowAnalyticsBeforeSend } from "@/lib/analytics-taxonomy";

export function LeadFlowVercelAnalytics() {
  return <Analytics beforeSend={leadFlowAnalyticsBeforeSend} />;
}

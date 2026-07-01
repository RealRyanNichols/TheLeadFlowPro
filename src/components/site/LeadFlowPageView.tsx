"use client";

import { useEffect } from "react";
import { trackLeadFlowEvent } from "@/lib/events";

export function LeadFlowPageView({
  eventName,
  route,
  properties = {},
}: {
  eventName: string;
  route: string;
  properties?: Record<string, string | number | boolean>;
}) {
  useEffect(() => {
    trackLeadFlowEvent(eventName, { route, ...properties });
  }, [eventName, properties, route]);

  return null;
}

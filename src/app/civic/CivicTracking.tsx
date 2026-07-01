"use client";

import { useEffect } from "react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";

export function CivicTracking({
  eventName,
  route,
  properties = {},
}: {
  eventName: string;
  route: string;
  properties?: Record<string, string | number | boolean>;
}) {
  const propertyKey = JSON.stringify(properties);

  useEffect(() => {
    const parsedProperties = JSON.parse(propertyKey) as Record<string, string | number | boolean>;
    trackLeadFlowEvent(eventName, { route, ...parsedProperties });
  }, [eventName, propertyKey, route]);

  return null;
}

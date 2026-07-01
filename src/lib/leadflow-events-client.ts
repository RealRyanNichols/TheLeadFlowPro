"use client";

import { track } from "@vercel/analytics";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";

export function trackLeadFlowEvent(eventName: string, properties: Record<string, unknown> = {}) {
  try {
    track(eventName, sanitizeLeadFlowEventProperties(properties));
  } catch {
    // LeadFlow analytics must never block review, buyer, or intake workflows.
  }
}

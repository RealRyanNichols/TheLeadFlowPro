// Shared fixtures for the plugin tests: one business, one lead, one clock.

import { parseWorkspace } from "../../lib/hq/settings.ts";
import type { Lead, Workspace } from "../../lib/hq/types.ts";

export const NOW = new Date("2026-09-14T14:00:00Z"); // Monday 9:00 a.m. Central

export function workspace(over: Partial<Workspace> = {}): Workspace {
  return parseWorkspace({
    id: "ws-1",
    slug: "kirby-plumbing",
    name: "Kirby Plumbing",
    owner_id: "user-1",
    owner_name: "Dan Kirby",
    industry: "plumbing",
    phone: "+19035550142",
    email: "dan@kirbyplumbing.com",
    website: "https://kirbyplumbing.com",
    city: "Longview",
    state: "TX",
    timezone: "America/Chicago",
    brand_color: "#0B5A33",
    voice: "plain",
    services: ["Water heater replacement", "Drain cleaning", "Leak repair"],
    offer: "$50 off any water heater install this month",
    review_link: "https://g.page/r/kirby/review",
    plan: "active",
    settings: {},
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...over,
  });
}

export function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: over.id ?? "lead-1",
    workspace_id: "ws-1",
    created_at: over.created_at ?? new Date(NOW.getTime() - 10 * 60_000).toISOString(),
    updated_at: NOW.toISOString(),
    name: "Jamie Rivera",
    phone: "+19035550199",
    email: "jamie@example.com",
    source: "website",
    source_detail: null,
    message: "Water heater is leaking, need someone today",
    service: "Water heater replacement",
    status: "new",
    score: 0,
    first_contact_at: null,
    last_contact_at: null,
    next_follow_up_at: null,
    follow_up_step: 0,
    value_cents: null,
    notes: null,
    consent_sms: true,
    consent_email: true,
    unsubscribed_at: null,
    auto_replied_at: null,
    external_id: null,
    meta: {},
    ...over,
  };
}

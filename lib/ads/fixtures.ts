// Fictional sandbox data for the ads reporting engine. One made-up
// business, two weeks of made-up spend on two platforms, and a handful of
// made-up leads with outcomes. Used by the demo page when a workspace has
// no ad data, by the sandbox provider, and by the tests. Nothing here is a
// real account, a real person, or a real result.

import type { Lead, Workspace } from "../hq/types";
import { parseWorkspace } from "../hq/settings";
import type { AdsDailyRow } from "./types";

export const SAMPLE_LABEL = "Sample data: a fictional business, not a real client.";

export const SAMPLE_NOW = new Date("2026-09-14T14:00:00Z"); // Monday 9:00 a.m. Central

export function sampleWorkspace(): Workspace {
  return parseWorkspace({
    id: "ws-sample",
    slug: "fixture-fence-co",
    name: "Fixture Fence Co (fictional)",
    owner_id: "user-sample",
    owner_name: "Sam Fixture",
    industry: "fencing",
    phone: "+19035550100",
    email: "hello@fixture-fence.example",
    city: "Longview",
    state: "TX",
    timezone: "America/Chicago",
    plan: "active",
    settings: {},
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  });
}

function day(offset: number): string {
  const d = new Date(Date.UTC(2026, 8, 13)); // Sept 13, the day before SAMPLE_NOW's local date
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Fourteen days ending the day before SAMPLE_NOW. Deterministic, no randomness. */
export function sampleAdsRows(workspaceId = "ws-sample"): AdsDailyRow[] {
  const rows: AdsDailyRow[] = [];
  for (let i = 0; i < 14; i++) {
    const date = day(i);
    const weekend = new Date(`${date}T12:00:00Z`).getUTCDay() % 6 === 0;
    rows.push({
      workspace_id: workspaceId,
      platform: "meta",
      account_id: "act_000000000",
      campaign: "Privacy fence quotes",
      date,
      spend_cents: weekend ? 1800 : 2650,
      currency: "USD",
      impressions: weekend ? 900 : 1400,
      clicks: weekend ? 14 : 23,
      platform_leads: i % 3 === 0 ? 1 : 0,
    });
    rows.push({
      workspace_id: workspaceId,
      platform: "google",
      account_id: "123-456-7890",
      campaign: "Fence repair Longview",
      date,
      spend_cents: weekend ? 1200 : 2100,
      currency: "USD",
      impressions: weekend ? 300 : 520,
      clicks: weekend ? 9 : 17,
      platform_leads: i % 4 === 0 ? 1 : 0,
    });
  }
  return rows;
}

function at(dayOffset: number, hour: number): string {
  return `${day(dayOffset)}T${String(hour).padStart(2, "0")}:00:00-05:00`;
}

function mk(over: Partial<Lead> & { id: string; name: string; created_at: string }): Lead {
  return {
    workspace_id: "ws-sample",
    updated_at: over.created_at,
    phone: null,
    email: null,
    source: "website",
    source_detail: null,
    message: null,
    service: null,
    status: "new",
    score: 0,
    first_contact_at: null,
    last_contact_at: null,
    next_follow_up_at: null,
    follow_up_step: 0,
    value_cents: null,
    notes: null,
    consent_sms: false,
    consent_email: false,
    unsubscribed_at: null,
    auto_replied_at: null,
    external_id: null,
    meta: {},
    ...over,
  };
}

/** Leads across both weeks. Names are invented. */
export function sampleLeads(): Lead[] {
  return [
    // This week: Meta
    mk({ id: "s-1", name: "Avery Stone", created_at: at(6, 9), source: "meta", meta: { utm_campaign: "Privacy fence quotes" }, first_contact_at: at(6, 9), auto_replied_at: at(6, 9), last_contact_at: at(3, 10), status: "won", value_cents: 480000 }),
    mk({ id: "s-2", name: "Blair Reyes", created_at: at(5, 14), source: "meta", meta: { utm_campaign: "Privacy fence quotes" }, first_contact_at: at(5, 15), last_contact_at: at(5, 15), status: "quoted" }),
    mk({ id: "s-3", name: "Casey Lin", created_at: at(3, 11), source: "meta", meta: { utm_campaign: "Privacy fence quotes" }, first_contact_at: at(3, 11), last_contact_at: at(2, 9), status: "booked" }),
    mk({ id: "s-4", name: "Drew Patel", created_at: at(1, 17), source: "meta", meta: { utm_campaign: "Privacy fence quotes" }, status: "new" }),
    // This week: Google
    mk({ id: "s-5", name: "Emerson Cole", created_at: at(4, 8), source: "website", source_detail: "google_ads", meta: { utm_source: "google", utm_campaign: "Fence repair Longview" }, first_contact_at: at(4, 8), last_contact_at: at(4, 8), status: "contacted" }),
    mk({ id: "s-6", name: "Finley Ortiz", created_at: at(2, 13), source: "website", meta: { utm_source: "google", utm_campaign: "Fence repair Longview" }, first_contact_at: at(2, 13), last_contact_at: at(1, 9), status: "won", value_cents: null }),
    // This week: not ads
    mk({ id: "s-7", name: "Gray Nakamura", created_at: at(3, 16), source: "call", first_contact_at: at(3, 16), status: "contacted" }),
    mk({ id: "s-8", name: "Spam Bot", created_at: at(2, 3), source: "form", status: "spam" }),
    // Prior week
    mk({ id: "s-9", name: "Harper Diaz", created_at: at(12, 10), source: "meta", first_contact_at: at(12, 10), last_contact_at: at(10, 10), status: "lost" }),
    mk({ id: "s-10", name: "Indigo Bell", created_at: at(9, 9), source: "meta", first_contact_at: at(9, 9), last_contact_at: at(8, 9), status: "won", value_cents: 320000 }),
    mk({ id: "s-11", name: "Jules Park", created_at: at(11, 15), source: "website", meta: { utm_source: "google" }, first_contact_at: at(11, 15), status: "contacted" }),
  ];
}

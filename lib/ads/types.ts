// Ads reporting engine: shared types.
//
// One workspace is one client. Ad spend rows belong to exactly one workspace
// and come from that client's own ad account through that client's own
// token. The report is built from those rows plus the client's own lead
// records, never from another client's anything.

export type AdPlatform = "meta" | "google";

export const AD_PLATFORMS: AdPlatform[] = ["meta", "google"];

export const PLATFORM_LABEL: Record<AdPlatform, string> = { meta: "Meta ads", google: "Google ads" };

/** One campaign on one day, as the platform reported it. Money is integer cents. */
export type AdsDailyRow = {
  workspace_id: string;
  platform: AdPlatform;
  account_id: string;
  campaign: string;
  /** YYYY-MM-DD in the workspace's timezone (the platform reports by account timezone; we store what it says). */
  date: string;
  spend_cents: number;
  currency: string;
  impressions: number;
  clicks: number;
  /** Leads the platform itself counted (its pixel or lead form). Not the client's records. */
  platform_leads: number;
};

export type AdsRange = { start: string; end: string };

/** What a provider returns. Never includes the token it was given. */
export type ProviderResult =
  | { ok: true; rows: AdsDailyRow[]; fetchedAt: string }
  | { ok: false; error: string; code: "not_configured" | "auth" | "provider" | "disabled" };

export type AdsReportStatus = "draft" | "approved" | "sent";

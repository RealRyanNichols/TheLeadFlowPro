/**
 * ZERO-STATE data for a freshly-onboarded account.
 *
 * Founding product rule: no fake stats once logged in. Every number below
 * starts at 0 and is replaced with real values as integrations connect and
 * leads flow in. Do NOT inflate any figure here "for demo purposes" — the
 * whole Trust edge of LeadFlow Pro depends on this staying honest.
 *
 * The file keeps its original name and export shapes so every component
 * that imports from it continues to type-check. Visual empty-state / CTA
 * handling lives inside the individual dashboard pages.
 */

export const MOCK_USER = {
  name: "",
  businessName: "",
  industry: "",
  plan: "free" as const,
};

export const MOCK_KPIS = {
  newLeadsThisMonth: 0,
  costPerLead: 0,
  adSpend: 0,
  missedCallsRecovered: 0,
  responseRateMinutes: 0,
  conversionRate: 0,
};

export const MOCK_LEADS: Array<{
  id: string;
  name: string;
  phone: string;
  source: "ad_meta" | "ad_google" | "call" | "form" | "dm_instagram" | "referral";
  status: "new" | "contacted" | "nurturing" | "qualified" | "booked" | "won" | "lost";
  createdAt: Date;
  estValue: number;
  notes: string;
}> = [];

export const MOCK_NEXT_MOVES: Array<{
  id: string;
  priority: number;
  title: string;
  body: string;
  kind:
    | "send_message"
    | "run_ad"
    | "follow_up"
    | "post_content"
    | "review_request"
    | "call_back";
  suggestedAction: string;
}> = [];

export const MOCK_AUTOMATIONS: Array<{
  id: string;
  name: string;
  trigger: string;
  status: "active" | "paused" | "draft";
  runsThisMonth: number;
  leadsRecovered: number;
}> = [];

// Social rows render as disconnected skeletons so the /dashboard/social page
// shows real "Connect <platform>" CTAs instead of invented follower counts.
export const MOCK_SOCIAL: Array<{
  platform: "instagram" | "tiktok" | "facebook" | "x" | "youtube" | "linkedin";
  handle: string;
  followers: number;
  engagement: number;
  growth7d: number;
  connected: boolean;
}> = [
  { platform: "instagram", handle: "", followers: 0, engagement: 0, growth7d: 0, connected: false },
  { platform: "tiktok",    handle: "", followers: 0, engagement: 0, growth7d: 0, connected: false },
  { platform: "facebook",  handle: "", followers: 0, engagement: 0, growth7d: 0, connected: false },
  { platform: "x",         handle: "", followers: 0, engagement: 0, growth7d: 0, connected: false },
  { platform: "youtube",   handle: "", followers: 0, engagement: 0, growth7d: 0, connected: false },
];

export const MOCK_CHART: Array<{ day: string; leads: number }> = [
  { day: "Mon", leads: 0 },
  { day: "Tue", leads: 0 },
  { day: "Wed", leads: 0 },
  { day: "Thu", leads: 0 },
  { day: "Fri", leads: 0 },
  { day: "Sat", leads: 0 },
  { day: "Sun", leads: 0 },
];

export const MOCK_FLOWCARD = {
  slug: "",
  displayName: "",
  tagline: "",
  bio: "",
  avatarUrl: "",
  themeAccent: "#23b8ff",
  phone: "",
  email: "",
  websiteUrl: "",
  views: 0,
  qrScans: 0,
  followAllClicks: 0,
  links: [] as Array<{ platform: string; label: string; url: string; handle: string }>,
};

export const MOCK_MEDIA: Array<{
  id: string;
  kind: "video" | "gif" | "image";
  title: string;
  tags: string[];
  bestFor: string;
}> = [];

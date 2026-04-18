/**
 * Supported social platforms for LeadFlow Pro.
 *
 * Every platform ships with:
 *   - kinds it supports (personal vs business/page vs channel)
 *   - OAuth status (ready / pending-approval / manual-only)
 *   - per-platform limits (e.g. Facebook 1 personal + 1 business page on Free)
 *
 * The "manual-only" platforms accept a public handle and we pull what we can
 * from public endpoints — we never invent follower counts, per the
 * no-fake-stats rule.
 */

export type PlatformKind = "personal" | "business_page" | "channel";

export type PlatformId =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "x"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "threads"
  | "reddit"
  | "googlebusiness";

export type ConnectMode = "oauth" | "pending_approval" | "manual_only";

export interface PlatformSpec {
  id: PlatformId;
  label: string;
  /** Kinds the platform distinguishes between — e.g. Facebook has both. */
  kinds: PlatformKind[];
  /** How users connect today. */
  connectMode: ConnectMode;
  /** If set, Free-tier users get at most this many accounts of this platform.
   *  If unset, only the global social-connection cap applies. */
  freeKindCaps?: Partial<Record<PlatformKind, number>>;
  /** Short "what we pull" blurb shown on the connect screen. */
  pulls: string;
  /** Why OAuth might not be live yet (shown on pending_approval platforms). */
  pendingReason?: string;
}

export const PLATFORMS: PlatformSpec[] = [
  {
    id: "instagram",
    label: "Instagram",
    kinds: ["personal", "business_page"],
    connectMode: "pending_approval",
    pulls: "Followers, engagement rate, top posts, reels reach.",
    pendingReason: "Meta's Instagram Graph API review is in progress."
  },
  {
    id: "tiktok",
    label: "TikTok",
    kinds: ["personal", "business_page"],
    connectMode: "pending_approval",
    pulls: "Followers, video views, engagement, top-performing sounds.",
    pendingReason: "TikTok Business API access under review."
  },
  {
    id: "facebook",
    label: "Facebook",
    kinds: ["personal", "business_page"],
    connectMode: "pending_approval",
    // Free tier: exactly 1 personal profile + 1 business page allowed.
    freeKindCaps: { personal: 1, business_page: 1 },
    pulls: "Page followers, post reach, impressions, top posts.",
    pendingReason: "Meta app review pending for Pages + Profile scopes."
  },
  {
    id: "x",
    label: "X (Twitter)",
    kinds: ["personal", "business_page"],
    connectMode: "manual_only",
    pulls: "Public profile stats via handle — followers, bio, recent posts.",
    pendingReason: "X API v2 paid tier required for full OAuth."
  },
  {
    id: "youtube",
    label: "YouTube",
    kinds: ["channel"],
    connectMode: "pending_approval",
    pulls: "Subscribers, total views, recent video performance.",
    pendingReason: "Google OAuth consent screen verification in progress."
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    kinds: ["personal", "business_page"],
    connectMode: "pending_approval",
    pulls: "Connections / page followers, post impressions, engagement.",
    pendingReason: "LinkedIn Marketing API access under review."
  },
  {
    id: "pinterest",
    label: "Pinterest",
    kinds: ["personal", "business_page"],
    connectMode: "pending_approval",
    pulls: "Monthly views, saves, top boards and pins.",
    pendingReason: "Pinterest Business API access under review."
  },
  {
    id: "snapchat",
    label: "Snapchat",
    kinds: ["personal", "business_page"],
    connectMode: "manual_only",
    pulls: "Public profile link — we track clicks to your Snap, not in-app stats.",
    pendingReason: "Snapchat doesn't offer a public metrics API for personal/business accounts."
  },
  {
    id: "threads",
    label: "Threads",
    kinds: ["personal"],
    connectMode: "pending_approval",
    pulls: "Followers, replies, reposts, top threads.",
    pendingReason: "Meta Threads API just opened — review pending."
  },
  {
    id: "reddit",
    label: "Reddit",
    kinds: ["personal"],
    connectMode: "oauth",
    pulls: "Karma, subreddit activity, top comments and posts."
  },
  {
    id: "googlebusiness",
    label: "Google Business Profile",
    kinds: ["business_page"],
    connectMode: "pending_approval",
    pulls: "Profile views, direction requests, calls, review count + average.",
    pendingReason: "Google Business Profile API verification in progress."
  }
];

export function platformById(id: string): PlatformSpec | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id);

/** Human-readable label for a kind — used in the connect chooser. */
export function kindLabel(kind: PlatformKind): string {
  return kind === "personal"
    ? "Personal profile"
    : kind === "business_page"
    ? "Business / Page"
    : "Channel";
}

/** Total social-connection cap for each plan. Pulled out of pricing.ts so
 *  API routes can import without importing the whole PLANS array. */
export const FREE_TOTAL_SOCIAL_CAP = 2;

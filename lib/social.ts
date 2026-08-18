export const FACEBOOK_GRAPH_VERSION = "v26.0";

export const SOCIAL_MEDIA_TYPES = ["text", "link", "photo", "video"] as const;
export type SocialMediaType = (typeof SOCIAL_MEDIA_TYPES)[number];

export const SOCIAL_POST_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "published",
  "failed",
  "cancelled",
] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const SOCIAL_CONTENT_PILLARS = [
  "Missed Leads",
  "Serious Buyer Filter",
  "Operator Proof",
  "Get Past the Reef",
  "System Over Content",
  "AI Agents",
  "Facebook and Instagram Ads",
  "Business Owner Truth",
] as const;

export const DEFAULT_SOCIAL_SLOTS = ["07:15", "10:30", "13:30", "16:30", "19:45"];
export const SOCIAL_TIMEZONE = "America/Chicago";

export type SocialPostInput = {
  message: string;
  media_type: SocialMediaType;
  media_url: string | null;
  link_url: string | null;
  content_pillar: string | null;
  campaign: string | null;
  internal_notes: string | null;
  scheduled_for: string | null;
  timezone: string;
  source: "manual" | "chatgpt" | "import" | "api";
};

export type SocialValidation =
  | { ok: true; value: SocialPostInput }
  | { ok: false; errors: string[] };

function cleanOptional(value: unknown, max: number): string | null {
  const out = String(value ?? "").trim();
  if (!out) return null;
  return out.slice(0, max);
}

function isHttpsUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function hashtagCount(message: string): number {
  return message.match(/(^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0;
}

export function validateSocialPostInput(input: unknown): SocialValidation {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const message = String(body.message ?? "").trim();
  const requestedType = String(body.media_type ?? "text");
  const mediaType = SOCIAL_MEDIA_TYPES.includes(requestedType as SocialMediaType)
    ? (requestedType as SocialMediaType)
    : null;
  const mediaUrl = cleanOptional(body.media_url, 2000);
  const linkUrl = cleanOptional(body.link_url, 2000);
  const contentPillar = cleanOptional(body.content_pillar, 100);
  const campaign = cleanOptional(body.campaign, 160);
  const internalNotes = cleanOptional(body.internal_notes, 3000);
  const timezone = cleanOptional(body.timezone, 100) || SOCIAL_TIMEZONE;
  const sourceValue = String(body.source ?? "manual");
  const source = (["manual", "chatgpt", "import", "api"] as const).includes(
    sourceValue as SocialPostInput["source"],
  )
    ? (sourceValue as SocialPostInput["source"])
    : "manual";

  let scheduledFor: string | null = null;
  if (body.scheduled_for) {
    const parsed = new Date(String(body.scheduled_for));
    if (!Number.isNaN(parsed.valueOf())) scheduledFor = parsed.toISOString();
  }

  const errors: string[] = [];
  if (!message) errors.push("Write the post before saving it.");
  if (message.length > 12000) errors.push("Keep the Facebook post under 12,000 characters.");
  if (message.includes("—")) errors.push("Remove the em dash. LeadFlow Pro posts do not use it.");
  if (hashtagCount(message) > 2) errors.push("Use no more than two hashtags.");
  if (!mediaType) errors.push("Choose a supported media type.");
  if (body.scheduled_for && !scheduledFor) errors.push("Choose a valid schedule date and time.");

  if (mediaType === "photo" && !isHttpsUrl(mediaUrl)) {
    errors.push("A photo post needs a public HTTPS image URL.");
  }
  if (mediaType === "video" && !isHttpsUrl(mediaUrl)) {
    errors.push("A video post needs a public HTTPS video URL.");
  }
  if (mediaType === "link" && !isHttpsUrl(linkUrl)) {
    errors.push("A link post needs a public HTTPS destination URL.");
  }

  if (errors.length || !mediaType) return { ok: false, errors };
  return {
    ok: true,
    value: {
      message,
      media_type: mediaType,
      media_url: mediaUrl,
      link_url: linkUrl,
      content_pillar: contentPillar,
      campaign,
      internal_notes: internalNotes,
      scheduled_for: scheduledFor,
      timezone,
      source,
    },
  };
}

export function validateMetaSchedule(
  scheduledFor: string | null,
  now = new Date(),
): { mode: "publish" | "schedule"; unixTime?: number; error?: string } {
  if (!scheduledFor) return { mode: "publish" };
  const scheduled = new Date(scheduledFor);
  if (Number.isNaN(scheduled.valueOf())) {
    return { mode: "schedule", error: "The scheduled time is invalid." };
  }
  const diff = scheduled.valueOf() - now.valueOf();
  const tenMinutes = 10 * 60 * 1000;
  const seventyFiveDays = 75 * 24 * 60 * 60 * 1000;
  if (diff < tenMinutes) {
    return {
      mode: "schedule",
      error: "Meta requires scheduled posts to be at least 10 minutes in the future.",
    };
  }
  if (diff > seventyFiveDays) {
    return {
      mode: "schedule",
      error: "Meta only accepts scheduled posts up to 75 days in advance.",
    };
  }
  return { mode: "schedule", unixTime: Math.floor(scheduled.valueOf() / 1000) };
}

export function validDailySlots(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 5 &&
    value.every((slot) => typeof slot === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot))
  );
}

export function centralTimeLabel(value: string | null): string {
  if (!value) return "Publish immediately after approval";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Invalid schedule";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SOCIAL_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

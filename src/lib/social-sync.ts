// src/lib/social-sync.ts — Public-stats sync for connected social accounts.
//
// Fetches real follower / engagement numbers from each platform's public APIs
// and writes them onto the SocialAccount row. Runs server-side only.
//
// Per-platform status:
//   YouTube — ✅ implemented via Data API v3 (requires YOUTUBE_API_KEY env)
//   X       — ⏳ stub (requires X_BEARER_TOKEN env + paid Basic tier)
//   Facebook — ⏳ stub (requires Meta App Review + page access token)
//   Instagram — ⏳ stub (requires Meta App Review + IG Business linked to FB)
//   TikTok  — ⏳ stub (requires Display API approval)
//
// Design rule: every fetcher returns { ok, followers, engagement, error? }
// and silently sets followers=0 when API access isn't configured. This
// preserves the no-fake-stats guarantee — we never invent numbers.

export type SyncResult =
  | { ok: true; followers: number; following?: number; posts?: number; engagement?: number }
  | { ok: false; reason: string; needsConfig?: boolean };

/* ─── YouTube ──────────────────────────────────────────────────── */

export async function syncYouTube(handle: string): Promise<SyncResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "YOUTUBE_API_KEY not set in Vercel", needsConfig: true };
  }

  // Normalize the handle to one of: @handle, channel/UCxxxx, c/customName, user/legacyName
  const cleaned = handle
    .replace(/^https?:\/\/(www\.)?youtube\.com\//i, "")
    .replace(/\/+$/, "")
    .trim();

  // Build the right query depending on what kind of identifier the user gave us.
  // Newest: handles look like @ryan-nichols
  // Older: channel IDs start with UC and are 24 chars; legacy /user/ ; vanity /c/
  let queryParam: string;
  let queryValue: string;

  if (cleaned.startsWith("@")) {
    queryParam = "forHandle";
    queryValue = cleaned;
  } else if (cleaned.startsWith("channel/")) {
    queryParam = "id";
    queryValue = cleaned.replace("channel/", "");
  } else if (cleaned.startsWith("user/")) {
    queryParam = "forUsername";
    queryValue = cleaned.replace("user/", "");
  } else if (/^UC[\w-]{20,30}$/.test(cleaned)) {
    queryParam = "id";
    queryValue = cleaned;
  } else if (cleaned.startsWith("c/")) {
    // Vanity URLs aren't directly supported by the API. Fall back to handle.
    queryParam = "forHandle";
    queryValue = "@" + cleaned.replace("c/", "");
  } else {
    // Treat raw input as a handle if no other pattern matched.
    queryParam = "forHandle";
    queryValue = cleaned.startsWith("@") ? cleaned : "@" + cleaned;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "statistics,snippet");
  url.searchParams.set(queryParam, queryValue);
  url.searchParams.set("key", apiKey);

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    return { ok: false, reason: `YouTube API fetch failed: ${(err as Error).message}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `YouTube API ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = (await res.json()) as {
    items?: Array<{ statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }>;
  };

  const stats = data.items?.[0]?.statistics;
  if (!stats) {
    return { ok: false, reason: "YouTube returned no channel for that handle" };
  }

  const subs = parseInt(stats.subscriberCount ?? "0", 10) || 0;
  const videos = parseInt(stats.videoCount ?? "0", 10) || 0;

  // Engagement isn't a single number for YouTube — leave it 0 for now (we'll
  // compute it from average-views-per-video / subscriber-count later).
  return {
    ok: true,
    followers: subs,
    posts: videos,
    engagement: 0,
  };
}

/* ─── X / Twitter ──────────────────────────────────────────────── */

export async function syncX(handle: string): Promise<SyncResult> {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) {
    return { ok: false, reason: "X_BEARER_TOKEN not set (X paid Basic tier required, $100/mo)", needsConfig: true };
  }

  const username = handle.replace(/^@/, "").trim();
  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, reason: `X API fetch failed: ${(err as Error).message}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `X API ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = (await res.json()) as {
    data?: { public_metrics?: { followers_count?: number; following_count?: number; tweet_count?: number } };
  };
  const m = data.data?.public_metrics;
  if (!m) return { ok: false, reason: "X returned no user for that handle" };

  return {
    ok: true,
    followers: m.followers_count ?? 0,
    following: m.following_count ?? 0,
    posts: m.tweet_count ?? 0,
    engagement: 0,
  };
}

/* ─── Facebook + Instagram + TikTok stubs ─────────────────────── */

export async function syncFacebook(_handle: string): Promise<SyncResult> {
  if (!process.env.FB_PAGE_ACCESS_TOKEN) {
    return { ok: false, reason: "FB_PAGE_ACCESS_TOKEN not set (requires Meta App Review)", needsConfig: true };
  }
  // TODO: Graph API: GET /{page-id}?fields=fan_count,followers_count
  return { ok: false, reason: "Facebook sync not yet implemented" };
}

export async function syncInstagram(_handle: string): Promise<SyncResult> {
  if (!process.env.IG_ACCESS_TOKEN) {
    return { ok: false, reason: "IG_ACCESS_TOKEN not set (requires IG Business + Meta App Review)", needsConfig: true };
  }
  return { ok: false, reason: "Instagram sync not yet implemented" };
}

export async function syncTikTok(_handle: string): Promise<SyncResult> {
  if (!process.env.TIKTOK_DISPLAY_API_KEY) {
    return { ok: false, reason: "TIKTOK_DISPLAY_API_KEY not set (requires TikTok Display API approval)", needsConfig: true };
  }
  return { ok: false, reason: "TikTok sync not yet implemented" };
}

/* ─── Cached homepage helper ───────────────────────────────────── */

// Server-side cached fetch for the homepage's "live" YouTube stat.
// Uses Next.js ISR (revalidate every 1 hour) so we don't burn quota.
// Falls back to null if the API key isn't set or the channel isn't found.

export async function getYouTubeStatsCached(
  handle: string,
): Promise<{ subscribers: number; videos: number; views: number } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const cleaned = handle.replace(/^@/, "").trim();
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "statistics");
  url.searchParams.set("forHandle", "@" + cleaned);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: Array<{ statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }>;
    };
    const s = data.items?.[0]?.statistics;
    if (!s) return null;
    return {
      subscribers: parseInt(s.subscriberCount ?? "0", 10) || 0,
      videos: parseInt(s.videoCount ?? "0", 10) || 0,
      views: parseInt(s.viewCount ?? "0", 10) || 0,
    };
  } catch {
    return null;
  }
}

// Same pattern for X / Twitter — gated on X_BEARER_TOKEN env var.
export async function getXStatsCached(
  handle: string,
): Promise<{ followers: number; following: number; posts: number } | null> {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return null;

  const username = handle.replace(/^@/, "").trim();
  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearer}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { public_metrics?: { followers_count?: number; following_count?: number; tweet_count?: number } };
    };
    const m = data.data?.public_metrics;
    if (!m) return null;
    return {
      followers: m.followers_count ?? 0,
      following: m.following_count ?? 0,
      posts: m.tweet_count ?? 0,
    };
  } catch {
    return null;
  }
}

// Facebook — gated on FB_PAGE_ACCESS_TOKEN env var.
// Pass either the numeric Page ID or the vanity username (e.g. "RealRyanNichols").
export async function getFacebookStatsCached(
  pageIdOrUsername: string,
): Promise<{ fanCount: number; followerCount: number } | null> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return null;

  const id = pageIdOrUsername.replace(/^https?:\/\/.*?facebook\.com\//i, "").replace(/\/.*$/, "").trim();
  const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(id)}?fields=fan_count,followers_count&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { fan_count?: number; followers_count?: number };
    return {
      fanCount: data.fan_count ?? 0,
      followerCount: data.followers_count ?? 0,
    };
  } catch {
    return null;
  }
}

/* ─── Dispatcher ───────────────────────────────────────────────── */

export async function syncSocialAccount(
  platform: string,
  handle: string,
): Promise<SyncResult> {
  switch (platform.toLowerCase()) {
    case "youtube":  return syncYouTube(handle);
    case "x":
    case "twitter": return syncX(handle);
    case "facebook": return syncFacebook(handle);
    case "instagram": return syncInstagram(handle);
    case "tiktok":   return syncTikTok(handle);
    default:
      return { ok: false, reason: `Sync not yet supported for ${platform}` };
  }
}

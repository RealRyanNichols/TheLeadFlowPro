import { NextRequest, NextResponse } from "next/server";
import { createSiteShareLink } from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SHARE_TEXT =
  "One site. One page. One share. Watch The LeadFlow Pro show attention turning into clicks.";

function cleanPlatform(value: unknown) {
  if (typeof value !== "string") return "copy";
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "copy";
}

function cleanPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/pulse";
  return value.split("?")[0].slice(0, 180) || "/pulse";
}

function intentUrl(platform: string, shareUrl: string, text: string) {
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);

  if (platform === "x" || platform === "twitter") {
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  }
  if (platform === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
  if (platform === "linkedin") {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  }
  return shareUrl;
}

export async function POST(req: NextRequest) {
  let body: {
    visitorId?: unknown;
    platform?: unknown;
    path?: unknown;
    title?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const platform = cleanPlatform(body.platform);
    const path = cleanPath(body.path);
    const created = await createSiteShareLink({
      visitorId: body.visitorId,
      platform,
      path,
      title: body.title,
      source: "pulse-share-button",
    });

    const shareUrl = new URL(created.path, req.url);
    shareUrl.searchParams.set("lf_share", created.token);
    shareUrl.searchParams.set("utm_source", created.platform);
    shareUrl.searchParams.set("utm_medium", "social_share");
    shareUrl.searchParams.set("utm_campaign", "live_leadflow_counter");

    return NextResponse.json(
      {
        ok: true,
        token: created.token,
        shareUrl: shareUrl.toString(),
        text: SHARE_TEXT,
        intentUrl: intentUrl(created.platform, shareUrl.toString(), SHARE_TEXT),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "share_create_failed",
        detail: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}

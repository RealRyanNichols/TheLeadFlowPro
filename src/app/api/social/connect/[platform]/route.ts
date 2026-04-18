/**
 * GET /api/social/connect/[platform]
 *
 * Kicks off the OAuth dance for supported platforms. For platforms that are
 * still in review (Meta, LinkedIn, Google) we don't 404 — we redirect back to
 * the connect page, which will present the manual-import form with the right
 * "pending approval" context.
 *
 * Per-platform OAuth specifics:
 *   - reddit:   Reddit "web" app OAuth (identity, mysubreddits scopes)
 *   - everything else: pending_approval → redirect to /dashboard/social/connect/[p]
 */

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { canConnectSocial } from "@/lib/social-server";
import { platformById, type PlatformKind, type PlatformId } from "@/lib/social-platforms";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { platform: string };
}

export async function GET(req: Request, { params }: Ctx) {
  const spec = platformById(params.platform);
  if (!spec) {
    return NextResponse.redirect(new URL("/dashboard/social", req.url));
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/login?next=/dashboard/social/connect/${params.platform}`, req.url),
    );
  }

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") as PlatformKind | null) ?? spec.kinds[0];
  if (!spec.kinds.includes(kind)) {
    return NextResponse.redirect(
      new URL(`/dashboard/social/connect/${params.platform}`, req.url),
    );
  }

  // Plan-cap guard
  const guard = await canConnectSocial({
    userId,
    platform: spec.id as PlatformId,
    kind,
  });
  if (!guard.ok) {
    const next = new URL(`/dashboard/social/connect/${params.platform}`, req.url);
    next.searchParams.set("error", guard.reason ?? "Plan limit reached");
    return NextResponse.redirect(next);
  }

  // If OAuth isn't live yet, send them back to the connect page which renders
  // the manual-import form instead.
  if (spec.connectMode !== "oauth") {
    return NextResponse.redirect(
      new URL(`/dashboard/social/connect/${params.platform}#${kind}`, req.url),
    );
  }

  // --- Reddit is the only OAuth-ready platform today -----------------------
  if (spec.id === "reddit") {
    const clientId = process.env.REDDIT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/social/connect/reddit?error=${encodeURIComponent(
            "Reddit OAuth isn't configured yet — please use manual import for now.",
          )}`,
          req.url,
        ),
      );
    }
    const state = `${userId}.${kind}.${randomBytes(16).toString("hex")}`;
    const redirectUri = `${url.origin}/api/social/callback/reddit`;
    const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("duration", "permanent");
    authUrl.searchParams.set("scope", "identity mysubreddits read");
    const res = NextResponse.redirect(authUrl.toString());
    // Cookie-based state validation on callback
    res.cookies.set("lf_social_state", state, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600,
    });
    return res;
  }

  // Fallback — unknown oauth platform, send back with an explanatory error
  return NextResponse.redirect(
    new URL(
      `/dashboard/social/connect/${params.platform}?error=${encodeURIComponent(
        "OAuth handler not implemented yet — use manual import.",
      )}`,
      req.url,
    ),
  );
}

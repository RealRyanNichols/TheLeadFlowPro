/**
 * GET /api/social/callback/[platform]
 *
 * Handles the OAuth return leg. Currently supports Reddit; everything else
 * either runs through manual import or is awaiting API approval.
 *
 * On success → creates the SocialAccount row and redirects to /dashboard/social.
 * On any failure → redirects to the connect page with ?error=…
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canConnectSocial } from "@/lib/social-server";
import { platformById, type PlatformKind, type PlatformId } from "@/lib/social-platforms";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { platform: string };
}

function back(req: Request, platform: string, error?: string) {
  const url = new URL(`/dashboard/social/connect/${platform}`, req.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: Request, { params }: Ctx) {
  const spec = platformById(params.platform);
  if (!spec) return NextResponse.redirect(new URL("/dashboard/social", req.url));

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.redirect(
      new URL(`/login?next=/dashboard/social/connect/${params.platform}`, req.url),
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return back(req, params.platform, `Provider returned: ${oauthError}`);
  if (!code || !state) return back(req, params.platform, "Missing code/state on callback.");

  // State must match the cookie we set on the connect leg.
  const cookie = req.headers.get("cookie") ?? "";
  const cookieState = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("lf_social_state="))
    ?.split("=")[1];
  if (!cookieState || cookieState !== state) {
    return back(req, params.platform, "State mismatch. Try connecting again.");
  }

  const [stateUserId, stateKind] = state.split(".");
  if (stateUserId !== userId) {
    return back(req, params.platform, "Session mismatch. Sign in and retry.");
  }
  const kind = stateKind as PlatformKind;
  if (!spec.kinds.includes(kind)) {
    return back(req, params.platform, "Invalid account kind.");
  }

  const guard = await canConnectSocial({
    userId,
    platform: spec.id as PlatformId,
    kind,
  });
  if (!guard.ok) return back(req, params.platform, guard.reason);

  // ----- Reddit token exchange + identity fetch ---------------------------
  if (spec.id === "reddit") {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return back(req, "reddit", "Reddit OAuth env vars missing on the server.");
    }
    const redirectUri = `${url.origin}/api/social/callback/reddit`;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    let tokenJson: { access_token?: string; refresh_token?: string; expires_in?: number };
    try {
      const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          authorization: `Basic ${basic}`,
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "leadflow-pro/0.1 by leadflowpro",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.access_token) {
        return back(req, "reddit", "Reddit denied the token exchange.");
      }
    } catch {
      return back(req, "reddit", "Couldn't reach Reddit's token endpoint.");
    }

    // Pull the username (Reddit /api/v1/me)
    let me: { name?: string; total_karma?: number };
    try {
      const meRes = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          authorization: `Bearer ${tokenJson.access_token}`,
          "user-agent": "leadflow-pro/0.1 by leadflowpro",
        },
      });
      me = await meRes.json();
    } catch {
      return back(req, "reddit", "Token worked but /me lookup failed.");
    }
    if (!me?.name) return back(req, "reddit", "Reddit didn't return a username.");

    try {
      await prisma.socialAccount.upsert({
        where: { userId_platform_handle: { userId, platform: "reddit" as any, handle: me.name } },
        create: {
          userId,
          platform: "reddit" as any,
          kind: kind as any,
          handle: me.name,
          followers: 0,            // Reddit doesn't expose follower count in v1/me
          posts: 0,
          following: 0,
          engagement: 0,
          accessToken: tokenJson.access_token ?? null,
          refreshToken: tokenJson.refresh_token ?? null,
          expiresAt: tokenJson.expires_in
            ? new Date(Date.now() + tokenJson.expires_in * 1000)
            : null,
          lastSyncedAt: new Date(),
        },
        update: {
          accessToken: tokenJson.access_token ?? null,
          refreshToken: tokenJson.refresh_token ?? null,
          expiresAt: tokenJson.expires_in
            ? new Date(Date.now() + tokenJson.expires_in * 1000)
            : null,
          lastSyncedAt: new Date(),
        },
      });
    } catch (err) {
      return back(req, "reddit", `DB save failed: ${String(err).slice(0, 120)}`);
    }

    const res = NextResponse.redirect(new URL("/dashboard/social?connected=reddit", req.url));
    res.cookies.delete("lf_social_state");
    return res;
  }

  return back(req, params.platform, "OAuth callback not implemented for this platform yet.");
}

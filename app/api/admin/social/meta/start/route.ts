import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  META_OAUTH_REDIRECT_URI,
  META_OAUTH_STATE_COOKIE,
  buildMetaAuthorizationUrl,
  hashOAuthState,
} from "@/lib/meta-oauth";
import {
  createSocialServiceClient,
  getMetaOAuthCredentials,
  requireSocialAdmin,
} from "@/lib/social-server";

export const runtime = "nodejs";

function back(code: string) {
  return NextResponse.redirect(
    new URL(`/admin/social?meta=${encodeURIComponent(code)}`, "https://www.theleadflowpro.com"),
  );
}

export async function GET() {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return back("sign_in");
  const sb = createSocialServiceClient();
  if (!sb) return back("server_config");

  const { appId, appSecret } = await getMetaOAuthCredentials(sb);
  if (!appId || !appSecret) return back("needs_config");

  const state = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await sb.from("social_oauth_states").insert({
    provider: "facebook",
    state_hash: hashOAuthState(state),
    admin_user_id: admin.user.id,
    redirect_uri: META_OAUTH_REDIRECT_URI,
    expires_at: expiresAt,
  });
  if (error) return back("server_config");

  const response = NextResponse.redirect(
    buildMetaAuthorizationUrl({ appId, state, redirectUri: META_OAUTH_REDIRECT_URI }),
  );
  response.cookies.set(META_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/admin/social/meta/callback",
    maxAge: 10 * 60,
  });
  return response;
}

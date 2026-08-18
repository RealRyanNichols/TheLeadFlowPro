import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  META_OAUTH_REDIRECT_URI,
  META_OAUTH_STATE_COOKIE,
  exchangeLongLivedMetaUserToken,
  exchangeMetaAuthorizationCode,
  hashOAuthState,
  listManagedFacebookPages,
  metaTokenExpiresAt,
} from "@/lib/meta-oauth";
import { inspectFacebookConnection } from "@/lib/meta-publishing";
import {
  SOCIAL_PAGE_ID,
  createSocialServiceClient,
  getMetaOAuthCredentials,
  requireSocialAdmin,
  setSocialSecret,
} from "@/lib/social-server";

export const runtime = "nodejs";

const ADMIN_SOCIAL_URL = "https://www.theleadflowpro.com/admin/social";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function finish(code: string) {
  const url = new URL(ADMIN_SOCIAL_URL);
  url.searchParams.set("meta", code);
  const response = NextResponse.redirect(url);
  response.cookies.set(META_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/admin/social/meta/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return finish("sign_in");
  const sb = createSocialServiceClient();
  if (!sb) return finish("server_config");

  const url = new URL(request.url);
  const returnedState = url.searchParams.get("state") || "";
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(META_OAUTH_STATE_COOKIE)?.value || "";
  if (!returnedState || !cookieState || !safeEqual(returnedState, cookieState)) {
    return finish("state");
  }

  const { data: stateRow } = await sb
    .from("social_oauth_states")
    .select("id, redirect_uri")
    .eq("provider", "facebook")
    .eq("state_hash", hashOAuthState(returnedState))
    .eq("admin_user_id", admin.user.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!stateRow || stateRow.redirect_uri !== META_OAUTH_REDIRECT_URI) {
    return finish("state");
  }

  const { data: consumed } = await sb
    .from("social_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("id", stateRow.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) return finish("state");

  if (url.searchParams.has("error")) return finish("denied");
  const code = url.searchParams.get("code") || "";
  if (!code || code.length > 4096) return finish("missing_code");

  const { appId, appSecret } = await getMetaOAuthCredentials(sb);
  if (!appId || !appSecret) return finish("needs_config");

  try {
    const shortLived = await exchangeMetaAuthorizationCode({
      appId,
      appSecret,
      code,
      redirectUri: META_OAUTH_REDIRECT_URI,
    });
    const longLived = await exchangeLongLivedMetaUserToken({
      appId,
      appSecret,
      shortLivedToken: shortLived.access_token as string,
    });
    const pages = await listManagedFacebookPages(longLived.access_token as string);
    const page = pages.find((item) => item.id === SOCIAL_PAGE_ID);
    if (!page?.access_token) return finish("page_missing");

    const health = await inspectFacebookConnection(
      longLived.access_token as string,
      SOCIAL_PAGE_ID,
    );
    const tasks = Array.from(new Set([...(page.tasks ?? []), ...health.pageTasks]));
    const hasCreateTask = tasks.some((task) => ["CREATE_CONTENT", "MANAGE"].includes(task));
    const connected = health.canPublish && hasCreateTask;
    const connectedAt = new Date().toISOString();

    await Promise.all([
      setSocialSecret(sb, "facebook_user_access_token", longLived.access_token as string),
      setSocialSecret(sb, "facebook_page_access_token", page.access_token),
    ]);

    const { error: connectionError } = await sb.from("social_connections").upsert(
      {
        provider: "facebook",
        page_id: SOCIAL_PAGE_ID,
        page_name: page.name || health.pageName,
        graph_version: health.graphVersion,
        status: connected ? "connected" : "limited",
        permission_names: health.permissions,
        page_tasks: tasks,
        authorization_scope: health.permissions,
        user_token_expires_at: metaTokenExpiresAt(longLived.expires_in),
        connected_by: admin.user.id,
        connected_at: connectedAt,
        last_verified_at: connectedAt,
        last_error: connected
          ? null
          : "Meta did not confirm both pages_manage_posts and the Page CREATE_CONTENT task.",
      },
      { onConflict: "provider,page_id" },
    );
    if (connectionError) return finish("server_config");

    return finish(connected ? "connected" : "limited");
  } catch {
    return finish("exchange");
  }
}

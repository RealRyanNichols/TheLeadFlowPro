import { NextResponse } from "next/server";
import {
  META_OAUTH_REDIRECT_URI,
  META_OAUTH_SCOPES,
  discoverMetaApp,
  isMetaAppId,
  isMetaAppSecret,
} from "@/lib/meta-oauth";
import { FACEBOOK_GRAPH_VERSION } from "@/lib/social";
import {
  SOCIAL_PAGE_ID,
  createSocialServiceClient,
  getFacebookSourceToken,
  getMetaOAuthCredentials,
  getSocialCredentialStatus,
  requireSocialAdmin,
  setSocialSecret,
} from "@/lib/social-server";

export const runtime = "nodejs";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

async function configuration(sb: NonNullable<ReturnType<typeof createSocialServiceClient>>) {
  let credentials = await getMetaOAuthCredentials(sb);

  // The existing lead token knows which Meta app issued it. Discovering the
  // public App ID can save Amanda a manual lookup. This is read-only and never
  // exposes the existing token to the browser.
  if (!credentials.appId) {
    const sourceToken = await getFacebookSourceToken(sb);
    if (sourceToken) {
      const app = await discoverMetaApp(sourceToken).catch(() => null);
      if (app?.id) {
        await setSocialSecret(sb, "meta_app_id", app.id).catch(() => undefined);
        credentials = await getMetaOAuthCredentials(sb);
      }
    }
  }

  return {
    ...(await getSocialCredentialStatus(sb)),
    redirect_uri: META_OAUTH_REDIRECT_URI,
    scopes: [...META_OAUTH_SCOPES],
    page_id: SOCIAL_PAGE_ID,
    graph_version: FACEBOOK_GRAPH_VERSION,
    app_id_last_four: credentials.appId ? credentials.appId.slice(-4) : null,
  };
}

export async function GET() {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return admin;
  const sb = createSocialServiceClient();
  if (!sb) return json({ error: "Server database access is not configured." }, 503);
  return json({ configuration: await configuration(sb) });
}

export async function POST(request: Request) {
  const admin = await requireSocialAdmin();
  if (admin instanceof NextResponse) return admin;
  const sb = createSocialServiceClient();
  if (!sb) return json({ error: "Server database access is not configured." }, 503);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const appId = typeof body.app_id === "string" ? body.app_id.trim() : "";
  const appSecret = typeof body.app_secret === "string" ? body.app_secret.trim() : "";
  const existing = await getMetaOAuthCredentials(sb);

  if (appId && !isMetaAppId(appId)) {
    return json({ error: "Enter the numeric Meta App ID." }, 400);
  }
  if (appSecret && !isMetaAppSecret(appSecret)) {
    return json({ error: "Enter the App Secret exactly as Meta provides it." }, 400);
  }
  if (!appId && !existing.appId) {
    return json({ error: "The Meta App ID is required." }, 400);
  }
  if (!appSecret && !existing.appSecret) {
    return json({ error: "The Meta App Secret is required." }, 400);
  }

  try {
    if (appId) await setSocialSecret(sb, "meta_app_id", appId);
    if (appSecret) await setSocialSecret(sb, "meta_app_secret", appSecret);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not save Meta setup." }, 503);
  }

  return json({ configuration: await configuration(sb) });
}

import "server-only";

import { NextResponse } from "next/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  LEADFLOW_SOCIAL_PAGE_ID,
  leadFlowSocialPublishIdentityIssues,
  leadFlowSocialRuntimeIdentityIssues,
} from "@/lib/social-identity";
import { createClient } from "@/lib/supabase/server";

/** LeadFlow's Facebook publisher is intentionally not configurable by Page. */
export const SOCIAL_PAGE_ID = LEADFLOW_SOCIAL_PAGE_ID;

export type SocialAdminContext = {
  user: { id: string; email?: string | null };
  profile: { role?: string | null; full_name?: string | null };
};

// The repository does not keep generated Supabase types. This client is used
// only in trusted server routes after their public input has been validated.
export type SocialServiceClient = SupabaseClient<any>;

export type SocialPostIdentity = {
  page_id: string;
  provider: string;
};

export type SocialSecretName =
  | "meta_app_id"
  | "meta_app_secret"
  | "facebook_page_access_token"
  | "facebook_user_access_token";

export async function requireSocialAdmin(): Promise<SocialAdminContext | NextResponse> {
  const identityIssues = getSocialRuntimeIdentityIssues();
  if (identityIssues.length) {
    return NextResponse.json(
      { error: "LeadFlow social identity check failed.", issues: identityIssues },
      { status: 503 },
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  return { user, profile };
}

function configuredSocialPageId() {
  return process.env.META_PAGE_ID?.trim() || SOCIAL_PAGE_ID;
}

export function getSocialRuntimeIdentityIssues(): string[] {
  return leadFlowSocialRuntimeIdentityIssues({
    configuredPageId: configuredSocialPageId(),
    supabaseUrl: SUPABASE_URL,
  });
}

export function getSocialPublishIdentityIssues(
  post: SocialPostIdentity,
): string[] {
  return leadFlowSocialPublishIdentityIssues({
    configuredPageId: configuredSocialPageId(),
    supabaseUrl: SUPABASE_URL,
    postPageId: String(post.page_id ?? ""),
    provider: String(post.provider ?? ""),
  });
}

export function createSocialServiceClient(): SocialServiceClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || getSocialRuntimeIdentityIssues().length) return null;
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SocialServiceClient;
}

export async function getSocialSecret(
  sb: SocialServiceClient,
  name: SocialSecretName,
): Promise<string | null> {
  const { data, error } = await sb.rpc("get_social_vault_secret", { p_name: name });
  if (error) throw new Error("Secure social credential storage is not ready.");
  const value = typeof data === "string" ? data.trim() : "";
  return value || null;
}

export async function setSocialSecret(
  sb: SocialServiceClient,
  name: SocialSecretName,
  value: string,
): Promise<void> {
  const clean = value.trim();
  if (!clean) throw new Error("The Meta credential cannot be empty.");
  const { error } = await sb.rpc("set_social_vault_secret", {
    p_name: name,
    p_value: clean,
  });
  if (error) throw new Error("Could not save the encrypted Meta credential.");
}

async function secretOrEnvironment(
  sb: SocialServiceClient,
  name: SocialSecretName,
  environmentValue: string | undefined,
) {
  const stored = await getSocialSecret(sb, name).catch(() => null);
  return stored || environmentValue?.trim() || null;
}

export async function getMetaOAuthCredentials(sb: SocialServiceClient) {
  const [appId, appSecret] = await Promise.all([
    secretOrEnvironment(
      sb,
      "meta_app_id",
      process.env.META_APP_ID || process.env.FACEBOOK_APP_ID,
    ),
    secretOrEnvironment(sb, "meta_app_secret", process.env.META_APP_SECRET),
  ]);
  return { appId, appSecret };
}

export async function getFacebookSourceToken(sb: SocialServiceClient) {
  return (
    (await secretOrEnvironment(
      sb,
      "facebook_page_access_token",
      process.env.META_PAGE_ACCESS_TOKEN,
    )) || ""
  );
}

export async function getSocialCredentialStatus(sb: SocialServiceClient) {
  const [{ appId, appSecret }, pageToken] = await Promise.all([
    getMetaOAuthCredentials(sb),
    getFacebookSourceToken(sb),
  ]);
  return {
    app_id_configured: Boolean(appId),
    app_secret_configured: Boolean(appSecret),
    oauth_ready: Boolean(appId && appSecret),
    page_token_configured: Boolean(pageToken),
    app_id_last_four: appId ? appId.slice(-4) : null,
  };
}

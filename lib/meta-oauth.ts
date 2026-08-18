import { createHash } from "crypto";
import { FACEBOOK_GRAPH_VERSION } from "./social";

export const META_OAUTH_REDIRECT_URI =
  process.env.META_OAUTH_REDIRECT_URI ||
  "https://www.theleadflowpro.com/api/admin/social/meta/callback";

export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

export const META_OAUTH_STATE_COOKIE = "leadflow_meta_oauth_state";

const graphBase = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;

type MetaErrorBody = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaOAuthError";
  }
}

export function isMetaAppId(value: unknown): value is string {
  return typeof value === "string" && /^\d{5,30}$/.test(value.trim());
}

export function isMetaAppSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 20 &&
    value.trim().length <= 256 &&
    !/\s/.test(value.trim())
  );
}

export function hashOAuthState(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildMetaAuthorizationUrl(input: {
  appId: string;
  state: string;
  redirectUri?: string;
}) {
  const url = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri || META_OAUTH_REDIRECT_URI);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_OAUTH_SCOPES.join(","));
  url.searchParams.set("auth_type", "rerequest");
  url.searchParams.set("return_scopes", "true");
  return url;
}

async function metaJson<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new MetaOAuthError("Could not reach Meta to finish authorization.");
  }
  const body = (await response.json().catch(() => ({}))) as T & MetaErrorBody;
  if (!response.ok || body.error) {
    throw new MetaOAuthError("Meta did not complete the publishing authorization.");
  }
  return body;
}

async function tokenExchange(params: Record<string, string>) {
  // Meta documents this OAuth endpoint as GET. The URL stays server-to-server,
  // is never logged by this app, and every error returned to the browser is generic.
  const url = new URL(`${graphBase}/oauth/access_token`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return metaJson<{ access_token?: string; token_type?: string; expires_in?: number }>(
    url.toString(),
    { method: "GET" },
  );
}

export async function exchangeMetaAuthorizationCode(input: {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri?: string;
}) {
  const result = await tokenExchange({
    client_id: input.appId,
    client_secret: input.appSecret,
    redirect_uri: input.redirectUri || META_OAUTH_REDIRECT_URI,
    code: input.code,
  });
  if (!result.access_token) throw new MetaOAuthError("Meta did not return an access token.");
  return result;
}

export async function exchangeLongLivedMetaUserToken(input: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
}) {
  const result = await tokenExchange({
    grant_type: "fb_exchange_token",
    client_id: input.appId,
    client_secret: input.appSecret,
    fb_exchange_token: input.shortLivedToken,
  });
  if (!result.access_token) throw new MetaOAuthError("Meta did not return a long-lived token.");
  return result;
}

async function readMeta<T>(path: string, token: string) {
  return metaJson<T>(`${graphBase}/${path.replace(/^\//, "")}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type ManagedFacebookPage = {
  id?: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
};

export async function listManagedFacebookPages(userToken: string) {
  const result = await readMeta<{ data?: ManagedFacebookPage[] }>(
    "me/accounts?fields=id,name,access_token,tasks&limit=100",
    userToken,
  );
  return result.data ?? [];
}

export async function readGrantedMetaPermissions(userToken: string) {
  const result = await readMeta<{
    data?: { permission?: string; status?: string }[];
  }>("me/permissions", userToken);
  return (result.data ?? [])
    .filter((item) => item.status === "granted" && item.permission)
    .map((item) => item.permission as string);
}

export async function discoverMetaApp(userOrSystemToken: string) {
  const app = await readMeta<{ id?: string; name?: string }>(
    "app?fields=id,name",
    userOrSystemToken,
  );
  return app.id && isMetaAppId(app.id) ? { id: app.id, name: app.name ?? null } : null;
}

export function metaTokenExpiresAt(expiresIn: number | undefined) {
  if (!Number.isFinite(expiresIn) || Number(expiresIn) <= 0) return null;
  return new Date(Date.now() + Number(expiresIn) * 1000).toISOString();
}

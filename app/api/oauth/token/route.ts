import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MCP_URL, pkceMatches } from "@/lib/hq/oauth";
import { clientSecretOk, consumeAuthorizationCode, getClient, issueTokens, refreshTokens } from "@/lib/hq/server";

// The token endpoint. Two grants: authorization_code with PKCE (the code
// is single-use and dies in ten minutes) and refresh_token (rotated on
// every use, so a leaked refresh token is good exactly once).

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" };

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
}

async function readForm(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")]));
  }
  const text = await request.text().catch(() => "");
  return Object.fromEntries(new URLSearchParams(text).entries());
}

/** Confidential clients may also send credentials as HTTP Basic. */
function basicClient(request: Request): { id: string; secret: string } | null {
  const h = request.headers.get("authorization") ?? "";
  const m = /^Basic\s+(.+)$/i.exec(h);
  if (!m) return null;
  try {
    const [id, secret] = Buffer.from(m[1], "base64").toString("utf8").split(":");
    return id ? { id: decodeURIComponent(id), secret: decodeURIComponent(secret ?? "") } : null;
  } catch {
    return null;
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const form = await readForm(request);
  const basic = basicClient(request);
  const clientId = form.client_id || basic?.id || "";
  const clientSecret = form.client_secret || basic?.secret;
  const grant = form.grant_type;

  let db;
  try {
    db = createServiceClient();
  } catch {
    return oauthError("server_error", "Sign-in is not configured.", 500);
  }

  const client = await getClient(db, clientId);
  if (!client) return oauthError("invalid_client", "Unknown client.", 401);
  if (!(await clientSecretOk(db, clientId, clientSecret))) return oauthError("invalid_client", "Client authentication failed.", 401);

  if (grant === "authorization_code") {
    const code = form.code ?? "";
    const stored = await consumeAuthorizationCode(db, code);
    if (!stored) return oauthError("invalid_grant", "The code is invalid, expired, or already used.");
    if (stored.client_id !== clientId) return oauthError("invalid_grant", "The code was issued to a different client.");
    if (form.redirect_uri && form.redirect_uri !== stored.redirect_uri) return oauthError("invalid_grant", "redirect_uri does not match.");
    if (!pkceMatches(form.code_verifier, stored.code_challenge, stored.code_challenge_method)) return oauthError("invalid_grant", "PKCE verification failed.");
    if (form.resource && form.resource !== MCP_URL) return oauthError("invalid_target", "Unknown resource.");
    const tokens = await issueTokens(db, { clientId, workspaceId: stored.workspace_id, userId: stored.user_id, scope: stored.scope });
    return NextResponse.json(tokens, { headers: { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" } });
  }

  if (grant === "refresh_token") {
    const tokens = await refreshTokens(db, form.refresh_token ?? "", clientId);
    if (!tokens) return oauthError("invalid_grant", "The refresh token is invalid, expired, or revoked.");
    return NextResponse.json(tokens, { headers: { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" } });
  }

  return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
}

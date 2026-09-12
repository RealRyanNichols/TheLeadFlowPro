import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/session";
import { parseAuthorizeParams, withQuery } from "@/lib/hq/oauth";
import { getClient, saveAuthorizationCode } from "@/lib/hq/server";
import { SITE } from "@/lib/hq/oauth";
import { verifyConsentNonce } from "@/lib/hq/consent";

// The owner clicked Connect. Re-validate everything the consent page
// validated (the form is just hidden fields), mint a single-use code, and
// send the browser back to the assistant.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getHqSession().catch(() => null);
  if (!session || !session.workspace) {
    return NextResponse.redirect(new URL("/login?next=%2Fhq", request.url), { status: 303 });
  }
  // A cross-site POST could otherwise mint a code for the signed-in
  // person's workspace and hand it to an attacker's registered client.
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== SITE && !origin.startsWith("http://localhost")) || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")) {
    return NextResponse.json({ error: "invalid_request", error_description: "Cross-site approval is not allowed." }, { status: 403 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const params = new URLSearchParams();
  for (const key of ["client_id", "redirect_uri", "state", "code_challenge", "scope", "resource"]) {
    const v = form.get(key);
    if (typeof v === "string" && v) params.set(key, v);
  }
  params.set("response_type", "code");
  params.set("code_challenge_method", "S256");

  const client = await getClient(session.db, params.get("client_id") ?? "");
  const parsed = parseAuthorizeParams(params, client);
  if (!parsed.ok) {
    if (parsed.redirect) return NextResponse.redirect(parsed.redirect, { status: 303 });
    return NextResponse.json({ error: "invalid_request", error_description: parsed.error }, { status: 400 });
  }

  const nonce = form.get("nonce");
  if (
    typeof nonce !== "string" ||
    !verifyConsentNonce(nonce, { userId: session.user.id, clientId: parsed.value.client_id, redirectUri: parsed.value.redirect_uri, codeChallenge: parsed.value.code_challenge, scope: parsed.value.scope })
  ) {
    return NextResponse.json({ error: "invalid_request", error_description: "The approval form expired. Start the connection again." }, { status: 400 });
  }

  const code = await saveAuthorizationCode(session.db, {
    clientId: parsed.value.client_id,
    workspaceId: session.workspace.id,
    userId: session.user.id,
    redirectUri: parsed.value.redirect_uri,
    codeChallenge: parsed.value.code_challenge,
    scope: parsed.value.scope,
    resource: parsed.value.resource,
  });
  const back = withQuery(parsed.value.redirect_uri, { code, ...(parsed.value.state ? { state: parsed.value.state } : {}) });
  const res = NextResponse.redirect(back, { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

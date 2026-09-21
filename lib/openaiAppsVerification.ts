// Domain verification for the ChatGPT app directory.
//
// OpenAI's developer portal issues a token per domain and fetches it back
// from a well-known path on the MCP host (www.theleadflowpro.com, because the
// connector lives at /api/mcp there). Every independent write-up found on
// 2026-09-20 names /.well-known/openai-apps-challenge; the task brief named
// /.well-known/openai-apps. OpenAI's own page could not be fetched from this
// environment to settle it, so both paths serve the same token and the
// runbook (docs/plugin-directory-submission.md) tells Ryan to confirm the
// path in the portal.
//
// The token is issued to Ryan's OpenAI organisation, so it lives in the
// environment (OPENAI_APPS_VERIFICATION_TOKEN), never in the repository. The
// body is the token byte for byte: plain text, no JSON wrapper, no trailing
// newline. Until the variable is set both paths are a 404, which is the
// truthful state: the domain is not verified.

export const OPENAI_APPS_VERIFICATION_PATHS = ["/.well-known/openai-apps-challenge", "/.well-known/openai-apps"] as const;

export function verificationResponse(env: Record<string, string | undefined>): Response {
  const token = (env.OPENAI_APPS_VERIFICATION_TOKEN ?? "").trim();
  if (!token) return new Response(null, { status: 404 });
  return new Response(token, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

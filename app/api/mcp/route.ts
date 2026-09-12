import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { serverActions } from "@/lib/hq/actions";
import { bearerFrom } from "@/lib/hq/keys";
import { handleJsonRpc, parseErrorResponse } from "@/lib/hq/mcp";
import { SCOPES, SITE } from "@/lib/hq/oauth";
import { resolveBearer } from "@/lib/hq/server";

// The MCP endpoint: https://www.theleadflowpro.com/api/mcp
//
// Streamable HTTP, stateless. Every POST carries one JSON-RPC message (or
// a batch) and a bearer token: an API key from HQ, or an OAuth access
// token a connector obtained after the owner approved it. Responses are
// plain JSON; the server does not open SSE streams because nothing it
// does takes long enough to need one, and stateless is what keeps it
// safe on serverless.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Accept",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Protocol-Version",
};

const MAX_BODY = 200_000;

function unauthorized(reason: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: `Unauthorized: ${reason}` } },
    {
      status: 401,
      headers: {
        ...CORS,
        "WWW-Authenticate": `Bearer realm="The LeadFlow Pro", resource_metadata="${SITE}/.well-known/oauth-protected-resource"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

// A light in-memory limiter per workspace. Serverless instances are
// ephemeral, so this bounds bursts rather than being a hard quota.
const calls = new Map<string, number[]>();
function withinLimit(key: string): boolean {
  const now = Date.now();
  const hits = (calls.get(key) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 240) return false;
  hits.push(now);
  calls.set(key, hits);
  if (calls.size > 5000) for (const k of [...calls.keys()].slice(0, 1000)) calls.delete(k);
  return true;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** No server-initiated stream. Clients that probe with GET get told so. */
export function GET() {
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS, DELETE" } });
}

/** Stateless: there is no session to end, so ending one always succeeds. */
export function DELETE() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(request: Request) {
  const token = bearerFrom(request.headers.get("authorization"));
  if (!token) return unauthorized("send an API key from HQ or connect through OAuth");

  let db;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "The LeadFlow Pro is not configured on this server." } }, { status: 500, headers: CORS });
  }

  const principal = await resolveBearer(db, token, SCOPES);
  if (!principal) return unauthorized("the token is invalid, expired, or revoked");
  if (!withinLimit(principal.workspace.id)) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32029, message: "Too many requests. Slow down for a minute." } }, { status: 429, headers: CORS });
  }

  const raw = await request.text().catch(() => "");
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, { status: 413, headers: CORS });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(parseErrorResponse(), { status: 400, headers: CORS });
  }

  const actions = serverActions(db, principal.workspace);
  const outcome = await handleJsonRpc(body, {
    workspace: principal.workspace,
    scopes: principal.scopes,
    actions,
    now: new Date(),
    via: principal.via,
  });

  const headers = { ...CORS, "Cache-Control": "no-store", "MCP-Protocol-Version": "2025-06-18" };
  if (!outcome.hadRequests) return new NextResponse(null, { status: 202, headers });
  const payload = Array.isArray(body) ? outcome.responses : outcome.responses[0];
  return NextResponse.json(payload, { status: 200, headers });
}

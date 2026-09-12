import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseRegistration } from "@/lib/hq/oauth";
import { registerClient } from "@/lib/hq/server";

// RFC 7591 dynamic client registration. A connector (ChatGPT, Claude, a
// desktop tool) registers itself before it sends the owner to sign in.
// Registration is open by design, which is what the connectors expect; a
// client id on its own grants nothing, the owner still has to approve.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

const recent = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60 * 60_000);
  if (hits.length >= 30) return false;
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) for (const k of [...recent.keys()].slice(0, 1000)) recent.delete(k);
  return true;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return NextResponse.json({ error: "too_many_requests" }, { status: 429, headers: CORS });
  const body = await request.json().catch(() => null);
  const parsed = parseRegistration(body);
  if (!parsed.ok) return NextResponse.json({ error: "invalid_client_metadata", error_description: parsed.error }, { status: 400, headers: CORS });
  try {
    const { client, clientSecret } = await registerClient(createServiceClient(), parsed.value);
    return NextResponse.json(
      {
        client_id: client.client_id,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: { ...CORS, "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("OAuth registration failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: CORS });
  }
}

import { NextResponse } from "next/server";
import { protectedResourceMetadata } from "@/lib/hq/oauth";

// RFC 9728. ChatGPT and Claude read this to learn which authorization
// server protects /api/mcp. The MCP route also points here in its
// WWW-Authenticate header when a request arrives without a token.

export function GET() {
  return NextResponse.json(protectedResourceMetadata(), {
    headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*" },
  });
}

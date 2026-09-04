import { NextResponse } from "next/server";
import { hasProAccess } from "@/lib/proAccess";
import { getProEntitlements } from "@/lib/proAccessServer";
import { renderProTool } from "@/lib/tools/pro/render";
import { getProTool } from "@/lib/tools/pro";
import type { Values } from "@/lib/tools";

// The kit runs here, never in the browser.
//
// The page posts what the buyer typed and gets back the numbers plus either
// the documents or an honest listing of them. Two reasons it works this way:
// the lock is real, and the generators that make a kit worth $19 stay on the
// server instead of shipping to every visitor inside a JavaScript bundle.

export const runtime = "nodejs";

const MAX_BODY = 600_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "Too much data" }, { status: 413 });
  }

  let body: { slug?: unknown; values?: unknown; brand?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const tool = getProTool(slug);
  if (!tool) return NextResponse.json({ error: "Unknown kit" }, { status: 404 });

  const { kinds } = await getProEntitlements();
  const unlocked = hasProAccess(kinds, slug);

  const values = (body.values && typeof body.values === "object" ? body.values : {}) as Values;
  const brand = (body.brand && typeof body.brand === "object" ? body.brand : undefined) as
    | Record<string, unknown>
    | undefined;

  const rendered = renderProTool(slug, values, brand, unlocked);
  if (!rendered) return NextResponse.json({ error: "Unknown kit" }, { status: 404 });

  return NextResponse.json(rendered, {
    headers: { "cache-control": "no-store" },
  });
}

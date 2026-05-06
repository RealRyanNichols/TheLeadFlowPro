// src/app/api/social/meta/route.ts
//
// Protected Meta Graph API diagnostics endpoint.
// Auth: x-admin-secret header must match ADMIN_INIT_SECRET.
// Example:
//   curl -H "x-admin-secret: $ADMIN_INIT_SECRET" \
//     "https://theleadflowpro.com/api/social/meta?since=2025-01-21&until=2026-05-05"

import { NextResponse } from "next/server";
import { getMetaPageInsightSnapshot } from "@/lib/meta-insights";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function checkAuth(req: Request): { ok: true } | { ok: false; res: NextResponse } {
  const expected = process.env.ADMIN_INIT_SECRET;
  if (!expected) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "ADMIN_INIT_SECRET not set in env" },
        { status: 503 },
      ),
    };
  }
  const provided = req.headers.get("x-admin-secret");
  if (provided !== expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true };
}

function cleanDate(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const pageId = url.searchParams.get("pageId");
  const since = cleanDate(url.searchParams.get("since"));
  const until = cleanDate(url.searchParams.get("until"));

  if (url.searchParams.get("since") && !since) {
    return NextResponse.json({ error: "since must be YYYY-MM-DD" }, { status: 400 });
  }
  if (url.searchParams.get("until") && !until) {
    return NextResponse.json({ error: "until must be YYYY-MM-DD" }, { status: 400 });
  }

  const snapshot = await getMetaPageInsightSnapshot({ pageId, since, until });
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

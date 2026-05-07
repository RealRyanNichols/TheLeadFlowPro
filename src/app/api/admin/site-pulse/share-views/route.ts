import { NextResponse } from "next/server";
import {
  classifySitePulseError,
  getSitePulseSnapshot,
  recordSitePulseEvent,
} from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ShareViewImport = {
  token?: unknown;
  views?: unknown;
  source?: unknown;
};

function checkAuth(req: Request): { ok: true } | { ok: false; res: NextResponse } {
  const expected = process.env.ADMIN_INIT_SECRET;
  if (!expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "ADMIN_INIT_SECRET not set" }, { status: 503 }),
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

function cleanToken(value: unknown) {
  if (typeof value !== "string") return null;
  const token = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return token || null;
}

function cleanSource(value: unknown) {
  if (typeof value !== "string") return "manual-social-import";
  return value.replace(/[^\w\s.-]/g, "").slice(0, 80) || "manual-social-import";
}

function cleanViews(value: unknown) {
  const views = Number(value ?? 0);
  if (!Number.isFinite(views)) return 0;
  return Math.max(0, Math.round(views));
}

function extractImports(body: unknown): ShareViewImport[] {
  if (!body || typeof body !== "object") return [];
  const imports = (body as { imports?: unknown }).imports;
  const one = (body as { token?: unknown; views?: unknown; source?: unknown }).token
    ? (body as ShareViewImport)
    : null;
  if (Array.isArray(imports)) return imports as ShareViewImport[];
  return one ? [one] : [];
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  return NextResponse.json({
    ok: true,
    instructions:
      "POST { token: 'share-token', views: 1234, source: 'facebook-post-insights' } or { imports: [...] }. This records platform-reported social views for a tracked share link.",
    snapshot: await getSitePulseSnapshot(),
  });
}

export async function POST(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const imports = extractImports(body);
  if (!imports.length) {
    return NextResponse.json({ ok: false, error: "token and views required" }, { status: 400 });
  }

  let imported = 0;
  try {
    for (const item of imports) {
      const token = cleanToken(item.token);
      const views = cleanViews(item.views);
      if (!token || views <= 0) continue;

      await recordSitePulseEvent({
        visitorId: "system-social-import",
        path: "/pulse",
        eventType: "share_view_import",
        source: cleanSource(item.source),
        target: token,
        value: views,
      });
      imported += 1;
    }

    return NextResponse.json({
      ok: true,
      imported,
      snapshot: await getSitePulseSnapshot(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: classifySitePulseError(error, "insert_failed") },
      { status: 500 },
    );
  }
}

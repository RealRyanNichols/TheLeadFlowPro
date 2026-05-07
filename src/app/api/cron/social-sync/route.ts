import { NextResponse } from "next/server";
import { syncConnectedSocialAccounts } from "@/lib/social-sync-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, status: 503, error: "CRON_SECRET not set" };
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}

export async function GET(req: Request) {
  const auth = authorized(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const result = await syncConnectedSocialAccounts(limit);

  return NextResponse.json(
    {
      ok: true,
      ...result,
      note:
        result.needsConfig > 0
          ? "Some platform APIs still need env tokens before they can return live data."
          : "Connected platform sync completed.",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

import { NextResponse } from "next/server";
import { upsertContentArtifact } from "@/lib/content-command/import";
import { isContentWorkerAuthorized } from "@/lib/content-command/worker-auth";
import { createSocialServiceClient } from "@/lib/social-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isContentWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Worker authorization failed." }, { status: 401 });
  }
  const sb = createSocialServiceClient();
  if (!sb) return NextResponse.json({ error: "Server database access is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null);
  try {
    const result = await upsertContentArtifact(sb, body?.artifact ?? body, null);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artifact import failed." },
      { status: 400 },
    );
  }
}

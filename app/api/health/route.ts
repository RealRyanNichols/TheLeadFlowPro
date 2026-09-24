import { NextResponse } from "next/server";

// Liveness for the droplet deploy (deploy/droplet/deploy.sh): it waits for the
// commit it just built to answer here before it keeps the new image. Reads
// nothing and reveals nothing but the commit, which is public in the repo.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, commit: process.env.GIT_SHA || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

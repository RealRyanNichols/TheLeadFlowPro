import { NextResponse } from "next/server";
import { buildSampleDownload } from "@/lib/leadflow-samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { sampleId: string } }) {
  const result = await buildSampleDownload(params.sampleId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return new Response(result.body, {
    headers: {
      "content-type": result.contentType,
      "content-disposition": `attachment; filename="${result.filename}"`,
      "cache-control": "no-store",
    },
  });
}

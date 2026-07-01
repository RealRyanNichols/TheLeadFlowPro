import { NextResponse } from "next/server";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { buildDownloadForExport } from "@/lib/leadflow-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (admin) {
    const result = await buildDownloadForExport({
      exportId: params.id,
      actor: "admin",
      actorUserId: admin.userId,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return new NextResponse(result.body, {
      headers: {
        "content-type": result.contentType,
        "content-disposition": `attachment; filename="${result.filename}"`,
        "cache-control": "private, no-store",
      },
    });
  }

  const buyerData = await getBuyerPortalData();
  if (!buyerData.authenticated) {
    return NextResponse.json({ error: "Buyer login required." }, { status: buyerData.reason === "missing_config" ? 503 : 401 });
  }
  if (!buyerData.account) {
    return NextResponse.json({ error: "Buyer account required." }, { status: 403 });
  }

  const result = await buildDownloadForExport({
    exportId: params.id,
    actor: "buyer",
    actorUserId: buyerData.user.id,
    buyerAccount: buyerData.account,
    buyerEntitlements: buyerData.entitlements,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return new NextResponse(result.body, {
    headers: {
      "content-type": result.contentType,
      "content-disposition": `attachment; filename="${result.filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

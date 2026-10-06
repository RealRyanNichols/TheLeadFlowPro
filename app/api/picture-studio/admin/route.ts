import { NextResponse } from "next/server";
import { admin, apiError, getPictureStudioReadiness, secureHeaders } from "@/lib/pictureStudio/auth";
import { listAdminOrders } from "@/lib/pictureStudio/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { admin(request); const orders = await listAdminOrders(); return NextResponse.json({ orders: orders.map(({ assets, files, ...order }) => ({ ...order, assets: assets.map(({ path: _path, ...asset }) => asset), files: files.map(({ path: _path, ...file }) => file) })), readiness: await getPictureStudioReadiness() }, { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}

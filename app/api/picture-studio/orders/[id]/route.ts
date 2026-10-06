import { NextResponse } from "next/server";
import { apiError, customer, jsonBody, secureHeaders, throttle } from "@/lib/pictureStudio/auth";
import { getOrderInternal, updateBrief } from "@/lib/pictureStudio/store";
import { parseBrief, publicOrder } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { const { id } = await context.params; const order = await customer(request, id); return NextResponse.json(publicOrder(order), { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try { const { id } = await context.params; await customer(request, id); await throttle(request, `brief:${id}`, 10); const body = await jsonBody(request); await updateBrief(id, parseBrief(body.brief)); return NextResponse.json(publicOrder(await getOrderInternal(id)), { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}

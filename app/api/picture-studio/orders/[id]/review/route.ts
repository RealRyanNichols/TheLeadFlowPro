import { NextResponse } from "next/server";
import { apiError, customer, jsonBody, secureHeaders, throttle } from "@/lib/pictureStudio/auth";
import { reviewOrder } from "@/lib/pictureStudio/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; await customer(request, id); await throttle(request, `review:${id}`, 5); const body = await jsonBody(request); await reviewOrder(id, String(body.action || ""), String(body.notes || "")); return NextResponse.json({ ok: true }, { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}

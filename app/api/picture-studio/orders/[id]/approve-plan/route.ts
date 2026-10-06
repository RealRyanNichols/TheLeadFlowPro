import { NextResponse } from "next/server";
import { apiError, assertCheckoutReady, customer, secureHeaders, throttle } from "@/lib/pictureStudio/auth";
import { approvePlan } from "@/lib/pictureStudio/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; await customer(request, id); await assertCheckoutReady(); await throttle(request, `plan:${id}`, 5); await approvePlan(id); return NextResponse.json({ ok: true }, { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}

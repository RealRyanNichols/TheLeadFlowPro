import { NextResponse } from "next/server";
import { apiError, customer, secureHeaders, throttle } from "@/lib/pictureStudio/auth";
import { createPictureCheckout } from "@/lib/pictureStudio/payments";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; await customer(request, id); await throttle(request, `checkout:${id}`, 5); return NextResponse.json(await createPictureCheckout(id), { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}

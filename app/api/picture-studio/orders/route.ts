import { NextResponse } from "next/server";
import { apiError, assertCheckoutReady, jsonBody, secureHeaders, throttle } from "@/lib/pictureStudio/auth";
import { createOrder } from "@/lib/pictureStudio/store";
import { parseBrief } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await assertCheckoutReady();
    await throttle(request, "create-order", 8, 3600);
    const body = await jsonBody(request);
    const result = await createOrder({ packId: String(body.packId || ""), quantity: Number(body.quantity || 1), name: String(body.name || ""), email: String(body.email || ""), brief: parseBrief(body.brief) });
    return NextResponse.json(result, { status: 201, headers: secureHeaders });
  } catch (error) { return apiError(error); }
}

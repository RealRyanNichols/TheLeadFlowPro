import { NextResponse } from "next/server";
import { admin, apiError, jsonBody, secureHeaders } from "@/lib/pictureStudio/auth";
import { adminAction } from "@/lib/pictureStudio/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { admin(request); const { id } = await context.params, body = await jsonBody(request); await adminAction(id, String(body.action || ""), String(body.notes || ""), { sceneIndex: body.sceneIndex, prompt: body.prompt, caption: body.caption }); return NextResponse.json({ ok: true }, { headers: secureHeaders }); }
  catch (error) { return apiError(error); }
}

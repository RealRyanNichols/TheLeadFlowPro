import { NextResponse } from "next/server";
import { apiError, boundedBody, customer, secureHeaders, throttle } from "@/lib/pictureStudio/auth";
import { addAsset } from "@/lib/pictureStudio/store";
import { removePrivateFile, saveReferenceAsset } from "@/lib/pictureStudio/storage";
import { PictureError } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; await customer(request, id); await throttle(request, `upload:${id}`, 12);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isFinite(length) || length < 1 || length > 10 * 1024 * 1024 + 65536) throw new PictureError("Upload one photo up to 10 MB.", 413);
    const bytes = await boundedBody(request, 10 * 1024 * 1024 + 65536);
    const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") || "" }, body: bytes.buffer as ArrayBuffer }).formData(), file = form.get("file");
    if (!(file instanceof File)) throw new PictureError("Select a photo to upload.");
    const asset = await saveReferenceAsset(id, file);
    try { await addAsset(id, asset); } catch (error) { await removePrivateFile(id, asset.path); throw error; }
    const { path: _privatePath, ...publicAsset } = asset;
    return NextResponse.json({ asset: publicAsset }, { status: 201, headers: secureHeaders });
  } catch (error) { return apiError(error); }
}

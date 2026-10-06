import { apiError, customer, secureHeaders } from "@/lib/pictureStudio/auth";
import { readPrivateFile } from "@/lib/pictureStudio/storage";
import { PictureError } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string; file: string }> }) {
  try {
    const { id, file } = await context.params; const order = await customer(request, id), asset = order.assets.find(item => item.id === file);
    if (!asset) throw new PictureError("Photo not found.", 404);
    return new Response(new Uint8Array(await readPrivateFile(id, asset.path)), { headers: { ...secureHeaders, "Content-Type": asset.mime, "Content-Disposition": `inline; filename="${asset.filename}"` } });
  } catch (error) { return apiError(error); }
}

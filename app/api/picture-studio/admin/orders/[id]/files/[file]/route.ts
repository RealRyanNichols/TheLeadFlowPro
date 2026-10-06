import { admin, apiError, secureHeaders } from "@/lib/pictureStudio/auth";
import { getOrderInternal } from "@/lib/pictureStudio/store";
import { readPrivateFile } from "@/lib/pictureStudio/storage";
import { PictureError } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string; file: string }> }) {
  try {
    admin(request); const { id, file } = await context.params, order = await getOrderInternal(id), output = order.files.find(item => item.id === file) || order.assets.find(item => item.id === file);
    if (!output) throw new PictureError("Picture not found.", 404);
    return new Response(new Uint8Array(await readPrivateFile(id, output.path)), { headers: { ...secureHeaders, "Content-Type": output.mime, "Content-Disposition": `inline; filename="${output.filename}"` } });
  } catch (error) { return apiError(error); }
}

import { NextResponse } from "next/server";
import { admin, apiError, boundedBody, secureHeaders } from "@/lib/pictureStudio/auth";
import { applyManualOutputs, getOrderInternal } from "@/lib/pictureStudio/store";
import { readPrivateFile, removePrivateFile, saveReferenceAsset, writePrivateOutput } from "@/lib/pictureStudio/storage";
import { createPictureExports } from "@/lib/pictureStudio/provider";
import { PictureError, type PictureFile } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    admin(request); const { id } = await context.params; await getOrderInternal(id);
    const bytes = await boundedBody(request, 10 * 1024 * 1024 + 65536);
    const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") || "" }, body: bytes.buffer as ArrayBuffer }).formData();
    const file = form.get("file"), sceneIndex = Number(form.get("sceneIndex"));
    if (!(file instanceof File)) throw new PictureError("Upload the team’s adjusted picture.");
    const reference = await saveReferenceAsset(id, file), files: PictureFile[] = [];
    try {
      const outputs = await createPictureExports(await readPrivateFile(id, reference.path));
      for (const variant of ["square", "portrait"] as const) files.push(await writePrivateOutput(id, { filename: `scene-${sceneIndex + 1}-${variant}.png`, data: outputs[variant], sceneIndex, variant }));
      await applyManualOutputs(id, sceneIndex, files, typeof form.get("caption") === "string" ? String(form.get("caption")) : undefined);
    } catch (error) { for (const output of files) await removePrivateFile(id, output.path); throw error; }
    finally { await removePrivateFile(id, reference.path); }
    return NextResponse.json({ ok: true }, { headers: secureHeaders });
  } catch (error) { return apiError(error); }
}

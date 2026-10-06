import { Readable } from "node:stream";
import { apiError, customer, secureHeaders } from "@/lib/pictureStudio/auth";
import { createPictureArchive } from "@/lib/pictureStudio/archive";
import { rateLimit } from "@/lib/pictureStudio/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const order = await customer(request, id);
    await rateLimit(`archive:${id}`, 6, 3600);
    const stream = await createPictureArchive(order);
    const abort = () => stream.destroy();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) abort();
    stream.once("close", () => request.signal.removeEventListener("abort", abort));
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      headers: { ...secureHeaders, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="picture-collection-${id}.zip"` },
    });
  } catch (error) { return apiError(error); }
}

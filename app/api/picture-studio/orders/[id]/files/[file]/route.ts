import { apiError, customer, secureHeaders } from "@/lib/pictureStudio/auth";
import { readPrivateFile } from "@/lib/pictureStudio/storage";
import { PictureError } from "@/lib/pictureStudio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string; file: string }> }) {
  try {
    const { id, file } = await context.params; const order = await customer(request, id);
    if (order.paymentStatus !== "paid" || !order.ownerReleasedAt || !["customer_review", "delivered"].includes(order.status)) throw new PictureError("Your collection is not released for review yet.", 409);
    const output = order.files.find(item => item.id === file);
    if (!output) throw new PictureError("Picture not found.", 404);
    return new Response(new Uint8Array(await readPrivateFile(id, output.path)), { headers: { ...secureHeaders, "Content-Type": output.mime, "Content-Disposition": `${order.status === "delivered" ? "attachment" : "inline"}; filename="${output.filename}"` } });
  } catch (error) { return apiError(error); }
}

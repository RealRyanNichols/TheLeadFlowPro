import { caseHash } from "@/lib/sellerproof/access";
import {
  parsePacket,
  purchaseErrors,
  renderPacket,
  REVIEW_ITEMS,
} from "@/lib/sellerproof/packet";
import {
  cookieAccess,
  json,
  paidAccess,
  readBody,
  sameOrigin,
} from "@/lib/sellerproof/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Open SellerProof to export your packet." }, 403);
  let body, packet;
  try {
    body = await readBody(req);
    packet = parsePacket(body.packet);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  if (purchaseErrors(packet).length)
    return json(
      { error: "Complete the dispute details before exporting." },
      400,
    );
  if (
    !Array.isArray(body.confirmations) ||
    body.confirmations.length !== REVIEW_ITEMS.length ||
    !body.confirmations.every((x) => x === true)
  )
    return json({ error: "Complete all four review confirmations." }, 400);
  const access = await cookieAccess();
  if (
    !access ||
    access.packetId !== packet.id ||
    access.caseHash !== caseHash(packet)
  )
    return json(
      {
        error:
          "This packet needs its own verified purchase. Restore its backup or unlock this dispute.",
      },
      403,
    );
  try {
    const paid = await paidAccess(access.sessionId);
    if (
      !paid ||
      paid.packetId !== packet.id ||
      paid.caseHash !== caseHash(packet)
    )
      return json(
        {
          error:
            "This purchase could not be verified. Contact support with your receipt.",
        },
        403,
      );
    return json({ html: renderPacket(packet) });
  } catch {
    return json(
      {
        error:
          "Payment verification is temporarily unavailable. Keep your draft and try exporting again.",
      },
      503,
    );
  }
}

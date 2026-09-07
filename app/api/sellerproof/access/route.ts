import {
  ACCESS_COOKIE,
  accessSecrets,
  caseHash,
  signAccess,
  validSessionId,
  verifyAccess,
} from "@/lib/sellerproof/access";
import { parsePacket } from "@/lib/sellerproof/packet";
import {
  cookieAccess,
  cookieOptions,
  json,
  paidAccess,
  readBody,
  sameOrigin,
} from "@/lib/sellerproof/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Open SellerProof to restore your purchase." }, 403);
  try {
    const body = await readBody(req);
    const recovery = verifyAccess(body.recoveryKey, accessSecrets());
    const existing = await cookieAccess();
    const sessionId = validSessionId(body.sessionId)
      ? body.sessionId
      : (recovery?.sessionId ?? existing?.sessionId);
    if (!sessionId) return json({ unlocked: false });
    const access = await paidAccess(sessionId);
    if (!access)
      return json(
        {
          unlocked: false,
          error:
            "No completed, valid payment was found. You have not been granted paid access.",
        },
        402,
      );
    if (body.packet && caseHash(parsePacket(body.packet)) !== access.caseHash)
      return json(
        {
          error:
            "The payment provider, order reference, dispute reference, amount, and currency must match the original purchase. Restore its backup or correct those fields.",
        },
        400,
      );
    const token = signAccess(access, accessSecrets()[0]);
    const res = json({
      unlocked: true,
      packetId: access.packetId,
      caseHash: access.caseHash,
      recoveryKey: token,
    });
    res.cookies.set(ACCESS_COOKIE, token, cookieOptions());
    return res;
  } catch {
    return json(
      {
        error:
          "Payment verification is temporarily unavailable. Keep your draft and try again; do not pay a second time.",
      },
      503,
    );
  }
}

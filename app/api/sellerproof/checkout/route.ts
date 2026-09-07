import {
  SELLERPROOF,
  parsePacket,
  purchaseErrors,
} from "@/lib/sellerproof/packet";
import { caseHash } from "@/lib/sellerproof/access";
import {
  configured,
  json,
  readBody,
  sameOrigin,
} from "@/lib/sellerproof/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Please start checkout from SellerProof." }, 403);
  if (!configured())
    return json(
      {
        error:
          "Checkout is temporarily unavailable. Your draft is still available. Please try again later.",
      },
      503,
    );
  let packet;
  try {
    packet = parsePacket((await readBody(req)).packet);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  const errors = purchaseErrors(packet);
  if (errors.length) return json({ error: errors.join(" ") }, 400);
  const base = new URL(req.headers.get("origin")!).origin;
  const params = new URLSearchParams({
    mode: "payment",
    "payment_method_types[0]": "card",
    success_url: `${base}/sellerproof/build?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/sellerproof/build?cancelled=1`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(SELLERPROOF.priceCents),
    "line_items[0][price_data][product_data][name]":
      "SellerProof Single Evidence Packet | The LeadFlow Pro",
    "line_items[0][price_data][product_data][description]":
      "One dispute: printable evidence packet, response draft, timeline, and evidence index. Review and submit it yourself. No outcome guarantee.",
    "metadata[kind]": SELLERPROOF.kind,
    "metadata[packet_id]": packet.id,
    "metadata[case_hash]": caseHash(packet),
    "metadata[version]": "1",
    "custom_text[submit][message]":
      "One payment of $49 for this dispute. No subscription. Original evidence files are attached by you in your provider dashboard. Not legal advice. No outcome guarantees.",
  });
  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `sellerproof:${packet.id}:${caseHash(packet)}:${Math.floor(Date.now() / 1800000)}`,
      },
      body: params.toString(),
      signal: AbortSignal.timeout(12000),
    });
    const s = await r.json();
    if (
      !r.ok ||
      typeof s.url !== "string" ||
      !s.url.startsWith("https://checkout.stripe.com/")
    )
      return json(
        {
          error:
            "Could not open secure checkout. Your draft is safe; try again.",
        },
        502,
      );
    return json({ url: s.url });
  } catch {
    return json(
      { error: "Checkout is temporarily unavailable. Please try again." },
      502,
    );
  }
}

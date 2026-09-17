import { renderPacket } from "@/lib/sellerproof/packet";
import { samplePacket } from "@/lib/sellerproof/generator";
export function GET() {
  const p = samplePacket();
  return new Response(renderPacket(p), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}

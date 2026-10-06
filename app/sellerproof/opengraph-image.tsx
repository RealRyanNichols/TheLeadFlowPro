import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PRICES, usd } from "@/lib/site/prices";
export const runtime = "nodejs";
export const alt =
  `SellerProof by The LeadFlow Pro. Organized evidence. A clearer response. Free preview. ${usd(PRICES.sellerProofPacket)} per packet.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const [regularFont, heavyFont] = await Promise.all([
    readFile(
      path.join(process.cwd(), "public/fonts/og/inter-latin-400-normal.woff"),
    ),
    readFile(
      path.join(process.cwd(), "public/fonts/og/inter-latin-900-normal.woff"),
    ),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 72px",
        background: "linear-gradient(120deg, #eee6f9, #fff9ef 65%, #f3efe8)",
        color: "#211831",
        fontFamily: "LeadFlow Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            width: 52,
            height: 52,
            background: "#6540bc",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            fontSize: 36,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l4 4L19 6"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 900 }}>
          SellerProof
        </div>
        <div
          style={{
            display: "flex",
            color: "#625f6d",
            fontSize: 20,
            marginLeft: 12,
          }}
        >
          by The LeadFlow Pro
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 64,
            lineHeight: 1.08,
            fontWeight: 900,
            letterSpacing: -3,
          }}
        >
          <span>Organized evidence.</span>
          <span>A clearer response.</span>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#625f6d" }}>
          Build a chargeback evidence packet before your deadline.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 21,
            fontWeight: 900,
            color: "#6540bc",
          }}
        >
          Free preview · {usd(PRICES.sellerProofPacket)} per packet · No subscription
        </div>
        <div style={{ display: "flex", fontSize: 15, color: "#625f6d" }}>
          Not legal advice. No outcome guarantees.
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "LeadFlow Inter", data: regularFont, weight: 400, style: "normal" },
        { name: "LeadFlow Inter", data: heavyFont, weight: 900, style: "normal" },
      ],
    },
  );
}

import { ImageResponse } from "next/og";
export const alt =
  "SellerProof by The LeadFlow Pro. Organized evidence. A clearer response. Free preview. $49 per packet.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 72px",
        background: "#0f172a",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            width: 52,
            height: 52,
            background: "#1f49eb",
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
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
          SellerProof
        </div>
        <div
          style={{
            display: "flex",
            color: "#94a3b8",
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
            fontWeight: 700,
            letterSpacing: -3,
          }}
        >
          <span>Organized evidence.</span>
          <span>A clearer response.</span>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#cbd5e1" }}>
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
        <div style={{ display: "flex", fontSize: 21, color: "#a9bfff" }}>
          Free preview · $49 per packet · No subscription
        </div>
        <div style={{ display: "flex", fontSize: 15, color: "#94a3b8" }}>
          Not legal advice. No outcome guarantees.
        </div>
      </div>
    </div>,
    size,
  );
}

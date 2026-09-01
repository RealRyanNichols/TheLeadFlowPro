import { ImageResponse } from "next/og";

export const alt = "ChatGPT for Business Owners, live in Longview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "white",
          background: "#07101e",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px), radial-gradient(circle at 82% 16%, rgba(18,64,232,.62), transparent 37%)",
            backgroundSize: "54px 54px, 54px 54px, auto",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "68px 76px", width: "850px", zIndex: 1 }}>
          <div style={{ display: "flex", color: "#35c6f4", fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>
            THE LEADFLOW PRO · LIVE IN LONGVIEW
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 82, fontWeight: 900, letterSpacing: -5, lineHeight: .91 }}>
              STOP WATCHING AI.
            </div>
            <div style={{ display: "flex", color: "#70dfff", fontSize: 82, fontWeight: 900, letterSpacing: -5, lineHeight: .98 }}>
              START USING IT.
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 24, fontWeight: 800 }}>
            <span>10 SEATS</span><span style={{ color: "#35c6f4" }}>•</span><span>90 MINUTES</span><span style={{ color: "#35c6f4" }}>•</span><span>BRING YOUR LAPTOP</span>
          </div>
        </div>
        <div style={{ position: "absolute", right: 56, top: 58, width: 230, height: 230, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "2px solid rgba(53,198,244,.6)", background: "rgba(10,18,32,.78)", boxShadow: "0 0 80px rgba(18,64,232,.5)", zIndex: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "#f8cc4d", fontSize: 68, fontWeight: 900, letterSpacing: -4 }}>$97</span>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 2 }}>FOUNDING SEAT</span>
          </div>
        </div>
        <div style={{ position: "absolute", right: 88, bottom: 70, width: 190, height: 128, display: "flex", flexDirection: "column", gap: 14, zIndex: 2 }}>
          {["BRIEF", "BUILD", "CHECK", "USE"].map((label, index) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 11, color: "#c9d4e7", fontSize: 14, fontWeight: 800, letterSpacing: 2 }}>
              <span style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: index === 3 ? "#35c6f4" : "#1240e8", boxShadow: "0 0 18px rgba(53,198,244,.7)" }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

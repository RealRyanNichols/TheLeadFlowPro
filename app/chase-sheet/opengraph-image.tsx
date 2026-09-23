import { ImageResponse } from "next/og";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";

export const alt = `Chase Sheet by The LeadFlow Pro. Every open quote. Chased every day. From your own phone. ${CHASE_SHEET.monthlyLabel} or ${CHASE_SHEET.lifetimeLabel}.`;
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
        padding: "56px 68px",
        background: "#0a1220",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            width: 52,
            height: 52,
            background: "#1240e8",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h10M4 12h10M4 18h10" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M16 12l2.5 2.5L23 9" stroke="#a9bfff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>Chase Sheet</div>
        <div style={{ display: "flex", color: "#94a3b8", fontSize: 20, marginLeft: 10 }}>by The LeadFlow Pro</div>
      </div>
      <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 62, lineHeight: 1.06, fontWeight: 700, letterSpacing: -3 }}>
            <span>You sent the quote.</span>
            <span style={{ color: "#a9bfff" }}>Then it went quiet.</span>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#cbd5e1" }}>Every open quote, chased every day, from your own phone.</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 330,
            background: "white",
            color: "#0f172a",
            borderRadius: 14,
            padding: "18px 20px",
            fontSize: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", color: "#1240e8", fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>
            <span>TODAY&rsquo;S SHEET</span>
            <span style={{ color: "#64748b" }}>4 to chase</span>
          </div>
          {[
            ["Day 3", "Dana, the roof", "$8,400"],
            ["Day 1", "Marcus, back fence", "$3,250"],
            ["Day 15", "Priya, 4 ton system", "$7,900"],
          ].map(([d, w, a]) => (
            <div key={w} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: 10, marginTop: 10 }}>
              <span style={{ display: "flex", color: "#1240e8", fontWeight: 700, fontSize: 13, width: 60 }}>{d}</span>
              <span style={{ display: "flex", flex: 1, fontWeight: 600 }}>{w}</span>
              <span style={{ display: "flex", fontWeight: 700 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 22, color: "#a9bfff" }}>
          {CHASE_SHEET.monthlyLabel} or {CHASE_SHEET.lifetimeLabel} · Nothing sent for you
        </div>
        <div style={{ display: "flex", fontSize: 16, color: "#94a3b8" }}>theleadflowpro.com/chase-sheet</div>
      </div>
    </div>,
    size,
  );
}

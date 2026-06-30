const ink = "#050918";
const panel = "#09101b";
const cyan = "#5cd0ff";
const lead = "#a6e36b";
const amber = "#ffd66b";
const orange = "#ff9a1f";

const nodePositions = [
  [710, 168, cyan],
  [842, 128, lead],
  [1010, 210, amber],
  [935, 370, lead],
  [756, 420, amber],
  [640, 315, cyan],
  [875, 288, "#ffffff"],
];

export function LeadFlowDataOgImage() {
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(118deg, #050918 0%, #07111f 45%, #11100a 100%)",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(118deg, rgba(92,208,255,0.18) 0%, rgba(5,9,24,0) 42%, rgba(255,154,31,0.18) 100%)",
        }}
      />

      <div style={{ position: "absolute", left: 72, top: 72, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `linear-gradient(180deg, ${cyan}, ${orange})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 18, height: 28, background: ink, clipPath: "polygon(0 0,100% 0,70% 60%,70% 100%,30% 100%,30% 60%)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 34, fontWeight: 900 }}>
          <span>The</span>
          <span style={{ color: cyan }}>LeadFlow</span>
          <span style={{ color: amber }}>Pro</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 72, top: 152, width: 610, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            border: "1px solid rgba(92,208,255,0.35)",
            borderRadius: 12,
            padding: "10px 16px",
            color: "#b8f7ff",
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            background: "rgba(92,208,255,0.09)",
          }}
        >
          Buyer data exchange
        </div>
        <div style={{ marginTop: 28, fontSize: 74, lineHeight: 0.96, fontWeight: 950, letterSpacing: -2 }}>
          Build the lead brain.
        </div>
        <div style={{ marginTop: 22, width: 560, color: "#dce6f7", fontSize: 29, lineHeight: 1.25, fontWeight: 600 }}>
          Score adult intent, source proof, buyer fit, freshness, and fair-rate lead data.
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
          {[
            ["Adult intent", "92", lead],
            ["Source proof", "7/9", cyan],
            ["Fair start", "$149", amber],
          ].map(([label, value, color]) => (
            <div
              key={label}
              style={{
                width: 172,
                display: "flex",
                flexDirection: "column",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 14,
                padding: 16,
                background: "rgba(255,255,255,0.045)",
                boxShadow: `0 0 28px ${color}22`,
              }}
            >
              <div style={{ color: "#98a7c3", fontSize: 13, fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase" }}>
                {label}
              </div>
              <div style={{ marginTop: 8, color, fontSize: 34, fontWeight: 950 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 64,
          top: 84,
          width: 454,
          height: 462,
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(3,7,12,0.72)",
          boxShadow: "0 34px 90px rgba(0,0,0,0.55), 0 0 70px rgba(92,208,255,0.16)",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(92,208,255,0.12), rgba(5,9,24,0) 52%, rgba(255,214,107,0.10))" }} />
        <svg width="454" height="300" viewBox="0 0 454 300" style={{ position: "absolute", top: 44, left: 0 }}>
          <path d="M95 155 C185 142 252 60 330 85" stroke={cyan} strokeWidth="3" fill="none" opacity="0.65" />
          <path d="M80 238 C160 174 238 152 346 212" stroke={amber} strokeWidth="3" fill="none" opacity="0.68" />
          <path d="M176 82 C248 110 246 205 326 226" stroke={lead} strokeWidth="3" fill="none" opacity="0.68" />
          <ellipse cx="245" cy="150" rx="112" ry="70" fill="none" stroke={amber} strokeWidth="1.5" opacity="0.2" />
          <ellipse cx="245" cy="150" rx="78" ry="132" fill="none" stroke={cyan} strokeWidth="1.5" opacity="0.18" transform="rotate(19 245 150)" />
        </svg>

        {nodePositions.map(([x, y, color], index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: Number(x) - 642,
              top: Number(y) - 70,
              width: index === nodePositions.length - 1 ? 24 : 14,
              height: index === nodePositions.length - 1 ? 24 : 14,
              borderRadius: 999,
              background: String(color),
              boxShadow: `0 0 26px ${color}`,
            }}
          />
        ))}

        <div style={{ position: "absolute", left: 24, top: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#8291b1", fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: "uppercase" }}>Live lead brain</div>
          <div style={{ border: `1px solid ${lead}66`, borderRadius: 12, color: lead, background: `${lead}18`, padding: "8px 12px", fontSize: 16, fontWeight: 900 }}>18,402 signals</div>
        </div>

        <div style={{ position: "absolute", left: 24, right: 24, bottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["Ecom operators", "Buyable", "$149"],
            ["AI launch pages", "Watch", "$99"],
            ["Service routes", "Handoff", "$249"],
          ].map(([source, state, price]) => (
            <div key={source} style={{ display: "flex", alignItems: "center", height: 54, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: `${panel}dd`, padding: "0 14px", gap: 12 }}>
              <div style={{ width: 150, fontSize: 17, fontWeight: 850 }}>{source}</div>
              <div style={{ flex: 1, height: 7, borderRadius: 999, background: `linear-gradient(90deg, ${lead}, ${cyan}, ${amber})` }} />
              <div style={{ width: 78, textAlign: "center", border: `1px solid ${cyan}55`, color: "#a8f7ff", borderRadius: 8, padding: "6px 0", fontSize: 12, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase" }}>{state}</div>
              <div style={{ width: 48, textAlign: "right", color: amber, fontSize: 16, fontWeight: 900 }}>{price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";

const ink = "#050918";
const panel = "#09101b";
const cyan = "#5cd0ff";
const lead = "#a6e36b";
const amber = "#ffd66b";
const orange = "#ff9a1f";

const absoluteFill: CSSProperties = {
  position: "absolute",
  inset: 0,
};

function SignalMark() {
  return (
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 16,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(92,208,255,0.35)",
        background:
          "linear-gradient(135deg, rgba(92,208,255,0.24), rgba(255,154,31,0.18))",
      }}
    >
      <svg width="42" height="42" viewBox="0 0 42 42">
        <path
          d="M7 30 16 19 23 23 34 10"
          fill="none"
          stroke={cyan}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="30" r="5" fill={lead} />
        <circle cx="16" cy="19" r="5" fill={cyan} />
        <circle cx="23" cy="23" r="5" fill="#ffffff" />
        <circle cx="34" cy="10" r="5" fill={amber} />
      </svg>
    </div>
  );
}

function SignalGraph() {
  const nodes = [
    [98, 250, lead, 18],
    [178, 156, cyan, 16],
    [254, 194, "#ffffff", 13],
    [348, 88, amber, 21],
    [402, 145, amber, 16],
    [320, 292, lead, 14],
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 64,
        top: 78,
        width: 468,
        height: 474,
        borderRadius: 28,
        display: "flex",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(3,7,12,0.76)",
        boxShadow:
          "0 34px 92px rgba(0,0,0,0.55), 0 0 76px rgba(92,208,255,0.18)",
      }}
    >
      <div
        style={{
          ...absoluteFill,
          background:
            "linear-gradient(135deg, rgba(92,208,255,0.14), rgba(5,9,24,0) 52%, rgba(255,214,107,0.12))",
        }}
      />
      <svg width="468" height="320" viewBox="0 0 468 320" style={{ position: "absolute", top: 44, left: 0 }}>
        <g opacity="0.13" stroke="#ffffff">
          {[84, 162, 240, 318, 396].map((x) => (
            <path key={`v-${x}`} d={`M${x} 18V302`} />
          ))}
          {[48, 118, 188, 258].map((y) => (
            <path key={`h-${y}`} d={`M42 ${y}H426`} />
          ))}
        </g>
        <path d="M98 250 178 156 254 194 348 88 402 145" fill="none" stroke={cyan} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
        <path d="M98 250 178 156 254 194 348 88 402 145" fill="none" stroke={amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.58" />
        <ellipse cx="260" cy="170" rx="132" ry="84" fill="none" stroke={amber} strokeWidth="1.5" opacity="0.2" />
        <ellipse cx="260" cy="170" rx="82" ry="142" fill="none" stroke={cyan} strokeWidth="1.5" opacity="0.18" transform="rotate(18 260 170)" />
      </svg>

      {nodes.map(([x, y, color, size], index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: Number(x) - Number(size) / 2,
            top: Number(y) - Number(size) / 2 + 44,
            width: Number(size),
            height: Number(size),
            borderRadius: 999,
            background: String(color),
            boxShadow: `0 0 30px ${color}`,
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
  );
}

export function LeadFlowSocialImage({
  variant = "home",
  title,
  subtitle,
  eyebrow,
}: {
  variant?: "home" | "book" | "custom";
  title?: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  const isBook = variant === "book";
  const isCustom = variant === "custom";
  const displayEyebrow = eyebrow || (isBook ? "Buyer fit call" : "Buyer data exchange");
  const displayTitle =
    title || (isBook ? "Book a data fit call." : "Build the lead brain.");
  const displaySubtitle =
    subtitle ||
    (isBook
      ? "Ten minutes to decide the data lane, list type, fair budget, and next move."
      : "Score adult intent, source proof, buyer fit, freshness, and fair-rate lead data.");

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
          ...absoluteFill,
          background:
            "linear-gradient(118deg, rgba(92,208,255,0.18) 0%, rgba(5,9,24,0) 42%, rgba(255,154,31,0.18) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 72, top: 72, display: "flex", gap: 14, alignItems: "center" }}>
        <SignalMark />
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 34, fontWeight: 900 }}>
          <span>The</span>
          <span style={{ color: cyan }}>LeadFlow</span>
          <span style={{ color: amber }}>Pro</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 72, top: 152, width: isCustom ? 690 : 610, display: "flex", flexDirection: "column" }}>
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
          {displayEyebrow}
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: displayTitle.length > 46 ? 60 : 74,
            lineHeight: 0.96,
            fontWeight: 950,
            letterSpacing: -2,
            whiteSpace: "pre-wrap",
          }}
        >
          {displayTitle}
        </div>

        <div style={{ marginTop: 22, width: isCustom ? 660 : 560, color: "#dce6f7", fontSize: 29, lineHeight: 1.25, fontWeight: 600, whiteSpace: "pre-wrap" }}>
          {displaySubtitle}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
          {[
            ["Adult intent", "92", lead],
            ["Source proof", "7/9", cyan],
            ["Fair start", isBook ? "$0" : "$149", amber],
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

      <SignalGraph />

      <div style={{ position: "absolute", left: 72, bottom: 46, display: "flex", gap: 14, alignItems: "center", color: "#9fb0cb", fontSize: 18, fontWeight: 750 }}>
        <span style={{ color: orange }}>Fair-rate buyer lists</span>
        <span>Adult-only intake</span>
        <span>Review-gated release</span>
      </div>
    </div>
  );
}

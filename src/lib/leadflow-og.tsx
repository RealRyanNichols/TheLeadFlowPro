import type { CSSProperties } from "react";

const navy = "#061833";
const cyan = "#29e6f2";
const cyanDark = "#0796b7";
const gold = "#ffd66b";
const goldDeep = "#f59e0b";

const absoluteFill: CSSProperties = {
  position: "absolute",
  inset: 0,
};

function LeadFlowMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 150 : 220;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background:
          "radial-gradient(circle at 45% 35%, rgba(41,230,242,0.30), rgba(6,24,51,0.95) 58%, rgba(0,0,0,0.35))",
        border: "1px solid rgba(41,230,242,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "0 22px 80px rgba(41,230,242,0.22)",
      }}
    >
      <svg width={compact ? 110 : 160} height={compact ? 110 : 160} viewBox="0 0 160 160">
        <defs>
          <linearGradient id="lf-og-cyan" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#62ffff" />
            <stop offset="100%" stopColor="#08a6bb" />
          </linearGradient>
          <linearGradient id="lf-og-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff3a5" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path
          d="M42 54 C42 44 118 44 118 54 C118 64 42 64 42 54 Z"
          fill="url(#lf-og-cyan)"
        />
        <path d="M48 64 H112 L96 102 H64 Z" fill="url(#lf-og-cyan)" opacity="0.94" />
        <path d="M64 108 H96 L86 137 H74 Z" fill="url(#lf-og-cyan)" opacity="0.88" />
        <path
          d="M28 126 C58 142 116 116 134 72"
          fill="none"
          stroke="url(#lf-og-gold)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path d="M124 71 L145 48 L149 80 Z" fill="url(#lf-og-gold)" />
        <circle cx="62" cy="139" r="14" fill="url(#lf-og-gold)" />
        <path d="M62 129 V149 M55 135 H66 C72 135 72 143 66 143 H56" stroke="#7a4a00" strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="82" y="126" width="10" height="24" rx="2" fill="url(#lf-og-gold)" />
        <rect x="98" y="114" width="10" height="36" rx="2" fill="url(#lf-og-gold)" />
        <path
          d="M50 28 C38 40 43 52 56 54"
          fill="none"
          stroke="url(#lf-og-cyan)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path d="M88 26 H118 C128 26 134 34 134 44 C134 54 128 62 118 62 H93 L78 75 L81 62 C72 59 68 52 68 44 C68 34 76 26 88 26 Z" fill="url(#lf-og-cyan)" />
        <circle cx="94" cy="44" r="4" fill="#052140" />
        <circle cx="107" cy="44" r="4" fill="#052140" />
        <circle cx="120" cy="44" r="4" fill="#052140" />
      </svg>
    </div>
  );
}

function LeadFlowWordmark() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
      <span style={{ color: "white", fontSize: 54, fontWeight: 800 }}>The</span>
      <span
        style={{
          fontSize: 60,
          fontWeight: 900,
          background: `linear-gradient(90deg, ${cyan} 0%, #46c8ff 58%, ${gold} 100%)`,
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        LeadFlow Pro
      </span>
    </div>
  );
}

function FunnelScene() {
  return (
    <div
      style={{
        position: "absolute",
        right: -30,
        top: 110,
        width: 470,
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="470" height="420" viewBox="0 0 470 420">
        <defs>
          <linearGradient id="lf-scene-cyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5fffff" />
            <stop offset="100%" stopColor="#0694a6" />
          </linearGradient>
          <linearGradient id="lf-scene-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff1a1" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path d="M120 120 C120 85 370 85 370 120 C370 155 120 155 120 120 Z" fill="url(#lf-scene-cyan)" opacity="0.98" />
        <path d="M138 150 H352 L298 270 H190 Z" fill="url(#lf-scene-cyan)" opacity="0.92" />
        <path d="M198 292 H288 L262 370 H224 Z" fill="url(#lf-scene-cyan)" opacity="0.86" />
        <path
          d="M18 354 C135 408 358 310 428 63"
          fill="none"
          stroke="url(#lf-scene-gold)"
          strokeWidth="34"
          strokeLinecap="round"
        />
        <path d="M400 64 L464 0 L468 91 Z" fill="url(#lf-scene-gold)" />
        <circle cx="334" cy="365" r="36" fill="url(#lf-scene-gold)" />
        <rect x="388" y="310" width="22" height="80" rx="3" fill="url(#lf-scene-gold)" />
        <rect x="422" y="274" width="22" height="116" rx="3" fill="url(#lf-scene-gold)" />
      </svg>
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
  const customTitle = title || "The LeadFlow Pro";
  const customSubtitle =
    subtitle || "Turn attention into conversations. No missed calls. No missed texts. No missed revenue.";
  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 80% 15%, rgba(41,230,242,0.18), transparent 30%), linear-gradient(135deg, #041023 0%, #071b38 48%, #021025 100%)",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          ...absoluteFill,
          background:
            "radial-gradient(circle at 22% 82%, rgba(255,214,107,0.10), transparent 34%)",
          opacity: 0.9,
        }}
      />
      <FunnelScene />

      {isBook ? (
        <div
          style={{
            position: "absolute",
            right: 96,
            bottom: 80,
            width: 350,
            height: 230,
            borderRadius: 30,
            border: "1px solid rgba(41,230,242,0.35)",
            background: "rgba(5,20,42,0.86)",
            display: "flex",
            flexDirection: "column",
            padding: 24,
          }}
        >
          <div
            style={{
              height: 48,
              borderRadius: 16,
              background: `linear-gradient(90deg, ${cyan}, #7fffff)`,
              color: "#061833",
              fontSize: 26,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            10:00 AM
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 18 }}>
            {["9:00 AM", "11:00 AM", "1:00 PM", "2:00 PM"].map((slot) => (
              <div
                key={slot}
                style={{
                  width: 138,
                  height: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.40)",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {slot}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 62,
          top: 54,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <LeadFlowMark compact />
        <LeadFlowWordmark />
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: isBook ? 176 : isCustom ? 176 : 210,
          width: isBook ? 660 : isCustom ? 760 : 720,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isCustom && (
          <div
            style={{
              marginBottom: 18,
              color: cyan,
              fontSize: 26,
              fontWeight: 850,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {eyebrow || "The LeadFlow Pro"}
          </div>
        )}
        <div
          style={{
            fontSize: isBook ? 92 : isCustom ? (customTitle.length > 56 ? 58 : 68) : 74,
            lineHeight: 1.02,
            fontWeight: 950,
            letterSpacing: -1,
            whiteSpace: "pre-wrap",
          }}
        >
          {isBook ? (
            <>
              Book a{" "}
              <span style={{ color: cyan }}>10-Minute</span>
              <br />
              Call
            </>
          ) : isCustom ? (
            <>
              {customTitle}
            </>
          ) : (
            <>
              Turn Attention Into
              <br />
              <span style={{ color: gold }}>Conversations.</span>
            </>
          )}
        </div>

        <div
          style={{
            marginTop: 30,
            width: 320,
            height: 3,
            background: `linear-gradient(90deg, ${gold}, rgba(255,214,107,0))`,
          }}
        />

        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 20,
            color: isBook ? "white" : cyan,
            fontSize: isBook ? 40 : 32,
            fontWeight: 850,
          }}
        >
          {isBook ? (
            <>
              <span>Ten minutes.</span>
              <span style={{ color: gold }}>We decide the next move.</span>
            </>
          ) : (
            <>
              <span>75K+ followers</span>
              <span style={{ color: gold }}>•</span>
              <span>6 companies</span>
              <span style={{ color: gold }}>•</span>
              <span>10+ years</span>
            </>
          )}
        </div>

        <div
          style={{
            marginTop: 18,
            color: "rgba(255,255,255,0.92)",
            fontSize: isBook ? 30 : isCustom ? 28 : 28,
            fontWeight: 500,
            lineHeight: 1.25,
            maxWidth: isCustom ? 710 : undefined,
            whiteSpace: "pre-wrap",
          }}
        >
          {isBook
            ? "Free fit call • Serious buyers only"
            : isCustom
              ? customSubtitle
              : "No missed calls. No missed texts. No missed revenue."}
        </div>
      </div>
    </div>
  );
}

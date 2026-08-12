import type { ReactElement } from "react";
import { DOMAINS, TOOL_TYPES, type Domain, type ToolType } from "./taxonomy";
import { artHash } from "./art";

// One composition for every social preview on the tools side of the site, so a
// tool card, an industry collection and the library itself read as one family.
//
// Two rules this has to respect. Satori renders a strict subset of CSS, so
// everything here is flex with explicit values and no shorthand surprises. And
// it uses only the system sans stack rather than a fetched webfont, because an
// OG route that depends on a network call is an OG route that eventually
// returns a 500 and shows a blank card in a feed.

export const OG_SIZE = { width: 1200, height: 630 };

const PAGE = "#F7F5F2";
const INK = "#0A1220";
const MUTED = "#4E5866";
const PANEL = "#FFFFFF";

/** The tool-type mark, drawn large enough to read as a thumbnail in a feed. */
function Mark({ toolType, accent }: { toolType: ToolType; accent: string }) {
  // Satori does not render arbitrary SVG paths reliably, so the mark is built
  // from boxes, which it does render exactly.
  const common = { display: "flex", borderRadius: 8 } as const;

  const bars = (heights: number[]) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            ...common,
            width: 34,
            height: h,
            background: i === heights.length - 1 ? accent : `${INK}26`,
          }}
        />
      ))}
    </div>
  );

  const grid = (on: boolean[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", width: 150, gap: 10 }}>
      {on.map((v, i) => (
        <div key={i} style={{ ...common, width: 42, height: 42, background: v ? accent : `${INK}1f` }} />
      ))}
    </div>
  );

  const lines = (n: number) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 160 }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{ ...common, height: 20, width: i === 0 ? 160 : 160 - i * 34, background: i === 0 ? accent : `${INK}26` }}
        />
      ))}
    </div>
  );

  switch (toolType) {
    case "qr":
      return grid([true, false, true, false, true, false, true, true, false]);
    case "scorecard":
    case "calculator":
      return bars([70, 100, 130, 150]);
    case "estimator":
      return bars([60, 150, 90, 120]);
    case "checklist":
    case "template":
    case "generator":
    case "builder":
      return lines(4);
    case "planner":
      return grid([true, true, false, false, true, true, false, false, true]);
    case "converter":
    case "link":
      return lines(3);
    default:
      return bars([90, 140, 110, 150]);
  }
}

type CardOpts = {
  eyebrow: string;
  title: string;
  hook: string;
  domain: Domain;
  toolType: ToolType;
  url: string;
  seed: string;
  /** Overrides the tool-type word next to the logo, for pages that are not one tool. */
  typeLabel?: string;
};

/**
 * Safe margins are 64px all round, the title is capped so it can never push the
 * footer off the canvas, and the hook sits on the panel rather than on the tint
 * so it keeps its contrast.
 */
export function ogCard({ eyebrow, title, hook, domain, toolType, url, seed, typeLabel }: CardOpts): ReactElement {
  const accent = DOMAINS[domain].ink;
  const h = artHash(seed);
  const titleSize = title.length > 46 ? 58 : title.length > 30 ? 68 : 80;
  const shownTitle = title.length > 78 ? `${title.slice(0, 76)}...` : title;
  const shownHook = hook.length > 108 ? `${hook.slice(0, 106)}...` : hook;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: PAGE,
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* the colour field, placed off the hash so two cards never sit identically */}
      <div
        style={{
          position: "absolute",
          top: -180 + (h % 60),
          right: -120,
          width: 620,
          height: 620,
          borderRadius: 620,
          background: `${accent}1a`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -240,
          left: -160 + (h % 40),
          width: 520,
          height: 520,
          borderRadius: 520,
          background: `${accent}12`,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
          height: "100%",
        }}
      >
        {/* top */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: PANEL,
              border: `2px solid ${accent}59`,
              color: accent,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: PANEL,
              border: "2px solid #146c3459",
              color: "#146C34",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1.5,
            }}
          >
            FREE
          </div>
        </div>

        {/* middle */}
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
            <div
              style={{
                display: "flex",
                color: INK,
                fontSize: titleSize,
                fontWeight: 900,
                lineHeight: 1.03,
                letterSpacing: -2.5,
              }}
            >
              {shownTitle}
            </div>
            <div style={{ display: "flex", marginTop: 20, color: MUTED, fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>
              {shownHook}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 190 }}>
            <Mark toolType={toolType} accent={accent} />
          </div>
        </div>

        {/* bottom */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 10, height: 40, borderRadius: 5, background: accent }} />
            <div style={{ display: "flex", color: INK, fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>
              The LeadFlow
              <span style={{ color: "#1240E8", marginLeft: 5 }}>Pro</span>
            </div>
            <div style={{ display: "flex", color: MUTED, fontSize: 22, fontWeight: 600, marginLeft: 10 }}>
              {typeLabel ?? TOOL_TYPES[toolType].label}
            </div>
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 24, fontWeight: 650 }}>{url}</div>
        </div>
      </div>
    </div>
  );
}

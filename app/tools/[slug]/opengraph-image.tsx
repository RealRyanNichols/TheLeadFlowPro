import { ImageResponse } from "next/og";
import { getTool, CATEGORY_META, toolHash } from "@/lib/tools";

// Every tool gets its own share image, generated on demand and cached. No emoji
// fonts involved, so this can never fail a build.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Free business tool from The LeadFlow Pro";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  const meta = tool ? CATEGORY_META[tool.category] : CATEGORY_META.Leads;
  const name = tool?.name || "Free Business Tools";
  const tagline = tool?.tagline || "Calculators and generators for real business owners";
  const category = tool?.category || "Free Tools";
  const h = toolHash(slug || "tools");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1a2e",
          backgroundImage: `radial-gradient(circle at ${18 + (h % 40)}% -10%, ${meta.from}55, transparent 55%), radial-gradient(circle at 88% 110%, ${meta.to}44, transparent 50%)`,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: `${meta.from}26`,
              border: `2px solid ${meta.from}80`,
              color: meta.text,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {category}
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: "#2ed6a326",
              border: "2px solid #2ed6a380",
              color: "#7ff0cb",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            100% FREE
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: name.length > 34 ? 74 : 92,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -3,
              maxWidth: 1020,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              color: meta.text,
              fontSize: 36,
              fontWeight: 700,
              maxWidth: 980,
            }}
          >
            {tagline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 12,
                height: 44,
                borderRadius: 6,
                background: `linear-gradient(180deg, ${meta.from}, ${meta.to})`,
              }}
            />
            <div style={{ display: "flex", color: "#ffffff", fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>
              The LeadFlow
              <span style={{ color: "#2eb9ff" }}>Pro</span>
            </div>
          </div>
          <div style={{ display: "flex", color: "#8494a8", fontSize: 26, fontWeight: 600 }}>
            theleadflowpro.com/tools
          </div>
        </div>
      </div>
    ),
    size,
  );
}

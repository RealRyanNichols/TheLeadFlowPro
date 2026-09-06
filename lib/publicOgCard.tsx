import type { PublicOgPage } from "./publicOgCatalog";

const TONES = ["#ede6f3", "#f6e9dc", "#e5eee3"];

export function publicOgCard({
  page,
  logoData,
  artData,
}: {
  page: PublicOgPage;
  logoData: string;
  artData?: string;
}) {
  const tone =
    TONES[
      Array.from(page.path).reduce(
        (total, character) => total + character.charCodeAt(0),
        0,
      ) % TONES.length
    ];
  const titleSize =
    page.title.length > 65 ? 46 : page.title.length > 42 ? 54 : 64;
  const description =
    page.description.length > 185
      ? `${page.description.slice(0, 182).replace(/\s+\S*$/, "")}…`
      : page.description;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 48,
        background: "#f3efe8",
        color: "#20212b",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoData}
          alt=""
          width={68}
          height={68}
          style={{ borderRadius: 14 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 23, fontWeight: 700, letterSpacing: 2 }}>
            THE LEAD FLOW PRO
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#5135e5",
              letterSpacing: 3,
            }}
          >
            YOUR NEXT MOVE
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, gap: 34, marginTop: 32 }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#5135e5",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {page.eyebrow}
          </span>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.06,
            }}
          >
            {page.title}
          </div>
          <p
            style={{
              fontSize: 23,
              lineHeight: 1.35,
              color: "#625f6d",
              marginTop: 22,
              marginBottom: 0,
            }}
          >
            {description}
          </p>
        </div>
        {artData ? (
          <div
            style={{
              display: "flex",
              width: 400,
              minWidth: 400,
              padding: 12,
              alignItems: "center",
              justifyContent: "center",
              background: tone,
              border: "1px solid #dbd0c5",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artData}
              alt=""
              width={374}
              height={304}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 30,
          padding: "16px 20px",
          borderRadius: 14,
          background: tone,
        }}
      >
        <span style={{ fontSize: 17, color: "#34313f" }}>
          theleadflowpro.com{page.path === "/" ? "" : page.path}
        </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#5135e5" }}>
          Explore →
        </span>
      </div>
    </div>
  );
}

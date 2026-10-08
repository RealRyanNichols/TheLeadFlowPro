import type { PublicOgPage } from "./publicOgCatalog";

const INK = "#10264a";
const BLUE = "#1557d2";

/** Original, editable brand geometry. It illustrates a service, never results or availability. */
function ServiceMotif({ page }: { page: PublicOgPage }) {
  const territory = page.path === "/service-areas";
  const marketing =
    page.path.startsWith("/agency") || page.path === "/longview";
  return (
    <svg width="356" height="310" viewBox="0 0 356 310">
      <defs>
        <linearGradient id="brand-flow" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#8ed8ff" />
          <stop offset="1" stopColor="#0b4fbe" />
        </linearGradient>
        <linearGradient id="brand-glass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#e2f1ff" />
        </linearGradient>
      </defs>
      {territory ? (
        <g>
          <path
            d="M35 65L107 37L179 62L253 32L318 79L306 244L230 272L157 248L78 277L31 223Z"
            fill="url(#brand-glass)"
            stroke="#bed7f4"
            strokeWidth="2"
          />
          <path
            d="M107 37L110 238M179 62L177 255M253 32L250 251M36 137L314 143M33 213L308 209"
            fill="none"
            stroke="#d7e6f7"
            strokeWidth="1.5"
          />
          <circle
            cx="171"
            cy="157"
            r="96"
            fill="#1aaad530"
            stroke="#1557d2"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          <circle
            cx="171"
            cy="157"
            r="65"
            fill="url(#brand-flow)"
            fillOpacity=".2"
            stroke="#0b4fbe"
            strokeWidth="3"
          />
          <circle
            cx="171"
            cy="157"
            r="11"
            fill={INK}
            stroke="#fff"
            strokeWidth="5"
          />
          <path
            d="M258 88L274 105L301 72"
            fill="none"
            stroke="#1557d2"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : marketing ? (
        <g>
          <path
            d="M35 237C104 237 96 69 165 69S208 205 312 124"
            fill="none"
            stroke="#bddafa"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M35 237C104 237 96 69 165 69S208 205 312 124"
            fill="none"
            stroke="url(#brand-flow)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="13"
            y="194"
            width="80"
            height="82"
            rx="16"
            fill="url(#brand-glass)"
            stroke="#bed7f4"
            strokeWidth="2"
          />
          <path
            d="M34 237L49 251L74 220"
            fill="none"
            stroke={BLUE}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect x="124" y="24" width="88" height="88" rx="16" fill={INK} />
          <path
            d="M144 83V68M165 83V53M186 83V42"
            fill="none"
            stroke="#8ed8ff"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <rect
            x="255"
            y="90"
            width="84"
            height="84"
            rx="16"
            fill="url(#brand-glass)"
            stroke="#bed7f4"
            strokeWidth="2"
          />
          <path
            d="M277 132H318M305 119L318 132L305 145"
            fill="none"
            stroke={BLUE}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="177" cy="294" rx="143" ry="9" fill="#10264a0d" />
        </g>
      ) : (
        <g>
          <ellipse cx="179" cy="283" rx="140" ry="14" fill="#10264a10" />
          <path
            d="M31 183L178 111L325 182L179 256Z"
            fill="#163e77"
            stroke="#163e77"
            strokeWidth="3"
          />
          <path d="M31 183V207L179 281L325 207V182L179 256Z" fill={INK} />
          <path
            d="M46 142L178 78L310 142L179 209Z"
            fill="url(#brand-flow)"
            stroke="#1aaad5"
            strokeWidth="2"
          />
          <path d="M46 142V158L179 225L310 158V142L179 209Z" fill="#1557d2" />
          <path
            d="M63 98L178 42L294 98L179 156Z"
            fill="url(#brand-glass)"
            stroke="#bed7f4"
            strokeWidth="2"
          />
          <path d="M63 98V112L179 171L294 112V98L179 156Z" fill="#c8e3fa" />
          <path
            d="M146 98L169 110L213 87"
            fill="none"
            stroke={BLUE}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

export function publicOgCard({
  page,
  logoData,
  artData,
}: {
  page: PublicOgPage;
  logoData: string;
  artData?: string;
}) {
  const titleSize =
    page.title.length > 75
      ? 43
      : page.title.length > 54
        ? 49
        : page.title.length > 37
          ? 58
          : 66;
  const description =
    page.description.length > 175
      ? `${page.description.slice(0, 172).replace(/\s+\S*$/, "")}…`
      : page.description;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "46px 54px 38px",
        background: "#ffffff",
        backgroundImage:
          "linear-gradient(125deg, #ffffff 0%, #f0f7ff 65%, #e4f3ff 100%)",
        color: INK,
        fontFamily: "LeadFlow Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoData}
          alt=""
          width={54}
          height={54}
          style={{ borderRadius: 12 }}
        />
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1.7 }}>
          THE LEADFLOW PRO
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: BLUE,
            fontWeight: 900,
            letterSpacing: 2.2,
          }}
        >
          BUILD. RUN. GROW.
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 34,
          marginTop: 24,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 666,
            minWidth: 666,
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: BLUE,
              letterSpacing: 2.1,
              textTransform: "uppercase",
              marginBottom: 17,
            }}
          >
            {page.eyebrow}
          </span>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 900,
              letterSpacing: -2.5,
              lineHeight: 1.03,
            }}
          >
            {page.title}
          </div>
          <p
            style={{
              fontSize: 21,
              fontWeight: 400,
              lineHeight: 1.45,
              color: "#425f82",
              marginTop: 21,
              marginBottom: 0,
            }}
          >
            {description}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            width: 356,
            minWidth: 356,
            height: 324,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            background: artData ? "#ffffff70" : "transparent",
            border: artData ? "1px solid #bed7f4" : "0",
            padding: artData ? 10 : 0,
            overflow: "hidden",
          }}
        >
          {artData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artData}
              alt=""
              width={336}
              height={304}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                borderRadius: 13,
              }}
            />
          ) : (
            <ServiceMotif page={page} />
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 21,
          marginTop: 20,
          borderTop: "1px solid #d7e6f7",
        }}
      >
        <span
          style={{
            fontSize: page.path.length > 46 ? 12 : 16,
            color: "#425f82",
          }}
        >
          theleadflowpro.com{page.path === "/" ? "" : page.path}
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: BLUE }}>
          Take the next step →
        </span>
      </div>
    </div>
  );
}

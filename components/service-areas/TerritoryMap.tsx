"use client";
import { useId, useState } from "react";
import { Plus, Minus, LocateFixed } from "lucide-react";
import geography from "@/lib/service-areas/geography.json";
import { PLACES, STAGE_LABELS } from "@/lib/service-areas/catalog";
import {
  radiusRing,
  type Geometry,
  type PublicTerritory,
  type Point,
} from "@/lib/service-areas/engine";
import styles from "./service-areas.module.css";

export type MapView = "local" | "texas" | "national";
const VIEWS = {
  local: { center: { lng: -95.22, lat: 32.52 }, span: 3.35 },
  texas: { center: { lng: -99.3, lat: 31.2 }, span: 14.6 },
  national: { center: { lng: -98, lat: 38.7 }, span: 63 },
};
export default function TerritoryMap({
  view,
  onView,
  territories,
  candidate,
  illustration = false,
  compare = false,
}: {
  view: MapView;
  onView: (v: MapView) => void;
  territories: PublicTerritory[];
  candidate?: Geometry;
  illustration?: boolean;
  compare?: boolean;
}) {
  const uid = useId().replace(/:/g, ""),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState<Point>({ lat: 0, lng: 0 });
  const base = VIEWS[view];
  const selectedPlace =
    candidate?.kind === "radius"
      ? PLACES.find(
          (p) =>
            candidate.center.lat === p.lat && candidate.center.lng === p.lng,
        )?.id
      : undefined;
  const center =
    candidate?.kind === "radius" && view === "local"
      ? candidate.center
      : base.center;
  const span = base.span / zoom,
    width = 1000,
    height = 610,
    scale = width / span;
  const project = (lng: number, lat: number): [number, number] => [
    (lng - center.lng - pan.lng) * scale + width / 2,
    ((center.lat + pan.lat - lat) * scale) /
      Math.cos((center.lat * Math.PI) / 180) +
      height / 2,
  ];
  const path = (rings: number[][][]) =>
    rings
      .map(
        (r) =>
          r
            .map(
              (p, i) =>
                `${i ? "L" : "M"}${project(p[0], p[1])
                  .map((v) => v.toFixed(2))
                  .join(",")}`,
            )
            .join(" ") + "Z",
      )
      .join(" ");
  const shape = (g: Geometry) =>
    g.kind === "radius"
      ? path([radiusRing(g)])
      : g.kind === "states"
        ? path(
            geography.states
              .filter((s) => g.states.includes(s.code))
              .flatMap((s) => s.rings),
          )
        : g.kind === "national"
          ? path(
              geography.states
                .filter((s) => !["AK", "HI"].includes(s.code))
                .flatMap((s) => s.rings),
            )
          : "";
  const inset = (code: "AK" | "HI") => {
    const state = geography.states.find((s) => s.code === code)!;
    const box =
      code === "AK"
        ? { x: 30, y: 407, w: 205, h: 150, lng: -154, lat: 62, span: 55 }
        : { x: 252, y: 475, w: 150, h: 82, lng: -157.2, lat: 20.3, span: 8.4 };
    const insetPath = (rings: number[][][]) =>
      rings
        .map(
          (r) =>
            r
              .map((p, i) => {
                const lng = p[0] > 0 ? p[0] - 360 : p[0];
                return `${i ? "L" : "M"}${(((lng - box.lng) * box.w) / box.span + box.w / 2).toFixed(2)},${(((box.lat - p[1]) * box.w) / box.span / Math.cos((box.lat * Math.PI) / 180) + box.h / 2).toFixed(2)}`;
              })
              .join(" ") + "Z",
        )
        .join(" ");
    const insetShape = (g: Geometry) =>
      g.kind === "national" || (g.kind === "states" && g.states.includes(code))
        ? insetPath(state.rings)
        : g.kind === "radius"
          ? insetPath([radiusRing(g)])
          : "";
    return (
      <g key={code} transform={`translate(${box.x} ${box.y})`}>
        <rect
          width={box.w}
          height={box.h}
          rx="10"
          fill="#f3eff9"
          stroke="#d1c5e0"
        />
        <clipPath id={`${uid}-${code}`}>
          <rect width={box.w} height={box.h} rx="10" />
        </clipPath>
        <g clipPath={`url(#${uid}-${code})`}>
          <path d={insetPath(state.rings)} fill="#fcf9ff" stroke="#d1c5e0" />
          {territories.map((t) => (
            <path
              key={t.id}
              d={insetShape(t.geometry)}
              fill={
                t.stage === "held"
                  ? `url(#${uid}-hold)`
                  : t.stage === "interest"
                    ? "#e7a94a22"
                    : `url(#${uid}-glow)`
              }
              stroke={
                t.stage === "held"
                  ? "#7862b2"
                  : t.stage === "interest"
                    ? "#a76a13"
                    : "#088dcc"
              }
              strokeWidth="2"
              strokeDasharray={t.stage === "interest" ? "6 6" : undefined}
            />
          ))}
          {candidate && (
            <path
              d={insetShape(candidate)}
              fill={`url(#${uid}-glow)`}
              stroke="#008fcf"
              strokeWidth="2"
              strokeDasharray={illustration ? "8 5" : undefined}
            />
          )}
        </g>
        <text x="10" y="19" className={styles.cityLabel}>
          {code}
        </text>
      </g>
    );
  };
  function changeView(v: MapView) {
    onView(v);
    setPan({ lat: 0, lng: 0 });
    setZoom(1);
  }
  return (
    <div className={styles.mapFrame}>
      <div className={styles.mapTop}>
        <div className={styles.mapSwitch} role="group" aria-label="Map region">
          {(
            [
              ["local", "Local"],
              ["texas", "Texas"],
              ["national", "U.S."],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => changeView(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className={styles.mapKicker}>
          {illustration ? "Territory illustration" : "Reviewed coverage"}
        </span>
      </div>
      <svg
        className={styles.map}
        data-view={view}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${uid}-title ${uid}-desc`}
      >
        <title id={`${uid}-title`}>
          {view === "local"
            ? "Local service territories"
            : view === "texas"
              ? "Texas service territories"
              : "United States service territories"}
        </title>
        <desc id={`${uid}-desc`}>
          Generalized geographic display.{" "}
          {illustration
            ? "The blue shape is an illustrative requested area, not a reserved territory."
            : "Orange shows verified interest, violet a temporary hold, and blue a protected client territory."}{" "}
          Exact availability requires a review of the services and written
          agreement. The United States view includes Alaska and Hawaii insets at
          different scales.
        </desc>
        <defs>
          <pattern
            id={`${uid}-grid`}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#d8cce8"
              strokeWidth=".5"
              opacity=".5"
            />
          </pattern>
          <pattern
            id={`${uid}-hold`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 8L8 0"
              stroke="#7862b2"
              strokeWidth="1.2"
              opacity=".35"
            />
          </pattern>
          <radialGradient id={`${uid}-glow`}>
            <stop stopColor="#26a9e0" stopOpacity=".25" />
            <stop offset="1" stopColor="#26a9e0" stopOpacity=".06" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="#efebf7" />
        <rect width={width} height={height} fill={`url(#${uid}-grid)`} />
        {geography.states
          .filter((s) => !["AK", "HI"].includes(s.code))
          .map((s) => (
            <path
              key={s.code}
              d={path(s.rings)}
              fill={s.code === "TX" ? "#fcf9ff" : "#f5f1fa"}
              stroke="#d1c5e0"
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {view !== "national" &&
          geography.texasCounties.map((c) => (
            <path
              key={c.code}
              d={path(c.rings)}
              fill="none"
              stroke="#ded5e9"
              strokeWidth=".7"
            />
          ))}
        {view === "national" &&
          geography.states
            .filter(
              (s) =>
                ![
                  "AK",
                  "HI",
                  "DC",
                  "RI",
                  "DE",
                  "NJ",
                  "MA",
                  "CT",
                  "VT",
                  "NH",
                ].includes(s.code),
            )
            .map((s) => {
              const points = s.rings.flat(),
                x =
                  (Math.min(...points.map((p) => p[0])) +
                    Math.max(...points.map((p) => p[0]))) /
                  2,
                y =
                  (Math.min(...points.map((p) => p[1])) +
                    Math.max(...points.map((p) => p[1]))) /
                  2;
              const [px, py] = project(x, y);
              return (
                <text key={s.code} x={px} y={py} className={styles.stateLabel}>
                  {s.code}
                </text>
              );
            })}
        {view === "texas" && (
          <text
            x={project(-100, 31.6)[0]}
            y={project(-100, 31.6)[1]}
            className={styles.texasLabel}
          >
            TEXAS
          </text>
        )}
        {territories.map((t) => (
          <g key={t.id}>
            <path
              d={shape(t.geometry)}
              fill={
                t.stage === "held"
                  ? `url(#${uid}-hold)`
                  : t.stage === "interest"
                    ? "#e7a94a22"
                    : `url(#${uid}-glow)`
              }
              stroke={
                t.stage === "held"
                  ? "#7862b2"
                  : t.stage === "interest"
                    ? "#a76a13"
                    : "#088dcc"
              }
              strokeWidth="2.5"
              strokeDasharray={t.stage === "interest" ? "6 6" : undefined}
            >
              <title>{`${STAGE_LABELS[t.stage]}: ${t.publicRegion}`}</title>
            </path>
          </g>
        ))}
        {compare && candidate?.kind === "radius" && (
          <path
            d={shape({ ...candidate, miles: 50 })}
            fill="none"
            stroke="#8a9897"
            strokeWidth="1.8"
            strokeDasharray="6 7"
          />
        )}
        {candidate && candidate.kind !== "unknown" && (
          <path
            d={shape(candidate)}
            fill={`url(#${uid}-glow)`}
            stroke="#008fcf"
            strokeWidth="2.5"
            strokeDasharray={illustration ? "8 5" : undefined}
          />
        )}
        {PLACES.filter(
          (p) =>
            view !== "national" ||
            ["dallas", "houston", "midland"].includes(p.id),
        ).map((p) => {
          const [x, y] = project(p.lng, p.lat);
          const isCenter = selectedPlace === p.id;
          if (x < 20 || x > width - 100 || y < 35 || y > height - 20)
            return null;
          return (
            <g
              key={p.id}
              className={
                (p.id === "kilgore" && !isCenter) ||
                (p.id === "longview" && selectedPlace === "kilgore")
                  ? styles.secondaryCity
                  : undefined
              }
            >
              <circle
                cx={x}
                cy={y}
                r={p.id === "tyler" ? 4 : 2.7}
                fill="#65556f"
              />
              <text
                x={x + (isCenter ? 28 : 9)}
                y={y + 4}
                className={`${styles.cityLabel} ${p.id === "marshall" ? styles.easternCity : ""}`}
              >
                {p.name.replace(", TX", "")}
              </text>
            </g>
          );
        })}
        {candidate?.kind === "radius" &&
          (() => {
            const [x, y] = project(candidate.center.lng, candidate.center.lat);
            return (
              <g>
                <circle
                  cx={x}
                  cy={y}
                  r="13"
                  fill="#fff"
                  stroke="#078fcd"
                  strokeWidth="2"
                />
                <circle cx={x} cy={y} r="5" fill="#078fcd" />
                <g transform={`translate(${x - 63},${y + 32})`}>
                  <rect
                    width="126"
                    height="54"
                    rx="13"
                    fill="#fff"
                    stroke="#c1d9e0"
                  />
                  <text
                    x="63"
                    y="24"
                    textAnchor="middle"
                    className={styles.radiusLabel}
                  >
                    {candidate.miles} MILES
                  </text>
                  <text
                    x="63"
                    y="41"
                    textAnchor="middle"
                    className={styles.radiusSmall}
                  >
                    {illustration ? "ILLUSTRATION" : "REQUESTED AREA"}
                  </text>
                </g>
              </g>
            );
          })()}
        <g transform="translate(950 86)">
          <path d="M0-14L-6 4L0 0L6 4Z" fill="#65556f" />
          <text x="0" y="-22" textAnchor="middle" className={styles.cityLabel}>
            N
          </text>
        </g>
        {view === "national" && (
          <>
            {inset("AK")}
            {inset("HI")}
            <text x="28" y="580" className={styles.radiusSmall}>
              U.S. COVERAGE · AK + HI INSETS AT DIFFERENT SCALES
            </text>
          </>
        )}
      </svg>
      <div className={styles.mapControls}>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(4, z * 1.4))}
          aria-label="Zoom in"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.65, z / 1.4))}
          aria-label="Zoom out"
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ lat: 0, lng: 0 });
          }}
          aria-label="Reset map"
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <div className={styles.mapBottom}>
        <span>
          Illustrative boundaries · exact terms confirmed with our team
        </span>
        <a href={geography.sourceUrl} target="_blank" rel="noreferrer">
          Geography: U.S. Census Bureau
        </a>
      </div>
    </div>
  );
}

import geography from "./geography.json" with { type: "json" };
import {
  INDUSTRIES,
  PLACES,
  SERVICE_NAMES,
  INTEREST_DAYS,
  type IndustryId,
} from "./catalog.ts";

export type Point = { lat: number; lng: number };
export type Geometry =
  | { kind: "radius"; center: Point; miles: number }
  | { kind: "states"; states: string[] }
  | { kind: "national" }
  | { kind: "unknown" };
export type Territory = {
  id: string;
  clientName: string;
  industry: IndustryId;
  services: string[];
  exclusivity: "industry" | "services";
  stage: "review" | "interest" | "held" | "protected" | "released";
  geometry: Geometry;
  centerVerified: boolean;
  publicGeometry: Geometry | null;
  publicRegion: string;
  publicApproved: boolean;
  publicConsent: string;
  evidence: string;
  notes: string;
  expiresAt: string | null;
  inquiryId: string | null;
  adRadiusMiles: number | null;
  adTargetingVerified: boolean;
};
export type Registry = { version: 1; territories: Territory[] };
export type PublicTerritory = Pick<
  Territory,
  "id" | "industry" | "services" | "stage" | "publicRegion" | "expiresAt"
> & { geometry: Geometry };
export const emptyRegistry = (): Registry => ({ version: 1, territories: [] });
export const EARTH_MILES = 3958.7613;
const rad = (n: number) => (n * Math.PI) / 180;
const deg = (n: number) => (n * 180) / Math.PI;
export function distanceMiles(a: Point, b: Point): number {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function destination(
  center: Point,
  miles: number,
  bearing: number,
): Point {
  const d = miles / EARTH_MILES,
    t = rad(bearing),
    lat = rad(center.lat),
    lng = rad(center.lng);
  const y = Math.asin(
    Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(t),
  );
  const x =
    lng +
    Math.atan2(
      Math.sin(t) * Math.sin(d) * Math.cos(lat),
      Math.cos(d) - Math.sin(lat) * Math.sin(y),
    );
  return { lat: deg(y), lng: ((deg(x) + 540) % 360) - 180 };
}
export function radiusRing(
  g: Extract<Geometry, { kind: "radius" }>,
): number[][] {
  return Array.from({ length: 129 }, (_, i) => {
    const p = destination(g.center, g.miles, (i * 360) / 128);
    return [p.lng, p.lat];
  });
}
const normalize = (lng: number, around: number) =>
  around + ((lng - around + 540) % 360) - 180;
export function inRing(p: Point, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = normalize(ring[i][0], p.lng),
      yi = ring[i][1],
      xj = normalize(ring[j][0], p.lng),
      yj = ring[j][1];
    if (
      yi > p.lat !== yj > p.lat &&
      p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
function bearing(a: Point, b: Point): number {
  const d = rad(b.lng - a.lng);
  return Math.atan2(
    Math.sin(d) * Math.cos(rad(b.lat)),
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
      Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(d),
  );
}
// Great-circle distance to a segment, used to catch a radius crossing a state
// border even when its center is in another state. Cartographic borders are
// generalized; a one-mile margin returns review instead of false separation.
function segmentDistance(p: Point, a: Point, b: Point): number {
  const d = distanceMiles(a, p) / EARTH_MILES,
    delta = bearing(a, p) - bearing(a, b);
  const cross = Math.asin(
    Math.max(-1, Math.min(1, Math.sin(d) * Math.sin(delta))),
  );
  const along = Math.atan2(Math.sin(d) * Math.cos(delta), Math.cos(d));
  return along >= 0 && along <= distanceMiles(a, b) / EARTH_MILES
    ? Math.abs(cross) * EARTH_MILES
    : Math.min(distanceMiles(p, a), distanceMiles(p, b));
}
function radiusVsStates(
  g: Extract<Geometry, { kind: "radius" }>,
  codes: string[],
): "overlap" | "separate" | "review" {
  let near = false;
  for (const state of geography.states.filter((s) => codes.includes(s.code)))
    for (const ring of state.rings) {
      if (inRing(g.center, ring)) return "overlap";
      for (let i = 1; i < ring.length; i++) {
        const a = { lng: ring[i - 1][0], lat: ring[i - 1][1] },
          b = { lng: ring[i][0], lat: ring[i][1] };
        const distance = segmentDistance(g.center, a, b);
        if (distance < g.miles - 1) return "overlap";
        if (distance <= g.miles + 1) near = true;
      }
    }
  return near ? "review" : "separate";
}
export function geographyOverlap(
  a: Geometry,
  b: Geometry,
): "overlap" | "separate" | "review" {
  if (a.kind === "unknown" || b.kind === "unknown") return "review";
  if (a.kind === "national" || b.kind === "national") return "overlap";
  if (a.kind === "radius" && b.kind === "radius")
    return distanceMiles(a.center, b.center) <= a.miles + b.miles + 0.01
      ? "overlap"
      : "separate";
  if (a.kind === "states" && b.kind === "states")
    return a.states.some((s) => b.states.includes(s)) ? "overlap" : "separate";
  if (a.kind === "radius" && b.kind === "states")
    return radiusVsStates(a, b.states);
  if (a.kind === "states" && b.kind === "radius")
    return radiusVsStates(b, a.states);
  return "review";
}
export function competing(
  a: Pick<Territory, "industry" | "services" | "exclusivity">,
  b: Pick<Territory, "industry" | "services" | "exclusivity">,
): boolean {
  return (
    (a.industry === b.industry &&
      (a.exclusivity === "industry" || b.exclusivity === "industry")) ||
    a.services.some((s) => b.services.includes(s))
  );
}
export function effective(
  t: Pick<Territory, "stage" | "expiresAt">,
  now = new Date(),
): boolean {
  return (
    t.stage !== "released" &&
    (!t.expiresAt || Date.parse(t.expiresAt) > now.getTime())
  );
}
export function conflicts(
  candidate: Territory,
  territories: Territory[],
  now = new Date(),
) {
  return territories
    .filter(
      (t) =>
        t.id !== candidate.id && effective(t, now) && competing(candidate, t),
    )
    .flatMap((t) => {
      const overlap =
        !candidate.centerVerified || !t.centerVerified
          ? "review"
          : geographyOverlap(candidate.geometry, t.geometry);
      return overlap === "separate"
        ? []
        : [
            {
              id: t.id,
              clientName: t.clientName,
              stage: t.stage,
              overlap,
              blocking:
                t.stage === "review" ||
                t.stage === "held" ||
                t.stage === "protected",
            },
          ];
    });
}
export function validateGeometry(
  value: unknown,
  allowUnknown = true,
): Geometry {
  if (!value || typeof value !== "object")
    throw new Error("Choose a territory shape.");
  const g = value as Record<string, unknown>;
  if (g.kind === "unknown" && allowUnknown) return { kind: "unknown" };
  if (g.kind === "national") return { kind: "national" };
  if (
    g.kind === "states" &&
    Array.isArray(g.states) &&
    g.states.length > 0 &&
    g.states.length <= 51 &&
    g.states.every(
      (c) =>
        typeof c === "string" && geography.states.some((s) => s.code === c),
    )
  )
    return { kind: "states", states: [...new Set(g.states as string[])] };
  if (g.kind === "radius" && g.center && typeof g.center === "object") {
    const p = g.center as Record<string, unknown>;
    if (
      typeof p.lat === "number" &&
      Number.isFinite(p.lat) &&
      typeof p.lng === "number" &&
      Number.isFinite(p.lng) &&
      p.lat >= 18 &&
      p.lat <= 72 &&
      p.lng >= -180 &&
      p.lng <= -65 &&
      typeof g.miles === "number" &&
      Number.isFinite(g.miles) &&
      g.miles >= 1 &&
      g.miles <= 500
    ) {
      const center = { lat: p.lat, lng: p.lng };
      if (!geography.states.some((s) => s.rings.some((r) => inRing(center, r))))
        throw new Error("Use an operating base inside the United States.");
      return { kind: "radius", center, miles: g.miles };
    }
  }
  throw new Error(
    "Use a valid U.S. base and a 1–500 mile radius, U.S. states, or national coverage.",
  );
}
function text(v: unknown, max: number): string {
  if (typeof v !== "string" || v.length > max)
    throw new Error("A text field is missing or too long.");
  return v.trim();
}
export function validateRegistry(value: unknown, now = new Date()): Registry {
  if (!value || typeof value !== "object")
    throw new Error("Invalid territory registry.");
  const d = value as Record<string, unknown>;
  if (
    d.version !== 1 ||
    !Array.isArray(d.territories) ||
    d.territories.length > 500
  )
    throw new Error("Invalid territory registry.");
  const ids = new Set<string>();
  const territories = d.territories.map((v): Territory => {
    if (!v || typeof v !== "object") throw new Error("Invalid territory.");
    const t = v as Record<string, unknown>,
      id = text(t.id, 100),
      industry = INDUSTRIES.find((i) => i.id === t.industry)?.id;
    if (!id || ids.has(id) || !industry)
      throw new Error("Duplicate territory or unknown industry.");
    ids.add(id);
    if (
      !Array.isArray(t.services) ||
      !t.services.length ||
      t.services.length > 20 ||
      t.services.some((s) => typeof s !== "string" || !SERVICE_NAMES[s])
    )
      throw new Error("Select the services covered by the agreement.");
    if (
      !["industry", "services"].includes(String(t.exclusivity)) ||
      !["review", "interest", "held", "protected", "released"].includes(
        String(t.stage),
      )
    )
      throw new Error("Invalid territory stage or protection scope.");
    for (const key of [
      "centerVerified",
      "publicApproved",
      "adTargetingVerified",
    ])
      if (typeof t[key] !== "boolean")
        throw new Error("Invalid verification setting.");
    const geometry = validateGeometry(t.geometry),
      publicGeometry =
        t.publicGeometry === null
          ? null
          : validateGeometry(t.publicGeometry, false);
    const result: Territory = {
      id,
      industry,
      clientName: text(t.clientName, 200),
      services: [...new Set(t.services as string[])],
      exclusivity: t.exclusivity as Territory["exclusivity"],
      stage: t.stage as Territory["stage"],
      geometry,
      publicGeometry,
      centerVerified: t.centerVerified as boolean,
      publicApproved: t.publicApproved as boolean,
      publicConsent: text(t.publicConsent, 2000),
      publicRegion: text(t.publicRegion, 150),
      evidence: text(t.evidence, 4000),
      notes: text(t.notes, 4000),
      expiresAt: t.expiresAt === null ? null : text(t.expiresAt, 50),
      inquiryId: t.inquiryId === null ? null : text(t.inquiryId, 100),
      adRadiusMiles: t.adRadiusMiles === null ? null : Number(t.adRadiusMiles),
      adTargetingVerified: t.adTargetingVerified as boolean,
    };
    if (result.expiresAt && !Number.isFinite(Date.parse(result.expiresAt)))
      throw new Error("Invalid expiration date.");
    if (
      result.adRadiusMiles !== null &&
      (!Number.isFinite(result.adRadiusMiles) ||
        result.adRadiusMiles < 1 ||
        result.adRadiusMiles > 500)
    )
      throw new Error("Invalid ad-targeting radius.");
    if (
      (result.stage === "held" || result.stage === "interest") &&
      !result.expiresAt
    )
      throw new Error("Interest and temporary holds need an expiration date.");
    if (
      (result.stage === "held" || result.stage === "protected") &&
      (!result.evidence ||
        geometry.kind === "unknown" ||
        !result.centerVerified)
    )
      throw new Error(
        "Verify the agreed area and add agreement evidence before protecting or holding it.",
      );
    if (
      result.publicApproved &&
      (result.stage === "review" ||
        !result.publicConsent ||
        !result.publicRegion ||
        !publicGeometry ||
        !result.evidence)
    )
      throw new Error(
        "Approve an anonymous public region, display area, source evidence, and publication permission first.",
      );
    if (publicGeometry && geometry.kind !== "unknown") {
      const matches =
        geometry.kind === "radius" && publicGeometry.kind === "radius"
          ? Math.abs(geometry.miles - publicGeometry.miles) < 0.01 &&
            distanceMiles(geometry.center, publicGeometry.center) <= 5
          : geometry.kind === "states" && publicGeometry.kind === "states"
            ? geometry.states.length === publicGeometry.states.length &&
              geometry.states.every((code) =>
                publicGeometry.states.includes(code),
              )
            : geometry.kind === "national" &&
              publicGeometry.kind === "national";
      if (!matches)
        throw new Error(
          "The public display must use the agreed scope and radius. A broad-market radius center can differ by at most 5 miles; it never controls availability.",
        );
    }
    return result;
  });
  for (const t of territories)
    if (
      effective(t, now) &&
      (t.stage === "held" || t.stage === "protected") &&
      conflicts(t, territories, now).some((c) => c.blocking)
    )
      throw new Error(
        "This area conflicts with an existing hold or client protection. Resolve the overlap before saving.",
      );
  return { version: 1, territories };
}
// Explicit projection: private bases, identities, agreements and notes never
// enter the public React tree, JSON response, or map.
export function publicTerritories(
  registry: Registry,
  now = new Date(),
): PublicTerritory[] {
  return registry.territories
    .filter(
      (t) =>
        effective(t, now) &&
        t.stage !== "review" &&
        t.publicApproved &&
        t.publicConsent &&
        t.evidence &&
        t.publicGeometry &&
        t.publicRegion,
    )
    .map((t, index) => ({
      id: `area-${index + 1}`,
      industry: t.industry,
      services: t.services,
      stage: t.stage,
      publicRegion: t.publicRegion,
      expiresAt: t.expiresAt,
      geometry: t.publicGeometry!,
    }));
}
export function geometryLabel(g: Geometry): string {
  return g.kind === "radius"
    ? `${g.miles}-mile radius`
    : g.kind === "states"
      ? g.states.join(", ")
      : g.kind === "national"
        ? "United States"
        : "Area needs confirmation";
}
export type Inquiry = {
  requestId: string;
  name: string;
  email: string;
  business: string;
  industry: IndustryId;
  services: string[];
  market: string;
  scope: "local" | "states" | "national";
  states: string[];
  miles: number;
  publicConsent: boolean;
  contactConsent: true;
};
export function validateInquiry(value: unknown): Inquiry {
  if (!value || typeof value !== "object")
    throw new Error("Complete the area request.");
  const d = value as Record<string, unknown>,
    industry = INDUSTRIES.find((i) => i.id === d.industry);
  const requestId = text(d.requestId, 36),
    name = text(d.name, 200),
    email = text(d.email, 200).toLowerCase(),
    business = text(d.business, 200),
    market = text(d.market, 150);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    ) ||
    !name ||
    !business ||
    !market ||
    !industry ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    d.contactConsent !== true ||
    typeof d.publicConsent !== "boolean"
  )
    throw new Error(
      "Add your name, business, email, market, and permission to follow up.",
    );
  if (
    !Array.isArray(d.services) ||
    !d.services.length ||
    d.services.some((s) => !industry.services.some((x) => x === s)) ||
    !Array.isArray(d.states) ||
    !["local", "states", "national"].includes(String(d.scope))
  )
    throw new Error("Select your services and area type.");
  const miles = Number(d.miles);
  if (!Number.isFinite(miles) || miles < 1 || miles > 500)
    throw new Error("Choose a radius between 1 and 500 miles.");
  const states =
    d.scope === "states"
      ? (
          validateGeometry(
            { kind: "states", states: d.states },
            false,
          ) as Extract<Geometry, { kind: "states" }>
        ).states
      : [];
  return {
    requestId,
    name,
    email,
    business,
    industry: industry.id,
    services: [...new Set(d.services as string[])],
    market,
    scope: d.scope as Inquiry["scope"],
    states,
    miles,
    publicConsent: d.publicConsent,
    contactConsent: true,
  };
}
export function inquiryGeometry(inquiry: Inquiry): Geometry {
  if (inquiry.scope === "national") return { kind: "national" };
  if (inquiry.scope === "states")
    return { kind: "states", states: inquiry.states };
  const place = PLACES.find(
    (p) => p.name.toLowerCase() === inquiry.market.toLowerCase(),
  );
  return place
    ? {
        kind: "radius",
        center: { lat: place.lat, lng: place.lng },
        miles: inquiry.miles,
      }
    : { kind: "unknown" };
}
export function interestExpiration(now = new Date()): string {
  return new Date(now.getTime() + INTEREST_DAYS * 86400000).toISOString();
}

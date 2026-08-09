// Severity color scale: costs grade themselves green → yellow → orange → red.
// Always relative: a side is judged against the other side's cost.
// Rule from Ryan: if the renting side is higher than the owning side,
// owning is GREEN no matter what. Fair both ways — if renting were ever
// cheaper, renting would earn the green.

export type Sev = "great" | "ok" | "caution" | "bad" | "brutal";

export function severity(value: number, comparedTo: number): Sev {
  if (value <= comparedTo) return "great"; // cheaper side is always green
  const r = value / Math.max(comparedTo, 1);
  if (r <= 1.5) return "ok";
  if (r <= 2.5) return "caution";
  if (r <= 5) return "bad";
  return "brutal";
}

// Static class strings so Tailwind's scanner picks them up.
export const SEV_UI: Record<
  Sev,
  { hex: string; text: string; border: string; glow: string; label: string }
> = {
  great: {
    hex: "#34D399",
    text: "text-emerald-400",
    border: "border-emerald-400/40",
    glow: "shadow-glow-mint",
    label: "good",
  },
  ok: {
    hex: "#A3E635",
    text: "text-lime-400",
    border: "border-lime-400/40",
    glow: "shadow-[0_0_20px_rgba(163,230,53,0.22)]",
    label: "getting pricey",
  },
  caution: {
    hex: "#FDE047",
    text: "text-yellow-300",
    border: "border-yellow-300/40",
    glow: "shadow-[0_0_20px_rgba(253,224,71,0.22)]",
    label: "overpaying",
  },
  bad: {
    hex: "#FB923C",
    text: "text-orange-400",
    border: "border-orange-400/40",
    glow: "shadow-[0_0_20px_rgba(251,146,60,0.25)]",
    label: "bleeding",
  },
  brutal: {
    hex: "#F87171",
    text: "text-red-400",
    border: "border-red-400/40",
    glow: "shadow-[0_0_22px_rgba(248,113,113,0.3)]",
    label: "hemorrhaging",
  },
};

// Ramp for month-by-month or magnitude sequences (yellow → red).
// t in [0,1]. Used by charts to color escalating cost sequences.
export function rampHex(t: number): string {
  const stops = ["#FDE047", "#FBBF24", "#FB923C", "#F87171", "#EF4444"];
  const i = Math.min(stops.length - 1, Math.floor(t * stops.length));
  return stops[i];
}

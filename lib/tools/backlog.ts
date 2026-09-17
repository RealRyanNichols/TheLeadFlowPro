// The tool and kit backlog: ideas aimed at East Texas business pains, each
// waiting for Ryan's approval before it is scaffolded, and for the full
// pipeline (formula source, known-value test, artwork, QA) before it is
// published. The file is content/tools/backlog.json; this module reads and
// checks it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_CTA_LANE_IDS, type ToolCtaLane } from "./cta";
import { PRO_PRICES } from "./pro/types";
import type { Category } from "./types";

export type BacklogStatus = "idea" | "approved" | "scaffolded" | "published" | "declined";

export type BacklogItem = {
  slug: string;
  name: string;
  kind: "free" | "pro";
  category: Category;
  pain: string;
  audience: string;
  toolType: string;
  cta: ToolCtaLane;
  sources: string;
  proposedPriceUsd?: number;
  upgradeFrom?: string[];
  status: BacklogStatus;
  approvedBy: string | null;
  approvedOn: string | null;
  note?: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES: Category[] = ["Money", "Leads", "Ads", "Reputation", "Time", "Website", "Generators", "Costs"];

export function loadBacklog(path = join(process.cwd(), "content/tools/backlog.json")): BacklogItem[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as { items?: unknown };
  return Array.isArray(raw.items) ? (raw.items as BacklogItem[]) : [];
}

export function backlogProblems(items: BacklogItem[], existingSlugs: Set<string>): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const at = (m: string) => problems.push(`${it.slug || "(no slug)"}: ${m}`);
    if (!SLUG_RE.test(it.slug ?? "")) at("slug must be lowercase words joined by single hyphens");
    if (seen.has(it.slug)) at("duplicate slug in the backlog");
    seen.add(it.slug);
    if (existingSlugs.has(it.slug) && it.status !== "published") at("slug already exists in the tool registry; mark it published or pick another");
    if (!["free", "pro"].includes(it.kind)) at("kind must be free or pro");
    if (!CATEGORIES.includes(it.category)) at(`category must be one of ${CATEGORIES.join(", ")}`);
    if (!it.pain || it.pain.length < 40) at("pain needs a real sentence about who hurts and how");
    if (!it.audience?.trim()) at("audience is missing");
    if (!TOOL_CTA_LANE_IDS.includes(it.cta)) at(`cta must be one of ${TOOL_CTA_LANE_IDS.join(", ")}`);
    if (!it.sources?.trim()) at("sources: say where the numbers come from (owner-entered, fixed list, ...)");
    if (!["idea", "approved", "scaffolded", "published", "declined"].includes(it.status)) at("status must be idea, approved, scaffolded, published, or declined");
    if (it.status !== "idea" && it.status !== "declined" && (!it.approvedBy || !/^\d{4}-\d{2}-\d{2}$/.test(it.approvedOn ?? ""))) at("an approved, scaffolded, or published item needs approvedBy and approvedOn (YYYY-MM-DD)");
    if (it.kind === "pro") {
      if (it.proposedPriceUsd !== undefined && !(PRO_PRICES as readonly number[]).includes(it.proposedPriceUsd)) at(`proposedPriceUsd must be one of ${PRO_PRICES.join(", ")}`);
      if (!it.upgradeFrom?.length) at("a pro kit names the free tools it upgrades");
    }
    const lower = `${it.pain} ${it.name}`.toLowerCase();
    for (const banned of ["guarantee", "#1", "best in", "double your", "triple your"]) if (lower.includes(banned)) at(`copy must not say "${banned}"`);
  }
  return problems;
}

/** Only an approved item may be scaffolded. Ryan approves by editing the file. */
export function canScaffold(item: BacklogItem): { ok: true } | { ok: false; reason: string } {
  if (item.status === "declined") return { ok: false, reason: "declined" };
  if (item.status === "idea") return { ok: false, reason: "not approved yet: set status to approved with approvedBy and approvedOn" };
  if (!item.approvedBy || !item.approvedOn) return { ok: false, reason: "approved items need approvedBy and approvedOn" };
  return { ok: true };
}

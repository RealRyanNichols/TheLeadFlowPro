import { scoreCandidate, sortedMatches } from "./scoring";
import type { BuyerDemandInput, BuyerMatchCandidate, BuyerMatchResult } from "./types";

export type SegmentMatchRow = {
  id: string;
  name: string;
  description?: string | null;
  segment_type?: string | null;
  vertical?: string | null;
  category?: string | null;
  status?: string | null;
  visibility?: string | null;
  member_count?: number | string | null;
  risk_level?: string | null;
  compliance_status?: string | null;
  quality_summary?: Record<string, unknown> | null;
  updated_at?: string;
};

function scoreFromQuality(row: SegmentMatchRow) {
  const quality = row.quality_summary;
  const average = quality && typeof quality.average_score === "number" ? quality.average_score : null;
  if (average) return average;
  const members = Number(row.member_count || 0);
  return members > 0 ? Math.min(88, 58 + Math.round(Math.log10(members + 1) * 14)) : 54;
}

export function segmentCandidateFromRow(row: SegmentMatchRow): BuyerMatchCandidate {
  return {
    id: row.id,
    entityType: "segment",
    title: row.name,
    category: row.category || "Saved segment",
    vertical: row.vertical || "Lead signals",
    summary: row.description || `Saved ${row.segment_type || "lead"} segment with ${row.member_count || 0} reviewable members.`,
    buyerUseCase: "Use this segment as a product candidate or custom sourcing shortcut.",
    buyerType: "Buyer, agency, operator",
    geography: "Depends on segment rules",
    accessModel: row.visibility === "buyer_visible" ? "review_gated" : "internal_review",
    sourceType: row.segment_type || "segment",
    confidence: row.compliance_status === "ready" ? "high" : row.compliance_status === "blocked" ? "low" : "medium",
    score: scoreFromQuality(row),
    complianceStatus: row.compliance_status || "needs_review",
    availabilityStatus: row.status || "review",
    sourceProofStatus: row.compliance_status === "ready" ? "verified" : "review",
    sampleEnabled: false,
    href: "/marketplace",
  };
}

export function fallbackSegmentCandidates(): BuyerMatchCandidate[] {
  return [
    {
      id: "segment-high-score-ecommerce",
      entityType: "segment",
      title: "High-score ecommerce vendor signals",
      category: "Vendor signals",
      vertical: "Ecommerce",
      summary: "Reviewed ecommerce vendor profiles with strong source proof and buyer-use fit.",
      buyerUseCase: "Product sourcers, ecommerce agencies, and marketplace operators looking for reviewed vendor opportunities.",
      buyerType: "Agency, product sourcer, marketplace operator",
      geography: "United States",
      accessModel: "review_gated",
      sourceType: "lead_profiles",
      confidence: "high",
      score: 86,
      complianceStatus: "needs_review",
      availabilityStatus: "review",
      sourceProofStatus: "review",
      href: "/marketplace",
    },
    {
      id: "segment-local-contractors-weak-websites",
      entityType: "segment",
      title: "Local contractors with weak websites",
      category: "Contractor leads",
      vertical: "Home services",
      summary: "Local service businesses with visible website, follow-up, or conversion gaps.",
      buyerUseCase: "Website builders, AI receptionist sellers, ad operators, and local marketing teams.",
      buyerType: "Agency, contractor marketer, operator",
      geography: "City and county routes",
      accessModel: "limited_seats",
      sourceType: "public_website_review",
      confidence: "medium",
      score: 79,
      complianceStatus: "needs_review",
      availabilityStatus: "review",
      sourceProofStatus: "review",
      href: "/marketplace",
    },
  ];
}

export function matchSegments(input: BuyerDemandInput, segments: SegmentMatchRow[], limit = 4): BuyerMatchResult[] {
  const candidates = segments.length ? segments.map(segmentCandidateFromRow) : fallbackSegmentCandidates();
  return sortedMatches(candidates.map((candidate) => scoreCandidate(input, candidate)), limit);
}

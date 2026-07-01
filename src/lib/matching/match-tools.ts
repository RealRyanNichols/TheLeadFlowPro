import { leadFlowTools } from "@/lib/leadflow-tools";
import { scoreCandidate, sortedMatches } from "./scoring";
import type { BuyerDemandInput, BuyerMatchCandidate, BuyerMatchResult } from "./types";

export function toolCandidateFromLeadFlowTool(tool: (typeof leadFlowTools)[number]): BuyerMatchCandidate {
  return {
    id: tool.id,
    entityType: "tool",
    title: tool.name,
    category: tool.leadCategory,
    vertical: tool.dataCategory,
    summary: `${tool.answerGives} Estimated time: ${tool.estimatedTime}.`,
    buyerUseCase: tool.whoFor,
    buyerType: tool.whoFor,
    geography: "User-provided",
    accessModel: "first_party_intake",
    sourceType: "questionnaire",
    confidence: "medium",
    score: 72,
    complianceStatus: "consented_first_party",
    availabilityStatus: "available",
    sourceProofStatus: "submitted_answers",
    sampleEnabled: false,
    href: `/tools?tool=${encodeURIComponent(tool.id)}`,
  };
}

export function matchTools(input: BuyerDemandInput, limit = 4): BuyerMatchResult[] {
  return sortedMatches(leadFlowTools.map(toolCandidateFromLeadFlowTool).map((candidate) => scoreCandidate(input, candidate)), limit);
}

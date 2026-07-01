import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  Building2,
  Gauge,
  Globe2,
  Home,
  Landmark,
  MousePointerClick,
  PackageCheck,
  Radar,
  ShoppingCart,
} from "lucide-react";

export type LeadFlowToolId =
  | "lead-leak-audit"
  | "what-leads-should-you-buy"
  | "business-signal-score"
  | "website-money-leak-checker"
  | "ai-automation-readiness-score"
  | "ecommerce-growth-finder"
  | "local-demand-finder"
  | "buyer-personality-signal-quiz"
  | "mortgage-lead-readiness-tool"
  | "political-issue-pulse";

export type LeadFlowTool = {
  id: LeadFlowToolId;
  name: string;
  whoFor: string;
  answerGives: string;
  estimatedTime: string;
  dataCategory: string;
  leadCategory: string;
  prompt: string;
  outputPreview: string;
  icon: LucideIcon;
};

export const leadFlowTools: LeadFlowTool[] = [
  {
    id: "lead-leak-audit",
    name: "Lead Leak Audit",
    whoFor: "Business owners losing calls, forms, DMs, and ad clicks.",
    answerGives: "Where leads are leaking and the first fix to make.",
    estimatedTime: "3 minutes",
    dataCategory: "Industry, follow-up gaps, pain, urgency, budget band",
    leadCategory: "business_lead_leak",
    prompt: "Where are leads currently slipping away?",
    outputPreview: "Leak score plus fix order",
    icon: Radar,
  },
  {
    id: "what-leads-should-you-buy",
    name: "What Type of Leads Should You Buy?",
    whoFor: "Lead buyers who know they need demand but not which list fits.",
    answerGives: "The signal pack type, source proof, and release mode to start with.",
    estimatedTime: "2 minutes",
    dataCategory: "Niche, buyer type, location, urgency, exclusivity need",
    leadCategory: "buyer_signal_demand",
    prompt: "What customer are you trying to find?",
    outputPreview: "Recommended signal pack",
    icon: ShoppingCart,
  },
  {
    id: "business-signal-score",
    name: "Business Signal Score",
    whoFor: "Owners who want a blunt score for their lead capture setup.",
    answerGives: "A score across website, ads, CRM, follow-up, and speed.",
    estimatedTime: "4 minutes",
    dataCategory: "Website, ads, CRM, missed calls, response time, channels",
    leadCategory: "business_signal_score",
    prompt: "What part of your lead machine is weakest right now?",
    outputPreview: "Signal readiness score",
    icon: Gauge,
  },
  {
    id: "website-money-leak-checker",
    name: "Website Money Leak Checker",
    whoFor: "Businesses with traffic but weak conversions or unclear CTAs.",
    answerGives: "What the page fails to answer before visitors leave.",
    estimatedTime: "3 minutes",
    dataCategory: "URL context, page goal, CTA, conversion path, blockers",
    leadCategory: "website_conversion_leak",
    prompt: "What should your website make people do?",
    outputPreview: "Website fix map",
    icon: BarChart3,
  },
  {
    id: "ai-automation-readiness-score",
    name: "AI Automation Readiness Score",
    whoFor: "Teams repeating tasks that should be handled by AI or automation.",
    answerGives: "Which workflows are ready for AI and what should stay human.",
    estimatedTime: "4 minutes",
    dataCategory: "Business type, repeated tasks, volume, budget, handoff points",
    leadCategory: "ai_automation_readiness",
    prompt: "What task do you repeat that should not still be manual?",
    outputPreview: "Automation build path",
    icon: Bot,
  },
  {
    id: "ecommerce-growth-finder",
    name: "Ecommerce Growth Finder",
    whoFor: "Store owners, vendors, sourcers, agencies, and marketplace operators.",
    answerGives: "The best growth path by product, platform, sourcing, or traffic gap.",
    estimatedTime: "3 minutes",
    dataCategory: "Platform, product type, sourcing need, pain, revenue band",
    leadCategory: "ecommerce_growth_signal",
    prompt: "What is blocking the store or product from growing?",
    outputPreview: "Growth opportunity map",
    icon: PackageCheck,
  },
  {
    id: "local-demand-finder",
    name: "Local Demand Finder",
    whoFor: "Local operators, agencies, and service businesses looking for demand.",
    answerGives: "Where demand appears by city, category, service gap, and timing.",
    estimatedTime: "2 minutes",
    dataCategory: "City, service category, need, timing, search intent",
    leadCategory: "local_demand_signal",
    prompt: "What local service or category are you trying to map?",
    outputPreview: "Local demand route",
    icon: Globe2,
  },
  {
    id: "buyer-personality-signal-quiz",
    name: "Buyer Personality Signal Quiz",
    whoFor: "People comparing products, providers, tools, trips, homes, vehicles, or offers.",
    answerGives: "Your buying style, likely objections, must-haves, and next-step fit.",
    estimatedTime: "3 minutes",
    dataCategory: "Buying style, interests, budget range, must-haves, dealbreakers",
    leadCategory: "buyer_preference_signal",
    prompt: "What are you trying to choose or buy better?",
    outputPreview: "Private preference map",
    icon: MousePointerClick,
  },
  {
    id: "mortgage-lead-readiness-tool",
    name: "Mortgage Lead Readiness Tool",
    whoFor: "Adults exploring mortgage, refi, affordability, or follow-up readiness.",
    answerGives: "Whether the inquiry is ready for education, review, or a licensed partner.",
    estimatedTime: "3 minutes",
    dataCategory: "Loan interest type, timing, consent path, non-account financial range",
    leadCategory: "mortgage_refi_interest",
    prompt: "What mortgage or refi question are you trying to answer?",
    outputPreview: "Mortgage readiness route",
    icon: Home,
  },
  {
    id: "political-issue-pulse",
    name: "Political Issue Pulse",
    whoFor: "Adults who want an aggregate civic issue snapshot, not persuasion targeting.",
    answerGives: "Which public issues people rank as urgent in a place or district.",
    estimatedTime: "2 minutes",
    dataCategory: "Issue priority, location band, public opinion signal, aggregate only",
    leadCategory: "civic_issue_aggregate",
    prompt: "What public issue should be measured as an aggregate pulse?",
    outputPreview: "Aggregate issue pulse",
    icon: Landmark,
  },
];

export const leadFlowToolIds = new Set<LeadFlowToolId>(leadFlowTools.map((tool) => tool.id));

export function getLeadFlowTool(id: string) {
  return leadFlowTools.find((tool) => tool.id === id) ?? null;
}

export function estimateToolSignalScore({
  urgency,
  answer,
  context,
  desiredOutcome,
}: {
  urgency: string;
  answer: string;
  context: string;
  desiredOutcome: string;
}) {
  const urgencyScore = urgency === "now" ? 30 : urgency === "this_week" ? 24 : urgency === "this_month" ? 16 : 8;
  const detailScore = Math.min(34, Math.round((answer.length + context.length + desiredOutcome.length) / 18));
  const intentScore = /buy|hire|call|quote|fix|ready|urgent|need|pay|lead|customer|traffic|refi|mortgage/i.test(
    `${answer} ${context} ${desiredOutcome}`,
  )
    ? 24
    : 14;

  return Math.max(20, Math.min(94, urgencyScore + detailScore + intentScore));
}

export const protectedDataWarning =
  "Do not submit minors, protected-trait targeting, private financial account data, medical data, hacked data, or hidden sensitive records.";

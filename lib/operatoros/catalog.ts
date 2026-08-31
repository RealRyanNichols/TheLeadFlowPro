import type { OperatorProvider, OperatorRiskLevel } from "./types.ts";

export const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

export const OPERATOR_MODEL_DEFAULTS: Record<Exclude<OperatorProvider, "human">, string> = {
  openai: DEFAULT_OPENAI_MODEL,
  anthropic: DEFAULT_ANTHROPIC_MODEL,
};

export const OPERATOR_STOPLINE_ACTIONS = [
  "spend_money",
  "publish_external",
  "send_sensitive_message",
  "sign_contract",
  "issue_refund",
  "change_pricing",
  "delete_production_data",
  "deploy_production",
] as const;

export const OPERATOR_WORKER_BLUEPRINTS = [
  { slug: "chief", name: "Chief", lane: "Mission coordination", provider: "openai" },
  { slug: "signal", name: "Signal", lane: "Attention", provider: "openai" },
  { slug: "catcher", name: "Catcher", lane: "Capture", provider: "openai" },
  { slug: "scout", name: "Scout", lane: "Qualification", provider: "openai" },
  { slug: "drip", name: "Drip", lane: "Follow-up", provider: "openai" },
  { slug: "closer", name: "Closer", lane: "Decision support", provider: "openai" },
  { slug: "cash", name: "Cash", lane: "Payments", provider: "anthropic" },
  { slug: "forge", name: "Forge", lane: "Delivery", provider: "anthropic" },
  { slug: "lens", name: "Lens", lane: "Proof", provider: "anthropic" },
] as const satisfies ReadonlyArray<{
  slug: string;
  name: string;
  lane: string;
  provider: Exclude<OperatorProvider, "human">;
}>;

export type OperatorOffer = {
  name: string;
  setup: string;
  monthly: string;
  buyer: string;
  includes: string[];
  featured?: boolean;
};

export const OPERATOR_OFFERS: OperatorOffer[] = [
  {
    name: "FlowWorker",
    setup: "$1,497 setup",
    monthly: "$997 per month",
    buyer: "One repetitive job with one measurable finish line.",
    includes: ["One trained AI worker", "One primary workflow", "Approval stopline", "Live work history"],
  },
  {
    name: "FlowDesk",
    setup: "$2,997 setup",
    monthly: "$1,997 per month",
    buyer: "A connected front desk for intake, routing, scheduling, and follow-up.",
    includes: ["Multiple connected skills", "CRM handoffs", "Exception routing", "Mission Control"],
  },
  {
    name: "FlowOps",
    setup: "$4,997 setup",
    monthly: "$4,997 per month",
    buyer: "A real operating layer across sales, admin, delivery, and reporting.",
    includes: ["Multiple AI workers", "Shared company state", "Weekly optimization", "Results and proof reporting"],
    featured: true,
  },
  {
    name: "OperatorOS",
    setup: "$9,997+ setup",
    monthly: "$4,997 to $9,997+ per month",
    buyer: "A custom AI operating system built inside a serious company.",
    includes: ["Custom departments", "Custom integrations", "Role permissions", "Dedicated operating architecture"],
  },
];

export function requiresHumanApproval(risk: OperatorRiskLevel, actionType: string): boolean {
  if (risk === "yellow" || risk === "red") return true;
  return OPERATOR_STOPLINE_ACTIONS.includes(actionType as (typeof OPERATOR_STOPLINE_ACTIONS)[number]);
}

export function operatorExecutionEnabled(envValue: string | undefined): boolean {
  return envValue?.trim().toLowerCase() === "true";
}

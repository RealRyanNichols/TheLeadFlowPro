export const OPERATOR_PROVIDERS = ["openai", "anthropic", "human"] as const;
export type OperatorProvider = (typeof OPERATOR_PROVIDERS)[number];

export const OPERATOR_RISK_LEVELS = ["green", "yellow", "red"] as const;
export type OperatorRiskLevel = (typeof OPERATOR_RISK_LEVELS)[number];

export type OperatorOutcome = "complete" | "needs_approval" | "blocked";

export type OperatorRecommendedAction = {
  title: string;
  description: string;
  action_type: string;
  risk_level: OperatorRiskLevel;
  payload?: Record<string, unknown>;
};

export type OperatorEvidence = {
  label: string;
  value: string | number;
  source?: string;
};

export type OperatorDecision = {
  summary: string;
  outcome: OperatorOutcome;
  confidence: number;
  findings: string[];
  recommended_actions: OperatorRecommendedAction[];
  evidence: OperatorEvidence[];
};

export type OperatorBusinessContext = {
  as_of: string;
  workspace_id: string;
  metrics: {
    new_leads: number;
    active_leads: number;
    overdue_follow_ups: number;
    open_tasks: number;
    open_pipeline_cents: number;
    paid_30d_cents: number;
    active_projects: number;
    completed_milestones: number;
    total_milestones: number;
    content_shipped_7d: number;
    existing_approvals_waiting: number;
  };
  lead_queue: Array<{
    record: string;
    stage: string;
    source: string;
    priority: string;
    expected_value_cents: number | null;
    close_probability: number | null;
    next_follow_up_at: string | null;
    last_contacted_at: string | null;
    created_at: string;
  }>;
  overdue_tasks: Array<{
    task_id: string;
    lead_record: string;
    title: string;
    due_date: string | null;
    priority: string;
  }>;
  delivery: Array<{
    project: string;
    status: string;
    target_launch: string | null;
    milestones_done: number;
    milestones_total: number;
  }>;
  source_notes: string[];
};

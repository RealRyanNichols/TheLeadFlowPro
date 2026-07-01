export type LeadRepPackageType =
  | "leadsource_clarity"
  | "vendortrust_badge"
  | "sales_rep_signal";

export type LeadRepHandoffInput = {
  package_type: LeadRepPackageType;
  repo?: string;
  source_agent?: string;
  target_agent?: string;
  status?: string;
  industry?: string;
  buyer_type?: string;
  source_url?: string;
  urgency?: string;
  budget_range?: string;
  confidence_score?: number;
  requested_report?: boolean;
  recurring_interest?: boolean;
  approval_required?: boolean;
  payload_json?: Record<string, unknown>;
  result_json?: Record<string, unknown>;
};

const packageAgentMap: Record<LeadRepPackageType, string> = {
  leadsource_clarity: "SignalScout",
  vendortrust_badge: "ProofRanker",
  sales_rep_signal: "PredictivePulse",
};

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeLeadRepHandoff(input: unknown): LeadRepHandoffInput {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const packageType = cleanText(body.package_type, 80) as LeadRepPackageType;

  if (!["leadsource_clarity", "vendortrust_badge", "sales_rep_signal"].includes(packageType)) {
    throw new Error("Unsupported package_type.");
  }

  return {
    package_type: packageType,
    repo: cleanText(body.repo, 160) || "RealRyanNichols/TheLeadFlowPro",
    source_agent: cleanText(body.source_agent, 80) || "site_package_form",
    target_agent: cleanText(body.target_agent, 80) || packageAgentMap[packageType],
    status: cleanText(body.status, 80) || "new",
    industry: cleanText(body.industry, 120),
    buyer_type: cleanText(body.buyer_type, 120),
    source_url: cleanText(body.source_url, 500),
    urgency: cleanText(body.urgency, 80),
    budget_range: cleanText(body.budget_range, 120),
    confidence_score: cleanScore(body.confidence_score) ?? undefined,
    requested_report: Boolean(body.requested_report),
    recurring_interest: Boolean(body.recurring_interest),
    approval_required: body.approval_required === undefined ? true : Boolean(body.approval_required),
    payload_json:
      body.payload_json && typeof body.payload_json === "object"
        ? (body.payload_json as Record<string, unknown>)
        : {},
    result_json:
      body.result_json && typeof body.result_json === "object"
        ? (body.result_json as Record<string, unknown>)
        : {},
  };
}

async function insertLeadRepRow(table: string, row: Record<string, unknown>) {
  const busUrl = process.env.LEADREP_BUS_URL;
  const serviceKey = process.env.LEADREP_BUS_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!busUrl || !serviceKey) {
    return { skipped: true, reason: "missing_bus_credentials" };
  }

  const response = await fetch(`${busUrl.replace(/\/$/, "")}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LeadRep ${table} insert failed: ${response.status} ${text}`);
  }

  return { skipped: false, data: text ? JSON.parse(text) : null };
}

export async function writeLeadRepHandoff(input: LeadRepHandoffInput) {
  const payload = {
    ...input.payload_json,
    package_type: input.package_type,
    industry: input.industry,
    buyer_type: input.buyer_type,
    source_url: input.source_url,
    urgency: input.urgency,
    budget_range: input.budget_range,
    confidence_score: input.confidence_score,
    requested_report: input.requested_report,
    recurring_interest: input.recurring_interest,
  };

  const baseRow = {
    repo: input.repo || "RealRyanNichols/TheLeadFlowPro",
    branch: "main",
    source_agent: input.source_agent || "site_package_form",
    target_agent: input.target_agent || packageAgentMap[input.package_type],
    status: input.status || "new",
    payload_json: payload,
    result_json: input.result_json || {},
    cost_estimate: 0,
    approval_required: input.approval_required ?? true,
  };

  const handoff = await insertLeadRepRow("agent_handoffs", baseRow);
  const packageIdea =
    input.requested_report || input.recurring_interest
      ? await insertLeadRepRow("package_ideas", {
          ...baseRow,
          status: "candidate",
          target_agent: "PackageCloser",
        })
      : null;
  const signal = await insertLeadRepRow("predictive_signals", {
    ...baseRow,
    status: input.confidence_score && input.confidence_score >= 70 ? "qualified_signal" : "candidate",
  });
  const packageRequest = await insertLeadRepRow("leadrep_package_requests", {
    repo: baseRow.repo,
    branch: baseRow.branch,
    package_type: input.package_type,
    industry: input.industry,
    buyer_type: input.buyer_type,
    source_url: input.source_url,
    urgency: input.urgency,
    budget_range: input.budget_range,
    confidence_score: input.confidence_score,
    requested_report: input.requested_report,
    recurring_interest: input.recurring_interest,
    source_agent: baseRow.source_agent,
    target_agent: baseRow.target_agent,
    status: baseRow.status,
    payload_json: payload,
    result_json: input.result_json || {},
    cost_estimate: baseRow.cost_estimate,
    approval_required: baseRow.approval_required,
  });

  return { handoff, packageIdea, signal, packageRequest };
}

export async function writeLeadRepResult(input: LeadRepHandoffInput) {
  return insertLeadRepRow("agent_results", {
    repo: input.repo || "RealRyanNichols/TheLeadFlowPro",
    branch: "main",
    source_agent: input.source_agent || "grok",
    target_agent: input.target_agent || "Codex",
    status: input.status || "received",
    payload_json: input.payload_json || {},
    result_json: input.result_json || {},
    cost_estimate: 0,
    approval_required: true,
  });
}

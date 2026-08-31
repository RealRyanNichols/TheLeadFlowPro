import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  OPERATOR_MODEL_DEFAULTS,
  OPERATOR_OFFERS,
  OPERATOR_STOPLINE_ACTIONS,
  OPERATOR_WORKER_BLUEPRINTS,
  operatorExecutionEnabled,
  requiresHumanApproval,
} from "../lib/operatoros/catalog.ts";
import { extractJsonObject, normalizeOperatorDecision, parseOperatorDecision } from "../lib/operatoros/parse.ts";
import { OPERATOR_PROVIDERS } from "../lib/operatoros/types.ts";

test("OperatorOS provider surface is intentionally bounded", () => {
  assert.deepEqual(OPERATOR_PROVIDERS, ["openai", "anthropic", "human"]);
  assert.equal(OPERATOR_MODEL_DEFAULTS.openai, DEFAULT_OPENAI_MODEL);
  assert.equal(OPERATOR_MODEL_DEFAULTS.anthropic, DEFAULT_ANTHROPIC_MODEL);
  assert.ok(OPERATOR_WORKER_BLUEPRINTS.every((worker) => ["openai", "anthropic"].includes(worker.provider)));
});

test("execution is opt-in and only true means active", () => {
  assert.equal(operatorExecutionEnabled(undefined), false);
  assert.equal(operatorExecutionEnabled("false"), false);
  assert.equal(operatorExecutionEnabled("TRUE"), true);
  assert.equal(operatorExecutionEnabled(" true "), true);
});

test("yellow, red, and stopline action types require a human", () => {
  assert.equal(requiresHumanApproval("yellow", "internal_review"), true);
  assert.equal(requiresHumanApproval("red", "internal_review"), true);
  assert.equal(requiresHumanApproval("green", "internal_review"), false);
  for (const action of OPERATOR_STOPLINE_ACTIONS) {
    assert.equal(requiresHumanApproval("green", action), true);
  }
});

test("provider output parser accepts fenced and plain JSON", () => {
  const body = {
    summary: "Two leads need a next action.",
    outcome: "needs_approval",
    confidence: 84,
    findings: ["Two records are stale."],
    recommended_actions: [
      {
        title: "Prepare follow-up",
        description: "Draft the next message for review.",
        action_type: "send_sensitive_message",
        risk_level: "yellow",
        payload: { count: 2 },
      },
    ],
    evidence: [{ label: "Stale leads", value: 2, source: "CRM" }],
  };
  assert.deepEqual(extractJsonObject(JSON.stringify(body)), body);
  const parsed = parseOperatorDecision(`Here is the result:\n\n\`\`\`json\n${JSON.stringify(body)}\n\`\`\``);
  assert.equal(parsed.outcome, "needs_approval");
  assert.equal(parsed.confidence, 0.84);
  assert.equal(parsed.recommended_actions[0].risk_level, "yellow");
});

test("normalization applies safe defaults instead of trusting malformed fields", () => {
  const result = normalizeOperatorDecision({
    summary: 42,
    outcome: "anything",
    confidence: -9,
    findings: ["one", 2, "three"],
    recommended_actions: [{ title: "Review", risk_level: "unknown" }],
    evidence: [],
  });
  assert.equal(result.outcome, "needs_approval");
  assert.equal(result.confidence, 0);
  assert.deepEqual(result.findings, ["one", "three"]);
  assert.equal(result.recommended_actions[0].risk_level, "yellow");
});

test("public OperatorOS offer copy uses the approved ladder and no em dash", () => {
  assert.deepEqual(
    OPERATOR_OFFERS.map((offer) => offer.name),
    ["FlowWorker", "FlowDesk", "FlowOps", "OperatorOS"],
  );
  const serialized = JSON.stringify(OPERATOR_OFFERS);
  assert.ok(!serialized.includes("—"));
  assert.match(serialized, /\$1,497 setup/);
  assert.match(serialized, /\$9,997\+ setup/);
});

test("database migration locks providers, enables RLS, and adds realtime tables", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260831090000_operatoros_v1.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /provider in \('openai', 'anthropic', 'human'\)/);
  assert.equal((sql.match(/enable row level security/g) || []).length, 9);
  assert.match(sql, /alter publication supabase_realtime add table public\.operator_runs/);
  assert.match(sql, /operator approvals admin all/);
});

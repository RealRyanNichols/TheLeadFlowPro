#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const DRY_RUN_MODE = "dry_run";
const API_MODE = "api";
const COMMENT_MARKER = "<!-- leadrep-orchestrator:v0 -->";

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function runGit(args, fallback = "") {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function readEvent() {
  const eventPath = env("GITHUB_EVENT_PATH");
  if (!eventPath) return {};
  try {
    return JSON.parse(readFileSync(eventPath, "utf8"));
  } catch {
    return {};
  }
}

function parseRepoFromRemote() {
  const remote = runGit(["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return match?.[1] || "RealRyanNichols/TheLeadFlowPro";
}

function getBranch(event) {
  if (env("GITHUB_REF_NAME")) return env("GITHUB_REF_NAME");
  if (event?.repository?.default_branch) return event.repository.default_branch;
  return runGit(["branch", "--show-current"], "main") || "main";
}

function getChangedFiles(event) {
  const before = event?.before;
  const after = event?.after;
  if (before && after && !/^0+$/.test(before)) {
    const diff = runGit(["diff", "--name-only", before, after]);
    if (diff) return diff.split("\n").filter(Boolean);
  }

  const status = runGit(["status", "--short"]);
  if (status) {
    return status
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  }

  const lastCommit = runGit(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
  return lastCommit ? lastCommit.split("\n").filter(Boolean) : [];
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function compactJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildGrokPrompt(context) {
  return [
    "LeadRep Orchestrator v0 handoff.",
    "",
    "Mission: identify verified lead-intelligence work, sellable data packages, predictive signals, conversion fixes, and recurring-revenue opportunities. Do not use court, J6, divorce, legal-service, or pro se workflows.",
    "Agent roles: SignalScout finds source/demand signals, ProofRanker ranks proof strength, PredictivePulse finds repeatable demand, PackageCloser turns approved signals into buyer-ready offers, and Codex patches/builds/commits.",
    "Pass bar: 5 sellable package ideas, 2 buyer-ready packages, 1 paying buyer or serious sales opportunity, 50%+ research time savings, and one clear weekly recurring lead-drop category.",
    "Cancel rule: if Grok only creates research notes and no sellable packages, downgrade it or cancel it.",
    "",
    `Repository: ${context.repo}`,
    `Branch: ${context.branch}`,
    `Build status: ${context.buildStatus}`,
    `Changed files: ${context.changedFiles.length ? context.changedFiles.join(", ") : "none detected"}`,
    `Approval required: ${context.approvalRequired ? "yes" : "no"}`,
    `Max daily Grok cost: $${context.maxDailyCostUsd}`,
    "",
    "Return strict JSON with these keys:",
    "- summary: string",
    "- package_ideas: array of {title, buyer, source_data, proof_needed, price_logic, next_step}",
    "- predictive_signals: array of {signal, source, confidence, revenue_use, verification_step}",
    "- conversion_actions: array of {surface, action, expected_lift, risk}",
    "- risks: array of strings",
    "- next_codex_tasks: array of strings",
    "",
    "Rules:",
    "- no outbound email, SMS, DMs, posts, ads, or publishing",
    "- no secret exposure",
    "- no spending unless explicitly approved",
    "- mark weak data as unverified",
    "- prefer source-backed packages that can produce recurring revenue",
  ].join("\n");
}

async function supabaseRequest(table, method, body, query = "") {
  const busUrl = env("LEADREP_BUS_URL");
  const key = env("LEADREP_BUS_SERVICE_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  if (!busUrl || !key) {
    console.log(`[leadrep] Supabase skipped for ${table}: missing LEADREP_BUS_URL or service key.`);
    return null;
  }

  const response = await fetch(`${busUrl.replace(/\/$/, "")}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${table} ${method} failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function insertBusRow(table, row) {
  const result = await supabaseRequest(table, "POST", row);
  return Array.isArray(result) ? result[0] : result;
}

async function updateBusRow(table, id, patch) {
  return supabaseRequest(table, "PATCH", patch, `?id=eq.${encodeURIComponent(id)}`);
}

async function githubRequest(method, path, body) {
  const token = env("GITHUB_TOKEN");
  const repo = env("GITHUB_REPOSITORY") || parseRepoFromRemote();
  if (!token) {
    console.log(`[leadrep] GitHub ${method} ${path} skipped: missing GITHUB_TOKEN.`);
    return null;
  }

  const response = await fetch(`https://api.github.com${path.replace("{repo}", repo)}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function findOrCreateIssue(event, title, body) {
  const repo = env("GITHUB_REPOSITORY") || parseRepoFromRemote();
  const directIssue = event?.issue?.number || event?.workflow_run?.pull_requests?.[0]?.number;
  if (directIssue) return directIssue;

  const issues = await githubRequest("GET", `/repos/${repo}/issues?state=open&per_page=100`);
  const existing = Array.isArray(issues) ? issues.find((issue) => issue.title === title && !issue.pull_request) : null;
  if (existing?.number) return existing.number;

  const created = await githubRequest("POST", `/repos/${repo}/issues`, {
    title,
    body,
    labels: ["leadrep-orchestrator"],
  });
  return created?.number || null;
}

async function upsertIssueComment(event, body) {
  const repo = env("GITHUB_REPOSITORY") || parseRepoFromRemote();
  const issueNumber = await findOrCreateIssue(
    event,
    "LeadRep Orchestrator Handoff Log",
    "Persistent handoff log for Codex, Supabase, Grok/xAI, GitHub Actions, and Vercel.",
  );
  if (!issueNumber) return;

  const comments = await githubRequest("GET", `/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
  const existing = Array.isArray(comments) ? comments.find((comment) => String(comment.body || "").includes(COMMENT_MARKER)) : null;
  const payload = { body: `${COMMENT_MARKER}\n${body}` };

  if (existing?.id) {
    await githubRequest("PATCH", `/repos/${repo}/issues/comments/${existing.id}`, payload);
  } else {
    await githubRequest("POST", `/repos/${repo}/issues/${issueNumber}/comments`, payload);
  }
}

async function callGrok(prompt) {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) throw new Error("XAI_API_KEY is required for api mode.");

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env("XAI_MODEL", "grok-3-latest"),
      messages: [
        {
          role: "system",
          content: "You are a revenue-focused lead intelligence analyst. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`xAI request failed: ${response.status} ${text}`);
  return JSON.parse(text);
}

function extractAssistantText(grokResponse) {
  return grokResponse?.choices?.[0]?.message?.content || "";
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function persistStructuredResults(context, parsed, rawText) {
  const resultJson = parsed || { raw_text: rawText };
  await insertBusRow("agent_results", {
    id: randomUUID(),
    repo: context.repo,
    branch: context.branch,
    source_agent: "grok",
    target_agent: "codex",
    status: parsed ? "completed" : "needs_review",
    payload_json: { handoff_id: context.handoffId },
    result_json: resultJson,
    cost_estimate: context.costEstimate,
    approval_required: true,
  });

  const packageIdeas = Array.isArray(parsed?.package_ideas) ? parsed.package_ideas.slice(0, 12) : [];
  for (const idea of packageIdeas) {
    await insertBusRow("package_ideas", {
      id: randomUUID(),
      repo: context.repo,
      branch: context.branch,
      source_agent: "grok",
      target_agent: "codex",
      status: "candidate",
      payload_json: { handoff_id: context.handoffId, idea },
      result_json: {},
      cost_estimate: context.costEstimate,
      approval_required: true,
    });
  }

  const predictiveSignals = Array.isArray(parsed?.predictive_signals) ? parsed.predictive_signals.slice(0, 12) : [];
  for (const signal of predictiveSignals) {
    await insertBusRow("predictive_signals", {
      id: randomUUID(),
      repo: context.repo,
      branch: context.branch,
      source_agent: "grok",
      target_agent: "codex",
      status: "candidate",
      payload_json: { handoff_id: context.handoffId, signal },
      result_json: {},
      cost_estimate: context.costEstimate,
      approval_required: true,
    });
  }
}

function buildComment(context, prompt, mode, resultText = "") {
  const lines = [
    `## LeadRep Orchestrator v0`,
    "",
    `Repo: \`${context.repo}\``,
    `Branch: \`${context.branch}\``,
    `Build: \`${context.buildStatus}\``,
    `Mode: \`${mode}\``,
    `Approval required: \`${context.approvalRequired}\``,
    `Changed files: ${context.changedFiles.length ? context.changedFiles.map((file) => `\`${file}\``).join(", ") : "none detected"}`,
    "",
  ];

  if (resultText) {
    lines.push("### Grok Result", "", "```json", resultText.slice(0, 6000), "```", "");
  } else {
    lines.push(
      "### Manual Grok Prompt",
      "",
      "Paste this prompt into Grok manually, then add the result back to this issue/PR before Codex implements any publishing, outreach, paid API, pricing, or buyer-facing change.",
      "",
      "```text",
      prompt,
      "```",
      "",
    );
  }

  return lines.join("\n");
}

async function main() {
  const event = readEvent();
  const repo = env("GITHUB_REPOSITORY") || env("LEADREP_GITHUB_REPOSITORY") || parseRepoFromRemote();
  const branch = getBranch(event);
  const buildStatus = env("LEADREP_BUILD_STATUS", "unknown");
  const grokMode = env("LEADREP_GROK_MODE", DRY_RUN_MODE);
  const approvalMode = env("LEADREP_APPROVAL_MODE", "manual");
  const eventApproval = event?.inputs?.approval_required ?? event?.client_payload?.approval_required;
  const approvalRequired = toBoolean(eventApproval, approvalMode !== "auto");
  const changedFiles = getChangedFiles(event);
  const maxDailyCostUsd = Number(env("GROK_MAX_DAILY_COST_USD", "10"));
  const costEstimate = grokMode === API_MODE && !approvalRequired ? 0.25 : 0;

  const promptContext = {
    repo,
    branch,
    buildStatus,
    changedFiles,
    approvalRequired,
    maxDailyCostUsd,
  };
  const prompt = buildGrokPrompt(promptContext);
  const handoffId = randomUUID();
  const runId = randomUUID();
  const baseRow = {
    repo,
    branch,
    source_agent: "github_actions",
    target_agent: approvalRequired ? "codex" : "grok",
    status: buildStatus === "success" ? (approvalRequired ? "approval_required" : "ready") : "build_failed",
    payload_json: {
      event_name: env("GITHUB_EVENT_NAME"),
      sha: env("GITHUB_SHA") || runGit(["rev-parse", "HEAD"]),
      changed_files: changedFiles,
      grok_mode: grokMode,
      vercel_project: env("LEADREP_VERCEL_PROJECT"),
      prompt,
    },
    result_json: {},
    cost_estimate: costEstimate,
    approval_required: approvalRequired,
  };

  await insertBusRow("agent_handoffs", { id: handoffId, ...baseRow });
  await insertBusRow("agent_runs", { id: runId, ...baseRow });

  const context = { ...promptContext, handoffId, runId, costEstimate };

  if (buildStatus !== "success") {
    await insertBusRow("approval_queue", {
      id: randomUUID(),
      ...baseRow,
      target_agent: "codex",
      status: "build_failed",
      approval_required: true,
    });
    await upsertIssueComment(event, buildComment(context, prompt, "build_failed"));
    return;
  }

  if (approvalRequired) {
    await insertBusRow("approval_queue", {
      id: randomUUID(),
      ...baseRow,
      target_agent: "codex",
      status: "needs_approval",
      approval_required: true,
    });
    await upsertIssueComment(event, buildComment(context, prompt, DRY_RUN_MODE));
    return;
  }

  if (grokMode !== API_MODE || !env("XAI_API_KEY")) {
    await upsertIssueComment(event, buildComment(context, prompt, DRY_RUN_MODE));
    await updateBusRow("agent_handoffs", handoffId, { status: "dry_run", updated_at: new Date().toISOString() });
    await updateBusRow("agent_runs", runId, { status: "dry_run", updated_at: new Date().toISOString() });
    return;
  }

  const grokResponse = await callGrok(prompt);
  const resultText = extractAssistantText(grokResponse);
  const parsed = tryParseJson(resultText);
  await persistStructuredResults(context, parsed, resultText);
  await updateBusRow("agent_handoffs", handoffId, {
    status: "completed",
    result_json: parsed || { raw_text: resultText },
    updated_at: new Date().toISOString(),
  });
  await updateBusRow("agent_runs", runId, {
    status: "completed",
    result_json: parsed || { raw_text: resultText },
    updated_at: new Date().toISOString(),
  });
  await upsertIssueComment(event, buildComment(context, prompt, API_MODE, parsed ? compactJson(parsed) : resultText));
}

main().catch(async (error) => {
  console.error(`[leadrep] ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});

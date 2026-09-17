import assert from "node:assert/strict";
import test from "node:test";
import { copyProblems } from "../lib/hq/copy.ts";
import { HQ_PLAN } from "../lib/hq/types.ts";
import { TOOL_SPECS } from "../lib/hq/mcp.ts";
import {
  PLUGIN,
  PLUGIN_CHANGELOG,
  PLUGIN_DEMOS,
  PLUGIN_FAQ,
  PLUGIN_PLATFORMS,
  PLUGIN_TASKS,
} from "../lib/pluginDocs.ts";
import {
  PLUGIN_EMAIL_STEPS,
  PLUGIN_ONBOARDING_SEQUENCE,
  pluginEmailDedupeKey,
} from "../lib/pluginOnboarding.ts";
import { PRICES, usd } from "../lib/site/prices.ts";

const toolNames = new Set(TOOL_SPECS.map((t) => t.name));

test("the product page reads its price and trial from the one plan definition", () => {
  assert.equal(PLUGIN.priceUsd, HQ_PLAN.priceUsd);
  assert.equal(PLUGIN.priceUsd, PRICES.pluginMonthly);
  assert.equal(PLUGIN.trialDays, PRICES.pluginTrialDays);
  assert.equal(PLUGIN.priceLabel, `${usd(PRICES.pluginMonthly)} a month`);
  assert.equal(PLUGIN.mcpUrl, "https://www.theleadflowpro.com/api/mcp");
});

test("every first task names tools the MCP server actually exposes", () => {
  for (const task of PLUGIN_TASKS) {
    assert.ok(task.tools.length > 0, task.prompt);
    for (const tool of task.tools) assert.ok(toolNames.has(tool), `${task.prompt} names unknown tool ${tool}`);
  }
});

test("install instructions cover the four platforms and name the check", () => {
  assert.deepEqual(
    PLUGIN_PLATFORMS.map((p) => p.id),
    ["chatgpt", "claude", "claude-code", "cursor"],
  );
  for (const platform of PLUGIN_PLATFORMS) {
    assert.ok(platform.steps.length >= 2, platform.id);
    assert.match(platform.check, /^Ask it: /, platform.id);
  }
  assert.ok(PLUGIN_PLATFORMS.find((p) => p.id === "claude-code")?.steps.some((s) => s.includes(PLUGIN.mcpUrl)));
});

test("demonstrations never ship a fake frame and always say what will be captured", () => {
  assert.ok(PLUGIN_DEMOS.length >= 2 && PLUGIN_DEMOS.length <= 3);
  for (const demo of PLUGIN_DEMOS) {
    assert.equal(demo.media, null, `${demo.id} must not point at an image until Ryan captures it`);
    assert.ok(demo.capture.length > 40, demo.id);
    assert.ok(demo.exchange.length >= 1, demo.id);
  }
});

test("the FAQ answers installation, platforms, data handling, and cancellation, and passes the copy rules", () => {
  const questions = PLUGIN_FAQ.map((f) => f.q.toLowerCase());
  for (const needle of ["installing", "platforms", "data", "cancel"]) {
    assert.ok(questions.some((q) => q.includes(needle)), `FAQ lacks a question about ${needle}`);
  }
  for (const f of PLUGIN_FAQ) {
    assert.deepEqual(copyProblems(f.a), [], `${f.q}: ${copyProblems(f.a).join("; ")}`);
  }
  const cancel = PLUGIN_FAQ.find((f) => f.q.toLowerCase().includes("cancel"))!;
  assert.match(cancel.a, /Billing/);
  assert.match(cancel.a, /end of the period/);
});

test("the changelog is dated, newest first, and starts at the served version", () => {
  assert.ok(PLUGIN_CHANGELOG.length >= 1);
  for (const entry of PLUGIN_CHANGELOG) {
    assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, entry.version);
    assert.ok(entry.notes.length > 0, entry.version);
  }
  for (let i = 1; i < PLUGIN_CHANGELOG.length; i++) {
    assert.ok(PLUGIN_CHANGELOG[i - 1].date >= PLUGIN_CHANGELOG[i].date, "newest first");
  }
  assert.equal(PLUGIN_CHANGELOG[PLUGIN_CHANGELOG.length - 1].version, PLUGIN.version);
});

test("onboarding emails are unactivated drafts that pass the copy rules and point at real pages", () => {
  assert.equal(PLUGIN_ONBOARDING_SEQUENCE.activated, false);
  const ctx = { first: "Dana Whitfield", businessName: "Kirby Plumbing", trialEndsAt: "2026-10-01T12:00:00Z" };
  for (const step of PLUGIN_EMAIL_STEPS) {
    const text = `${step.subject(ctx)}\n${step.body(ctx)}`;
    assert.deepEqual(copyProblems(text), [], `${step.key}: ${copyProblems(text).join("; ")}`);
    assert.ok(step.body(ctx).startsWith("Dana,"), step.key);
    assert.ok(step.body(ctx).includes("(903) 500-8898"), step.key);
    assert.ok(step.body(ctx).includes("https://www.theleadflowpro.com/"), step.key);
    assert.ok(step.body(ctx).length < 1800, `${step.key} runs long`);
  }
  const welcome = PLUGIN_EMAIL_STEPS[0].body(ctx);
  assert.match(welcome, /trial runs through October 1/);
  assert.ok(!PLUGIN_EMAIL_STEPS[0].body({ ...ctx, trialEndsAt: null }).includes("trial runs"));
  assert.ok(PLUGIN_EMAIL_STEPS[2].body(ctx).includes(usd(PRICES.pluginMonthly)));
  assert.notEqual(pluginEmailDedupeKey("ws1", 403, "2026-10"), pluginEmailDedupeKey("ws1", 403, "2026-11"));
});

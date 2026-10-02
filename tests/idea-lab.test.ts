import test from "node:test";
import assert from "node:assert/strict";
import {
  IDEA_SOURCES,
  IDEA_WORKSTREAMS,
  RELEASE_CHECKS,
  advanceIdeaRun,
  buildIdeaPacket,
  canonicalPostUrl,
  importIdeaLinks,
  modelIdeaEconomics,
  newIdeaRun,
  releaseReadiness,
  retryIdeaRun,
  type CheckEvidence,
  type ReleaseCheck,
} from "../lib/ideaLab.ts";

test("all 23 supplied posts map to a real workstream without upgrading author claims", () => {
  assert.equal(IDEA_SOURCES.length, 23);
  assert.equal(new Set(IDEA_SOURCES.map((item) => item.id)).size, 23);
  for (const item of IDEA_SOURCES) {
    assert.equal(item.review, "post_text_reviewed");
    assert.ok(item.caveat.length > 20);
    assert.ok(item.lanes.length > 0);
    for (const lane of item.lanes)
      assert.ok(IDEA_WORKSTREAMS.some((entry) => entry.id === lane));
  }
  for (const item of IDEA_WORKSTREAMS) {
    const packet = buildIdeaPacket(item.id);
    assert.ok(packet.sources.length > 0);
    assert.equal(packet.productStatus, "not_built");
    assert.equal(packet.execution.externalActionsEnabled, false);
    assert.equal(packet.execution.budgetUsd, 0);
  }
});

test("URL imports deduplicate across handles and tracking; fresh imports require review", () => {
  const result = importIdeaLinks(
    [
      "https://twitter.com/nutlope/status/2099547343112564921?s=20",
      "https://x.com/AnotherHandle/status/2099547343112564921",
      "https://x.com/sample/status/2101234567890123456/photo/1?s=20",
      "https://x.com/sample/status/2101234567890123456",
      "https://evil.example/x.com/sample/status/2101234567890123457",
    ].join("\n"),
  );
  assert.equal(result.duplicates, 3);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.added.length, 1);
  assert.equal(
    result.added[0].url,
    "https://x.com/sample/status/2101234567890123456",
  );
  assert.equal(result.added[0].review, "awaiting_review");
  assert.equal(result.added[0].reviewedOn, null);
  assert.deepEqual(result.added[0].lanes, []);
});

test("URL parsing rejects unsafe schemes, hosts, credentials, ports, and unsupported pages", () => {
  for (const value of [
    "javascript:alert(1)",
    "http://x.com/sample/status/2101234567890123456",
    "https://x.com.evil.example/sample/status/2101234567890123456",
    "https://secret@x.com/sample/status/2101234567890123456",
    "https://x.com:444/sample/status/2101234567890123456",
    "https://x.com/sample",
    "https://x.com/sample/status/123",
    "https://x.com/sample/status/2101234567890123456/analytics",
  ])
    assert.equal(canonicalPostUrl(value), null);
  assert.throws(() => importIdeaLinks("x".repeat(100_001)));
});

test("jobs cannot skip proof, bypass blocked state, or move beyond release review", () => {
  let run = newIdeaRun("workflows");
  assert.throws(() =>
    advanceIdeaRun(
      run,
      "built",
      [{ kind: "artifact", reference: "build" }],
      "skip",
    ),
  );
  assert.throws(() => advanceIdeaRun(run, "researched", [], "empty"));
  run = advanceIdeaRun(
    run,
    "researched",
    [{ kind: "source_review", reference: "review-23-posts" }],
    "sources reviewed",
  );
  run = advanceIdeaRun(
    run,
    "specified",
    [{ kind: "scope", reference: "workflows.md" }],
    "scope recorded",
  );
  run = advanceIdeaRun(run, "blocked", [], "missing build artifact");
  assert.throws(() =>
    advanceIdeaRun(
      run,
      "built",
      [{ kind: "artifact", reference: "build" }],
      "silent retry",
    ),
  );
  run = retryIdeaRun(run, "input corrected");
  assert.equal(run.attempts, 2);
  run = advanceIdeaRun(
    run,
    "built",
    [{ kind: "artifact", reference: "review-build" }],
    "local artifact exists",
  );
  run = advanceIdeaRun(
    run,
    "verified",
    [{ kind: "verification", reference: "test-run" }],
    "checks passed",
  );
  assert.throws(() =>
    advanceIdeaRun(
      run,
      "approval_queue",
      [{ kind: "release_checks", reference: "checks" }],
      "not ready",
    ),
  );
  const checks = Object.fromEntries(
    RELEASE_CHECKS.map((key) => [
      key,
      { status: "pass", evidence: `proof:${key}` },
    ]),
  ) as Record<ReleaseCheck, CheckEvidence>;
  run = advanceIdeaRun(
    run,
    "approval_queue",
    [{ kind: "release_checks", reference: "checks" }],
    "review packet complete",
    checks,
  );
  assert.equal(run.stage, "approval_queue");
  assert.throws(() => advanceIdeaRun(run, "verified", [], "execute"));
});

test("retry and spending limits cannot be silently exceeded", () => {
  let run = advanceIdeaRun(
    newIdeaRun("knowledge", 0, 1),
    "blocked",
    [],
    "review needed",
  );
  assert.throws(() => retryIdeaRun(run, "try again"));
  run = newIdeaRun("knowledge");
  assert.throws(() =>
    advanceIdeaRun(
      { ...run, spentUsd: 1 },
      "researched",
      [{ kind: "source_review", reference: "proof" }],
      "over budget",
    ),
  );
  assert.throws(() => newIdeaRun("knowledge", Infinity));
});

test("a release requires explicit applicable or justified not-applicable evidence", () => {
  assert.equal(releaseReadiness({}).blockers.length, RELEASE_CHECKS.length);
  const checks = Object.fromEntries(
    RELEASE_CHECKS.map((key) => [
      key,
      {
        status: "not_applicable",
        evidence: "No form, no payment, or documented applicable review",
      },
    ]),
  ) as Record<ReleaseCheck, CheckEvidence>;
  checks.auth = {
    status: "fail",
    evidence: "unsigned URL exposed private data",
  };
  assert.deepEqual(releaseReadiness(checks).blockers, ["auth"]);
  checks.auth = { status: "pass", evidence: "" };
  assert.deepEqual(releaseReadiness(checks).blockers, ["auth"]);
});

test("scenario math separates hypothetical gross revenue from costs and includes churn", () => {
  const input = {
    months: 12,
    startingCustomers: 0,
    newCustomersPerMonth: 30,
    monthlyPriceUsd: 99,
    monthlyChurnRate: 0,
    variableCostPerCustomerUsd: 20,
    supportHoursPerCustomer: 0.5,
    hourlyCostUsd: 30,
    fixedCostUsd: 100,
    acquisitionCostPerCustomerUsd: 50,
  };
  const scenario = modelIdeaEconomics(input);
  const last = scenario.rows[11];
  assert.equal(last.expectedCustomers, 360);
  assert.equal(last.grossRevenueUsd, 35_640);
  assert.equal(last.supportHours, 180);
  assert.equal(last.operatingCostUsd, 14_200);
  assert.equal(last.contributionUsd, 21_440);
  assert.equal(scenario.kind, "assumption_based_scenario");
  assert.ok(
    modelIdeaEconomics({ ...input, monthlyChurnRate: 0.1 }).rows[11]
      .grossRevenueUsd < last.grossRevenueUsd,
  );
  for (const invalid of [
    { monthlyChurnRate: 2 },
    { months: 0 },
    { monthlyPriceUsd: Infinity },
    { newCustomersPerMonth: -1 },
  ]) {
    assert.throws(() => modelIdeaEconomics({ ...input, ...invalid }));
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  compileIdeaOutcomeWorkflow,
  defaultIdeaOutcomeExperiment,
  evaluateIdeaOutcomeExperiment,
  ideaOutcomeMarkdown,
  validateIdeaOutcomeExperiment,
  type IdeaOutcomeExperiment,
} from "../lib/ideaLabOutcome.ts";

function recordedPilot(): IdeaOutcomeExperiment {
  return {
    ...defaultIdeaOutcomeExperiment("recorded-pilot"),
    name: "Permitted follow-up pilot",
    sourceReference: "Approved lead review procedure, revision 2",
    baseline: { leads: 100, bookings: 10, minutes: 1000, cost: 200 },
    pilot: { leads: 200, bookings: 40, minutes: 1200, cost: 300 },
    contributionPerBooking: 150,
    minimumBookingLiftPoints: 5,
    evidence: {
      baseline: "Baseline CRM cohort, 100 deduplicated leads",
      pilot: "Pilot CRM cohort, 200 deduplicated leads",
    },
  };
}

function close(actual: number | null, expected: number) {
  assert.notEqual(actual, null);
  assert.ok(
    Math.abs(actual! - expected) < 1e-8,
    `${actual} should equal ${expected}`,
  );
}

test("a new pilot contains no invented measurements or evidence", () => {
  const experiment = defaultIdeaOutcomeExperiment();
  const result = evaluateIdeaOutcomeExperiment(experiment);
  assert.deepEqual(experiment.baseline, {
    leads: 0,
    bookings: 0,
    minutes: null,
    cost: null,
  });
  assert.deepEqual(experiment.pilot, experiment.baseline);
  assert.equal(result.status, "needs_evidence");
  for (const value of Object.values(result.metrics)) assert.equal(value, null);
  assert.equal(result.reasons.length, 3);
});

test("unequal cohorts are normalized by leads and contribution stays a scenario", () => {
  const result = evaluateIdeaOutcomeExperiment(recordedPilot());
  assert.equal(result.status, "promising");
  close(result.metrics.baselineBookingRate, 10);
  close(result.metrics.pilotBookingRate, 20);
  close(result.metrics.bookingLiftPoints, 10);
  close(result.metrics.additionalBookingsPer100Leads, 10);
  close(result.metrics.baselineMinutesPerLead, 10);
  close(result.metrics.pilotMinutesPerLead, 6);
  close(result.metrics.minutesSavedPer100Leads, 400);
  close(result.metrics.baselineCostPerLead, 2);
  close(result.metrics.pilotCostPerLead, 1.5);
  close(result.metrics.costDifferencePer100Leads, -50);
  close(result.metrics.netContributionProxyPer100Leads, 1550);
  assert.match(result.limitations.join(" "), /do not establish.*caused/);
  assert.match(result.limitations.join(" "), /not.*revenue or profit/);
  assert.match(result.limitations.join(" "), /not.*statistical significance/);
});

test("an evidence reference is required for each cohort before an assessment", () => {
  for (const key of ["baseline", "pilot"] as const) {
    const experiment = recordedPilot();
    experiment.evidence[key] = "  ";
    const result = evaluateIdeaOutcomeExperiment(experiment);
    assert.equal(result.status, "needs_evidence");
    assert.match(result.reasons[0], new RegExp(key));
    close(result.metrics.bookingLiftPoints, 10);
  }
});

test("the workflow instruction and source reference are required before an assessment", () => {
  for (const key of ["workflowNote", "sourceReference"] as const) {
    const experiment = recordedPilot();
    experiment[key] = " ";
    const result = evaluateIdeaOutcomeExperiment(experiment);
    assert.equal(result.status, "needs_evidence");
    assert.match(
      result.reasons[0],
      key === "workflowNote" ? /workflow instruction/ : /source reference/,
    );
  }
});

test("unrecorded time or cost stays null and prevents a promising assessment", () => {
  for (const key of ["baseline", "pilot"] as const) {
    for (const field of ["minutes", "cost"] as const) {
      const experiment = recordedPilot();
      experiment[key][field] = null;
      const normalized = validateIdeaOutcomeExperiment(experiment);
      const result = evaluateIdeaOutcomeExperiment(normalized);
      assert.equal(normalized[key][field], null);
      assert.equal(result.status, "review");
      assert.match(
        result.reasons.join(" "),
        field === "minutes" ? /time in minutes/ : /cost/,
      );
      if (field === "cost") {
        assert.equal(result.metrics.costDifferencePer100Leads, null);
        assert.equal(result.metrics.netContributionProxyPer100Leads, null);
      } else assert.equal(result.metrics.minutesSavedPer100Leads, null);
      const markdown = ideaOutcomeMarkdown(experiment);
      assert.match(markdown, /Not recorded/);
      assert.doesNotMatch(markdown, /\| null \|/);
    }
  }
});

test("explicit zero time and cost are accepted as recorded operating values", () => {
  const experiment = recordedPilot();
  experiment.baseline.minutes = 0;
  experiment.pilot.minutes = 0;
  experiment.baseline.cost = 0;
  experiment.pilot.cost = 0;
  const result = evaluateIdeaOutcomeExperiment(experiment);
  assert.equal(result.status, "promising");
  close(result.metrics.minutesSavedPer100Leads, 0);
  close(result.metrics.costDifferencePer100Leads, 0);
});

test("tiny cohorts cannot become promising, even with a large apparent lift", () => {
  const experiment = recordedPilot();
  experiment.baseline = { leads: 19, bookings: 1, minutes: 190, cost: 19 };
  experiment.pilot = { leads: 19, bookings: 19, minutes: 19, cost: 0 };
  const result = evaluateIdeaOutcomeExperiment(experiment);
  assert.equal(result.status, "review");
  assert.equal(result.reasons.length, 2);
  assert.match(result.reasons[0], /20 baseline leads/);
  assert.match(result.reasons[1], /20 pilot leads/);
});

test("cost and time guardrails compare per lead rather than misleading total sizes", () => {
  const lowerCost = evaluateIdeaOutcomeExperiment(recordedPilot());
  assert.equal(lowerCost.status, "promising");
  for (const field of ["minutes", "cost"] as const) {
    const experiment = recordedPilot();
    experiment.pilot[field] = experiment.baseline[field]! * 2.1;
    const result = evaluateIdeaOutcomeExperiment(experiment);
    assert.equal(result.status, "review");
    assert.match(
      result.reasons.join(" "),
      field === "cost"
        ? /Cost per lead increased/
        : /Time spent per lead increased/,
    );
  }
});

test("the user target controls the decision and its exact boundary tolerates floating arithmetic", () => {
  const experiment = recordedPilot();
  experiment.baseline = { leads: 100, bookings: 10, minutes: 100, cost: 100 };
  experiment.pilot = { leads: 100, bookings: 15, minutes: 100, cost: 100 };
  assert.equal(evaluateIdeaOutcomeExperiment(experiment).status, "promising");
  experiment.minimumBookingLiftPoints = 5.01;
  assert.equal(evaluateIdeaOutcomeExperiment(experiment).status, "iterate");
  experiment.pilot.bookings = 8;
  close(
    evaluateIdeaOutcomeExperiment(experiment).metrics.bookingLiftPoints,
    -2,
  );
});

test("a zero target cannot classify an unchanged booking rate as promising", () => {
  const experiment = recordedPilot();
  experiment.minimumBookingLiftPoints = 0;
  experiment.pilot.bookings = 20;
  const result = evaluateIdeaOutcomeExperiment(experiment);
  close(result.metrics.bookingLiftPoints, 0);
  assert.equal(result.status, "iterate");
  assert.deepEqual(result.reasons, [
    "No recorded improvement in booking rate.",
  ]);
  experiment.pilot.bookings = 21;
  assert.equal(evaluateIdeaOutcomeExperiment(experiment).status, "promising");
});

test("zero denominators never produce Infinity or a false success", () => {
  const experiment = recordedPilot();
  experiment.baseline = { leads: 0, bookings: 0, minutes: 0, cost: 0 };
  const result = evaluateIdeaOutcomeExperiment(experiment);
  assert.equal(result.status, "review");
  assert.equal(result.metrics.baselineBookingRate, null);
  assert.equal(result.metrics.bookingLiftPoints, null);
  assert.equal(result.metrics.netContributionProxyPer100Leads, null);
});

test("invalid counts, impossible bookings and nonfinite or negative inputs are rejected", () => {
  const badCohorts = [
    { leads: -1, bookings: 0, minutes: 0, cost: 0 },
    { leads: 1.5, bookings: 0, minutes: 0, cost: 0 },
    { leads: 20, bookings: 1.5, minutes: 0, cost: 0 },
    { leads: 20, bookings: 21, minutes: 0, cost: 0 },
    { leads: Infinity, bookings: 0, minutes: 0, cost: 0 },
    { leads: 20, bookings: 1, minutes: NaN, cost: 0 },
    { leads: 20, bookings: 1, minutes: 0, cost: -0.01 },
    { leads: 0, bookings: 0, minutes: 1, cost: 0 },
    { leads: 0, bookings: 0, minutes: 0, cost: 1 },
    { leads: 10_000_001, bookings: 0, minutes: 0, cost: 0 },
  ];
  for (const baseline of badCohorts)
    assert.throws(() =>
      validateIdeaOutcomeExperiment({ ...recordedPilot(), baseline }),
    );
  for (const contributionPerBooking of [-1, Infinity, NaN, "150"])
    assert.throws(() =>
      validateIdeaOutcomeExperiment({
        ...recordedPilot(),
        contributionPerBooking,
      }),
    );
  for (const minimumBookingLiftPoints of [-1, Infinity, 101])
    assert.throws(() =>
      validateIdeaOutcomeExperiment({
        ...recordedPilot(),
        minimumBookingLiftPoints,
      }),
    );
});

test("the private document bounds notes and references and strips execution claims", () => {
  assert.throws(() =>
    validateIdeaOutcomeExperiment({ ...recordedPilot(), id: "../../outside" }),
  );
  assert.throws(() =>
    validateIdeaOutcomeExperiment({ ...recordedPilot(), name: " " }),
  );
  assert.throws(() =>
    validateIdeaOutcomeExperiment({
      ...recordedPilot(),
      workflowNote: "x".repeat(6001),
    }),
  );
  assert.throws(() =>
    validateIdeaOutcomeExperiment({
      ...recordedPilot(),
      sourceReference: "x".repeat(2001),
    }),
  );
  assert.throws(() =>
    validateIdeaOutcomeExperiment({
      ...recordedPilot(),
      evidence: { baseline: "x".repeat(2001), pilot: "record" },
    }),
  );
  const normalized = validateIdeaOutcomeExperiment({
    ...recordedPilot(),
    automaticSending: true,
    status: "proven",
    revenue: 1_000_000,
    pilot: { ...recordedPilot().pilot, paidOrders: 999 },
  });
  assert.equal("automaticSending" in normalized, false);
  assert.equal("status" in normalized, false);
  assert.equal("revenue" in normalized, false);
  assert.equal("paidOrders" in normalized.pilot, false);
});

test("workflow compilation has an explicit approval stage and cannot execute anything", () => {
  const experiment = recordedPilot();
  const stages = compileIdeaOutcomeWorkflow(experiment);
  assert.deepEqual(
    stages.map((stage) => stage.id),
    ["source", "draft", "approval", "record"],
  );
  assert.ok(stages.every((stage) => stage.execution === "manual"));
  assert.match(stages[0].instruction, /revision 2/);
  assert.match(stages[1].instruction, /prepare a follow-up draft/);
  assert.match(stages[2].instruction, /approve any contact before it happens/);
  assert.match(stages[2].instruction, /cannot send/);
  assert.match(stages[3].instruction, /not a completed job or payment/);
  assert.deepEqual(stages, compileIdeaOutcomeWorkflow(experiment));
});

test("reports preserve references, guardrails and limits on results claims", () => {
  const experiment = recordedPilot();
  experiment.evidence.pilot = "";
  const markdown = ideaOutcomeMarkdown(experiment);
  assert.match(markdown, /Assessment: Add evidence first/);
  assert.match(markdown, /Baseline CRM cohort/);
  assert.match(markdown, /Test record: Not supplied/);
  assert.match(markdown, /10 percentage points/);
  assert.match(markdown, /not actual attributable revenue or profit/);
  assert.match(markdown, /do not establish.*caused/);
  assert.match(markdown, /approve any contact before it happens/);
  assert.match(markdown, /Leads that booked work \(count each lead once\)/);
  assert.match(
    markdown,
    /Count each lead once, even if they book multiple jobs/,
  );
  assert.match(markdown, /External execution is disabled/);
});

test("reports do not invent an entered financial estimate when the scenario is disabled", () => {
  const experiment = recordedPilot();
  experiment.contributionPerBooking = 0;
  const markdown = ideaOutcomeMarkdown(experiment);
  assert.doesNotMatch(markdown, /## Contribution scenario/);
  assert.doesNotMatch(markdown, /User-entered contribution estimate/);
  assert.match(markdown, /Total cost/);
  assert.match(markdown, /not measured revenue or profit/);
});

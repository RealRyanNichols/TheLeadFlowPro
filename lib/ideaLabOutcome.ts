/** A private, manually recorded lead-follow-up pilot. This never contacts a lead. */
export type IdeaOutcomeCohort = {
  leads: number;
  /** Unique leads that booked work; count each lead once, even with multiple jobs. */
  bookings: number;
  minutes: number | null;
  cost: number | null;
};

export type IdeaOutcomeExperiment = {
  id: string;
  name: string;
  workflowNote: string;
  sourceReference: string;
  baseline: IdeaOutcomeCohort;
  pilot: IdeaOutcomeCohort;
  /** Scenario estimate per converted lead, not per repeated job or payment. */
  contributionPerBooking: number;
  minimumBookingLiftPoints: number;
  evidence: { baseline: string; pilot: string };
};

export type IdeaOutcomeStage = {
  id: "source" | "draft" | "approval" | "record";
  title: string;
  instruction: string;
  execution: "manual";
};

export type IdeaOutcomeMetrics = {
  /** Percent of unique leads that booked work, from 0 to 100. */
  baselineBookingRate: number | null;
  pilotBookingRate: number | null;
  bookingLiftPoints: number | null;
  baselineMinutesPerLead: number | null;
  pilotMinutesPerLead: number | null;
  minutesSavedPer100Leads: number | null;
  baselineCostPerLead: number | null;
  pilotCostPerLead: number | null;
  costDifferencePer100Leads: number | null;
  additionalBookingsPer100Leads: number | null;
  netContributionProxyPer100Leads: number | null;
};

export type IdeaOutcomeEvaluation = {
  status: "needs_evidence" | "review" | "promising" | "iterate";
  label: string;
  summary: string;
  reasons: string[];
  metrics: IdeaOutcomeMetrics;
  workflow: IdeaOutcomeStage[];
  limitations: string[];
};

export const IDEA_OUTCOME_MINIMUM_COHORT = 20;
export const IDEA_OUTCOME_LIMITATIONS = [
  "Booking counts mean unique leads that booked work. Count each lead once, even if that lead books multiple jobs.",
  "Before/after observations do not establish that the workflow caused the change.",
  "Bookings are not completed jobs, won jobs, paid invoices, or revenue.",
  "Evidence references and counts are supplied by the user; their contents have not been independently verified.",
  "The contribution proxy uses a user-entered estimate. It is not measured revenue or profit.",
  "Twenty leads per cohort is a review floor, not a claim of statistical significance.",
  "The workflow is a manual plan. No AI provider, messaging service, or external execution is connected.",
] as const;

const maximumCount = 10_000_000;
const maximumAmount = 1_000_000_000;
const comparisonTolerance = 1e-9;

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(message);
  return value as Record<string, unknown>;
}

function textField(
  value: unknown,
  label: string,
  maximum: number,
  required = false,
): string {
  if (
    typeof value !== "string" ||
    value.length > maximum ||
    (required && !value.trim())
  )
    throw new Error(
      `${label} must be text under ${maximum} characters${required ? " and cannot be empty" : ""}.`,
    );
  return value;
}

function amount(value: unknown, label: string, maximum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum
  )
    throw new Error(`${label} must be a finite number from 0 to ${maximum}.`);
  return value === 0 ? 0 : value;
}

function optionalAmount(value: unknown, label: string): number | null {
  return value === null ? null : amount(value, label, maximumAmount);
}

function cohort(value: unknown, label: string): IdeaOutcomeCohort {
  const item = record(value, `${label} measurements are required.`);
  const leads = amount(item.leads, `${label} leads`, maximumCount);
  const bookings = amount(
    item.bookings,
    `${label} leads that booked work`,
    maximumCount,
  );
  if (!Number.isSafeInteger(leads) || !Number.isSafeInteger(bookings))
    throw new Error(
      `${label} total leads and leads that booked work must be whole counts.`,
    );
  if (bookings > leads)
    throw new Error(
      `${label} leads that booked work cannot exceed total leads. Count each lead once.`,
    );
  const minutes = optionalAmount(item.minutes, `${label} minutes`);
  const cost = optionalAmount(item.cost, `${label} cost`);
  if (leads === 0 && ((minutes ?? 0) > 0 || (cost ?? 0) > 0))
    throw new Error(
      `${label} needs a lead count before recording time or cost.`,
    );
  return { leads, bookings, minutes, cost };
}

/** Normalize a bounded document; ignore attempted execution flags or AI claims. */
export function validateIdeaOutcomeExperiment(
  value: unknown,
): IdeaOutcomeExperiment {
  const item = record(value, "A pilot is required.");
  const id = textField(item.id, "Pilot ID", 80, true);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id))
    throw new Error(
      "Pilot ID must contain letters, numbers, dashes, or underscores.",
    );
  const evidence = record(
    item.evidence,
    "Baseline and pilot evidence fields are required.",
  );
  return {
    id,
    name: textField(item.name, "Pilot name", 160, true),
    workflowNote: textField(item.workflowNote, "Workflow note", 6000),
    sourceReference: textField(item.sourceReference, "Source reference", 2000),
    baseline: cohort(item.baseline, "Baseline"),
    pilot: cohort(item.pilot, "Pilot"),
    contributionPerBooking: amount(
      item.contributionPerBooking,
      "Contribution estimate per booking",
      maximumAmount,
    ),
    minimumBookingLiftPoints: amount(
      item.minimumBookingLiftPoints,
      "Minimum booking lift in percentage points",
      100,
    ),
    evidence: {
      baseline: textField(
        evidence.baseline,
        "Baseline evidence reference",
        2000,
      ),
      pilot: textField(evidence.pilot, "Pilot evidence reference", 2000),
    },
  };
}

export function defaultIdeaOutcomeExperiment(
  id = "lead-followup-pilot",
): IdeaOutcomeExperiment {
  return {
    id,
    name: "Lead follow-up pilot",
    workflowNote:
      "Review a new lead, prepare a follow-up draft, get approval, and record whether that lead booked work. Count each lead once.",
    sourceReference: "",
    baseline: { leads: 0, bookings: 0, minutes: null, cost: null },
    pilot: { leads: 0, bookings: 0, minutes: null, cost: null },
    contributionPerBooking: 0,
    minimumBookingLiftPoints: 5,
    evidence: { baseline: "", pilot: "" },
  };
}

/** Compile a repeatable manual checklist; this does not generate or send messages. */
export function compileIdeaOutcomeWorkflow(
  value: IdeaOutcomeExperiment,
): IdeaOutcomeStage[] {
  const experiment = validateIdeaOutcomeExperiment(value);
  return [
    {
      id: "source",
      title: "Check the lead",
      instruction: experiment.sourceReference.trim()
        ? `Review the supplied lead or process reference: ${experiment.sourceReference}`
        : "Add a lead or process reference, then review the information supplied.",
      execution: "manual",
    },
    {
      id: "draft",
      title: "Prepare a draft",
      instruction: experiment.workflowNote.trim()
        ? `Prepare the next follow-up using this instruction: ${experiment.workflowNote}`
        : "Write the follow-up instruction before preparing a draft.",
      execution: "manual",
    },
    {
      id: "approval",
      title: "Approve the follow-up",
      instruction:
        "Have the responsible person review the draft and approve any contact before it happens. This planner cannot send it.",
      execution: "manual",
    },
    {
      id: "record",
      title: "Record the result",
      instruction:
        "Record whether the lead booked work, the time and cost, and the supporting record. Count each lead once, even if they book multiple jobs. A booking is not a completed job or payment.",
      execution: "manual",
    },
  ];
}

function perLead(total: number | null, leads: number): number | null {
  return leads > 0 && total !== null ? total / leads : null;
}

function difference(
  after: number | null,
  before: number | null,
  multiplier = 1,
): number | null {
  return after !== null && before !== null
    ? (after - before) * multiplier
    : null;
}

export function evaluateIdeaOutcomeExperiment(
  value: IdeaOutcomeExperiment,
): IdeaOutcomeEvaluation {
  const experiment = validateIdeaOutcomeExperiment(value);
  const before = experiment.baseline;
  const after = experiment.pilot;
  const baselineRate = perLead(before.bookings, before.leads);
  const pilotRate = perLead(after.bookings, after.leads);
  const baselineMinutesPerLead = perLead(before.minutes, before.leads);
  const pilotMinutesPerLead = perLead(after.minutes, after.leads);
  const baselineCostPerLead = perLead(before.cost, before.leads);
  const pilotCostPerLead = perLead(after.cost, after.leads);
  const bookingLiftPoints = difference(pilotRate, baselineRate, 100);
  const costDifferencePer100Leads = difference(
    pilotCostPerLead,
    baselineCostPerLead,
    100,
  );
  const metrics: IdeaOutcomeMetrics = {
    baselineBookingRate: baselineRate === null ? null : baselineRate * 100,
    pilotBookingRate: pilotRate === null ? null : pilotRate * 100,
    bookingLiftPoints,
    baselineMinutesPerLead,
    pilotMinutesPerLead,
    minutesSavedPer100Leads: difference(
      baselineMinutesPerLead,
      pilotMinutesPerLead,
      100,
    ),
    baselineCostPerLead,
    pilotCostPerLead,
    costDifferencePer100Leads,
    additionalBookingsPer100Leads: bookingLiftPoints,
    netContributionProxyPer100Leads:
      bookingLiftPoints === null || costDifferencePer100Leads === null
        ? null
        : bookingLiftPoints * experiment.contributionPerBooking -
          costDifferencePer100Leads,
  };
  const result = {
    metrics,
    workflow: compileIdeaOutcomeWorkflow(experiment),
    limitations: [...IDEA_OUTCOME_LIMITATIONS],
  };
  const missingEvidence: string[] = [];
  if (!experiment.workflowNote.trim())
    missingEvidence.push("Add the workflow instruction being tested.");
  if (!experiment.sourceReference.trim())
    missingEvidence.push("Add a lead or process source reference.");
  for (const key of ["baseline", "pilot"] as const)
    if (!experiment.evidence[key].trim())
      missingEvidence.push(`Add a ${key} evidence link or record reference.`);
  if (missingEvidence.length)
    return {
      ...result,
      status: "needs_evidence",
      label: "Add evidence first",
      summary:
        "The pilot needs its workflow, source, baseline record, and pilot record before it can be assessed.",
      reasons: missingEvidence,
    };
  const reasons: string[] = [];
  if (before.leads < IDEA_OUTCOME_MINIMUM_COHORT)
    reasons.push(
      `Record at least ${IDEA_OUTCOME_MINIMUM_COHORT} baseline leads; ${before.leads} are recorded.`,
    );
  if (after.leads < IDEA_OUTCOME_MINIMUM_COHORT)
    reasons.push(
      `Record at least ${IDEA_OUTCOME_MINIMUM_COHORT} pilot leads; ${after.leads} are recorded.`,
    );
  for (const key of ["baseline", "pilot"] as const) {
    if (experiment[key].minutes === null)
      reasons.push(
        `Record total ${key} time in minutes. Use 0 only if no time was spent.`,
      );
    if (experiment[key].cost === null)
      reasons.push(
        `Record total ${key} cost. Use 0 only if no cost was incurred.`,
      );
  }
  if (
    baselineMinutesPerLead !== null &&
    pilotMinutesPerLead !== null &&
    pilotMinutesPerLead > baselineMinutesPerLead + comparisonTolerance
  )
    reasons.push(
      "Time spent per lead increased. Review the extra work before expanding.",
    );
  if (
    baselineCostPerLead !== null &&
    pilotCostPerLead !== null &&
    pilotCostPerLead > baselineCostPerLead + comparisonTolerance
  )
    reasons.push(
      "Cost per lead increased. Review the trade-off before expanding.",
    );
  if (reasons.length)
    return {
      ...result,
      status: "review",
      label: "Review the pilot",
      summary:
        "Complete the operating measurements and check the sample size and trade-offs before making a rollout decision.",
      reasons,
    };
  if (
    bookingLiftPoints !== null &&
    bookingLiftPoints > comparisonTolerance &&
    bookingLiftPoints + comparisonTolerance >=
      experiment.minimumBookingLiftPoints
  )
    return {
      ...result,
      status: "promising",
      label: "Promising pilot",
      summary:
        "The reported booking lift meets your target without higher time or cost per lead.",
      reasons: [
        "Review the referenced records and repeat the pilot with comparable leads before expanding.",
      ],
    };
  return {
    ...result,
    status: "iterate",
    label: "Improve the pilot",
    summary:
      bookingLiftPoints !== null && bookingLiftPoints <= comparisonTolerance
        ? "The reported booking rate has not improved. Adjust one step and measure again."
        : "The reported booking lift is below your target. Adjust one step and measure again.",
    reasons: [
      bookingLiftPoints !== null && bookingLiftPoints <= comparisonTolerance
        ? "No recorded improvement in booking rate."
        : `Your minimum booking lift is ${experiment.minimumBookingLiftPoints} percentage points.`,
    ],
  };
}

function formatted(value: number | null, suffix = ""): string {
  if (value === null) return "Not recorded";
  return `${Number(value.toFixed(2))}${suffix}`;
}

export function ideaOutcomeMarkdown(value: IdeaOutcomeExperiment): string {
  const experiment = validateIdeaOutcomeExperiment(value);
  const evaluation = evaluateIdeaOutcomeExperiment(experiment);
  const metrics = evaluation.metrics;
  return [
    `# ${experiment.name}`,
    "",
    "Private lead-follow-up comparison report. It includes the before-and-after numbers entered, a follow-up checklist, and the supplied record references. Measurements are manually entered.",
    "",
    `Assessment: ${evaluation.label}`,
    evaluation.summary,
    ...evaluation.reasons.map((reason) => `- ${reason}`),
    "",
    "## Goal",
    "Record how many unique leads booked work. Count each lead once, even if they book multiple jobs.",
    `Minimum booking lift: ${experiment.minimumBookingLiftPoints} percentage points.`,
    "",
    "## Reported before and after",
    "| Measure | Before the change | During the test |",
    "| --- | ---: | ---: |",
    `| Leads | ${experiment.baseline.leads} | ${experiment.pilot.leads} |`,
    `| Leads that booked work (count each lead once) | ${experiment.baseline.bookings} | ${experiment.pilot.bookings} |`,
    `| Booking rate | ${formatted(metrics.baselineBookingRate, "%")} | ${formatted(metrics.pilotBookingRate, "%")} |`,
    `| Total minutes | ${formatted(experiment.baseline.minutes)} | ${formatted(experiment.pilot.minutes)} |`,
    `| Minutes per lead | ${formatted(metrics.baselineMinutesPerLead)} | ${formatted(metrics.pilotMinutesPerLead)} |`,
    `| Total cost (same currency) | ${formatted(experiment.baseline.cost)} | ${formatted(experiment.pilot.cost)} |`,
    `| Cost per lead (same currency) | ${formatted(metrics.baselineCostPerLead)} | ${formatted(metrics.pilotCostPerLead)} |`,
    "",
    `Booking lift: ${formatted(metrics.bookingLiftPoints, " percentage points")}.`,
    `Minutes saved per 100 leads: ${formatted(metrics.minutesSavedPer100Leads)}.`,
    `Cost change per 100 leads: ${formatted(metrics.costDifferencePer100Leads)} (positive means higher cost).`,
    "",
    ...(experiment.contributionPerBooking > 0
      ? [
          "## Contribution scenario",
          `User-entered contribution estimate per lead that books work: ${experiment.contributionPerBooking} (same currency as cost).`,
          `Additional unique leads that book work per 100 leads: ${formatted(metrics.additionalBookingsPer100Leads)}.`,
          `Net additional contribution proxy per 100 leads: ${formatted(metrics.netContributionProxyPer100Leads)}.`,
          "This normalizes the observed rate and cost difference to 100 leads. It is a modeled proxy, not actual attributable revenue or profit.",
          "",
        ]
      : []),
    "## Follow-up checklist for human review",
    ...evaluation.workflow.flatMap((stage, index) => [
      `${index + 1}. ${stage.title}`,
      `   ${stage.instruction}`,
    ]),
    "",
    "## Evidence references",
    `Process reference: ${experiment.sourceReference.trim() || "Not supplied"}`,
    `Before-change record: ${experiment.evidence.baseline.trim() || "Not supplied"}`,
    `Test record: ${experiment.evidence.pilot.trim() || "Not supplied"}`,
    "",
    "## What this does and does not establish",
    ...evaluation.limitations.map((limitation) => `- ${limitation}`),
    "",
    "External execution is disabled. Any contact, deployment, pricing, or spending needs separate approval.",
    "",
  ].join("\n");
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultIdeaBrief,
  emptyIdeaWorkspace,
  ideaBriefMarkdown,
  validateIdeaWorkspace,
  workspaceSources,
} from "../lib/ideaLabWorkspace.ts";
import { defaultIdeaOutcomeExperiment } from "../lib/ideaLabOutcome.ts";

test("imported links remain unreviewed after a workspace reload", () => {
  const workspace = validateIdeaWorkspace({
    ...emptyIdeaWorkspace(),
    importedUrls: [
      "https://twitter.com/example/status/2101234567890123456?s=20",
    ],
  });
  const imported = workspaceSources(workspace).at(-1)!;
  assert.equal(
    imported.url,
    "https://x.com/example/status/2101234567890123456",
  );
  assert.equal(imported.review, "awaiting_review");
  assert.equal(imported.lesson, "");
  assert.deepEqual(imported.lanes, []);
});
test("workspace rejects duplicate post IDs even under different authors", () => {
  assert.throws(
    () =>
      validateIdeaWorkspace({
        ...emptyIdeaWorkspace(),
        importedUrls: [
          "https://x.com/a/status/2101234567890123456",
          "https://x.com/b/status/2101234567890123456",
        ],
      }),
    /unique/,
  );
});
test("workspace rejects arbitrary links and oversized fields", () => {
  assert.throws(() =>
    validateIdeaWorkspace({
      ...emptyIdeaWorkspace(),
      importedUrls: ["https://private.example.com/client"],
    }),
  );
  assert.throws(
    () =>
      validateIdeaWorkspace({
        ...emptyIdeaWorkspace(),
        briefs: [{ ...defaultIdeaBrief("concierge"), scope: "x".repeat(6001) }],
      }),
    /6,000/,
  );
});
test("queue requires complete scope and cannot invent execution states", () => {
  assert.throws(
    () =>
      validateIdeaWorkspace({
        ...emptyIdeaWorkspace(),
        briefs: [
          { ...defaultIdeaBrief("concierge"), scope: " ", queued: true },
        ],
      }),
    /Complete/,
  );
  const workspace = validateIdeaWorkspace({
    ...emptyIdeaWorkspace(),
    briefs: [
      {
        ...defaultIdeaBrief("concierge"),
        queued: true,
        stage: "deployed",
        externalActionsEnabled: true,
      },
    ],
  });
  assert.equal(workspace.briefs[0].queued, true);
  assert.equal("stage" in workspace.briefs[0], false);
  assert.equal("externalActionsEnabled" in workspace.briefs[0], false);
});
test("malformed persisted state does not silently become an empty workspace", () => {
  for (const value of [
    null,
    [],
    { version: 2 },
    { version: 1, importedUrls: [], briefs: [null] },
  ])
    assert.throws(() => validateIdeaWorkspace(value));
});
test("downloaded briefs retain source caveats and pending implementation status", () => {
  const markdown = ideaBriefMarkdown(defaultIdeaBrief("interactive"));
  assert.match(markdown, /implementation and verification are pending/);
  assert.match(markdown, /https:\/\/x.com\/ErnestoSOFTWARE\/status\//);
  assert.match(markdown, /unverified/);
  assert.match(markdown, /External execution: disabled/);
});

test("older saved workspaces remain unchanged when pilots are absent", () => {
  const original = emptyIdeaWorkspace();
  assert.deepEqual(validateIdeaWorkspace(original), original);
  assert.equal("experiments" in validateIdeaWorkspace(original), false);
});

test("pilots use the existing private document and survive a validated reload", () => {
  const experiment = defaultIdeaOutcomeExperiment("owner-pilot");
  experiment.evidence.baseline = "Private baseline CRM report";
  const workspace = validateIdeaWorkspace({
    ...emptyIdeaWorkspace(),
    experiments: [experiment],
  });
  assert.deepEqual(workspace.experiments, [experiment]);
  assert.deepEqual(
    validateIdeaWorkspace(JSON.parse(JSON.stringify(workspace))),
    workspace,
  );
  assert.deepEqual(
    validateIdeaWorkspace({ ...emptyIdeaWorkspace(), experiments: [] })
      .experiments,
    [],
  );
});

test("pilot documents reject duplicates, invalid values and excessive counts", () => {
  const experiment = defaultIdeaOutcomeExperiment("duplicate");
  assert.throws(
    () =>
      validateIdeaWorkspace({
        ...emptyIdeaWorkspace(),
        experiments: [experiment, experiment],
      }),
    /unique/,
  );
  assert.throws(
    () =>
      validateIdeaWorkspace({
        ...emptyIdeaWorkspace(),
        experiments: Array.from({ length: 21 }, (_, index) =>
          defaultIdeaOutcomeExperiment(`pilot-${index}`),
        ),
      }),
    /20 pilots/,
  );
  for (const experiments of [
    null,
    {},
    [null],
    [
      {
        ...experiment,
        pilot: { leads: 10, bookings: 11, minutes: 0, cost: 0 },
      },
    ],
  ])
    assert.throws(() =>
      validateIdeaWorkspace({ ...emptyIdeaWorkspace(), experiments }),
    );
});

test("the existing byte limit covers pilot notes and evidence references", () => {
  const experiments = Array.from({ length: 20 }, (_, index) => ({
    ...defaultIdeaOutcomeExperiment(`pilot-${index}`),
    workflowNote: "x".repeat(6000),
    sourceReference: "x".repeat(2000),
    evidence: { baseline: "x".repeat(2000), pilot: "x".repeat(2000) },
  }));
  assert.throws(
    () => validateIdeaWorkspace({ ...emptyIdeaWorkspace(), experiments }),
    /storage limit/,
  );
});

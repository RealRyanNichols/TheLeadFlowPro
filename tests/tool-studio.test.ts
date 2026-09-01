import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { priceToolStudio, TOOL_BUILDS } from "../lib/toolStudio.ts";

describe("Tool Studio pricing", () => {
  it("keeps the $97 offer bounded to the blueprint", () => {
    const blueprint = TOOL_BUILDS.find((item) => item.id === "tool_blueprint");
    assert.equal(blueprint?.priceUsd, 97);
    assert.match(blueprint?.boundary ?? "", /not finished custom software/i);
  });

  it("prices one-time production and recurring menu items on the server", () => {
    assert.deepEqual(
      priceToolStudio({
        buildId: "tool_funnel",
        monthlyIds: ["tool_care", "follow_up_tuneup"],
      }),
      {
        build: TOOL_BUILDS[2],
        monthly: [
          {
            id: "tool_care",
            name: "Tool Care",
            priceUsd: 97,
            description: "Monitoring, one minor in-scope update, and a monthly performance note.",
          },
          {
            id: "follow_up_tuneup",
            name: "Follow-Up Tune-Up",
            priceUsd: 197,
            description: "Refresh one email, call, or owner-response sequence using the month's real questions.",
          },
        ],
        dueTodayUsd: 1291,
        renewsMonthlyUsd: 294,
      },
    );
  });

  it("deduplicates selections and rejects unknown menu IDs", () => {
    assert.equal(
      priceToolStudio({ buildId: null, monthlyIds: ["tool_care", "tool_care"] })?.renewsMonthlyUsd,
      97,
    );
    assert.equal(priceToolStudio({ buildId: "tool_funnel", monthlyIds: ["made_up"] }), null);
  });

  it("requires at least one real selection", () => {
    assert.equal(priceToolStudio({ buildId: null, monthlyIds: [] }), null);
    assert.equal(priceToolStudio({ buildId: "made_up", monthlyIds: [] }), null);
  });
});

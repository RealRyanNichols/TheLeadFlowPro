// The shell map contract. Every tool type gets its own page language, and the
// "This is an estimate" disclaimer stays on the math tools only. A hole here
// means a QR maker shipping with calculator copy again.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TOOL_TYPE_IDS, type ToolType } from "../lib/tools/taxonomy.ts";
import { SHELLS } from "../components/tools/shell.ts";

const ESTIMATE_TYPES: ToolType[] = ["calculator", "estimator", "planner"];

describe("shells", () => {
  test("every tool type has a complete shell", () => {
    for (const type of TOOL_TYPE_IDS) {
      const shell = SHELLS[type];
      assert.ok(shell, `${type} has no shell entry`);
      assert.ok(shell.inputsLabel.trim().length > 0, `${type} inputsLabel is empty`);
      assert.ok(shell.resultLabel.trim().length > 0, `${type} resultLabel is empty`);
      assert.ok(shell.downloadLabel.trim().length > 0, `${type} downloadLabel is empty`);
      assert.ok(shell.howToIntro.trim().length > 0, `${type} howToIntro is empty`);
      assert.equal(typeof shell.showEstimateBadge, "boolean", `${type} showEstimateBadge missing`);
    }
  });

  test("no shell exists for a type that does not", () => {
    const extras = Object.keys(SHELLS).filter((k) => !(TOOL_TYPE_IDS as readonly string[]).includes(k));
    assert.deepEqual(extras, [], `shells for unknown tool types: ${extras.join(", ")}`);
  });

  test("only the math tool types carry the estimate disclaimer", () => {
    for (const type of TOOL_TYPE_IDS) {
      assert.equal(
        SHELLS[type].showEstimateBadge,
        ESTIMATE_TYPES.includes(type),
        `${type} showEstimateBadge should be ${ESTIMATE_TYPES.includes(type)}`,
      );
    }
  });

  test("shell copy follows the copy rules", () => {
    for (const type of TOOL_TYPE_IDS) {
      const shell = SHELLS[type];
      for (const text of [shell.inputsLabel, shell.resultLabel, shell.downloadLabel, shell.howToIntro]) {
        assert.ok(!text.includes("—"), `${type} copy contains an em dash: "${text}"`);
      }
    }
  });
});

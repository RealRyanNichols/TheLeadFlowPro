import test from "node:test";
import assert from "node:assert/strict";
import { getTool } from "../lib/tools";

const tool = getTool("debt-payoff-planner");
assert.ok(tool);

test("partial final payments preserve all accrued interest in both debt scenarios", () => {
  const result = tool.run({ balance: 1200, apr: 12, payment: 110, extra: 40 });
  assert.equal(result.headline?.value, "1.0 years");
  assert.equal(
    result.stats?.find((item) => item.label === "With the extra payment")
      ?.value,
    "9 months",
  );

  // Independently calculated monthly schedules end with payments of
  // $67.1147047067 and $57.1432369558, not full $110 and $150 payments.
  const baseInterest = result.bars?.items[0].value;
  const fasterInterest = result.bars?.items[1].value;
  assert.ok(typeof baseInterest === "number");
  assert.ok(typeof fasterInterest === "number");
  assert.ok(Math.abs(baseInterest - 77.11470470669673) < 1e-8);
  assert.ok(Math.abs(fasterInterest - 57.14323695581955) < 1e-8);
  assert.equal(
    result.stats?.find((item) => item.label === "Total repaid")?.value,
    "$1,277",
  );
  assert.equal(
    result.stats?.find((item) => item.label === "Interest saved")?.value,
    "$20",
  );
  assert.doesNotMatch(result.verdict?.text ?? "", /guaranteed/i);
});

test("a partial final payment on zero-interest debt never creates negative interest", () => {
  const result = tool.run({ balance: 1200, apr: 0, payment: 110, extra: 40 });
  assert.equal(result.headline?.value, "11 months");
  assert.equal(
    result.stats?.find((item) => item.label === "Total interest")?.value,
    "$0",
  );
  assert.equal(
    result.stats?.find((item) => item.label === "Total repaid")?.value,
    "$1,200",
  );
  assert.ok(result.bars?.items.every((item) => item.value === 0));
});

test("a payment below the first interest charge is reported as insufficient", () => {
  const result = tool.run({ balance: 1200, apr: 12, payment: 10, extra: 0 });
  assert.equal(result.headline?.value, "It never clears");
  assert.equal(
    result.stats?.find((item) => item.label === "Interest charged month one")
      ?.value,
    "$12.00",
  );
  assert.equal(result.bars, undefined);
});

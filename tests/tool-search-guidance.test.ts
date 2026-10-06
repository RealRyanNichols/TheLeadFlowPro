import assert from "node:assert/strict";
import test from "node:test";
import { getTool } from "../lib/tools";
import { getToolArticleGuides } from "../lib/toolArticleGuides";

test("hourly guidance's take-home example matches tax gross-up and actual billable hours", () => {
  const tool = getTool("hourly-rate-calculator");
  assert.ok(tool);
  const inputs = {
    take: 90000,
    overhead: 24000,
    weeks: 48,
    hours: 50,
    billable: 60,
    tax: 25,
    current: 75,
  };
  const result = tool.run(inputs);
  assert.equal(result.headline?.value, "$100.00");
  assert.equal(result.headline?.sub, "1,440 billable hours a year");
  assert.equal(result.stats?.find((stat) => stat.label === "Revenue you need")?.value, "$144,000");
  assert.equal(tool.run({ ...inputs, tax: 0 }).headline?.value, "$79.17");
  assert.equal(tool.run({ ...inputs, billable: 100 }).headline?.value, "$60.00");
  assert.match(tool.fields.find((field) => field.id === "take")?.label ?? "", /after tax set-aside/);
  const example = tool.faqs?.find((faq) => faq.q === "How does the hourly rate calculation work?");
  assert.ok(example);
  for (const value of ["$90,000", "25%", "$24,000", "$144,000", "1,440", "$100"]) {
    assert.ok(example.a.includes(value), `visible example must match calculation: ${value}`);
  }
  assert.match(example.a, /example inputs, not an industry benchmark/);
  assert.ok(getToolArticleGuides(tool.slug, new Date("2026-10-03T12:00:00Z"))
    .some((guide) => guide.slug === "lawn-care-hourly-rate"));
});

test("vehicle example uses the selected basis and unrounded trip allocation", () => {
  const tool = getTool("cost-per-mile-calculator");
  assert.ok(tool);
  const inputs = {
    miles: 28000,
    mpg: 15,
    fuelPrice: 3,
    insurance: 2400,
    maintenance: 2200,
    payment: 650,
    depreciation: 3500,
    interest: 0,
    basis: "cash",
    jobMiles: 45,
  };
  const cash = tool.run(inputs);
  assert.equal(cash.headline?.value, "$0.64");
  assert.equal(cash.headline?.sub, "$18,000 a year, 28,000 miles");
  assert.equal(cash.stats?.find((stat) => stat.label === "Cost per typical job")?.value, "$28.93");
  const economic = tool.run({ ...inputs, basis: "economic" });
  assert.equal(economic.headline?.value, "$0.49");
  assert.equal(economic.headline?.sub, "$13,700 a year, 28,000 miles");
  assert.equal(economic.stats?.find((stat) => stat.label === "Cost per typical job")?.value, "$22.02");
  const example = tool.faqs?.find((faq) => faq.q === "How is the cost of a round-trip job calculated?");
  assert.ok(example);
  for (const value of ["$18,000", "28,000", "45-mile", "$28.93", "$0.64"]) {
    assert.ok(example.a.includes(value), `visible example must match calculation: ${value}`);
  }
  assert.match(example.a, /unrounded/);
  assert.match(example.a, /not a typical vehicle cost benchmark/);
  assert.ok(getToolArticleGuides(tool.slug, new Date("2026-10-03T12:00:00Z"))
    .some((guide) => guide.slug === "trucking-cost-per-mile"));
});

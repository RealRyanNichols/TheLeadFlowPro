import assert from "node:assert/strict";
import test from "node:test";
import { getTool } from "../lib/tools";

function run(slug: string, values: Record<string, number | string>) {
  const tool = getTool(slug);
  assert.ok(tool, slug);
  return tool.run(values);
}

test("shortening a meeting preserves prep and does not lengthen an already short meeting", () => {
  const base = { people: 4, rate: 30, minutes: 60, perWeek: 1, prep: 15 };
  const result = run("meeting-cost-calculator", base);
  assert.equal(result.headline?.value, "$7,800");
  assert.equal(
    result.stats?.find((s) => s.label === "At most 30 minutes, same prep")
      ?.value,
    "$4,680/yr",
  );
  assert.equal(
    result.stats?.find(
      (s) => s.label === "Time value saved by halving duration",
    )?.value,
    "$3,120",
  );
  const short = run("meeting-cost-calculator", { ...base, minutes: 15 });
  assert.equal(short.headline?.value, "$3,120");
  assert.equal(
    short.stats?.find((s) => s.label === "At most 30 minutes, same prep")
      ?.value,
    "$3,120/yr",
  );
  assert.equal(
    short.stats?.find((s) => s.label === "Time value saved by halving duration")
      ?.value,
    "$780",
  );
});

test("rating restoration avoids floating point overcounts and impossible perfect averages", () => {
  const base = {
    current: 4.5,
    total: 20,
    bad: 1,
    leads: 30,
    value: 500,
    close: 25,
  };
  const result = run("bad-review-impact", base);
  assert.equal(result.headline?.value, "4.33");
  assert.equal(
    result.stats?.find((s) => s.label === "Hypothetical five-stars to return")
      ?.value,
    "7",
  );
  assert.equal((20 * 4.5 + 1 + 7 * 5) / (20 + 1 + 7), 4.5);
  assert.equal(
    run("bad-review-impact", { ...base, current: 5 }).stats?.[0].value,
    "Not possible",
  );
  assert.equal(
    run("bad-review-impact", { ...base, current: 1 }).stats?.[0].value,
    "0",
  );
  assert.match(result.note ?? "", /does not estimate lost leads or revenue/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /Estimated yearly cost|direction is reliable|erase it/,
  );
});

test("rating goals recognize an already achieved target without inventing a review quota", () => {
  const base = { current: 4.2, total: 40, goal: 4.5, perMonth: 5, asked: 50 };
  const result = run("review-goal-calculator", base);
  assert.equal(result.headline?.value, "24");
  assert.equal(
    run("review-goal-calculator", { ...base, current: 5, goal: 5 }).headline
      ?.value,
    "0",
  );
  assert.equal(
    run("review-goal-calculator", { ...base, goal: 5 }).headline?.value,
    "Not possible",
  );
  assert.match(result.bars?.caption ?? "", /not a benchmark/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /If you ask everyone|in a season|Time saved by asking/,
  );
});

test("review responses do not invent records, a completed job, guaranteed pickup, or a requested rating", () => {
  for (const type of ["bad", "mixed", "unfair"]) {
    const result = run("review-response-writer", {
      type,
      business: "Example Repair Shop",
      name: "Alex",
      topic: "a delayed callback",
      phone: "",
      owner: "The service team",
    });
    assert.doesNotMatch(
      result.output?.text ?? "",
      /my records show|I will pick up|make it right|made it a five|we got the job done/i,
    );
    assert.match(result.output?.text ?? "", /review|understand/);
    assert.match(result.output?.title ?? "", /draft/i);
  }
});

test("modeled cash balance is not labeled accounting profit or unlimited runway", () => {
  assert.equal(
    run("cash-runway-calculator", {
      cash: 18000,
      inflow: 9000,
      outflow: 12000,
      credit: 6000,
    }).headline?.value,
    "6.0 months",
  );
  for (const inflow of [12000, 13000]) {
    const result = run("cash-runway-calculator", {
      cash: 18000,
      inflow,
      outflow: 12000,
      credit: 6000,
    });
    assert.doesNotMatch(JSON.stringify(result), /Profitable|No limit/);
    assert.equal(
      result.headline?.value,
      inflow === 12000 ? "Cash balanced" : "Cash surplus",
    );
  }
});

test("ad examples keep fees, contribution, and arbitrary sample targets distinct", () => {
  const roas = run("roas-calculator", {
    spend: 1000,
    revenue: 4000,
    margin: 40,
    fees: 200,
  });
  assert.equal(roas.headline?.value, "3.33x");
  assert.equal(
    roas.stats?.find((s) => s.label === "Contribution after marketing")?.value,
    "$400",
  );
  assert.doesNotMatch(JSON.stringify(roas), /Actual profit|earns more budget/);
  const budget = run("ad-budget-planner", {
    want: 10,
    close: 25,
    cpl: 40,
    value: 500,
    margin: 50,
  });
  assert.equal(budget.headline?.value, "$1,600");
  assert.equal(
    budget.stats?.find((s) => s.label === "Contribution after ad spend")?.value,
    "$900",
  );
  const adTest = run("ad-test-budget-calculator", {
    cpl: 25,
    leadsNeeded: 20,
    dailyMin: 50,
    variants: 2,
  });
  assert.equal(adTest.headline?.value, "$1,000");
  assert.equal(
    adTest.stats?.find((s) => s.label === "Days at your budget")?.value,
    "20 days",
  );
  assert.match(
    getTool("ad-test-budget-calculator")?.fields.find(
      (f) => f.id === "leadsNeeded",
    )?.help ?? "",
    /not a universal significance threshold/,
  );
  assert.doesNotMatch(JSON.stringify(adTest), /honest test|learned nothing/);
});

test("customer payback and loan figures are not presented as net profit or a required cash reserve", () => {
  const payback = run("cac-payback-calculator", {
    cac: 300,
    monthlyValue: 75,
    newPerMonth: 10,
    churn: 5,
  });
  assert.equal(payback.headline?.value, "4.0 months");
  assert.equal(
    payback.stats?.find((s) => s.label === "Acquisition-spending window")
      ?.value,
    "$12,000",
  );
  assert.doesNotMatch(
    JSON.stringify(payback),
    /Cash you must|growth funds itself/,
  );
  const loan = run("loan-payment-calculator", {
    amount: 12000,
    rate: 12,
    years: 1,
    earns: 1500,
  });
  assert.equal(loan.headline?.value, "$1,066.19");
  assert.equal(
    loan.stats?.find((s) => s.label === "Entered amount minus payment")?.value,
    "$433.81",
  );
  assert.doesNotMatch(JSON.stringify(loan.stats), /Nets you|Pays for itself/);
});

test("overtime comparison distinguishes total wages from the premium", () => {
  const result = run("overtime-cost-calculator", {
    otHours: 20,
    wage: 20,
    burden: 10,
    weeks: 50,
    newHire: 25000,
  });
  assert.equal(result.headline?.value, "$33,000");
  assert.equal(
    result.stats?.find((s) => s.label === "The premium alone")?.value,
    "$11,000",
  );
  assert.match(result.verdict?.text ?? "", /Total modeled overtime spending/);
  assert.doesNotMatch(
    result.verdict?.text ?? "",
    /salary in overtime premium|That is a hire/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { TOOLS, getTool, type Values, type Result } from "../lib/tools";

function run(slug: string, input: Values = {}): Result {
  const tool = getTool(slug)!;
  return tool.run({
    ...Object.fromEntries(tool.fields.map((f) => [f.id, f.def])),
    ...input,
  });
}
const number = (value: string | number): number =>
  typeof value === "number" ? value : Number(value.replace(/[^\d.\-]/g, ""));
const cents = (value: string | number): number =>
  Math.round(number(value) * 100);
function stat(r: Result, label: string): string {
  const value = r.stats?.find((x) => x.label === label)?.value;
  assert.equal(typeof value, "string", label);
  return value!;
}

test("payment schedule cents conserve the agreed total over 576 combinations", () => {
  for (const total of [0.01, 0.05, 0.1, 1, 7.77, 99.99, 100, 1000.01])
    for (const deposit of [0, 5, 30, 75])
      for (const payments of [2, 3, 6, 7, 12, 24])
        for (const fee of [0, 1, 20]) {
          const r = run("payment-plan-calculator", {
            total,
            deposit,
            payments,
            fee,
          });
          const rows = r.table!.rows;
          const paymentsTotal = rows
            .slice(0, -1)
            .reduce((sum, row) => sum + cents(row[1]), 0);
          const independentBilled = Math.round(
            (Math.round(total * 100) * (100 + fee)) / 100,
          );
          assert.equal(
            paymentsTotal,
            independentBilled,
            JSON.stringify({ total, deposit, payments, fee }),
          );
          assert.equal(cents(rows.at(-1)![1]), paymentsTotal);
          assert.equal(rows.length, payments + 2);
          assert.ok(rows.slice(0, -1).every((row) => cents(row[1]) >= 0));
          assert.match(r.headline!.sub!, /final/);
        }
});

test("monthly loan export preserves principal, interest and final zero balance", () => {
  for (const amount of [0.01, 1, 100, 1200, 12000, 123456.78])
    for (const rate of [0, 0.25, 12, 30])
      for (const years of [1, 5, 10]) {
        const r = run("loan-payment-calculator", {
          amount,
          rate,
          years,
          earns: 0,
        });
        const rows = r.table!.rows;
        let prior = Math.round(amount * 100),
          principal = 0,
          interest = 0,
          paid = 0;
        for (const row of rows) {
          const pay = cents(row[1]),
            charge = cents(row[2]),
            reduction = cents(row[3]),
            balance = cents(row[4]);
          assert.equal(charge, Math.round((prior * rate) / 1200));
          assert.equal(pay, charge + reduction);
          assert.equal(balance, prior - reduction);
          assert.ok(balance >= 0);
          principal += reduction;
          interest += charge;
          paid += pay;
          prior = balance;
        }
        assert.equal(prior, 0);
        assert.equal(principal, Math.round(amount * 100));
        assert.equal(paid, principal + interest);
        assert.ok(rows.length <= years * 12);
        assert.equal(
          Math.round(interest / 100),
          number(stat(r, "Total interest")),
        );
        if (rate === 0) assert.equal(interest, 0);
      }
});

test("12 percent loan payment agrees with an independent present-value search", () => {
  // Search the payment whose discounted cash flows equal principal. This does
  // not reuse the closed-form payment formula in the tool implementation.
  const principal = 12000,
    periods = 12,
    monthlyRate = 0.01;
  let low = 0,
    high = principal;
  for (let i = 0; i < 80; i++) {
    const p = (low + high) / 2;
    const present = Array.from(
      { length: periods },
      (_, n) => p / (1 + monthlyRate) ** (n + 1),
    ).reduce((a, b) => a + b, 0);
    if (present > principal) high = p;
    else low = p;
  }
  assert.equal(
    cents(
      run("loan-payment-calculator", { amount: principal, rate: 12, years: 1 })
        .headline!.value,
    ),
    Math.round(((low + high) / 2) * 100),
  );
});

test("inclusive and exclusive tax preserve cents across rate and amount boundaries", () => {
  for (const amount of [0.01, 0.07, 1, 7.99, 100, 1000.01, 999999.99])
    for (const rate of [0, 0.125, 6.25, 8, 8.25, 12]) {
      const before = run("sales-tax-calculator", {
        amount,
        rate,
        mode: "pre",
        volume: 1,
      });
      const pre = cents(stat(before, "Your revenue")),
        tax = cents(stat(before, "Tax at entered rate")),
        total = cents(before.headline!.value);
      assert.equal(pre, Math.round(amount * 100));
      assert.equal(tax, Math.round((pre * rate) / 100));
      assert.equal(pre + tax, total);
      const after = run("sales-tax-calculator", {
        amount: total / 100,
        rate,
        mode: "post",
        volume: 1,
      });
      assert.equal(cents(after.headline!.value), total);
      assert.equal(
        cents(stat(after, "Your revenue")) +
          cents(stat(after, "Tax at entered rate")),
        total,
      );
    }
});

test("hire scenario escalates residual labor and does not invent positive payback", () => {
  const r = run("hire-vs-automate", {
    personCost: 10000,
    raise: 10,
    buildCost: 1000,
    monthly: 100,
    coverage: 50,
  });
  assert.equal(stat(r, "Hire, 3 years"), "$33,100");
  assert.equal(stat(r, "System, 3 years"), "$21,150");
  assert.equal(stat(r, "System pays for itself in"), "3.2 months");
  for (const monthly of [1000, 1001])
    assert.match(
      stat(
        run("hire-vs-automate", {
          personCost: 12000,
          coverage: 100,
          monthly,
          buildCost: 1000,
        }),
        "System pays for itself in",
      ),
      /No payback/,
    );
});

test("vehicle economic cost never counts full principal payments alongside depreciation", () => {
  const inputs = {
    miles: 10000,
    mpg: 10,
    fuelPrice: 2,
    insurance: 500,
    maintenance: 500,
    payment: 100,
    depreciation: 1000,
    interest: 200,
  };
  assert.equal(
    run("cost-per-mile-calculator", { ...inputs, basis: "cash" }).headline
      ?.value,
    "$0.42",
  );
  assert.equal(
    run("cost-per-mile-calculator", { ...inputs, basis: "economic" }).headline
      ?.value,
    "$0.42",
  );
  const economic = run("cost-per-mile-calculator", {
    ...inputs,
    payment: 10000,
    basis: "economic",
  });
  assert.equal(economic.headline?.value, "$0.42");
  assert.match(economic.note!, /excluding principal/);
});

test("zero denominators are explicit instead of plausible zero costs or profits", () => {
  assert.equal(
    stat(
      run("platform-fee-calculator", { revenue: 0, leadFees: 20 }),
      "Effective take rate",
    ),
    "Not defined",
  );
  assert.equal(
    stat(run("credit-card-fee-calculator", { volume: 0 }), "Cost per sale"),
    "Not defined",
  );
  assert.equal(
    run("roas-calculator", { spend: 0, fees: 0 }).headline?.value,
    "Not defined",
  );
  assert.equal(
    stat(
      run("cost-per-lead-calculator", { customers: 0 }),
      "Contribution after acquisition per customer",
    ),
    "Not defined",
  );
  assert.equal(
    stat(run("equipment-buy-vs-rent", { dayRate: 0 }), "Break-even"),
    "Not defined",
  );
  assert.equal(
    run("cac-payback-calculator", { monthlyValue: 0 }).headline?.value,
    "No payback",
  );
  assert.equal(
    run("emergency-fund-calculator", { essentials: 0 }).headline?.value,
    "Check essentials",
  );
});

test("fractional average monthly transaction count keeps the correct cost per transaction", () => {
  const r = run("credit-card-fee-calculator", {
    volume: 50,
    avgSale: 100,
    rate: 3,
    perTxn: 30,
  });
  // .5 expected transactions, $1.50 percentage fee +$.15 fixed fee, / .5 =3.30.
  assert.equal(stat(r, "Cost per sale"), "$3.30");
});

test("conversion scenarios cap at 100 percent and reject mismatched cohorts", () => {
  assert.equal(
    run("cost-per-lead-calculator", { leads: 10, customers: 11 }).headline
      ?.value,
    "Check inputs",
  );
  const quote = run("quote-follow-up-calculator", {
    quotes: 10,
    value: 100,
    closeNow: 90,
    lift: 30,
    margin: 50,
  });
  assert.equal(number(quote.headline!.value), 1200);
  const close = run("close-rate-calculator", {
    leads: 10,
    close: 90,
    improve: 30,
    value: 100,
    cpl: 10,
  });
  assert.equal(number(close.headline!.value), 1200);
});

test("debt equality and computation horizon are distinct from negative amortization", () => {
  const equal = run("debt-payoff-planner", {
    balance: 1200,
    apr: 12,
    payment: 12,
    extra: 0,
  });
  assert.match(equal.headline!.label, /does not reduce/);
  assert.doesNotMatch(equal.explain!, /balance goes up/);
  assert.equal(
    run("debt-payoff-planner", { balance: 1200, apr: 0, payment: 1, extra: 0 })
      .headline?.value,
    "Beyond 50 years",
  );
});

test("tiny grocery unit prices keep visible precision and an already-funded reserve needs zero months", () => {
  const grocery = run("grocery-unit-price-calculator", {
    unit: "g",
    sizeA: 1000,
    priceA: 1,
    sizeB: 1000,
    priceB: 2,
  });
  assert.equal(stat(grocery, "Option A per gram"), "$0.001");
  assert.equal(stat(grocery, "Option B per gram"), "$0.002");
  assert.equal(
    stat(
      run("emergency-fund-calculator", {
        essentials: 1000,
        months: 3,
        saved: 3000,
        monthly: 0,
      }),
      "Months to target",
    ),
    "0",
  );
});

test("checklist duplicates cannot increase scores or subscription charges", () => {
  for (const slug of ["website-grader", "google-business-profile-scorecard"]) {
    const tool = getTool(slug)!;
    const field = tool.fields.find((f) => f.type === "checks")!;
    assert.equal(
      run(slug, {
        [field.id]: [
          "options" in field ? field.options[0].value : "",
          "options" in field ? field.options[0].value : "",
        ],
      }).headline?.value,
      "5 / 100",
    );
  }
  assert.equal(
    run("subscription-audit", {
      services: ["music", "music"],
      avg: 10,
      other: 0,
    }).headline?.value,
    "$120",
  );
});

test("review and website checklists do not manufacture dollar losses", () => {
  for (const slug of ["bad-review-impact", "website-grader"]) {
    const r = run(slug);
    assert.ok(!JSON.stringify(r).includes('"value":"$'));
    assert.doesNotMatch(
      JSON.stringify(r),
      /Estimated yearly cost|Modeled revenue difference/,
    );
  }
  for (const slug of [
    "lead-response-time",
    "website-speed-money",
    "form-friction-calculator",
  ]) {
    const r = run(slug);
    assert.match(r.headline!.label, /Illustrative/);
    assert.match(r.note!, /unvalidated|not.*validated/);
  }
});

test("SE tax applies the selected year cap, wages and Medicare thresholds", () => {
  const value = (input: Values) =>
    number(
      stat(
        run("quarterly-tax-estimator", {
          expenses: 0,
          bracket: "22",
          already: 0,
          ...input,
        }),
        "SE and additional Medicare components",
      ),
    );
  assert.equal(
    value({ revenue: 300000, taxYear: "2026", filing: "joint" }),
    31156,
  );
  assert.equal(
    value({ revenue: 300000, taxYear: "2025", filing: "joint" }),
    30114,
  );
  // $100000 net x .9235=$92350. Wages above SS cap leave Medicare only.
  assert.equal(
    value({ revenue: 100000, socialSecurityWages: 184500, medicareWages: 0 }),
    2678,
  );
  // Same SE base with $190000 Medicare wages: $82350 attracts extra .9%.
  assert.equal(
    value({
      revenue: 100000,
      socialSecurityWages: 184500,
      medicareWages: 190000,
      filing: "single",
    }),
    3419,
  );
  // $400 business profit is below $400 adjusted net-earnings threshold.
  assert.equal(value({ revenue: 400 }), 0);
  assert.equal(value({ revenue: 500 }), 71);
  for (const [filing, threshold] of [
    ["single", 200000],
    ["joint", 250000],
    ["separate", 125000],
  ] as const) {
    const base = 100000 * 0.9235;
    const below = value({
      revenue: 100000,
      socialSecurityWages: 184500,
      medicareWages: threshold - base,
      filing,
    });
    const above = value({
      revenue: 100000,
      socialSecurityWages: 184500,
      medicareWages: threshold - base + 10000,
      filing,
    });
    assert.equal(above - below, 90);
  }
});

test("mileage uses entered trip-period rate, not an annual blended or refund rate", () => {
  const first = run("mileage-deduction-calculator", {
    weekly: 100,
    weeks: 26,
    rate: 72.5,
    bracket: 20,
    missed: 0,
  });
  const second = run("mileage-deduction-calculator", {
    weekly: 100,
    weeks: 26,
    rate: 76,
    bracket: 20,
    missed: 0,
  });
  assert.equal(number(first.headline!.value), 1885);
  assert.equal(number(second.headline!.value), 1976);
  assert.equal(
    number(first.headline!.value) + number(second.headline!.value),
    3861,
  );
  assert.equal(
    number(stat(second, "Tax-effect scenario at entered rate")),
    395,
  );
  assert.match(
    getTool("mileage-deduction-calculator")!.fields.find(
      (f) => f.id === "rate",
    )!.help!,
    /July.*December 2026/,
  );
});

test("individually valid inputs cannot export money beyond safe cent precision", () => {
  const result = run("job-price-calculator", {
    materials: 1e12,
    hours: 200,
    laborCost: 1e12,
    overhead: 60,
    profit: 60,
  });
  assert.equal(result.headline?.value, "Check inputs");
  assert.match(result.note!, /supported precision/);
  assert.equal(result.documents, undefined);
  assert.equal(result.csv, undefined);
});

test("every shipped industry preset satisfies the declared tool input domain", () => {
  for (const tool of TOOLS)
    for (const preset of tool.presets ?? []) {
      const result = run(tool.slug, preset.values);
      assert.notEqual(
        result.headline?.value,
        "Check inputs",
        `${tool.slug}/${preset.id}`,
      );
    }
});

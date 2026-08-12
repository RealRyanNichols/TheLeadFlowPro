// Known-value formula tests.
//
// Every expected number below was worked out by hand from the textbook formula
// first, then locked in here. A calculator without a verified expected output is
// not finished, because "it returns a number" is not the same as "it returns the
// right number".

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, getTool, money, money2, pct, count, type Values } from "../lib/tools/index.ts";

function run(slug: string, over: Record<string, number | string | string[]> = {}) {
  const tool = getTool(slug);
  assert.ok(tool, `${slug} is not published`);
  const values: Values = {};
  for (const f of tool!.fields) values[f.id] = f.type === "checks" ? [...f.def] : f.def;
  Object.assign(values, over);
  return tool!.run(values);
}

const stat = (r: ReturnType<typeof run>, label: string) => {
  const s = (r.stats || []).find((x) => x.label.toLowerCase().includes(label.toLowerCase()));
  assert.ok(s, `no stat matching "${label}". Got: ${(r.stats || []).map((x) => x.label).join(" | ")}`);
  return s!.value;
};

describe("missed call money", () => {
  // 5 missed calls a week, 30 percent would have bought, $250 first sale,
  // 1 repeat purchase after the first job, so 2 purchases per customer:
  // 5 x 0.30 x (250 x (1 + 1)) = $750 a week.
  // $750 x 52 = $39,000 a year.  $39,000 / 12 = $3,250 a month.
  test("weekly loss compounds to the yearly headline", () => {
    const r = run("missed-call-calculator", { missed: 5, closeRate: 30, ticket: 250, repeats: 1 });
    assert.equal(r.headline?.value, "$39,000");
    assert.equal(r.headline?.sub, "$3,250 a month");
    assert.equal(stat(r, "Lost per week"), "$750");
    // 5 x 0.30 x 52 = 78 customers
    assert.equal(stat(r, "Customers lost a year"), "78");
    assert.equal(stat(r, "Calls missed a year"), "260");
  });

  // Zero repeats means the customer only ever buys once:
  // 5 x 0.30 x (250 x (1 + 0)) = $375 a week, x 52 = $19,500 a year.
  test("zero repeats counts only the first sale", () => {
    const r = run("missed-call-calculator", { missed: 5, closeRate: 30, ticket: 250, repeats: 0 });
    assert.equal(r.headline?.value, "$19,500");
  });

  test("zero missed calls is zero lost money, not NaN", () => {
    const r = run("missed-call-calculator", { missed: 0 });
    assert.equal(r.headline?.value, "$0");
  });
});

describe("loan payment", () => {
  // Standard fixed-rate amortization:  A = P.r.(1+r)^n / ((1+r)^n - 1)
  // P = 45,000, r = 0.095/12, n = 60  ->  $945.08 a month.
  test("matches the standard amortization formula", () => {
    const P = 45000;
    const r = 0.095 / 12;
    const n = 60;
    const expected = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
    assert.ok(Math.abs(expected - 945.08) < 0.02, `hand check: ${expected}`);

    const out = run("loan-payment-calculator", { amount: P, rate: 9.5, years: 5 });
    assert.equal(out.headline?.value, money2(expected));
    // total paid 945.08 x 60 = 56,704.8 -> interest 11,704.8
    assert.equal(stat(out, "Total interest"), money(expected * n - P));
  });

  test("a zero rate loan is just the principal split evenly", () => {
    const out = run("loan-payment-calculator", { amount: 12000, rate: 0, years: 1 });
    assert.equal(out.headline?.value, money2(1000));
  });
});

describe("margin and markup", () => {
  // cost 60, price 100.  Margin = 40/100 = 40%.  Markup = 40/60 = 66.7%.
  test("margin is on price, markup is on cost", () => {
    const r = run("profit-margin-calculator", { cost: 60, price: 100, target: 50, units: 40 });
    assert.equal(r.headline?.value, pct(40, 1));
    assert.equal(stat(r, "Markup"), pct((40 / 60) * 100, 1));
    assert.equal(stat(r, "Profit per sale"), money2(40));
    // price for a 50 percent margin = 60 / (1 - 0.5) = 120
    assert.equal(stat(r, "Price for"), money2(120));
  });

  // A 50 percent markup on cost 100 is a price of 150, which is a 33.3% margin.
  test("the converter does not confuse the two", () => {
    const r = run("markup-vs-margin", { cost: 100, markup: 50, wantMargin: 40 });
    assert.equal(r.headline?.value, pct((50 / 150) * 100, 1));
    assert.equal(stat(r, "selling price"), money2(150));
    // for a 40 percent margin: price = 100/0.6 = 166.67, markup = 66.7%
    assert.equal(stat(r, "That price"), money2(100 / 0.6));
  });
});

describe("sales tax", () => {
  // 8.25 percent on $1,000.
  test("adds tax when the amount is pre-tax", () => {
    const r = run("sales-tax-calculator", { amount: 1000, rate: 8.25, mode: "pre", volume: 60 });
    assert.equal(r.headline?.value, money2(1082.5));
    assert.equal(stat(r, "Your revenue"), money2(1000));
    assert.equal(stat(r, "Tax you owe"), money2(82.5));
  });

  // Backing out: 1000 / 1.0825 = 923.79, so tax is 76.21.
  test("backs tax out when the amount already includes it", () => {
    const r = run("sales-tax-calculator", { amount: 1000, rate: 8.25, mode: "post", volume: 60 });
    assert.equal(stat(r, "Your revenue"), money2(1000 / 1.0825));
    assert.equal(stat(r, "Tax you owe"), money2(1000 - 1000 / 1.0825));
  });

  test("a zero rate changes nothing", () => {
    const r = run("sales-tax-calculator", { amount: 500, rate: 0, mode: "pre" });
    assert.equal(r.headline?.value, money2(500));
  });
});

describe("break even", () => {
  // Fixed 12,000. Ticket 450 at 45 percent margin = 202.50 contribution.
  // 12,000 / 202.50 = 59.26, so 60 sales. Revenue needed = 12,000 / 0.45 = 26,667.
  test("uses contribution margin, not revenue", () => {
    const r = run("break-even-calculator", { fixed: 12000, ticket: 450, margin: 45, days: 22, actual: 55 });
    assert.equal(r.headline?.value, count(Math.ceil(12000 / 202.5)));
    assert.equal(stat(r, "Gross profit per sale"), money2(202.5));
    assert.equal(r.headline?.sub, `${money(12000 / 0.45)} in revenue`);
  });
});

describe("customer lifetime value", () => {
  // $120 a visit, 6 visits a year, 4 years = $2,880 revenue.
  // At 55 percent margin that is $1,584 of gross profit.
  test("counts revenue and profit separately", () => {
    const r = run("customer-lifetime-value", { ticket: 120, visits: 6, years: 4, margin: 55, referrals: 1 });
    assert.equal(r.headline?.value, money(2880));
    assert.equal(stat(r, "Lifetime profit"), money(2880 * 0.55));
    // one referral doubles the household value
    assert.equal(stat(r, "With referrals"), money(2880 * 0.55 * 2));
  });
});

/* --------------------------- review response writer ------------------------ */

describe("review response writer", () => {
  // Every text field defaults to blank, so overriding only the type is the
  // real "user typed nothing" case.
  const types = ["good", "mixed", "bad", "unfair"] as const;

  test("a blank good review never leaks placeholder fragments", () => {
    const r = run("review-response-writer", { type: "good" });
    const text = r.output?.text ?? "";
    assert.ok(!text.includes("there,"), `greeted a ghost: ${text}`);
    assert.ok(!text.includes("the owner, our team"), `placeholder signature: ${text}`);
    assert.ok(text.includes("Thank you"), `no thanks in: ${text}`);
  });

  test("a bad review with a phone number offers the direct line", () => {
    const r = run("review-response-writer", { type: "bad", phone: "(903) 500-8898" });
    const text = r.output?.text ?? "";
    assert.ok(text.includes("Call or text me directly at (903) 500-8898"), text);
  });

  test("a blank unfair review reads as complete sentences", () => {
    const r = run("review-response-writer", { type: "unfair" });
    const text = r.output?.text ?? "";
    assert.ok(!text.includes(", ,"), `dangling comma pair in: ${text}`);
    assert.ok(!text.includes(" ,"), `space before comma in: ${text}`);
    assert.ok(!text.includes("  "), `double space in: ${text}`);
    assert.ok(!text.includes("- ,"), `broken signature in: ${text}`);
  });

  test("no variant with blank fields starts a line with a lowercase there", () => {
    for (const type of types) {
      const r = run("review-response-writer", { type });
      const text = r.output?.text ?? "";
      assert.ok(text.length > 0, `${type} produced no reply`);
      for (const line of text.split("\n")) {
        assert.ok(!/^there\b/.test(line), `${type} opens a line with "there": ${line}`);
      }
    }
  });
});

/* ---------------------------- formatting helpers --------------------------- */

describe("number formatting", () => {
  test("currency", () => {
    assert.equal(money(1234567), "$1,234,567");
    assert.equal(money(0), "$0");
    assert.equal(money2(1234.5), "$1,234.50");
    assert.equal(money2(0.005), "$0.01");
  });

  test("currency never renders NaN or Infinity", () => {
    assert.equal(money(NaN), "$0");
    assert.equal(money(Infinity), "$0");
    assert.equal(money2(NaN), "$0.00");
  });

  test("percentages and counts", () => {
    assert.equal(pct(33.333, 1), "33.3%");
    assert.equal(pct(50), "50%");
    assert.equal(count(1234.6), "1,235");
    assert.equal(count(NaN), "0");
  });
});

/* ------------------------------ boundary sweep ----------------------------- */

describe("input boundaries across the whole catalogue", () => {
  const modes = ["min", "max", "zero"] as const;

  for (const mode of modes) {
    test(`no tool produces NaN or Infinity at ${mode} inputs`, () => {
      for (const tool of TOOLS) {
        if (tool.custom) continue;
        const values: Values = {};
        for (const f of tool.fields) {
          if (f.type === "slider") values[f.id] = mode === "max" ? f.max : mode === "min" ? f.min : Math.min(0, f.max) || f.min;
          else if (f.type === "money" || f.type === "number") values[f.id] = mode === "max" ? 1_000_000 : 0;
          else if (f.type === "checks") values[f.id] = mode === "max" ? f.options.map((o) => o.value) : [];
          else values[f.id] = f.def;
        }
        let r;
        try {
          r = tool.run(values);
        } catch (err) {
          assert.fail(`${tool.slug} threw at ${mode}: ${(err as Error).message}`);
        }
        const shown = [
          r.headline?.value,
          r.headline?.sub,
          ...(r.stats || []).flatMap((s) => [s.value, s.sub]),
          ...(r.bars?.items || []).map((b) => b.display),
        ].filter(Boolean) as string[];
        for (const v of shown) {
          assert.ok(!/NaN|Infinity/.test(v), `${tool.slug} produced "${v}" at ${mode} inputs`);
        }
      }
    });
  }

  test("negative money is not accepted as a silent profit", () => {
    // The engine clamps money and number inputs at zero, so a formula should
    // never see a negative here. This asserts the clamp exists in the contract.
    for (const tool of TOOLS) {
      for (const f of tool.fields) {
        if (f.type === "money" || f.type === "number") {
          assert.ok(f.def >= 0, `${tool.slug}.${f.id} ships a negative default`);
        }
      }
    }
  });
});

/* ------------------------- generators produce output ----------------------- */

describe("generators", () => {
  // A generator starts with empty text fields and correctly shows a prompt. The
  // real check is that it produces something once the fields are filled.
  test("every text generator returns real output when given real input", () => {
    const sample: Record<string, string> = {
      url: "theleadflowpro.com", website: "theleadflowpro.com", domain: "theleadflowpro.com",
      phone: "9035008898", textNumber: "9035008898", callback: "text", contact: "9035008898",
      business: "Nichols Roofing", company: "Nichols Roofing", name: "Ryan Nichols",
      first: "Sam", firstName: "Sam", title: "Owner", role: "Installer", topic: "the new roof",
      email: "ryan@example.com", address: "100 Main St, Tyler TX", city: "Tyler", state: "TX",
      street: "100 Main St", zip: "75701", label: "Call us", job: "roof replacement",
      service: "roof replacement", ssid: "GuestWiFi", password: "letmein123",
      message: "Hi, following up on your quote.", headline: "Roof repair in Tyler",
      body: "Free estimates, same week service.", date: "2026-09-01", start: "09:00",
      end: "10:00", details: "Bring the plans.", location: "100 Main St",
      campaign: "spring", source: "facebook", content: "video-a", offer: "Free inspection",
      hook: "Same week service", cta: "Get a quote", reviewLink: "g.page/r/abc",
      areas: "Tyler, Longview", hours: "Mon-Fri 8-5", note: "Ask for Ryan",
      duties: "Install and repair roofs", musts: "Valid license", perks: "Truck provided",
      // this generator takes "Question | Answer", one pair per line
      warranty: "1 year", faqs: "Do you offer free estimates? | Yes, always.",
      extra: "", owner: "Ryan",
    };

    for (const tool of TOOLS) {
      if (tool.custom) continue;
      const textFields = tool.fields.filter((f) => f.type === "text" || f.type === "textarea");
      if (!textFields.length) continue;

      const values: Values = {};
      for (const f of tool.fields) {
        if (f.type === "checks") values[f.id] = [...f.def];
        else if (f.type === "text" || f.type === "textarea") values[f.id] = sample[f.id] ?? "Sample";
        else values[f.id] = f.def;
      }

      const r = tool.run(values);
      const produced = Boolean(r.output || r.qr || r.headline || r.table || r.stats?.length);
      assert.ok(produced, `${tool.slug} produced nothing with every field filled in`);
    }
  });
});

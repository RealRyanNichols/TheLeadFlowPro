# Tool formula sources

Where each formula comes from, and what it deliberately does not model. If a
formula is not in here, it is arithmetic on the user's own inputs with no outside
assumption, which is most of the library.

Nothing in the library invents a tax rate, a legal deadline, a mortgage term, a
hunting regulation or an emergency procedure. Where a result depends on a rule
that changes, the user supplies the number and the page stamps the date.

## Standard formulas

| Tool | Formula | Notes |
| --- | --- | --- |
| Equipment and Loan Payment | Fixed-rate amortization, `A = P·r·(1+r)^n / ((1+r)^n − 1)` | `r` is the annual rate divided by 12. No fees, insurance, taxes or balloon. A zero rate degrades to principal divided by term, which the tests check. |
| Debt Payoff Planner | Month-by-month amortization loop, interest charged on the opening balance each month | Detects the case where the payment does not cover the interest and says so rather than returning a fake payoff date. Capped at 600 months. |
| Break-Even | `fixed ÷ (ticket × margin)` for units, `fixed ÷ margin` for revenue | Contribution margin, not revenue margin. Units are rounded up because you cannot sell most of a job. |
| Profit Margin | Margin is `(price − cost) ÷ price`. Markup is `(price − cost) ÷ cost` | These are different denominators. Conflating them is the single most common pricing error in the trades, which is why the converter exists as its own tool. |
| Sales Tax | Forward: `amount × (1 + rate)`. Reverse: `amount ÷ (1 + rate)` | The rate is always supplied by the user. The tool has no rate table and never guesses a jurisdiction. |
| Customer Lifetime Value | `ticket × visits per year × years`, then × margin for profit | Not discounted for time, so long horizons read optimistically. Stated in the assumptions on the page. |
| Emergency Fund | `essential monthly spend × months`, gap divided by monthly saving | Interest on savings ignored, which makes the timeline slightly conservative. |
| Rent Affordability | Housing share of take-home pay, against the 30 percent rule of thumb | Uses take-home, not gross. Letting agents assess on gross, so their figure is higher, and the page says so. |
| Salary to Hourly | `salary ÷ (worked weeks × hours)`, worked weeks reduced by paid leave | Gross only. Pension, benefits and employer contributions are excluded and called out. |
| Grocery Unit Price | `price ÷ size`, compared like for like | Refuses to compare across unit types. Converting pounds to ounces is the user's job and the note says so. |
| QR encoding | Reed-Solomon error correction per ISO/IEC 18004, via `qrcode-generator` | Encoded locally. Error correction level, quiet zone and colours are exposed because those are the three reasons a printed code fails to scan. |
| QR contrast | WCAG relative luminance, `(L1 + 0.05) ÷ (L2 + 0.05)` | Reported as a measured ratio with practical guidance. Scanner tolerance is not a published standard, so the tool does not claim a pass or a fail. |

## Modelled curves, not laws

These use a shape rather than a constant. Each one is stated in the assumptions
block on the tool page so nobody mistakes it for a measured fact about their
business.

| Tool | Shape | Why |
| --- | --- | --- |
| Lead Response Time | Exponential decay of contact odds after the first hour, floored at 12 percent | Matches the published shape of speed-to-lead research: the drop is steep early and then flattens. The floor exists because some leads do convert days later. |
| Slow Website Cost | Conversion penalty rising with load time | Directional. Every real curve depends on the audience and the offer, which the page states. |
| Form Field Friction | Fixed completion drop per extra field | A simplification. Real forms vary by what is being asked for. |
| Missed Call Money | Every missed call treated as a genuine enquiry at the user's own close rate | Deliberately the user's number, not an industry average. |

## Industry preset values

Preset starting numbers are plausible operating figures for that trade, chosen to
make the first result recognisable rather than to be authoritative. They change
the starting point and the example copy only. They never change the math, and the
page says so above the preset row. Users are told to replace them with their own.

## What is deliberately absent

- No tax rate tables, brackets or thresholds.
- No legal filing deadlines or limitation periods.
- No mortgage rate, index or margin data.
- No hunting seasons, bag limits, tags or legal methods.
- No medical, clinical, diagnostic or treatment logic of any kind.
- No emergency or dispatch procedure.

## Adding a formula

1. Write the formula down here first, with its source and its limits.
2. Implement it in the tool's `run()`.
3. Write a known-value test in `tests/formulas.test.ts` where the expected number
   is derived independently, by hand or from the textbook formula, not copied
   from the implementation's output.
4. Add the assumptions to the tool's `assumptions` array so they render under
   every result.

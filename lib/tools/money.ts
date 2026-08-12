import {
  type Tool,
  num,
  money,
  money2,
  pct,
  count,
  dec,
  rampMonths,
} from "./types";

export const MONEY_TOOLS: Tool[] = [
  {
    slug: "hourly-rate-calculator",
    name: "True Hourly Rate Calculator",
    short: "True Hourly Rate",
    emoji: "⏱️",
    category: "Money",
    tagline: "What you actually have to charge per hour",
    description:
      "Most owners pick a number out of the air and wonder why the bank account never grows. This backs into the rate your business actually requires.",
    who: "Anyone who bills by the hour or quotes jobs off a gut-feel hourly rate.",
    problem:
      "You are charging what the last guy charged. Nobody ever did the math on overhead, unbillable hours, taxes, or the weeks you do not work.",
    payoff:
      "One number you can defend, plus proof of how far off the old number was.",
    steps: [
      "Put in what you want to actually take home in a year, before taxes.",
      "Add your yearly overhead: insurance, truck, software, rent, phone.",
      "Be honest about billable hours. Most owners bill half of what they work.",
      "Read the rate. That is your floor, not your dream price.",
    ],
    fields: [
      { id: "take", label: "What you want to take home a year", type: "money", def: 90000 },
      { id: "overhead", label: "Yearly overhead (insurance, truck, tools, software)", type: "money", def: 24000 },
      { id: "weeks", label: "Weeks you actually work", type: "slider", min: 30, max: 52, step: 1, def: 48 },
      { id: "hours", label: "Hours you work a week", type: "slider", min: 10, max: 80, step: 1, def: 50 },
      { id: "billable", label: "Percent of those hours you can bill", type: "slider", min: 20, max: 100, step: 5, def: 60, suffix: "%", help: "Driving, quoting, invoicing and phone tag are not billable." },
      { id: "tax", label: "Set aside for taxes", type: "slider", min: 0, max: 45, step: 1, def: 25, suffix: "%" },
      { id: "current", label: "What you charge now per hour", type: "money", def: 75 },
    ],
    run: (v) => {
      const take = num(v, "take");
      const overhead = num(v, "overhead");
      const weeks = Math.max(1, num(v, "weeks"));
      const hours = Math.max(1, num(v, "hours"));
      const billable = Math.max(1, num(v, "billable")) / 100;
      const tax = Math.min(0.9, num(v, "tax") / 100);
      const current = num(v, "current");

      const grossNeeded = take / (1 - tax) + overhead;
      const billableHours = weeks * hours * billable;
      const rate = grossNeeded / billableHours;
      const gap = rate - current;
      const yearlyGap = gap * billableHours;

      return {
        headline: {
          value: money2(rate),
          label: "Your minimum hourly rate",
          sub: `${count(billableHours)} billable hours a year`,
          tone: "good",
        },
        stats: [
          { label: "Revenue you need", value: money(grossNeeded), sub: "before taxes and overhead" },
          { label: "Billable hours a year", value: count(billableHours), sub: `of ${count(weeks * hours)} worked` },
          {
            label: gap > 0 ? "You are under by" : "You are above by",
            value: money2(Math.abs(gap)) + "/hr",
            tone: gap > 0 ? "bad" : "good",
          },
          {
            label: gap > 0 ? "Left on the table a year" : "Cushion a year",
            value: money(Math.abs(yearlyGap)),
            tone: gap > 0 ? "bad" : "good",
          },
        ],
        bars: {
          title: "Where every billed hour goes",
          items: [
            { label: "Your take-home", value: take / billableHours, display: money2(take / billableHours), tone: "good" },
            { label: "Taxes", value: (grossNeeded - overhead - take) / billableHours, display: money2((grossNeeded - overhead - take) / billableHours), tone: "warn" },
            { label: "Overhead", value: overhead / billableHours, display: money2(overhead / billableHours), tone: "bad" },
          ],
        },
        verdict:
          gap > 0
            ? { tone: "bad", text: `Every hour you bill at ${money2(current)} is ${money2(gap)} short of what the business needs. Over a year that is ${money(yearlyGap)}.` }
            : { tone: "good", text: `Your rate covers the business with ${money2(-gap)} an hour of cushion. Do not discount it away.` },
        note: "This is your floor. Price above it for skill, speed, warranty and demand.",
      };
    },
  },

  {
    slug: "job-price-calculator",
    name: "Job Price Calculator",
    emoji: "🧾",
    category: "Money",
    tagline: "Quote a job without guessing",
    description:
      "Materials, labor, drive time, overhead and the profit you actually want. Get a price you can say out loud without flinching.",
    who: "Contractors, trades, service pros, anyone writing estimates.",
    problem:
      "You add up materials, guess at labor, tack on a little, and find out later the job paid you less than a part-time job would have.",
    payoff: "A defensible number with the profit built in instead of hoped for.",
    steps: [
      "Enter your real material cost, including the run to the supply house.",
      "Add crew hours and what those people cost you loaded, not their wage.",
      "Set the profit you want. Profit is a line item, not a leftover.",
      "Quote the price. Show the customer the scope, never the math.",
    ],
    fields: [
      { id: "materials", label: "Materials cost", type: "money", def: 900 },
      { id: "waste", label: "Material waste and returns", type: "slider", min: 0, max: 25, step: 1, def: 8, suffix: "%" },
      { id: "hours", label: "Crew hours on the job", type: "slider", min: 1, max: 200, step: 1, def: 16 },
      { id: "laborCost", label: "Loaded cost per crew hour", type: "money", def: 38, help: "Wage plus taxes, insurance and workers comp. Usually 1.3x the wage." },
      { id: "drive", label: "Drive and setup hours", type: "slider", min: 0, max: 40, step: 1, def: 3 },
      { id: "overhead", label: "Overhead you add to every job", type: "slider", min: 0, max: 60, step: 1, def: 18, suffix: "%" },
      { id: "profit", label: "Profit you want on this job", type: "slider", min: 0, max: 60, step: 1, def: 20, suffix: "%" },
    ],
    run: (v) => {
      const materials = num(v, "materials") * (1 + num(v, "waste") / 100);
      const labor = (num(v, "hours") + num(v, "drive")) * num(v, "laborCost");
      const direct = materials + labor;
      const overhead = direct * (num(v, "overhead") / 100);
      const cost = direct + overhead;
      const profitPct = Math.min(0.95, num(v, "profit") / 100);
      const price = cost / (1 - profitPct);
      const profit = price - cost;

      return {
        headline: { value: money(price), label: "Quote this job at", tone: "good" },
        stats: [
          { label: "Your true cost", value: money(cost) },
          { label: "Profit in the job", value: money(profit), tone: "good" },
          { label: "Gross margin", value: pct((profit / (price || 1)) * 100, 1) },
          { label: "Effective rate", value: money2(price / Math.max(1, num(v, "hours") + num(v, "drive"))) + "/hr" },
        ],
        bars: {
          title: "What the customer is really paying for",
          items: [
            { label: "Materials", value: materials, display: money(materials), tone: "neutral" },
            { label: "Labor", value: labor, display: money(labor), tone: "neutral" },
            { label: "Overhead", value: overhead, display: money(overhead), tone: "warn" },
            { label: "Profit", value: profit, display: money(profit), tone: "good" },
          ],
        },
        verdict: {
          tone: profitPct < 0.1 ? "warn" : "good",
          text:
            profitPct < 0.1
              ? "Under 10 percent profit, one bad day on this job wipes it out. Most trades need 20 to 35."
              : `If this job goes sideways by ${pct(profitPct * 100)} you still break even. That is the point of pricing profit in.`,
        },
        note: "Never show a customer a cost breakdown. Show scope, warranty and the price.",
      };
    },
  },

  {
    slug: "profit-margin-calculator",
    name: "Profit Margin Calculator",
    emoji: "📊",
    category: "Money",
    tagline: "Margin, markup and profit on anything",
    description:
      "Put in a price and a cost. Get margin, markup, profit per sale and what it takes to hit a target margin.",
    who: "Anybody who sells anything and needs the real number, fast.",
    problem:
      "Margin and markup are not the same thing, and mixing them up is how businesses price themselves into a hole.",
    payoff: "The honest margin on every sale, and the price that hits your target.",
    steps: [
      "Enter what it costs you and what you charge.",
      "Read the margin. That is the percent of the sale you keep.",
      "Set a target margin and it tells you what to charge instead.",
    ],
    fields: [
      { id: "cost", label: "What it costs you", type: "money", def: 60 },
      { id: "price", label: "What you charge", type: "money", def: 100 },
      { id: "target", label: "Margin you want", type: "slider", min: 5, max: 90, step: 1, def: 50, suffix: "%" },
      { id: "units", label: "How many you sell a month", type: "slider", min: 1, max: 2000, step: 1, def: 40 },
    ],
    run: (v) => {
      const cost = num(v, "cost");
      const price = num(v, "price");
      const units = num(v, "units");
      const profit = price - cost;
      const margin = price ? (profit / price) * 100 : 0;
      const markup = cost ? (profit / cost) * 100 : 0;
      const target = num(v, "target") / 100;
      const targetPrice = cost / Math.max(0.05, 1 - target);

      return {
        headline: {
          value: pct(margin, 1),
          label: "Gross margin",
          sub: `${money2(profit)} profit per sale`,
          tone: margin < 20 ? "bad" : margin < 40 ? "warn" : "good",
        },
        stats: [
          { label: "Markup", value: pct(markup, 1), sub: "on top of cost" },
          { label: "Profit per sale", value: money2(profit), tone: profit > 0 ? "good" : "bad" },
          { label: "Monthly profit", value: money(profit * units) },
          { label: `Price for ${pct(target * 100)} margin`, value: money2(targetPrice), tone: "good" },
        ],
        bars: {
          title: "Price breakdown",
          items: [
            { label: "Your cost", value: cost, display: money2(cost), tone: "warn" },
            { label: "Your profit", value: Math.max(0, profit), display: money2(profit), tone: "good" },
          ],
        },
        verdict: {
          tone: margin < 20 ? "bad" : "good",
          text:
            margin < 20
              ? "Under 20 percent margin there is no room for a refund, a mistake, or a slow month."
              : `Moving to ${money2(targetPrice)} would add ${money(Math.max(0, (targetPrice - price) * units))} a month at the same volume.`,
        },
      };
    },
  },

  {
    slug: "markup-vs-margin",
    name: "Markup vs Margin Converter",
    short: "Markup vs Margin",
    emoji: "🔁",
    category: "Money",
    tagline: "The mistake that eats small businesses alive",
    description:
      "A 50 percent markup is not a 50 percent margin. It is 33. This converter shows both, side by side, so you stop losing a third of your profit to a word.",
    who: "Retail, trades, e-commerce, anyone who buys at one price and sells at another.",
    problem:
      "Owners add 30 percent and think they made 30 percent. They made 23. Do that all year and the difference is a truck payment.",
    payoff: "You stop confusing the two, permanently.",
    steps: [
      "Enter the markup you use today.",
      "Read the margin it actually produces.",
      "Enter the margin you want and get the markup that gets you there.",
    ],
    fields: [
      { id: "cost", label: "What it costs you", type: "money", def: 100 },
      { id: "markup", label: "Markup you add", type: "slider", min: 5, max: 300, step: 5, def: 50, suffix: "%" },
      { id: "wantMargin", label: "Margin you actually want", type: "slider", min: 5, max: 85, step: 1, def: 40, suffix: "%" },
    ],
    run: (v) => {
      const cost = num(v, "cost");
      const markup = num(v, "markup") / 100;
      const price = cost * (1 + markup);
      const margin = price ? ((price - cost) / price) * 100 : 0;
      const want = num(v, "wantMargin") / 100;
      const neededMarkup = want < 1 ? want / (1 - want) : 0;
      const neededPrice = cost * (1 + neededMarkup);

      return {
        headline: {
          value: pct(margin, 1),
          label: `A ${pct(markup * 100)} markup is really a ${pct(margin, 1)} margin`,
          tone: "warn",
        },
        stats: [
          { label: "Your selling price", value: money2(price) },
          { label: "Profit per unit", value: money2(price - cost), tone: "good" },
          { label: `Markup needed for ${pct(want * 100)} margin`, value: pct(neededMarkup * 100, 1), tone: "good" },
          { label: "That price", value: money2(neededPrice), tone: "good" },
        ],
        table: {
          title: "The cheat sheet. Tape it to the wall.",
          headers: ["If you want this margin", "Add this markup", `Price on ${money2(cost)}`],
          rows: [20, 25, 30, 35, 40, 45, 50, 55, 60].map((m) => {
            const mk = m / 100 / (1 - m / 100);
            return [`${m}%`, `${(mk * 100).toFixed(0)}%`, money2(cost * (1 + mk))];
          }),
        },
        note: "Margin is a slice of the price. Markup is added on top of the cost. They will never be the same number.",
      };
    },
  },

  {
    slug: "break-even-calculator",
    name: "Break-Even Calculator",
    emoji: "⚖️",
    category: "Money",
    tagline: "What you have to sell to keep the doors open",
    description:
      "Your fixed costs do not care how slow the month is. This shows the exact sales number where you stop losing money.",
    who: "Every owner with rent, payroll, insurance or a truck note.",
    problem:
      "Most owners cannot name the number they have to hit. So slow months feel like bad luck instead of math.",
    payoff: "A daily and monthly target you can actually manage against.",
    steps: [
      "Add up every bill that shows up whether you sell anything or not.",
      "Enter your average sale and your margin on it.",
      "Get the number of sales you need. Post it where the team can see it.",
    ],
    fields: [
      { id: "fixed", label: "Fixed costs a month (rent, payroll, insurance, notes)", type: "money", def: 12000 },
      { id: "ticket", label: "Average sale", type: "money", def: 450 },
      { id: "margin", label: "Gross margin on that sale", type: "slider", min: 5, max: 95, step: 1, def: 45, suffix: "%" },
      { id: "days", label: "Days a month you are open", type: "slider", min: 8, max: 31, step: 1, def: 22 },
      { id: "actual", label: "Sales you average a month", type: "slider", min: 0, max: 500, step: 1, def: 55 },
    ],
    run: (v) => {
      const fixed = num(v, "fixed");
      const ticket = num(v, "ticket");
      const margin = num(v, "margin") / 100;
      const days = Math.max(1, num(v, "days"));
      const actual = num(v, "actual");
      const grossPerSale = ticket * margin;
      const salesNeeded = grossPerSale > 0 ? fixed / grossPerSale : 0;
      const revenueNeeded = salesNeeded * ticket;
      const perDay = salesNeeded / days;
      const profit = (actual - salesNeeded) * grossPerSale;

      return {
        headline: {
          value: count(Math.ceil(salesNeeded)),
          label: "Sales a month just to break even",
          sub: `${money(revenueNeeded)} in revenue`,
          tone: "warn",
        },
        stats: [
          { label: "Sales per open day", value: dec(perDay, 1) },
          { label: "Gross profit per sale", value: money2(grossPerSale) },
          {
            label: profit >= 0 ? "Monthly profit at your pace" : "Monthly loss at your pace",
            value: money(Math.abs(profit)),
            tone: profit >= 0 ? "good" : "bad",
          },
          { label: "Sales above break-even", value: count(actual - salesNeeded), tone: actual >= salesNeeded ? "good" : "bad" },
        ],
        bars: {
          title: "Where you are vs where you have to be",
          items: [
            { label: "Break-even", value: salesNeeded, display: count(Math.ceil(salesNeeded)), tone: "warn" },
            { label: "Your pace", value: actual, display: count(actual), tone: actual >= salesNeeded ? "good" : "bad" },
          ],
        },
        verdict: {
          tone: profit >= 0 ? "good" : "bad",
          text:
            profit >= 0
              ? `Everything past sale number ${Math.ceil(salesNeeded)} is profit. That is ${money(grossPerSale)} each.`
              : `You are ${count(salesNeeded - actual)} sales a month short. That gap is costing ${money(Math.abs(profit))} every month.`,
        },
      };
    },
  },

  {
    slug: "price-increase-impact",
    name: "Price Increase Calculator",
    short: "Price Increase",
    emoji: "📈",
    category: "Money",
    tagline: "What raising prices really does",
    description:
      "Raise 10 percent and lose a few customers. Most owners assume that is a wash. It usually is not, and this shows you by how much.",
    who: "Anyone who has not raised prices in over a year.",
    problem:
      "Fear of losing customers keeps prices frozen while every cost you have goes up.",
    payoff: "The real net effect, so the decision stops being emotional.",
    steps: [
      "Enter your current price, cost and volume.",
      "Set the increase you are thinking about.",
      "Set how many customers you think you would lose. Be pessimistic.",
      "Look at the profit line, not the revenue line.",
    ],
    fields: [
      { id: "price", label: "Current price", type: "money", def: 200 },
      { id: "cost", label: "Your cost", type: "money", def: 110 },
      { id: "units", label: "Sales a month", type: "slider", min: 1, max: 1000, step: 1, def: 60 },
      { id: "increase", label: "Price increase", type: "slider", min: 1, max: 50, step: 1, def: 10, suffix: "%" },
      { id: "churn", label: "Customers you expect to lose", type: "slider", min: 0, max: 60, step: 1, def: 10, suffix: "%" },
    ],
    run: (v) => {
      const price = num(v, "price");
      const cost = num(v, "cost");
      const units = num(v, "units");
      const inc = num(v, "increase") / 100;
      const churn = num(v, "churn") / 100;

      const oldProfit = (price - cost) * units;
      const newPrice = price * (1 + inc);
      const newUnits = units * (1 - churn);
      const newProfit = (newPrice - cost) * newUnits;
      const diff = newProfit - oldProfit;
      const breakEvenChurn = price - cost > 0 ? 1 - (price - cost) / (newPrice - cost) : 0;

      return {
        headline: {
          value: (diff >= 0 ? "+" : "-") + money(Math.abs(diff)),
          label: "Monthly profit change",
          sub: `${money(Math.abs(diff) * 12)} a year`,
          tone: diff >= 0 ? "good" : "bad",
        },
        stats: [
          { label: "New price", value: money2(newPrice) },
          { label: "Customers left", value: count(newUnits), sub: `from ${count(units)}` },
          { label: "Profit before", value: money(oldProfit) },
          { label: "Profit after", value: money(newProfit), tone: diff >= 0 ? "good" : "bad" },
        ],
        bars: {
          title: "Profit before and after",
          items: [
            { label: "Today", value: oldProfit, display: money(oldProfit), tone: "neutral" },
            { label: `After +${pct(inc * 100)}`, value: newProfit, display: money(newProfit), tone: diff >= 0 ? "good" : "bad" },
          ],
        },
        verdict: {
          tone: "good",
          text: `You could lose up to ${pct(breakEvenChurn * 100, 1)} of your customers and still make the same profit. You planned for ${pct(churn * 100)}.`,
        },
        note: "Raise prices for new customers first. Give existing customers 30 days notice and a reason.",
      };
    },
  },

  {
    slug: "discount-damage-calculator",
    name: "Discount Damage Calculator",
    short: "Discount Damage",
    emoji: "🩸",
    category: "Money",
    tagline: "What that 10 percent off really costs",
    description:
      "A discount does not come out of the price. It comes out of the profit. See how many extra sales it takes just to get back to even.",
    who: "Anybody who has ever knocked a little off to close a deal.",
    problem:
      "Ten percent off sounds small. On a 30 percent margin it just deleted a third of your profit on that job.",
    payoff: "You stop discounting reflexively, or you at least know the price of doing it.",
    steps: [
      "Enter your price, cost and the discount you give.",
      "Look at the profit you kept.",
      "Look at how many extra sales it would take to make it back.",
    ],
    fields: [
      { id: "price", label: "Your price", type: "money", def: 500 },
      { id: "cost", label: "Your cost", type: "money", def: 350 },
      { id: "discount", label: "Discount you give", type: "slider", min: 1, max: 50, step: 1, def: 10, suffix: "%" },
      { id: "howOften", label: "Deals a month you discount", type: "slider", min: 1, max: 200, step: 1, def: 12 },
    ],
    run: (v) => {
      const price = num(v, "price");
      const cost = num(v, "cost");
      const d = num(v, "discount") / 100;
      const often = num(v, "howOften");
      const fullProfit = price - cost;
      const discounted = price * (1 - d);
      const newProfit = discounted - cost;
      const lost = fullProfit - newProfit;
      const profitDrop = fullProfit > 0 ? (lost / fullProfit) * 100 : 100;
      const extraSales = newProfit > 0 ? lost / newProfit : 0;
      const monthly = lost * often;

      return {
        headline: {
          value: pct(profitDrop, 0),
          label: `A ${pct(d * 100)} discount cuts your profit by this much`,
          sub: `${money2(lost)} gone on every deal`,
          tone: "bad",
        },
        stats: [
          { label: "Profit at full price", value: money2(fullProfit), tone: "good" },
          { label: "Profit after discount", value: money2(newProfit), tone: newProfit > 0 ? "warn" : "bad" },
          { label: "Bleeding per month", value: money(monthly), tone: "bad" },
          {
            label: "Extra sales to break even",
            value: newProfit > 0 ? `${dec(extraSales * 100, 0)}%` : "Impossible",
            sub: newProfit > 0 ? "more volume needed" : "you lose money per sale",
            tone: "bad",
          },
        ],
        ramp: rampMonths(monthly, "Discounts stacking up over a year", "Same discount, same volume, twelve months."),
        verdict: {
          tone: "bad",
          text:
            newProfit <= 0
              ? "At this discount you are paying for the privilege of doing the work. Walk away instead."
              : `To make back one ${pct(d * 100)} discount you have to sell ${dec(extraSales, 2)} more jobs at full price.`,
        },
        note: "Add value instead of cutting price. A free add-on costs you cost. A discount costs you profit.",
      };
    },
  },

  {
    slug: "customer-lifetime-value",
    name: "Customer Lifetime Value Calculator",
    short: "Lifetime Value",
    emoji: "♾️",
    category: "Money",
    tagline: "What a customer is worth before they leave",
    description:
      "Stop pricing your marketing off the first sale. See what one customer is really worth over the whole relationship.",
    who: "Repeat-business owners: service, salon, gym, dental, HVAC, lawn, restaurant.",
    problem:
      "You will not spend $100 to get a $150 customer. You will absolutely spend $100 to get a $3,000 customer. Most owners have no idea which one they have.",
    payoff: "The number that tells you how much you can afford to spend to win a customer.",
    steps: [
      "Enter what they spend per visit and how often they come.",
      "Enter how long they stay before drifting off.",
      "Read lifetime value and what you can afford to pay for one.",
    ],
    fields: [
      { id: "ticket", label: "Average sale", type: "money", def: 120 },
      { id: "visits", label: "Purchases per year", type: "slider", min: 1, max: 52, step: 1, def: 6 },
      { id: "years", label: "Years they stay", type: "slider", min: 1, max: 20, step: 1, def: 4 },
      { id: "margin", label: "Your gross margin", type: "slider", min: 5, max: 95, step: 1, def: 55, suffix: "%" },
      { id: "referrals", label: "Customers they refer", type: "slider", min: 0, max: 10, step: 1, def: 1 },
    ],
    run: (v) => {
      const ticket = num(v, "ticket");
      const visits = num(v, "visits");
      const years = num(v, "years");
      const margin = num(v, "margin") / 100;
      const referrals = num(v, "referrals");
      const revenue = ticket * visits * years;
      const profit = revenue * margin;
      const withReferrals = profit * (1 + referrals);
      const maxCac = profit * 0.33;

      return {
        headline: {
          value: money(revenue),
          label: "Lifetime revenue per customer",
          sub: `${money(profit)} of that is gross profit`,
          tone: "good",
        },
        stats: [
          { label: "First sale", value: money2(ticket), sub: "what most owners price off" },
          { label: "Lifetime profit", value: money(profit), tone: "good" },
          { label: "With referrals", value: money(withReferrals), tone: "good" },
          { label: "You can afford to spend", value: money(maxCac), sub: "to win one customer", tone: "good" },
        ],
        bars: {
          title: "First sale vs the whole relationship",
          items: [
            { label: "First sale", value: ticket, display: money2(ticket), tone: "neutral" },
            { label: "Year one", value: ticket * visits, display: money(ticket * visits), tone: "neutral" },
            { label: "Full lifetime", value: revenue, display: money(revenue), tone: "good" },
            { label: "Plus referrals", value: revenue * (1 + referrals), display: money(revenue * (1 + referrals)), tone: "good" },
          ],
        },
        verdict: {
          tone: "good",
          text: `Losing one customer is not a ${money2(ticket)} problem. It is a ${money(revenue)} problem.`,
        },
        note: "Spending a third of lifetime profit to acquire a customer is a common working target, not a rule. Your cash flow decides what you can actually front.",
      };
    },
  },

  {
    slug: "payment-plan-calculator",
    name: "Payment Plan Builder",
    emoji: "💳",
    category: "Money",
    tagline: "Turn a scary price into a yes",
    description:
      "Big number scares customers off. Break it into a deposit and payments, see what you collect and when, and print the schedule.",
    who: "Anyone selling something over $500 to people who flinch at the total.",
    problem:
      "Customers do not say the price is too high. They say they need to think about it. Usually it is a cash flow problem, not a value problem.",
    payoff: "A payment structure you can offer on the spot, with the schedule in hand.",
    steps: [
      "Enter the total price and the deposit you want up front.",
      "Set the number of payments.",
      "Show the customer the monthly number, not the total.",
    ],
    fields: [
      { id: "total", label: "Total price", type: "money", def: 4800 },
      { id: "deposit", label: "Deposit percent", type: "slider", min: 0, max: 75, step: 5, def: 30, suffix: "%" },
      { id: "payments", label: "Number of payments", type: "slider", min: 2, max: 24, step: 1, def: 6 },
      { id: "fee", label: "Payment plan fee", type: "slider", min: 0, max: 20, step: 1, def: 0, suffix: "%", help: "Some shops add a small fee. Zero is fine and closes better." },
    ],
    run: (v) => {
      const total = num(v, "total");
      const depPct = num(v, "deposit") / 100;
      const n = Math.max(1, num(v, "payments"));
      const fee = num(v, "fee") / 100;
      const billed = total * (1 + fee);
      const deposit = billed * depPct;
      const financed = billed - deposit;
      const monthly = financed / n;

      const rows: (string | number)[][] = [["Deposit today", money2(deposit)]];
      for (let i = 1; i <= n; i++) rows.push([`Payment ${i}`, money2(monthly)]);
      rows.push(["Total collected", money2(billed)]);

      return {
        headline: { value: money2(monthly), label: `Per payment for ${n} payments`, sub: `after ${money2(deposit)} down`, tone: "good" },
        stats: [
          { label: "Cash up front", value: money2(deposit), tone: "good" },
          { label: "Financed", value: money2(financed) },
          { label: "Total collected", value: money2(billed) },
          { label: "Paid in full by", value: `Month ${n}` },
        ],
        table: { title: "The schedule. Print it and attach it to the invoice.", headers: ["When", "Amount"], rows },
        verdict: {
          tone: "good",
          text: `"${money2(monthly)} a month" lands very differently than "${money(total)}." Same money to you.`,
        },
        note: "Take the deposit before work starts, every time. Auto-charge the rest on a card on file.",
      };
    },
  },

  {
    slug: "loan-payment-calculator",
    name: "Equipment & Loan Payment Calculator",
    short: "Loan Payment",
    emoji: "🏦",
    category: "Money",
    tagline: "The real cost of that truck, machine or loan",
    description:
      "Monthly payment, total interest, and what the thing actually costs by the time you own it. Plus a full payoff schedule.",
    who: "Anyone financing equipment, a vehicle, or working capital.",
    problem:
      "The dealer sells you the monthly payment. Nobody says the total out loud.",
    payoff: "The full number before you sign, and a schedule you can keep.",
    steps: [
      "Enter the amount financed, rate and term.",
      "Read the monthly payment and total interest.",
      "Check whether the thing pays for itself at that payment.",
    ],
    fields: [
      { id: "amount", label: "Amount financed", type: "money", def: 45000 },
      { id: "rate", label: "Interest rate", type: "slider", min: 0, max: 30, step: 0.25, def: 9.5, suffix: "%" },
      { id: "years", label: "Term in years", type: "slider", min: 1, max: 10, step: 1, def: 5 },
      { id: "earns", label: "What it earns you a month", type: "money", def: 2200, help: "Revenue this thing produces, or the cost it removes." },
    ],
    run: (v) => {
      const p = num(v, "amount");
      const r = num(v, "rate") / 100 / 12;
      const n = Math.max(1, num(v, "years") * 12);
      const earns = num(v, "earns");
      const payment = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
      const totalPaid = payment * n;
      const interest = totalPaid - p;
      const net = earns - payment;

      const rows: (string | number)[][] = [];
      let bal = p;
      for (let i = 1; i <= n; i++) {
        const int = bal * r;
        const prin = payment - int;
        bal = Math.max(0, bal - prin);
        if (i % 6 === 0 || i === 1 || i === n) rows.push([`Month ${i}`, money2(int), money2(prin), money2(bal)]);
      }

      return {
        headline: { value: money2(payment), label: "Monthly payment", sub: `${money(totalPaid)} paid over ${n} months`, tone: "neutral" },
        stats: [
          { label: "Total interest", value: money(interest), tone: "bad" },
          { label: "Interest as percent of price", value: pct((interest / (p || 1)) * 100, 1), tone: "warn" },
          { label: net >= 0 ? "Nets you monthly" : "Costs you monthly", value: money2(Math.abs(net)), tone: net >= 0 ? "good" : "bad" },
          { label: "Pays for itself in", value: earns > 0 ? `${dec(p / earns, 1)} months` : "Never at $0", tone: "neutral" },
        ],
        bars: {
          title: "Principal vs interest",
          items: [
            { label: "What you borrowed", value: p, display: money(p), tone: "neutral" },
            { label: "What the bank keeps", value: interest, display: money(interest), tone: "bad" },
          ],
        },
        table: { title: "Payoff schedule (every 6 months)", headers: ["When", "Interest", "Principal", "Balance"], rows },
        note: "Estimate only. Your lender's fees, insurance requirements and prepayment terms change the real number.",
      };
    },
  },

  {
    slug: "late-invoice-calculator",
    name: "Unpaid Invoice Calculator",
    short: "Unpaid Invoices",
    emoji: "⏰",
    category: "Money",
    tagline: "What people owing you money actually costs",
    description:
      "Money you earned but have not collected is a loan you gave for free. See the size of it, and what a deposit policy would fix.",
    who: "Anyone who invoices instead of collecting at the counter.",
    problem:
      "You did the work, paid for materials, made payroll, and are waiting 45 days to get paid for it. That gap is financed by you.",
    payoff: "A number that makes deposits and card-on-file feel obvious.",
    steps: [
      "Enter what you invoice a month and how long people actually take.",
      "See how much of your money is permanently parked in other people's pockets.",
      "See what moving to a deposit frees up.",
    ],
    fields: [
      { id: "monthly", label: "You invoice a month", type: "money", def: 40000 },
      { id: "days", label: "Average days to get paid", type: "slider", min: 1, max: 120, step: 1, def: 42 },
      { id: "writeoff", label: "Percent you never collect", type: "slider", min: 0, max: 20, step: 0.5, def: 2, suffix: "%" },
      { id: "deposit", label: "Deposit you could collect up front", type: "slider", min: 0, max: 75, step: 5, def: 35, suffix: "%" },
      { id: "cost", label: "What borrowing costs you", type: "slider", min: 0, max: 30, step: 0.5, def: 10, suffix: "%" },
    ],
    run: (v) => {
      const monthly = num(v, "monthly");
      const days = num(v, "days");
      const writeoff = num(v, "writeoff") / 100;
      const dep = num(v, "deposit") / 100;
      const cost = num(v, "cost") / 100;
      const daily = (monthly * 12) / 365;
      const parked = daily * days;
      const carry = parked * cost;
      const lost = monthly * 12 * writeoff;
      const freed = parked * dep;

      return {
        headline: {
          value: money(parked),
          label: "Your money sitting in other people's accounts",
          sub: `every single day, at ${count(days)} day terms`,
          tone: "bad",
        },
        stats: [
          { label: "Carrying cost a year", value: money(carry), tone: "bad" },
          { label: "Never collected a year", value: money(lost), tone: "bad" },
          { label: "Freed by a deposit", value: money(freed), tone: "good" },
          { label: "Total yearly bleed", value: money(carry + lost), tone: "bad" },
        ],
        bars: {
          title: "Days to get paid, and what each costs",
          items: [
            { label: "Paid same day", value: 0.1, display: money(0) },
            { label: "Net 15", value: daily * 15, display: money(daily * 15), tone: "warn" },
            { label: "Net 30", value: daily * 30, display: money(daily * 30), tone: "warn" },
            { label: `Your ${count(days)} days`, value: parked, display: money(parked), tone: "bad" },
          ],
        },
        verdict: {
          tone: "bad",
          text: `Cutting ${count(days)} days down to 15 would put ${money(daily * Math.max(0, days - 15))} back in your account and keep it there.`,
        },
        note: "Deposit up front, card on file, auto-reminders at day 3, 7 and 14. That fixes most of this without one awkward phone call.",
      };
    },
  },

  {
    slug: "cash-runway-calculator",
    name: "Cash Runway Calculator",
    short: "Cash Runway",
    emoji: "🛫",
    category: "Money",
    tagline: "How many months you can survive",
    description:
      "Cash in the bank, money in, money out. See exactly how long you last if things stay the way they are, and what one change does.",
    who: "Any owner who has ever laid awake doing this math badly at 2am.",
    problem:
      "Not knowing the number is scarier than the number.",
    payoff: "A date on the calendar instead of a knot in your stomach.",
    steps: [
      "Enter cash on hand and your monthly in and out.",
      "Read your runway in months.",
      "Change one number and watch the date move.",
    ],
    fields: [
      { id: "cash", label: "Cash on hand", type: "money", def: 25000 },
      { id: "inflow", label: "Money in per month", type: "money", def: 34000 },
      { id: "outflow", label: "Money out per month", type: "money", def: 38000 },
      { id: "credit", label: "Credit available if you had to", type: "money", def: 10000 },
    ],
    run: (v) => {
      const cash = num(v, "cash");
      const inflow = num(v, "inflow");
      const outflow = num(v, "outflow");
      const credit = num(v, "credit");
      const burn = outflow - inflow;
      const months = burn > 0 ? cash / burn : Infinity;
      const withCredit = burn > 0 ? (cash + credit) / burn : Infinity;
      const needed = burn > 0 ? burn : 0;

      const points = Array.from({ length: 12 }, (_, i) => {
        const bal = cash - burn * (i + 1);
        return { label: `M${i + 1}`, value: Math.max(0, bal), display: money(bal) };
      });

      return {
        headline: {
          value: burn > 0 ? `${dec(months, 1)} months` : "Profitable",
          label: burn > 0 ? "Before you run out of cash" : "You are adding cash every month",
          sub: burn > 0 ? `Burning ${money(burn)} a month` : `Adding ${money(-burn)} a month`,
          tone: burn > 0 ? (months < 3 ? "bad" : "warn") : "good",
        },
        stats: [
          { label: burn > 0 ? "Monthly burn" : "Monthly surplus", value: money(Math.abs(burn)), tone: burn > 0 ? "bad" : "good" },
          { label: "Runway with credit", value: burn > 0 ? `${dec(withCredit, 1)} months` : "No limit", tone: "neutral" },
          { label: "Extra revenue to break even", value: money(needed), tone: needed > 0 ? "warn" : "good" },
          { label: "Or cut expenses by", value: money(needed), tone: needed > 0 ? "warn" : "good" },
        ],
        ramp: burn > 0
          ? { title: "Your bank balance, month by month", points, tone: "bad" }
          : undefined,
        verdict: {
          tone: burn > 0 ? "warn" : "good",
          text:
            burn > 0
              ? `You need ${money(needed)} more a month, from anywhere: price increase, one more job a week, or a bill you stop paying.`
              : "Bank the surplus. Three to six months of expenses in reserve is what keeps a slow quarter from becoming a closed business.",
        },
      };
    },
  },

  {
    slug: "sales-tax-calculator",
    name: "Sales Tax Calculator",
    emoji: "🧮",
    category: "Money",
    tagline: "Add it, back it out, or split the invoice",
    description:
      "Add tax to a price, pull tax out of a total you already collected, and see the exact amount you owe. Texas defaults built in.",
    who: "Retail, restaurants, shops, anyone collecting sales tax.",
    problem:
      "Backing tax out of a total is the one everybody gets wrong, and it is the one the state cares about.",
    payoff: "The right number, both directions, in two seconds.",
    steps: [
      "Enter the amount and your combined tax rate.",
      "Pick whether the amount already includes tax.",
      "Read the split.",
    ],
    fields: [
      { id: "amount", label: "Amount", type: "money", def: 1000 },
      { id: "rate", label: "Combined tax rate", type: "slider", min: 0, max: 12, step: 0.125, def: 8.25, suffix: "%", help: "Texas state is 6.25 percent. Most Texas cities land at 8.25 combined. Check your rate with the Comptroller." },
      { id: "mode", label: "This amount", type: "select", def: "pre", options: [
        { value: "pre", label: "Does not include tax yet" },
        { value: "post", label: "Already includes tax" },
      ] },
      { id: "volume", label: "Sales like this per month", type: "slider", min: 1, max: 2000, step: 1, def: 60 },
    ],
    run: (v) => {
      const amount = num(v, "amount");
      const rate = num(v, "rate") / 100;
      const mode = v["mode"] === "post" ? "post" : "pre";
      const pre = mode === "pre" ? amount : amount / (1 + rate);
      const tax = pre * rate;
      const total = pre + tax;
      const volume = num(v, "volume");

      return {
        headline: { value: money2(total), label: "Total the customer pays", tone: "neutral" },
        stats: [
          { label: "Your revenue", value: money2(pre), tone: "good" },
          { label: "Tax you owe the state", value: money2(tax), tone: "warn" },
          { label: "Tax collected per month", value: money(tax * volume), sub: "not yours, set it aside", tone: "warn" },
          { label: "Tax per year", value: money(tax * volume * 12), tone: "warn" },
        ],
        bars: {
          title: "Who gets what",
          items: [
            { label: "You keep", value: pre, display: money2(pre), tone: "good" },
            { label: "State keeps", value: tax, display: money2(tax), tone: "warn" },
          ],
        },
        note: "Sales tax you collect is not revenue. Move it to a separate account the day you collect it. Rates and rules vary by address and by what you sell. Confirm with your state comptroller or your CPA.",
      };
    },
  },

  {
    slug: "quarterly-tax-estimator",
    name: "Quarterly Tax Set-Aside Estimator",
    short: "Tax Set-Aside",
    emoji: "🗓️",
    category: "Money",
    tagline: "Stop getting surprised in April",
    description:
      "A rough set-aside number for self-employed income, including the self-employment tax people forget about.",
    who: "1099 workers, sole proprietors, single-member LLCs.",
    problem:
      "The self-employment tax is the one that ruins people. You budget for income tax and forget the 15.3 percent underneath it.",
    payoff: "A percent of every deposit to move to savings the day it lands.",
    steps: [
      "Enter what you expect to bring in and what you can deduct.",
      "Pick a rough income tax bracket.",
      "Move that percent of every payment into a separate account. Do it the day it hits.",
    ],
    fields: [
      { id: "revenue", label: "Business income this year", type: "money", def: 120000 },
      { id: "expenses", label: "Business expenses you can deduct", type: "money", def: 30000 },
      { id: "bracket", label: "Rough federal income tax bracket", type: "select", def: "22", options: [
        { value: "10", label: "10 percent" },
        { value: "12", label: "12 percent" },
        { value: "22", label: "22 percent" },
        { value: "24", label: "24 percent" },
        { value: "32", label: "32 percent" },
      ] },
      { id: "already", label: "Already paid in this year", type: "money", def: 0 },
    ],
    run: (v) => {
      const revenue = num(v, "revenue");
      const expenses = num(v, "expenses");
      const netProfit = Math.max(0, revenue - expenses);
      const seBase = netProfit * 0.9235;
      const seTax = seBase * 0.153;
      const bracket = num(v, "bracket") / 100;
      const incomeTax = Math.max(0, netProfit - seTax / 2) * bracket;
      const total = seTax + incomeTax;
      const already = num(v, "already");
      const owed = Math.max(0, total - already);
      const perQuarter = owed / 4;
      const setAside = revenue > 0 ? (total / revenue) * 100 : 0;

      return {
        headline: {
          value: pct(setAside, 1),
          label: "Set this much aside from every dollar you collect",
          sub: `About ${money(total)} for the year`,
          tone: "warn",
        },
        stats: [
          { label: "Net profit", value: money(netProfit) },
          { label: "Self-employment tax", value: money(seTax), sub: "the one people forget", tone: "bad" },
          { label: "Estimated income tax", value: money(incomeTax), tone: "warn" },
          { label: "Per quarterly payment", value: money(perQuarter), tone: "warn" },
        ],
        bars: {
          title: "Where your net profit goes",
          items: [
            { label: "Yours to keep", value: Math.max(0, netProfit - total), display: money(Math.max(0, netProfit - total)), tone: "good" },
            { label: "Self-employment tax", value: seTax, display: money(seTax), tone: "bad" },
            { label: "Income tax", value: incomeTax, display: money(incomeTax), tone: "warn" },
          ],
        },
        note: "This is a rough estimate to help you save, not tax advice and not a filing. State tax, credits, deductions, filing status, an S-corp election and a dozen other things change it. Talk to a CPA before you file.",
      };
    },
  },

  {
    slug: "mileage-deduction-calculator",
    name: "Mileage Deduction Calculator",
    short: "Mileage Deduction",
    emoji: "🚚",
    category: "Money",
    tagline: "The deduction most owners under-claim",
    description:
      "Business miles are real money back. See what your driving is worth, and what forgetting to log it costs you.",
    who: "Trades, sales, delivery, real estate, anybody living in a truck.",
    problem:
      "You remember the big trips and forget the fifteen supply runs. Those runs are usually the bigger number.",
    payoff: "A yearly figure that makes logging miles feel worth the trouble.",
    steps: [
      "Enter your weekly business miles. Include supply runs, bank trips and job hopping.",
      "Set the current IRS standard mileage rate.",
      "See the deduction and what it saves in tax.",
    ],
    fields: [
      { id: "weekly", label: "Business miles per week", type: "slider", min: 0, max: 2000, step: 10, def: 250 },
      { id: "weeks", label: "Weeks you drive", type: "slider", min: 20, max: 52, step: 1, def: 50 },
      { id: "rate", label: "IRS standard mileage rate (cents per mile)", type: "number", def: 70, suffix: "¢", help: "The IRS changes this every year. Look up the current year's rate on irs.gov and put it here." },
      { id: "bracket", label: "Your combined tax rate", type: "slider", min: 10, max: 50, step: 1, def: 30, suffix: "%" },
      { id: "missed", label: "Percent of miles you forget to log", type: "slider", min: 0, max: 80, step: 5, def: 30, suffix: "%" },
    ],
    run: (v) => {
      const miles = num(v, "weekly") * num(v, "weeks");
      const rate = num(v, "rate") / 100;
      const bracket = num(v, "bracket") / 100;
      const missed = num(v, "missed") / 100;
      const deduction = miles * rate;
      const saved = deduction * bracket;
      const lostDeduction = deduction * missed;
      const lostSavings = lostDeduction * bracket;

      return {
        headline: { value: money(deduction), label: "Yearly mileage deduction", sub: `${count(miles)} business miles`, tone: "good" },
        stats: [
          { label: "Tax it saves you", value: money(saved), tone: "good" },
          { label: "Deduction you are losing", value: money(lostDeduction), sub: "miles you never logged", tone: "bad" },
          { label: "Cash that costs you", value: money(lostSavings), tone: "bad" },
          { label: "Per week", value: money(deduction / Math.max(1, num(v, "weeks"))) },
        ],
        bars: {
          title: "Logged vs forgotten",
          items: [
            { label: "Deduction you claim", value: deduction - lostDeduction, display: money(deduction - lostDeduction), tone: "good" },
            { label: "Deduction you lose", value: lostDeduction, display: money(lostDeduction), tone: "bad" },
          ],
        },
        note: "Standard mileage only, and only for business miles. Commuting does not count. The rate changes yearly and there are rules about switching between standard mileage and actual expenses. Ask your CPA.",
      };
    },
  },

  {
    slug: "employee-true-cost",
    name: "True Cost of an Employee",
    short: "Employee Cost",
    emoji: "👷",
    category: "Money",
    tagline: "What a hire actually costs you",
    description:
      "Wage is maybe two-thirds of it. Payroll tax, comp, benefits, equipment and the hours you spend managing them are the rest.",
    who: "Any owner thinking about hiring, or wondering why payroll feels heavier than it looks.",
    problem:
      "You budget the wage and get blindsided by everything attached to it.",
    payoff: "The loaded number, so you can price jobs and plan hires honestly.",
    steps: [
      "Enter the hourly wage and hours.",
      "Add benefits, comp and equipment.",
      "Read the loaded hourly cost. Use that in your job pricing, not the wage.",
    ],
    fields: [
      { id: "wage", label: "Hourly wage", type: "money", def: 22 },
      { id: "hours", label: "Hours per week", type: "slider", min: 5, max: 60, step: 1, def: 40 },
      { id: "payrollTax", label: "Payroll taxes", type: "slider", min: 0, max: 20, step: 0.5, def: 9, suffix: "%" },
      { id: "comp", label: "Workers comp", type: "slider", min: 0, max: 30, step: 0.5, def: 6, suffix: "%" },
      { id: "benefits", label: "Benefits per month", type: "money", def: 450 },
      { id: "equipment", label: "Truck, tools, phone per month", type: "money", def: 400 },
      { id: "mgmt", label: "Hours a week you spend managing them", type: "slider", min: 0, max: 20, step: 0.5, def: 3 },
      { id: "yourRate", label: "What your hour is worth", type: "money", def: 150 },
    ],
    run: (v) => {
      const wage = num(v, "wage");
      const hours = num(v, "hours");
      const weeksYear = 52;
      const baseYear = wage * hours * weeksYear;
      const taxes = baseYear * (num(v, "payrollTax") / 100);
      const comp = baseYear * (num(v, "comp") / 100);
      const benefits = num(v, "benefits") * 12;
      const equipment = num(v, "equipment") * 12;
      const mgmt = num(v, "mgmt") * weeksYear * num(v, "yourRate");
      const total = baseYear + taxes + comp + benefits + equipment + mgmt;
      const loaded = total / Math.max(1, hours * weeksYear);
      const multiple = wage > 0 ? loaded / wage : 0;

      return {
        headline: {
          value: money2(loaded) + "/hr",
          label: "What this person really costs per hour",
          sub: `${dec(multiple, 2)}x the wage you quoted them`,
          tone: "warn",
        },
        stats: [
          { label: "Cost per year", value: money(total), tone: "warn" },
          { label: "Cost per month", value: money(total / 12) },
          { label: "Above the wage", value: money(total - baseYear), tone: "bad" },
          { label: "Your time managing them", value: money(mgmt), sub: "the cost nobody counts", tone: "bad" },
        ],
        bars: {
          title: "The full stack",
          items: [
            { label: "Wage", value: baseYear, display: money(baseYear), tone: "neutral" },
            { label: "Payroll tax", value: taxes, display: money(taxes), tone: "warn" },
            { label: "Workers comp", value: comp, display: money(comp), tone: "warn" },
            { label: "Benefits", value: benefits, display: money(benefits), tone: "warn" },
            { label: "Equipment", value: equipment, display: money(equipment), tone: "warn" },
            { label: "Your management time", value: mgmt, display: money(mgmt), tone: "bad" },
          ],
        },
        verdict: {
          tone: "warn",
          text: `This person has to produce more than ${money(total)} of value a year to be worth it. Most owners never do that math and then resent the hire.`,
        },
        note: "Tax and comp rates vary by state and job classification. Use your actual rates from payroll for a real number.",
      };
    },
  },

  {
    slug: "hire-vs-automate",
    name: "Hire vs Automate Calculator",
    short: "Hire vs Automate",
    emoji: "🤖",
    category: "Money",
    tagline: "Do you need a person or a system?",
    description:
      "Compare the cost of a hire against the cost of building a system that does the same repetitive work.",
    who: "Owners drowning in repeat tasks: answering, scheduling, quoting, following up, reminding.",
    problem:
      "The default answer to being busy is hiring. Sometimes that is right. Often you are about to pay $50,000 a year for something that should have been built once.",
    payoff: "A side-by-side over three years so the decision is numbers, not vibes.",
    steps: [
      "Enter the loaded yearly cost of the person you would hire.",
      "Enter the build cost and monthly cost of the system.",
      "Enter what percent of the work a system can genuinely handle.",
      "Compare the three-year lines.",
    ],
    fields: [
      { id: "personCost", label: "Loaded cost of the hire per year", type: "money", def: 58000 },
      { id: "raise", label: "Yearly raise", type: "slider", min: 0, max: 15, step: 1, def: 4, suffix: "%" },
      { id: "buildCost", label: "One-time cost to build the system", type: "money", def: 9000 },
      { id: "monthly", label: "System cost per month", type: "money", def: 150 },
      { id: "coverage", label: "Percent of the work a system can do", type: "slider", min: 10, max: 100, step: 5, def: 70, suffix: "%" },
    ],
    run: (v) => {
      const person = num(v, "personCost");
      const raise = num(v, "raise") / 100;
      const build = num(v, "buildCost");
      const monthly = num(v, "monthly") * 12;
      const coverage = num(v, "coverage") / 100;

      const personYears = [0, 1, 2].map((i) => person * Math.pow(1 + raise, i));
      const person3 = personYears.reduce((a, b) => a + b, 0);
      const remainder = person * (1 - coverage);
      const system3 = build + monthly * 3 + remainder * 3;
      const savings = person3 - system3;

      return {
        headline: {
          value: (savings >= 0 ? "" : "-") + money(Math.abs(savings)),
          label: savings >= 0 ? "Saved over 3 years by building the system" : "The hire is actually cheaper over 3 years",
          tone: savings >= 0 ? "good" : "warn",
        },
        stats: [
          { label: "Hire, 3 years", value: money(person3), tone: "warn" },
          { label: "System, 3 years", value: money(system3), tone: "good" },
          { label: "Year one difference", value: money(Math.abs(personYears[0] - (build + monthly + remainder))) },
          { label: "System pays for itself in", value: person * coverage > 0 ? `${dec((build / ((person * coverage - monthly) / 12)) || 0, 1)} months` : "n/a" },
        ],
        bars: {
          title: "Three-year cost, side by side",
          items: [
            { label: "Hire someone", value: person3, display: money(person3), tone: "bad" },
            { label: "Build the system", value: system3, display: money(system3), tone: "good" },
          ],
        },
        verdict: {
          tone: "neutral",
          text:
            coverage >= 0.8
              ? "At this coverage the work is mostly repeatable. That is exactly what a system is for."
              : "Under 80 percent coverage you still need a human for the judgment calls. Build the system for the repetitive part and hire smaller.",
        },
        note: "A system does not call in sick, but it also does not solve a problem it was never built for. Best answer is usually both: build the repeatable part, hire for the rest.",
      };
    },
  },

  {
    slug: "overtime-cost-calculator",
    name: "Overtime Cost Calculator",
    short: "Overtime Cost",
    emoji: "⌛",
    category: "Money",
    tagline: "What time and a half is really doing to you",
    description:
      "See the yearly overtime bill, and what it would cost to hire instead of burning your crew.",
    who: "Any shop running the same guys past 40 every week.",
    problem:
      "Overtime feels cheaper than hiring until you add up a year of it.",
    payoff: "The comparison that tells you when to stop paying premium hours.",
    steps: [
      "Enter overtime hours per week and the wage.",
      "See the yearly premium you are paying just for the word overtime.",
      "Compare it to the cost of another body.",
    ],
    fields: [
      { id: "otHours", label: "Overtime hours per week (all staff)", type: "slider", min: 0, max: 200, step: 1, def: 25 },
      { id: "wage", label: "Average hourly wage", type: "money", def: 24 },
      { id: "burden", label: "Payroll tax and comp on top", type: "slider", min: 0, max: 40, step: 1, def: 16, suffix: "%" },
      { id: "weeks", label: "Weeks a year this happens", type: "slider", min: 1, max: 52, step: 1, def: 40 },
      { id: "newHire", label: "Loaded cost of another hire per year", type: "money", def: 52000 },
    ],
    run: (v) => {
      const h = num(v, "otHours");
      const wage = num(v, "wage");
      const burden = 1 + num(v, "burden") / 100;
      const weeks = num(v, "weeks");
      const otRate = wage * 1.5 * burden;
      const straight = wage * burden;
      const otCost = h * otRate * weeks;
      const straightCost = h * straight * weeks;
      const premium = otCost - straightCost;
      const hire = num(v, "newHire");

      return {
        headline: { value: money(otCost), label: "Overtime bill per year", sub: `${count(h * weeks)} overtime hours`, tone: "bad" },
        stats: [
          { label: "The premium alone", value: money(premium), sub: "the extra half, pure surcharge", tone: "bad" },
          { label: "Per month", value: money(otCost / 12) },
          { label: "Cost of a new hire", value: money(hire), tone: "neutral" },
          { label: otCost > hire ? "Overtime costs more" : "Overtime still cheaper", value: money(Math.abs(otCost - hire)), tone: otCost > hire ? "bad" : "good" },
        ],
        bars: {
          title: "Overtime vs hiring",
          items: [
            { label: "Overtime, one year", value: otCost, display: money(otCost), tone: "bad" },
            { label: "One more hire", value: hire, display: money(hire), tone: otCost > hire ? "good" : "warn" },
          ],
        },
        verdict: {
          tone: otCost > hire ? "bad" : "warn",
          text:
            otCost > hire
              ? "You are paying more than a full-time salary in overtime premium. That is a hire, and your best people are exhausted for free."
              : "Overtime still wins on paper. Watch burnout and turnover, because replacing a good hand costs more than either number here.",
        },
        note: "Overtime rules vary by state and by whether an employee is exempt. Check your state's labor rules.",
      };
    },
  },
];

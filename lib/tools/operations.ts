import { type Tool, num, str, list, money, money2, pct, count, dec, rampMonths } from "./types";

/* Costs, ad spend, and time. The three places money leaks quietly. */

export const OPERATIONS_TOOLS: Tool[] = [
  /* ---------------------------------- COSTS --------------------------------- */
  {
    slug: "rent-receipt",
    name: "The Rent Receipt",
    emoji: "🏚️",
    category: "Costs",
    tagline: "Add up what you pay just to exist online",
    description:
      "Website builder, email tool, booking app, CRM seats, review software. Stack them up and see the yearly number they never show you.",
    who: "Every business owner paying monthly for software they will never own.",
    problem:
      "Nine subscriptions at $39 to $299 a month never feel like much on their own. Together they are a truck payment, every month, forever, for something you can never sell, keep, or move.",
    payoff:
      "The total. Then the five and ten year number, which is the one that actually stings.",
    steps: [
      "Go through your bank statement and check off everything you pay monthly.",
      "Adjust the amounts to what you actually pay.",
      "Look at the ten year number.",
      "Decide how much of that stack you want to own instead of rent.",
    ],
    faqs: [
      { q: "Is renting software always bad?", a: "No. Some tools are worth renting forever. The problem is renting your entire operation, so the day you stop paying, your website, your customer list, and your booking system all disappear. Own the core. Rent the edges." },
      { q: "What does owning it look like?", a: "Your site lives in your own repo, deploys to your own hosting account, and your data sits in your own database. If a vendor doubles their price or shuts down, you move it and keep working." },
    ],
    featured: true,
    embedHeight: 980,
    fields: [
      { id: "stack", label: "Check everything you pay for", type: "checks", def: ["website", "email", "booking", "crm", "reviews"], options: [
        { value: "website", label: "Website builder (Wix, Squarespace, GoDaddy, Shopify)" },
        { value: "email", label: "Email marketing (Mailchimp, Constant Contact)" },
        { value: "booking", label: "Booking or scheduling app" },
        { value: "crm", label: "CRM seats" },
        { value: "reviews", label: "Review management software" },
        { value: "forms", label: "Forms, surveys, e-sign" },
        { value: "chat", label: "Website chat widget" },
        { value: "phone", label: "Business phone or texting platform" },
        { value: "seo", label: "SEO or listings service" },
        { value: "social", label: "Social scheduling tool" },
        { value: "hosting", label: "Hosting, plugins, security add-ons" },
        { value: "agency", label: "Agency or web guy retainer" },
      ] },
      { id: "avg", label: "Average cost of each, per month", type: "slider", min: 9, max: 500, step: 1, def: 79, prefix: "$" },
      { id: "agencyCost", label: "Agency or web guy retainer, per month", type: "money", def: 0 },
      { id: "increase", label: "Yearly price increase they push on you", type: "slider", min: 0, max: 25, step: 1, def: 8, suffix: "%" },
    ],
    run: (v) => {
      const picked = list(v, "stack");
      const avg = num(v, "avg");
      const agency = picked.includes("agency") ? num(v, "agencyCost") : 0;
      const toolCount = picked.filter((p) => p !== "agency").length;
      const monthly = toolCount * avg + agency;
      const yearly = monthly * 12;
      const inc = num(v, "increase") / 100;

      let five = 0;
      let ten = 0;
      for (let i = 0; i < 10; i++) {
        const y = yearly * Math.pow(1 + inc, i);
        if (i < 5) five += y;
        ten += y;
      }

      const points = Array.from({ length: 10 }, (_, i) => {
        let sum = 0;
        for (let j = 0; j <= i; j++) sum += yearly * Math.pow(1 + inc, j);
        return { label: `Yr ${i + 1}`, value: sum, display: money(sum) };
      });

      return {
        headline: { value: money(monthly), label: "Your rent, every month", sub: `${money(yearly)} a year, ${count(toolCount)} subscriptions`, tone: "bad" },
        stats: [
          { label: "Five years of rent", value: money(five), tone: "bad" },
          { label: "Ten years of rent", value: money(ten), tone: "bad" },
          { label: "What you own at the end", value: "$0", sub: "you stop paying, it all disappears", tone: "bad" },
          { label: "Cost per day", value: money2(yearly / 365) },
        ],
        ramp: { title: "Rent piling up over ten years", caption: `Includes the ${pct(inc * 100)} a year they raise it on you.`, points, tone: "bad" },
        verdict: {
          tone: "bad",
          text: `${money(ten)} over ten years, and on the last day you own exactly nothing. That is the whole business model they are running on you.`,
        },
        note: "This is not an argument against every subscription. It is an argument against renting the parts of your business you cannot afford to lose.",
      };
    },
  },

  {
    slug: "credit-card-fee-calculator",
    name: "Card Processing Fee Calculator",
    short: "Card Fees",
    emoji: "🏧",
    category: "Costs",
    tagline: "The 3 percent nobody puts on a spreadsheet",
    description:
      "Processing fees come off the top of every sale, quietly, forever. See the yearly total and what a small rate difference is worth.",
    who: "Anybody taking cards, which is everybody.",
    problem:
      "It is 2.9 percent plus 30 cents, so it never shows up as a bill. It shows up as a slightly smaller deposit, every single day.",
    payoff: "The annual number, plus what shopping your rate would save.",
    steps: [
      "Enter your monthly card volume and average sale.",
      "Enter your current rate and per-transaction fee.",
      "Compare to a better rate and see the difference.",
    ],
    fields: [
      { id: "volume", label: "Card volume per month", type: "money", def: 45000 },
      { id: "avgSale", label: "Average sale", type: "money", def: 180 },
      { id: "rate", label: "Your rate", type: "slider", min: 1, max: 5, step: 0.05, def: 2.9, suffix: "%" },
      { id: "perTxn", label: "Per transaction fee (cents)", type: "number", def: 30, suffix: "¢" },
      { id: "betterRate", label: "Rate you could negotiate", type: "slider", min: 1, max: 5, step: 0.05, def: 2.5, suffix: "%" },
    ],
    run: (v) => {
      const volume = num(v, "volume");
      const avgSale = Math.max(1, num(v, "avgSale"));
      const rate = num(v, "rate") / 100;
      const per = num(v, "perTxn") / 100;
      const better = num(v, "betterRate") / 100;
      const txns = volume / avgSale;
      const monthly = volume * rate + txns * per;
      const betterMonthly = volume * better + txns * per;
      const saved = monthly - betterMonthly;
      const effective = volume > 0 ? (monthly / volume) * 100 : 0;

      return {
        headline: { value: money(monthly * 12), label: "Processing fees per year", sub: `${money(monthly)} a month`, tone: "bad" },
        stats: [
          { label: "Effective rate", value: pct(effective, 2), sub: "not the rate they quoted you", tone: "warn" },
          { label: "Transactions a month", value: count(txns) },
          { label: "Saved at the better rate", value: money(saved * 12) + "/yr", tone: "good" },
          { label: "Cost per sale", value: money2(monthly / Math.max(1, txns)) },
        ],
        ramp: rampMonths(monthly, "Fees taken off the top, month by month"),
        verdict: {
          tone: "warn",
          text: `A ${pct(Math.abs(num(v, "rate") - num(v, "betterRate")), 2)} difference in rate is worth ${money(saved * 12)} a year. That is one phone call to your processor.`,
        },
        note: "Small ticket businesses get hurt by the per-transaction fee, not the percent. If your average sale is under $25, that 30 cents is the real enemy.",
      };
    },
  },

  {
    slug: "platform-fee-calculator",
    name: "Platform & Marketplace Fee Calculator",
    short: "Platform Fees",
    emoji: "🪝",
    category: "Costs",
    tagline: "What the middleman takes off every job",
    description:
      "Lead platforms, marketplaces and booking apps take a cut of work you did. See the yearly cut and what it costs versus owning the customer.",
    who: "Anyone getting work from Angi, Thumbtack, Yelp, DoorDash, Etsy, Amazon, a booking marketplace, or any platform that clips a percentage.",
    problem:
      "The platform brings a customer once and then charges you every time that customer comes back. You are renting a relationship you already earned.",
    payoff: "The yearly cut, and the value of moving repeat customers to your own channel.",
    steps: [
      "Enter revenue coming through the platform and the fee they take.",
      "Estimate how much of it is repeat customers.",
      "See what moving those repeats to your own booking is worth.",
    ],
    fields: [
      { id: "revenue", label: "Revenue through the platform per month", type: "money", def: 12000 },
      { id: "fee", label: "Their cut", type: "slider", min: 1, max: 40, step: 0.5, def: 15, suffix: "%" },
      { id: "leadFees", label: "Extra lead or listing fees per month", type: "money", def: 200 },
      { id: "repeat", label: "Share that is repeat customers", type: "slider", min: 0, max: 100, step: 5, def: 40, suffix: "%" },
    ],
    run: (v) => {
      const revenue = num(v, "revenue");
      const fee = num(v, "fee") / 100;
      const leadFees = num(v, "leadFees");
      const repeat = num(v, "repeat") / 100;
      const monthly = revenue * fee + leadFees;
      const yearly = monthly * 12;
      const repeatCut = revenue * repeat * fee * 12;

      return {
        headline: { value: money(yearly), label: "The platform's cut, per year", sub: `${money(monthly)} a month off the top`, tone: "bad" },
        stats: [
          { label: "Cut on repeat customers", value: money(repeatCut), sub: "customers you already earned", tone: "bad" },
          { label: "Five year total", value: money(yearly * 5), tone: "bad" },
          { label: "Kept if repeats book direct", value: money(repeatCut), tone: "good" },
          { label: "Effective take rate", value: pct((monthly / Math.max(1, revenue)) * 100, 1), tone: "warn" },
        ],
        bars: {
          title: "Every $100 of platform work",
          items: [
            { label: "You keep", value: 100 * (1 - fee), display: money2(100 * (1 - fee)), tone: "good" },
            { label: "They take", value: 100 * fee, display: money2(100 * fee), tone: "bad" },
          ],
        },
        verdict: {
          tone: "warn",
          text: "Use the platform to meet people. Then get them onto your list, your booking link and your text messages, and let the platform keep bringing you new ones.",
        },
        note: "Check the platform's terms before you solicit customers off it. The goal is not to break their rules. It is to own the relationship you built.",
      };
    },
  },

  {
    slug: "per-seat-cost-calculator",
    name: "Per-Seat Software Cost Calculator",
    short: "Per-Seat Cost",
    emoji: "💺",
    category: "Costs",
    tagline: "The pricing model that punishes you for growing",
    description:
      "Per-user pricing feels fine at three people. See what it costs at ten, and what growing your team actually triggers.",
    who: "Any business adding people to a CRM, a shared inbox, a project tool, or a phone system.",
    problem:
      "Every hire quietly adds a software bill. Nobody ever budgets for it, and nobody ever removes seats when someone leaves.",
    payoff: "The cost of your next five hires before you make them.",
    steps: [
      "Enter your seats and price per seat.",
      "Add the hires you plan.",
      "Look at the cost curve, then decide if per-seat is the right model for you.",
    ],
    fields: [
      { id: "seats", label: "Seats today", type: "slider", min: 1, max: 100, step: 1, def: 5 },
      { id: "price", label: "Price per seat per month", type: "money", def: 89 },
      { id: "tools", label: "Number of per-seat tools you pay for", type: "slider", min: 1, max: 10, step: 1, def: 3 },
      { id: "growth", label: "People you plan to add", type: "slider", min: 0, max: 50, step: 1, def: 4 },
      { id: "ghost", label: "Seats nobody uses anymore", type: "slider", min: 0, max: 20, step: 1, def: 2 },
    ],
    run: (v) => {
      const seats = num(v, "seats");
      const price = num(v, "price");
      const tools = num(v, "tools");
      const growth = num(v, "growth");
      const ghost = num(v, "ghost");
      const monthly = seats * price * tools;
      const future = (seats + growth) * price * tools;
      const ghostCost = ghost * price * tools * 12;

      return {
        headline: { value: money(monthly * 12), label: "Per-seat software, per year", sub: `${count(seats)} seats across ${count(tools)} tools`, tone: "bad" },
        stats: [
          { label: `After ${count(growth)} hires`, value: money(future * 12) + "/yr", tone: "bad" },
          { label: "Each new hire costs", value: money(price * tools * 12) + "/yr", sub: "before their paycheck", tone: "warn" },
          { label: "Dead seats you still pay", value: money(ghostCost) + "/yr", tone: "bad" },
          { label: "Monthly today", value: money(monthly) },
        ],
        bars: {
          title: "What per-seat pricing does as you grow",
          items: [5, 10, 20, 40].map((n) => ({
            label: `${n} people`,
            value: n * price * tools * 12,
            display: money(n * price * tools * 12),
            tone: n > 20 ? ("bad" as const) : ("warn" as const),
          })),
        },
        verdict: {
          tone: "warn",
          text: `Cancel the ${count(ghost)} dead seats today and you save ${money(ghostCost)} a year for one phone call.`,
        },
      };
    },
  },

  {
    slug: "downtime-cost-calculator",
    name: "Downtime Cost Calculator",
    short: "Downtime",
    emoji: "🔌",
    category: "Costs",
    tagline: "What an hour of dead website or dead phones costs",
    description:
      "Site down, phones down, card reader down, internet down. Put a real hourly number on it so you know what redundancy is worth.",
    who: "Retail, restaurants, clinics, e-commerce, anyone who cannot take money when the system is out.",
    problem:
      "Downtime feels like an annoyance until you multiply it out. Then it looks like a business decision you have been avoiding.",
    payoff: "The hourly cost of being offline, and what a backup is worth against it.",
    steps: [
      "Enter your revenue and open hours.",
      "Enter how many hours a year you are actually down.",
      "Compare that to what a backup would cost.",
    ],
    fields: [
      { id: "revenue", label: "Revenue per month", type: "money", def: 60000 },
      { id: "openHours", label: "Open hours per week", type: "slider", min: 10, max: 168, step: 1, def: 55 },
      { id: "downHours", label: "Hours down per year", type: "slider", min: 0, max: 200, step: 1, def: 18 },
      { id: "recovery", label: "Sales you never recover", type: "slider", min: 10, max: 100, step: 5, def: 70, suffix: "%" },
      { id: "backup", label: "Cost of a backup or redundancy per month", type: "money", def: 120 },
    ],
    run: (v) => {
      const revenue = num(v, "revenue");
      const openHours = Math.max(1, num(v, "openHours"));
      const downHours = num(v, "downHours");
      const lossRate = num(v, "recovery") / 100;
      const backup = num(v, "backup");
      const perHour = (revenue * 12) / (openHours * 52);
      const lost = perHour * downHours * lossRate;
      const backupYear = backup * 12;

      return {
        headline: { value: money(perHour), label: "Every hour you are down costs this", sub: `${money(lost)} a year at ${count(downHours)} hours`, tone: "bad" },
        stats: [
          { label: "Lost per year", value: money(lost), tone: "bad" },
          { label: "Backup costs", value: money(backupYear) + "/yr" },
          { label: lost > backupYear ? "Backup pays for itself" : "Backup costs more", value: money(Math.abs(lost - backupYear)), tone: lost > backupYear ? "good" : "warn" },
          { label: "Break-even downtime", value: `${dec(backupYear / Math.max(1, perHour * lossRate), 1)} hrs/yr` },
        ],
        bars: {
          title: "Downtime cost vs redundancy cost",
          items: [
            { label: "Downtime", value: lost, display: money(lost), tone: "bad" },
            { label: "Backup", value: backupYear, display: money(backupYear), tone: "good" },
          ],
        },
        verdict: {
          tone: lost > backupYear ? "good" : "neutral",
          text:
            lost > backupYear
              ? "Redundancy is cheaper than the outages you already have. This is not a tech decision, it is a math decision."
              : "You are not down enough for redundancy to pay off yet. Revisit it after the next outage.",
        },
      };
    },
  },

  {
    slug: "equipment-buy-vs-rent",
    name: "Buy vs Rent Equipment Calculator",
    short: "Buy vs Rent",
    emoji: "🛠️",
    category: "Costs",
    tagline: "When renting stops making sense",
    description:
      "Find the exact number of days per year where buying the machine beats renting it, including maintenance and what you can sell it for.",
    who: "Trades, events, landscaping, construction, anybody renting the same thing over and over.",
    problem:
      "Renting feels flexible until you look at how many times you rented it last year.",
    payoff: "A break-even day count you can check against your job calendar.",
    steps: [
      "Enter the rental day rate and how many days a year you need it.",
      "Enter the purchase price, upkeep and resale value.",
      "Compare over the years you would keep it.",
    ],
    fields: [
      { id: "dayRate", label: "Rental cost per day", type: "money", def: 275 },
      { id: "days", label: "Days you need it per year", type: "slider", min: 1, max: 300, step: 1, def: 40 },
      { id: "price", label: "Purchase price", type: "money", def: 18000 },
      { id: "upkeep", label: "Maintenance and storage per year", type: "money", def: 1200 },
      { id: "years", label: "Years you would keep it", type: "slider", min: 1, max: 15, step: 1, def: 5 },
      { id: "resale", label: "What you could sell it for after", type: "money", def: 7000 },
    ],
    run: (v) => {
      const dayRate = num(v, "dayRate");
      const days = num(v, "days");
      const price = num(v, "price");
      const upkeep = num(v, "upkeep");
      const years = num(v, "years");
      const resale = num(v, "resale");

      const rentTotal = dayRate * days * years;
      const buyTotal = price + upkeep * years - resale;
      const diff = rentTotal - buyTotal;
      const breakEvenDays = dayRate > 0 ? (price + upkeep * years - resale) / (dayRate * years) : 0;
      const costPerDayOwned = days * years > 0 ? buyTotal / (days * years) : 0;

      return {
        headline: {
          value: diff >= 0 ? money(diff) : money(-diff),
          label: diff >= 0 ? `Buying saves this over ${count(years)} years` : `Renting saves this over ${count(years)} years`,
          tone: diff >= 0 ? "good" : "warn",
        },
        stats: [
          { label: "Rent, total", value: money(rentTotal), tone: diff >= 0 ? "bad" : "good" },
          { label: "Buy, net of resale", value: money(buyTotal), tone: diff >= 0 ? "good" : "bad" },
          { label: "Break-even", value: `${dec(breakEvenDays, 0)} days/yr`, sub: `you use it ${count(days)}` },
          { label: "Your cost per day owned", value: money2(costPerDayOwned) },
        ],
        bars: {
          title: `Total cost over ${count(years)} years`,
          items: [
            { label: "Rent it", value: rentTotal, display: money(rentTotal), tone: diff >= 0 ? "bad" : "good" },
            { label: "Buy it", value: Math.max(0, buyTotal), display: money(buyTotal), tone: diff >= 0 ? "good" : "bad" },
          ],
        },
        verdict: {
          tone: "neutral",
          text: `Past ${dec(breakEvenDays, 0)} days a year, buying wins. Under that, renting keeps your cash free and the maintenance somebody else's problem.`,
        },
        note: "Owning also means storage, insurance, transport and the day it breaks on a job. Rented gear gets swapped out. Weigh that against the number.",
      };
    },
  },

  /* ----------------------------------- ADS ---------------------------------- */
  {
    slug: "roas-calculator",
    name: "Ad Spend & ROAS Calculator",
    short: "ROAS",
    emoji: "📣",
    category: "Ads",
    tagline: "Is the ad actually working?",
    description:
      "Return on ad spend, profit on ad spend, and the break-even point most people never check. Revenue ROAS lies. Profit ROAS does not.",
    who: "Anyone running Facebook, Instagram, Google or local ads.",
    problem:
      "A 3x return sounds great until you remember your margin is 30 percent. Then 3x is losing money.",
    payoff: "The break-even ROAS for your margin, so you know when to scale and when to kill it.",
    steps: [
      "Enter spend and revenue from the ads.",
      "Enter your gross margin. This is the step everybody skips.",
      "Compare your ROAS to the break-even line.",
    ],
    fields: [
      { id: "spend", label: "Ad spend", type: "money", def: 2000 },
      { id: "revenue", label: "Revenue from those ads", type: "money", def: 7000 },
      { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 40, suffix: "%" },
      { id: "fees", label: "Agency or management fee", type: "money", def: 0 },
    ],
    run: (v) => {
      const spend = num(v, "spend");
      const revenue = num(v, "revenue");
      const margin = num(v, "margin") / 100;
      const fees = num(v, "fees");
      const total = spend + fees;
      const roas = total > 0 ? revenue / total : 0;
      const grossProfit = revenue * margin;
      const net = grossProfit - total;
      const breakEven = margin > 0 ? 1 / margin : 0;
      const poas = total > 0 ? grossProfit / total : 0;

      return {
        headline: {
          value: `${dec(roas, 2)}x`,
          label: "Return on ad spend",
          sub: `You need ${dec(breakEven, 2)}x just to break even`,
          tone: roas >= breakEven ? "good" : "bad",
        },
        stats: [
          { label: "Gross profit from ads", value: money(grossProfit) },
          { label: net >= 0 ? "Actual profit" : "Actual loss", value: money(Math.abs(net)), tone: net >= 0 ? "good" : "bad" },
          { label: "Profit on ad spend", value: `${dec(poas, 2)}x`, tone: poas >= 1 ? "good" : "bad" },
          { label: "Break-even ROAS", value: `${dec(breakEven, 2)}x`, sub: "at your margin" },
        ],
        bars: {
          title: "Your ROAS against the line that matters",
          items: [
            { label: "Break-even", value: breakEven, display: `${dec(breakEven, 2)}x`, tone: "warn" },
            { label: "Your ROAS", value: roas, display: `${dec(roas, 2)}x`, tone: roas >= breakEven ? "good" : "bad" },
          ],
        },
        verdict: {
          tone: net >= 0 ? "good" : "bad",
          text:
            net >= 0
              ? `Every dollar in is bringing back ${money2(net / Math.max(1, total) + 1)} of gross profit. This one earns more budget.`
              : `At ${pct(margin * 100)} margin, ${dec(roas, 2)}x loses ${money(Math.abs(net))}. Fix margin, ticket, or close rate before you spend more.`,
        },
        note: "No ad platform can promise a return. This measures what already happened so you can decide what to do next.",
      };
    },
  },

  {
    slug: "ad-budget-planner",
    name: "Ad Budget Planner",
    emoji: "💵",
    category: "Ads",
    tagline: "Work backward from the jobs you want",
    description:
      "Tell it how many customers you want this month. It tells you the budget that math requires, based on your own numbers.",
    who: "Owners guessing at a budget, or being told a number by somebody selling ads.",
    problem:
      "People pick an ad budget the way they pick a lottery number. Then they judge it against a goal they never did the math on.",
    payoff: "A budget with a reason behind it, plus the cost per customer it implies.",
    steps: [
      "Enter the customers you want this month.",
      "Enter your close rate and what a lead costs you.",
      "Check the budget against what a customer is worth.",
    ],
    fields: [
      { id: "want", label: "New customers you want this month", type: "slider", min: 1, max: 200, step: 1, def: 15 },
      { id: "close", label: "Close rate on leads", type: "slider", min: 1, max: 90, step: 1, def: 25, suffix: "%" },
      { id: "cpl", label: "What a lead costs you", type: "money", def: 45 },
      { id: "value", label: "What a customer is worth", type: "money", def: 1200 },
      { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 45, suffix: "%" },
    ],
    run: (v) => {
      const want = num(v, "want");
      const close = Math.max(0.01, num(v, "close") / 100);
      const cpl = num(v, "cpl");
      const value = num(v, "value");
      const margin = num(v, "margin") / 100;
      const leads = want / close;
      const budget = leads * cpl;
      const cac = want > 0 ? budget / want : 0;
      const revenue = want * value;
      const profit = revenue * margin - budget;

      return {
        headline: { value: money(budget), label: "Budget to hit that goal", sub: `${count(leads)} leads at ${money2(cpl)} each`, tone: "neutral" },
        stats: [
          { label: "Cost per customer", value: money2(cac), tone: cac < value * margin ? "good" : "bad" },
          { label: "Revenue it should produce", value: money(revenue), tone: "good" },
          { label: profit >= 0 ? "Profit after ad spend" : "Loss after ad spend", value: money(Math.abs(profit)), tone: profit >= 0 ? "good" : "bad" },
          { label: "Daily budget", value: money2(budget / 30) },
        ],
        bars: {
          title: "Budget vs what it should return",
          items: [
            { label: "You spend", value: budget, display: money(budget), tone: "warn" },
            { label: "Gross profit back", value: revenue * margin, display: money(revenue * margin), tone: "good" },
          ],
        },
        verdict: {
          tone: profit >= 0 ? "good" : "bad",
          text:
            profit >= 0
              ? `Spending ${money(budget)} to make ${money(revenue * margin)} of gross profit. Start at half that budget for two weeks and confirm the numbers before you go full.`
              : `The math does not work at this cost per lead. Either the lead price is too high or your close rate has to come up first.`,
        },
        note: "This is a plan, not a promise. No one can guarantee lead volume or cost. Start small, measure, then scale what proves out.",
      };
    },
  },

  {
    slug: "cac-payback-calculator",
    name: "Customer Payback Period Calculator",
    short: "CAC Payback",
    emoji: "⏳",
    category: "Ads",
    tagline: "How long until a customer pays you back",
    description:
      "Spending to win customers is fine. Spending faster than they pay you back is how profitable businesses run out of cash.",
    who: "Any business paying to acquire customers who pay over time: memberships, retainers, service plans, repeat trades.",
    problem:
      "You can be profitable on paper and broke in the bank at the same time. Payback period is the number that explains it.",
    payoff: "Months to payback, and how much cash you need to fund growth.",
    steps: [
      "Enter what it costs to get a customer.",
      "Enter what they pay you and how often.",
      "Read the payback months and the cash you have to float.",
    ],
    fields: [
      { id: "cac", label: "Cost to acquire one customer", type: "money", def: 320 },
      { id: "monthlyValue", label: "Gross profit they bring per month", type: "money", def: 95 },
      { id: "newPerMonth", label: "New customers per month", type: "slider", min: 1, max: 200, step: 1, def: 12 },
      { id: "churn", label: "Customers you lose per month", type: "slider", min: 0, max: 20, step: 0.5, def: 3, suffix: "%" },
    ],
    run: (v) => {
      const cac = num(v, "cac");
      const mv = Math.max(0.01, num(v, "monthlyValue"));
      const perMonth = num(v, "newPerMonth");
      const churn = num(v, "churn") / 100;
      const payback = cac / mv;
      const lifetimeMonths = churn > 0 ? 1 / churn : 60;
      const ltv = mv * lifetimeMonths;
      const ratio = cac > 0 ? ltv / cac : 0;
      const cashNeeded = cac * perMonth * Math.min(payback, 24);

      return {
        headline: {
          value: `${dec(payback, 1)} months`,
          label: "Until a customer pays back what you spent",
          sub: `They stay about ${dec(lifetimeMonths, 1)} months`,
          tone: payback < 6 ? "good" : payback < 12 ? "warn" : "bad",
        },
        stats: [
          { label: "Lifetime gross profit", value: money(ltv), tone: "good" },
          { label: "Value to cost ratio", value: `${dec(ratio, 1)}x`, tone: ratio >= 3 ? "good" : ratio >= 1 ? "warn" : "bad" },
          { label: "Cash you must float", value: money(cashNeeded), sub: "to grow at this pace", tone: "warn" },
          { label: "Profit per customer", value: money(ltv - cac), tone: ltv > cac ? "good" : "bad" },
        ],
        bars: {
          title: "What you pay vs what you get back",
          items: [
            { label: "Acquisition cost", value: cac, display: money(cac), tone: "warn" },
            { label: "Lifetime gross profit", value: ltv, display: money(ltv), tone: "good" },
          ],
        },
        verdict: {
          tone: payback < 6 ? "good" : "warn",
          text:
            payback < 6
              ? "Fast payback means growth funds itself. This is the good position to be in."
              : `At ${dec(payback, 1)} months of payback you are the bank. Make sure you have ${money(cashNeeded)} of cushion before you push growth.`,
        },
      };
    },
  },

  {
    slug: "ad-test-budget-calculator",
    name: "Ad Test Budget Calculator",
    short: "Ad Test Budget",
    emoji: "🧪",
    category: "Ads",
    tagline: "How much you need to spend to actually know",
    description:
      "Most small budgets never spend enough to produce a real answer, then people conclude ads do not work. This shows the minimum honest test.",
    who: "Anybody about to try ads for the first time, or trying again after a bad round.",
    problem:
      "Two hundred dollars and four days is not a test. It is a coin flip you then treat as a verdict.",
    payoff: "A minimum test budget and duration, so a no is a real no.",
    steps: [
      "Enter your expected cost per lead and what you want to learn.",
      "Read the minimum spend and days.",
      "If you cannot afford the honest test, do not run the dishonest one.",
    ],
    fields: [
      { id: "cpl", label: "Expected cost per lead", type: "money", def: 45 },
      { id: "leadsNeeded", label: "Leads needed to judge it", type: "slider", min: 10, max: 200, step: 5, def: 30, help: "Under about 30 conversions you are reading noise, not a result." },
      { id: "dailyMin", label: "Daily budget you were planning", type: "money", def: 20 },
      { id: "variants", label: "Ads or audiences you want to test", type: "slider", min: 1, max: 8, step: 1, def: 2 },
    ],
    run: (v) => {
      const cpl = num(v, "cpl");
      const need = num(v, "leadsNeeded");
      const daily = Math.max(1, num(v, "dailyMin"));
      const variants = num(v, "variants");
      const perVariant = need * cpl;
      const total = perVariant * variants;
      const days = total / daily;
      const properDaily = total / 14;

      return {
        headline: { value: money(total), label: "Minimum honest test budget", sub: `${count(need)} leads on each of ${count(variants)} variants`, tone: "neutral" },
        stats: [
          { label: "Per variant", value: money(perVariant) },
          { label: "Days at your budget", value: `${dec(days, 0)} days`, tone: days > 30 ? "bad" : "good" },
          { label: "Daily to finish in 2 weeks", value: money2(properDaily), tone: "warn" },
          { label: "Cost of an unreadable test", value: money(daily * 7), sub: "spent, learned nothing", tone: "bad" },
        ],
        verdict: {
          tone: days > 30 ? "bad" : "good",
          text:
            days > 30
              ? `At ${money2(daily)} a day this test takes ${dec(days, 0)} days. The market changes before you get an answer. Test one variant with a bigger daily budget instead.`
              : `Run it for ${dec(days, 0)} days, do not touch it while it runs, and judge it on leads, not likes.`,
        },
        note: "Testing more variants does not get you an answer faster. It splits the same budget into pieces too small to read.",
      };
    },
  },

  {
    slug: "commission-calculator",
    name: "Sales Commission Calculator",
    short: "Commission",
    emoji: "🧑‍💼",
    category: "Ads",
    tagline: "Build a commission plan that does not eat your margin",
    description:
      "Set a commission on revenue or on profit, see what the rep takes home, and what is left for the business.",
    who: "Anyone paying a salesperson, a setter, or a referral partner.",
    problem:
      "Commission on revenue feels simple and quietly hands away your entire margin on discounted deals.",
    payoff: "A plan where the rep wins when the business wins, not instead of it.",
    steps: [
      "Enter the deal size, your margin, and the commission.",
      "Switch between paying on revenue and paying on profit.",
      "Check what the business keeps at the end.",
    ],
    fields: [
      { id: "deals", label: "Deals per month", type: "slider", min: 1, max: 200, step: 1, def: 12 },
      { id: "size", label: "Average deal size", type: "money", def: 2500 },
      { id: "margin", label: "Gross margin", type: "slider", min: 5, max: 95, step: 1, def: 40, suffix: "%" },
      { id: "basis", label: "Pay commission on", type: "select", def: "revenue", options: [
        { value: "revenue", label: "Revenue (simple, expensive)" },
        { value: "profit", label: "Gross profit (fair, aligned)" },
      ] },
      { id: "rate", label: "Commission rate", type: "slider", min: 1, max: 50, step: 0.5, def: 8, suffix: "%" },
      { id: "base", label: "Base pay per month", type: "money", def: 2500 },
    ],
    run: (v) => {
      const deals = num(v, "deals");
      const size = num(v, "size");
      const margin = num(v, "margin") / 100;
      const rate = num(v, "rate") / 100;
      const base = num(v, "base");
      const revenue = deals * size;
      const grossProfit = revenue * margin;
      const basis = str(v, "basis", "revenue");
      const commission = basis === "profit" ? grossProfit * rate : revenue * rate;
      const repTotal = commission + base;
      const businessKeeps = grossProfit - repTotal;
      const commissionOfProfit = grossProfit > 0 ? (commission / grossProfit) * 100 : 0;

      return {
        headline: { value: money(repTotal), label: "Rep takes home per month", sub: `${money(commission)} commission plus ${money(base)} base`, tone: "neutral" },
        stats: [
          { label: "Revenue they produce", value: money(revenue) },
          { label: "Gross profit", value: money(grossProfit), tone: "good" },
          { label: "Business keeps", value: money(businessKeeps), tone: businessKeeps > 0 ? "good" : "bad" },
          { label: "Commission as share of profit", value: pct(commissionOfProfit, 1), tone: commissionOfProfit > 50 ? "bad" : "good" },
        ],
        bars: {
          title: "Where the gross profit goes",
          items: [
            { label: "Business", value: Math.max(0, businessKeeps), display: money(businessKeeps), tone: businessKeeps > 0 ? "good" : "bad" },
            { label: "Commission", value: commission, display: money(commission), tone: "warn" },
            { label: "Base pay", value: base, display: money(base), tone: "warn" },
          ],
        },
        verdict: {
          tone: commissionOfProfit > 50 ? "bad" : "good",
          text:
            basis === "revenue"
              ? "Paying on revenue means a rep who discounts still gets paid the same. Paying on gross profit makes them defend your price like it is their own money, because it is."
              : "Paying on gross profit is the version that survives a discount war. The rep protects margin without being told to.",
        },
      };
    },
  },

  /* ----------------------------------- TIME --------------------------------- */
  {
    slug: "admin-time-audit",
    name: "Admin Time Audit",
    emoji: "🗂️",
    category: "Time",
    tagline: "What paperwork is costing you",
    description:
      "Quoting, invoicing, chasing payments, scheduling, texting back. Add up the hours and see what those hours are worth doing real work.",
    who: "Owners who feel busy all day and cannot point at what got done.",
    problem:
      "The admin never ends and it never gets billed. It just eats the hours you could have sold.",
    payoff: "The yearly value of the hours you would get back by automating the repetitive parts.",
    steps: [
      "Check the tasks you personally do every week.",
      "Set the hours each one eats.",
      "See the yearly cost, and what automating the obvious ones is worth.",
    ],
    fields: [
      { id: "tasks", label: "What you personally do every week", type: "checks", def: ["quotes", "invoices", "chasing", "scheduling", "followup"], options: [
        { value: "quotes", label: "Writing quotes and estimates" },
        { value: "invoices", label: "Creating and sending invoices" },
        { value: "chasing", label: "Chasing late payments" },
        { value: "scheduling", label: "Scheduling and rescheduling" },
        { value: "followup", label: "Following up with leads" },
        { value: "reminders", label: "Appointment reminders" },
        { value: "reviews", label: "Asking for reviews" },
        { value: "reporting", label: "Putting numbers together" },
        { value: "socialposts", label: "Posting on social" },
        { value: "datamove", label: "Copying info between apps" },
      ] },
      { id: "hoursEach", label: "Hours per task per week", type: "slider", min: 0.25, max: 15, step: 0.25, def: 1.5 },
      { id: "worth", label: "What your hour is worth", type: "money", def: 150 },
      { id: "automatable", label: "Share of it a system could handle", type: "slider", min: 10, max: 95, step: 5, def: 65, suffix: "%" },
    ],
    run: (v) => {
      const tasks = list(v, "tasks");
      const each = num(v, "hoursEach");
      const worth = num(v, "worth");
      const auto = num(v, "automatable") / 100;
      const weekly = tasks.length * each;
      const yearlyHours = weekly * 52;
      const cost = yearlyHours * worth;
      const savedHours = yearlyHours * auto;
      const savedValue = savedHours * worth;

      return {
        headline: { value: money(cost), label: "Yearly value of your admin hours", sub: `${count(yearlyHours)} hours, ${dec(weekly, 1)} a week`, tone: "bad" },
        stats: [
          { label: "Weeks a year spent on admin", value: dec(yearlyHours / 40, 1), sub: "of 40-hour weeks", tone: "bad" },
          { label: "Hours a system could take", value: count(savedHours), tone: "good" },
          { label: "That is worth", value: money(savedValue), tone: "good" },
          { label: "Tasks on your plate", value: count(tasks.length) },
        ],
        bars: {
          title: "Your week",
          items: [
            { label: "Admin", value: weekly, display: `${dec(weekly, 1)} hrs`, tone: "bad" },
            { label: "Could be automated", value: weekly * auto, display: `${dec(weekly * auto, 1)} hrs`, tone: "warn" },
            { label: "Back in your pocket", value: weekly * auto, display: `${money(weekly * auto * worth * 52)}/yr`, tone: "good" },
          ],
        },
        verdict: {
          tone: "warn",
          text: `You are spending ${dec(yearlyHours / 40, 1)} full work weeks a year on things that do not require you. That is the real cost of doing it all by hand.`,
        },
      };
    },
  },

  {
    slug: "task-automation-savings",
    name: "Automation Payback Calculator",
    short: "Automation Payback",
    emoji: "⚙️",
    category: "Time",
    tagline: "Is this worth automating?",
    description:
      "Enter one repetitive task. Get the yearly cost of doing it by hand and how fast automating it pays for itself.",
    who: "Anybody about to decide whether a system is worth building.",
    problem:
      "Small tasks hide. Five minutes, twenty times a week, is a hundred hours a year.",
    payoff: "A payback period in weeks so the decision is obvious either way.",
    steps: [
      "Enter how long the task takes and how often it happens.",
      "Enter what it would cost to automate it.",
      "Read the payback. Under six months is usually a yes.",
    ],
    fields: [
      { id: "minutes", label: "Minutes the task takes", type: "slider", min: 1, max: 240, step: 1, def: 8 },
      { id: "times", label: "Times per week it happens", type: "slider", min: 1, max: 500, step: 1, def: 25 },
      { id: "rate", label: "Cost of the person doing it, per hour", type: "money", def: 35 },
      { id: "buildCost", label: "One-time cost to automate it", type: "money", def: 1500 },
      { id: "monthly", label: "Ongoing cost per month", type: "money", def: 20 },
      { id: "errorRate", label: "How often it gets done wrong", type: "slider", min: 0, max: 30, step: 1, def: 5, suffix: "%" },
      { id: "errorCost", label: "What each mistake costs", type: "money", def: 60 },
    ],
    run: (v) => {
      const minutes = num(v, "minutes");
      const times = num(v, "times");
      const rate = num(v, "rate");
      const build = num(v, "buildCost");
      const monthly = num(v, "monthly");
      const errRate = num(v, "errorRate") / 100;
      const errCost = num(v, "errorCost");

      const hoursYear = (minutes * times * 52) / 60;
      const laborCost = hoursYear * rate;
      const errors = times * 52 * errRate;
      const errorCostYear = errors * errCost;
      const totalCost = laborCost + errorCostYear;
      const autoCost = monthly * 12;
      const netSaving = totalCost - autoCost;
      const paybackWeeks = netSaving > 0 ? (build / netSaving) * 52 : Infinity;

      return {
        headline: {
          value: Number.isFinite(paybackWeeks) ? `${dec(paybackWeeks, 1)} weeks` : "Never",
          label: "Until automating this pays for itself",
          sub: `${money(netSaving)} saved a year after that`,
          tone: paybackWeeks < 26 ? "good" : paybackWeeks < 78 ? "warn" : "bad",
        },
        stats: [
          { label: "Hours a year by hand", value: count(hoursYear), tone: "bad" },
          { label: "Labor cost a year", value: money(laborCost), tone: "bad" },
          { label: "Mistakes cost", value: money(errorCostYear), sub: `${count(errors)} a year`, tone: "bad" },
          { label: "Five year savings", value: money(netSaving * 5 - build), tone: "good" },
        ],
        bars: {
          title: "By hand vs automated, per year",
          items: [
            { label: "By hand", value: totalCost, display: money(totalCost), tone: "bad" },
            { label: "Automated", value: autoCost, display: money(autoCost), tone: "good" },
          ],
        },
        verdict: {
          tone: paybackWeeks < 26 ? "good" : "warn",
          text:
            paybackWeeks < 26
              ? "Under six months payback. Build it. You will forget you ever did it by hand."
              : "Long payback. Either the task is rarer than it feels, or the build is scoped too big. Try automating just the worst part of it.",
        },
      };
    },
  },

  {
    slug: "cost-per-mile-calculator",
    name: "Vehicle Cost Per Mile",
    short: "Cost Per Mile",
    emoji: "🛻",
    category: "Time",
    tagline: "What your truck really costs to run",
    description:
      "Fuel, insurance, maintenance, tires, the note and depreciation, divided by the miles you actually drive. The number you need before you quote a job an hour away.",
    who: "Trades, delivery, mobile services, anybody quoting jobs outside their town.",
    problem:
      "Most owners price fuel and forget everything else. Then the truck needs tires and it feels like bad luck.",
    payoff: "A per-mile number you can add to every out-of-town quote.",
    steps: [
      "Enter your yearly miles and vehicle costs.",
      "Read cost per mile.",
      "Add it to your travel charge, or start charging one.",
    ],
    fields: [
      { id: "miles", label: "Miles per year", type: "slider", min: 2000, max: 100000, step: 1000, def: 28000 },
      { id: "mpg", label: "Miles per gallon", type: "slider", min: 5, max: 45, step: 0.5, def: 15 },
      { id: "fuelPrice", label: "Fuel price per gallon", type: "money", def: 3 },
      { id: "insurance", label: "Insurance per year", type: "money", def: 2400 },
      { id: "maintenance", label: "Maintenance and tires per year", type: "money", def: 2200 },
      { id: "payment", label: "Payment per month", type: "money", def: 650 },
      { id: "depreciation", label: "Value it loses per year", type: "money", def: 3500 },
      { id: "jobMiles", label: "Round-trip miles on a typical job", type: "slider", min: 0, max: 400, step: 5, def: 45 },
    ],
    run: (v) => {
      const miles = Math.max(1, num(v, "miles"));
      const mpg = Math.max(1, num(v, "mpg"));
      const fuelPrice = num(v, "fuelPrice");
      const fuel = (miles / mpg) * fuelPrice;
      const insurance = num(v, "insurance");
      const maintenance = num(v, "maintenance");
      const payment = num(v, "payment") * 12;
      const dep = num(v, "depreciation");
      const total = fuel + insurance + maintenance + payment + dep;
      const perMile = total / miles;
      const jobMiles = num(v, "jobMiles");
      const perJob = perMile * jobMiles;

      return {
        headline: { value: money2(perMile), label: "Cost per mile", sub: `${money(total)} a year, ${count(miles)} miles`, tone: "neutral" },
        stats: [
          { label: "Cost per typical job", value: money2(perJob), sub: `${count(jobMiles)} round-trip miles`, tone: "warn" },
          { label: "Fuel is only", value: pct((fuel / total) * 100, 0), sub: "of the real cost" },
          { label: "Cost per month", value: money(total / 12) },
          { label: "Per job, 100 jobs a year", value: money(perJob * 100) + "/yr", tone: "bad" },
        ],
        bars: {
          title: "What it actually costs to roll",
          items: [
            { label: "Fuel", value: fuel, display: money(fuel), tone: "warn" },
            { label: "Payment", value: payment, display: money(payment), tone: "warn" },
            { label: "Depreciation", value: dep, display: money(dep), tone: "bad" },
            { label: "Maintenance", value: maintenance, display: money(maintenance), tone: "warn" },
            { label: "Insurance", value: insurance, display: money(insurance), tone: "warn" },
          ],
        },
        verdict: {
          tone: "warn",
          text: `If you are not charging at least ${money2(perJob)} of travel on a typical job, the truck is being paid for out of your profit.`,
        },
      };
    },
  },

  {
    slug: "drive-time-cost",
    name: "Windshield Time Calculator",
    short: "Drive Time",
    emoji: "🚦",
    category: "Time",
    tagline: "Hours in the truck are hours you cannot bill",
    description:
      "Drive time is the most expensive unbilled hour in a service business. See the yearly cost and what tighter routing recovers.",
    who: "Mobile services, trades, delivery, inspectors, route businesses.",
    problem:
      "Two hours a day of driving is a quarter of your billable capacity, gone, every day, and it never shows up on an invoice.",
    payoff: "The cost of your routes, and what tightening them is worth.",
    steps: [
      "Enter daily drive hours per person.",
      "Enter the crew size and your billable rate.",
      "See what a 20 percent routing improvement gives back.",
    ],
    fields: [
      { id: "hoursDay", label: "Drive hours per person per day", type: "slider", min: 0.25, max: 8, step: 0.25, def: 2 },
      { id: "people", label: "People driving", type: "slider", min: 1, max: 40, step: 1, def: 3 },
      { id: "days", label: "Days per week", type: "slider", min: 1, max: 7, step: 1, def: 5 },
      { id: "billRate", label: "What you bill per hour", type: "money", def: 125 },
      { id: "wage", label: "What you pay per hour", type: "money", def: 28 },
      { id: "improve", label: "Drive time better routing would cut", type: "slider", min: 5, max: 50, step: 5, def: 20, suffix: "%" },
    ],
    run: (v) => {
      const hoursDay = num(v, "hoursDay");
      const people = num(v, "people");
      const days = num(v, "days");
      const bill = num(v, "billRate");
      const wage = num(v, "wage");
      const improve = num(v, "improve") / 100;

      const yearlyHours = hoursDay * people * days * 52;
      const wagesPaid = yearlyHours * wage;
      const opportunity = yearlyHours * bill;
      const recoveredHours = yearlyHours * improve;
      const recovered = recoveredHours * bill;

      return {
        headline: { value: count(yearlyHours), label: "Hours a year spent driving", sub: `${money(wagesPaid)} in wages just to move`, tone: "bad" },
        stats: [
          { label: "Billable value of those hours", value: money(opportunity), tone: "bad" },
          { label: `Hours back at ${pct(improve * 100)} better routing`, value: count(recoveredHours), tone: "good" },
          { label: "That is worth", value: money(recovered), tone: "good" },
          { label: "Full work weeks lost", value: dec(yearlyHours / 40, 1), tone: "bad" },
        ],
        bars: {
          title: "Drive time, priced two ways",
          items: [
            { label: "Wages paid to drive", value: wagesPaid, display: money(wagesPaid), tone: "warn" },
            { label: "Billable time lost", value: opportunity, display: money(opportunity), tone: "bad" },
            { label: "Recoverable", value: recovered, display: money(recovered), tone: "good" },
          ],
        },
        verdict: {
          tone: "warn",
          text: "Cluster jobs by area, book same-day neighbors together, and stop letting the schedule get built in the order calls came in.",
        },
      };
    },
  },

  {
    slug: "meeting-cost-calculator",
    name: "Meeting Cost Calculator",
    short: "Meeting Cost",
    emoji: "🪑",
    category: "Time",
    tagline: "What that recurring meeting really costs",
    description:
      "Multiply the room by the clock. Then look at the yearly number for the meeting that could have been a text.",
    who: "Anybody running a weekly standing meeting nobody looks forward to.",
    problem:
      "A one-hour weekly meeting with six people is 312 hours a year. Nobody would sign off on that as a line item.",
    payoff: "A number you can put on the agenda.",
    steps: [
      "Enter the people, their rate, and how long the meeting runs.",
      "Set how often it happens.",
      "Read the yearly cost, then decide if it earns it.",
    ],
    fields: [
      { id: "people", label: "People in the room", type: "slider", min: 2, max: 50, step: 1, def: 6 },
      { id: "rate", label: "Average loaded cost per hour", type: "money", def: 45 },
      { id: "minutes", label: "Length in minutes", type: "slider", min: 15, max: 240, step: 5, def: 60 },
      { id: "perWeek", label: "Times per week", type: "slider", min: 0.25, max: 10, step: 0.25, def: 1 },
      { id: "prep", label: "Prep minutes per person", type: "slider", min: 0, max: 120, step: 5, def: 10 },
    ],
    run: (v) => {
      const people = num(v, "people");
      const rate = num(v, "rate");
      const minutes = num(v, "minutes");
      const perWeek = num(v, "perWeek");
      const prep = num(v, "prep");
      const hoursEach = (minutes + prep) / 60;
      const perMeeting = people * hoursEach * rate;
      const yearly = perMeeting * perWeek * 52;
      const hoursYear = people * hoursEach * perWeek * 52;

      return {
        headline: { value: money(yearly), label: "This meeting costs you per year", sub: `${money(perMeeting)} every time it happens`, tone: "bad" },
        stats: [
          { label: "Hours a year", value: count(hoursYear), tone: "bad" },
          { label: "Cost per minute", value: money2(perMeeting / Math.max(1, minutes + prep)) },
          { label: "Cut it to 30 minutes", value: money(yearly * (30 / Math.max(1, minutes))) + "/yr", tone: "good" },
          { label: "Saved by cutting it in half", value: money(yearly / 2), tone: "good" },
        ],
        verdict: {
          tone: "warn",
          text: `Put ${money(perMeeting)} at the top of the agenda. Meetings get shorter when the price is in the room.`,
        },
      };
    },
  },

  {
    slug: "owner-hourly-worth",
    name: "What Your Hour Is Worth",
    short: "Your Hourly Worth",
    emoji: "👑",
    category: "Time",
    tagline: "The number that tells you what to stop doing",
    description:
      "Divide what the business makes by the hours you put in. Then compare that to the tasks you keep doing yourself.",
    who: "Owners who mow their own lawn at the office and answer their own phone.",
    problem:
      "You will not pay somebody $20 an hour to do a task, so you do it yourself, at a real cost of ten times that.",
    payoff: "A clear line between what only you can do and what you should hand off.",
    steps: [
      "Enter your yearly profit and the hours you actually work.",
      "Read your hourly worth.",
      "List everything you do that costs less than that to hire out. Hand it off.",
    ],
    fields: [
      { id: "profit", label: "What the business pays you a year", type: "money", def: 140000 },
      { id: "hoursWeek", label: "Hours you actually work a week", type: "slider", min: 20, max: 100, step: 1, def: 55 },
      { id: "weeks", label: "Weeks a year", type: "slider", min: 40, max: 52, step: 1, def: 50 },
      { id: "lowValue", label: "Hours a week on work you could hire out", type: "slider", min: 0, max: 40, step: 1, def: 12 },
      { id: "hireRate", label: "What it costs to hire that out", type: "money", def: 25 },
    ],
    run: (v) => {
      const profit = num(v, "profit");
      const hoursWeek = Math.max(1, num(v, "hoursWeek"));
      const weeks = Math.max(1, num(v, "weeks"));
      const low = num(v, "lowValue");
      const hireRate = num(v, "hireRate");
      const totalHours = hoursWeek * weeks;
      const worth = profit / totalHours;
      const lowHoursYear = low * weeks;
      const opportunityCost = lowHoursYear * worth;
      const hireCost = lowHoursYear * hireRate;
      const netGain = opportunityCost - hireCost;

      return {
        headline: { value: money2(worth) + "/hr", label: "What one hour of yours is worth", sub: `${count(totalHours)} hours a year`, tone: "good" },
        stats: [
          { label: "Hours a year on low-value work", value: count(lowHoursYear), tone: "bad" },
          { label: "What that time is worth", value: money(opportunityCost), tone: "bad" },
          { label: "Cost to hire it out", value: money(hireCost), tone: "warn" },
          { label: "You come out ahead by", value: money(netGain), tone: netGain > 0 ? "good" : "bad" },
        ],
        bars: {
          title: "Doing it yourself vs paying somebody",
          items: [
            { label: "Your time", value: opportunityCost, display: money(opportunityCost), tone: "bad" },
            { label: "Hiring it out", value: hireCost, display: money(hireCost), tone: "good" },
          ],
        },
        verdict: {
          tone: netGain > 0 ? "good" : "neutral",
          text:
            netGain > 0
              ? `Anything you can hire out for less than ${money2(worth)} an hour and still get done right, hire out. You are net ahead ${money(netGain)} a year on the ${count(low)} hours a week alone.`
              : "You are already close to fully leveraged on your time. The next gain comes from raising the value of the hours, not offloading more of them.",
        },
        note: "Some low-value work is worth keeping because you learn from it or you like it. That is a fine reason. Just make it a decision instead of a habit.",
      };
    },
  },
];

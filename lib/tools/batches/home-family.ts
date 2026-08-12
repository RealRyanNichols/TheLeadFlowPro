// Home and family.
//
// The first batch of the expansion. These are household tools, not business
// tools, so they carry the financial disclaimer, they are marked "personal"
// data sensitivity, and every one of them runs entirely in the browser. Nothing
// anybody types here is transmitted, stored or put in a shareable link.
//
// Formula sources are recorded in docs/TOOL_FORMULA_SOURCES.md.

import {
  type ToolDef, num, str, list, money, money2, pct, count, dec,
} from "../types";

export const HOME_FAMILY_TOOLS: ToolDef[] = [
  {
    slug: "household-budget-planner",
    name: "Household Budget Planner",
    short: "Household Budget",
    emoji: "🏠",
    category: "Money",
    tagline: "Where the money actually goes each month",
    description:
      "Put in what comes home and what goes out, and see what is left, what each category is really costing you as a share of your pay, and where the pressure is.",
    who: "Anyone running a household budget: parents, couples, roommates, or somebody doing this on their own for the first time.",
    problem:
      "Money comes in and money goes out and the account is empty before the next payday, but nobody has ever written the whole thing down in one place.",
    payoff:
      "One page showing every category, what share of your take-home it eats, and the number left at the end of the month.",
    steps: [
      "Enter what actually lands in the account each month, after tax.",
      "Fill in each category from your last two or three statements, not from memory.",
      "Look at the share column. Housing above about a third is where most budgets break.",
      "Print it or download it and put it somewhere both of you can see it.",
    ],
    faqs: [
      { q: "Is my information saved anywhere?", a: "No. This runs entirely in your browser. Nothing you type is sent to a server, stored, or put in a link. Close the tab and it is gone." },
      { q: "What is the 50, 30, 20 guideline?", a: "A common rule of thumb: roughly half of take-home on needs, a third on wants, and the rest on saving and paying down debt. It is a starting point for a conversation, not a rule, and it does not survive a high cost-of-living area intact." },
      { q: "Should I use gross pay or take-home?", a: "Take-home. Budgeting off gross pay is the single most common way people end up short every month." },
    ],
    domain: "home-family",
    toolType: "planner",
    goals: ["save-money", "organize-information", "plan-a-project"],
    industries: ["household", "personal-finance"],
    audiences: ["parents", "young-adults", "midlife-adults", "older-adults", "caregivers"],
    keywords: ["household budget", "monthly budget", "family budget", "take home pay", "expenses", "50 30 20", "money left over", "spending plan"],
    synonyms: ["family budget planner", "monthly spending plan", "home budget"],
    disclaimer: "financial",
    dataSensitivity: "sensitive",
    popularity: 88,
    isNew: true,
    assumptions: [
      "Every figure is treated as a normal month. Annual bills like insurance or property tax need dividing by twelve first.",
      "The 50, 30, 20 comparison is a rule of thumb, not a standard.",
    ],
    relatedSlugs: ["emergency-fund-calculator", "subscription-audit", "debt-payoff-planner", "rent-affordability-estimator"],
    embedHeight: 980,
    fields: [
      { id: "income", label: "Take-home pay per month", type: "money", def: 4200, help: "What actually lands in the account, after tax." },
      { id: "housing", label: "Rent or mortgage", type: "money", def: 1400 },
      { id: "utilities", label: "Utilities, phone and internet", type: "money", def: 380 },
      { id: "food", label: "Groceries and eating out", type: "money", def: 750 },
      { id: "transport", label: "Car payment, fuel and insurance", type: "money", def: 640 },
      { id: "childcare", label: "Childcare and school costs", type: "money", def: 0 },
      { id: "debt", label: "Loan and card payments", type: "money", def: 300 },
      { id: "other", label: "Everything else", type: "money", def: 450 },
    ],
    run: (v) => {
      const income = num(v, "income");
      const cats = [
        { label: "Housing", value: num(v, "housing") },
        { label: "Utilities", value: num(v, "utilities") },
        { label: "Food", value: num(v, "food") },
        { label: "Transport", value: num(v, "transport") },
        { label: "Childcare", value: num(v, "childcare") },
        { label: "Debt payments", value: num(v, "debt") },
        { label: "Everything else", value: num(v, "other") },
      ].filter((c) => c.value > 0);

      const spent = cats.reduce((a, c) => a + c.value, 0);
      const left = income - spent;
      const share = (n: number) => (income > 0 ? (n / income) * 100 : 0);
      const housingShare = share(num(v, "housing"));

      const tone = left < 0 ? "bad" : left < income * 0.05 ? "warn" : "good";

      return {
        headline: {
          value: money(left),
          label: left < 0 ? "Short every month" : "Left at the end of the month",
          sub: income > 0 ? `${pct(share(left), 1)} of take-home pay` : undefined,
          tone,
        },
        explain:
          left < 0
            ? `You are spending ${money(Math.abs(left))} more than comes in each month, which is ${money(Math.abs(left) * 12)} a year going onto a card or out of savings. The two biggest lines are ${cats.slice().sort((a, b) => b.value - a.value).slice(0, 2).map((c) => c.label.toLowerCase()).join(" and ")}.`
            : `After everything you listed, ${money(left)} is left each month, or ${money(left * 12)} a year. Housing is taking ${pct(housingShare, 0)} of your take-home pay.`,
        stats: [
          { label: "Total going out", value: money(spent), tone: "neutral" },
          { label: "Housing share", value: pct(housingShare, 0), sub: housingShare > 35 ? "above the usual comfort line" : "inside the usual range", tone: housingShare > 35 ? "warn" : "good" },
          { label: "Left over per year", value: money(left * 12), tone },
          { label: "Needs, wants, saving", value: `${pct(share(num(v, "housing") + num(v, "utilities") + num(v, "food") + num(v, "transport") + num(v, "childcare")), 0)} / ${pct(share(num(v, "other")), 0)} / ${pct(share(num(v, "debt") + Math.max(0, left)), 0)}`, sub: "the 50, 30, 20 comparison" },
        ],
        bars: {
          title: "Where every dollar goes",
          caption: "Share of take-home pay.",
          items: [
            ...cats.map((c) => ({ label: c.label, value: c.value, display: `${money(c.value)} (${pct(share(c.value), 0)})`, tone: "neutral" as const })),
            { label: "Left over", value: Math.max(0, left), display: money(left), tone: (left < 0 ? "bad" : "good") as "bad" | "good" },
          ],
        },
        csv: {
          filename: "household-budget.csv",
          headers: ["Category", "Monthly", "Share of take-home", "Yearly"],
          rows: [
            ...cats.map((c) => [c.label, money2(c.value), pct(share(c.value), 1), money2(c.value * 12)]),
            ["Total out", money2(spent), pct(share(spent), 1), money2(spent * 12)],
            ["Left over", money2(left), pct(share(left), 1), money2(left * 12)],
          ],
        },
        verdict: {
          tone,
          text:
            left < 0
              ? `The gap is ${money(Math.abs(left))} a month. Start with the largest line you can actually change, which is usually food or transport, because housing takes months to move.`
              : left < income * 0.05
              ? `There is almost nothing spare. One car repair puts this month underwater, so an emergency fund is the next thing to build.`
              : `You have ${money(left)} a month of room. Give it a job before it disappears, or it becomes spending you cannot account for.`,
        },
        note: "Everything here stays in your browser. Print it or download the CSV to keep it.",
      };
    },
  },

  {
    slug: "grocery-unit-price-calculator",
    name: "Grocery Unit Price Calculator",
    short: "Unit Price",
    emoji: "🛒",
    category: "Money",
    tagline: "Which size is actually the better deal",
    description:
      "Compare two sizes of the same thing and see the real price per ounce, pound, litre or count, plus what the cheaper one saves you over a year.",
    who: "Anyone doing the weekly shop, especially for a family, where the bigger box is not always cheaper.",
    problem:
      "The big one looks like the deal and sometimes it is not. Shelf labels use different units, some stores do not print unit prices at all, and doing it in your head in the aisle is how you get it wrong.",
    payoff: "The real price per unit for both, which one wins, and what the difference adds up to over a year.",
    steps: [
      "Enter the size and price of the first option.",
      "Enter the size and price of the second.",
      "Put in how often you buy it to see the yearly difference.",
    ],
    faqs: [
      { q: "Do the two sizes have to use the same unit?", a: "Yes. Compare ounces to ounces, or pounds to pounds. If one label is in ounces and the other in pounds, convert first: one pound is 16 ounces." },
      { q: "Is the bigger size always cheaper per unit?", a: "No, and that is the point. Multi-packs and family sizes are often priced above the smaller item per unit, because most people assume they are not." },
    ],
    domain: "home-family",
    toolType: "converter",
    goals: ["save-money", "make-a-decision"],
    industries: ["household", "personal-finance", "retail"],
    audiences: ["parents", "young-adults", "older-adults", "caregivers"],
    keywords: ["unit price", "price per ounce", "grocery", "bulk", "cost per pound", "shopping", "compare sizes", "better deal"],
    synonyms: ["price per unit calculator", "which size is cheaper", "bulk buying calculator"],
    disclaimer: "general-estimate",
    dataSensitivity: "none",
    popularity: 79,
    isNew: true,
    relatedSlugs: ["household-budget-planner", "subscription-audit", "emergency-fund-calculator", "debt-payoff-planner"],
    embedHeight: 860,
    fields: [
      { id: "unit", label: "Unit on the label", type: "select", def: "oz", options: [
        { value: "oz", label: "Ounces" },
        { value: "lb", label: "Pounds" },
        { value: "g", label: "Grams" },
        { value: "l", label: "Litres" },
        { value: "ct", label: "Count, as in per item" },
      ] },
      { id: "sizeA", label: "Option A size", type: "number", def: 12, suffix: "units" },
      { id: "priceA", label: "Option A price", type: "money", def: 4.29 },
      { id: "sizeB", label: "Option B size", type: "number", def: 32, suffix: "units" },
      { id: "priceB", label: "Option B price", type: "money", def: 9.99 },
      { id: "perMonth", label: "How many you buy a month", type: "slider", min: 1, max: 30, step: 1, def: 4 },
    ],
    run: (v) => {
      const unit = str(v, "unit", "oz");
      const sizeA = num(v, "sizeA");
      const sizeB = num(v, "sizeB");
      const priceA = num(v, "priceA");
      const priceB = num(v, "priceB");
      const perMonth = num(v, "perMonth");

      if (sizeA <= 0 || sizeB <= 0) {
        return { note: "Enter a size above zero for both options and the comparison appears here." };
      }

      const unitA = priceA / sizeA;
      const unitB = priceB / sizeB;
      const label: Record<string, string> = { oz: "ounce", lb: "pound", g: "gram", l: "litre", ct: "item" };
      const u = label[unit] || "unit";

      const aWins = unitA <= unitB;
      const cheaper = aWins ? "A" : "B";
      const cheapUnit = Math.min(unitA, unitB);
      const dearUnit = Math.max(unitA, unitB);
      const gapPct = dearUnit > 0 ? ((dearUnit - cheapUnit) / dearUnit) * 100 : 0;

      // Compare on equal footing: the cost of buying the same amount either way.
      const monthlyUnits = perMonth * (aWins ? sizeA : sizeB);
      const yearSaving = (dearUnit - cheapUnit) * monthlyUnits * 12;

      return {
        headline: {
          value: `Option ${cheaper}`,
          label: `Cheaper by ${pct(gapPct, 1)} per ${u}`,
          sub: `${money2(cheapUnit)} against ${money2(dearUnit)} per ${u}`,
          tone: "good",
        },
        explain: `Option A works out at ${money2(unitA)} per ${u} and option B at ${money2(unitB)} per ${u}. Option ${cheaper} is the better buy, by ${money2(dearUnit - cheapUnit)} on every ${u}.`,
        stats: [
          { label: "Option A per " + u, value: money2(unitA), tone: aWins ? "good" : "bad" },
          { label: "Option B per " + u, value: money2(unitB), tone: aWins ? "bad" : "good" },
          { label: "Saved per year", value: money(yearSaving), sub: `buying ${count(perMonth)} a month`, tone: "good" },
          { label: "Difference per " + u, value: money2(dearUnit - cheapUnit) },
        ],
        bars: {
          title: `Price per ${u}`,
          items: [
            { label: `Option A (${count(sizeA)} ${u}s)`, value: unitA, display: money2(unitA), tone: aWins ? "good" : "bad" },
            { label: `Option B (${count(sizeB)} ${u}s)`, value: unitB, display: money2(unitB), tone: aWins ? "bad" : "good" },
          ],
        },
        verdict: {
          tone: gapPct < 3 ? "neutral" : "good",
          text:
            gapPct < 3
              ? "There is almost nothing in it. Buy whichever size you will actually use before it goes off, because waste costs more than this gap."
              : `Option ${cheaper} wins. Over a year that is ${money(yearSaving)} on this one item, as long as you use it before it spoils.`,
        },
        note: "Only compare like with like. If one label is in pounds and the other in ounces, convert first: one pound is 16 ounces.",
      };
    },
  },

  {
    slug: "childcare-vs-work-calculator",
    name: "Childcare vs Work Calculator",
    short: "Childcare vs Work",
    emoji: "👶",
    category: "Money",
    tagline: "What a second income is really worth after childcare",
    description:
      "Take a salary, subtract tax, childcare, commuting and the costs that come with working, and see what is genuinely left, plus what that works out to per hour.",
    who: "Any household deciding whether a second income covers its own costs, or whether one parent stepping back actually loses money.",
    problem:
      "The salary looks like the answer, but childcare, fuel, parking, lunches and the extra convenience spending come out of it first. Most people have never done the subtraction.",
    payoff: "The real number left after the costs of working, and the effective hourly rate behind it.",
    steps: [
      "Enter the gross pay for the job in question.",
      "Add childcare for the hours actually worked.",
      "Add commuting and the extra spending that only happens because you work.",
      "Look at the effective hourly rate, then decide with the real number in front of you.",
    ],
    faqs: [
      { q: "Does this account for tax credits or childcare subsidies?", a: "No. Credits and subsidies vary by country, state and household, and this tool never guesses them. If you receive one, subtract it from the childcare figure before you enter it." },
      { q: "Is a small number a reason to stop working?", a: "That is your call, and money is only part of it. Career progression, pension contributions, health cover and getting out of the house are real and do not show up here. This tool answers one narrow question." },
      { q: "What about the long term?", a: "This is a snapshot of one year. Childcare costs fall sharply once children start school, while a career break can take years to recover from. Run it again for the year after next before deciding." },
    ],
    domain: "home-family",
    toolType: "calculator",
    goals: ["make-a-decision", "save-money"],
    industries: ["household", "personal-finance", "childcare"],
    audiences: ["parents", "caregivers", "midlife-adults", "young-adults"],
    keywords: ["childcare", "daycare cost", "second income", "worth working", "stay at home", "net pay", "cost of working", "nursery"],
    synonyms: ["is it worth working after childcare", "daycare vs staying home", "second income calculator"],
    disclaimer: "financial",
    dataSensitivity: "sensitive",
    popularity: 82,
    isNew: true,
    assumptions: [
      "Tax is applied as one flat rate. It ignores credits, allowances, filing status and local tax.",
      "Childcare subsidies and dependent care benefits are not modelled. Net them off before you enter the cost.",
      "Pension and employer contributions are not counted, and they can be worth a lot.",
    ],
    relatedSlugs: ["household-budget-planner", "salary-to-hourly-converter", "emergency-fund-calculator", "rent-affordability-estimator"],
    embedHeight: 960,
    fields: [
      { id: "salary", label: "Gross pay for this job", type: "money", def: 42000, help: "Before tax, for a full year." },
      { id: "taxRate", label: "Rough combined tax rate", type: "slider", min: 0, max: 50, step: 1, def: 22, suffix: "%" },
      { id: "childcare", label: "Childcare per month", type: "money", def: 1150, help: "After any subsidy you already receive." },
      { id: "commuteDaily", label: "Commuting cost per working day", type: "money", def: 12, help: "Fuel, parking, tolls or fares." },
      { id: "daysPerWeek", label: "Days worked per week", type: "slider", min: 1, max: 7, step: 1, def: 5 },
      { id: "weeks", label: "Weeks worked per year", type: "slider", min: 30, max: 52, step: 1, def: 48 },
      { id: "hoursPerDay", label: "Hours per working day", type: "slider", min: 2, max: 14, step: 0.5, def: 8 },
      { id: "extras", label: "Extra spending per month because you work", type: "money", def: 220, help: "Lunches, coffee, convenience food, work clothes." },
    ],
    run: (v) => {
      const salary = num(v, "salary");
      const taxRate = num(v, "taxRate") / 100;
      const childcare = num(v, "childcare") * 12;
      const daysPerWeek = num(v, "daysPerWeek");
      const weeks = num(v, "weeks");
      const workingDays = daysPerWeek * weeks;
      const commute = num(v, "commuteDaily") * workingDays;
      const extras = num(v, "extras") * 12;
      const hoursPerDay = num(v, "hoursPerDay");

      const afterTax = salary * (1 - taxRate);
      const costs = childcare + commute + extras;
      const net = afterTax - costs;

      const hours = workingDays * hoursPerDay;
      const effectiveHourly = hours > 0 ? net / hours : 0;
      const headlineHourly = hours > 0 ? afterTax / hours : 0;

      const tone = net < 0 ? "bad" : net < afterTax * 0.35 ? "warn" : "good";

      return {
        headline: {
          value: money(net),
          label: net < 0 ? "Lost per year by working" : "Actually kept per year",
          sub: `${money(net / 12)} a month`,
          tone,
        },
        explain: `The job pays ${money(salary)}, which is ${money(afterTax)} after tax. Childcare, commuting and work-related spending take ${money(costs)} of that, leaving ${money(net)}. Across ${count(hours)} hours worked, that is ${money2(effectiveHourly)} an hour in your hand, against the ${money2(headlineHourly)} an hour the salary looks like.`,
        stats: [
          { label: "After tax", value: money(afterTax) },
          { label: "Cost of working", value: money(costs), tone: "bad" },
          { label: "Effective hourly", value: money2(effectiveHourly), sub: `salary alone looks like ${money2(headlineHourly)}`, tone },
          { label: "Childcare share of net pay", value: afterTax > 0 ? pct((childcare / afterTax) * 100, 0) : "0%", tone: childcare > afterTax * 0.5 ? "bad" : "neutral" },
        ],
        bars: {
          title: "Where the salary goes",
          caption: "Annual figures.",
          items: [
            { label: "Tax", value: salary - afterTax, display: money(salary - afterTax), tone: "neutral" },
            { label: "Childcare", value: childcare, display: money(childcare), tone: "bad" },
            { label: "Commuting", value: commute, display: money(commute), tone: "bad" },
            { label: "Work-related spending", value: extras, display: money(extras), tone: "bad" },
            { label: "Kept", value: Math.max(0, net), display: money(net), tone: net < 0 ? "bad" : "good" },
          ],
        },
        verdict: {
          tone,
          text:
            net < 0
              ? `On these numbers the job costs more than it pays, by ${money(Math.abs(net))} a year. That is worth knowing, but money is only part of the decision, and childcare costs fall a lot once school starts.`
              : net < afterTax * 0.35
              ? `You keep ${money(net)}, which is under a third of the after-tax pay. Worth checking whether fewer days a week keeps most of the income and much less of the childcare.`
              : `You keep ${money(net)} a year, about ${money2(effectiveHourly)} an hour after the costs of working. The job clears its own costs comfortably.`,
        },
        note: "Pension contributions, employer benefits, health cover and career progression are not in this number, and they matter.",
      };
    },
  },

  {
    slug: "subscription-audit",
    name: "Subscription Audit",
    short: "Subscription Audit",
    emoji: "📺",
    category: "Costs",
    tagline: "Everything charging your card every month",
    description:
      "Tick what you pay for, add anything unusual, and see the monthly total, the yearly total, and what it comes to over five years once normal price rises are counted.",
    who: "Any household that has lost track of what is auto-renewing, which is most households.",
    problem:
      "Subscriptions arrive one at a time and never leave. Individually they are all small. Together they are often the second largest line in a budget after housing.",
    payoff: "The full list in one place, the yearly number, and a clear view of what is worth keeping.",
    steps: [
      "Tick everything you currently pay for.",
      "Add up anything not on the list and put the total in the last box.",
      "Look at the yearly number, then cancel the three you had forgotten about.",
    ],
    faqs: [
      { q: "How do I find what I am actually subscribed to?", a: "Check the subscriptions screen in your phone's app store, then search your bank statement for the last two months for anything recurring. Between those two you will find nearly all of it." },
      { q: "Why show a five year total?", a: "Because subscriptions are decisions you make once and pay for indefinitely, and prices rise. Seeing the multi-year number is what makes people actually cancel the ones they do not use." },
    ],
    domain: "home-family",
    toolType: "checklist",
    goals: ["save-money", "organize-information"],
    industries: ["household", "personal-finance"],
    audiences: ["parents", "young-adults", "midlife-adults", "older-adults"],
    keywords: ["subscriptions", "recurring charges", "streaming", "auto renew", "cancel", "monthly fees", "direct debits", "free trial"],
    synonyms: ["subscription tracker", "recurring payments audit", "what am I paying for"],
    disclaimer: "general-estimate",
    dataSensitivity: "personal",
    popularity: 84,
    isNew: true,
    assumptions: ["Uses typical prices for the services listed. Override the average if yours are higher or lower."],
    relatedSlugs: ["household-budget-planner", "emergency-fund-calculator", "grocery-unit-price-calculator", "rent-receipt"],
    embedHeight: 1020,
    fields: [
      { id: "services", label: "What you pay for", type: "checks", def: ["video1", "music", "phone", "cloud"], options: [
        { value: "video1", label: "Main video streaming service" },
        { value: "video2", label: "Second video streaming service" },
        { value: "video3", label: "Third video streaming service" },
        { value: "music", label: "Music streaming" },
        { value: "cloud", label: "Cloud storage or backup" },
        { value: "phone", label: "Phone extras or device insurance" },
        { value: "gym", label: "Gym or fitness app" },
        { value: "news", label: "News or magazine" },
        { value: "games", label: "Gaming service" },
        { value: "software", label: "Software or design tools" },
        { value: "delivery", label: "Delivery or shopping membership" },
        { value: "kids", label: "Kids learning or entertainment app" },
        { value: "security", label: "Home security monitoring" },
        { value: "pet", label: "Pet food or supply box" },
      ] },
      { id: "avg", label: "Average price of each", type: "slider", min: 3, max: 80, step: 1, def: 14, prefix: "$", help: "Most streaming and app subscriptions land between 10 and 20 dollars." },
      { id: "other", label: "Anything else, total per month", type: "money", def: 0 },
      { id: "unused", label: "How many you have not used this month", type: "slider", min: 0, max: 15, step: 1, def: 3 },
      { id: "increase", label: "Typical yearly price rise", type: "slider", min: 0, max: 20, step: 1, def: 7, suffix: "%" },
    ],
    run: (v) => {
      const picked = list(v, "services");
      const avg = num(v, "avg");
      const other = num(v, "other");
      const unused = Math.min(num(v, "unused"), picked.length);
      const increase = num(v, "increase") / 100;

      const monthly = picked.length * avg + other;
      const yearly = monthly * 12;
      const wasted = unused * avg;

      // Five years with the price rise compounding once a year.
      let fiveYear = 0;
      let run = yearly;
      for (let y = 0; y < 5; y++) {
        fiveYear += run;
        run *= 1 + increase;
      }

      if (monthly <= 0) {
        return { note: "Tick what you pay for above and the totals appear here." };
      }

      return {
        headline: {
          value: money(yearly),
          label: "Leaving your account every year",
          sub: `${money(monthly)} a month across ${count(picked.length)} subscriptions`,
          tone: "bad",
        },
        explain: `You listed ${count(picked.length)} subscriptions averaging ${money2(avg)} each, which is ${money(monthly)} a month. Over five years, with prices rising about ${pct(increase * 100, 0)} a year, that is ${money(fiveYear)}. The ${count(unused)} you have not opened this month account for ${money(wasted * 12)} of it a year.`,
        stats: [
          { label: "Per month", value: money(monthly), tone: "bad" },
          { label: "Unused this month", value: money(wasted * 12), sub: `${count(unused)} services, per year`, tone: "bad" },
          { label: "Over five years", value: money(fiveYear), sub: `with ${pct(increase * 100, 0)} yearly rises`, tone: "bad" },
          { label: "Saved by cancelling the unused", value: money(wasted * 12), tone: "good" },
        ],
        ramp: {
          title: "What it adds up to, year by year",
          caption: "Including normal price rises.",
          tone: "bad",
          points: Array.from({ length: 5 }, (_, i) => {
            let total = 0;
            let r = yearly;
            for (let y = 0; y <= i; y++) { total += r; r *= 1 + increase; }
            return { label: `Year ${i + 1}`, value: total, display: money(total) };
          }),
        },
        csv: {
          filename: "subscription-audit.csv",
          headers: ["Item", "Monthly", "Yearly"],
          rows: [
            ...picked.map((p) => [p, money2(avg), money2(avg * 12)]),
            ["Other", money2(other), money2(other * 12)],
            ["Total", money2(monthly), money2(yearly)],
          ],
        },
        verdict: {
          tone: unused > 0 ? "bad" : "warn",
          text:
            unused > 0
              ? `Cancel the ${count(unused)} you have not opened this month and you keep ${money(wasted * 12)} a year without changing anything you actually use.`
              : `You are using all of them, which is rare. Set a reminder to run this again in six months, because the list only ever grows.`,
        },
        note: "Check your app store subscriptions screen and two months of bank statements. That finds nearly all of them.",
      };
    },
  },

  {
    slug: "emergency-fund-calculator",
    name: "Emergency Fund Calculator",
    short: "Emergency Fund",
    emoji: "🛟",
    category: "Money",
    tagline: "How much cushion you need, and when you will have it",
    description:
      "Work out how many months of essential spending you could cover today, what your target should be, and how long it takes to get there at what you can actually save.",
    who: "Anyone without a cash cushion, or anyone who has one and has never checked whether it is the right size.",
    problem:
      "One car repair, one broken boiler or one month out of work turns into card debt that takes a year to clear, because there was nothing set aside for it.",
    payoff: "A target figure, the gap to it, and a realistic date you will reach it.",
    steps: [
      "Add up what you must pay every month even if income stopped: housing, utilities, food, transport, insurance, minimum debt payments.",
      "Pick how many months you want covered. Three is the usual starting point.",
      "Enter what you have saved and what you can put aside each month.",
    ],
    faqs: [
      { q: "How many months should I aim for?", a: "Three months of essentials is the usual starting target. Six is safer if your income is variable, you are self employed, or you are the only earner. There is no single right answer." },
      { q: "Should I build this before paying off debt?", a: "Most guidance says get a small buffer first, around one month, then attack high-interest debt, then come back and finish the fund. Without any buffer, the next surprise goes straight back on the card." },
      { q: "Where should the money sit?", a: "Somewhere you can reach within a day or two and where the balance does not move: a separate savings account. Not invested, and not in the account you spend from." },
    ],
    domain: "home-family",
    toolType: "calculator",
    goals: ["save-money", "plan-a-project", "safety-readiness"],
    industries: ["household", "personal-finance"],
    audiences: ["young-adults", "midlife-adults", "older-adults", "parents", "freelancers"],
    keywords: ["emergency fund", "rainy day", "savings target", "months of expenses", "cash cushion", "safety net", "3 months savings"],
    synonyms: ["rainy day fund calculator", "savings buffer calculator"],
    disclaimer: "financial",
    dataSensitivity: "sensitive",
    popularity: 86,
    isNew: true,
    assumptions: [
      "Counts essential spending only. A fund sized to your full lifestyle takes far longer and is not what this is for.",
      "Interest on the savings is ignored, which makes the timeline slightly conservative.",
    ],
    relatedSlugs: ["household-budget-planner", "debt-payoff-planner", "subscription-audit", "rent-affordability-estimator"],
    embedHeight: 900,
    fields: [
      { id: "essentials", label: "Essential spending per month", type: "money", def: 2800, help: "Only what you would still have to pay if income stopped." },
      { id: "months", label: "Months you want covered", type: "slider", min: 1, max: 12, step: 1, def: 3 },
      { id: "saved", label: "Saved so far", type: "money", def: 1500 },
      { id: "monthly", label: "What you can put aside each month", type: "money", def: 250 },
    ],
    run: (v) => {
      const essentials = num(v, "essentials");
      const months = num(v, "months");
      const saved = num(v, "saved");
      const monthly = num(v, "monthly");

      const target = essentials * months;
      const gap = Math.max(0, target - saved);
      const covered = essentials > 0 ? saved / essentials : 0;
      const monthsToGo = monthly > 0 ? Math.ceil(gap / monthly) : Infinity;
      const done = gap <= 0;

      const tone = done ? "good" : covered >= 1 ? "warn" : "bad";

      return {
        headline: {
          value: done ? money(saved) : money(gap),
          label: done ? "You are there" : "Still to save",
          sub: `Target is ${money(target)}, which is ${count(months)} months of essentials`,
          tone,
        },
        explain: done
          ? `You have ${money(saved)} set aside, which covers ${dec(covered, 1)} months of essential spending. That is at or past your ${count(months)} month target.`
          : `You have ${money(saved)}, which covers ${dec(covered, 1)} months of essential spending. To reach ${count(months)} months you need ${money(target)}, so there is ${money(gap)} to go. At ${money(monthly)} a month that takes ${Number.isFinite(monthsToGo) ? `${count(monthsToGo)} months` : "an indefinite time, because nothing is going in"}.`,
        stats: [
          { label: "Covered right now", value: `${dec(covered, 1)} months`, tone },
          { label: "Target", value: money(target) },
          { label: "Months to target", value: Number.isFinite(monthsToGo) ? count(monthsToGo) : "Not on this plan", tone: Number.isFinite(monthsToGo) ? "neutral" : "bad" },
          { label: "One month of essentials", value: money(essentials) },
        ],
        bars: {
          title: "Progress to target",
          items: [
            { label: "Saved", value: Math.min(saved, target), display: money(saved), tone: "good" },
            { label: "Still needed", value: gap, display: money(gap), tone: gap > 0 ? "bad" : "good" },
          ],
        },
        verdict: {
          tone,
          text: done
            ? "This is the boring part of a financial plan that quietly prevents most debt. Leave it somewhere you can reach in a day and do not invest it."
            : monthly <= 0
            ? "Nothing is going in at the moment, so this target never arrives. Even 25 dollars a month started this week beats a bigger number that starts later."
            : `At ${money(monthly)} a month you get there in ${count(monthsToGo)} months. Set it to move automatically the day you get paid, before you can spend it.`,
        },
        note: "Everything here stays in your browser and is never sent anywhere.",
      };
    },
  },

  {
    slug: "debt-payoff-planner",
    name: "Debt Payoff Planner",
    short: "Debt Payoff",
    emoji: "💳",
    category: "Money",
    tagline: "What paying a little extra actually does",
    description:
      "Enter a balance, the interest rate and what you pay each month, and see how long it takes, what the interest costs you, and how much sooner it clears if you add a little more.",
    who: "Anyone carrying a card balance, a personal loan or a store card and wondering whether paying extra is worth it.",
    problem:
      "Minimum payments are designed to keep a balance alive for years. The statement never shows you the total interest, so the real cost of paying the minimum stays invisible.",
    payoff: "The payoff date, the total interest, and exactly what an extra payment each month saves you.",
    steps: [
      "Enter the balance and the interest rate from your statement.",
      "Enter what you currently pay each month.",
      "Move the extra payment slider and watch the payoff date and interest fall.",
    ],
    faqs: [
      { q: "Is APR the same as the interest rate?", a: "For a card, close enough for this purpose. This applies the rate as monthly compound interest, which is how card interest usually works. Fees and cash advance rates are not modelled." },
      { q: "Should I pay the smallest balance or the highest rate first?", a: "Highest rate first costs you the least money. Smallest balance first gives you a win sooner and some people stick with it better. Both work, and the one you actually keep doing is the right one." },
      { q: "What if my payment does not cover the interest?", a: "Then the balance grows and it never clears. The tool tells you when that is happening, which is the point at which the debt needs restructuring rather than budgeting." },
    ],
    domain: "home-family",
    toolType: "planner",
    goals: ["save-money", "plan-a-project", "make-a-decision"],
    industries: ["household", "personal-finance"],
    audiences: ["young-adults", "midlife-adults", "parents", "older-adults"],
    keywords: ["debt payoff", "credit card interest", "snowball", "avalanche", "minimum payment", "apr", "how long to pay off", "extra payment"],
    synonyms: ["credit card payoff calculator", "how long to pay off my debt", "debt snowball calculator"],
    disclaimer: "financial",
    dataSensitivity: "sensitive",
    popularity: 87,
    isNew: true,
    assumptions: [
      "Interest compounds monthly at the annual rate divided by twelve.",
      "The balance is fixed. Anything you put on the card after today is not counted.",
      "Fees, promotional rates and cash advance rates are not modelled.",
    ],
    relatedSlugs: ["household-budget-planner", "emergency-fund-calculator", "loan-payment-calculator", "subscription-audit"],
    embedHeight: 960,
    fields: [
      { id: "balance", label: "Balance owed", type: "money", def: 6500 },
      { id: "apr", label: "Interest rate", type: "slider", min: 0, max: 36, step: 0.25, def: 22.9, suffix: "%" },
      { id: "payment", label: "What you pay each month", type: "money", def: 200 },
      { id: "extra", label: "Extra you could add each month", type: "money", def: 50 },
    ],
    run: (v) => {
      const balance = num(v, "balance");
      const monthlyRate = num(v, "apr") / 100 / 12;
      const payment = num(v, "payment");
      const extra = num(v, "extra");

      if (balance <= 0) return { note: "Enter a balance above zero and the payoff plan appears here." };

      /** Amortize month by month. Returns null when the payment never clears it. */
      const payoff = (pay: number) => {
        if (pay <= 0) return null;
        let bal = balance;
        let interest = 0;
        for (let m = 1; m <= 600; m++) {
          const charge = bal * monthlyRate;
          // A payment that does not cover the interest means the balance grows.
          if (pay <= charge && monthlyRate > 0) return null;
          interest += charge;
          bal = bal + charge - pay;
          if (bal <= 0) return { months: m, interest: interest + Math.min(0, bal) };
        }
        return null;
      };

      const base = payoff(payment);
      const faster = payoff(payment + extra);

      if (!base) {
        const minimum = balance * monthlyRate;
        return {
          headline: { value: "It never clears", label: "At this payment the balance grows", tone: "bad" },
          explain: `Interest on ${money(balance)} at ${pct(num(v, "apr"), 2)} is about ${money2(minimum)} in the first month alone. A payment of ${money(payment)} does not cover that, so the balance goes up every month rather than down.`,
          stats: [
            { label: "Interest charged month one", value: money2(minimum), tone: "bad" },
            { label: "Minimum to stand still", value: money2(minimum), tone: "bad" },
            { label: "Your payment", value: money(payment), tone: "bad" },
          ],
          verdict: {
            tone: "bad",
            text: "This is the point where budgeting stops being the answer. A balance transfer, a consolidation loan or a call to a non-profit debt advice service is the next step.",
          },
          note: "Nothing you type here is sent anywhere.",
        };
      }

      const years = base.months / 12;
      const savedMonths = faster ? base.months - faster.months : 0;
      const savedInterest = faster ? base.interest - faster.interest : 0;

      return {
        headline: {
          value: base.months >= 12 ? `${dec(years, 1)} years` : `${count(base.months)} months`,
          label: "Until it is paid off",
          sub: `${money(base.interest)} of interest along the way`,
          tone: base.months > 60 ? "bad" : base.months > 24 ? "warn" : "good",
        },
        explain: `Paying ${money(payment)} a month clears ${money(balance)} in ${count(base.months)} months, and costs ${money(base.interest)} in interest on the way. ${extra > 0 && faster ? `Adding ${money(extra)} a month clears it in ${count(faster.months)} months instead, which is ${count(savedMonths)} months sooner and ${money(savedInterest)} less interest.` : "Move the extra payment slider to see what a little more does."}`,
        stats: [
          { label: "Total interest", value: money(base.interest), tone: "bad" },
          { label: "Total repaid", value: money(balance + base.interest) },
          ...(faster
            ? [
                { label: "With the extra payment", value: `${count(faster.months)} months`, sub: `${count(savedMonths)} months sooner`, tone: "good" as const },
                { label: "Interest saved", value: money(savedInterest), tone: "good" as const },
              ]
            : []),
        ],
        bars: {
          title: "Interest paid",
          caption: "The same balance, two payment plans.",
          items: [
            { label: `Paying ${money(payment)}`, value: base.interest, display: money(base.interest), tone: "bad" },
            ...(faster ? [{ label: `Paying ${money(payment + extra)}`, value: faster.interest, display: money(faster.interest), tone: "good" as const }] : []),
          ],
        },
        verdict: {
          tone: savedInterest > 0 ? "good" : "warn",
          text:
            savedInterest > 0
              ? `An extra ${money(extra)} a month, which is ${money(extra * 12)} a year, takes ${count(savedMonths)} months off this and saves ${money(savedInterest)} in interest. That is the highest guaranteed return available to most households.`
              : `Even a small extra payment moves this a long way, because every dollar above the minimum comes straight off the balance rather than the interest.`,
        },
        note: "Nothing you type here is sent anywhere. Print or download this to keep it.",
      };
    },
  },

  {
    slug: "rent-affordability-estimator",
    name: "Rent Affordability Estimator",
    short: "Rent Affordability",
    emoji: "🔑",
    category: "Money",
    tagline: "What you can actually carry, not what you will be approved for",
    description:
      "Check a rent figure against your income and your existing commitments, and see the share of your pay it takes once utilities and the rest of the bills are in.",
    who: "Anyone renting for the first time, moving, or working out whether a place is a stretch.",
    problem:
      "Landlords approve on gross income, which ignores the loan payment, the car and everything else. Plenty of approved rents are unaffordable in practice.",
    payoff: "The share of your take-home the place really takes, and what is left afterwards.",
    steps: [
      "Enter your take-home pay, not your gross salary.",
      "Enter the rent and the utilities that come with it.",
      "Add the loan, card and car payments you already have.",
    ],
    faqs: [
      { q: "Where does the 30 percent rule come from?", a: "It is a long-standing rule of thumb that housing should be under about 30 percent of income. It is a guideline, not a rule, and in many cities it stopped being realistic some time ago." },
      { q: "Gross or take-home?", a: "This tool uses take-home, because that is the money that actually pays the rent. Landlords and letting agents usually assess on gross, which is why their number and this one differ." },
    ],
    domain: "home-family",
    toolType: "estimator",
    goals: ["make-a-decision", "save-money", "plan-a-project"],
    industries: ["household", "personal-finance", "real-estate"],
    audiences: ["young-adults", "parents", "midlife-adults", "students"],
    keywords: ["rent affordability", "how much rent can I afford", "30 percent rule", "rent to income", "first apartment", "moving out", "housing costs"],
    synonyms: ["how much rent can I afford", "rent to income calculator"],
    disclaimer: "financial",
    dataSensitivity: "sensitive",
    popularity: 80,
    isNew: true,
    assumptions: ["Uses take-home pay. Letting agents usually assess against gross income, so their figure will be higher."],
    relatedSlugs: ["household-budget-planner", "emergency-fund-calculator", "salary-to-hourly-converter", "debt-payoff-planner"],
    embedHeight: 900,
    fields: [
      { id: "income", label: "Household take-home per month", type: "money", def: 3600 },
      { id: "rent", label: "Rent per month", type: "money", def: 1250 },
      { id: "utilities", label: "Utilities not included in rent", type: "money", def: 220 },
      { id: "debts", label: "Loan, card and car payments per month", type: "money", def: 420 },
      { id: "other", label: "Everything else you must pay", type: "money", def: 900 },
    ],
    run: (v) => {
      const income = num(v, "income");
      const rent = num(v, "rent");
      const utilities = num(v, "utilities");
      const debts = num(v, "debts");
      const other = num(v, "other");

      if (income <= 0) return { note: "Enter your take-home pay above and the estimate appears here." };

      const housing = rent + utilities;
      const housingShare = (housing / income) * 100;
      const rentShare = (rent / income) * 100;
      const left = income - housing - debts - other;
      const thirty = income * 0.3;

      const tone = housingShare > 40 ? "bad" : housingShare > 33 ? "warn" : "good";

      return {
        headline: {
          value: pct(housingShare, 0),
          label: "Of your take-home pay goes on housing",
          sub: `${money(housing)} of ${money(income)} a month`,
          tone,
        },
        explain: `Rent and utilities come to ${money(housing)} a month, which is ${pct(housingShare, 0)} of your take-home pay. After housing, your existing payments and everything else, ${money(left)} is left over each month. A rent of about ${money(thirty - utilities)} would put housing at the 30 percent guideline.`,
        stats: [
          { label: "Rent alone", value: pct(rentShare, 0), sub: "share of take-home" },
          { label: "Left after everything", value: money(left), tone: left < 0 ? "bad" : left < income * 0.1 ? "warn" : "good" },
          { label: "Rent at the 30 percent guideline", value: money(Math.max(0, thirty - utilities)), sub: "with your utilities" },
          { label: "Difference from that guideline", value: money(rent - Math.max(0, thirty - utilities)), tone: rent > thirty - utilities ? "warn" : "good" },
        ],
        bars: {
          title: "Where the month goes",
          items: [
            { label: "Housing", value: housing, display: money(housing), tone },
            { label: "Existing payments", value: debts, display: money(debts), tone: "neutral" },
            { label: "Everything else", value: other, display: money(other), tone: "neutral" },
            { label: "Left over", value: Math.max(0, left), display: money(left), tone: left < 0 ? "bad" : "good" },
          ],
        },
        verdict: {
          tone,
          text:
            left < 0
              ? `On these numbers the month does not close, by ${money(Math.abs(left))}. This rent needs to come down, or something else does.`
              : housingShare > 40
              ? `Over 40 percent of take-home on housing leaves very little room for anything going wrong. It is doable, but it is tight, and there is no cushion in it.`
              : housingShare > 33
              ? `A bit above the usual guideline. Workable if the rest of your costs are low and you have savings behind you.`
              : `Comfortably inside the usual guideline, with ${money(left)} a month left after everything you listed.`,
        },
        note: "Nothing you type is sent anywhere. Take-home pay, not gross, is the honest basis for this.",
      };
    },
  },

  {
    slug: "salary-to-hourly-converter",
    name: "Salary to Hourly Converter",
    short: "Salary to Hourly",
    emoji: "⏱️",
    category: "Money",
    tagline: "What a salary is really worth per hour",
    description:
      "Turn an annual salary into a real hourly figure using the hours you actually work, then compare two offers where one pays more but takes far more of your week.",
    who: "Anyone comparing job offers, moving between salaried and hourly work, or wondering what those extra hours are costing.",
    problem:
      "A salary hides the hours. Two jobs paying the same can be ten dollars an hour apart once you count what the week actually looks like.",
    payoff: "A real hourly rate you can compare like for like, including unpaid overtime.",
    steps: [
      "Enter the salary and the hours you genuinely work in a normal week.",
      "Set the paid time off, since that raises the effective rate.",
      "Add any unpaid extra hours. That is where the number usually moves.",
    ],
    faqs: [
      { q: "Should I count my lunch break?", a: "Only if it is unpaid and you are free to leave. If you eat at your desk answering messages, that is working time and it belongs in the number." },
      { q: "Why does paid time off raise the hourly rate?", a: "Because you are paid for weeks you do not work, so the same salary is spread over fewer worked hours. More paid leave means a higher effective rate." },
    ],
    domain: "education-career",
    toolType: "converter",
    goals: ["make-a-decision", "price-a-service"],
    industries: ["household", "personal-finance", "staffing"],
    audiences: ["young-adults", "job-seekers", "midlife-adults", "freelancers", "parents"],
    keywords: ["salary to hourly", "hourly rate", "annual salary", "job offer", "unpaid overtime", "what am I paid per hour", "compare offers"],
    synonyms: ["annual salary to hourly rate", "what is my hourly rate", "job offer comparison"],
    disclaimer: "financial",
    dataSensitivity: "personal",
    popularity: 81,
    isNew: true,
    assumptions: ["Uses gross salary. Tax, pension and benefits are not included, and benefits can be worth a large share of a package."],
    relatedSlugs: ["childcare-vs-work-calculator", "household-budget-planner", "owner-hourly-worth", "rent-affordability-estimator"],
    embedHeight: 880,
    fields: [
      { id: "salary", label: "Annual salary", type: "money", def: 58000 },
      { id: "hours", label: "Hours you are contracted for each week", type: "slider", min: 4, max: 80, step: 1, def: 40 },
      { id: "extra", label: "Unpaid extra hours a week", type: "slider", min: 0, max: 40, step: 1, def: 5 },
      { id: "pto", label: "Paid days off a year", type: "slider", min: 0, max: 45, step: 1, def: 15, help: "Holiday plus public holidays." },
      { id: "compareSalary", label: "Another offer to compare", type: "money", def: 66000 },
      { id: "compareHours", label: "Hours a week on that one", type: "slider", min: 4, max: 80, step: 1, def: 50 },
    ],
    run: (v) => {
      const salary = num(v, "salary");
      const hours = num(v, "hours");
      const extra = num(v, "extra");
      const pto = num(v, "pto");

      const workedWeeks = Math.max(1, 52 - pto / 5);
      const contractedHours = hours * workedWeeks;
      const realHours = (hours + extra) * workedWeeks;

      const onPaper = contractedHours > 0 ? salary / contractedHours : 0;
      const real = realHours > 0 ? salary / realHours : 0;

      const cSalary = num(v, "compareSalary");
      const cHours = num(v, "compareHours");
      const cReal = cHours > 0 ? cSalary / (cHours * workedWeeks) : 0;

      const better = real >= cReal;

      return {
        headline: {
          value: money2(real),
          label: "What you actually earn per hour",
          sub: extra > 0 ? `${money2(onPaper)} on paper, before the ${count(extra)} unpaid hours a week` : `across ${count(Math.round(realHours))} hours a year`,
          tone: extra > 0 ? "warn" : "neutral",
        },
        explain: `A ${money(salary)} salary across ${count(hours)} contracted hours a week is ${money2(onPaper)} an hour. Once the ${count(extra)} unpaid extra hours a week are counted, it is ${money2(real)} an hour, a difference of ${money2(onPaper - real)}. The other offer at ${money(cSalary)} for ${count(cHours)} hours works out at ${money2(cReal)} an hour, so ${better ? "your current figure is the better hourly rate" : "the other offer pays more per hour despite the longer week"}.`,
        stats: [
          { label: "On paper", value: money2(onPaper) },
          { label: "Actually", value: money2(real), tone: extra > 0 ? "warn" : "good" },
          { label: "The other offer", value: money2(cReal), sub: `${money(cSalary)} for ${count(cHours)} hours`, tone: better ? "bad" : "good" },
          { label: "Unpaid hours a year", value: count(extra * workedWeeks), sub: extra > 0 ? `worth ${money(extra * workedWeeks * onPaper)} at your paper rate` : "none", tone: extra > 0 ? "bad" : "good" },
        ],
        bars: {
          title: "Real hourly rate",
          caption: "Both figures include the hours actually worked.",
          items: [
            { label: "This job", value: real, display: money2(real), tone: better ? "good" : "bad" },
            { label: "The other offer", value: cReal, display: money2(cReal), tone: better ? "bad" : "good" },
          ],
        },
        verdict: {
          tone: better ? "good" : "warn",
          text: better
            ? `Your current rate of ${money2(real)} an hour beats the other offer's ${money2(cReal)}, even though the headline salary is lower. Salary alone would have told you the opposite.`
            : `The other offer is ${money2(cReal - real)} an hour better even after the longer week. Worth checking what the extra hours cost you outside work before you decide.`,
        },
        note: "Gross figures only. Pension, health cover and benefits can be worth a large part of a package and are not counted here.",
      };
    },
  },
];

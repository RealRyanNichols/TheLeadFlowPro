// Rate Card Kit.
//
// The free hourly rate calculator tells an owner what their hour actually has
// to be worth. This carries that number the rest of the way: every service
// priced from the real rate, a customer-facing rate card with no math on it,
// the internal worksheet with all the math on it, the price increase letter
// in three forms, and a dated rollout with the reminders already written.

import {
  brandOf, count, money, money2, num, pct, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import {
  addDays, bigNumbers, bullets, callout, csvDoc, heading, icsDoc, longDate, MADE_WITH,
  nextBusinessDay, numbered, pLead, paragraph, printDoc, printDocument, resolveBrand,
  REVIEW_BEFORE_SENDING, scriptBlock, table, textDoc,
} from "../docs";

/* -------------------------------- services -------------------------------- */

export type ServiceLine = {
  name: string;
  hours: number;
  materials: number;
};

/** One per line: "Service name | hours | materials cost". Materials optional. */
export function parseServices(text: string): { services: ServiceLine[]; bad: string[] } {
  const services: ServiceLine[] = [];
  const bad: string[] = [];
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|").map((p) => p.trim());
    const name = parts[0]?.slice(0, 160) ?? "";
    const hours = Number((parts[1] ?? "").replace(/[^\d.]/g, ""));
    const materials = parts.length > 2 ? Number((parts[2] ?? "0").replace(/[$,\s]/g, "")) : 0;
    if (name && Number.isFinite(hours) && hours > 0 && hours <= 2000 && Number.isFinite(materials) && materials >= 0) {
      services.push({ name, hours, materials: Math.min(materials, 1_000_000) });
    } else {
      bad.push(trimmed.slice(0, 120));
    }
  }
  return { services: services.slice(0, 40), bad: bad.slice(0, 20) };
}

/** Prices land on retail-shaped numbers: nearest 5 dollars, never below cost. */
export const roundPrice = (n: number) => Math.max(5, Math.round(n / 5) * 5);

const EXAMPLE_SERVICES = [
  "Service call and diagnosis | 1.5",
  "Water heater replacement | 4 | 780",
  "Whole house repipe, per day | 8 | 1400",
  "Annual maintenance visit | 2 | 60",
].join("\n");

/* ---------------------------------- fields --------------------------------- */

const FIELDS: ProToolDef["fields"] = [
  { id: "take", label: "What you want to take home a year", type: "money", def: 90000, section: "Your real costs" },
  { id: "overhead", label: "Yearly overhead", type: "money", def: 24000, section: "Your real costs", help: "Insurance, truck, tools, software, rent, the phone plan. All of it." },
  { id: "weeks", label: "Weeks you actually work", type: "slider", min: 30, max: 52, step: 1, def: 48, section: "Your real costs" },
  { id: "hours", label: "Hours you work a week", type: "slider", min: 10, max: 80, step: 1, def: 50, section: "Your real costs" },
  {
    id: "billable", label: "Percent of those hours you can bill", type: "slider", min: 20, max: 100, step: 5, def: 60, suffix: "%", section: "Your real costs",
    help: "Driving, quoting, invoicing and phone tag are not billable.",
  },
  { id: "tax", label: "Set aside for taxes", type: "slider", min: 0, max: 45, step: 1, def: 25, suffix: "%", section: "Your real costs" },
  { id: "current", label: "What you charge now per hour", type: "money", def: 75, section: "Your real costs" },
  {
    id: "services", label: "Your services", type: "textarea", def: EXAMPLE_SERVICES, rows: 6, section: "Your services",
    help: "One per line: service name | hours it takes | materials cost. Materials are optional.",
  },
  {
    id: "matMarkup", label: "Markup on materials", type: "slider", min: 0, max: 60, step: 5, def: 15, suffix: "%", section: "Your services",
    help: "Handling, returns and the run to the supply house are not free.",
  },
  {
    id: "churn", label: "Customers you expect to lose at the new rates", type: "slider", min: 0, max: 60, step: 1, def: 10, suffix: "%", section: "The increase",
    help: "Be pessimistic here. The worksheet shows how much loss the increase can absorb.",
  },
  {
    id: "effectiveDate", label: "New rates take effect", type: "text", def: "", section: "The increase",
    placeholder: "2026-11-01", help: "YYYY-MM-DD. Blank sets it 60 days out, which is the courteous window.",
  },
];

/* ----------------------------------- run ----------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const take = num(v, "take", 90000);
  const overhead = num(v, "overhead", 24000);
  const weeks = Math.max(1, num(v, "weeks", 48));
  const hoursWk = Math.max(1, num(v, "hours", 50));
  const billable = Math.max(0.01, num(v, "billable", 60) / 100);
  const tax = Math.min(0.9, num(v, "tax", 25) / 100);
  const current = num(v, "current", 75);
  const { services, bad } = parseServices(str(v, "services"));
  const matMarkup = Math.max(0, num(v, "matMarkup", 15)) / 100;
  const churn = Math.max(0, num(v, "churn", 10)) / 100;

  // The same derivation as the free hourly rate calculator.
  const grossNeeded = take / (1 - tax) + overhead;
  const billableHours = weeks * hoursWk * billable;
  const rate = grossNeeded / billableHours;
  const gap = rate - current;
  const increasePct = current > 0 ? gap / current : 0;

  // Revenue holds as long as the share of customers lost stays under
  // inc / (1 + inc). Stated as revenue math on purpose: no per-customer cost
  // guesswork, just the honest arithmetic of price times volume.
  const breakEvenChurn = increasePct > 0 ? increasePct / (1 + increasePct) : 0;
  const revenueChange = increasePct > 0 ? (1 + increasePct) * (1 - churn) - 1 : 0;

  // Shape AND range checked, like every other kit's date field: "2026-13-05"
  // matches the ISO shape and would otherwise print "undefined 5, 2026" onto
  // the customer letter.
  const effectiveRaw = str(v, "effectiveDate").trim();
  const today = new Date().toISOString().slice(0, 10);
  const validDate = (raw: string) => {
    if (!ISO.test(raw)) return false;
    const [y, m, d] = raw.split("-").map(Number);
    return y >= 1970 && y <= 2999 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  };
  const effective = validDate(effectiveRaw) ? effectiveRaw : addDays(today, 60);
  const notice60 = nextBusinessDay(addDays(effective, -60));
  const notice30 = nextBusinessDay(addDays(effective, -30));
  const checkIn = nextBusinessDay(addDays(effective, 30));

  const priced = services.map((s) => ({
    ...s,
    price: roundPrice(s.hours * rate + s.materials * (1 + matMarkup)),
    oldPrice: roundPrice(s.hours * current + s.materials * (1 + matMarkup)),
  }));

  /* ------------------------------- documents ------------------------------- */

  const rateCard = printDocument(
    brand,
    `Rate card, ${brand.name}`,
    [
      {
        eyebrow: `Effective ${longDate(effective)}`,
        title: "Our services and rates",
        html:
          (priced.length
            ? table(
                ["Service", "Price"],
                priced.map((s) => [s.name, s.materials > 0 ? `${money(s.price)}, materials included` : money(s.price)]),
                { numeric: [1] },
              )
            : callout("No services listed yet", "Add your services in the kit and this card fills itself in.")) +
          paragraph(
            "Prices cover the listed work performed to our standard. Anything unusual gets a written price before we start, never a surprise after.",
          ) +
          (brand.phone || brand.site
            ? paragraph(`Book: ${[brand.phone, brand.site].filter(Boolean).join(" · ")}`)
            : ""),
      },
    ],
    { footNote: MADE_WITH },
  );

  const worksheet = printDocument(
    brand,
    `Pricing worksheet, ${brand.name}`,
    [
      {
        eyebrow: "Internal only",
        title: "Where the rate comes from",
        html:
          pLead(
            `To take home ${money(take)} after a ${pct(tax * 100, 0)} tax set aside, with ${money(overhead)} of overhead, across ${count(billableHours)} billable hours a year, the hour has to bill ${money2(rate)}.`,
          ) +
          bigNumbers([
            { value: money2(rate), label: "What your hour must bill" },
            { value: money2(current), label: "What you charge now" },
            {
              value: gap > 0 ? money(gap * billableHours) : money(0),
              label: gap > 0 ? "Left behind per year at the old rate" : "You are at or above the required rate",
            },
          ]) +
          table(
            ["Line", "Value"],
            [
              ["Take home target", money(take)],
              [`Grossed up for ${pct(tax * 100, 0)} taxes`, money(take / (1 - tax))],
              ["Plus overhead", money(grossNeeded)],
              [`Hours worked (${count(weeks)} weeks × ${count(hoursWk)})`, count(weeks * hoursWk)],
              [`Billable at ${pct(billable * 100, 0)}`, count(billableHours)],
              ["Required rate", money2(rate)],
            ],
            { numeric: [1], totalRow: true },
          ) +
          heading("Every service, priced from the real rate") +
          (priced.length
            ? table(
                ["Service", "Hours", "Materials", "Old price", "New price", "Change"],
                priced.map((s) => [
                  s.name,
                  String(s.hours),
                  s.materials ? money(s.materials) : "",
                  money(s.oldPrice),
                  money(s.price),
                  s.price !== s.oldPrice ? money(s.price - s.oldPrice) : "none",
                ]),
                { numeric: [1, 2, 3, 4, 5] },
              )
            : paragraph("Add services in the kit and each gets priced from the rate above.")) +
          (bad.length
            ? callout("Lines the kit could not read", `Check the format (service | hours | materials): ${bad.join(" · ")}`)
            : "") +
          heading("How much customer loss the increase can absorb") +
          paragraph(
            increasePct > 0
              ? `A ${pct(increasePct * 100, 1)} increase keeps revenue level even if ${pct(breakEvenChurn * 100, 1)} of customers walk. You planned for ${pct(churn * 100, 0)} walking, which puts revenue ${revenueChange >= 0 ? "up" : "down"} ${pct(Math.abs(revenueChange) * 100, 1)}. Fewer customers at the right rate also means fewer hours for the same money.`
              : "Your current rate already meets the requirement, so this page is a check, not a push. Revisit it when overhead moves.",
          ) +
          heading("What this assumed") +
          bullets([
            "Materials carry your markup and hours carry the required rate; prices round to the nearest five dollars and never below.",
            "The loss tolerance is revenue arithmetic, not a prediction of who leaves. Nothing here guarantees retention or income.",
            "Overhead and billable share are yours to keep honest; the rate is only as real as they are.",
          ]),
      },
    ],
    { footNote: MADE_WITH },
  );

  const letterBody = (formal: boolean) =>
    [
      formal ? `Dear [First name],` : `Hi [First name],`,
      "",
      `Thank you for trusting ${brand.name} with your work${brand.city ? ` here in ${brand.city}` : ""}. You have a right to hear this from us directly rather than notice it on an invoice: effective ${longDate(effective)}, our rates are changing.`,
      "",
      `Costs for insurance, materials and keeping good people have risen, and holding our prices flat would eventually mean cutting corners on the work itself. We will not do that.`,
      "",
      `What stays the same matters more: the same people, the same standard, and a written price before any work that was not on the card. Any job already quoted is honored at its quoted price${increasePct > 0 ? `, and nothing changes before ${longDate(effective)}` : ""}.`,
      "",
      `The new rate card is attached. If anything on it raises a question, call ${brand.phone || "us"} and you will get a straight answer.`,
      "",
      formal ? `With appreciation for your business,` : `Thank you, genuinely, for your business.`,
      "",
      `${brand.name}${brand.phone ? `\n${brand.phone}` : ""}`,
    ].join("\n");

  const letters = [
    `=== THE LETTER (print or attach) ===\n\n${letterBody(true)}`,
    `=== THE EMAIL ===\nSubject: A change to our rates, effective ${longDate(effective)}\n\n${letterBody(false)}`,
    `=== THE TEXT (existing customers who book by phone) ===\n\n[First name], it is ${brand.name}. Quick heads up rather than a surprise on an invoice: our rates change on ${longDate(effective)}. Anything already quoted stays at its quoted price. Happy to talk it through any time.`,
    `=== SAID OUT LOUD, WHEN THEY ASK WHY ===\n\n"Our costs went up and we decided to raise prices instead of cutting corners. Everything already quoted stays as quoted."\n\nSay it once, plainly, without apologizing twice. Customers respect a straight answer far more than a nervous one.`,
    `=== FOR YOUR STAFF ===\n\nThe rule when somebody pushes back: never argue, never apologize twice, never invent a discount on the spot. Say the line above, offer to have the owner call them, and write the conversation down.`,
  ].join("\n\n\n");

  const documents: ToolDocument[] = [
    printDoc(
      "ratecard",
      "Customer rate card",
      "The card customers see: services and prices in your brand, with none of the math on it.",
      "rate-card.html",
      rateCard,
    ),
    printDoc(
      "worksheet",
      "Internal pricing worksheet",
      "The rate derivation, every service old and new, and how much customer loss the increase can absorb. Never leaves the office.",
      "pricing-worksheet.html",
      worksheet,
    ),
    textDoc(
      "letters",
      "The increase, four ways",
      "The letter, the email, the text and the said-out-loud line, plus the staff rule for pushback.",
      "price-increase-letters.txt",
      letters,
    ),
    csvDoc(
      "services",
      "Service price list",
      "Every service with hours, materials, old price and new price, for your records.",
      "service-prices.csv",
      ["service", "hours", "materials_cost", "old_price", "new_price"],
      priced.map((s) => [s.name, s.hours, s.materials, s.oldPrice, s.price]),
    ),
    icsDoc(
      "rollout",
      "Rollout reminders",
      "Sixty day notice, thirty day notice, the effective date, and a thirty day check-in, each carrying its message.",
      "price-rollout.ics",
      [
        { date: notice60, time: "09:00", minutes: 20, title: `${brand.name}: send the rate change letter (60 days out)`, description: "Send the letter and the email versions today. Everything already quoted stays at its quoted price." },
        { date: notice30, time: "09:00", minutes: 15, title: `${brand.name}: 30 day reminder to regulars`, description: "Text the regulars who book by phone. The message is in the letters file." },
        { date: effective, time: "08:00", minutes: 10, title: `${brand.name}: new rates live today`, description: "Update the rate card everywhere it is posted. Invoices from today use the new prices." },
        { date: checkIn, time: "09:00", minutes: 20, title: `${brand.name}: rate change check-in`, description: "Count: customers lost, revenue change, pushback heard. Compare against the worksheet's tolerance line." },
      ],
      `${brand.name} rate change`,
    ),
  ];

  return {
    headline: {
      value: money2(rate),
      label: "What your hour actually has to bill",
      sub:
        gap > 0
          ? `${money2(gap)} above what you charge now, ${money(gap * billableHours)} a year left behind`
          : "your current rate meets the requirement",
      tone: gap > 0 ? "warn" : "good",
    },
    explain: `Take home ${money(take)}, gross it up for ${pct(tax * 100, 0)} taxes, add ${money(overhead)} of overhead, and spread it across the ${count(billableHours)} hours you can actually bill: ${money2(rate)} an hour. ${
      priced.length
        ? `The ${count(priced.length)} services below are priced from that rate, and the increase letter is dated ${longDate(notice60)} so customers get sixty days of notice.`
        : "Add your services and each one gets priced from that rate."
    }`,
    stats: [
      { label: "Billable hours a year", value: count(billableHours), sub: `${pct(billable * 100, 0)} of ${count(weeks * hoursWk)} worked` },
      { label: "Required increase", value: increasePct > 0 ? pct(increasePct * 100, 1) : "none", tone: increasePct > 0.25 ? "warn" : "neutral" },
      ...(increasePct > 0
        ? [{ label: "Customer loss it can absorb", value: pct(breakEvenChurn * 100, 1), sub: "before revenue drops", tone: "good" as const }]
        : []),
      { label: "New rates take effect", value: longDate(effective) },
    ],
    bars: priced.length
      ? {
          title: "Old price against new, per service",
          items: priced.slice(0, 5).map((s) => ({
            label: s.name.length > 34 ? `${s.name.slice(0, 32)}...` : s.name,
            value: s.price,
            display: `${money(s.oldPrice)} to ${money(s.price)}`,
            tone: s.price > s.oldPrice ? "warn" : "good",
          })),
        }
      : undefined,
    verdict: {
      tone: gap > 0 ? "warn" : "good",
      text:
        gap > 0
          ? `Every hour billed at ${money2(current)} pays you ${money2(gap)} less than it should. The kit prices the card from the real number and writes the sixty day rollout that gets you there.`
          : "The rate holds up. Print the card, keep the worksheet, and rerun this when overhead or hours change.",
    },
    assumptions: [
      "The rate derivation matches the free hourly rate calculator on this site, deliberately.",
      "Loss tolerance is revenue arithmetic from your own inputs, not a prediction. Nothing here guarantees retention or income.",
      "The letter is a working draft. Read it once before it goes anywhere.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 19,
  promise:
    "Your real rate, every service priced from it, the customer rate card, the increase letter four ways, and the sixty day rollout with reminders.",
  kit: [
    "Customer-facing rate card in your brand, no math shown",
    "Internal worksheet: the rate derivation and every price old and new",
    "The increase letter, email, text and said-out-loud versions",
    "Service price list spreadsheet",
    "Rollout reminders: 60 day notice, 30 day, effective date, check-in",
  ],
  upgradeFrom: [
    "hourly-rate-calculator",
    "price-increase-impact",
    "profit-margin-calculator",
    "break-even-calculator",
  ],
  freePreview:
    "Run your real costs and see the required rate, the increase math and the loss tolerance before paying anything.",
};

export const KIT: ProToolDef = {
  slug: "rate-card-kit",
  name: "Rate Card and Price Increase Kit",
  short: "Rate Card Kit",
  emoji: "💵",
  category: "Money",
  tagline: "The rate you need, and the paper that gets you there",
  description:
    "Work out what your hour actually has to bill, price every service from it, and roll the increase out properly: a branded customer rate card, the internal worksheet, the letter in four forms, and sixty days of dated reminders.",
  who: "Trades, cleaners, detailers, groomers, consultants, and every service owner who has not raised prices since costs did.",
  problem:
    "The calculator says the rate is too low, and then nothing happens, because the raise needs a card, a letter, a date and the nerve, and building those takes an evening that never comes.",
  payoff:
    "The finished rollout: card printed, letters written, dates set, and the worksheet that shows how much customer loss the new rates can absorb.",
  steps: [
    "Put your business name, color and logo in the brand kit once.",
    "Enter your real take home target, overhead, hours and tax set aside.",
    "List your services with the hours each takes and any materials.",
    "Print the card, keep the worksheet, and let the reminders run the rollout.",
  ],
  faqs: [
    {
      q: "Why does it price from hours instead of what competitors charge?",
      a: "Because competitor prices do not pay your overhead. The rate comes from your own take home target, taxes, overhead and billable hours, the same math as the free calculator, and every service is priced from it.",
    },
    {
      q: "What if I am scared of losing customers?",
      a: "The worksheet does that math instead of letting it stay a feeling: a given increase keeps revenue level up to a stated share of customers walking, computed from your numbers. You also see your own planned loss against it.",
    },
    {
      q: "Why sixty days of notice?",
      a: "It is the courteous window and it lets you honor everything already quoted, which is what keeps trust. The kit dates the letter, the reminder to regulars, the effective day and a check-in for you.",
    },
    {
      q: "Can I rerun it next year?",
      a: "That is the idea. Costs move, the kit reprices everything from the new inputs, and the rollout re-dates itself. Buy once, use every time overhead changes.",
    },
  ],
  domain: "business-money",
  toolType: "builder",
  goals: ["price-a-service", "make-money", "generate-a-document"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "cleaning", "pest-control", "remodeling", "painting", "handyman", "pool-service",
    "auto-repair", "pet-services", "photography", "consulting", "it-services",
    "massage", "hair-salon", "fitness",
  ],
  audiences: ["owners", "freelancers", "contractors"],
  keywords: [
    "rate card template", "price increase letter", "how to raise prices", "service price list",
    "hourly rate for contractors", "price increase notice", "raise prices without losing customers",
    "pricing worksheet",
  ],
  synonyms: ["price list kit", "rate increase kit", "service pricing kit"],
  disclaimer: "general-estimate",
  dataSensitivity: "personal",
  popularity: 86,
  isNew: true,
  embedHeight: 1150,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A printed rate card propped upright with a rising price tag beside it, the internal worksheet lying flat behind with its math showing.",
  visualFamily: "money-flow",
  primarySubject: "standing rate card with priced service rows",
  supportingSubjects: ["price tag on an upward arrow", "worksheet lying flat behind"],
  sceneType: "still-life",
  composition: "rate card standing center left, tag and arrow rising to the right, worksheet flat behind, negative space upper right",
  colorAccent: 3,
  cardImage: "/tools-art/card/rate-card-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/rate-card-kit.svg",
  heroImageAlt: "A printed service rate card standing beside a rising price tag, with the internal pricing worksheet behind",
  ogImage: "/og/tools/rate-card-kit.jpg",
  ogLayout: "big-number",
  ogHook: "Your real rate, on paper customers can hold.",
  focalPoint: { x: 0.45, y: 0.52 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};

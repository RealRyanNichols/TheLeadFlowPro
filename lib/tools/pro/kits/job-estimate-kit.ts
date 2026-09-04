// Job Estimate Kit.
//
// The free Job Price Calculator gets the number right. Then the owner opens a
// word processor and rebuilds the same ugly estimate they have used for years:
// no terms, no deposit schedule, no estimate number, and no idea which line
// items quietly lose money.
//
// This builds the paper from the numbers: a branded estimate with terms and
// signature lines, the matching deposit invoice, an internal margin sheet that
// flags the losing lines and never goes to the customer, and the three dated
// follow-ups that stop the estimate going quiet.

import {
  brandOf, count, money, money2, num, pct, str,
  type ProInfo, type Result, type ToolDocument, type ToolVisual, type Values,
} from "../../types";
import type { ProToolDef } from "../types";
import {
  addDays, bigNumbers, bullets, callout, csvDoc, heading, icsDoc, longDate, MADE_WITH,
  nextBusinessDay, numbered, pLead, paragraph, printDoc, printDocument, resolveBrand,
  REVIEW_BEFORE_SENDING, scriptBlock, signatureLines, table, textDoc,
} from "../docs";

/* -------------------------------- line items ------------------------------- */

export type EstimateLine = {
  description: string;
  /** What the line costs you. Null when the owner did not give one. */
  cost: number | null;
  /** What the customer pays for the line. */
  price: number;
  /** Gross margin share of price, when the cost is known. */
  margin: number | null;
};

const moneyIn = (raw: string): number | null => {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? n : null;
};

/**
 * One line per item: "Description | your cost | customer price", or
 * "Description | customer price" when the cost is not tracked. Forgiving on
 * dollar signs and commas, strict on nothing else, and a line it cannot read
 * is returned so the sheet can say so instead of silently dropping work.
 */
export function parseEstimateLines(text: string): { lines: EstimateLine[]; bad: string[] } {
  const lines: EstimateLine[] = [];
  const bad: string[] = [];
  for (const raw of text.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|").map((p) => p.trim());
    if (parts.length >= 3) {
      const cost = moneyIn(parts[parts.length - 2]);
      const price = moneyIn(parts[parts.length - 1]);
      const description = parts.slice(0, -2).join(" | ").slice(0, 200);
      if (description && price !== null) {
        lines.push({
          description,
          cost,
          price,
          margin: cost !== null && price > 0 ? (price - cost) / price : null,
        });
        continue;
      }
    } else if (parts.length === 2) {
      const price = moneyIn(parts[1]);
      if (parts[0] && price !== null) {
        lines.push({ description: parts[0].slice(0, 200), cost: null, price, margin: null });
        continue;
      }
    }
    bad.push(trimmed.slice(0, 120));
  }
  return { lines: lines.slice(0, 60), bad: bad.slice(0, 20) };
}

/* ---------------------------------- fields --------------------------------- */

const EXAMPLE_LINES = [
  "Tear out and haul off existing surface | 380 | 850",
  "Materials, delivered | 1450 | 1980",
  "Installation labor, two crew, two days | 1216 | 2400",
  "Haul away, site cleanup and final walkthrough | 140 | 420",
].join("\n");

const FIELDS: ProToolDef["fields"] = [
  {
    id: "customer", label: "Customer name", type: "text", def: "", section: "The job",
    placeholder: "Dana Whitfield",
  },
  {
    id: "jobTitle", label: "What the job is", type: "text", def: "", section: "The job",
    placeholder: "Kitchen floor replacement",
  },
  {
    id: "lines", label: "The line items", type: "textarea", def: EXAMPLE_LINES, rows: 6, section: "The job",
    help: "One line per item: what it is | your cost | the customer price. Leave your cost out (what it is | price) and the margin sheet will say so instead of guessing.",
  },
  {
    id: "options", label: "Optional add-ons", type: "textarea", def: "", rows: 3, section: "The job",
    placeholder: "Upgraded trim package | 380\nMove appliances back and re-level | 220",
    help: "Same format, shown to the customer as options they can add. Real scope only; the kit will not invent good, better, best tiers.",
  },
  {
    id: "taxRate", label: "Sales tax on the total", type: "slider", min: 0, max: 12, step: 0.25, def: 0, suffix: "%", section: "Money terms",
    help: "Many services are not taxed and rules vary by state and by line. Zero unless you know yours.",
  },
  {
    id: "deposit", label: "Deposit to start", type: "slider", min: 0, max: 75, step: 5, def: 35, suffix: "%", section: "Money terms",
  },
  {
    id: "validDays", label: "Estimate good for", type: "slider", min: 7, max: 90, step: 1, def: 30, suffix: " days", section: "Money terms",
  },
  {
    id: "due", label: "Balance due", type: "select", def: "completion", section: "Money terms",
    options: [
      { value: "completion", label: "On completion" },
      { value: "net15", label: "Within 15 days of completion" },
      { value: "net30", label: "Within 30 days of completion" },
    ],
  },
  {
    id: "warranty", label: "Your warranty", type: "text", def: "1 year on labor", section: "Money terms",
    placeholder: "1 year on labor",
  },
  {
    id: "marginFloor", label: "Flag lines below this margin", type: "slider", min: 5, max: 60, step: 5, def: 25, suffix: "%", section: "Money terms",
    help: "The internal sheet marks any line thinner than this. It never goes to the customer.",
  },
  {
    id: "estNumber", label: "Estimate number", type: "text", def: "", section: "Paper details",
    placeholder: "EST-2041", help: "Blank builds one from the date. Numbered paper reads like an organized company.",
  },
  {
    id: "estDate", label: "Estimate date", type: "text", def: "", section: "Paper details",
    placeholder: "2026-09-08", help: "YYYY-MM-DD. Blank uses today. The valid-until and follow-up dates count from it.",
  },
];

/* ----------------------------------- run ----------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dateOf(v: Values, id: string): string {
  const raw = str(v, id).trim();
  if (ISO.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    if (y >= 1970 && y <= 2999 && m >= 1 && m <= 12 && d >= 1 && d <= 31) return raw;
  }
  return new Date().toISOString().slice(0, 10);
}

const DUE_LABEL: Record<string, string> = {
  completion: "on completion of the work",
  net15: "within 15 days of completion",
  net30: "within 30 days of completion",
};

function run(v: Values): Result {
  const brand = resolveBrand(brandOf(v));
  const customer = str(v, "customer").trim().slice(0, 120) || "Customer";
  const jobTitle = str(v, "jobTitle").trim().slice(0, 160) || "Scope of work";
  const { lines, bad } = parseEstimateLines(str(v, "lines"));
  const { lines: options } = parseEstimateLines(str(v, "options"));
  const taxRate = Math.max(0, num(v, "taxRate")) / 100;
  const depositPct = Math.max(0, num(v, "deposit", 35)) / 100;
  const validDays = Math.max(7, num(v, "validDays", 30));
  const due = DUE_LABEL[str(v, "due", "completion")] ?? DUE_LABEL.completion;
  const warranty = str(v, "warranty").trim().slice(0, 160);
  const marginFloor = Math.max(0.05, num(v, "marginFloor", 25) / 100);
  const estDate = dateOf(v, "estDate");
  const estNumber =
    str(v, "estNumber").trim().slice(0, 40) || `EST-${estDate.replace(/-/g, "").slice(2)}`;

  const subtotal = lines.reduce((sum, l) => sum + l.price, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const depositDue = total * depositPct;
  const balance = total - depositDue;
  const validUntil = addDays(estDate, validDays);

  const knownCost = lines.filter((l) => l.cost !== null);
  const totalCost = knownCost.reduce((sum, l) => sum + (l.cost ?? 0), 0);
  const knownPrice = knownCost.reduce((sum, l) => sum + l.price, 0);
  const overallMargin = knownPrice > 0 ? (knownPrice - totalCost) / knownPrice : null;
  const thinLines = lines.filter((l) => l.margin !== null && l.margin < marginFloor);
  const losingLines = lines.filter((l) => l.margin !== null && l.margin < 0);

  const followUps = [2, 5, 10].map((day) => nextBusinessDay(addDays(estDate, day)));

  /* ------------------------------- documents ------------------------------- */

  const money0 = (n: number) => money2(n);

  const estimateRows = lines.map((l) => [l.description, money0(l.price)]);
  const estimateDoc = printDocument(
    brand,
    `Estimate ${estNumber} for ${customer}`,
    [
      {
        eyebrow: `Estimate ${estNumber} · ${longDate(estDate)}`,
        title: jobTitle,
        html:
          paragraph(`Prepared for ${customer}.`) +
          (lines.length
            ? table(["Scope of work", "Price"], [...estimateRows, ["Subtotal", money0(subtotal)]], {
                numeric: [1],
                totalRow: !taxRate,
              })
            : callout("No line items yet", "Add the scope lines and this becomes the estimate.")) +
          (taxRate
            ? table(["", ""], [["Sales tax", money0(tax)], ["Total", money0(total)]], { numeric: [1], totalRow: true })
            : "") +
          (options.length
            ? heading("Options, priced separately") +
              table(["If you want it added", "Price"], options.map((o) => [o.description, money0(o.price)]), {
                numeric: [1],
              })
            : "") +
          bigNumbers([
            { value: money0(depositPct > 0 ? depositDue : total), label: depositPct > 0 ? "Deposit to schedule the work" : "Total" },
            ...(depositPct > 0 ? [{ value: money0(balance), label: `Balance, ${due}` }] : []),
            { value: longDate(validUntil), label: "Priced as written until" },
          ]) +
          heading("Terms") +
          numbered([
            `This estimate is valid as written until ${longDate(validUntil)}. After that date we will gladly re-quote it.`,
            ...(depositPct > 0
              ? [`A deposit of ${money0(depositDue)} reserves the work and is credited in full against the total. The balance of ${money0(balance)} is due ${due}.`]
              : [`The total of ${money0(total)} is due ${due}.`]),
            "Work outside the scope written above is quoted and approved in writing before it is done. No surprise line items, in either direction.",
            ...(warranty ? [`Workmanship warranty: ${warranty}. Manufacturer warranties on materials pass through to you.`] : []),
            "Site conditions that could not be seen when this was priced, such as hidden damage, are brought to you with a written change price before work continues.",
          ]) +
          signatureLines(`Accepted by ${customer}`, "Date") +
          signatureLines(`For ${brand.name}`, "Date"),
      },
    ],
    { footNote: REVIEW_BEFORE_SENDING },
  );

  const invoiceDoc = printDocument(
    brand,
    `Deposit invoice ${estNumber}-D for ${customer}`,
    [
      {
        eyebrow: `Invoice ${estNumber}-D · ${longDate(estDate)}`,
        title: `Deposit for: ${jobTitle}`,
        html:
          paragraph(`Billed to ${customer}. This invoice covers the deposit on estimate ${estNumber}.`) +
          table(
            ["", ""],
            [
              [`Estimate total`, money0(total)],
              [`Deposit (${pct(depositPct * 100, 0)})`, money0(depositDue)],
              [`Balance remaining after this invoice, due ${due}`, money0(balance)],
              ["Due now", money0(depositDue)],
            ],
            { numeric: [1], totalRow: true },
          ) +
          callout(
            "What paying this does",
            "It reserves your slot on the schedule and is credited in full against the estimate total. Nothing else is owed until the terms on the estimate say so.",
          ) +
          heading("How to pay") +
          bullets([
            brand.phone ? `Call or text ${brand.phone} to pay by card.` : "Call or text us to pay by card.",
            "Checks payable to " + brand.name + ".",
            "If you were sent a payment link with this invoice, that works too.",
          ]),
      },
    ],
    { footNote: REVIEW_BEFORE_SENDING },
  );

  const marginRows = lines.map((l) => [
    l.description,
    l.cost !== null ? money0(l.cost) : "no cost given",
    money0(l.price),
    l.margin !== null ? pct(l.margin * 100, 1) : "unknown",
    l.margin === null ? "" : l.margin < 0 ? "LOSING MONEY" : l.margin < marginFloor ? "THIN" : "",
  ]);

  const marginDoc = printDocument(
    brand,
    `Internal margin sheet, estimate ${estNumber}`,
    [
      {
        eyebrow: "Internal only. This page never goes to the customer.",
        title: `The margin behind estimate ${estNumber}`,
        html:
          (overallMargin !== null
            ? bigNumbers([
                { value: pct(overallMargin * 100, 1), label: "Overall margin on costed lines" },
                { value: money0(knownPrice - totalCost), label: "Gross profit in the job" },
                { value: count(thinLines.length), label: `Lines under your ${pct(marginFloor * 100, 0)} floor` },
              ])
            : callout(
                "No costs entered",
                "Add your cost to each line (what it is | cost | price) and this sheet shows the margin per line and flags the thin ones.",
              )) +
          table(["Line", "Your cost", "Customer price", "Margin", "Flag"], marginRows, { numeric: [1, 2, 3] }) +
          (losingLines.length
            ? callout(
                "Read this before you send the estimate",
                `${count(losingLines.length)} line${losingLines.length === 1 ? " is" : "s are"} priced below cost. Fix the price or fold the line into another one deliberately; do not find out at the end of the job.`,
              )
            : "") +
          (bad.length
            ? callout(
                "Lines the kit could not read",
                `These were skipped, check the format (what it is | cost | price): ${bad.join(" · ")}`,
              )
            : "") +
          heading("Reading this sheet") +
          bullets([
            "Margin is share of price, not markup on cost. Forty percent margin means forty cents of every customer dollar stays after direct costs.",
            `THIN marks lines under your ${pct(marginFloor * 100, 0)} floor. One thin line is a choice; a page of them is a pricing problem.`,
            "Overhead is not in these costs unless you put it there. Thin on this sheet is thinner in real life.",
          ]),
      },
    ],
    { footNote: MADE_WITH },
  );

  const presentDoc = printDocument(
    brand,
    `Presenting estimate ${estNumber}`,
    [
      {
        eyebrow: "For you, before you hit send",
        title: "How to present this price",
        html:
          pLead("Two minutes of delivery beats two hundred dollars of discount. The estimate carries the number; this page is how it lands.") +
          numbered([
            `Send it the same day you promised, and say so: "Told you I would have it to you today, here it is." Reliability sells before the number is read.`,
            `Lead with the scope, not the total: "Everything in there is written out line by line so you can see what you are getting." People argue with mystery, not with detail.`,
            depositPct > 0
              ? `Say the deposit plainly: "It is ${money0(depositDue)} to get on the schedule, the rest is not due until ${due}." A split number is easier to say yes to than a lump.`
              : `Say the terms plainly: "The total is due ${due}, and the estimate holds until ${longDate(validUntil)}."`,
            options.length
              ? `Offer the options after they have said yes to the base, never before: "There are a couple of add-ons on there if you want them, the job does not need them."`
              : `If they ask for extras, write them as options with their own price. Never absorb scope quietly.`,
            `If they flinch at the number, do not touch the price first. Ask: "Is it the total, or the timing?" The answer tells you whether to phase the work or hold firm.`,
          ]) +
          heading("The three follow-ups, already dated") +
          table(
            ["When", "Date", "The message"],
            [
              ["Day 2", longDate(followUps[0]), `"Wanted to make sure the estimate landed. Anything in it read funny?"`],
              ["Day 5", longDate(followUps[1]), `"Happy to walk through it line by line on a five minute call if that is easier."`],
              ["Day 10", longDate(followUps[2]), `"No pressure either way. It is priced as written until ${longDate(validUntil)}, after that I would need to re-quote it."`],
            ],
          ),
      },
    ],
    { footNote: MADE_WITH },
  );

  const documents: ToolDocument[] = [
    printDoc(
      "estimate",
      `Estimate ${estNumber}`,
      "The customer-facing estimate: branded letterhead, numbered, line items, terms, options and signature lines.",
      `estimate-${estNumber}.html`,
      estimateDoc,
    ),
    printDoc(
      "invoice",
      "Deposit invoice",
      "The matching deposit invoice, computed from the same numbers, ready the moment they say yes.",
      `invoice-${estNumber}-deposit.html`,
      invoiceDoc,
    ),
    printDoc(
      "margin",
      "Internal margin sheet",
      "Cost, price and margin per line with the thin and losing lines flagged. Never goes to the customer.",
      `margin-sheet-${estNumber}.html`,
      marginDoc,
    ),
    printDoc(
      "present",
      "How to present the price",
      "One page on delivering the number, with the three follow-ups already dated.",
      `presenting-${estNumber}.html`,
      presentDoc,
    ),
    csvDoc(
      "lines",
      "Line items spreadsheet",
      "Every line with cost, price and margin, for your records or your bookkeeper.",
      `estimate-${estNumber}-lines.csv`,
      ["description", "your_cost", "customer_price", "margin_pct", "flag"],
      lines.map((l) => [
        l.description,
        l.cost !== null ? l.cost : "",
        l.price,
        l.margin !== null ? (l.margin * 100).toFixed(1) : "",
        l.margin === null ? "" : l.margin < 0 ? "LOSING" : l.margin < marginFloor ? "THIN" : "",
      ]),
    ),
    icsDoc(
      "reminders",
      "Follow-up reminders",
      "Three reminders on the real dates, each carrying its message, plus the day the estimate expires.",
      `estimate-${estNumber}-follow-ups.ics`,
      [
        ...followUps.map((date, i) => ({
          date,
          time: "09:15",
          minutes: 10,
          title: `${brand.name}: follow up on estimate ${estNumber} (${customer})`,
          description: [
            `"Wanted to make sure the estimate landed. Anything in it read funny?"`,
            `"Happy to walk through it line by line on a five minute call if that is easier."`,
            `"No pressure either way. It is priced as written until ${longDate(validUntil)}, after that I would need to re-quote it."`,
          ][i],
        })),
        {
          date: validUntil,
          title: `Estimate ${estNumber} expires today (${customer})`,
          description: "Re-quote before honoring the old number; costs move.",
        },
      ],
      `${brand.name} estimates`,
    ),
  ];

  return {
    headline: {
      value: money0(total),
      label: `Estimate ${estNumber} total`,
      sub:
        depositPct > 0
          ? `${money0(depositDue)} deposit, ${money0(balance)} ${due}`
          : `due ${due}`,
      tone: "neutral",
    },
    explain: lines.length
      ? `${count(lines.length)} line${lines.length === 1 ? "" : "s"}${taxRate ? `, ${pct(taxRate * 100, 2)} tax` : ""}, priced as written until ${longDate(validUntil)}.${
          overallMargin !== null
            ? ` The costed lines carry ${pct(overallMargin * 100, 1)} overall margin${
                thinLines.length ? `, and ${count(thinLines.length)} of them sit under your ${pct(marginFloor * 100, 0)} floor; the internal sheet names them` : ""
              }.`
            : " Add your costs to the lines and the internal sheet shows the margin behind the paper."
        }`
      : "Add the scope lines, one per row, and the estimate, the invoice and the margin sheet build themselves.",
    stats: [
      { label: "Subtotal", value: money0(subtotal) },
      ...(taxRate ? [{ label: "Sales tax", value: money0(tax) }] : []),
      ...(depositPct > 0 ? [{ label: "Deposit to schedule", value: money0(depositDue), tone: "good" as const }] : []),
      ...(overallMargin !== null
        ? [{
            label: "Margin on costed lines",
            value: pct(overallMargin * 100, 1),
            tone: (losingLines.length ? "bad" : thinLines.length ? "warn" : "good") as "bad" | "warn" | "good",
            sub: thinLines.length ? `${count(thinLines.length)} flagged` : undefined,
          }]
        : []),
    ],
    verdict: losingLines.length
      ? {
          tone: "bad",
          text: `${count(losingLines.length)} line${losingLines.length === 1 ? " is" : "s are"} priced below cost. Open the internal margin sheet before this estimate goes anywhere.`,
        }
      : {
          tone: "neutral",
          text: `The kit builds the estimate, the deposit invoice, the internal margin sheet and the three dated follow-ups from these numbers. Change a line and everything rebuilds.`,
        },
    assumptions: [
      "Tax is applied to the whole subtotal at the rate you set. Real tax rules vary by state and by line item; confirm yours before charging it.",
      "Margins are on the costs you entered, before overhead, so real margins are thinner than this sheet shows.",
      "The terms are a working draft, not legal advice. Read them once and have a professional check anything that matters.",
    ],
    documents,
  };
}

/* ----------------------------------- kit ----------------------------------- */

const pro: ProInfo = {
  priceUsd: 29,
  promise:
    "The finished estimate paper: branded and numbered with terms, the deposit invoice, the internal margin sheet, and the dated follow-ups.",
  kit: [
    "Branded, numbered estimate with terms and signature lines",
    "Matching deposit invoice, computed, ready when they say yes",
    "Internal margin sheet flagging thin and losing lines",
    "How to present the price, one page",
    "Line items spreadsheet for your records",
    "Follow-up reminders on real dates, expiry included",
  ],
  upgradeFrom: [
    "job-price-calculator",
    "estimate-terms-generator",
    "markup-vs-margin",
    "hourly-rate-calculator",
    "quote-follow-up-calculator",
  ],
  freePreview:
    "Enter the real job and see the total, the deposit split, the margin math and everything the kit builds, before paying anything.",
};

export const KIT: ProToolDef = {
  slug: "job-estimate-kit",
  name: "Job Estimate Kit",
  short: "Estimate Kit",
  emoji: "🧾",
  category: "Money",
  tagline: "From line items to signed paper, in your brand",
  description:
    "Type the job once and get the finished paper: a branded, numbered estimate with real terms and signature lines, the matching deposit invoice, an internal margin sheet that flags losing lines, and follow-ups on real dates.",
  who: "Contractors, trades, remodelers, cleaners, detailers, and every service business that writes estimates by hand in a word processor.",
  problem:
    "The number gets worked out carefully and then pasted into paper with no terms, no deposit schedule and no estimate number, and nobody notices the one line item that has been losing money all year.",
  payoff:
    "Professional paper in minutes: estimate, invoice, margin sheet and follow-ups, all from one set of line items.",
  steps: [
    "Put your business name, logo and color in the brand kit once.",
    "Type the line items, one per row: what it is, your cost, the customer price.",
    "Set the deposit, the validity window and your warranty.",
    "Print the estimate and the invoice, and read the margin sheet before you send anything.",
  ],
  faqs: [
    {
      q: "Is the estimate legally binding?",
      a: "The terms are a solid working draft of the protections most service estimates need: validity window, deposit credit, written change orders, hidden conditions. It is not legal advice, and anything high stakes deserves a professional read.",
    },
    {
      q: "What if I do not track my cost per line?",
      a: "Leave the cost out and the estimate still builds perfectly. The margin sheet will say no cost given on those lines instead of pretending, and it starts earning its keep the day you add them.",
    },
    {
      q: "Does it do good, better, best pricing?",
      a: "It does something more honest: an options section priced from real add-on scope you type in. It will not invent three tiers out of one job, because customers can tell.",
    },
    {
      q: "Can I reuse it for every estimate?",
      a: "That is the point. Change the customer, the lines and the number, and the whole set rebuilds. Buy it once, use it on every job you quote.",
    },
  ],
  domain: "business-money",
  toolType: "builder",
  goals: ["quote-a-job", "generate-a-document", "make-money"],
  industries: [
    "general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping",
    "remodeling", "painting", "flooring", "concrete", "cleaning", "pest-control",
    "moving", "handyman", "pool-service", "auto-repair", "printing", "photography",
    "catering", "it-services",
  ],
  audiences: ["owners", "contractors", "salespeople", "freelancers"],
  keywords: [
    "job estimate template", "contractor estimate with terms", "deposit invoice template",
    "estimate and invoice", "margin per line item", "estimate terms and conditions",
    "printable estimate", "estimate follow up",
  ],
  synonyms: ["estimate builder", "quote paper kit", "estimate and invoice kit"],
  disclaimer: "draft-document",
  dataSensitivity: "personal",
  popularity: 90,
  isNew: true,
  embedHeight: 1200,
  fields: FIELDS,
  run,
  pro,
};

export const VISUAL: ToolVisual = {
  visualConcept:
    "A finished, branded estimate on a clipboard with a pen resting on the signature line, the margin sheet peeking out behind it flagged in the accent.",
  visualFamily: "documents",
  primarySubject: "estimate on a clipboard",
  supportingSubjects: ["margin sheet behind", "pen on the signature line", "deposit stamp"],
  sceneType: "document",
  composition: "clipboard center right at three quarter height, margin sheet offset behind left, pen crossing the lower third, negative space upper left",
  colorAccent: 6,
  cardImage: "/tools-art/card/job-estimate-kit.svg",
  cardImageAlt: "",
  heroImage: "/tools-art/hero/job-estimate-kit.svg",
  heroImageAlt: "A branded estimate on a clipboard with a pen on the signature line and the internal margin sheet behind it",
  ogImage: "/og/tools/job-estimate-kit.jpg",
  ogLayout: "document",
  ogHook: "Estimate, invoice, margin sheet and follow-ups, from one form.",
  focalPoint: { x: 0.58, y: 0.5 },
  imageSource: "Original vector illustration, The LeadFlow Pro",
  license: "Original work, The LeadFlow Pro",
  sourceDate: "2026-09-03",
  visualReviewStatus: "review",
};

// The facts gate. Runs before every build.
//
// Run: npm run validate:facts
//
// A known LeadFlow Pro price, the business phone number, a business email
// address, the legal entity, or the featured workshop date typed out by hand
// anywhere the public site renders from is a fact that can drift. Every one
// of them has a home in lib/site/*. This script fails the build when a copy
// appears outside that home, so a price or a date is changeable in exactly
// one place.
//
// Vendor prices quoted for comparison (HighLevel, Webflow, ClickFunnels and
// friends) and intake budget ranges are allowed by pattern, with a reason,
// in ALLOW below. Add to that list only with a reason a reviewer would accept.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BUSINESS } from "../lib/site/business.ts";
import { guardedPriceStrings } from "../lib/site/prices.ts";

const ROOT = process.cwd();

/** Directories whose every .ts/.tsx file is scanned. */
const SCAN_DIRS = ["app", "components"];

/** Marketing modules under lib/ that render public copy or send email. */
const SCAN_FILES = [
  "lib/siteContent.ts",
  "lib/leadNotify.ts",
  "lib/nurture.ts",
  "lib/nurtureHtml.ts",
  "lib/nurtureRentReceipt.ts",
  "lib/workshopFollowUp.ts",
  "lib/pluginOnboarding.ts",
  "lib/pluginDocs.ts",
  "lib/site/agency.ts",
  "lib/site/caseStudies.ts",
  "lib/events.ts",
  "lib/freeBuild.ts",
  "lib/leadFollowUp.ts",
  "lib/offers.ts",
  "lib/toolStudio.ts",
  // lib/tiers.ts (legacy /pricing/[tier]) is excluded until decision 7 in
  // docs/decisions-needed.md retires or re-prices it.
];

/** The homes. Never scanned. */
const SOURCE_OF_TRUTH = new Set([
  "lib/site/prices.ts",
  "lib/site/business.ts",
  "lib/site/events.ts",
  "lib/site/external-links.ts",
]);

const SKIP = [/\.test\.[cm]?[jt]sx?$/, /\.d\.ts$/, /\.module\.css$/, /(^|\/)node_modules\//];

type Allow = { file: RegExp; line: RegExp; reason: string };

const ALLOW: Allow[] = [
  {
    file: /^components\/site\/CapabilityExplorer\.tsx$/,
    line: /HighLevel|Webflow|Calendly|Zapier|Wix|Squarespace|GoDaddy|Kajabi|Thinkific|Teachable|Shopify|Mailchimp|OpenPhone|RingCentral|Jobber|ServiceTitan|Housecall/,
    reason: "vendor list prices quoted beside a link to the vendor's pricing page",
  },
  {
    file: /^components\/RentCalculator\.tsx$/,
    line: /ClickFunnels|HighLevel|Wix|Squarespace|Shopify|Kajabi|Mailchimp|Calendly|Vercel|Resend|price: \d+/,
    reason: "rented-stack vendor prices sourced in the calculator",
  },
  {
    file: /^app\/start\/StartRouter\.tsx$/,
    line: /\bto \$|\$0\.\d\d|listing fee|commission/,
    reason: "intake budget ranges and marketplace fee explanations, not LeadFlow offers",
  },
  {
    file: /^app\/(diagnostic|business-diagnostic)\//,
    line: /\bto \$|Under \$|or more/,
    reason: "diagnostic budget buckets",
  },
  {
    file: /^app\/agency\/start\//,
    line: /\bto \$|Under \$|or more|\$0\b/,
    reason: "monthly ad budget buckets on the agency intake, paid to the platforms, not LeadFlow prices",
  },
  {
    file: /^lib\/tiers\.ts$/,
    line: /\/mo\b|per month/,
    reason: "rented-stack running cost ranges",
  },
  {
    file: /^app\/api\/stripe-webhook\/route\.ts$/,
    line: /^\s*(\/\/|\*)/,
    reason: "code comments that describe which Stripe amount maps to which offer",
  },
  {
    file: /^app\/api\/quo-inbound\/route\.ts$|^app\/api\/quo-status\//,
    line: /500-8898|19035008898/,
    reason: "the Quo line identity guard compares against the compiled LeadFlow number",
  },
];

const PRICE_PATTERNS = guardedPriceStrings().map((label) => {
  const digits = label.replace(/[$,]/g, "");
  return {
    label,
    // "$1,000" or "$1000", not "$1,0000" and not "$10,000" matching "$1,000".
    re: new RegExp(`(?<![\\d,])\\$(?:${escape(label.slice(1))}|${digits})(?![\\d,])`),
  };
});

const PHONE = /500-8898|19035008898|903\.500\.8898/;
const EMAIL = /\b(hello|ryan|hq|leadflow|pat)@theleadflowpro\.com\b/i;
const WRONG_ENTITY = /Real Ryan Nichols LLC|Longview Training Center LLC(?!, )/;
const OTHER_BUSINESS_CONTACT = /230-6444|913-6444|1405 McCann|Premiere Dental/;
const WORKSHOP_DATE = /September 17|Sept\.? 17\b|SEPTEMBER 17|2026-09-17/;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const rel = relative(ROOT, abs).split(sep).join("/");
    if (SKIP.some((re) => re.test(rel))) continue;
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (/\.[cm]?[jt]sx?$/.test(entry)) out.push(rel);
  }
}

export type FactProblem = { file: string; line: number; kind: string; text: string };

function allowed(file: string, line: string): boolean {
  return ALLOW.some((rule) => rule.file.test(file) && rule.line.test(line));
}

export function findFactProblems(root = ROOT): FactProblem[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    try {
      if (statSync(join(root, dir)).isDirectory()) walk(join(root, dir), files);
    } catch {
      // A missing directory is not a fact problem.
    }
  }
  for (const file of SCAN_FILES) {
    try {
      if (statSync(join(root, file)).isFile()) files.push(file);
    } catch {
      // Optional module not present yet.
    }
  }

  const problems: FactProblem[] = [];
  for (const file of files) {
    if (SOURCE_OF_TRUTH.has(file)) continue;
    const lines = readFileSync(join(root, file), "utf8").split("\n");
    lines.forEach((text, index) => {
      const line = index + 1;
      const push = (kind: string) => {
        if (!allowed(file, text)) problems.push({ file, line, kind, text: text.trim().slice(0, 140) });
      };
      for (const { label, re } of PRICE_PATTERNS) {
        if (re.test(text)) push(`hard-coded price ${label} (use lib/site/prices.ts)`);
      }
      if (PHONE.test(text)) push("hard-coded phone number (use BUSINESS.phone)");
      if (EMAIL.test(text) && !/^\s*(\/\/|\*|\/\*)/.test(text)) push("hard-coded email address (use BUSINESS.email)");
      if (WRONG_ENTITY.test(text)) push(`legal entity must read "${BUSINESS.legalName}"`);
      if (OTHER_BUSINESS_CONTACT.test(text)) push("another business's contact details must never render here");
      if (WORKSHOP_DATE.test(text)) push("hard-coded workshop date (read lib/site/events.ts)");
    });
  }
  return problems;
}

export function formatFactProblems(problems: FactProblem[]): string {
  return problems.map((p) => `  ${p.file}:${p.line}  ${p.kind}\n      ${p.text}`).join("\n");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const problems = findFactProblems();
  if (problems.length) {
    console.error(`\nvalidate:facts found ${problems.length} hard-coded fact${problems.length === 1 ? "" : "s"} outside lib/site:\n`);
    console.error(formatFactProblems(problems));
    console.error("\nMove the value into lib/site/* and read it from there, or add an ALLOW rule with a reason.\n");
    process.exit(1);
  }
  console.log(`validate:facts: every price, phone, email, entity, and workshop date reads from lib/site.`);
}

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "src", "app");
const srcDir = path.join(root, "src");
const reportPath = path.join(root, "reports", "link-audit.md");

const expectedRoutes = [
  "/",
  "/lead-leak-audit",
  "/lead-leak-audit-197",
  "/stump-ryan",
  "/proof",
  "/services",
  "/tiers",
  "/organic-growth",
  "/services/consulting",
  "/story",
  "/contact",
  "/book",
  "/pulse",
  "/login",
  "/voice",
  "/start",
  "/tools/ad-account-autopsy",
  "/community",
  "/support",
  "/rewards",
  "/legal",
  "/privacy-policy",
  "/terms",
  "/refunds",
  "/growth/missed-call-follow-up-system",
  "/growth/local-business-lead-follow-up",
  "/growth/contractor-lead-follow-up",
  "/growth/dental-school-lead-system",
  "/growth/east-texas-business-growth",
  "/growth/meta-ads-follow-up-tracking",
  "/growth/website-lead-capture-funnel",
  "/platforms/facebook",
  "/offers/quick-look",
  "/offers/power-bundle",
];

function walk(dir, predicate, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(target, predicate, output);
    } else if (predicate(target)) {
      output.push(target);
    }
  }
  return output;
}

function routeFromFile(file) {
  const relativeDir = path.relative(appDir, path.dirname(file));
  if (!relativeDir) return "/";
  return `/${relativeDir.split(path.sep).join("/")}`;
}

function normalizeHref(href) {
  return href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
}

function routeMatches(target, route) {
  const targetParts = target.split("/").filter(Boolean);
  const routeParts = route.split("/").filter(Boolean);
  if (targetParts.length !== routeParts.length) return false;

  return routeParts.every((routePart, index) => {
    return /^\[[^\]]+\]$/.test(routePart) || routePart === targetParts[index];
  });
}

function routeExists(target, routes) {
  return routes.some((route) => routeMatches(normalizeHref(target), route));
}

const pageFiles = walk(appDir, (file) => /\/page\.tsx?$/.test(file));
const routeFiles = walk(appDir, (file) => /\/route\.tsx?$/.test(file));
const routes = [...new Set([...pageFiles, ...routeFiles].map(routeFromFile))].sort();
const sourceFiles = walk(srcDir, (file) => /\.(tsx|ts)$/.test(file));

const hrefs = [];
const externalLinks = [];
const stripeLinks = [];
const mailtoLinks = [];
const telLinks = [];
const staticHrefPatterns = [
  /href\s*=\s*['"]([^'"`{}\s]+)['"]/g,
  /href\s*=\s*\{\s*['"]([^'"`{}\s]+)['"]\s*\}/g,
  /router\.push\(\s*['"]([^'"`{}\s]+)['"]\s*\)/g,
];

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of staticHrefPatterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const raw = match[1];
      const item = { raw, clean: normalizeHref(raw), file: path.relative(root, file) };
      if (raw.startsWith("mailto:")) mailtoLinks.push(item);
      else if (raw.startsWith("tel:") || raw.startsWith("sms:")) telLinks.push(item);
      else if (/^https?:\/\//i.test(raw)) {
        externalLinks.push(item);
        if (raw.includes("buy.stripe.com")) stripeLinks.push(item);
      } else if (raw.startsWith("/")) {
        hrefs.push(item);
      }
    }
  }
}

const missingStaticTargets = hrefs.filter((href) => !routeExists(href.clean, routes));
const missingExpectedRoutes = expectedRoutes.filter((route) => !routeExists(route, routes));
const routeCounts = new Map();
for (const route of routes) routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
const duplicateRoutes = [...routeCounts.entries()].filter(([, count]) => count > 1);

const blankPages = [];
for (const route of expectedRoutes) {
  const matchingPage = pageFiles.find((file) => routeMatches(route, routeFromFile(file)));
  if (!matchingPage) continue;
  const text = fs.readFileSync(matchingPage, "utf8");
  if (text.trim().length < 220) {
    blankPages.push({ route, file: path.relative(root, matchingPage), reason: "page source is very small" });
  }
  if (route === "/login" && !text.includes("Client portal access is loading")) {
    blankPages.push({ route, file: path.relative(root, matchingPage), reason: "login fallback copy missing" });
  }
}

const ctaMismatches = [];
const organicFile = path.join(root, "src", "lib", "organic-growth.ts");
if (fs.existsSync(organicFile)) {
  const text = fs.readFileSync(organicFile, "utf8");
  const objectMatches = text.match(/\{[\s\S]*?secondaryCta:\s*"[^"]+"[\s\S]*?secondaryHref:\s*"[^"]+"[\s\S]*?\}/g) || [];
  for (const block of objectMatches) {
    const cta = block.match(/secondaryCta:\s*"([^"]+)"/)?.[1] || "";
    const href = block.match(/secondaryHref:\s*"([^"]+)"/)?.[1] || "";
    if (/\bbook\b/i.test(cta) && !href.startsWith("/book")) {
      ctaMismatches.push({ cta, href, file: "src/lib/organic-growth.ts" });
    }
    if (/proof/i.test(cta) && !href.startsWith("/proof")) {
      ctaMismatches.push({ cta, href, file: "src/lib/organic-growth.ts" });
    }
    if (/autopsy/i.test(cta) && !href.startsWith("/tools/ad-account-autopsy")) {
      ctaMismatches.push({ cta, href, file: "src/lib/organic-growth.ts" });
    }
  }
}

function list(items, empty = "None") {
  if (!items.length) return `- ${empty}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function linkRows(items) {
  if (!items.length) return "- None";
  return items
    .slice(0, 80)
    .map((item) => `- \`${item.raw}\` in \`${item.file}\``)
    .join("\n");
}

const failures = [
  ...missingExpectedRoutes.map((route) => `missing expected route ${route}`),
  ...missingStaticTargets.map((item) => `missing static target ${item.clean} from ${item.file}`),
  ...blankPages.map((item) => `blank page risk ${item.route} in ${item.file}`),
  ...ctaMismatches.map((item) => `CTA mismatch ${item.cta} -> ${item.href}`),
];

const markdown = `# Paid Traffic Link Audit

Generated: ${new Date().toISOString()}

## Summary

- Static internal hrefs checked: ${hrefs.length}
- App/API targets available: ${routes.length}
- Expected paid-traffic routes checked: ${expectedRoutes.length}
- Missing expected routes: ${missingExpectedRoutes.length}
- Missing static targets: ${missingStaticTargets.length}
- Blank page risks: ${blankPages.length}
- Duplicate routes: ${duplicateRoutes.length}
- CTA label mismatches: ${ctaMismatches.length}
- External links found: ${externalLinks.length}
- Stripe links found: ${stripeLinks.length}
- Mail links found: ${mailtoLinks.length}
- Phone/SMS links found: ${telLinks.length}

## Expected Route Map

${list(expectedRoutes.map((route) => `${route} - ${routeExists(route, routes) ? "OK" : "MISSING"}`))}

## Missing Static Targets

${linkRows(missingStaticTargets)}

## Blank Page Risks

${blankPages.length ? blankPages.map((item) => `- \`${item.route}\` in \`${item.file}\`: ${item.reason}`).join("\n") : "- None"}

## CTA Label Mismatches

${ctaMismatches.length ? ctaMismatches.map((item) => `- \`${item.cta}\` points to \`${item.href}\` in \`${item.file}\``).join("\n") : "- None"}

## Duplicate Routes

${duplicateRoutes.length ? duplicateRoutes.map(([route, count]) => `- \`${route}\`: ${count}`).join("\n") : "- None"}

## External Links

${linkRows(externalLinks)}

## Stripe Links

${linkRows(stripeLinks)}

## Mailto Links

${linkRows(mailtoLinks)}

## Tel/SMS Links

${linkRows(telLinks)}
`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, markdown);
console.log(`Wrote ${path.relative(root, reportPath)}`);

if (failures.length) {
  console.error("Paid traffic link audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Paid traffic link audit passed");

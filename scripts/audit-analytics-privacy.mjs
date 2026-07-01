import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = execFileSync("git", ["ls-files", "src"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));

const allowedImports = new Set([
  "src/lib/events/track-event.ts",
  "src/lib/analytics-taxonomy.ts",
  "src/components/site/LeadFlowVercelAnalytics.tsx",
  "src/app/layout.tsx",
]);

const blocked = [];

for (const file of files) {
  const text = readFileSync(join(root, file), "utf8");
  const importsVercelAnalytics = /from\s+["']@vercel\/analytics["']/.test(text);
  const importsVercelAnalyticsNext = /from\s+["']@vercel\/analytics\/next["']/.test(text);
  const importsSpeedInsights = /from\s+["']@vercel\/speed-insights\/next["']/.test(text);
  const hasRawTrackCall = /\btrack\s*\(/.test(text);
  const shouldAllow = allowedImports.has(file);

  if (importsVercelAnalytics && !shouldAllow) {
    blocked.push(`${file}: direct @vercel/analytics import. Use @/lib/events trackEvent.`);
  }

  if (hasRawTrackCall && !shouldAllow) {
    blocked.push(`${file}: raw track() call. Use @/lib/events trackEvent.`);
  }

  if ((importsVercelAnalyticsNext || importsSpeedInsights) && !shouldAllow) {
    blocked.push(`${file}: analytics provider import must be reviewed before adding.`);
  }
}

if (blocked.length > 0) {
  console.error("Analytics privacy audit failed:");
  for (const finding of blocked) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Analytics privacy audit passed across ${files.length} files from ${relative(root, join(root, "src"))}.`);

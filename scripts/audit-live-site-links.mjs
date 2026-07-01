import fs from "node:fs";

const BASE_URL = process.env.LEADFLOW_AUDIT_BASE_URL || "https://www.theleadflowpro.com";
const MAX_PAGES = Number(process.env.LEADFLOW_AUDIT_MAX_PAGES || 500);
const REQUEST_TIMEOUT_MS = Number(process.env.LEADFLOW_AUDIT_TIMEOUT_MS || 15000);

const requiredRoutes = [
  "/",
  "/buy-leads",
  "/marketplace",
  "/build-my-system",
  "/tools",
  "/submit-source",
  "/profile-model",
  "/privacy-center",
  "/custom-sourcing",
  "/widgets",
  "/civic",
  "/civic/issue-pulse",
  "/civic/districts",
  "/civic/surveys",
  "/industries",
  "/industries/ecommerce-leads",
  "/industries/real-estate-leads",
  "/industries/mortgage-leads",
  "/industries/va-irrrl-leads",
  "/industries/home-service-leads",
  "/industries/contractor-leads",
  "/industries/dental-marketing-leads",
  "/industries/legal-leads",
  "/industries/ai-saas-leads",
  "/industries/local-business-leads",
  "/industries/political-data-and-issue-signals",
  "/industries/creator-audience-leads",
  "/login",
  "/buyer",
  "/buyer/requests",
  "/buyer/watchlist",
  "/buyer/access",
  "/buyer/samples",
  "/buyer/orders",
  "/buyer/exports",
  "/buyer/integrations",
  "/buyer/recommendations",
  "/buyer/custom-requests",
  "/partner",
  "/partner/login",
  "/partner/sources",
  "/partner/submissions",
  "/partner/earnings",
  "/partner/settings",
  "/builder",
  "/builder/new",
  "/dashboard",
  "/dashboard/segments",
  "/dashboard/partners",
  "/dashboard/samples",
  "/dashboard/exclusive",
  "/dashboard/orders",
  "/dashboard/integrations",
  "/dashboard/widgets",
  "/dashboard/civic",
  "/dashboard/questionnaires",
  "/dashboard/product-factory",
  "/dashboard/buyer-matching",
  "/dashboard/custom-requests",
  "/dashboard/ops",
  "/dashboard/exports",
  "/contact",
  "/legal",
  "/privacy-policy",
  "/terms",
  "/refunds",
];

const forbiddenText = ["DeleteFlowPro", "Delete Flow Pro", "FSBO.com", "trust me bro"];
const suspiciousHrefPatterns = [/deleteflow/i, /fsbo/i, /localhost/i, /127\.0\.0\.1/i];

const crawlSeed = [...requiredRoutes];
const visited = new Map();
const failures = [];
const warnings = [];
const discoveredLinks = new Map();

function normalizeUrl(input, base = BASE_URL) {
  try {
    const url = new URL(input, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin !== new URL(BASE_URL).origin) return null;
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function pathFromUrl(input) {
  const url = new URL(input);
  return `${url.pathname}${url.search}`;
}

function stripQuery(input) {
  const url = new URL(input);
  return url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
}

function extractHrefs(html) {
  const hrefs = [];
  const pattern = /\s(?:href|src)=["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html))) hrefs.push(match[1]);
  return hrefs;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  return match ? decodeEntities(match[1].replace(/\s+/g, " ").trim()) : "";
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "LeadFlowProLinkAudit/1.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function shouldCrawl(url, contentType) {
  if (!contentType.includes("text/html")) return false;
  const path = stripQuery(url);
  if (path.startsWith("/api/")) return false;
  if (path.includes("/opengraph-image") || path.includes("/twitter-image")) return false;
  return true;
}

async function auditUrl(url, source = "seed") {
  if (visited.has(url)) return;
  visited.set(url, { status: "pending", source });

  let response;
  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    failures.push({ url, source, issue: `request_failed:${error instanceof Error ? error.message : String(error)}` });
    visited.set(url, { status: "failed", source });
    return;
  }

  const contentType = response.headers.get("content-type") || "";
  const finalUrl = response.url || url;
  const page = { status: response.status, finalUrl, contentType, source, title: "" };
  visited.set(url, page);

  if (response.status >= 400) {
    failures.push({ url, source, status: response.status, finalUrl });
    return;
  }

  if (!shouldCrawl(finalUrl, contentType)) return;

  const html = await response.text();
  page.title = extractTitle(html);

  for (const text of forbiddenText) {
    if (html.includes(text)) failures.push({ url, source, issue: `forbidden_text:${text}` });
  }

  const hrefs = extractHrefs(html);
  discoveredLinks.set(url, hrefs);

  for (const href of hrefs) {
    if (/^(mailto|tel|sms):/i.test(href) || href.startsWith("#") || href.startsWith("data:")) continue;
    for (const pattern of suspiciousHrefPatterns) {
      if (pattern.test(href)) warnings.push({ url, href, issue: `suspicious_href:${pattern}` });
    }

    const normalized = normalizeUrl(href, finalUrl);
    if (!normalized) continue;
    const path = stripQuery(normalized);
    if (path.startsWith("/_next/") || path.startsWith("/favicon") || path.startsWith("/site.webmanifest")) continue;
    if (visited.size + crawlSeed.length < MAX_PAGES && !visited.has(normalized)) crawlSeed.push(pathFromUrl(normalized));
  }
}

for (let index = 0; index < crawlSeed.length && visited.size < MAX_PAGES; index += 1) {
  const url = normalizeUrl(crawlSeed[index]);
  if (!url) continue;
  await auditUrl(url, index < requiredRoutes.length ? "required" : "discovered");
}

const requiredMissing = requiredRoutes
  .map((route) => normalizeUrl(route))
  .filter((url) => url && (!visited.has(url) || visited.get(url)?.status >= 400));

const report = [
  "# LeadFlow Pro live link audit",
  "",
  `Base URL: ${BASE_URL}`,
  `Checked at: ${new Date().toISOString()}`,
  `Pages checked: ${visited.size}`,
  `Required routes: ${requiredRoutes.length}`,
  `Failures: ${failures.length}`,
  `Warnings: ${warnings.length}`,
  "",
  "## Checked pages",
  "",
  ...[...visited.entries()].map(([url, page]) => `- ${page.status || "unknown"} ${url}${page.finalUrl && page.finalUrl !== url ? ` -> ${page.finalUrl}` : ""}${page.title ? ` | ${page.title}` : ""}`),
  "",
  "## Failures",
  "",
  ...(failures.length ? failures.map((failure) => `- ${JSON.stringify(failure)}`) : ["None"]),
  "",
  "## Warnings",
  "",
  ...(warnings.length ? warnings.map((warning) => `- ${JSON.stringify(warning)}`) : ["None"]),
  "",
  "## Required missing",
  "",
  ...(requiredMissing.length ? requiredMissing.map((url) => `- ${url}`) : ["None"]),
  "",
];

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/live-link-audit.md", `${report.join("\n")}\n`);

console.log(`Live pages checked: ${visited.size}`);
console.log(`Failures: ${failures.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log("Wrote reports/live-link-audit.md");

if (failures.length > 0 || requiredMissing.length > 0) process.exit(1);

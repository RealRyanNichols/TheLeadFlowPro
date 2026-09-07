// Run with Node's type stripping and ./scripts/register-ts.mjs. See the runbook.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { TOOL_BUSINESS_ARTICLES } from "../lib/articles-tool-business.ts";
import { TOOL_GENERATOR_ARTICLES } from "../lib/articles-tool-generators.ts";
import { TOOL_HOUSEHOLD_ARTICLES } from "../lib/articles-tool-household.ts";
import { articleDownload } from "../lib/articleDownload.ts";

const SITE = "https://www.theleadflowpro.com";
const PLAN = "docs/tool-article-coverage-plan-2026-09-06.json";
export const BATCH = [
  ...TOOL_BUSINESS_ARTICLES,
  ...TOOL_GENERATOR_ARTICLES,
  ...TOOL_HOUSEHOLD_ARTICLES,
];
const sha = (value) => createHash("sha256").update(value).digest("hex");
export const batchFingerprint = () =>
  sha(JSON.stringify(BATCH.map((a) => [a.slug, articleDownload(a)])));
const head = () =>
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const unescape = (value = "") =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const attrs = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=(["'])([\s\S]*?)\2/g)].map((m) => [
      m[1],
      unescape(m[3]),
    ]),
  );
const tags = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map((m) =>
    attrs(m[0]),
  );
const hasLink = (html, pathname) =>
  tags(html, "a").some(
    (a) => a.href === pathname || a.href === SITE + pathname,
  );

async function checkSource() {
  const plan = JSON.parse(await readFile(PLAN, "utf8"));
  assert.equal(BATCH.length, 45);
  assert.equal(new Set(BATCH.map((a) => a.slug)).size, 45);
  for (const a of BATCH) {
    assert.equal(a.publishedAt, "2026-09-06", a.slug);
    const brief = plan.briefs.find((b) => b.queueSlug === a.slug);
    assert.equal(brief?.tool, a.tool?.slug, a.slug);
    assert.equal(brief?.proposedTitle, a.title, a.slug);
  }
}

async function get(pathname) {
  const response = await fetch(SITE + pathname, {
    redirect: "manual",
    signal: AbortSignal.timeout(45000),
    headers: { "User-Agent": "LeadFlow-publication-verification/1.0" },
  });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

export function validateLiveReport(
  report,
  { now = new Date(), expectedCommit = head() } = {},
) {
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.site, SITE);
  assert.equal(report.allPassed, true, "Live verification did not pass");
  assert.equal(
    report.sourceFingerprint,
    batchFingerprint(),
    "Article source changed after verification",
  );
  assert.equal(
    report.contentCommit,
    expectedCommit,
    "Checked content commit is not the current checkout",
  );
  const age = now.valueOf() - Date.parse(report.completedAt);
  assert.ok(
    Number.isFinite(age) && age >= 0 && age < 86400000,
    "Report must be less than 24 hours old",
  );
  assert.equal(report.rows?.length, 45);
  assert.equal(new Set(report.rows.map((r) => r.slug)).size, 45);
  assert.equal(new Set(report.rows.map((r) => r.ogSha256)).size, 45);
  for (const a of BATCH) {
    const row = report.rows.find((r) => r.slug === a.slug);
    assert.ok(row, a.slug);
    for (const key of [
      "bodyVerified",
      "canonicalVerified",
      "metadataVerified",
      "toolLinkPresent",
      "indexPresent",
      "sitemapPresent",
      "ogVerified",
    ])
      assert.equal(row[key], true, `${a.slug}: ${key}`);
    assert.equal(row.httpStatus, 200, a.slug);
    assert.equal(row.downloadStatus, 200, a.slug);
    assert.equal(row.ogStatus, 200, a.slug);
    assert.equal(row.noindex, false, a.slug);
    assert.equal(row.downloadSha256, sha(articleDownload(a)), a.slug);
    assert.equal(row.url, SITE + "/articles/" + a.slug, a.slug);
  }
}

async function verify(options) {
  const startedAt = new Date().toISOString();
  const contentCommit = options["content-commit"] || head();
  assert.equal(
    contentCommit,
    head(),
    "Use the checkout containing the deployed content",
  );
  const [index, sitemap] = await Promise.all([
    get("/articles"),
    get("/sitemap.xml"),
  ]);
  const indexHtml = index.bytes.toString(),
    sitemapXml = sitemap.bytes.toString();
  const rows = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (cursor < BATCH.length) {
        const article = BATCH[cursor++],
          pathname = "/articles/" + article.slug;
        const row = {
          slug: article.slug,
          url: SITE + pathname,
          checkedAt: new Date().toISOString(),
        };
        try {
          const [detail, download, og] = await Promise.all([
            get(pathname),
            get(pathname + "/download"),
            get(pathname + "/opengraph-image"),
          ]);
          Object.assign(row, {
            httpStatus: detail.status,
            downloadStatus: download.status,
            ogStatus: og.status,
          });
          const html = detail.bytes.toString(),
            meta = tags(html, "meta"),
            links = tags(html, "link");
          const ogInfo = await sharp(og.bytes).metadata();
          const ld = [
            ...html.matchAll(
              /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
            ),
          ].flatMap((m) => {
            try {
              return [JSON.parse(m[1])];
            } catch {
              return [];
            }
          });
          Object.assign(row, {
            httpStatus: detail.status,
            downloadStatus: download.status,
            ogStatus: og.status,
            bodyVerified:
              download.bytes.toString() === articleDownload(article),
            downloadSha256: sha(download.bytes),
            canonicalVerified: links.some(
              (l) => l.rel === "canonical" && l.href === row.url,
            ),
            metadataVerified:
              meta.some(
                (m) => m.property === "og:title" && m.content === article.title,
              ) &&
              meta.some(
                (m) =>
                  m.property === "og:image" &&
                  new URL(m.content, SITE).pathname ===
                    pathname + "/opengraph-image",
              ) &&
              ld.some(
                (data) =>
                  data["@type"] === "Article" &&
                  data.headline === article.title &&
                  data.datePublished === article.publishedAt,
              ),
            noindex:
              /noindex/i.test(detail.headers["x-robots-tag"] || "") ||
              meta.some(
                (m) =>
                  ["robots", "googlebot"].includes(m.name) &&
                  /noindex/i.test(m.content),
              ),
            toolLinkPresent: hasLink(html, "/tools/" + article.tool.slug),
            indexPresent: index.status === 200 && hasLink(indexHtml, pathname),
            sitemapPresent:
              sitemap.status === 200 &&
              sitemapXml.includes("<loc>" + row.url + "</loc>"),
            ogVerified:
              ogInfo.format === "png" &&
              ogInfo.width === 1200 &&
              ogInfo.height === 630,
            ogWidth: ogInfo.width,
            ogHeight: ogInfo.height,
            ogSha256: sha(og.bytes),
          });
        } catch (error) {
          row.error = error.message;
        }
        rows.push(row);
        console.log(
          `${rows.length}/45 ${article.slug} ${row.error || row.httpStatus}`,
        );
      }
    }),
  );
  rows.sort(
    (a, b) =>
      BATCH.findIndex((v) => v.slug === a.slug) -
      BATCH.findIndex((v) => v.slug === b.slug),
  );
  const report = {
    schemaVersion: 1,
    site: SITE,
    startedAt,
    completedAt: new Date().toISOString(),
    contentCommit,
    sourceFingerprint: batchFingerprint(),
    count: 45,
    indexStatus: index.status,
    sitemapStatus: sitemap.status,
    allPassed: true,
    rows,
  };
  if (
    options["deployment-id"] ||
    options["deployment-url"] ||
    options["deployment-ready-at"]
  ) {
    assert.match(options["deployment-id"] || "", /^dpl_[A-Za-z0-9]+$/);
    const url = new URL(options["deployment-url"]);
    assert.equal(url.protocol, "https:");
    assert.ok(url.hostname.endsWith(".vercel.app") && !url.search && !url.hash);
    assert.ok(Number.isFinite(Date.parse(options["deployment-ready-at"])));
    report.deployment = {
      id: options["deployment-id"],
      url: url.href,
      status: "READY",
      verifiedAt: options["deployment-ready-at"],
    };
    report.deploymentEvidenceMethod =
      "Deployment id, READY time, URL and matching content commit independently checked by the operator before invocation; this script checks the public production content.";
  }
  try {
    validateLiveReport(report);
  } catch (error) {
    report.allPassed = false;
    report.failure = error.message;
  }
  await writeFile(options.report, JSON.stringify(report, null, 2) + "\n");
  console.log(`${report.allPassed ? "PASS" : "FAIL"}: ${options.report}`);
  if (!report.allPassed) process.exitCode = 1;
}

async function mark(options) {
  const report = JSON.parse(await readFile(options.report, "utf8"));
  validateLiveReport(report);
  assert.equal(
    report.deployment?.status,
    "READY",
    "Verified deployment evidence is required",
  );
  assert.match(report.deployment.id, /^dpl_[A-Za-z0-9]+$/);
  const queuePath = "content/article-queue.json",
    queue = JSON.parse(await readFile(queuePath, "utf8"));
  const receiptDir = "content/article-publications",
    writes = [];
  for (const article of BATCH) {
    const entries = queue.queue.filter((q) => q.slug === article.slug);
    assert.equal(entries.length, 1, article.slug);
    assert.ok(
      ["scheduled", "published"].includes(entries[0].status),
      article.slug,
    );
    const file = path.join(
      receiptDir,
      article.publishedAt + "-" + article.slug + ".json",
    );
    let receipt = {};
    try {
      receipt = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (receipt.slug) assert.equal(receipt.slug, article.slug);
    if (receipt.liveCheck)
      receipt.previousLiveChecks = [
        ...(receipt.previousLiveChecks || []),
        {
          contentCommit: receipt.contentCommit,
          deployment: receipt.deployment,
          liveCheck: receipt.liveCheck,
        },
      ];
    const row = report.rows.find((r) => r.slug === article.slug);
    Object.assign(receipt, {
      schemaVersion: 1,
      slug: article.slug,
      publicationDate: article.publishedAt,
      contentCommit: report.contentCommit,
      deployment: report.deployment,
      liveCheck: {
        ...row,
        reportCompletedAt: report.completedAt,
        sourceFingerprint: report.sourceFingerprint,
      },
    });
    writes.push([file, JSON.stringify(receipt, null, 2) + "\n"]);
    entries[0].status = "published";
  }
  const plan = JSON.parse(await readFile(PLAN, "utf8"));
  plan.status = "published-live-verified";
  plan.liveVerifiedAt = report.completedAt;
  plan.verifiedContentCommit = report.contentCommit;
  plan.scheduling =
    "All 45 September 6 tool guides were verified on the production site, including full downloads, canonical metadata, index, sitemap and distinct social images. Existing daily article dates and unrelated queue entries are preserved.";
  for (const brief of plan.briefs)
    if (BATCH.some((a) => a.slug === brief.queueSlug))
      brief.status = "published-live-verified";
  queue._readme = queue._readme.map((line) =>
    line.startsWith(
      "The September 6, 2026 tool-guide batch was explicitly authorized",
    )
      ? `The September 6, 2026 tool-guide batch contains 45 guides verified live at ${report.completedAt}. Existing September 7 and 8 daily dates are preserved.`
      : line,
  );
  console.log(
    `${options.apply ? "Applying" : "DRY RUN:"} 45 verified receipts, 45 queue statuses and the coverage-plan receipt. Other daily entries are preserved.`,
  );
  if (!options.apply) return;
  await mkdir(receiptDir, { recursive: true });
  for (const [file, data] of writes) await writeFile(file, data);
  await writeFile(queuePath, JSON.stringify(queue, null, 2) + "\n");
  await writeFile(PLAN, JSON.stringify(plan, null, 2) + "\n");
}

export async function main(argv = process.argv.slice(2)) {
  const mode = argv[0] || "list",
    options = { report: "/tmp/leadflow-45-guides-live.json" };
  for (const arg of argv.slice(1)) {
    if (arg === "--apply") options.apply = true;
    else {
      const m = arg.match(/^--([a-z-]+)=(.+)$/);
      assert.ok(m, `Unknown argument: ${arg}`);
      options[m[1]] = m[2];
    }
  }
  await checkSource();
  if (mode === "list") console.log(BATCH.map((a) => a.slug).join("\n"));
  else if (mode === "verify") await verify(options);
  else if (mode === "mark") await mark(options);
  else
    throw new Error(
      "Use list, verify, or mark. Mark is a dry run unless --apply is explicit.",
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

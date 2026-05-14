import { prisma } from "@/lib/prisma";

type AuditInput = {
  intakeId?: string | null;
  visitorId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  businessName?: string | null;
  businessUrl?: string | null;
  industry?: string | null;
  source: string;
  landingPage: string;
  pain?: string | null;
  currentLeadSource?: string | null;
  responseTime?: string | null;
  leakConcern?: string | null;
  monthlyRevenueRange?: string | null;
};

export type LeadAuditReport = {
  id: string;
  publicId: string;
  intakeId: string | null;
  visitorId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  businessUrl: string | null;
  industry: string | null;
  source: string | null;
  landingPage: string | null;
  status: string;
  scoreTotal: number;
  websiteScore: number;
  followupScore: number;
  localVisibilityScore: number;
  proofTrustScore: number;
  speedSeoScore: number;
  recommendedOffer: string | null;
  publicSummary: string | null;
  outreachScript: string | null;
  firstThreeFixes: string[];
  findings: AuditFinding[];
  crawlerSnapshot: WebsiteSnapshot | null;
  pageSpeedSnapshot: PageSpeedSnapshot | null;
  aiDiagnosis: AiAuditDiagnosis | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuditFinding = {
  area: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  fix: string;
};

type WebsiteSnapshot = {
  url: string | null;
  reachable: boolean;
  status: number | null;
  finalUrl: string | null;
  title: string | null;
  description: string | null;
  canonical: string | null;
  h1: string[];
  h2: string[];
  ctas: string[];
  forms: number;
  phoneLinks: string[];
  emailLinks: string[];
  internalLinks: number;
  externalLinks: number;
  hasHttps: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasJsonLd: boolean;
  wordCount: number;
  proofSignals: string[];
  error?: string;
};

type PageSpeedSnapshot = {
  status: "ok" | "skipped" | "failed";
  reason?: string;
  performanceScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  fetchTime?: string;
  finalUrl?: string;
};

type AiAuditDiagnosis = {
  publicSummary: string;
  recommendedOffer: string;
  firstThreeFixes: string[];
  outreachScript: string;
  findings: AuditFinding[];
};

type ProofDraft = {
  id: string;
  reportId: string | null;
  title: string;
  slug: string;
  status: string;
  summary: string;
  beforeState: string;
  afterState: string;
  proofBullets: string[];
  socialPost: string;
  adAngle: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProspectRadarInput = {
  city: string;
  niche: string;
  state?: string | null;
};

type ProspectSeed = {
  businessName: string;
  website: string | null;
  phone: string | null;
  sourceUrl: string | null;
  leakSignals: string[];
  score: number;
};

let leadIntelligenceReady = false;

function j(value: unknown) {
  return JSON.stringify(value ?? null);
}

function cleanText(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanLong(value: unknown, max = 4000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function normalizeAuditUrl(value: string | null | undefined) {
  const raw = cleanText(value, 300);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function publicId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 18);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html: string, pattern: RegExp) {
  return decodeHtml(html.match(pattern)?.[1] ?? "") || null;
}

function allMatches(html: string, pattern: RegExp, limit = 20) {
  return [...html.matchAll(pattern)]
    .map((match) => decodeHtml((match[1] || match[2] || "").replace(/<[^>]*>/g, " ")))
    .filter(Boolean)
    .slice(0, limit);
}

function countMatches(html: string, pattern: RegExp) {
  return [...html.matchAll(pattern)].length;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 LeadFlowProAudit/1.0 (+https://www.theleadflowpro.com/lead-leak-audit)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureLeadIntelligenceTables() {
  if (leadIntelligenceReady) return;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LeadAuditReport" (
      "id" TEXT PRIMARY KEY,
      "publicId" TEXT NOT NULL UNIQUE,
      "intakeId" TEXT,
      "visitorId" TEXT,
      "fullName" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "businessName" TEXT,
      "businessUrl" TEXT,
      "industry" TEXT,
      "source" TEXT,
      "landingPage" TEXT,
      "status" TEXT NOT NULL DEFAULT 'new',
      "scoreTotal" INTEGER NOT NULL DEFAULT 0,
      "websiteScore" INTEGER NOT NULL DEFAULT 0,
      "followupScore" INTEGER NOT NULL DEFAULT 0,
      "localVisibilityScore" INTEGER NOT NULL DEFAULT 0,
      "proofTrustScore" INTEGER NOT NULL DEFAULT 0,
      "speedSeoScore" INTEGER NOT NULL DEFAULT 0,
      "recommendedOffer" TEXT,
      "publicSummary" TEXT,
      "outreachScript" TEXT,
      "firstThreeFixes" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "findings" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "crawlerSnapshot" JSONB,
      "pageSpeedSnapshot" JSONB,
      "aiDiagnosis" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LeadOutreachItem" (
      "id" TEXT PRIMARY KEY,
      "reportId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ready',
      "channel" TEXT NOT NULL DEFAULT 'email',
      "priority" INTEGER NOT NULL DEFAULT 3,
      "opener" TEXT NOT NULL,
      "script" TEXT NOT NULL,
      "nextAction" TEXT NOT NULL,
      "dueAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProofAssetDraft" (
      "id" TEXT PRIMARY KEY,
      "reportId" TEXT,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "summary" TEXT NOT NULL,
      "beforeState" TEXT NOT NULL,
      "afterState" TEXT NOT NULL,
      "proofBullets" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "socialPost" TEXT NOT NULL,
      "adAngle" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LocalProspect" (
      "id" TEXT PRIMARY KEY,
      "city" TEXT NOT NULL,
      "state" TEXT,
      "niche" TEXT NOT NULL,
      "businessName" TEXT NOT NULL,
      "website" TEXT,
      "phone" TEXT,
      "sourceUrl" TEXT,
      "score" INTEGER NOT NULL DEFAULT 50,
      "leakSignals" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "status" TEXT NOT NULL DEFAULT 'new',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LeadAuditReport_createdAt_idx" ON "LeadAuditReport" ("createdAt" DESC)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LeadAuditReport_status_idx" ON "LeadAuditReport" ("status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LeadOutreachItem_status_idx" ON "LeadOutreachItem" ("status", "createdAt" DESC)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProofAssetDraft_createdAt_idx" ON "ProofAssetDraft" ("createdAt" DESC)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LocalProspect_city_niche_idx" ON "LocalProspect" ("city", "niche", "createdAt" DESC)`);

  leadIntelligenceReady = true;
}

export async function crawlWebsite(urlInput: string | null): Promise<WebsiteSnapshot | null> {
  const url = normalizeAuditUrl(urlInput);
  if (!url) return null;

  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const bodyText = decodeHtml(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    );
    const lower = html.toLowerCase();
    const ctas = allMatches(
      html,
      /<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi,
      60,
    ).filter((text) => /(book|call|quote|start|get|audit|contact|schedule|buy|apply|learn|demo|reserve|send)/i.test(text));
    const phoneLinks = allMatches(html, /href=["']tel:([^"']+)["']/gi, 10);
    const emailLinks = allMatches(html, /href=["']mailto:([^"']+)["']/gi, 10);
    const proofSignals = [
      /review|testimonial|stars|rated|google reviews/i.test(bodyText) ? "reviews/testimonials" : null,
      /case stud|before|after|results|portfolio|gallery/i.test(bodyText) ? "before/after or portfolio proof" : null,
      /licensed|certified|insured|years|family owned|veteran/i.test(bodyText) ? "trust credential language" : null,
      /faq|questions|financing|pricing|cost/i.test(bodyText) ? "buyer objection answers" : null,
    ].filter(Boolean) as string[];

    return {
      url,
      reachable: response.ok,
      status: response.status,
      finalUrl: response.url,
      title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description:
        firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ??
        firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i),
      canonical: firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i),
      h1: allMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 8),
      h2: allMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 12),
      ctas: [...new Set(ctas)].slice(0, 12),
      forms: countMatches(html, /<form\b/gi),
      phoneLinks,
      emailLinks,
      internalLinks: countMatches(html, /<a[^>]+href=["'](?:\/|#)/gi),
      externalLinks: countMatches(html, /<a[^>]+href=["']https?:\/\//gi),
      hasHttps: /^https:\/\//i.test(response.url || url),
      hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
      hasOpenGraph: /<meta[^>]+property=["']og:/i.test(html),
      hasJsonLd: /application\/ld\+json/i.test(lower),
      wordCount: bodyText.split(/\s+/).filter(Boolean).length,
      proofSignals,
    };
  } catch (error) {
    return {
      url,
      reachable: false,
      status: null,
      finalUrl: null,
      title: null,
      description: null,
      canonical: null,
      h1: [],
      h2: [],
      ctas: [],
      forms: 0,
      phoneLinks: [],
      emailLinks: [],
      internalLinks: 0,
      externalLinks: 0,
      hasHttps: /^https:\/\//i.test(url),
      hasViewport: false,
      hasOpenGraph: false,
      hasJsonLd: false,
      wordCount: 0,
      proofSignals: [],
      error: error instanceof Error ? error.message : "crawl failed",
    };
  }
}

export async function fetchPageSpeed(urlInput: string | null): Promise<PageSpeedSnapshot | null> {
  const url = normalizeAuditUrl(urlInput);
  if (!url) return null;

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "MOBILE");
  for (const category of ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]) {
    endpoint.searchParams.append("category", category);
  }
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (key) endpoint.searchParams.set("key", key);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return {
        status: "failed",
        reason: `PageSpeed HTTP ${response.status}`,
        performanceScore: null,
        seoScore: null,
        accessibilityScore: null,
        bestPracticesScore: null,
      };
    }
    const data: any = await response.json();
    const categories = data.lighthouseResult?.categories ?? {};
    const score = (name: string) =>
      typeof categories[name]?.score === "number" ? clamp(categories[name].score * 100) : null;
    return {
      status: "ok",
      performanceScore: score("performance"),
      seoScore: score("seo"),
      accessibilityScore: score("accessibility"),
      bestPracticesScore: score("best-practices"),
      fetchTime: data.lighthouseResult?.fetchTime,
      finalUrl: data.lighthouseResult?.finalUrl,
    };
  } catch (error) {
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "PageSpeed request failed",
      performanceScore: null,
      seoScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
    };
  }
}

function scoreFollowup(input: AuditInput) {
  const response = (input.responseTime || "").toLowerCase();
  let score = 48;
  if (/under 5/.test(response)) score += 32;
  else if (/5-30/.test(response)) score += 22;
  else if (/same day/.test(response)) score += 10;
  else if (/next day|depends|not sure/.test(response)) score -= 10;
  if (input.currentLeadSource && !/not sure/i.test(input.currentLeadSource)) score += 10;
  if (input.phone) score += 5;
  if (input.leakConcern) score += 5;
  return clamp(score);
}

function scoreWebsite(snapshot: WebsiteSnapshot | null) {
  if (!snapshot) return 35;
  let score = 0;
  if (snapshot.reachable) score += 12;
  if (snapshot.hasHttps) score += 10;
  if (snapshot.title && snapshot.title.length <= 70) score += 11;
  if (snapshot.description && snapshot.description.length >= 80 && snapshot.description.length <= 180) score += 12;
  if (snapshot.h1.length === 1) score += 12;
  else if (snapshot.h1.length > 1) score += 6;
  if (snapshot.ctas.length > 0) score += 14;
  if (snapshot.forms > 0) score += 12;
  if (snapshot.phoneLinks.length || snapshot.emailLinks.length) score += 8;
  if (snapshot.hasViewport) score += 5;
  if (snapshot.hasOpenGraph) score += 4;
  return clamp(score);
}

function scoreLocalVisibility(snapshot: WebsiteSnapshot | null, input: AuditInput) {
  let score = 42;
  const haystack = `${snapshot?.title ?? ""} ${snapshot?.description ?? ""} ${snapshot?.h1.join(" ") ?? ""}`.toLowerCase();
  if (/longview|east texas|texas|gregg county|harrison county/.test(haystack)) score += 22;
  if (snapshot?.hasJsonLd) score += 18;
  if (snapshot?.phoneLinks.length) score += 8;
  if (input.businessUrl) score += 5;
  if (input.industry) score += 5;
  return clamp(score);
}

function scoreProof(snapshot: WebsiteSnapshot | null) {
  if (!snapshot) return 30;
  let score = 38;
  score += snapshot.proofSignals.length * 14;
  if (snapshot.wordCount > 500) score += 8;
  if (snapshot.ctas.length > 1) score += 6;
  return clamp(score);
}

function scoreSpeedSeo(snapshot: WebsiteSnapshot | null, pageSpeed: PageSpeedSnapshot | null) {
  if (pageSpeed?.status === "ok") {
    const scores = [
      pageSpeed.performanceScore,
      pageSpeed.seoScore,
      pageSpeed.accessibilityScore,
      pageSpeed.bestPracticesScore,
    ].filter((n): n is number => typeof n === "number");
    if (scores.length) return clamp(scores.reduce((sum, n) => sum + n, 0) / scores.length);
  }
  let score = 42;
  if (snapshot?.hasViewport) score += 12;
  if (snapshot?.hasHttps) score += 12;
  if (snapshot?.description) score += 10;
  if (snapshot?.hasJsonLd) score += 10;
  if (snapshot?.hasOpenGraph) score += 6;
  return clamp(score);
}

function baseFindings(input: AuditInput, snapshot: WebsiteSnapshot | null, pageSpeed: PageSpeedSnapshot | null): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (!snapshot?.forms && !snapshot?.phoneLinks.length) {
    findings.push({
      area: "Lead capture",
      severity: "high",
      title: "The page may not make capture obvious.",
      detail: "The crawler did not find a form or click-to-call link on the checked page.",
      fix: "Put one clear audit, quote, booking, or callback CTA above the fold and repeat it near proof.",
    });
  }
  if (!snapshot?.ctas.length) {
    findings.push({
      area: "Conversion",
      severity: "high",
      title: "The next click is not clear enough.",
      detail: "Cold visitors need a direct action, not a menu of vague options.",
      fix: "Use one primary CTA tied to the buyer's problem.",
    });
  }
  if (!snapshot?.proofSignals.length) {
    findings.push({
      area: "Trust",
      severity: "medium",
      title: "Proof is thin or hard to detect.",
      detail: "The scan did not find obvious reviews, portfolio, before/after, case, or FAQ proof language.",
      fix: "Add proof blocks that answer why a cold buyer should trust the next step.",
    });
  }
  if (/next day|depends|not sure/i.test(input.responseTime || "")) {
    findings.push({
      area: "Follow-up",
      severity: "high",
      title: "First response is a sales risk.",
      detail: "Slow or inconsistent first response makes good leads look like bad traffic.",
      fix: "Add missed-call text-back, form confirmation, and a visible follow-up queue.",
    });
  }
  if (pageSpeed?.status === "ok" && (pageSpeed.performanceScore ?? 100) < 60) {
    findings.push({
      area: "Speed",
      severity: "medium",
      title: "Mobile performance may be costing cold traffic.",
      detail: `PageSpeed returned a mobile performance score of ${pageSpeed.performanceScore}.`,
      fix: "Compress media, reduce heavy scripts, and keep the lead CTA usable before everything loads.",
    });
  }
  if (!findings.length) {
    findings.push({
      area: "Scale path",
      severity: "low",
      title: "The basic path is visible. Now tighten the owner view.",
      detail: "The scan found enough public signals to start optimizing the follow-up system.",
      fix: "Connect source, status, follow-up, and booked/won outcomes in one owner dashboard.",
    });
  }
  return findings.slice(0, 6);
}

function chooseOffer(scores: {
  scoreTotal: number;
  websiteScore: number;
  followupScore: number;
  proofTrustScore: number;
}) {
  if (scores.websiteScore < 55) return "website-lead-capture-funnel";
  if (scores.followupScore < 60) return "missed-call-follow-up-system";
  if (scores.proofTrustScore < 60) return "proof-page-build";
  if (scores.scoreTotal < 72) return "lead-leak-audit";
  return "operator-dashboard";
}

function deterministicDiagnosis(input: AuditInput, snapshot: WebsiteSnapshot | null, pageSpeed: PageSpeedSnapshot | null): AiAuditDiagnosis {
  const websiteScore = scoreWebsite(snapshot);
  const followupScore = scoreFollowup(input);
  const localVisibilityScore = scoreLocalVisibility(snapshot, input);
  const proofTrustScore = scoreProof(snapshot);
  const speedSeoScore = scoreSpeedSeo(snapshot, pageSpeed);
  const scoreTotal = clamp((websiteScore + followupScore + localVisibilityScore + proofTrustScore + speedSeoScore) / 5);
  const findings = baseFindings(input, snapshot, pageSpeed);
  const firstThreeFixes = findings.slice(0, 3).map((finding) => finding.fix);
  const business = input.businessName || "the business";
  const recommendedOffer = chooseOffer({ scoreTotal, websiteScore, followupScore, proofTrustScore });

  return {
    publicSummary:
      `${business} has a visible lead path score of ${scoreTotal}/100. The first fix is ${findings[0]?.area.toLowerCase() || "lead capture"}: ${findings[0]?.fix || "make the next action clear and trackable"}`,
    recommendedOffer,
    firstThreeFixes,
    outreachScript:
      `I ran a quick lead leak read on ${business}. The biggest thing I would check before spending more on traffic is ${findings[0]?.title.toLowerCase() || "the lead capture path"}. If you want, I can show you the first three fixes and what I would build first.`,
    findings,
  };
}

async function aiDiagnosis(input: AuditInput, snapshot: WebsiteSnapshot | null, pageSpeed: PageSpeedSnapshot | null) {
  const fallback = deterministicDiagnosis(input, snapshot, pageSpeed);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system:
          "You are The LeadFlow Pro audit engine. Return only valid compact JSON. No markdown. No legal or revenue guarantees. Be direct, practical, and conversion-focused.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              task:
                "Diagnose this business lead leak and return publicSummary, recommendedOffer, firstThreeFixes, outreachScript, and findings[]. findings need area, severity, title, detail, fix.",
              input,
              crawlerSnapshot: snapshot,
              pageSpeedSnapshot: pageSpeed,
              fallback,
            }),
          },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const data: any = await response.json();
    const text = data.content?.find((part: any) => part.type === "text")?.text;
    if (!text) return fallback;
    const parsed = JSON.parse(text) as Partial<AiAuditDiagnosis>;
    return {
      publicSummary: cleanLong(parsed.publicSummary, 1200) ?? fallback.publicSummary,
      recommendedOffer: cleanText(parsed.recommendedOffer, 120) ?? fallback.recommendedOffer,
      firstThreeFixes: Array.isArray(parsed.firstThreeFixes) && parsed.firstThreeFixes.length
        ? parsed.firstThreeFixes.map((item) => cleanText(item, 300)).filter(Boolean).slice(0, 3) as string[]
        : fallback.firstThreeFixes,
      outreachScript: cleanLong(parsed.outreachScript, 1600) ?? fallback.outreachScript,
      findings: Array.isArray(parsed.findings) && parsed.findings.length
        ? parsed.findings.slice(0, 6).map((finding: any) => ({
            area: cleanText(finding.area, 80) ?? "Lead path",
            severity: ["high", "medium", "low"].includes(finding.severity) ? finding.severity : "medium",
            title: cleanText(finding.title, 160) ?? "Lead leak found",
            detail: cleanLong(finding.detail, 500) ?? "The audit found a conversion risk.",
            fix: cleanLong(finding.fix, 500) ?? "Make the next action clearer and trackable.",
          }))
        : fallback.findings,
    };
  } catch {
    return fallback;
  }
}

export async function createLeadAuditReport(input: AuditInput) {
  await ensureLeadIntelligenceTables();

  const crawlerSnapshot = await crawlWebsite(input.businessUrl ?? null);
  const pageSpeedSnapshot = await fetchPageSpeed(input.businessUrl ?? null);
  const diagnosis = await aiDiagnosis(input, crawlerSnapshot, pageSpeedSnapshot);

  const websiteScore = scoreWebsite(crawlerSnapshot);
  const followupScore = scoreFollowup(input);
  const localVisibilityScore = scoreLocalVisibility(crawlerSnapshot, input);
  const proofTrustScore = scoreProof(crawlerSnapshot);
  const speedSeoScore = scoreSpeedSeo(crawlerSnapshot, pageSpeedSnapshot);
  const scoreTotal = clamp((websiteScore + followupScore + localVisibilityScore + proofTrustScore + speedSeoScore) / 5);
  const id = crypto.randomUUID();
  const pid = publicId();

  await prisma.$executeRaw`
    INSERT INTO "LeadAuditReport" (
      "id", "publicId", "intakeId", "visitorId", "fullName", "email", "phone",
      "businessName", "businessUrl", "industry", "source", "landingPage", "status",
      "scoreTotal", "websiteScore", "followupScore", "localVisibilityScore",
      "proofTrustScore", "speedSeoScore", "recommendedOffer", "publicSummary",
      "outreachScript", "firstThreeFixes", "findings", "crawlerSnapshot",
      "pageSpeedSnapshot", "aiDiagnosis", "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${pid}, ${input.intakeId ?? null}, ${input.visitorId}, ${input.fullName}, ${input.email}, ${input.phone ?? null},
      ${input.businessName ?? null}, ${input.businessUrl ?? null}, ${input.industry ?? null}, ${input.source}, ${input.landingPage}, 'new',
      ${scoreTotal}, ${websiteScore}, ${followupScore}, ${localVisibilityScore},
      ${proofTrustScore}, ${speedSeoScore}, ${diagnosis.recommendedOffer}, ${diagnosis.publicSummary},
      ${diagnosis.outreachScript}, ${j(diagnosis.firstThreeFixes)}::jsonb, ${j(diagnosis.findings)}::jsonb,
      ${j(crawlerSnapshot)}::jsonb, ${j(pageSpeedSnapshot)}::jsonb, ${j(diagnosis)}::jsonb, NOW(), NOW()
    )
  `;

  await createOutreachItem({
    reportId: id,
    opener: `${input.businessName || input.fullName}: ${diagnosis.findings[0]?.title || "lead leak found"}`,
    script: diagnosis.outreachScript,
    nextAction: `Review report /audit/${pid}, then pitch ${diagnosis.recommendedOffer}.`,
    priority: scoreTotal < 60 ? 1 : scoreTotal < 75 ? 2 : 3,
  });

  const report = await getAuditReport(pid);
  if (!report) throw new Error("created audit report could not be loaded");
  return report;
}

export async function getAuditReport(publicIdInput: string) {
  await ensureLeadIntelligenceTables();
  const rows = await prisma.$queryRaw<LeadAuditReport[]>`
    SELECT *
    FROM "LeadAuditReport"
    WHERE "publicId" = ${publicIdInput}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listAuditReports(take = 50) {
  await ensureLeadIntelligenceTables();
  return prisma.$queryRaw<LeadAuditReport[]>`
    SELECT *
    FROM "LeadAuditReport"
    ORDER BY "createdAt" DESC
    LIMIT ${Math.min(Math.max(take, 1), 100)}
  `;
}

export async function createOutreachItem(input: {
  reportId?: string | null;
  opener: string;
  script: string;
  nextAction: string;
  priority?: number;
  channel?: string;
}) {
  await ensureLeadIntelligenceTables();
  const id = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "LeadOutreachItem" (
      "id", "reportId", "status", "channel", "priority", "opener", "script", "nextAction", "dueAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${input.reportId ?? null}, 'ready', ${input.channel ?? "email"}, ${input.priority ?? 3},
      ${input.opener}, ${input.script}, ${input.nextAction}, NOW(), NOW(), NOW()
    )
  `;
}

export async function listOutreachItems(take = 80) {
  await ensureLeadIntelligenceTables();
  return prisma.$queryRaw<Array<{
    id: string;
    reportId: string | null;
    status: string;
    channel: string;
    priority: number;
    opener: string;
    script: string;
    nextAction: string;
    dueAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    publicId: string | null;
    businessName: string | null;
    businessUrl: string | null;
    email: string | null;
    scoreTotal: number | null;
  }>>`
    SELECT
      o.*,
      r."publicId",
      r."businessName",
      r."businessUrl",
      r."email",
      r."scoreTotal"
    FROM "LeadOutreachItem" o
    LEFT JOIN "LeadAuditReport" r ON r."id" = o."reportId"
    ORDER BY o."status" ASC, o."priority" ASC, o."createdAt" DESC
    LIMIT ${Math.min(Math.max(take, 1), 120)}
  `;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || crypto.randomUUID().slice(0, 8);
}

export async function createProofDraftFromReport(publicIdInput: string) {
  const report = await getAuditReport(publicIdInput);
  if (!report) throw new Error("report not found");

  const title = `${report.businessName || report.fullName} lead leak proof draft`;
  const slug = `${slugify(report.businessName || report.fullName)}-${report.publicId.slice(0, 6)}`;
  const beforeState =
    report.findings?.[0]?.detail ??
    "The business had attention paths, but the lead capture and follow-up system needed to be made visible.";
  const afterState =
    report.firstThreeFixes?.[0] ??
    "Create a clearer lead capture path, a status board, and a follow-up rhythm the owner can see.";
  const proofBullets = [
    `Audit score: ${report.scoreTotal}/100`,
    `First fix: ${report.findings?.[0]?.title || "clarify the lead path"}`,
    `Recommended offer: ${report.recommendedOffer || "lead leak audit"}`,
  ];
  const summary =
    `${report.businessName || report.fullName} needs the same basic system most cold-traffic businesses need: source, capture, proof, response, status, and follow-up in one visible path.`;
  const socialPost =
    `Most businesses do not have a traffic problem first. They have a lead leak.\n\nI checked ${report.businessName || "a business"} and the first fix was: ${report.findings?.[0]?.fix || "make the next click and follow-up path obvious"}.\n\nThat is what The LeadFlow Pro is built to find.`;
  const adAngle =
    `Free Lead Leak Audit: find where calls, clicks, forms, and DMs are turning into lost money before buying more ads.`;

  await ensureLeadIntelligenceTables();
  await prisma.$executeRaw`
    INSERT INTO "ProofAssetDraft" (
      "id", "reportId", "title", "slug", "status", "summary", "beforeState",
      "afterState", "proofBullets", "socialPost", "adAngle", "createdAt", "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()}, ${report.id}, ${title}, ${slug}, 'draft', ${summary}, ${beforeState},
      ${afterState}, ${j(proofBullets)}::jsonb, ${socialPost}, ${adAngle}, NOW(), NOW()
    )
    ON CONFLICT ("slug") DO UPDATE SET
      "summary" = EXCLUDED."summary",
      "beforeState" = EXCLUDED."beforeState",
      "afterState" = EXCLUDED."afterState",
      "proofBullets" = EXCLUDED."proofBullets",
      "socialPost" = EXCLUDED."socialPost",
      "adAngle" = EXCLUDED."adAngle",
      "updatedAt" = NOW()
  `;

  const rows = await prisma.$queryRaw<ProofDraft[]>`
    SELECT *
    FROM "ProofAssetDraft"
    WHERE "slug" = ${slug}
    LIMIT 1
  `;
  return rows[0];
}

export async function listProofDrafts(take = 50) {
  await ensureLeadIntelligenceTables();
  return prisma.$queryRaw<ProofDraft[]>`
    SELECT *
    FROM "ProofAssetDraft"
    ORDER BY "createdAt" DESC
    LIMIT ${Math.min(Math.max(take, 1), 100)}
  `;
}

function prospectSearchUrls(input: ProspectRadarInput) {
  const place = `${input.city} ${input.state || ""}`.trim();
  const q = encodeURIComponent(`${input.niche} ${place}`);
  return [
    `https://www.google.com/search?q=${q}`,
    `https://www.google.com/maps/search/${q}`,
    `https://www.facebook.com/search/pages/?q=${q}`,
  ];
}

export async function runProspectRadar(input: ProspectRadarInput) {
  await ensureLeadIntelligenceTables();
  const city = cleanText(input.city, 120) ?? "Longview";
  const niche = cleanText(input.niche, 120) ?? "local business";
  const state = cleanText(input.state, 40) ?? "Texas";
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const prospects: ProspectSeed[] = [];

  if (apiKey) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
          "x-goog-fieldmask": "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri",
        },
        body: JSON.stringify({ textQuery: `${niche} in ${city}, ${state}`, pageSize: 8 }),
      });
      if (response.ok) {
        const data: any = await response.json();
        for (const place of data.places ?? []) {
          const website = cleanText(place.websiteUri, 300);
          prospects.push({
            businessName: cleanText(place.displayName?.text, 180) ?? `${niche} prospect`,
            website,
            phone: cleanText(place.nationalPhoneNumber, 60),
            sourceUrl: cleanText(place.googleMapsUri, 400),
            score: website ? 62 : 38,
            leakSignals: website
              ? ["Has website: run lead leak audit next", "Check CTA, form, speed, proof, and phone path"]
              : ["No website found in Places result", "Likely needs a stronger capture path"],
          });
        }
      }
    } catch {
      // Fall through to manual search links.
    }
  }

  if (!prospects.length) {
    prospects.push({
      businessName: `${niche} prospects in ${city}`,
      website: null,
      phone: null,
      sourceUrl: prospectSearchUrls({ city, niche, state })[0],
      score: 50,
      leakSignals: [
        "Connect GOOGLE_PLACES_API_KEY to auto-fill businesses",
        "Use the search links to seed the first manual outreach batch",
      ],
    });
  }

  for (const prospect of prospects) {
    await prisma.$executeRaw`
      INSERT INTO "LocalProspect" (
        "id", "city", "state", "niche", "businessName", "website", "phone", "sourceUrl",
        "score", "leakSignals", "status", "createdAt", "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()}, ${city}, ${state}, ${niche}, ${prospect.businessName},
        ${prospect.website}, ${prospect.phone}, ${prospect.sourceUrl}, ${prospect.score},
        ${j(prospect.leakSignals)}::jsonb, 'new', NOW(), NOW()
      )
    `;
  }

  return { city, state, niche, prospects, searchUrls: prospectSearchUrls({ city, niche, state }) };
}

export async function listProspects(take = 80) {
  await ensureLeadIntelligenceTables();
  return prisma.$queryRaw<Array<ProspectSeed & {
    id: string;
    city: string;
    state: string | null;
    niche: string;
    status: string;
    createdAt: Date;
  }>>`
    SELECT *
    FROM "LocalProspect"
    ORDER BY "createdAt" DESC
    LIMIT ${Math.min(Math.max(take, 1), 120)}
  `;
}

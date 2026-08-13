// Website grader engine. Server-side only (the API route imports this).
//
// Three ingredients, all honest:
//   1. Google's public PageSpeed Insights (Lighthouse) API — performance,
//      SEO, accessibility, best-practices scores and Core Web Vitals.
//   2. Our own HTML reality checks — search readiness (can Google understand
//      the page?) and lead readiness (can the site actually capture a lead?).
//   3. Nothing else. We cannot see another site's Google rankings without
//      their Search Console, so no "ranking" number is ever invented.
//
// Pure scoring/validation functions live here and are unit-tested.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// ---------------------------------------------------------------------------
// URL validation. Public http(s) URLs only — this endpoint fetches what a
// visitor typed, so private ranges, localhost, and IP literals are refused
// before any request leaves the server (SSRF guard).
// ---------------------------------------------------------------------------

const PRIVATE_V4 =
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|100\.(6[4-9]|[789]\d|1[01]\d|12[0-7])\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function isPrivateAddress(addr: string): boolean {
  const v = isIP(addr);
  if (v === 4) return PRIVATE_V4.test(addr);
  if (v === 6) {
    const low = addr.toLowerCase();
    return (
      low === "::1" || low === "::" ||
      low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80") ||
      low.startsWith("::ffff:") // v4-mapped — re-check the tail
    );
  }
  return false;
}

/** Normalizes user input to a safe public https URL, or returns an error. */
export function normalizeGradeUrl(input: string): { url?: string; host?: string; error?: string } {
  const raw = (input ?? "").trim().slice(0, 500);
  if (!raw) return { error: "Enter your website address." };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { error: "That doesn't look like a website address." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Only http(s) websites can be graded." };
  }
  if (parsed.username || parsed.password) {
    return { error: "That doesn't look like a website address." };
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return { error: "Enter a full domain, like example.com." };
  if (isIP(host)) return { error: "Enter a domain name, not an IP address." };
  if (
    host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal") ||
    host.endsWith(".test") || host.endsWith(".invalid")
  ) {
    return { error: "Enter a public website address." };
  }
  parsed.hash = "";
  parsed.search = "";
  return { url: parsed.toString(), host };
}

/** DNS check: every address the host resolves to must be public. */
export async function resolvesPublicly(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    if (addrs.length === 0) return false;
    return addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// HTML reality checks.
// ---------------------------------------------------------------------------

export type HtmlChecks = {
  https: boolean;
  title: boolean;
  meta_description: boolean;
  canonical: boolean;
  viewport: boolean;
  og_tags: boolean;
  json_ld: boolean;
  robots_txt: boolean;
  sitemap: boolean;
  has_form: boolean;
  has_tel_or_sms: boolean;
  has_analytics: boolean;
  has_cta: boolean;
};

export function analyzeHtml(html: string, isHttps: boolean): Omit<HtmlChecks, "robots_txt" | "sitemap"> {
  const h = html.slice(0, 400_000);
  return {
    https: isHttps,
    title: /<title[^>]*>[^<]{3,}<\/title>/i.test(h),
    meta_description: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(h)
      || /<meta[^>]+content=["'][^"']{20,}["'][^>]+name=["']description["']/i.test(h),
    canonical: /<link[^>]+rel=["']canonical["']/i.test(h),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(h),
    og_tags: /<meta[^>]+property=["']og:(title|image|description)["']/i.test(h),
    json_ld: /<script[^>]+application\/ld\+json/i.test(h),
    has_form: /<form[\s>]/i.test(h),
    has_tel_or_sms: /href=["'](tel:|sms:)/i.test(h),
    has_analytics:
      /gtag\(|googletagmanager\.com|google-analytics\.com|fbq\(|connect\.facebook\.net|plausible\.io|posthog|clarity\.ms|_vercel\/insights|cdn\.segment\.com|static\.hotjar\.com/i.test(h),
    has_cta:
      /(book (a |your |now)|get (started|a quote|your quote)|free (quote|estimate|consultation|build)|schedule|contact us|call (us|now)|request)/i.test(h),
  };
}

/** Search readiness: can Google find, read, and understand the site? 0–100. */
export function searchReadinessScore(c: HtmlChecks): number {
  let score = 0;
  if (c.https) score += 10;
  if (c.title) score += 15;
  if (c.meta_description) score += 15;
  if (c.canonical) score += 10;
  if (c.viewport) score += 10;
  if (c.og_tags) score += 10;
  if (c.json_ld) score += 10;
  if (c.robots_txt) score += 5;
  if (c.sitemap) score += 15;
  return score;
}

/** Lead readiness: can the site turn a visitor into a conversation? 0–100. */
export function leadReadinessScore(c: HtmlChecks): number {
  let score = 0;
  if (c.has_form) score += 35;
  if (c.has_tel_or_sms) score += 25;
  if (c.has_cta) score += 25;
  if (c.has_analytics) score += 15;
  return score;
}

// ---------------------------------------------------------------------------
// Composite grade.
// ---------------------------------------------------------------------------

export type GradeScores = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  best_practices: number | null;
  lcp_s: number | null;
  search_readiness: number;
  lead_readiness: number;
  overall: number | null;
  letter: string | null;
};

export function letterFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Weighted overall. Lighthouse categories may be null (API unavailable) — the
 * overall is then computed from what was actually measured, never padded.
 */
export function overallScore(s: Omit<GradeScores, "overall" | "letter">): { overall: number | null; letter: string | null } {
  const parts: Array<[number | null, number]> = [
    [s.performance, 0.2],
    [s.seo, 0.2],
    [s.accessibility, 0.075],
    [s.best_practices, 0.075],
    [s.search_readiness, 0.2],
    [s.lead_readiness, 0.25],
  ];
  let total = 0;
  let weight = 0;
  for (const [value, w] of parts) {
    if (value != null && Number.isFinite(value)) {
      total += value * w;
      weight += w;
    }
  }
  if (weight < 0.4) return { overall: null, letter: null }; // too little measured to grade
  const overall = Math.round(total / weight);
  return { overall, letter: letterFor(overall) };
}

// ---------------------------------------------------------------------------
// PageSpeed Insights (Lighthouse).
// ---------------------------------------------------------------------------

export type Lighthouse = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  best_practices: number | null;
  lcp_s: number | null;
};

export function parsePagespeed(json: unknown): Lighthouse {
  const r = json as {
    lighthouseResult?: {
      categories?: Record<string, { score?: number }>;
      audits?: Record<string, { numericValue?: number }>;
    };
  };
  const cats = r?.lighthouseResult?.categories ?? {};
  const pct = (key: string): number | null => {
    const s = cats[key]?.score;
    return typeof s === "number" ? Math.round(s * 100) : null;
  };
  const lcpMs = r?.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue;
  return {
    performance: pct("performance"),
    seo: pct("seo"),
    accessibility: pct("accessibility"),
    best_practices: pct("best-practices"),
    lcp_s: typeof lcpMs === "number" ? Math.round(lcpMs / 100) / 10 : null,
  };
}

export async function runPagespeed(url: string): Promise<Lighthouse> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const c of ["PERFORMANCE", "SEO", "ACCESSIBILITY", "BEST_PRACTICES"]) {
    params.append("category", c);
  }
  if (key) params.set("key", key);
  const res = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
    { signal: AbortSignal.timeout(45_000) }
  );
  if (!res.ok) throw new Error(`pagespeed ${res.status}`);
  return parsePagespeed(await res.json());
}

// ---------------------------------------------------------------------------
// Full site check (HTML + robots + sitemap). Redirects are followed manually
// so every hop stays on a validated public host.
// ---------------------------------------------------------------------------

async function safeFetch(url: string, accept: string): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const parsed = normalizeGradeUrl(current);
    if (parsed.error || !parsed.url || !parsed.host) return null;
    if (!(await resolvesPublicly(parsed.host))) return null;
    const res = await fetch(parsed.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        accept,
        "user-agent":
          "Mozilla/5.0 (compatible; LeadFlowGrader/1.0; +https://www.theleadflowpro.com/live)",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return res;
      current = new URL(next, parsed.url).toString();
      continue;
    }
    return res;
  }
  return null;
}

export async function runHtmlChecks(url: string, host: string): Promise<{ checks: HtmlChecks; finalUrl: string } | null> {
  const page = await safeFetch(url, "text/html,application/xhtml+xml");
  if (!page || !page.ok) return null;
  const finalUrl = page.url || url;
  const html = await page.text();
  const base = analyzeHtml(html, finalUrl.startsWith("https:"));

  const origin = `https://${host}`;
  let robots = false;
  let sitemap = false;
  try {
    const r = await safeFetch(`${origin}/robots.txt`, "text/plain");
    robots = !!r && r.ok;
    if (r && r.ok) {
      const text = (await r.text()).slice(0, 20_000);
      if (/sitemap:/i.test(text)) sitemap = true;
    }
  } catch {
    /* robots stays false */
  }
  if (!sitemap) {
    try {
      const s = await safeFetch(`${origin}/sitemap.xml`, "application/xml,text/xml");
      sitemap = !!s && s.ok;
    } catch {
      /* sitemap stays false */
    }
  }

  return { checks: { ...base, robots_txt: robots, sitemap }, finalUrl };
}

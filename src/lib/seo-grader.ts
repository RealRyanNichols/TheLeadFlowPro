/**
 * On-page SEO grader — pure logic.
 *
 * Takes raw HTML + the requested URL, runs a battery of lightweight on-page
 * checks, and returns a per-check verdict plus a 0-100 score.
 *
 * Deliberately avoids external dependencies so the API route stays fast and
 * cheap to run. The checks aren't exhaustive — they're the 80/20 basics a
 * local-business site should nail. Deeper crawls / competitor comparisons /
 * Core Web Vitals live in the paid tier.
 */

export type Verdict = "pass" | "warn" | "fail";

export type Finding = {
  id: string;
  category: "basics" | "social" | "technical" | "content";
  title: string;
  verdict: Verdict;
  weight: number;          // 1..5, how much this check moves the score
  detail: string;          // what we found
  fix: string;             // plain-English fix
};

export type GradeReport = {
  url: string;
  fetchedAt: string;
  score: number;           // 0..100
  grade: "A" | "B" | "C" | "D" | "F";
  findings: Finding[];
  categories: Record<Finding["category"], { score: number; pass: number; total: number }>;
  topWins: Finding[];
  topIssues: Finding[];
  meta: {
    title: string | null;
    description: string | null;
    h1: string | null;
    wordCount: number;
    imageCount: number;
    imagesWithAlt: number;
    internalLinks: number;
    externalLinks: number;
  };
};

const CATEGORY_LABEL: Record<Finding["category"], string> = {
  basics: "On-page basics",
  social: "Social sharing",
  technical: "Technical",
  content: "Content"
};

export function categoryLabel(c: Finding["category"]) {
  return CATEGORY_LABEL[c];
}

// -----------------------------------------------------------------------------
// Parsing helpers (regex-based — fine for the handful of tags we inspect)
// -----------------------------------------------------------------------------

function tagContent(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function metaContent(html: string, name: string, attr: "name" | "property" = "name"): string | null {
  const re = new RegExp(`<meta[^>]*${attr}=["']${name}["'][^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const content = m[0].match(/content=["']([^"']*)["']/i);
  return content ? content[1].trim() : null;
}

function countMatches(html: string, re: RegExp) {
  return (html.match(re) || []).length;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// -----------------------------------------------------------------------------
// Scoring
// -----------------------------------------------------------------------------

function weightFor(verdict: Verdict, weight: number): number {
  if (verdict === "pass") return weight;
  if (verdict === "warn") return weight * 0.5;
  return 0;
}

export function gradeHtml(url: string, html: string): GradeReport {
  const findings: Finding[] = [];

  // --- On-page basics ------------------------------------------------------
  const title = tagContent(html, "title");
  findings.push(titleCheck(title));

  const description = metaContent(html, "description");
  findings.push(descriptionCheck(description));

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const firstH1 = h1s[0]?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
  findings.push(h1Check(h1s.length, firstH1));

  findings.push(canonicalCheck(html));

  // --- Social sharing ------------------------------------------------------
  findings.push(openGraphCheck(html));
  findings.push(twitterCardCheck(html));

  // --- Technical -----------------------------------------------------------
  findings.push(httpsCheck(url));
  findings.push(viewportCheck(html));
  findings.push(faviconCheck(html));
  findings.push(structuredDataCheck(html));
  findings.push(robotsCheck(html));

  // --- Content -------------------------------------------------------------
  const text = stripHtml(html);
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  findings.push(wordCountCheck(wordCount));

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imagesWithAlt = imgs.filter((img) => /alt=["'][^"']+["']/i.test(img)).length;
  findings.push(altTextCheck(imgs.length, imagesWithAlt));

  const internalLinks = countInternalLinks(html, url);
  findings.push(internalLinksCheck(internalLinks));

  // --- Aggregate -----------------------------------------------------------
  const earned = findings.reduce((acc, f) => acc + weightFor(f.verdict, f.weight), 0);
  const possible = findings.reduce((acc, f) => acc + f.weight, 0);
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  const categories = (["basics", "social", "technical", "content"] as const).reduce(
    (acc, c) => {
      const cf = findings.filter((f) => f.category === c);
      const e = cf.reduce((a, f) => a + weightFor(f.verdict, f.weight), 0);
      const p = cf.reduce((a, f) => a + f.weight, 0);
      acc[c] = {
        score: p === 0 ? 0 : Math.round((e / p) * 100),
        pass: cf.filter((f) => f.verdict === "pass").length,
        total: cf.length
      };
      return acc;
    },
    {} as GradeReport["categories"]
  );

  const externalLinks = countMatches(html, /<a\b[^>]*href=["']https?:\/\//gi) - internalLinks;

  return {
    url,
    fetchedAt: new Date().toISOString(),
    score,
    grade: letterGrade(score),
    findings,
    categories,
    topWins: findings.filter((f) => f.verdict === "pass").sort((a, b) => b.weight - a.weight).slice(0, 3),
    topIssues: findings
      .filter((f) => f.verdict !== "pass")
      .sort((a, b) => b.weight - a.weight || (a.verdict === "fail" ? -1 : 1))
      .slice(0, 3),
    meta: {
      title: title,
      description,
      h1: firstH1,
      wordCount,
      imageCount: imgs.length,
      imagesWithAlt,
      internalLinks,
      externalLinks: Math.max(0, externalLinks)
    }
  };
}

function letterGrade(score: number): GradeReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// -----------------------------------------------------------------------------
// Individual checks
// -----------------------------------------------------------------------------

function titleCheck(title: string | null): Finding {
  if (!title) {
    return {
      id: "title",
      category: "basics",
      title: "Page title",
      verdict: "fail",
      weight: 5,
      detail: "No <title> tag found.",
      fix: "Add a 30–60 character <title> that includes your primary service and city, e.g. 'Longview Plumber — Same-Day Service | Your Business'."
    };
  }
  const len = title.length;
  if (len < 20 || len > 70) {
    return {
      id: "title",
      category: "basics",
      title: "Page title",
      verdict: "warn",
      weight: 5,
      detail: `Title is ${len} chars — "${title.slice(0, 80)}"`,
      fix: "Aim for 30–60 characters. Too short looks thin; too long gets cut off in Google."
    };
  }
  return {
    id: "title",
    category: "basics",
    title: "Page title",
    verdict: "pass",
    weight: 5,
    detail: `"${title}" (${len} chars)`,
    fix: "Keep it focused on your service + city."
  };
}

function descriptionCheck(desc: string | null): Finding {
  if (!desc) {
    return {
      id: "description",
      category: "basics",
      title: "Meta description",
      verdict: "fail",
      weight: 4,
      detail: "No meta description found.",
      fix: "Add <meta name=\"description\" content=\"…\"> with 120–160 chars of persuasive copy. This is the snippet Google shows in search results."
    };
  }
  if (desc.length < 80 || desc.length > 180) {
    return {
      id: "description",
      category: "basics",
      title: "Meta description",
      verdict: "warn",
      weight: 4,
      detail: `Description is ${desc.length} chars.`,
      fix: "Aim for 120–160 chars. Include a benefit + a call to action."
    };
  }
  return {
    id: "description",
    category: "basics",
    title: "Meta description",
    verdict: "pass",
    weight: 4,
    detail: `${desc.length} chars — looks good.`,
    fix: "Keep it sharp and benefit-forward."
  };
}

function h1Check(count: number, first: string | null): Finding {
  if (count === 0) {
    return {
      id: "h1",
      category: "basics",
      title: "H1 heading",
      verdict: "fail",
      weight: 4,
      detail: "No <h1> found on the page.",
      fix: "Add exactly one <h1> that matches the user's intent — ideally your service + city."
    };
  }
  if (count > 1) {
    return {
      id: "h1",
      category: "basics",
      title: "H1 heading",
      verdict: "warn",
      weight: 4,
      detail: `Found ${count} H1 tags. First: "${(first || "").slice(0, 80)}"`,
      fix: "Use exactly one H1 per page. Downgrade the rest to H2/H3."
    };
  }
  return {
    id: "h1",
    category: "basics",
    title: "H1 heading",
    verdict: "pass",
    weight: 4,
    detail: `"${first}"`,
    fix: "Make sure it reflects what someone would Google."
  };
}

function canonicalCheck(html: string): Finding {
  const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
  if (!m) {
    return {
      id: "canonical",
      category: "basics",
      title: "Canonical URL",
      verdict: "warn",
      weight: 2,
      detail: "No canonical link found.",
      fix: "Add <link rel=\"canonical\" href=\"https://yourdomain.com/page\"> to tell Google the primary URL."
    };
  }
  return {
    id: "canonical",
    category: "basics",
    title: "Canonical URL",
    verdict: "pass",
    weight: 2,
    detail: "Canonical tag present.",
    fix: "Good — prevents duplicate-content headaches."
  };
}

function openGraphCheck(html: string): Finding {
  const ogTitle = metaContent(html, "og:title", "property");
  const ogDesc = metaContent(html, "og:description", "property");
  const ogImage = metaContent(html, "og:image", "property");
  const have = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  if (have === 0) {
    return {
      id: "og",
      category: "social",
      title: "Open Graph tags",
      verdict: "fail",
      weight: 3,
      detail: "No Open Graph tags found. Links to your site will look ugly when shared on Facebook / iMessage.",
      fix: "Add og:title, og:description, and og:image meta tags."
    };
  }
  if (have < 3) {
    return {
      id: "og",
      category: "social",
      title: "Open Graph tags",
      verdict: "warn",
      weight: 3,
      detail: `Missing ${3 - have} of 3 core OG tags.`,
      fix: "Add all three: og:title, og:description, og:image."
    };
  }
  return {
    id: "og",
    category: "social",
    title: "Open Graph tags",
    verdict: "pass",
    weight: 3,
    detail: "All three core OG tags present.",
    fix: "Your link previews will look sharp on socials."
  };
}

function twitterCardCheck(html: string): Finding {
  const card = metaContent(html, "twitter:card");
  if (!card) {
    return {
      id: "twitter",
      category: "social",
      title: "Twitter / X card",
      verdict: "warn",
      weight: 2,
      detail: "No twitter:card tag found.",
      fix: "Add <meta name=\"twitter:card\" content=\"summary_large_image\"> for rich previews when shared on X."
    };
  }
  return {
    id: "twitter",
    category: "social",
    title: "Twitter / X card",
    verdict: "pass",
    weight: 2,
    detail: `Card type: ${card}`,
    fix: "Good — X will render a rich preview."
  };
}

function httpsCheck(url: string): Finding {
  const isHttps = url.startsWith("https://");
  if (!isHttps) {
    return {
      id: "https",
      category: "technical",
      title: "HTTPS",
      verdict: "fail",
      weight: 4,
      detail: "Site is not served over HTTPS.",
      fix: "Install an SSL certificate. Google penalizes non-HTTPS sites and browsers mark them as 'Not Secure'."
    };
  }
  return {
    id: "https",
    category: "technical",
    title: "HTTPS",
    verdict: "pass",
    weight: 4,
    detail: "Served over HTTPS.",
    fix: "Keep your cert auto-renewing."
  };
}

function viewportCheck(html: string): Finding {
  const v = metaContent(html, "viewport");
  if (!v) {
    return {
      id: "viewport",
      category: "technical",
      title: "Mobile viewport",
      verdict: "fail",
      weight: 4,
      detail: "No viewport meta tag — the page likely isn't mobile-optimized.",
      fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
    };
  }
  return {
    id: "viewport",
    category: "technical",
    title: "Mobile viewport",
    verdict: "pass",
    weight: 4,
    detail: "Viewport meta tag is set.",
    fix: "Most of your leads are on their phone — this matters."
  };
}

function faviconCheck(html: string): Finding {
  const m = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i);
  if (!m) {
    return {
      id: "favicon",
      category: "technical",
      title: "Favicon",
      verdict: "warn",
      weight: 1,
      detail: "No favicon detected.",
      fix: "Add a favicon — small thing, but it builds trust in browser tabs and bookmarks."
    };
  }
  return {
    id: "favicon",
    category: "technical",
    title: "Favicon",
    verdict: "pass",
    weight: 1,
    detail: "Favicon is declared.",
    fix: "Nice touch."
  };
}

function structuredDataCheck(html: string): Finding {
  const hasLd = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);
  if (!hasLd) {
    return {
      id: "schema",
      category: "technical",
      title: "Structured data (JSON-LD)",
      verdict: "warn",
      weight: 3,
      detail: "No JSON-LD structured data found.",
      fix: "Add LocalBusiness schema. It lets Google show your hours, address, phone, and reviews directly in search."
    };
  }
  return {
    id: "schema",
    category: "technical",
    title: "Structured data (JSON-LD)",
    verdict: "pass",
    weight: 3,
    detail: "JSON-LD structured data detected.",
    fix: "Great — this is how you get rich snippets in Google."
  };
}

function robotsCheck(html: string): Finding {
  const r = metaContent(html, "robots");
  if (r && /noindex/i.test(r)) {
    return {
      id: "robots",
      category: "technical",
      title: "Indexing",
      verdict: "fail",
      weight: 5,
      detail: "Page has noindex — Google is being told NOT to rank this page.",
      fix: "Remove the noindex directive unless this page is genuinely private."
    };
  }
  return {
    id: "robots",
    category: "technical",
    title: "Indexing",
    verdict: "pass",
    weight: 5,
    detail: "Page is indexable.",
    fix: "Google is allowed to rank this page."
  };
}

function wordCountCheck(count: number): Finding {
  if (count < 150) {
    return {
      id: "wordcount",
      category: "content",
      title: "Content length",
      verdict: "fail",
      weight: 3,
      detail: `Only ~${count} words of visible content.`,
      fix: "Add more substance — service details, pricing, service area, and answers to common questions. Aim for 400+ words."
    };
  }
  if (count < 400) {
    return {
      id: "wordcount",
      category: "content",
      title: "Content length",
      verdict: "warn",
      weight: 3,
      detail: `~${count} words on the page.`,
      fix: "Google favors pages that answer the question fully. Expand to 400–800 words with FAQs + service specifics."
    };
  }
  return {
    id: "wordcount",
    category: "content",
    title: "Content length",
    verdict: "pass",
    weight: 3,
    detail: `~${count} words of content.`,
    fix: "Plenty for a local landing page."
  };
}

function altTextCheck(total: number, withAlt: number): Finding {
  if (total === 0) {
    return {
      id: "alt",
      category: "content",
      title: "Image alt text",
      verdict: "warn",
      weight: 2,
      detail: "No images on the page.",
      fix: "Add 2–4 real photos of your work with descriptive alt text. Before/afters are gold."
    };
  }
  const pct = Math.round((withAlt / total) * 100);
  if (pct < 50) {
    return {
      id: "alt",
      category: "content",
      title: "Image alt text",
      verdict: "fail",
      weight: 2,
      detail: `${withAlt}/${total} images have alt text (${pct}%).`,
      fix: "Add descriptive alt text to every image — it helps Google index images AND supports screen readers."
    };
  }
  if (pct < 90) {
    return {
      id: "alt",
      category: "content",
      title: "Image alt text",
      verdict: "warn",
      weight: 2,
      detail: `${withAlt}/${total} images have alt text (${pct}%).`,
      fix: "Round up the stragglers — every image should describe what it shows."
    };
  }
  return {
    id: "alt",
    category: "content",
    title: "Image alt text",
    verdict: "pass",
    weight: 2,
    detail: `${withAlt}/${total} images have alt text.`,
    fix: "Keep it up — this also wins you accessibility points."
  };
}

function countInternalLinks(html: string, url: string): number {
  try {
    const host = new URL(url).host;
    const matches = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)];
    return matches.filter((m) => {
      const href = m[1];
      if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) return true;
      try {
        return new URL(href).host === host;
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

function internalLinksCheck(count: number): Finding {
  if (count < 3) {
    return {
      id: "internal",
      category: "content",
      title: "Internal links",
      verdict: "warn",
      weight: 2,
      detail: `Only ${count} internal links on the page.`,
      fix: "Link to your other service pages and your contact page. Helps Google crawl — and keeps visitors on your site."
    };
  }
  return {
    id: "internal",
    category: "content",
    title: "Internal links",
    verdict: "pass",
    weight: 2,
    detail: `${count} internal links.`,
    fix: "Good — a well-linked site ranks better."
  };
}

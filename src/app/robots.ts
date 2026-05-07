// src/app/robots.ts — robots.txt
//
// Explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
// Google-Extended) so businesses on theleadflowpro.com get cited by
// LLMs when users ask "find me a roofer in Tyler TX," etc.

import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://theleadflowpro.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/admin/", "/dashboard/"] },
      { userAgent: "GPTBot",          allow: "/" },
      { userAgent: "ClaudeBot",       allow: "/" },
      { userAgent: "anthropic-ai",    allow: "/" },
      { userAgent: "PerplexityBot",   allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "GoogleOther",     allow: "/" },
      { userAgent: "CCBot",           allow: "/" },
      { userAgent: "Applebot",        allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "Bytespider",      allow: "/" },
      { userAgent: "FacebookBot",     allow: "/" },
      { userAgent: "Amazonbot",       allow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}

// QA a client site config before it is previewed or launched.
//
//   npm run factory:qa -- --config factory/clients/fixture-fence-co.json
//
// Checks the config, renders the five pages to HTML, and verifies links,
// structured data, analytics hooks, form fields, and the copy rules the
// factory enforces. Exit code 1 means do not launch.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { siteRoutes, validateClientConfig, type ClientConfig, type PageKey } from "../factory/template/lib/config.ts";
import { localBusinessJsonLd } from "../factory/template/lib/schema.ts";
import { renderPage } from "../factory/template/components/Site.tsx";

export type QaReport = { ok: boolean; checks: { name: string; ok: boolean; detail?: string }[] };

const BANNED_COPY = ["guarantee", "guaranteed", "#1", "best in", "lowest price", "ranked", "top rated", "roi", "roas"];

export function qaClientConfig(config: ClientConfig): QaReport {
  const checks: QaReport["checks"] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

  const problems = validateClientConfig(config);
  add("config validates", problems.length === 0, problems.map((p) => `${p.path}: ${p.message}`).join("; "));
  if (problems.length) return { ok: false, checks };

  const routes = siteRoutes(config);
  const hrefs = new Set(routes.map((r) => r.href));
  const pages = new Map<PageKey, string>();
  for (const r of routes) {
    const html = renderToStaticMarkup(createElement(() => renderPage(r.key, { config, path: r.href })));
    pages.set(r.key, html);
  }

  // Every internal link on every page resolves to one of the five routes or an anchor.
  const broken: string[] = [];
  for (const [key, html] of pages) {
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const h = m[1];
      if (h.startsWith("http") || h.startsWith("tel:") || h.startsWith("sms:") || h.startsWith("mailto:") || h.startsWith("#")) continue;
      const path = h.split("#")[0].split("?")[0];
      if (!hrefs.has(path)) broken.push(`${key}: ${h}`);
    }
  }
  add("internal links resolve", broken.length === 0, broken.join(", "));

  // Structured data: LocalBusiness with the client's own details, street only when allowed.
  const ld = localBusinessJsonLd(config);
  const ldText = JSON.stringify(ld);
  add("structured data names the client", ld.name === config.business.name && ld.telephone === config.business.phoneE164);
  add("street address hidden unless allowed", config.business.address?.showStreet === true || !ldText.includes('"streetAddress"'));
  add("structured data on every page", [...pages.values()].every((h) => h.includes('application/ld+json')));

  // The conversion page has the form, the honeypot, and the consent line; it is not indexed as a promise.
  const conv = pages.get("conversion") ?? "";
  add("conversion form present", conv.includes("<form") && conv.includes('name="company_website"'));
  add("consent line printed", conv.includes(config.pages.conversion.consentLine.slice(0, 40)));
  add("form fields rendered", config.pages.conversion.fields.every((f) => conv.includes(`name="${f.id}"`)));

  // Analytics hooks the client owns: data-analytics on the CTAs and the form.
  const home = pages.get("home") ?? "";
  add("cta analytics hooks present", home.includes('data-analytics="cta-header"') && conv.includes(`data-analytics="form-${config.pages.conversion.kind}"`) && conv.includes('data-analytics="form-submit"'));

  // Copy rules: no superlatives, guarantees, or ad-metric promises anywhere on the site.
  const allText = [...pages.values()].join(" ").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").toLowerCase();
  const found = BANNED_COPY.filter((w) => new RegExp(`(^|[^a-z])${w.replace("#", "\\#")}([^a-z]|$)`).test(allText));
  add("no banned copy", found.length === 0, found.join(", "));

  // The site never mentions The LeadFlow Pro's own contact details.
  add("no factory contact details leaked", !allText.includes("903) 500-8898") && !allText.includes("hello@theleadflowpro.com"));

  // Every page has one h1 and a title.
  add("one h1 per page", [...pages.values()].every((h) => (h.match(/<h1/g) ?? []).length === 1));

  // Phone and email on the contact page match the config, so a copy edit cannot drift.
  const contact = pages.get("contact") ?? "";
  add("contact page uses config phone and email", contact.includes(config.business.phoneDisplay) && contact.includes(config.business.email));

  // Launch gating: live requires the checklist fields.
  add("launch status sane", config.launch.status !== "live" || Boolean(config.launch.domain && config.launch.vercelProject && config.launch.scopeApprovedOn));

  return { ok: checks.every((c) => c.ok), checks };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("qa-client-site.ts")) {
  const configPath = arg("config");
  if (!configPath) {
    console.error("usage: npm run factory:qa -- --config <site.config.json>");
    process.exit(2);
  }
  const config = JSON.parse(readFileSync(resolve(configPath), "utf8")) as ClientConfig;
  const report = qaClientConfig(config);
  for (const c of report.checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
  console.log("");
  console.log(report.ok ? `${config.slug}: ready for preview.` : `${config.slug}: fix the failures above before preview.`);
  process.exit(report.ok ? 0 : 1);
}

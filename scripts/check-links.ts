// Static link check: every internal href the site's chrome, catalog, offer
// registry, agency config, and event config point at must resolve to a real
// route under app/. Runs without a server, so it can sit in the test suite
// and the build.
//
// Run: npm run check:links

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { AGENCY_SERVICES } from "../lib/site/agency.ts";
import { PAST_EVENT_COPY, SITE_EVENTS } from "../lib/site/events.ts";
import { chromeInternalHrefs } from "../lib/site/navigation.ts";
import { OFFERS } from "../lib/site/offers.ts";
import { CASE_STUDIES } from "../lib/site/caseStudies.ts";
import { PLUGIN } from "../lib/pluginDocs.ts";

const APP = join(process.cwd(), "app");

/** Routes that middleware rewrites or redirects rather than app/ serving. */
const VIRTUAL_ROUTES = new Set(["/logout"]);

function segmentsMatch(dir: string, segments: string[]): boolean {
  if (segments.length === 0) return existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "route.ts")) || existsSync(join(dir, "route.tsx"));
  const [head, ...rest] = segments;
  const exact = join(dir, head);
  if (existsSync(exact) && statSync(exact).isDirectory() && segmentsMatch(exact, rest)) return true;
  for (const entry of readdirSync(dir)) {
    if (!entry.startsWith("[")) continue;
    const child = join(dir, entry);
    if (!statSync(child).isDirectory()) continue;
    if (entry.startsWith("[...") || entry.startsWith("[[...")) return true;
    if (segmentsMatch(child, rest)) return true;
  }
  return false;
}

export function routeExists(href: string): boolean {
  const path = href.split("#")[0].split("?")[0];
  if (VIRTUAL_ROUTES.has(path)) return true;
  const segments = path.split("/").filter(Boolean);
  return segmentsMatch(APP, segments);
}

export function collectInternalHrefs(): { href: string; from: string }[] {
  const out: { href: string; from: string }[] = [];
  const add = (href: string | null | undefined, from: string) => {
    if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) out.push({ href, from });
  };
  for (const h of chromeInternalHrefs()) add(h, "navigation");
  for (const p of PUBLIC_PAGE_CATALOG) add(p.path, "publicPageCatalog");
  for (const o of OFFERS) add(o.href, `offers:${o.id}`);
  for (const s of AGENCY_SERVICES) {
    add(`/agency/${s.slug}`, "agency");
    add(s.intakeHref, `agency:${s.slug}:intake`);
    for (const r of s.related) add(r.href, `agency:${s.slug}:related`);
  }
  for (const e of SITE_EVENTS) add(e.registrationPath, `events:${e.slug}`);
  add(PAST_EVENT_COPY.lessonPath, "events:past");
  for (const c of CASE_STUDIES) add(c.href, `caseStudies:${c.id}`);
  add(PLUGIN.signupHref, "plugin");
  add(PLUGIN.docsHref, "plugin");
  add(PLUGIN.billingHref, "plugin");
  add(PLUGIN.hqHref, "plugin");
  return out;
}

export function brokenLinks(): { href: string; from: string }[] {
  return collectInternalHrefs().filter((l) => !routeExists(l.href));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const broken = brokenLinks();
  const total = collectInternalHrefs().length;
  if (broken.length) {
    console.error(`check:links found ${broken.length} of ${total} internal links with no route:\n`);
    for (const b of broken) console.error(`  ${b.href}  (from ${b.from})`);
    process.exit(1);
  }
  console.log(`check:links: all ${total} configured internal links resolve to a route.`);
}

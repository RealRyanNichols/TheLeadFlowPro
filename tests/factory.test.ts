import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FACTORY_VERSION, primaryCtaHref, siteRoutes, validateClientConfig, type ClientConfig } from "../factory/template/lib/config.ts";
import { localBusinessJsonLd, webPageJsonLd } from "../factory/template/lib/schema.ts";
import { renderPage } from "../factory/template/components/Site.tsx";
import { qaClientConfig } from "../scripts/qa-client-site.ts";
import { scaffoldClientSite } from "../scripts/new-client.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { WORKSPACE_PREFIXES } from "../lib/site/navigation.ts";

const fixture = (): ClientConfig => JSON.parse(readFileSync(join(process.cwd(), "factory/clients/fixture-fence-co.json"), "utf8"));

test("the fixture client validates and passes QA", () => {
  const c = fixture();
  assert.equal(c.factoryVersion, FACTORY_VERSION);
  assert.deepEqual(validateClientConfig(c), []);
  const report = qaClientConfig(c);
  assert.ok(report.ok, report.checks.filter((x) => !x.ok).map((x) => `${x.name}: ${x.detail}`).join("\n"));
});

test("the fixture is plainly fictional and never carries The LeadFlow Pro's contact details", () => {
  const text = JSON.stringify(fixture()).toLowerCase();
  assert.ok(text.includes("fictional"));
  assert.ok(!text.includes(BUSINESS.phone.display));
  assert.ok(!text.includes(BUSINESS.email.hello));
  assert.ok(!text.includes("theleadflowpro.com"));
});

test("invalid configs are refused with a path for every problem", () => {
  const c = fixture();
  c.business.phoneE164 = "903-555-0100";
  c.brand.primary = "blue";
  c.pages.conversion.slug = "about";
  c.pages.conversion.thankYou = "Guaranteed lowest price in town";
  c.leadRoute = { kind: "email", owner: "" } as ClientConfig["leadRoute"];
  c.launch = { status: "live" };
  const paths = validateClientConfig(c).map((p) => p.path);
  for (const expected of ["business.phoneE164", "brand.primary", "pages.conversion.slug", "pages.conversion", "leadRoute.to", "leadRoute.owner", "launch"]) {
    assert.ok(paths.includes(expected), `${expected} in ${paths.join(", ")}`);
  }
  assert.equal(validateClientConfig(null).length, 1);
  assert.equal(validateClientConfig({ ...fixture(), factoryVersion: "0.0.1" }).some((p) => p.path === "factoryVersion"), true);
});

test("a form without any way to answer the lead is refused", () => {
  const c = fixture();
  c.pages.conversion.fields = [{ id: "full_name", label: "Name", type: "text", required: true }];
  assert.ok(validateClientConfig(c).some((p) => p.path === "pages.conversion.fields"));
});

test("structured data comes from the config and hides the street unless the client allows it", () => {
  const c = fixture();
  c.business.address = { street: "1 Example Rd", city: "Longview", region: "TX", postalCode: "75601", country: "US", showStreet: false };
  const hidden = JSON.stringify(localBusinessJsonLd(c));
  assert.ok(!hidden.includes("1 Example Rd"));
  c.business.address.showStreet = true;
  const shown = localBusinessJsonLd(c) as { address?: { streetAddress?: string } };
  assert.equal(shown.address?.streetAddress, "1 Example Rd");
  const ld = localBusinessJsonLd(c) as Record<string, unknown>;
  assert.equal(ld["@type"], c.business.schemaType);
  assert.equal(ld.telephone, c.business.phoneE164);
  assert.equal(ld.url, c.seo.siteUrl);
  const page = webPageJsonLd(c, "/services", "Services", "x") as Record<string, unknown>;
  assert.equal(page.url, `${c.seo.siteUrl}/services`);
});

test("five routes, and the primary CTA resolves per kind", () => {
  const c = fixture();
  assert.deepEqual(
    siteRoutes(c).map((r) => r.href),
    ["/", "/services", "/about", "/quote", "/contact"],
  );
  assert.equal(primaryCtaHref(c), "/quote");
  c.offer.primaryCta = { label: "Call", kind: "call" };
  assert.equal(primaryCtaHref(c), `tel:${c.business.phoneE164}`);
  c.offer.primaryCta = { label: "Text", kind: "text" };
  assert.equal(primaryCtaHref(c), `sms:${c.business.phoneE164}`);
  c.offer.primaryCta = { label: "Book", kind: "link", href: "https://booking.example/x" };
  assert.equal(primaryCtaHref(c), "https://booking.example/x");
});

test("preview rendering prefixes every internal link, disables the form, and shows the banner", () => {
  const c = fixture();
  const base = "/factory/preview/fixture-fence-co";
  const html = renderToStaticMarkup(createElement(() => renderPage("conversion", { config: c, path: "/quote", base, formAction: `${base}/quote`, preview: true })));
  assert.ok(html.includes("Preview build for Fixture Fence Co"));
  assert.ok(html.includes(`href="${base}/services"`));
  assert.ok(html.includes(`href="${base}"`));
  assert.ok(!html.includes('href="/services"'));
  assert.match(html, /<button[^>]*disabled/);
  assert.ok(html.includes(`action="${base}/quote"`));
  const live = renderToStaticMarkup(createElement(() => renderPage("conversion", { config: c, path: "/quote", formAction: "/api/lead" })));
  assert.ok(!live.includes("Preview build"));
  assert.ok(live.includes('action="/api/lead"'));
  assert.ok(!/<button[^>]*disabled/.test(live));
});

test("the conversion form carries a honeypot and prints the consent line without promising a result", () => {
  const c = fixture();
  const html = renderToStaticMarkup(createElement(() => renderPage("conversion", { config: c, path: "/quote" })));
  assert.ok(html.includes('name="company_website"'));
  assert.ok(html.includes("reply STOP"));
  assert.ok(!/guarantee/i.test(html));
});

test("QA fails a config whose copy makes a banned claim", () => {
  const c = fixture();
  c.pages.home.sections[0].body = "Best in East Texas, guaranteed.";
  const report = qaClientConfig(c);
  assert.equal(report.ok, false);
  assert.ok(report.checks.some((x) => x.name === "no banned copy" && !x.ok));
});

test("QA fails a config that leaks the factory's own phone number", () => {
  const c = fixture();
  c.pages.contact.intro = `Or call ${BUSINESS.phone.display}.`;
  const report = qaClientConfig(c);
  assert.ok(report.checks.some((x) => x.name === "no factory contact details leaked" && !x.ok));
});

test("scaffolding copies the template, writes the config, and refuses to overwrite without force", () => {
  const out = mkdtempSync(join(tmpdir(), "factory-"));
  try {
    const { outDir } = scaffoldClientSite(fixture(), out);
    for (const f of ["package.json", "app/layout.tsx", "app/api/lead/route.ts", "lib/config.ts", "components/Site.tsx", "styles/site.css", ".env.example", "site.config.json"]) {
      assert.ok(existsSync(join(outDir, f)), f);
    }
    const written = JSON.parse(readFileSync(join(outDir, "site.config.json"), "utf8"));
    assert.equal(written.slug, "fixture-fence-co");
    assert.throws(() => scaffoldClientSite(fixture(), out), /already exists/);
    assert.doesNotThrow(() => scaffoldClientSite(fixture(), out, { force: true }));
    const bad = fixture();
    bad.seo.siteUrl = "http://insecure.example";
    assert.throws(() => scaffoldClientSite(bad, out, { force: true }), /seo.siteUrl/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("the template ships no secrets and names only env variable names", () => {
  const env = readFileSync(join(process.cwd(), "factory/template/.env.example"), "utf8");
  for (const line of env.split("\n").filter((l) => l.trim() && !l.startsWith("#"))) {
    assert.match(line, /^[A-Z_]+=(""|"[^"]*example\.com[^"]*")$/, line);
  }
  const route = readFileSync(join(process.cwd(), "factory/template/app/api/lead/route.ts"), "utf8");
  assert.ok(!/re_[A-Za-z0-9]{10,}/.test(route));
  assert.ok(!route.includes("theleadflowpro.com"), "template lead route must not point at The LeadFlow Pro");
});

test("factory output directory is gitignored and the preview is chrome-free", () => {
  const ignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8").split("\n");
  assert.ok(ignore.includes("build/"));
  assert.ok((WORKSPACE_PREFIXES as readonly string[]).includes("/factory/preview"));
  assert.ok(existsSync(join(process.cwd(), "app/factory/preview/[client]/[[...page]]/page.tsx")));
});

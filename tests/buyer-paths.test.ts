import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as commerce from "../lib/commerce.ts";
import { withPublicPageMetadata } from "../lib/publicPageMetadata.ts";
import { TOOL_COUNT } from "../lib/tools/index.ts";
import { renderableCaseStudies } from "../lib/site/caseStudies.ts";
import { STAGES } from "../lib/system-stages.ts";
import { liveOffers } from "../lib/site/offers.ts";
import { PRICES } from "../lib/site/prices.ts";
import { localBusinessJsonLd } from "../lib/site/structuredData.ts";
import { FOOTER_COLUMNS, chromeInternalHrefs } from "../lib/site/navigation.ts";

class Redirect extends Error {
  readonly destination: string;
  constructor(destination: string) {
    super(destination);
    this.destination = destination;
  }
}

const require = createRequire(import.meta.url);

function renderBuyerPage(file: string): string {
  // Execute the real page with real catalog data. Framework image/link and
  // unrelated planner/analytics leaves are neutral; no handler or transport runs.
  const basicLink = ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: ReactNode;
  }) => createElement("a", { href, className }, children);
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "lucide-react": require("lucide-react"),
    "next/link": { __esModule: true, default: basicLink },
    "next/image": {
      __esModule: true,
      default: ({ src, alt }: { src: string; alt: string }) =>
        createElement("img", { src, alt }),
    },
    "@/components/site/CtaLink": { __esModule: true, default: basicLink },
    "./CommercePlanner": { __esModule: true, default: () => null },
    "@/lib/commerce": commerce,
    "@/lib/publicPageMetadata": { withPublicPageMetadata },
    "@/lib/tools": { TOOL_COUNT },
  };
  const exports = {} as { default: ComponentType };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "exports", code)((name: string) => {
    if (name.endsWith(".module.css")) return { __esModule: true, default: {} };
    if (!(name in modules))
      throw new Error(`Unexpected buyer page import: ${name}`);
    return modules[name];
  }, exports);
  return renderToStaticMarkup(createElement(exports.default));
}

test("unavailable client websites retain the real case study without outgoing paused-site links", () => {
  const portfolio = renderBuyerPage("app/portfolio/page.tsx");
  const results = renderBuyerPage("app/results/page.tsx");
  for (const html of [portfolio, results]) {
    assert.ok(!/href="https:\/\/(?:www\.)?lonestartotalwash\.com/.test(html));
    assert.match(html, /live client website is currently unavailable/);
  }
  assert.match(portfolio, /id="lone-star"/);
  assert.match(
    portfolio,
    /src="\/images\/portfolio\/lone-star-fleet-before-after\.jpg"/,
  );
  assert.match(results, /href="\/portfolio#lone-star"/);
  const study = renderableCaseStudies().find(
    (entry) => entry.id === "lonestar",
  )!;
  assert.equal(study.href, "/portfolio#lone-star");
  assert.match(study.disclosure ?? "", /currently unavailable/);
  const stageProof = STAGES.flatMap((stage) => stage.proof).filter(
    (entry) => entry.name === "Lone Star Total Wash",
  );
  assert.equal(stageProof.length, 3);
  assert.ok(stageProof.every((entry) => entry.url === study.href));
});

test("unavailable marketplace points buyers to available products and preserves their real catalog links", () => {
  const html = renderBuyerPage("app/commerce/page.tsx");
  assert.ok(!/href="https:\/\/gideonhq\.com/.test(html));
  assert.match(html, /Marketplace in preparation/);
  assert.match(html, /href="\/tools\/pro"/);
  for (const product of commerce.commerceCatalog().products)
    assert.ok(html.includes(`href="${product.url}"`), product.id);
});

const routeSource = readFileSync("app/packages/page.tsx", "utf8");
const compiled = ts.transpileModule(routeSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const route = {} as {
  default: (props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }) => Promise<void>;
};
new Function("require", "exports", compiled)(
  (name: string) =>
    name === "next/navigation"
      ? {
          permanentRedirect: (destination: string) => {
            throw new Redirect(destination);
          },
        }
      : require(name),
  route,
);

test("legacy package overview uses the one comparison page and preserves campaign attribution", async () => {
  await assert.rejects(
    route.default({ searchParams: Promise.resolve({}) }),
    (error) => error instanceof Redirect && error.destination === "/pricing",
  );
  await assert.rejects(
    route.default({
      searchParams: Promise.resolve({
        utm_source: "facebook",
        utm_campaign: "website launch",
        ref: ["first", "second"],
        ignored: undefined,
      }),
    }),
    (error) => {
      assert.ok(error instanceof Redirect);
      const url = new URL(error.destination, "https://example.test");
      assert.equal(url.pathname, "/pricing");
      assert.equal(url.searchParams.get("utm_source"), "facebook");
      assert.equal(url.searchParams.get("utm_campaign"), "website launch");
      assert.deepEqual(url.searchParams.getAll("ref"), ["first", "second"]);
      assert.equal(url.searchParams.has("ignored"), false);
      return true;
    },
  );
});

test("footer prioritizes buying decisions while preserving existing product destinations", () => {
  const featured = FOOTER_COLUMNS.flatMap((column) =>
    column.links.filter((link) => column.featuredHrefs?.includes(link.href)),
  );
  for (const href of [
    "/services",
    "/agency",
    "/pricing",
    "/service-areas",
    "/#free-consultation",
  ]) {
    assert.ok(
      featured.some((link) => link.href === href),
      href,
    );
  }
  const links = FOOTER_COLUMNS.flatMap((column) => column.links);
  assert.ok(
    !links.some((link) =>
      [
        "/packages/launch",
        "/packages/system-map",
        "/go/lead-follow-up",
      ].includes(link.href),
    ),
  );
  for (const href of [
    "/chase-sheet",
    "/post-creator",
    "/plugin",
    "/sellerproof",
    "/tools/pro",
    "/add-ons",
  ]) {
    assert.ok(
      links.some((link) => link.href === href),
      `Existing destination remains available: ${href}`,
    );
    assert.ok(
      chromeInternalHrefs().includes(href),
      `Link checks still cover ${href}`,
    );
    assert.ok(
      !featured.some((link) => link.href === href),
      `Secondary product does not crowd the first decision: ${href}`,
    );
  }
  for (const column of FOOTER_COLUMNS) {
    assert.ok(column.moreLabel);
    for (const href of column.featuredHrefs ?? [])
      assert.ok(column.links.some((link) => link.href === href));
  }
});

test("retired package URLs redirect with attribution rather than advertise legacy deposits", async () => {
  const source = readFileSync("app/packages/[slug]/page.tsx", "utf8");
  const exports = {} as {
    default: (props: {
      params: Promise<{ slug: string }>;
      searchParams: Promise<Record<string, string | string[] | undefined>>;
    }) => Promise<void>;
  };
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "exports", code)(
    (name: string) =>
      name === "next/navigation"
        ? {
            permanentRedirect: (destination: string) => {
              throw new Redirect(destination);
            },
            notFound: () => {
              throw new Error("404");
            },
          }
        : require(name),
    exports,
  );
  for (const slug of ["launch", "system-map", "industry-os"]) {
    await assert.rejects(
      exports.default({
        params: Promise.resolve({ slug }),
        searchParams: Promise.resolve({
          utm_source: "old-campaign",
          ref: ["a", "b"],
        }),
      }),
      (error) => {
        assert.ok(error instanceof Redirect);
        const destination = new URL(error.destination, "https://example.test");
        assert.equal(destination.pathname, "/pricing");
        assert.equal(
          destination.searchParams.get("utm_source"),
          "old-campaign",
        );
        assert.deepEqual(destination.searchParams.getAll("ref"), ["a", "b"]);
        return true;
      },
    );
  }
  await assert.rejects(
    exports.default({
      params: Promise.resolve({ slug: "unknown" }),
      searchParams: Promise.resolve({}),
    }),
    /404/,
  );
});

test("public offer discovery excludes old service scopes while preserving separate software prices", () => {
  const publicOffers = liveOffers();
  const old = [
    "website_launch",
    "system_map",
    "lead_engine",
    "training_platform",
    "company_os",
    "custom_platform",
  ];
  assert.ok(publicOffers.every((offer) => !old.includes(offer.id)));
  assert.deepEqual(
    publicOffers
      .filter((offer) => offer.id.startsWith("managed_"))
      .map((offer) => offer.priceUsd)
      .sort((a, b) => Number(a) - Number(b)),
    [5000, 7500, 15000],
  );
  assert.equal(
    publicOffers.find((offer) => offer.id === "chase_sheet_monthly")?.priceUsd,
    PRICES.chaseSheetMonthly,
  );
  assert.equal(
    publicOffers.find((offer) => offer.id === "plugin")?.priceUsd,
    PRICES.pluginMonthly,
  );
  const catalog = localBusinessJsonLd().hasOfferCatalog.itemListElement;
  assert.ok(
    !catalog.some((item) =>
      /Website Launch|System Map/.test(item.itemOffered.name),
    ),
  );
  const managed = catalog.filter((item) =>
    /monthly service/.test(item.itemOffered.name),
  );
  assert.equal(managed.length, 3);
  assert.ok(
    managed.every((item) => item.priceSpecification?.billingDuration === "P1M"),
  );
});

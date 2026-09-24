import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import nextConfig from "../next.config.ts";
import * as leadNotify from "../lib/leadNotify.ts";
import * as guard from "../lib/metaCampaignGuard.ts";
import { offer } from "../lib/site/offers.ts";
import { localBusinessJsonLd } from "../lib/site/structuredData.ts";

// The free website build offer was retired on 2026-09-22. Paid Meta traffic,
// old emails, and outside links still point at /free-build, so these guards
// keep it from coming back anywhere on the site.

const require = createRequire(import.meta.url);
const root = process.cwd();

type Redirect = { source: string; destination: string; statusCode?: number; permanent?: boolean; has?: unknown; missing?: unknown };

async function freeBuildRedirects(): Promise<Redirect[]> {
  assert.equal(typeof nextConfig.redirects, "function", "next.config.ts defines redirects()");
  const all = (await nextConfig.redirects!()) as Redirect[];
  return all.filter((r) => r.source.startsWith("/free-build"));
}

test("/free-build and everything under it answer with a permanent 301 to /services", async () => {
  const redirects = await freeBuildRedirects();
  assert.deepEqual(
    redirects.map((r) => [r.source, r.destination, r.statusCode]),
    [
      ["/free-build", "/services", 301],
      ["/free-build/:path*", "/services", 301],
    ],
  );
  for (const r of redirects) {
    // `permanent: true` would send a 308. Only statusCode gives a real 301.
    assert.equal(r.permanent, undefined, r.source);
    // No conditions and no query on the destination, so Next carries the
    // visitor's own query string (the utm tags) across unchanged.
    assert.equal(r.has, undefined, r.source);
    assert.equal(r.missing, undefined, r.source);
    assert.ok(!r.destination.includes("?"), r.source);
  }
});

test("Next's own redirect matcher keeps the utm tags on the way to /services", async () => {
  // The same helpers next/dist/server/lib/router-utils/resolve-routes.js uses
  // for a configured redirect.
  const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match.js");
  const { prepareDestination } = require("next/dist/shared/lib/router/utils/prepare-destination.js");
  const { getRedirectStatus } = require("next/dist/lib/redirect-status.js");
  const redirects = await freeBuildRedirects();
  const utm = {
    utm_source: "facebook",
    utm_medium: "paid",
    utm_campaign: "free_website_longview_2026_09",
    utm_content: "instant_form_thank_you",
  };
  for (const pathname of ["/free-build", "/free-build/", "/free-build/welcome"]) {
    const route = redirects.find((r) => getPathMatch(r.source, { removeUnnamedParams: true })(pathname) !== false);
    assert.ok(route, `${pathname} matches a configured redirect`);
    const params = getPathMatch(route.source, { removeUnnamedParams: true })(pathname);
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: route.destination,
      params,
      query: { ...utm },
    });
    assert.equal(parsedDestination.pathname, "/services", pathname);
    assert.deepEqual(parsedDestination.query, utm, pathname);
    assert.equal(getRedirectStatus(route), 301, pathname);
  }
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|mjs|css|json|md)$/.test(name)) out.push(relative(root, full).split(sep).join("/"));
  }
  return out;
}

test("nothing under app/, components/, or lib/ links to /free-build", () => {
  // The two exceptions are the late-payment recorder for Stripe sessions
  // created before the retirement, and the frozen tier table it reads.
  const allowed = new Set(["lib/freeBuild.ts", "app/api/stripe-webhook/route.ts"]);
  const offenders = ["app", "components", "lib"]
    .flatMap((dir) => walk(join(root, dir)))
    .filter((file) => !allowed.has(file))
    .filter((file) => readFileSync(join(root, file), "utf8").includes("/free-build"));
  assert.deepEqual(offenders, []);
  assert.throws(() => statSync(join(root, "app/free-build")), "the route directory is gone");
});

test("the retired offers stay resolvable for old records but never render or reach structured data", () => {
  for (const id of ["free_website_program", "free_build_followup", "free_build_content", "free_build_launch"]) {
    const row = offer(id);
    assert.equal(row.status, "retired", id);
    assert.equal(row.href, "/services", id);
    assert.equal(row.priceUsd, null, id);
  }
  const catalog = JSON.stringify(localBusinessJsonLd());
  assert.ok(!/free_website_program|free_build_|Free Website/.test(catalog));
  assert.equal(offer("hosting_managed").href, "/packages/launch");
  assert.equal(offer("hosting_with_edits").href, "/packages/launch");
  assert.ok(!/free build/i.test(offer("hosting_managed").terms));
});

// Runs the real /api/leads POST with the database and email mocked, and
// reports the interest value the route would have written.
async function savedInterest(interest: string): Promise<string> {
  let inserted: Record<string, unknown> | null = null;
  const db = {
    from(table: string) {
      assert.equal(table, "leads");
      return {
        insert(row: Record<string, unknown>) {
          inserted = row;
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const code = ts.transpileModule(readFileSync(join(root, "app/api/leads/route.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  const noop = new Proxy({}, { get: () => async () => undefined });
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
    console: { error() {} },
    process: { env: { SUPABASE_SERVICE_ROLE_KEY: "fixture-db" } },
  })(
    (name: string) => {
      if (name === "@supabase/supabase-js") return { createClient: () => db };
      if (name === "@/lib/config") return { SUPABASE_URL: `https://${guard.LEADFLOW_META.supabaseProjectRef}.supabase.co` };
      if (name === "@/lib/leadNotify") return { ...leadNotify, notifyNewLeadSms: async () => undefined };
      if (name === "@/lib/metaCampaignGuard") return guard;
      // Email delivery, analytics, and anything else server-side: inert.
      if (name.startsWith("@/")) return noop;
      return require(name);
    },
    loaded,
    loaded.exports,
  );
  const response = await loaded.exports.POST(
    new Request("https://www.theleadflowpro.com/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ full_name: "Fixture Lead", email: "fixture@example.com", interest }),
    }),
  );
  assert.equal(response.status, 200, interest);
  assert.ok(inserted, "the route inserted a lead");
  return String((inserted as Record<string, unknown>).interest);
}

test("no form can file a lead under the retired free website interest", async () => {
  assert.equal(await savedInterest("free_website_program"), "unsure");
  assert.equal(await savedInterest("website_launch"), "website_launch");
  // Old rows still display with a label that says the offer is retired.
  assert.equal(leadNotify.INTEREST_LABELS.free_website_program, "Free Website Program (retired)");
  // The database keeps the value in its CHECK constraint so those old rows
  // stay valid; no migration drops it.
  const constraint = readFileSync(join(root, "supabase/migrations/20260901234500_allow_free_website_program_leads.sql"), "utf8");
  assert.equal(constraint.match(/'free_website_program'::text/g)?.length, 2);
});

test("the checkout route no longer sells the free-build tiers", () => {
  const checkout = readFileSync(join(root, "app/api/checkout/route.ts"), "utf8");
  assert.ok(!checkout.includes("@/lib/freeBuild"), "checkout does not import the retired tiers");
  assert.ok(!/FREE_BUILD|findFreeBuildTier|\/free-build|offer = "free_build"/.test(checkout));
  // PRODUCTS is the only fixed-price lookup; a free_build_* kind now misses it
  // and gets "Unknown product" before any Stripe call.
  const products = checkout.slice(checkout.indexOf("const PRODUCTS"), checkout.indexOf("export async function POST"));
  assert.ok(!/free_build_(followup|content|launch)"?\s*:/.test(products));
  // The webhook still records a late event for a session created before the
  // retirement, so money is never dropped silently.
  const hook = readFileSync(join(root, "app/api/stripe-webhook/route.ts"), "utf8");
  assert.ok(hook.includes("findFreeBuildTier(kind)") && hook.includes("ensureFreeBuildPaid("));
});

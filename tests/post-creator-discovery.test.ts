import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sitemap from "../app/sitemap.ts";
import { isPublicAnalyticsUrl } from "../lib/analytics/privacy.ts";
import { POST_CREATOR } from "../lib/postCreator/product.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { FOOTER_COLUMNS, NAV_LINKS, chromeInternalHrefs } from "../lib/site/navigation.ts";
import { PRICES, usd, usdPerMonth } from "../lib/site/prices.ts";

// Where Post Creator is found: the footer, the public page catalog, the
// sitemap, the tools page, the privacy page, analytics privacy, and the
// release paperwork. The copy rules for its own source files live in
// post-creator-guards.test.ts.

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const LONG_DASH = /[\u2013\u2014]/;

type CatalogPage = { path: string; title: string; description: string; eyebrow: string; index?: boolean };

test("the footer links Post Creator with prices read from PRICES, and the primary nav does not", () => {
  assert.equal(FOOTER_COLUMNS.length, 3);
  const links = FOOTER_COLUMNS[0].links;
  const at = links.findIndex((l) => l.href === POST_CREATOR.path);
  assert.ok(at > 0, "Post Creator is in the What we build column");
  assert.equal(
    links[at].label,
    `Post Creator | Free ideas, AI ${usdPerMonth(PRICES.postCreatorMonthly)} or ${usd(PRICES.postCreatorLifetime)} once`,
  );
  assert.equal(links[at - 1].href, "/chase-sheet", "it sits right after Chase Sheet");
  assert.equal(FOOTER_COLUMNS.flatMap((c) => c.links).filter((l) => l.href === POST_CREATOR.path).length, 1);
  assert.ok(!NAV_LINKS.some((l) => l.href.startsWith(POST_CREATOR.path)), "not in the primary navigation");
  assert.ok(chromeInternalHrefs().includes(POST_CREATOR.path));
});

test("the catalog has the three Post Creator pages, and only the app is kept out of search", () => {
  const pages = (PUBLIC_PAGE_CATALOG as readonly CatalogPage[]).filter(
    (p) => p.path === POST_CREATOR.path || p.path.startsWith(`${POST_CREATOR.path}/`),
  );
  assert.deepEqual(
    pages.map((p) => p.path),
    [POST_CREATOR.path, POST_CREATOR.termsPath, POST_CREATOR.appPath],
  );
  const paths = PUBLIC_PAGE_CATALOG.map((p) => p.path as string);
  assert.equal(paths.indexOf(POST_CREATOR.path), paths.indexOf("/chase-sheet/app") + 1, "after the Chase Sheet entries");

  const [page, terms, app] = pages;
  assert.equal(page.title, POST_CREATOR.longName);
  assert.equal(
    page.description,
    "A free post idea machine for local businesses: a new idea every tap, a 30 day plan, and drafts for five platforms. AI writing in your voice is a separate paid plan. Nothing is posted for you.",
  );
  assert.equal(page.eyebrow, "Post Creator");
  assert.equal(terms.title, "Post Creator purchase terms");
  assert.equal(terms.eyebrow, "Post Creator terms");
  assert.equal(app.title, "Your Post Creator");
  assert.equal(app.index, false);
  assert.notEqual(page.index, false);
  assert.notEqual(terms.index, false);
  for (const p of pages) {
    assert.doesNotMatch(`${p.title} ${p.description} ${p.eyebrow}`, LONG_DASH, p.path);
    assert.doesNotMatch(p.description, /\$\d/, `${p.path} states no price`);
  }
});

test("the sitemap lists the page at 0.9 and the terms, never the buyer app", () => {
  const entries = sitemap().map((e) => ({ path: new URL(e.url).pathname, priority: e.priority }));
  assert.deepEqual(
    entries.filter((e) => e.path === POST_CREATOR.path),
    [{ path: POST_CREATOR.path, priority: 0.9 }],
  );
  assert.equal(entries.filter((e) => e.path === POST_CREATOR.termsPath).length, 1);
  assert.ok(!entries.some((e) => e.path.startsWith(POST_CREATOR.appPath)), "the app is noindex");
  assert.ok(!entries.some((e) => e.path.startsWith("/api/")));
});

test("analytics treats the buyer app as private and the sales pages as public", () => {
  for (const path of [POST_CREATOR.path, POST_CREATOR.termsPath, `${POST_CREATOR.path}#pricing`, `${POST_CREATOR.path}?cancelled=1`]) {
    assert.equal(isPublicAnalyticsUrl(path), true, path);
  }
  for (const path of [
    POST_CREATOR.appPath,
    `${POST_CREATOR.appPath}/`,
    "/POST-CREATOR/APP",
    `${POST_CREATOR.appPath}?claim=existing`,
    `${POST_CREATOR.appPath}?email=a%40b.test&key=LFP-AAAA-BBBB-CCCC-DDDD`,
    `${POST_CREATOR.claimPath}?session_id=cs_live_private`,
  ]) {
    assert.equal(isPublicAnalyticsUrl(path), false, path);
  }
});

test("the tools page carries one Post Creator card between its markers, after Chase Sheet", () => {
  const page = source("app/tools/page.tsx");
  assert.match(page, /^import \{ POST_CREATOR, UNLIMITED_TOOLS_BLURB \} from "@\/lib\/postCreator\/product";$/m);
  const startMarker = "{/* post-creator:start */}";
  const endMarker = "{/* post-creator:end */}";
  assert.equal(page.split(startMarker).length, 2, "one start marker");
  assert.equal(page.split(endMarker).length, 2, "one end marker");
  const start = page.indexOf(startMarker);
  const end = page.indexOf(endMarker);
  assert.ok(start < end);
  assert.ok(page.indexOf('href: "/chase-sheet#demo"') < start, "after the Chase Sheet card");
  assert.ok(end < page.indexOf('eyebrow="SellerProof'), "before the SellerProof card");
  const slice = page.slice(start, end);
  assert.equal(slice.split("<FinalCta").length, 2, "exactly one card");
  assert.ok(slice.includes("body={UNLIMITED_TOOLS_BLURB}"));
  assert.ok(slice.includes("${POST_CREATOR.monthlyLabel}"));
  assert.ok(slice.includes("${POST_CREATOR.lifetimeLabel}"));
  assert.ok(slice.includes('primary={{ href: "/post-creator", label: "Get a post idea" }}'));
  assert.ok(slice.includes('secondary={{ href: "/post-creator#pricing", label: "See AI writing" }}'));
});

test("the privacy page explains Post Creator before retention, with the email read from BUSINESS", () => {
  const page = source("app/privacy/page.tsx");
  assert.equal(page.split("<h2>Post Creator</h2>").length, 2);
  const start = page.indexOf("<h2>Post Creator</h2>");
  const retention = page.indexOf("<h2>Retention and security</h2>");
  assert.ok(start > 0 && start < retention);
  const section = page.slice(start, retention);
  assert.equal(section.split("<h2>").length, 2, "the paragraph sits directly before Retention and security");
  const flat = section.replace(/\s+/g, " ");
  for (const phrase of [
    "runs in your browser and sends nothing to us",
    "are sent to Anthropic, the company that runs the AI model",
    "but not the draft text",
    "Nothing is posted, sent, or shared",
  ]) {
    assert.ok(flat.includes(phrase), phrase);
  }
  assert.ok(section.includes("{BUSINESS.email.hello}"));
  assert.ok(!section.includes("@theleadflowpro.com"));
  assert.doesNotMatch(section, LONG_DASH);
});

test("the decisions doc carries section L with items 84 to 99 in order", () => {
  const doc = source("docs/decisions-needed.md");
  const at = doc.indexOf("\n## L. Post Creator (September 24)\n");
  assert.ok(at > doc.indexOf("\n## K. "), "section L follows section K");
  const next = doc.indexOf("\n## ", at + 1);
  const section = doc.slice(at, next === -1 ? undefined : next);
  let last = -1;
  for (let n = 84; n <= 99; n++) {
    const found = section.search(new RegExp(`^${n}\\. \\*\\*`, "m"));
    assert.ok(found > last, `item ${n}`);
    last = found;
  }
  assert.ok(!/^(83|100)\. /m.test(section), "no other numbers inside section L");
  assert.ok(section.includes("docs/POST_CREATOR_RELEASE.md"));
  assert.doesNotMatch(section, LONG_DASH);
  assert.doesNotMatch(section, /guarant/i);
});

test("the release doc has the launch order, the runbook SQL, the spend queries, and the migration's drop list", () => {
  assert.ok(existsSync(join(process.cwd(), "docs/POST_CREATOR_RELEASE.md")));
  const doc = source("docs/POST_CREATOR_RELEASE.md");
  for (const needed of [
    "insert into public.post_creator_accounts (email, plan, status, first_session_id) values ('<email>', 'lifetime', 'active', 'manual:comp');",
    '"Email me my key"',
    "update public.post_creator_accounts set access_epoch = access_epoch + 1 where email = '<email>';",
    "from post_creator_spend_daily order by day desc limit 14;",
    "group by 1, 2;",
    "select outcome, count(*) from post_creator_generations",
    "order by 3 desc limit 20;",
    "cancel that subscription in Stripe immediately",
    "## Launch order",
    "## Rollback",
  ]) {
    assert.ok(doc.includes(needed), needed);
  }
  // Every Post Creator variable in .env.example is documented.
  const env = source(".env.example");
  const vars = [...env.matchAll(/^(POST_CREATOR_[A-Z_]+)=/gm)].map((m) => m[1]);
  assert.ok(vars.length >= 7, "the .env.example block is present");
  for (const name of vars) assert.ok(doc.includes(`\`${name}\``), name);
  // The rollback matches the drop list at the top of the migration.
  const migration = source("supabase/migrations/20260924150000_post_creator.sql");
  const drops = [...migration.matchAll(/^--\s+(drop (?:function|table) if exists [^\n]+;)$/gm)].map((m) => m[1]);
  assert.ok(drops.length >= 10, "the migration carries its drop list");
  for (const drop of drops) assert.ok(doc.includes(drop), drop);
  // The launch steps run in the order the decisions ask for.
  const order = ["**Item 84.**", "**Item 85.**", "**Items 86 to 89.**", "**Deploy with AI and sales off.**", "**Comp test account.**", "**AI on in Preview (item 91).**", "**AI on in production.**", "**Sales open (item 92).**"];
  const positions = order.map((step) => doc.indexOf(step));
  for (const [i, p] of positions.entries()) assert.ok(p > (i ? positions[i - 1] : 0), order[i]);
  assert.doesNotMatch(doc, LONG_DASH);
  assert.doesNotMatch(doc, /guarant/i);
  assert.doesNotMatch(doc, /\b(unlimited|unending|endless|infinite|never\s+run\s+out|no\s+limit)\b/i);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as pageCopy from "../app/post-creator/copy.ts";
import BlankText from "../components/postCreator/BlankText.tsx";
import * as buyButtons from "../components/postCreator/BuyButtons.tsx";
import * as copyButton from "../components/postCreator/CopyButton.tsx";
import * as draftTabs from "../components/postCreator/DraftTabs.tsx";
import * as ideaCardView from "../components/postCreator/IdeaCardView.tsx";
import { toCsv } from "../components/postCreator/PlanMonth.tsx";
import { savedCopyText } from "../components/postCreator/SavedList.tsx";
import * as setupFields from "../components/postCreator/SetupFields.tsx";
import * as shuffle from "../components/postCreator/ShuffleProvider.tsx";
import * as storage from "../components/postCreator/storage.ts";
import { brokenLinks, routeExists } from "../scripts/check-links.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { findBlanks } from "../lib/postCreator/ideas/drafts.ts";
import * as drafts from "../lib/postCreator/ideas/drafts.ts";
import * as engine from "../lib/postCreator/ideas/engine.ts";
import { DEFAULT_INPUT, newShuffleState } from "../lib/postCreator/ideas/engine.ts";
import { planMonth, planToCsv } from "../lib/postCreator/ideas/plan.ts";
import * as options from "../lib/postCreator/options.ts";
import * as product from "../lib/postCreator/product.ts";
import { POST_CREATOR, aiCapLine, triesLine } from "../lib/postCreator/product.ts";
import type { DraftView } from "../lib/postCreator/types.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { PRICES, usd } from "../lib/site/prices.ts";

const { CHECKOUT_ERRORS } = buyButtons;
const { COMPARE_HEADS, COMPARE_ROWS, FAQS, HERO, HOW_IT_WORKS, PLAN_SECTION, PRICING, closedMessage } = pageCopy;
const { MAX_SAVED, STORAGE_KEYS, clearSaved, makeSeed, readSaved, readSetup, readShuffle, removeSaved, saveItem, storageAvailable, writeSetup, writeShuffle } =
  storage;

const src = (file: string) => readFileSync(file, "utf8");
const requireReal = createRequire(import.meta.url);

// next/link has no ESM entry Node can load directly, so the components that
// use it are transpiled here with a plain <a> in its place. prefetch is a
// router option, not an attribute.
const StubLink = ({ href, children, prefetch: _prefetch, ...rest }: { href: string; children?: ReactNode; prefetch?: boolean | null }) =>
  createElement("a", { href, ...rest }, children);

/** A module imported natively, shaped the way a CommonJS default import expects. */
const esm = (ns: object) => ({ __esModule: true, ...ns });

function loadTsx<T>(file: string, modules: Record<string, unknown>): T {
  const code = ts.transpileModule(src(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const all: Record<string, unknown> = {
    react: requireReal("react"),
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "lucide-react": requireReal("lucide-react"),
    ...modules,
  };
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in all)) throw new Error(`${file} imports ${name}, which this test does not expect`);
      return all[name];
    },
    mod,
    mod.exports,
  );
  return mod.exports as T;
}

type PricingProps = { salesOpen: boolean; aiOn: boolean; cancelled: boolean };

function pricingCards(props: PricingProps): string {
  const { default: PricingCards } = loadTsx<{ default: ComponentType<PricingProps> }>("components/postCreator/PricingCards.tsx", {
    "@/app/post-creator/copy": pageCopy,
    "@/lib/postCreator/product": product,
    "./BuyButtons": esm(buyButtons),
  });
  return renderToStaticMarkup(createElement(PricingCards, props));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

/** Every string anywhere inside a value. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

type WindowStub = { localStorage?: unknown; dispatchEvent?: (e: Event) => boolean };
const g = globalThis as unknown as { window?: WindowStub };

function withWindow(stub: WindowStub, run: () => void) {
  const before = g.window;
  g.window = stub;
  try {
    run();
  } finally {
    if (before === undefined) delete g.window;
    else g.window = before;
  }
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  };
}

test("both pages share the public metadata envelope and export only static metadata", () => {
  const page = src("app/post-creator/page.tsx");
  const terms = src("app/post-creator/terms/page.tsx");
  assert.match(page, /export const metadata: Metadata = withPublicPageMetadata\("\/post-creator", \{/);
  assert.match(terms, /export const metadata: Metadata = withPublicPageMetadata\("\/post-creator\/terms", \{/);
  for (const source of [page, terms]) {
    assert.doesNotMatch(source, /generateMetadata/);
    assert.equal(count(source, "export const metadata"), 1);
  }
  assert.ok(page.includes('title: "Social Media Post Creator | The LeadFlow Pro"'));
  assert.ok(terms.includes('title: "Post Creator purchase terms | The LeadFlow Pro"'));
  // Sales and AI status are read per request from the server's environment.
  assert.ok(page.includes('export const dynamic = "force-dynamic";'));
  assert.ok(page.includes("postCreatorSalesOpen(process.env)"));
  assert.ok(page.includes("aiWritingStatus(process.env).on"));
  assert.ok(page.includes('<ShuffleProvider mode="free">'));
});

test("PricingCards shows buy buttons only while sales are open", () => {
  const closedOff = pricingCards({ salesOpen: false, aiOn: false, cancelled: false });
  assert.equal(count(closedOff, "<button"), 0);
  assert.ok(closedOff.includes(closedMessage(false)));
  assert.ok(!closedOff.includes(PRICING.aiOn));
  assert.ok(!closedOff.includes(PRICING.cancelled));

  const closedOn = pricingCards({ salesOpen: false, aiOn: true, cancelled: false });
  assert.equal(count(closedOn, "<button"), 0);
  assert.ok(closedOn.includes(closedMessage(true)));
  assert.ok(closedOn.includes(PRICING.aiOn));

  const open = pricingCards({ salesOpen: true, aiOn: true, cancelled: true });
  assert.equal(count(open, "<button"), 2);
  assert.ok(open.includes("Start monthly"));
  assert.ok(open.includes("Pay once"));
  assert.ok(!open.includes(closedMessage(true)));
  assert.ok(open.includes(PRICING.cancelled));

  for (const html of [closedOff, open]) {
    assert.ok(html.includes(usd(PRICES.postCreatorMonthly)));
    assert.ok(html.includes(usd(PRICES.postCreatorLifetime)));
    assert.ok(html.includes(`href="${POST_CREATOR.termsPath}"`));
    assert.ok(html.includes(PRICING.writeLine));
    for (const line of PRICING.fine) assert.ok(html.includes(line), line);
  }
});

test("the closed line says why, and never offers a button", () => {
  assert.equal(closedMessage(true), "The paid plan is not open yet. The idea machine above works now, free.");
  assert.equal(
    closedMessage(false),
    "The paid plan opens when AI writing is switched on. AI writing is not switched on right now. The idea machine above works now, free.",
  );
  const closed = renderToStaticMarkup(createElement(buyButtons.default, { salesOpen: false, closedMessage: closedMessage(true) }));
  assert.equal(count(closed, "<button"), 0);
  assert.ok(closed.includes(closedMessage(true)));
  const open = renderToStaticMarkup(createElement(buyButtons.default, { salesOpen: true, closedMessage: closedMessage(true) }));
  assert.equal(count(open, "<button"), 2);
});

test("BuyButtons sends only the plan's kind and handles every checkout answer", () => {
  const source = src("components/postCreator/BuyButtons.tsx");
  assert.ok(source.includes('fetch("/api/checkout", {'));
  assert.equal(count(source, "JSON.stringify("), 1);
  assert.ok(source.includes("body: JSON.stringify({ kind: postCreatorKindForPlan(plan) }),"));
  const start = source.indexOf('fetch("/api/checkout", {');
  const call = source.slice(start, source.indexOf("});", start) + 3);
  assert.ok(call.includes("JSON.stringify({ kind:"));
  assert.doesNotMatch(call, /email|price|amount|plan:/i);
  assert.ok(source.includes('body.error === "not_open"'));
  assert.ok(source.includes('body.error === "not_configured"'));
  assert.doesNotMatch(source, /declare global/);
  assert.equal(CHECKOUT_ERRORS.notOpen, "The paid plan is not open yet. The idea machine works now, free.");
  assert.equal(
    CHECKOUT_ERRORS.notConfigured,
    `Card payment is not switched on yet. Text ${BUSINESS.phone.display} and Ryan will set you up by hand.`,
  );
  assert.equal(CHECKOUT_ERRORS.other, `Checkout did not open. Try again, or text ${BUSINESS.phone.display}.`);
  assert.equal(POST_CREATOR.monthlyKind, product.postCreatorKindForPlan("monthly"));
  assert.equal(POST_CREATOR.lifetimeKind, product.postCreatorKindForPlan("lifetime"));
});

test("storage survives a browser that refuses localStorage", () => {
  const denied = () => {
    throw new Error("denied");
  };
  const stubs: WindowStub[] = [
    {
      get localStorage(): unknown {
        throw new Error("SecurityError");
      },
      dispatchEvent: denied,
    },
    { localStorage: { getItem: denied, setItem: denied, removeItem: denied } },
    {},
  ];
  for (const stub of stubs) {
    withWindow(stub, () => {
      assert.equal(storageAvailable(), false);
      assert.equal(readShuffle(), null);
      assert.equal(writeShuffle(newShuffleState(7)), false);
      assert.equal(readSetup(), null);
      assert.equal(writeSetup({ ...DEFAULT_INPUT, trade: "hvac" }), false);
      // Save still works for the life of the tab.
      const list = saveItem({ kind: "idea", title: "Quick tip: slow drains", text: "First line: Here is a quick tip." });
      assert.equal(list.length, 1);
      assert.deepEqual(readSaved(), list);
      assert.deepEqual(removeSaved(list[0].id), []);
      saveItem({ kind: "draft", title: "A draft", text: "Hi neighbors." });
      clearSaved();
      assert.deepEqual(readSaved(), []);
      const seed = makeSeed();
      assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
    });
  }
  // No window at all (a server render).
  assert.equal(storageAvailable(), false);
  assert.equal(readShuffle(), null);
  assert.deepEqual(readSaved(), []);
});

test("storage keeps at most 200 saved items, newest first, and round-trips its state", () => {
  assert.deepEqual(STORAGE_KEYS, {
    shuffle: "lfp_post_creator_shuffle_v1",
    setup: "lfp_post_creator_setup_v1",
    saved: "lfp_post_creator_saved_v1",
  });
  assert.equal(MAX_SAVED, 200);
  const local = memoryStorage();
  const events: string[] = [];
  withWindow({ localStorage: local, dispatchEvent: (e: Event) => (events.push(e.type), true) }, () => {
    assert.equal(storageAvailable(), true);
    for (let i = 0; i < 205; i++) saveItem({ kind: "idea", title: `Idea ${i}`, text: `Text ${i}` });
    const saved = readSaved();
    assert.equal(saved.length, 200);
    assert.equal(saved[0].title, "Idea 204");
    assert.equal(saved[199].title, "Idea 5");
    assert.equal(new Set(saved.map((s) => s.id)).size, 200);
    assert.ok(events.length >= 205 && events.every((e) => e === storage.SAVED_EVENT));

    // Saving the same thing again moves it to the top instead of keeping two.
    const again = saveItem({ kind: "idea", title: "Idea 100", text: "Text 100" });
    assert.equal(again.length, 200);
    assert.equal(again[0].title, "Idea 100");
    assert.equal(again.filter((s) => s.title === "Idea 100").length, 1);

    assert.equal(removeSaved(again[0].id).length, 199);
    clearSaved();
    assert.deepEqual(readSaved(), []);
    assert.equal(local.map.has(STORAGE_KEYS.saved), false);

    // Junk in storage never breaks a read.
    local.map.set(STORAGE_KEYS.saved, "{not json");
    assert.deepEqual(readSaved(), []);
    local.map.set(STORAGE_KEYS.saved, JSON.stringify([{ id: "a" }, "x", null]));
    assert.deepEqual(readSaved(), []);
    local.map.set(STORAGE_KEYS.shuffle, "{\"v\":2}");
    assert.equal(readShuffle(), null);
    local.map.set(STORAGE_KEYS.setup, "[1,2]");
    assert.equal(readSetup(), null);

    const state = { v: 1 as const, seed: 42, cursors: { "plumbing|": 3 } };
    assert.equal(writeShuffle(state), true);
    assert.deepEqual(readShuffle(), state);

    assert.equal(writeSetup({ ...DEFAULT_INPUT, trade: "roofing", town: "  Longview  ", services: ["Repairs", "repairs", "Gutters"] }), true);
    const setup = readSetup();
    assert.equal(setup?.trade, "roofing");
    assert.equal(setup?.town, "Longview");
    assert.deepEqual(setup?.services, ["Repairs", "Gutters"]);
    local.map.set(STORAGE_KEYS.setup, JSON.stringify({ trade: "not-a-trade", voice: "shouty", cta: "fax" }));
    assert.deepEqual(readSetup(), { ...DEFAULT_INPUT, services: [] });
  });
});

test("the page copy passes the house copy rules and reads its numbers from product.ts", () => {
  const all = strings({ HERO, HOW_IT_WORKS, PLAN_SECTION, COMPARE_HEADS, COMPARE_ROWS, PRICING, FAQS, CHECKOUT_ERRORS }).concat(
    closedMessage(true),
    closedMessage(false),
    copyButton.COPY_FAILED,
  );
  assert.ok(all.length > 50);
  for (const s of all) {
    assert.deepEqual(copyProblems(s), [], s);
    assert.doesNotMatch(s, /[\u2013\u2014]/, s);
    assert.doesNotMatch(s, /unlimited\s+(ai|writ|draft)/i, s);
  }

  assert.equal(HERO.title, POST_CREATOR.longName);
  assert.equal(HERO.body, product.UNLIMITED_HERO);
  assert.equal(HOW_IT_WORKS.length, 3);
  assert.equal(COMPARE_ROWS[0].free, product.UNLIMITED_ROW);
  assert.ok(COMPARE_ROWS[0].label.startsWith(`Idea machine, ${options.TRADES.length - 1} trades`));
  const m = POST_CREATOR.ai.monthly;
  const l = POST_CREATOR.ai.lifetime;
  assert.equal(COMPARE_ROWS[4].paid, `Monthly: ${m.perMonth} a month, ${m.perDay} a day. One payment: ${l.perMonth} a month, ${l.perDay} a day`);

  const [monthly, lifetime] = PRICING.plans;
  assert.equal(monthly.plan, "monthly");
  assert.equal(monthly.price, usd(PRICES.postCreatorMonthly));
  assert.equal(monthly.bullets[0], `Up to ${m.perMonth} AI writes a month, ${m.perDay} a day`);
  assert.equal(lifetime.plan, "lifetime");
  assert.equal(lifetime.price, usd(PRICES.postCreatorLifetime));
  assert.ok(lifetime.bullets[0].startsWith(`Up to ${l.perMonth} AI writes a month, ${l.perDay} a day, for as long as`));
  assert.deepEqual(PRICING.fine, [triesLine("monthly"), product.SPEND_PAUSE_LINE, product.COST_LIMIT_LINE]);

  assert.equal(FAQS.length, 9);
  assert.equal(FAQS[0].q, product.UNLIMITED_FAQ_Q);
  assert.ok(FAQS[2].a.includes(`${options.ANGLE_IDS.length} in all`));
  assert.ok(FAQS[4].a.startsWith(aiCapLine("monthly")));
  assert.ok(FAQS[4].a.endsWith(triesLine("monthly")));
  assert.ok(FAQS[5].a.endsWith(product.FILTER_LINE));
  assert.deepEqual(
    FAQS.filter((f) => f.link).map((f) => f.link?.href),
    ["/agency", "/privacy"],
  );
  assert.doesNotMatch(JSON.stringify(FAQS), /time-back|time back/i);
});

test("every internal link on the two pages goes to a real route", () => {
  for (const href of ["/agency", "/privacy", "/terms", POST_CREATOR.path, POST_CREATOR.termsPath]) {
    assert.equal(routeExists(href), true, href);
  }
  const offerLinks = brokenLinks().filter((b) => b.href.startsWith(POST_CREATOR.path));
  assert.deepEqual(offerLinks, []);
  for (const file of ["app/post-creator/page.tsx", "app/post-creator/terms/page.tsx", "components/postCreator/PricingCards.tsx", "components/postCreator/IdeaMachine.tsx"]) {
    assert.doesNotMatch(src(file), /<a href="\//, file);
  }
});

test("the terms read every allowance and promise line from product.ts", () => {
  const terms = src("app/post-creator/terms/page.tsx");
  for (const needle of [
    'aiCapLine("monthly")',
    'aiCapLine("lifetime")',
    'triesLine("monthly")',
    "SPEND_PAUSE_LINE",
    "COST_LIMIT_LINE",
    "FILTER_LINE",
    "POST_CREATOR_DISCLAIMER",
    "POST_CREATOR.pastDueGraceDays",
    "POST_CREATOR.monthlyLabel",
    "POST_CREATOR.lifetimeLabel",
    "BUSINESS.dbaLine",
    "BUSINESS.email.hello",
    "BUSINESS.phone.display",
    "Know what you are buying.",
    "No promises about results",
  ]) {
    assert.ok(terms.includes(needle), needle);
  }
  assert.doesNotMatch(terms, /\$\d/);
});

test("the idea machine renders its waiting state on the server and touches no browser API there", () => {
  const { default: IdeaMachine } = loadTsx<{ default: ComponentType<{ aiHref?: string }> }>("components/postCreator/IdeaMachine.tsx", {
    "@/lib/postCreator/ideas/drafts": drafts,
    "@/lib/postCreator/ideas/engine": engine,
    "@/lib/postCreator/options": options,
    "@/lib/postCreator/product": product,
    "./DraftTabs": esm(draftTabs),
    "./IdeaCardView": esm(ideaCardView),
    "./SetupFields": esm(setupFields),
    "./ShuffleProvider": esm(shuffle),
    "./storage": storage,
  });
  for (const mode of ["free", "paid"] as const) {
    const html = renderToStaticMarkup(
      // The provider's props type requires children, so they go in the props here.
      // eslint-disable-next-line react/no-children-prop
      createElement(shuffle.default, {
        mode,
        initialInput: { ...DEFAULT_INPUT, trade: "plumbing" },
        children: createElement(IdeaMachine, { aiHref: "/post-creator#pricing" }),
      }),
    );
    assert.ok(html.includes("Shuffling ideas..."), mode);
    assert.ok(html.includes('aria-busy="true"'), mode);
  }
  assert.throws(() => renderToStaticMarkup(createElement(IdeaMachine, {})), /inside a ShuffleProvider/);
});

test("client components say so, and the pricing cards stay a server component", () => {
  for (const name of ["ShuffleProvider", "IdeaMachine", "IdeaCardView", "DraftTabs", "SetupFields", "PlanMonth", "SavedList", "CopyButton", "BuyButtons"]) {
    assert.ok(src(`components/postCreator/${name}.tsx`).startsWith('"use client";'), name);
  }
  assert.ok(!src("components/postCreator/PricingCards.tsx").includes('"use client"'));
  assert.ok(!src("components/postCreator/BlankText.tsx").includes('"use client"'));
});

test("blanks are marked and read out, and the draft lines count them", () => {
  const text = "Hey everyone.\nThe myth: [what people often believe].\nThe fact: [what is actually true].";
  const html = renderToStaticMarkup(createElement(BlankText, { text }));
  assert.equal(count(html, "<mark"), findBlanks(text).length);
  assert.equal(count(html, "(fill in)"), 2);
  assert.ok(html.includes("whitespace-pre-wrap"));

  const d: DraftView = { platform: "google", text: "x", hashtags: [], shotList: [], chars: 1234, limit: 1500, blanks: [] };
  assert.equal(draftTabs.charsLine(d), "1,234 of 1,500 characters");
  assert.equal(draftTabs.charsLine({ ...d, limit: null }), "1,234 characters");
  assert.equal(draftTabs.blanksLine(1), "1 blank to fill in before you post");
  assert.equal(draftTabs.blanksLine(3), "3 blanks to fill in before you post");

  const tabs = renderToStaticMarkup(
    createElement(draftTabs.default, { drafts: options.PLATFORM_IDS.map((p) => ({ ...d, platform: p, text: `Post for ${p}` })) }),
  );
  assert.equal(count(tabs, 'role="tab"'), 5);
  assert.equal(count(tabs, 'aria-selected="true"'), 1);
  for (const label of ["Facebook", "Instagram", "Google", "Nextdoor", "Short video"]) assert.ok(tabs.includes(`>${label}</button>`), label);
  assert.ok(!tabs.includes(">Save</button>"));
});

test("the month plan downloads as a spreadsheet that opens cleanly", () => {
  assert.equal(toCsv(["A", "B"], [["one", 'say "hi"'], ["two\nlines", ""]]), '"A","B"\r\n"one","say ""hi"""\r\n"two\nlines",""');
  const input = { ...DEFAULT_INPUT, trade: "plumbing" as const, businessName: "=Piney Woods Plumbing" };
  const { days } = planMonth(input, newShuffleState(11), "2026-10-05", "three");
  assert.equal(days.length, 13);
  const { headers, rows } = planToCsv(days, input, "facebook");
  const csv = toCsv(headers, rows);
  assert.ok(csv.startsWith('"Date","Idea","Angle","First line","What to show","Draft (Facebook)"\r\n'));
  assert.equal(csv.split("\r\n").length, 14);

  const text = savedCopyText([
    { id: "1", savedAt: "", kind: "idea", title: "One", text: "First" },
    { id: "2", savedAt: "", kind: "draft", title: "Two", text: "Second" },
  ]);
  assert.equal(text, "One\n\nFirst\n\n----------\n\nTwo\n\nSecond");
});

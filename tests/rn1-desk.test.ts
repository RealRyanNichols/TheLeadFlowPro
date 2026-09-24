import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { copyProblems } from "../lib/hq/copy.ts";
import * as rn1Desk from "../lib/rn1Desk.ts";

// The RN-1 trading desk in the back office: the summary of the trading
// server's data.json, the Command page panel that frames the live page, and
// the nav link. Every figure here is a fixture, not a live reading, and
// nothing in these files can place or change a trade.

const requireReal = createRequire(import.meta.url);
const src = (file: string) => readFileSync(file, "utf8");
const PANEL = "app/admin/command-center/Rn1DeskPanel.tsx";
const LIVE = "app/admin/command-center/Rn1DeskLive.tsx";
const BUTTON = "app/admin/command-center/Rn1FullScreenButton.tsx";
const NOW = Date.parse("2026-09-24T16:10:00Z");

function deskData(status: Record<string, unknown> = {}, root: Record<string, unknown> = {}) {
  return {
    generated_at: "2026-09-24T16:07:32+00:00",
    market: {
      "HYPE-USD": {
        pid: "HYPE-USD",
        name: "Hyperliquid",
        candles: [
          [1790121600, 95, 99, 92, 94.2],
          [1790208000, 94.2, 95.5, 92.8, 93.1],
        ],
      },
    },
    status: {
      engine: "v2.1",
      equity: 99.45,
      heartbeat_at: "2026-09-24T16:07:27+00:00",
      halted: false,
      position: { pid: "HYPE-USD", size: 0.537, entry: 97.58, stop: 85.87, stop_limit: 81.57, target: null, kind: "trend" },
      pending: null,
      funded: 100,
      trades: [{ pid: "XRP-USD", entry: 1.54162, exit: 1.6508, net: 3.2558 }],
      ...status,
    },
    ...root,
  };
}

function loadTsx(file: string, modules: Record<string, unknown> = {}) {
  const code = ts.transpileModule(src(file), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const known: Record<string, unknown> = {
    react: requireReal("react"),
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "lucide-react": requireReal("lucide-react"),
    "@/lib/rn1Desk": rn1Desk,
    ...modules,
  };
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in known)) throw new Error(`${file} imports ${name}, which this harness does not expect`);
      return known[name];
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

/** Visible text: tags out, entities decoded, every kind of space (\s covers no-break spaces) one space. */
function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

type DeskProps = { desk: rn1Desk.Rn1DeskSummary | null };

function numbersHtml(desk: rn1Desk.Rn1DeskSummary | null) {
  const { Rn1DeskNumbers } = loadTsx(LIVE) as { Rn1DeskNumbers: FunctionComponent<DeskProps> };
  return renderToStaticMarkup(createElement(Rn1DeskNumbers, { desk }));
}

test("summary: the open trade with its latest price, the stop, the account and the closed trades", () => {
  const s = rn1Desk.summarizeRn1Desk(deskData(), NOW);
  assert.ok(s);
  assert.equal(s.engine, "live");
  assert.equal(s.heartbeatMinutes, 2);
  assert.equal(s.stale, false);
  assert.equal(s.equity, 99.45);
  assert.equal(s.funded, 100);
  assert.equal(s.closedCount, 1);
  assert.equal(s.closedNet, 3.26);
  assert.deepEqual(
    { ...s.position, changePct: Math.round((s.position?.changePct ?? 0) * 100) / 100 },
    { pid: "HYPE-USD", coin: "HYPE", entry: 97.58, now: 93.1, changePct: -4.59, stop: 85.87 },
  );
  assert.equal(s.pending, null);
});

test("summary: a quiet heartbeat, a halt, and a late publish are each called what they are", () => {
  const quiet = rn1Desk.summarizeRn1Desk(deskData({ heartbeat_at: "2026-09-24T15:40:00Z" }), NOW);
  assert.equal(quiet?.engine, "quiet");
  assert.equal(quiet?.heartbeatMinutes, 30);
  const halted = rn1Desk.summarizeRn1Desk(deskData({ halted: true }), NOW);
  assert.equal(halted?.engine, "halted");
  const noBeat = rn1Desk.summarizeRn1Desk(deskData({ heartbeat_at: "whenever" }), NOW);
  assert.equal(noBeat?.engine, "quiet");
  assert.equal(noBeat?.heartbeatAt, null);
  const late = rn1Desk.summarizeRn1Desk(deskData({}, { generated_at: "2026-09-24T15:45:00Z" }), NOW);
  assert.equal(late?.stale, true);
  assert.equal(rn1Desk.summarizeRn1Desk(deskData({}, { generated_at: null }), NOW)?.stale, true);
});

test("summary: flat, a working buy order, and malformed readings never turn into zeros", () => {
  const flat = rn1Desk.summarizeRn1Desk(
    deskData({ position: null, pending: { pid: "SOL-USD", limit: "150.25" }, trades: [] }),
    NOW,
  );
  assert.equal(flat?.position, null);
  assert.deepEqual(flat?.pending, { pid: "SOL-USD", coin: "SOL", limit: 150.25 });
  assert.equal(flat?.closedCount, 0);
  assert.equal(flat?.closedNet, 0);

  const junk = rn1Desk.summarizeRn1Desk(
    deskData({
      equity: "n/a",
      funded: undefined,
      position: { pid: "hype; drop", entry: 1 },
      pending: { pid: 42 },
      trades: ["x", null, { net: "abc" }, { net: "1.5" }],
    }),
    NOW,
  );
  assert.equal(junk?.equity, null);
  assert.equal(junk?.funded, null);
  assert.equal(junk?.position, null);
  assert.equal(junk?.pending, null);
  assert.equal(junk?.closedCount, 2, "only records count as trades");
  assert.equal(junk?.closedNet, 1.5);

  // A held coin with no published price keeps its entry and stop and says nothing about now.
  const noPrice = rn1Desk.summarizeRn1Desk(deskData({}, { market: {} }), NOW);
  assert.equal(noPrice?.position?.now, null);
  assert.equal(noPrice?.position?.changePct, null);
  assert.equal(noPrice?.position?.stop, 85.87);

  for (const bad of [null, undefined, "x", 7, [], {}, { status: [] }]) {
    assert.equal(rn1Desk.summarizeRn1Desk(bad, NOW), null, JSON.stringify(bad));
  }
});

test("money and price formatting match the desk page", () => {
  assert.equal(rn1Desk.usd(99.45), "$99.45");
  assert.equal(rn1Desk.usd(100, 0), "$100");
  assert.equal(rn1Desk.usd(-2), "-$2.00");
  assert.equal(rn1Desk.usd(1234.5, 0), "$1,235");
  assert.equal(rn1Desk.signedUsd(3.2558), "+$3.26");
  assert.equal(rn1Desk.signedUsd(-1.2), "-$1.20");
  assert.equal(rn1Desk.signedPct(-4.588), "-4.6%");
  assert.equal(rn1Desk.signedPct(0.04), "0.0%");
  assert.equal(rn1Desk.signedPct(12.345), "+12.3%");
  assert.deepEqual([65000, 97.58, 1.6508, 0.2469, 0.000031].map(rn1Desk.decimalsFor), [0, 2, 4, 5, 6]);
});

test("loading the desk: cached a minute, and a failed or slow read gives null instead of an error", async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  const calls: { url: string; init: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (url: string, init: Record<string, unknown>) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(deskData()), { status: 200 });
  }) as unknown as typeof fetch;
  const ok = await rn1Desk.loadRn1Desk(NOW);
  assert.equal(ok?.position?.coin, "HYPE");
  assert.equal(calls[0].url, "https://trading.theleadflowpro.com/data.json");
  assert.deepEqual(calls[0].init.next, { revalidate: 60 });
  assert.equal(calls[0].init.method, undefined, "a plain GET");

  globalThis.fetch = (async () => new Response("nope", { status: 502 })) as typeof fetch;
  assert.equal(await rn1Desk.loadRn1Desk(NOW), null);
  globalThis.fetch = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  assert.equal(await rn1Desk.loadRn1Desk(NOW), null);
  globalThis.fetch = (async () => new Response("not json", { status: 200 })) as typeof fetch;
  assert.equal(await rn1Desk.loadRn1Desk(NOW), null);

  t.mock.timers.enable({ apis: ["setTimeout"] });
  globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
  const hanging = rn1Desk.loadRn1Desk(NOW);
  t.mock.timers.tick(rn1Desk.RN1_FETCH_TIMEOUT_MS);
  assert.equal(await hanging, null);
});

test("the numbers: an open trade reads like the desk, with its stop, account and record", () => {
  const html = numbersHtml(rn1Desk.summarizeRn1Desk(deskData(), NOW));
  const text = textOf(html);
  for (const part of [
    "Engine live. Checked in 2 min ago.",
    "Numbers from 11:07 AM CT. The desk updates every 5 minutes.",
    "Account $99.45 of $100 funded",
    "Open trade HYPE In at $97.58, now $93.10 (-4.6%)",
    "Stop on Coinbase $85.87 Resting on Coinbase. Raised daily, never lowered.",
    "Closed trades +$3.26 1 closed trade on the record",
  ]) {
    assert.ok(text.includes(part), `${part}\n${text}`);
  }
  assert.deepEqual(copyProblems(text), []);
  // Four tiles, each with its own icon chip and accent.
  const chips = [...html.matchAll(/bg-gradient-to-br text-white (from-\[#[0-9a-f]{6}\])/g)].map((m) => m[1]);
  assert.equal(chips.length, 4);
  assert.equal(new Set(chips).size, 4);
});

test("the numbers: flat, halted, quiet, and unreadable each say so plainly", () => {
  const flat = textOf(numbersHtml(rn1Desk.summarizeRn1Desk(deskData({ position: null, trades: [] }), NOW)));
  assert.ok(flat.includes("Open trade None All cash. It buys only a daily close above the 55 day high."), flat);
  assert.ok(flat.includes("Stop on Coinbase None No open position to protect."), flat);
  assert.ok(flat.includes("Closed trades None yet The first exit will show here."), flat);

  const working = textOf(
    numbersHtml(rn1Desk.summarizeRn1Desk(deskData({ position: null, pending: { pid: "SOL-USD", limit: 150.25 } }), NOW)),
  );
  assert.ok(working.includes("Open trade SOL order Buy order working at $150.25"), working);

  const halted = numbersHtml(rn1Desk.summarizeRn1Desk(deskData({ halted: true }), NOW));
  assert.ok(textOf(halted).includes("Engine halted. No new trades."));
  assert.match(halted, /text-\[var\(--danger\)\]/);

  const quiet = textOf(
    numbersHtml(rn1Desk.summarizeRn1Desk(deskData({ heartbeat_at: "2026-09-24T15:40:00Z" }, { generated_at: "2026-09-24T15:40:05Z" }), NOW)),
  );
  assert.ok(quiet.includes("Engine quiet since 10:40 AM CT."), quiet);
  assert.ok(quiet.includes("Last update at 10:40 AM CT. The desk normally updates every 5 minutes, so it is behind."), quiet);

  const missing = numbersHtml(null);
  const missingText = textOf(missing);
  assert.ok(missingText.includes("Live numbers could not be read from the desk just now."), missingText);
  assert.ok(!/\$0|None yet/.test(missingText), "an unread desk is never shown as zero");
  assert.match(missing, /role="status"/);

  for (const text of [flat, working, textOf(halted), quiet, missingText]) assert.deepEqual(copyProblems(text), []);
});

test("the live block reads the desk through the cached loader", async () => {
  const summary = rn1Desk.summarizeRn1Desk(deskData(), NOW);
  let reads = 0;
  const live = loadTsx(LIVE, {
    "@/lib/rn1Desk": {
      ...rn1Desk,
      loadRn1Desk: async () => {
        reads += 1;
        return summary;
      },
    },
  }) as { default: () => Promise<unknown> };
  const html = renderToStaticMarkup((await live.default()) as never);
  assert.equal(reads, 1);
  assert.ok(textOf(html).includes("$99.45"));
});

test("the panel frames the live desk in a sandbox, with full screen and a new tab link", () => {
  const button = loadTsx(BUTTON);
  const panel = loadTsx(PANEL, {
    "./Rn1DeskLive": { __esModule: true, default: () => createElement("div", { "data-live": "" }, "LIVE NUMBERS") },
    "./Rn1FullScreenButton": button,
  }) as { default: FunctionComponent; RN1_FRAME_SANDBOX: string };
  const html = renderToStaticMarkup(createElement(panel.default));

  const frame = /<iframe ([^>]*)><\/iframe>/.exec(html);
  assert.ok(frame, html);
  const attr = (name: string) => new RegExp(`${name}="([^"]*)"`).exec(frame[1])?.[1];
  assert.equal(attr("src"), rn1Desk.RN1_DESK_URL);
  assert.equal(attr("title"), "RN-1 Desk live view");
  assert.equal(attr("loading"), "lazy");
  assert.equal(attr("allow"), "clipboard-write");
  const sandbox = attr("sandbox") ?? "";
  assert.equal(sandbox, panel.RN1_FRAME_SANDBOX);
  assert.ok(!/allow-top-navigation|allow-forms|allow-modals/.test(sandbox), "the desk can never steer or prompt this page");
  // The frame is for sm and up; a phone gets the link instead.
  assert.match(html, /<div class="hidden [^"]*sm:block[^"]*"><iframe /);

  const open = /<a href="([^"]+)" target="_blank" rel="noreferrer" class="[^"]*min-h-\[44px\][^"]*">Open the desk<svg/.exec(html);
  assert.ok(open, "Open the desk opens a new tab");
  assert.equal(open[1], rn1Desk.RN1_DESK_URL);
  assert.match(html, /<button type="button" class="hidden [^"]*sm:inline-flex[^"]*"><svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>Full screen<\/button>/);
  assert.ok(html.indexOf("LIVE NUMBERS") < html.indexOf("<iframe"), "numbers first, then the live page");
  assert.match(html, /<section id="rn1-desk" aria-labelledby="rn1-desk-title"/);
  assert.match(html, /<h2 id="rn1-desk-title"[^>]*>RN-1 Desk<\/h2>/);
  assert.deepEqual(copyProblems(textOf(html)), []);

  // The button only changes what is on screen.
  const code = src(BUTTON);
  assert.ok(code.startsWith('"use client";'));
  assert.ok(!/fetch\(|supabase|sendBeacon|localStorage/.test(code));
});

test("the Command page shows the desk in both views, and the back office nav opens it in one click", () => {
  const page = src("app/admin/command-center/page.tsx");
  assert.equal((page.match(/<Rn1DeskPanel \/>/g) ?? []).length, 2);
  const full = page.slice(page.lastIndexOf("<TodaysCallsBanner"));
  const at = (s: string) => full.indexOf(s);
  assert.ok(at("<WorkspaceLinks admin />") < at("<Rn1DeskPanel />"), "after the workspace links");
  assert.ok(at("<Rn1DeskPanel />") < at("Flow Mission Control"), "before the mission board");
  const failed = page.slice(page.indexOf("if (firstError)"), page.indexOf("const leads = "));
  assert.ok(failed.indexOf("Part of the overview could not be loaded.") < failed.indexOf("<Rn1DeskPanel />"));

  const layout = src("app/admin/layout.tsx");
  assert.ok(
    layout.includes(`{ href: "${rn1Desk.RN1_DESK_URL}", label: "RN-1 Desk ↗", external: true }`),
    "the nav link points at the same desk",
  );
});

test("the desk files keep the house style and stay read only", () => {
  for (const file of ["lib/rn1Desk.ts", PANEL, LIVE, BUTTON]) {
    const text = src(file);
    assert.ok(!/[–—]/.test(text), `${file}: no long dashes`);
    assert.ok(!/500-8898|19035008898|@theleadflowpro\.com/.test(text), `${file}: no hard-coded contact details`);
    assert.ok(!/api\.coinbase\.com|brokerage\/orders|api_key|apiKey|Authorization|ntfy/i.test(text), `${file}: no keys, orders, or alert feeds`);
  }
  assert.ok(!/method:/.test(src("lib/rn1Desk.ts")), "the loader only reads");
});

// The pro kit shelf.
//
// Registry rules first, then known-value checks on each kit's math, then the
// things that only matter because the buyer's own words end up inside a
// generated HTML document.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ALL_PRO_TOOLS, PRO_TOOLS, PRO_BUNDLE, getProTool, proCatalog, proUpgradesFor } from "../lib/tools/pro/index.ts";
import { validateProTools } from "../lib/tools/pro/validate.ts";
import { validateTools, formatProblems } from "../lib/tools/validate.ts";
import { renderProTool } from "../lib/tools/pro/render.ts";
import { getTool, type Values } from "../lib/tools/index.ts";
import { csv, ics, resolveBrand, safeColor, safeLogo, safeUrl, esc, addDays, nextBusinessDay } from "../lib/tools/pro/docs.ts";
import { EMPTY_BRAND_KIT } from "../lib/tools/types.ts";

const ROOT = process.cwd();

function run(slug: string, over: Values = {}, brand: Partial<Record<string, string>> = {}) {
  const tool = getProTool(slug);
  assert.ok(tool, `${slug} is not a published kit`);
  const values: Values = { ...EMPTY_BRAND_KIT };
  for (const f of tool!.fields) values[f.id] = f.type === "checks" ? [...f.def] : f.def;
  Object.assign(values, brand, over);
  return tool!.run(values);
}

const doc = (result: ReturnType<typeof run>, id: string) => {
  const found = (result.documents ?? []).find((d) => d.id === id);
  assert.ok(found, `no document "${id}". Got: ${(result.documents ?? []).map((d) => d.id).join(", ")}`);
  return found!;
};

describe("the pro registry", () => {
  test("passes the free library rules and the paid ones", () => {
    const problems = [...validateTools(ALL_PRO_TOOLS), ...validateProTools(ALL_PRO_TOOLS)];
    assert.equal(problems.length, 0, `\n${formatProblems(problems)}`);
  });

  test("every kit is priced at ten, nineteen or twenty nine dollars", () => {
    for (const kit of PRO_TOOLS) {
      assert.ok([10, 19, 29].includes(kit.pro.priceUsd), `${kit.slug} is $${kit.pro.priceUsd}`);
    }
  });

  test("the bundle costs less than buying three kits, or it is not a bundle", () => {
    const cheapestThree = PRO_TOOLS.map((t) => t.pro.priceUsd)
      .sort((a, b) => a - b)
      .slice(0, 3)
      .reduce((a, b) => a + b, 0);
    if (PRO_TOOLS.length >= 3) {
      assert.ok(
        PRO_BUNDLE.priceUsd < cheapestThree,
        `the bundle is $${PRO_BUNDLE.priceUsd} and the three cheapest kits are $${cheapestThree}`,
      );
    }
  });

  test("no kit slug collides with a free tool slug", () => {
    for (const kit of PRO_TOOLS) {
      assert.equal(getTool(kit.slug), undefined, `${kit.slug} exists in both registries`);
    }
  });

  test("kits never leak into the free library", () => {
    const catalog = proCatalog();
    assert.equal(catalog.length, PRO_TOOLS.length);
    for (const kit of PRO_TOOLS) {
      assert.equal(getTool(kit.slug), undefined);
    }
  });

  test("every free tool a kit upgrades points back at a real published tool", () => {
    for (const kit of PRO_TOOLS) {
      for (const slug of kit.pro.upgradeFrom) {
        const free = getTool(slug);
        assert.ok(free, `${kit.slug} upgrades "${slug}", which is not published`);
        assert.ok(
          proUpgradesFor(slug).some((t) => t.slug === kit.slug),
          `${slug} should offer ${kit.slug} as an upgrade`,
        );
      }
    }
  });

  test("each kit has its card and hero art on disk", () => {
    for (const kit of PRO_TOOLS) {
      for (const img of [kit.image, kit.hero]) {
        assert.ok(existsSync(join(ROOT, "public", img.src.replace(/^\//, ""))), `missing ${img.src}`);
      }
    }
  });
});

describe("locking", () => {
  const slug = PRO_TOOLS[0]?.slug;

  test("a locked render describes every document but hands over none of them", () => {
    const rendered = renderProTool(slug, {}, undefined, false);
    assert.ok(rendered);
    assert.equal(rendered!.documents, null, "a locked visitor must never receive document bodies");
    assert.ok(rendered!.listing.length >= 3, "but they still see exactly what is in the box");
    for (const item of rendered!.listing) {
      assert.ok(item.title.trim(), "every listed document is named");
      assert.ok(item.size.trim(), "and says how big it is");
    }
  });

  test("the locked preview still carries the numbers, so the tool is useful before paying", () => {
    const rendered = renderProTool(slug, {}, undefined, false);
    assert.ok(rendered!.preview.headline, "the headline number is free");
    assert.equal("documents" in rendered!.preview, false, "documents are stripped from the preview");
  });

  test("an unlocked render hands over the documents", () => {
    const rendered = renderProTool(slug, {}, undefined, true);
    assert.ok((rendered!.documents ?? []).length >= 3);
  });

  test("an unknown kit renders nothing at all", () => {
    assert.equal(renderProTool("not-a-kit", {}, undefined, true), null);
  });

  test("values outside a field's range are clamped, not trusted", () => {
    const rendered = renderProTool(slug, { missed: 999_999, closeRate: -50 }, undefined, true);
    assert.ok(rendered, "an absurd request still renders rather than throwing");
    for (const d of rendered!.documents ?? []) {
      assert.equal(/NaN|Infinity|undefined/.test(d.body), false, `${d.id} contains a broken value`);
    }
  });
});

describe("the brand kit inside a document", () => {
  const slug = PRO_TOOLS[0]?.slug;

  test("the buyer's name and phone reach the printed page", () => {
    const result = run(slug, {}, {
      brand_name: "Kirby Plumbing",
      brand_phone: "9035550142",
      brand_city: "Longview, Texas",
      brand_color: "#0B5A33",
    });
    const printed = (result.documents ?? []).find((d) => d.format === "print-html");
    assert.ok(printed);
    assert.match(printed!.body, /Kirby Plumbing/);
    assert.match(printed!.body, /\(903\) 555-0142/, "the phone is formatted, not dumped raw");
    assert.match(printed!.body, /#0B5A33/, "the brand color drives the document");
  });

  test("an empty brand kit still produces a complete document", () => {
    const result = run(slug);
    const printed = (result.documents ?? []).find((d) => d.format === "print-html");
    assert.ok(printed);
    assert.match(printed!.body, /Your business/, "it says what the name would be, rather than breaking");
    assert.ok(printed!.body.startsWith("<!doctype html>"));
    assert.equal(/undefined|NaN/.test(printed!.body), false);
  });

  test("a business name containing markup is escaped in every document that renders", () => {
    const result = run(slug, {}, { brand_name: `<script>alert(1)</script>Bob's & Sons` });
    for (const d of result.documents ?? []) {
      if (d.format !== "print-html") continue;
      assert.equal(d.body.includes("<script>alert(1)</script>"), false, `${d.id} rendered raw markup`);
      assert.match(d.body, /&lt;script&gt;/, "it appears escaped instead");
      assert.match(d.body, /Bob&#39;s &amp; Sons/);
    }
  });

  test("no generated spreadsheet cell can open as a formula", () => {
    const result = run(slug, {}, { brand_name: "=cmd|'/c calc'!A1" });
    for (const d of result.documents ?? []) {
      if (d.format !== "csv") continue;
      assert.equal(
        /(^|,)"[=+@]/.test(d.body),
        false,
        `${d.id} would evaluate as a formula when the file is opened`,
      );
    }
  });

  test("a hostile color or logo falls back instead of reaching the page", () => {
    const result = run(slug, {}, {
      brand_color: '#fff" onload="alert(1)',
      brand_logo: "javascript:alert(1)",
    });
    for (const d of result.documents ?? []) {
      assert.equal(d.body.includes("onload="), false);
      assert.equal(d.body.includes("javascript:"), false);
    }
  });
});

describe("document safety helpers", () => {
  test("only a six digit hex survives as a color", () => {
    assert.equal(safeColor("#0B5A33"), "#0B5A33");
    assert.equal(safeColor("red"), "#1240E8");
    assert.equal(safeColor('#fff" onload="x'), "#1240E8");
    assert.equal(safeColor(undefined), "#1240E8");
  });

  test("only a small inline image survives as a logo", () => {
    assert.equal(safeLogo("data:image/png;base64,iVBORw0KGgo="), "data:image/png;base64,iVBORw0KGgo=");
    assert.equal(safeLogo("https://example.com/logo.png"), "", "a remote logo would leak the print to a third party");
    assert.equal(safeLogo("javascript:alert(1)"), "");
    assert.equal(safeLogo(`data:image/png;base64,${"A".repeat(500_000)}`), "", "and it has to be small enough to print");
  });

  test("only http, https, tel and mailto survive as a link", () => {
    assert.equal(safeUrl("theleadflowpro.com"), "https://theleadflowpro.com/");
    assert.equal(safeUrl("tel:+19035550142"), "tel:+19035550142");
    assert.equal(safeUrl("javascript:alert(1)"), "");
    assert.equal(safeUrl("data:text/html,<script>"), "");
    assert.equal(safeUrl(""), "");
  });

  test("a spreadsheet cell that starts with a formula character is neutralized", () => {
    const sheet = csv(["name", "note"], [["=cmd|'/c calc'!A1", "+1-800-555-0100"], ["Kirby", 'He said "yes"']]);
    assert.match(sheet, /"'=cmd\|'\/c calc'!A1"/, "the standard apostrophe prefix, which does not display");
    assert.match(sheet, /"'\+1-800-555-0100"/, "a leading plus is a formula too");
    assert.match(sheet, /"He said ""yes"""/, "ordinary quoting still works");
    assert.equal(/(^|,)"[=+@]/.test(sheet), false);
  });

  test("escaping covers every character that could close an attribute or a tag", () => {
    assert.equal(esc(`<a href="x" onclick='y'>&</a>`), "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });

  test("an empty brand resolves to something printable", () => {
    const brand = resolveBrand({ ...EMPTY_BRAND_KIT });
    assert.equal(brand.name, "Your business");
    assert.equal(brand.personalized, false);
    assert.equal(brand.color, "#1240E8");
  });
});

describe("dates and calendar files", () => {
  test("adding days crosses months and years without a timezone shifting it", () => {
    assert.equal(addDays("2026-01-31", 1), "2026-02-01");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29", "2028 is a leap year");
  });

  test("a weekend date rolls forward to Monday", () => {
    assert.equal(nextBusinessDay("2026-09-05"), "2026-09-07", "Saturday becomes Monday");
    assert.equal(nextBusinessDay("2026-09-06"), "2026-09-07", "Sunday becomes Monday");
    assert.equal(nextBusinessDay("2026-09-08"), "2026-09-08", "a weekday is left alone");
  });

  test("the calendar file is well formed and escapes the message inside it", () => {
    const file = ics(
      [{ date: "2026-09-08", time: "08:30", minutes: 15, title: "Call back", description: "Say: hi, we missed you; text back" }],
      "Test calendar",
    );
    assert.match(file, /^BEGIN:VCALENDAR\r\n/);
    assert.match(file, /END:VCALENDAR$/);
    assert.match(file, /DTSTART:20260908T083000/);
    assert.match(file, /DTEND:20260908T084500/);
    assert.match(file, /you\\; text back/, "semicolons are escaped or the file will not parse");
    assert.equal(file.split("BEGIN:VEVENT").length - 1, 1);
    for (const line of file.split("\r\n")) {
      assert.ok(line.length <= 75, `line too long for the format: ${line.slice(0, 40)}`);
    }
  });

  test("an event crossing midnight ends on the next day", () => {
    const file = ics([{ date: "2026-09-08", time: "23:45", minutes: 30, title: "Late" }], "Test");
    assert.match(file, /DTSTART:20260908T234500/);
    assert.match(file, /DTEND:20260909T001500/);
  });
});

/* ------------------------- Missed Call Text-Back Kit ----------------------- */

describe("missed call text-back kit", () => {
  const SLUG = "missed-call-text-back-kit";

  // 6 missed a week, 30 percent would have bought, $400 first sale, 1 repeat.
  // A customer is worth 400 x (1 + 1) = $800.
  // One missed call is worth 0.30 x 800 = $240.
  // A week is 6 x 240 = $1,440. A year is 1,440 x 52 = $74,880.
  // A month is 74,880 / 12 = $6,240.
  test("the money math matches the free calculator it upgrades", () => {
    const r = run(SLUG, { missed: 6, closeRate: 30, ticket: 400, repeats: 1 });
    assert.equal(r.headline?.value, "$74,880");
    assert.match(r.headline?.sub ?? "", /\$6,240 a month/);
    assert.match(r.headline?.sub ?? "", /\$240\.00 per unanswered ring/);
    const weekly = (r.stats ?? []).find((s) => s.label === "Lost per week");
    assert.equal(weekly?.value, "$1,440");
  });

  test("zero missed calls is zero, not a broken number", () => {
    const r = run(SLUG, { missed: 0 });
    assert.equal(r.headline?.value, "$0");
    assert.match(r.explain ?? "", /Nothing is being lost/);
    assert.ok((r.documents ?? []).length >= 3, "the kit still builds, because the scripts are still the point");
  });

  // 6 missed a week with 35 percent after hours is 2.1, which rounds to 2.
  test("the after hours split comes off the share the owner set", () => {
    const r = run(SLUG, { missed: 6, afterHours: 35 });
    const after = r.bars?.items.find((b) => b.label.startsWith("After hours"));
    assert.equal(after?.display, "2 calls a week");
    const during = r.bars?.items.find((b) => b.label.startsWith("During"));
    assert.equal(during?.display, "4 calls a week");
  });

  test("all twelve scenarios come out in three voices", () => {
    const messages = doc(run(SLUG), "messages");
    assert.equal((messages.body.match(/--- FRIENDLY ---/g) ?? []).length, 12);
    assert.equal((messages.body.match(/--- DIRECT ---/g) ?? []).length, 12);
    assert.equal((messages.body.match(/--- PROFESSIONAL ---/g) ?? []).length, 12);
  });

  test("the platform sheet has a row per scenario with its trigger and delay", () => {
    const sheet = doc(run(SLUG), "platform");
    const lines = sheet.body.split("\r\n");
    assert.equal(lines.length, 13, "a header and twelve scenarios");
    assert.match(lines[0], /^"scenario","trigger","channel","delay_minutes","message"$/);
    assert.match(lines[1], /"Missed during business hours"/);
    assert.match(sheet.body, /"60"/, "the hour nudge carries its delay");
  });

  test("the chosen voice is the one that reaches the platform sheet", () => {
    const direct = doc(run(SLUG, { tone: "direct", job: "repair" }), "platform");
    assert.match(direct.body, /Missed your call\./);
    const friendly = doc(run(SLUG, { tone: "friendly", job: "repair" }), "platform");
    assert.match(friendly.body, /hands are full on a repair/);
  });

  test("the job word and the response promise land in the messages", () => {
    const messages = doc(run(SLUG, { job: "hail inspection", promise: 15 }), "messages");
    assert.match(messages.body, /hail inspection/);
    assert.match(messages.body, /inside 15 minutes/);
  });

  test("a promise of two hours reads as hours, not one hundred and twenty minutes", () => {
    const messages = doc(run(SLUG, { promise: 120, tone: "direct" }), "messages");
    assert.match(messages.body, /inside 2 hours/);
  });

  test("the ladder lands on real dates and never schedules work for a Sunday", () => {
    const cal = doc(run(SLUG, { startDate: "2026-09-04" }), "ladder");
    assert.equal(cal.body.split("BEGIN:VEVENT").length - 1, 8, "seven ladder steps plus the daily review");
    assert.equal(/DTSTART:2026090[56]/.test(cal.body), false, "nothing is scheduled on that weekend");
  });

  test("an unparseable start date falls back to today instead of breaking", () => {
    const cal = doc(run(SLUG, { startDate: "not a date" }), "ladder");
    assert.match(cal.body, /BEGIN:VEVENT/);
    assert.equal(/NaN|Invalid/.test(cal.body), false);
  });

  test("the booking link is made safe before it reaches a message", () => {
    const messages = doc(run(SLUG, { link: "kirby.com/book" }), "messages");
    assert.match(messages.body, /https:\/\/kirby\.com\/book/);
  });

  test("the wall poster is a complete printable page carrying the promise", () => {
    const poster = doc(run(SLUG, { promise: 20, owner: "Front desk, then Ryan" }), "poster");
    assert.ok(poster.body.startsWith("<!doctype html>"));
    assert.match(poster.body, /20 min/);
    assert.match(poster.body, /Front desk, then Ryan/);
  });

  test("every document in the box is named, filed and non-trivial", () => {
    const result = run(SLUG);
    const ids = (result.documents ?? []).map((d) => d.id);
    assert.deepEqual(ids.sort(), ["ladder", "messages", "platform", "playbook", "poster", "setup"]);
    for (const d of result.documents ?? []) {
      assert.ok(d.filename.includes("."), `${d.id} has no file extension`);
      assert.ok(d.body.length > 400, `${d.id} is too thin`);
      assert.ok(d.blurb, `${d.id} has no blurb, so the locked shelf cannot describe it`);
    }
  });
});

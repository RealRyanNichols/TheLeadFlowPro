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
import { signWhiteLabel, verifyWhiteLabel } from "../lib/proAccess.ts";
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

/* ------------------------------ Google Review Kit --------------------------- */

describe("google review kit", () => {
  const SLUG = "google-review-kit";

  // The same formula the free review goal calculator locks in:
  // needed = ceil(total x (goal - current) / (5 - goal))
  // 47 reviews at 4.3, target 4.8: ceil(47 x 0.5 / 0.2) = ceil(117.5) = 118.
  test("reviews needed matches the free calculator it upgrades", () => {
    const r = run(SLUG, { current: 4.3, total: 47, goal: 4.8 });
    assert.equal(r.headline?.value, "118");
  });

  // 40 customers a week at a 25 percent yes rate is 10 expected reviews a
  // week; 118 needed / 10 = 11.8, so about 12 weeks.
  test("weeks to goal comes from volume and the yes rate", () => {
    const r = run(SLUG, { current: 4.3, total: 47, goal: 4.8, weekly: 40, yesRate: 25 });
    assert.match(r.headline?.sub ?? "", /about 12 weeks/);
  });

  test("already at the target flips to maintenance instead of asking for zero", () => {
    const r = run(SLUG, { current: 4.9, total: 200, goal: 4.8 });
    assert.equal(r.headline?.label, "Already at your target");
    assert.equal(r.headline?.tone, "good");
  });

  // Projection after n five star reviews: (current x total + 5n) / (total + n).
  // Week 12 at 10/week: (4.3 x 47 + 5 x 120) / 167 = 802.1 / 167 = 4.8030...
  test("the projected rating is the weighted average, not a guess", () => {
    const r = run(SLUG, { current: 4.3, total: 47, goal: 4.8, weekly: 40, yesRate: 25 });
    const week12 = (r.stats ?? []).find((s) => s.label.includes("12 weeks"));
    assert.equal(week12?.value, "4.80");
  });

  test("a place id becomes the one tap writereview link everywhere", () => {
    const cal = doc(run(SLUG, { reviewLink: "ChIJAbCdEf1234567890gHiJ" }), "reminders");
    const scripts = doc(run(SLUG, { reviewLink: "ChIJAbCdEf1234567890gHiJ" }), "scripts");
    assert.match(scripts.body, /search\.google\.com\/local\/writereview\?placeid=ChIJAbCdEf1234567890gHiJ/);
    assert.match(cal.body, /writereview/);
  });

  test("a pasted link is used as given", () => {
    const scripts = doc(run(SLUG, { reviewLink: "https://g.page/r/AbCd123/review" }), "scripts");
    assert.match(scripts.body, /https:\/\/g\.page\/r\/AbCd123\/review/);
  });

  test("no link means the signage says sample instead of encoding a guess", () => {
    const signage = doc(run(SLUG), "signage");
    assert.match(signage.body, /SAMPLE CODE/);
    const withLink = doc(run(SLUG, { reviewLink: "ChIJAbCdEf1234567890gHiJ" }), "signage");
    assert.equal(withLink.body.includes("SAMPLE CODE"), false);
  });

  test("the signage QR only takes the brand color when the contrast scans", () => {
    // A pale yellow would not survive a scanner on white, so the code stays ink.
    const pale = doc(run(SLUG, {}, { brand_color: "#ffee88" }), "qr");
    assert.equal(pale.body.includes("#ffee88"), false);
    // A deep green has real contrast and is allowed through.
    const deep = doc(run(SLUG, {}, { brand_color: "#0b5a33" }), "qr");
    assert.match(deep.body, /#0b5a33/);
  });

  test("the plan CSV holds twelve weeks with an actuals column", () => {
    const plan = doc(run(SLUG), "plan");
    const lines = plan.body.split("\r\n");
    assert.equal(lines.length, 13);
    assert.match(lines[0], /actual_new_reviews/);
  });

  test("the reminders carry a real script in every event", () => {
    const cal = doc(run(SLUG, { startDate: "2026-09-11" }), "reminders");
    assert.equal(cal.body.split("BEGIN:VEVENT").length - 1, 12);
    assert.match(cal.body, /DESCRIPTION:/);
  });

  test("the playbook holds the no incentives rule whatever the inputs", () => {
    const playbook = doc(run(SLUG, { yesRate: 60 }), "playbook");
    assert.match(playbook.body, /Never pay, discount or gift for a review/);
  });

  test("all three voices reach the scripts file", () => {
    const scripts = doc(run(SLUG), "scripts");
    for (const voice of ["FRIENDLY VOICE", "DIRECT VOICE", "PROFESSIONAL VOICE"]) {
      assert.match(scripts.body, new RegExp(voice));
    }
  });

  test("zero existing reviews does not divide anything by zero", () => {
    const r = run(SLUG, { total: 0, current: 1 });
    assert.ok(r.headline);
    for (const d of r.documents ?? []) {
      assert.equal(/NaN|Infinity/.test(d.body), false, `${d.id} broke at zero reviews`);
    }
  });
});

/* ------------------------------ Quote Follow-Up Kit ------------------------- */

describe("quote follow-up kit", () => {
  const SLUG = "quote-follow-up-kit";

  // 30 quotes a month, $3,200 each, 10 point lift:
  // extra jobs = 30 x 0.10 = 3 a month; revenue = 3 x 3,200 = $9,600 a month,
  // $115,200 a year; profit at 38 percent margin = $43,776 a year.
  test("the money math matches the free unclosed quote calculator", () => {
    const r = run(SLUG, { quotes: 30, value: 3200, closeNow: 28, lift: 10, margin: 38 });
    assert.equal(r.headline?.value, "$115,200");
    assert.match(r.headline?.sub ?? "", /\$43,776/);
  });

  // 30 x (1 - 0.28) = 21.6 quotes open a month.
  test("open quotes come off the close rate", () => {
    const r = run(SLUG, { quotes: 30, closeNow: 28 });
    const open = (r.stats ?? []).find((s) => s.label.includes("going quiet"));
    assert.equal(open?.value, "22");
  });

  test("all seven touches land on business days from the quote date", () => {
    // 2026-09-04 is a Friday. Day 1 = Saturday the 5th, so it must roll to
    // Monday the 7th; day 30 = Sunday October 4th, rolling to Monday the 5th.
    const cal = doc(run(SLUG, { startDate: "2026-09-04" }), "reminders");
    assert.equal(cal.body.split("BEGIN:VEVENT").length - 1, 7);
    assert.match(cal.body, /DTSTART:20260907T/);
    assert.match(cal.body, /DTSTART:20261005T/);
    assert.equal(/DTSTART:2026090[56]T/.test(cal.body), false, "nothing lands on that weekend");
  });

  test("the two call touches carry scripts, not messages", () => {
    const touches = doc(run(SLUG), "touches");
    assert.equal((touches.body.match(/CALL SCRIPT/g) ?? []).length, 6, "two calls in three voices each");
    assert.match(touches.body, /objection sheet/i);
  });

  test("the honest start window reaches the schedule call", () => {
    const touches = doc(run(SLUG, { window: "the first week of October" }), "touches");
    assert.match(touches.body, /the first week of October/);
  });

  test("customer side placeholders survive as visible brackets", () => {
    const crm = doc(run(SLUG), "crm");
    assert.match(crm.body, /\[First name\]/);
    const playbook = doc(run(SLUG), "playbook");
    assert.match(playbook.body, /Nothing goes out with a bracket still in it/);
  });

  test("the CRM sheet has one row per touch with subjects on the emails", () => {
    const crm = doc(run(SLUG), "crm");
    const lines = crm.body.split("\r\n");
    assert.equal(lines.length, 8, "a header and seven touches");
    const emails = lines.filter((l) => l.includes('"email"'));
    assert.equal(emails.length, 2);
    for (const line of emails) {
      assert.match(line, /"[^"]+","email","[^"]/, "an email row carries a subject");
    }
  });

  test("the objection sheet covers the discount trap honestly", () => {
    const objections = doc(run(SLUG), "objections");
    assert.match(objections.body, /Never cut the price on the spot/);
    assert.equal((objections.body.match(/===/g) ?? []).length, 10, "five objections, framed");
  });

  test("all three voices reach the touches file", () => {
    const touches = doc(run(SLUG), "touches");
    for (const voice of ["FRIENDLY VOICE", "DIRECT VOICE", "PROFESSIONAL VOICE"]) {
      assert.match(touches.body, new RegExp(voice));
    }
  });
});

/* -------------------------------- Job Estimate Kit -------------------------- */

describe("job estimate kit", () => {
  const SLUG = "job-estimate-kit";
  const JOB = [
    "Tear out | 380 | 850",
    "Materials | 1450 | 1980",
    "Labor | 1216 | 2400",
  ].join("\n");

  // Subtotal 850 + 1,980 + 2,400 = $5,230. Deposit at 35% = $1,830.50,
  // balance $3,399.50.
  test("the totals and the deposit split are exact", () => {
    const r = run(SLUG, { lines: JOB, taxRate: 0, deposit: 35 });
    assert.equal(r.headline?.value, "$5,230.00");
    assert.match(r.headline?.sub ?? "", /\$1,830\.50 deposit/);
    assert.match(r.headline?.sub ?? "", /\$3,399\.50/);
  });

  // Tax at 8.25% on 5,230 = 431.475 -> total 5,661.475, shown to the cent.
  test("sales tax lands on the subtotal at the set rate", () => {
    const r = run(SLUG, { lines: JOB, taxRate: 8.25 });
    assert.equal(r.headline?.value, "$5,661.48");
  });

  // Costed: cost 3,046 against price 5,230 -> margin (5230-3046)/5230 = 41.76%.
  test("overall margin is share of price on the costed lines", () => {
    const r = run(SLUG, { lines: JOB });
    const margin = (r.stats ?? []).find((s) => s.label.includes("Margin"));
    assert.equal(margin?.value, "41.8%");
  });

  test("a line priced below cost turns the verdict red and names the sheet", () => {
    const r = run(SLUG, { lines: "Disposal fees | 500 | 400\nLabor | 1000 | 2400" });
    assert.equal(r.verdict?.tone, "bad");
    const sheet = doc(r, "margin");
    assert.match(sheet.body, /LOSING MONEY/);
  });

  test("a thin line is flagged against the owner's own floor", () => {
    // 20 percent margin line with the floor at 25 gets flagged; at 15 it does not.
    const line = "Trim work | 800 | 1000";
    const flagged = doc(run(SLUG, { lines: line, marginFloor: 25 }), "margin");
    assert.match(flagged.body, /THIN/);
    const fine = doc(run(SLUG, { lines: line, marginFloor: 15 }), "margin");
    assert.equal(fine.body.includes(">THIN<"), false);
  });

  test("a line without a cost still prices, and the sheet says so", () => {
    const r = run(SLUG, { lines: "Mystery work | 900" });
    assert.equal(r.headline?.value, "$900.00");
    const sheet = doc(r, "margin");
    assert.match(sheet.body, /no cost given/);
  });

  test("a line the parser cannot read is reported, never silently dropped", () => {
    const sheet = doc(run(SLUG, { lines: "Good line | 100 | 200\ntotal nonsense with no price" }), "margin");
    assert.match(sheet.body, /could not read/);
    assert.match(sheet.body, /total nonsense with no price/);
  });

  test("dollar signs and commas in the numbers are forgiven", () => {
    const r = run(SLUG, { lines: "Materials | $1,450 | $1,980.00" });
    assert.equal(r.headline?.value, "$1,980.00");
  });

  test("the estimate paper carries the terms, the validity date and both signature lines", () => {
    const est = doc(run(SLUG, { lines: JOB, estDate: "2026-09-08", validDays: 30, customer: "Dana Whitfield" }), "estimate");
    assert.match(est.body, /October 8, 2026/, "valid until 30 days from the estimate date");
    assert.match(est.body, /Accepted by Dana Whitfield/);
    assert.match(est.body, /written change orders|quoted and approved in writing/);
  });

  test("options render as a separate priced section, never folded into the total", () => {
    const r = run(SLUG, { lines: "Base | 100 | 1000", options: "Upgraded trim | 380" });
    assert.equal(r.headline?.value, "$1,000.00", "the option price stays out of the total");
    const est = doc(r, "estimate");
    assert.match(est.body, /Options, priced separately/);
    assert.match(est.body, /Upgraded trim/);
  });

  test("the deposit invoice is computed from the same numbers", () => {
    const inv = doc(run(SLUG, { lines: JOB, deposit: 35 }), "invoice");
    assert.match(inv.body, /\$1,830\.50/);
    assert.match(inv.body, /\$3,399\.50/);
  });

  test("follow-ups land on business days and the expiry rides along", () => {
    // Estimate dated Friday 2026-09-04: day 2 is Sunday -> Monday the 7th.
    const cal = doc(run(SLUG, { lines: JOB, estDate: "2026-09-04", validDays: 30 }), "reminders");
    assert.equal(cal.body.split("BEGIN:VEVENT").length - 1, 4, "three follow-ups plus the expiry");
    assert.match(cal.body, /DTSTART:20260907T/);
    assert.match(cal.body, /20261004/, "the expiry event is on the valid-until date");
  });

  test("an empty estimate number derives one from the date", () => {
    const est = doc(run(SLUG, { lines: JOB, estDate: "2026-09-08", estNumber: "" }), "estimate");
    assert.match(est.body, /EST-260908/);
  });
});

/* ---------------------------------- QR Sign Kit ----------------------------- */

describe("qr sign kit", () => {
  const SLUG = "qr-sign-kit";

  test("a call code encodes a tel URI from a formatted number", () => {
    const order = doc(run(SLUG, { kind: "call", phone: "(903) 555-0142" }), "order");
    assert.match(order.body, /tel:\+19035550142/);
  });

  test("a text code uses SMSTO with the prefilled message", () => {
    const order = doc(run(SLUG, { kind: "text", phone: "903-555-0142", smsBody: "I need a quote" }), "order");
    assert.match(order.body, /SMSTO:\+19035550142:I need a quote/);
  });

  test("a wifi code escapes the characters that break the format", () => {
    const order = doc(run(SLUG, { kind: "wifi", ssid: "Shop;Guest", wifiPass: 'pa"ss:word', wifiSec: "WPA" }), "order");
    assert.match(order.body, /WIFI:T:WPA;S:Shop\\;Guest;P:pa\\"ss\\:word;;/);
  });

  test("an open wifi network carries no password field", () => {
    const order = doc(run(SLUG, { kind: "wifi", ssid: "CafeFree", wifiSec: "nopass" }), "order");
    assert.match(order.body, /WIFI:T:nopass;S:CafeFree;;/);
  });

  test("a directions code builds the maps search URL", () => {
    const order = doc(run(SLUG, { kind: "directions", address: "2800 Gilmer Rd, Longview TX" }), "order");
    assert.match(order.body, /google\.com\/maps\/search\/\?api=1&query=2800%20Gilmer/);
  });

  test("a bare domain is upgraded to https", () => {
    const order = doc(run(SLUG, { kind: "website", link: "kirbyplumbing.com/menu" }), "order");
    assert.match(order.body, /https:\/\/kirbyplumbing\.com\/menu/);
  });

  test("missing details produce a sample warning, never a junk code", () => {
    const pack = doc(run(SLUG, { kind: "call", phone: "" }), "pack");
    assert.match(pack.body, /SAMPLE CODE/);
    const order = doc(run(SLUG, { kind: "call", phone: "" }), "order");
    assert.match(order.body, /NOT SET YET, do not print/);
  });

  test("the vector file is a real scalable QR", () => {
    const svg = doc(run(SLUG, { kind: "website", link: "example.com" }), "vector");
    assert.match(svg.body, /^<svg xmlns/);
    assert.match(svg.body, /shape-rendering="crispEdges"/);
  });

  test("the contact card appears only once the brand kit has a name", () => {
    const empty = run(SLUG, { kind: "website", link: "example.com" });
    assert.equal((empty.documents ?? []).some((d) => d.id === "vcf"), false);
    const named = run(SLUG, { kind: "website", link: "example.com" }, {
      brand_name: "Kirby Plumbing",
      brand_phone: "9035550142",
      brand_email: "office@kirby.com",
    });
    const vcf = (named.documents ?? []).find((d) => d.id === "vcf");
    assert.ok(vcf, "named brand kit produces the contact card");
    assert.match(vcf!.body, /BEGIN:VCARD/);
    assert.match(vcf!.body, /TEL;TYPE=WORK,VOICE:\+19035550142/);
    assert.match(vcf!.body, /FN:Kirby Plumbing/);
  });

  test("every piece states an honest scan distance from the ten times rule", () => {
    const r = run(SLUG, { kind: "website", link: "example.com" });
    const rows = r.table?.rows ?? [];
    const poster = rows.find((row) => String(row[0]).includes("poster"));
    // 3.4 inches x 10 / 12 = 2.83 feet, rounded to 3.
    assert.equal(poster?.[2], "3 ft");
  });

  test("an absurdly long link is clamped and still encodes a working code", () => {
    // The field caps a link at 1,200 characters, which stays inside what a
    // code can reliably carry, so the kit clamps and keeps working rather
    // than refusing. The separate too-long refusal path guards the day that
    // cap ever moves.
    const r = run(SLUG, { kind: "website", link: `example.com/${"a".repeat(3000)}` });
    assert.equal(r.headline?.label, "Your code, ready to print");
    const svg = doc(r, "vector");
    assert.match(svg.body, /^<svg xmlns/);
  });
});

/* --------------------------------- Rate Card Kit ---------------------------- */

describe("rate card kit", () => {
  const SLUG = "rate-card-kit";

  // Take home 90,000 at a 25 percent set aside grosses to 120,000; plus
  // 24,000 overhead is 144,000. Hours: 48 weeks x 50 x 60 percent = 1,440
  // billable. 144,000 / 1,440 = exactly $100.00 an hour.
  test("the required rate matches the free hourly rate calculator", () => {
    const r = run(SLUG, { take: 90000, overhead: 24000, weeks: 48, hours: 50, billable: 60, tax: 25, current: 75 });
    assert.equal(r.headline?.value, "$100.00");
    // The gap is $25 across 1,440 hours: $36,000 a year left behind.
    assert.match(r.headline?.sub ?? "", /\$36,000 a year left behind/);
  });

  test("a service is priced from the rate with materials marked up, rounded to fives", () => {
    // 4 hours x $100 + 780 x 1.15 = 400 + 897 = 1,297, rounding to $1,295.
    const csvDoc = doc(
      run(SLUG, {
        take: 90000, overhead: 24000, weeks: 48, hours: 50, billable: 60, tax: 25,
        services: "Water heater replacement | 4 | 780", matMarkup: 15,
      }),
      "services",
    );
    assert.match(csvDoc.body, /"Water heater replacement","4","780",".*","1295"/);
  });

  // At a 33.33 percent increase, revenue holds up to 1 - 1/1.3333 = 25 percent
  // customer loss.
  test("the loss tolerance is the honest revenue arithmetic", () => {
    const r = run(SLUG, { take: 90000, overhead: 24000, weeks: 48, hours: 50, billable: 60, tax: 25, current: 75 });
    const tolerance = (r.stats ?? []).find((s) => s.label.includes("loss"));
    assert.equal(tolerance?.value, "25.0%");
  });

  test("a rate already high enough flips the kit to a check, not a push", () => {
    const r = run(SLUG, { take: 90000, overhead: 24000, weeks: 48, hours: 50, billable: 60, tax: 25, current: 120 });
    assert.equal(r.headline?.tone, "good");
    const sheet = doc(run(SLUG, { current: 120, take: 90000, overhead: 24000, weeks: 48, hours: 50, billable: 60, tax: 25 }), "worksheet");
    assert.match(sheet.body, /a check, not a push/);
  });

  test("the customer card shows prices and none of the derivation", () => {
    const card = doc(run(SLUG, { services: "Service call | 1.5" }), "ratecard");
    assert.equal(card.body.includes("take home"), false);
    assert.equal(card.body.includes("overhead"), false);
    assert.match(card.body, /Service call/);
  });

  test("the rollout dates count back from the effective date on business days", () => {
    // Effective Sunday 2026-11-01: the 60 day notice lands Wednesday
    // September 2, the 30 day notice Friday October 2.
    const cal = doc(run(SLUG, { effectiveDate: "2026-11-01" }), "rollout");
    assert.equal(cal.body.split("BEGIN:VEVENT").length - 1, 4);
    assert.match(cal.body, /DTSTART:20260902T/);
    assert.match(cal.body, /DTSTART:20261002T/);
    assert.match(cal.body, /DTSTART;?[A-Z=]*:?20261101/);
  });

  test("the letters honor already quoted work in every form", () => {
    const letters = doc(run(SLUG), "letters");
    assert.equal((letters.body.match(/quoted/gi) ?? []).length >= 3, true);
    assert.match(letters.body, /never invent a discount on the spot/);
  });

  test("an unreadable service line is reported on the worksheet", () => {
    const sheet = doc(run(SLUG, { services: "Good service | 2\njust words" }), "worksheet");
    assert.match(sheet.body, /could not read/);
    assert.match(sheet.body, /just words/);
  });
});

/* ------------------------------ Local SEO Schema Kit ------------------------ */

describe("local seo schema kit", () => {
  const SLUG = "local-seo-schema-kit";
  const BRAND = {
    brand_name: "Kirby Plumbing",
    brand_phone: "9035550142",
    brand_site: "kirbyplumbing.com",
    brand_city: "Longview, Texas",
  };
  const FULL = {
    bizType: "Plumber",
    street: "2800 Gilmer Rd",
    state: "TX",
    zip: "75604",
    areas: "Longview, Marshall, Kilgore",
    hours: "Mo-Fr 08:00-17:00; Sa 09:00-12:00",
    services: "Water heater replacement | Same week with haul away\nDrain cleaning | Camera inspection included",
    faqs: "Do you charge for estimates? | No, estimates are free in our service area.",
  };

  test("the site-wide graph is valid JSON-LD carrying the business", () => {
    const block = doc(run(SLUG, FULL, BRAND), "sitewide");
    const json = JSON.parse(block.body.replace(/<\/?script[^>]*>/g, ""));
    const business = json["@graph"][0];
    assert.equal(business["@type"], "Plumber");
    assert.equal(business.name, "Kirby Plumbing");
    assert.equal(business.telephone, "+19035550142");
    assert.equal(business.address.addressLocality, "Longview");
    assert.equal(business.areaServed.length, 3);
    assert.equal(business.hasOfferCatalog.itemListElement.length, 2);
  });

  test("hours parse into real OpeningHoursSpecification ranges", () => {
    const block = doc(run(SLUG, FULL, BRAND), "graph");
    const json = JSON.parse(block.body);
    const spec = json["@graph"][0].openingHoursSpecification;
    assert.equal(spec.length, 2);
    assert.deepEqual(spec[0].dayOfWeek, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    assert.equal(spec[1].opens, "09:00");
  });

  test("nothing empty ever reaches the markup", () => {
    const block = doc(run(SLUG, { bizType: "LocalBusiness", street: "123 Main St" }, { brand_name: "Test Co" }), "graph");
    assert.equal(block.body.includes('""'), false);
    assert.equal(block.body.includes("undefined"), false);
    const json = JSON.parse(block.body);
    assert.equal("telephone" in json["@graph"][0], false, "an unset phone is omitted, not empty");
  });

  test("the kit never fabricates review or rating markup", () => {
    for (const d of run(SLUG, FULL, BRAND).documents ?? []) {
      assert.equal(/aggregateRating|reviewRating|"review"/i.test(d.body), false, `${d.id} invents reputation data`);
    }
  });

  test("meta titles stay inside sixty characters and carry the city", () => {
    const plan = doc(run(SLUG, FULL, BRAND), "pageplan");
    const rows = plan.body.split("\r\n").slice(1);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      const cells = row.split('","');
      const chars = Number(cells[4]);
      assert.ok(chars <= 60, `title runs ${chars} characters`);
    }
    assert.match(plan.body, /Water heater replacement in Longview/);
  });

  test("the faq block only exists when questions were given", () => {
    const withFaq = run(SLUG, FULL, BRAND);
    assert.ok((withFaq.documents ?? []).some((d) => d.id === "faqblock"));
    const without = run(SLUG, { ...FULL, faqs: "" }, BRAND);
    assert.equal((without.documents ?? []).some((d) => d.id === "faqblock"), false);
  });

  test("the sitemap stub lists the home page and every planned page", () => {
    const stubs = doc(run(SLUG, FULL, BRAND), "stubs");
    assert.match(stubs.body, /https:\/\/kirbyplumbing\.com\/<\/loc>/);
    assert.match(stubs.body, /\/water-heater-replacement<\/loc>/);
    assert.match(stubs.body, /Sitemap: https:\/\/kirbyplumbing\.com\/sitemap\.xml/);
  });

  test("the business profile description respects its 750 character limit", () => {
    const gbp = doc(run(SLUG, FULL, BRAND), "gbp");
    const m = gbp.body.match(/\((\d+) of 750 characters\)/);
    assert.ok(m && Number(m[1]) <= 750);
  });

  test("the readiness score is honest about what is missing", () => {
    const bare = run(SLUG, {});
    assert.match(bare.headline?.value ?? "", /of 7/);
    assert.equal(bare.headline?.tone, "warn");
    const full = run(SLUG, FULL, BRAND);
    assert.equal(full.headline?.value, "7 of 7");
    assert.equal(full.headline?.tone, "good");
  });

  test("markup in a service name is escaped in html docs and clean in json", () => {
    const r = run(SLUG, { ...FULL, services: '<img onerror=x> Repair | fixes "things"' }, BRAND);
    const guide = doc(r, "guide");
    assert.equal(guide.body.includes("<img onerror"), false);
    const json = JSON.parse(doc(r, "graph").body);
    const name = json["@graph"][0].hasOfferCatalog.itemListElement[0].itemOffered.name;
    assert.equal(name, '<img onerror=x> Repair', "JSON carries it as data, where it is inert");
  });
});

/* ---------------------------- White-Label Tool Embeds ----------------------- */

describe("white-label tool embeds", () => {
  const SLUG = "white-label-tool-embeds";
  const BRAND = {
    brand_name: "Kirby Plumbing",
    brand_phone: "9035550142",
    brand_color: "#0B5A33",
  };

  test("every embed code targets a real published tool with the brand payload", () => {
    const snippets = doc(run(SLUG, { ctaLink: "kirby.com/contact" }, BRAND), "snippets");
    assert.match(snippets.body, /\/embed\/missed-call-calculator\/b\?b=[A-Za-z0-9_-]+&wl=/);
    const b64 = snippets.body.match(/\?b=([A-Za-z0-9_-]+)&wl=/)?.[1];
    assert.ok(b64);
    const payload = JSON.parse(Buffer.from(b64!, "base64url").toString("utf8"));
    assert.equal(payload.n, "Kirby Plumbing");
    assert.equal(payload.p, "19035550142");
    assert.equal(payload.c, "#0B5A33");
    assert.equal(payload.u, "https://kirby.com/contact");
  });

  test("run() emits placeholders, never real signatures", () => {
    const snippets = doc(run(SLUG, {}, BRAND), "snippets");
    assert.match(snippets.body, /wl=\{\{WL_SIGN:[A-Za-z0-9_-]+\}\}/, "the pure layer cannot sign");
  });

  test("the render layer signs only for an unlocked visitor", () => {
    process.env.PRO_TOOLS_SECRET = "test-wl-secret";
    try {
      const unlocked = renderProTool(SLUG, { ctaLink: "kirby.com" }, BRAND, true);
      const snippets = (unlocked!.documents ?? []).find((d) => d.id === "snippets");
      assert.ok(snippets);
      assert.equal(snippets!.body.includes("{{WL_SIGN:"), false, "placeholders are filled");
      const m = snippets!.body.match(/\?b=([A-Za-z0-9_-]+)&wl=([A-Za-z0-9_-]{1,64})/);
      assert.ok(m, "a signed URL exists");
      const brand = verifyWhiteLabel(m![1], m![2], ["test-wl-secret"]);
      assert.equal(brand?.n, "Kirby Plumbing", "the embed route would accept this exact URL");
      const locked = renderProTool(SLUG, { ctaLink: "kirby.com" }, BRAND, false);
      assert.equal(locked!.documents, null, "a locked visitor gets nothing signable");
    } finally {
      delete process.env.PRO_TOOLS_SECRET;
    }
  });

  test("a tampered payload is rejected by the verifier", () => {
    process.env.PRO_TOOLS_SECRET = "test-wl-secret";
    try {
      const unlocked = renderProTool(SLUG, {}, BRAND, true);
      const snippets = (unlocked!.documents ?? []).find((d) => d.id === "snippets")!;
      const m = snippets.body.match(/\?b=([A-Za-z0-9_-]+)&wl=([A-Za-z0-9_-]{1,64})/)!;
      const stolen = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"));
      stolen.n = "Somebody Else LLC";
      const forged = Buffer.from(JSON.stringify(stolen), "utf8").toString("base64url");
      assert.equal(verifyWhiteLabel(forged, m[2], ["test-wl-secret"]), null, "the signature covers the payload");
    } finally {
      delete process.env.PRO_TOOLS_SECRET;
    }
  });

  test("the verifier revalidates every field even under a good signature", () => {
    const hostile = Buffer.from(
      JSON.stringify({ n: "X", c: 'red" onload="x', u: "javascript:alert(1)", t: "Click", p: "abc" }),
      "utf8",
    ).toString("base64url");
    const sig = signWhiteLabel(hostile, "s3cret");
    const brand = verifyWhiteLabel(hostile, sig, ["s3cret"]);
    assert.ok(brand, "signed, so it verifies");
    assert.equal(brand!.c, undefined, "a malformed color is dropped");
    assert.equal(brand!.u, undefined, "a javascript: CTA is dropped");
    assert.equal(brand!.t, undefined, "and its button text with it");
    assert.equal(brand!.p, undefined, "a non-phone is dropped");
  });

  test("garbage inputs to the verifier fail closed", () => {
    assert.equal(verifyWhiteLabel(undefined, "x", ["s"]), null);
    assert.equal(verifyWhiteLabel("abc", undefined, ["s"]), null);
    assert.equal(verifyWhiteLabel("not-base64!!", "sig", ["s"]), null);
    assert.equal(verifyWhiteLabel("abc", "sig", []), null);
    const noName = Buffer.from(JSON.stringify({ p: "9035550142" }), "utf8").toString("base64url");
    assert.equal(verifyWhiteLabel(noName, signWhiteLabel(noName, "s"), ["s"]), null, "a brand without a name renders nothing");
  });

  test("the finished tools page is a complete document holding every pick", () => {
    const page = doc(run(SLUG, { picks: ["missed-call-calculator", "job-price-calculator"] }, BRAND), "page");
    assert.ok(page.body.startsWith("<!doctype html>"));
    assert.equal((page.body.match(/<iframe/g) ?? []).length, 2);
    assert.match(page.body, /#0B5A33/);
    assert.equal((page.body.match(/addEventListener\("message"/g) ?? []).length, 1, "the resize script rides once");
  });

  test("zero tools selected still ships the guide and manifest, honestly", () => {
    const r = run(SLUG, { picks: [] }, BRAND);
    assert.equal(r.headline?.tone, "warn");
    const ids = (r.documents ?? []).map((d) => d.id).sort();
    assert.deepEqual(ids, ["guide", "manifest"]);
  });

  test("a hostile business name cannot break out of the tools page markup", () => {
    const page = doc(run(SLUG, { picks: ["missed-call-calculator"] }, { brand_name: '<script>x</script>Kirby' }), "page");
    assert.equal(page.body.includes("<script>x</script>"), false);
    assert.match(page.body, /&lt;script&gt;/);
  });
});

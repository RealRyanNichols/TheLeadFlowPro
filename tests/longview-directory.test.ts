// The Longview business directory on the site: the contract re-check, the
// suppression list, search and filters, Central-time hours, the "new" and
// "hiring" lists, the indexing switch, the sitemap, and the crawler identity
// the about page publishes (which must match the engine's config.py).
//
// Fixtures are fictional: *.example domains, 903-555-01xx numbers, names
// starting "Example".

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import sitemap from "../app/sitemap.ts";
import { committedDirectoryFile, readDirectory, suppressionsFile } from "../lib/longviewDirectory/data.ts";
import {
  CRAWLER_LIMITS,
  CRAWLER_USER_AGENT,
  DIRECTORY_DISCLAIMER,
  addressLine,
  claimMailto,
  formatDay,
  formatMonthYear,
  mapsSearchUrl,
  monogramInitials,
} from "../lib/longviewDirectory/display.ts";
import { formatHours, formatTime, hoursRows, openNow } from "../lib/longviewDirectory/hours.ts";
import { directorySitemapEntries } from "../lib/longviewDirectory/metadata.ts";
import {
  hiringList,
  isDirectoryIndexable,
  isIndexable,
  newInLongview,
  paginate,
  publicZips,
  searchDirectory,
} from "../lib/longviewDirectory/query.ts";
import type { Directory, DirectoryBusiness, WeeklyHours } from "../lib/longviewDirectory/types.ts";
import { applySuppressions, genericEmailOk, registrableDomain, validateDirectory } from "../lib/longviewDirectory/validate.ts";
import { directoryProblems } from "../scripts/validate-directory.ts";
import { BUSINESS } from "../lib/site/business.ts";

const FIXTURE = path.join(process.cwd(), "tests/fixtures/longview-directory.sample.json");
const CONFIG_PY = path.join(process.cwd(), "deploy/longview-archive/longview_archive/config.py");

type RawBusiness = Record<string, unknown> & { facts: Record<string, unknown>[] };
type RawDirectory = Record<string, unknown> & { businesses: RawBusiness[] };

function rawFixture(): RawDirectory {
  return JSON.parse(readFileSync(FIXTURE, "utf8"));
}

function sample(): Directory {
  const result = validateDirectory(rawFixture());
  assert.deepEqual(result.dropped, []);
  assert.deepEqual(result.issues, []);
  return result.directory;
}

function bySlug(directory: Directory, slug: string): DirectoryBusiness {
  const business = directory.businesses.find((b) => b.slug === slug);
  assert.ok(business, slug);
  return business;
}

/** Validate the fixture after changing one business; return why it was dropped. */
function dropReason(slug: string, change: (b: RawBusiness) => void): string | undefined {
  const raw = rawFixture();
  const target = raw.businesses.find((b) => b.slug === slug);
  assert.ok(target, slug);
  change(target);
  const result = validateDirectory(raw);
  assert.equal(result.directory.businesses.some((b) => b.slug === slug), false, `${slug} should be dropped`);
  assert.equal(result.directory.businesses.length, raw.businesses.length - 1, "only the broken record is dropped");
  return result.dropped.find((d) => d.id === target.id)?.reason;
}

test("the sample fixture is fictional, complete, and passes the contract as a sample", () => {
  const raw = rawFixture();
  assert.equal(raw.sample, true);
  assert.ok(raw.businesses.length >= 8 && raw.businesses.length <= 12);
  for (const b of raw.businesses) {
    assert.match(String(b.name), /^Example /);
    const site = b.website as { url: string } | null;
    if (site) assert.match(new URL(site.url).hostname, /\.example$/);
    const phone = b.phone as { e164: string } | null;
    if (phone) assert.match(phone.e164, /^\+190355501\d\d$/);
  }
  const directory = sample();
  assert.equal(directory.sample, true);
  const businesses = directory.businesses;
  assert.ok(businesses.some((b) => b.address.street === null), "a hidden address");
  assert.ok(businesses.some((b) => b.hours && Object.values(b.hours).some((r) => r.length === 0)), "a stated closed day");
  assert.ok(businesses.some((b) => b.hours && Object.keys(b.hours).length < 7), "days not stated");
  assert.ok(businesses.some((b) => b.hours && Object.values(b.hours).some((r) => r.some(([o, c]) => c < o))), "overnight hours");
  assert.ok(businesses.some((b) => b.hiringRoles.length), "hiring roles");
  assert.ok(businesses.some((b) => b.website?.status === "moved"), "a moved website");
  assert.ok(businesses.some((b) => !b.website), "no website");
  assert.ok(businesses.some((b) => b.services.length), "services");
  assert.ok(businesses.some((b) => b.hours === null), "hours null");
  // The build gate refuses a sample file.
  assert.ok(directoryProblems(readDirectory(FIXTURE)).some((p) => p.includes("sample")));
});

test("the committed directory.json passes with nothing dropped and is not a sample", () => {
  const report = readDirectory(committedDirectoryFile(), suppressionsFile());
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.dropped, []);
  assert.equal(report.directory.sample, false);
  assert.equal(report.directory.schemaVersion, 1);
  assert.deepEqual(directoryProblems(report), []);
  const suppressions = JSON.parse(readFileSync(suppressionsFile(), "utf8"));
  assert.ok(Array.isArray(suppressions.ids));
});

test("the validator drops each kind of record that breaks the publish contract", () => {
  const cases: [string, string, (b: RawBusiness) => void][] = [
    ["email_not_generic", "example-tire-and-lube", (b) => (b.email = "jordan.lee@exampletire.example")],
    ["email_off_domain", "example-tire-and-lube", (b) => (b.email = "info@othermail.example")],
    ["email_without_website", "example-lawn-crew", (b) => {
      b.email = "info@examplelawn.example";
      b.facts.push({ field: "email", source: "website", url: null, checkedAt: "2026-09-24" });
    }],
    ["fact_not_from_website:phone", "example-tire-and-lube", (b) => {
      for (const f of b.facts) if (f.field === "phone") f.source = "npi";
    }],
    ["fact_not_from_website:hours", "example-night-owl-diner", (b) => {
      for (const f of b.facts) if (f.field === "hours") f.source = "tx_tabc";
    }],
    ["address_street_and_zip_must_match", "example-tire-and-lube", (b) => ((b.address as Record<string, unknown>).zip = null)],
    ["address_street_and_zip_must_match", "example-lawn-crew", (b) => ((b.address as Record<string, unknown>).zip = "75601")],
    ["bad_address_zip", "example-tire-and-lube", (b) => ((b.address as Record<string, unknown>).zip = "7560")],
    ["reserved_slug", "example-tire-and-lube", (b) => (b.slug = "about")],
    ["reserved_slug", "example-tire-and-lube", (b) => (b.slug = "hiring")],
    ["bad_slug", "example-tire-and-lube", (b) => (b.slug = "Example Tire")],
    ["phone_display_mismatch", "example-tire-and-lube", (b) => ((b.phone as Record<string, unknown>).display = "903-555-0100")],
    ["phone_not_nanp", "example-tire-and-lube", (b) => (b.phone = { e164: "+19031550100", display: "(903) 155-0100" })],
    ["bad_hours_time", "example-tire-and-lube", (b) => ((b.hours as Record<string, unknown>).mon = [["8:00", "17:30"]])],
    ["bad_hours_time", "example-tire-and-lube", (b) => ((b.hours as Record<string, unknown>).mon = [["24:00", "02:00"]])],
    ["bad_hours_day", "example-tire-and-lube", (b) => ((b.hours as Record<string, unknown>).monday = [])],
    ["bad_hiring_role", "example-tire-and-lube", (b) => (b.hiringRoles = ["mechanic"])],
    ["hiring_roles_without_careers", "example-tire-and-lube", (b) => {
      b.careersUrl = null;
      b.facts = b.facts.filter((f) => f.field !== "careers");
    }],
    ["bad_fact_source", "example-tire-and-lube", (b) => (b.facts[0].source = "osm")],
    ["bad_fact_checked_at", "example-tire-and-lube", (b) => (b.facts[0].checkedAt = "2026-02-30")],
    ["missing_fact:phone", "example-tire-and-lube", (b) => (b.facts = b.facts.filter((f) => f.field !== "phone"))],
    ["missing_fact:name", "example-lawn-crew", (b) => (b.facts = b.facts.filter((f) => f.field !== "name"))],
    ["permit_fact_not_from_comptroller", "example-tire-and-lube", (b) => {
      for (const f of b.facts) if (f.field === "permitSince") f.source = "npi";
    }],
    ["facebook_not_on_facebook_com", "example-tire-and-lube", (b) => ((b.social as Record<string, unknown>).facebook = "https://fb.example/exampletire")],
    ["instagram_not_on_instagram_com", "example-hair-loft", (b) => ((b.social as Record<string, unknown>).instagram = "https://www.instagram.com.example/x")],
    ["bad_website_url", "example-tire-and-lube", (b) => ((b.website as Record<string, unknown>).url = "javascript:alert(1)")],
    ["bad_website_url", "example-tire-and-lube", (b) => ((b.website as Record<string, unknown>).url = "ftp://exampletire.example/")],
    ["bad_website_status", "example-tire-and-lube", (b) => ((b.website as Record<string, unknown>).status = "great")],
    ["address_outside_longview", "example-tire-and-lube", (b) => ((b.address as Record<string, unknown>).city = "Kilgore")],
    ["bad_name", "example-tire-and-lube", (b) => (b.name = "<b>Example</b>")],
    ["unknown_category", "example-tire-and-lube", (b) => (b.category = "casinos")],
    ["bad_id", "example-tire-and-lube", (b) => (b.id = "12345")],
    ["bad_indexable", "example-tire-and-lube", (b) => (b.indexable = "yes")],
  ];
  for (const [reason, slug, change] of cases) {
    assert.equal(dropReason(slug, change), reason, reason);
  }
});

test("slug and id collisions drop the later record; unknown schema versions yield an empty directory", () => {
  const raw = rawFixture();
  const copy = structuredClone(raw.businesses[0]);
  copy.id = "lv-sampl99999";
  raw.businesses.push(copy);
  const collision = validateDirectory(raw);
  assert.deepEqual(collision.dropped, [{ id: "lv-sampl99999", reason: "duplicate_slug" }]);
  assert.ok(directoryProblems({ file: "x", directory: { ...collision.directory, sample: false }, rawCount: 11, dropped: collision.dropped, suppressed: [], issues: [] })
    .some((p) => p.includes("slug collision")));

  const future = rawFixture();
  future.schemaVersion = 2;
  const empty = validateDirectory(future);
  assert.equal(empty.directory.businesses.length, 0);
  assert.equal(empty.directory.categories.length, 0);
  assert.equal(empty.issues.length, 1);
  assert.equal(validateDirectory(null).directory.businesses.length, 0);
  assert.equal(validateDirectory({ ...rawFixture(), sample: "no" }).directory.sample, true, "anything but false is a sample");
});

test("email and domain rules mirror the engine's privacy.py", () => {
  assert.equal(registrableDomain("https://www.exampletire.example/contact"), "exampletire.example");
  assert.equal(registrableDomain("shop.example.co.uk"), "example.co.uk");
  assert.equal(registrableDomain("school.k12.tx.us"), "school.k12.tx.us");
  assert.equal(genericEmailOk("info@exampletire.example", "https://www.exampletire.example/"), true);
  assert.equal(genericEmailOk("Front.Desk@mail.exampletire.example", "exampletire.example"), true);
  assert.equal(genericEmailOk("jordan@exampletire.example", "exampletire.example"), false);
  assert.equal(genericEmailOk("info@exampletire.example.other", "exampletire.example"), false);
});

test("suppressed ids never render, and an unreadable removal list hides everything", () => {
  const directory = sample();
  const target = bySlug(directory, "example-tire-and-lube");
  const { directory: hidden, suppressed } = applySuppressions(directory, [target.id, "lv-notlisted1"]);
  assert.deepEqual(suppressed, [target.id]);
  assert.equal(hidden.businesses.some((b) => b.id === target.id), false);
  assert.equal(hidden.categories.find((c) => c.slug === "auto")?.count, 1, "category counts follow the suppression");

  const dir = mkdtempSync(path.join(tmpdir(), "lvd-"));
  const list = path.join(dir, "suppressions.json");
  writeFileSync(list, JSON.stringify({ ids: [target.id] }));
  const report = readDirectory(FIXTURE, list);
  assert.deepEqual(report.suppressed, [target.id]);
  assert.equal(report.directory.businesses.length, directory.businesses.length - 1);

  writeFileSync(list, "{ not json");
  const broken = readDirectory(FIXTURE, list);
  assert.equal(broken.directory.businesses.length, 0);
  assert.equal(broken.issues.length, 1);
  assert.ok(directoryProblems(broken).length > 0);
});

test("search matches name, category label, and services, A to Z, with filters and pages", () => {
  const directory = sample();
  const names = (r: { results: DirectoryBusiness[] }) => r.results.map((b) => b.name);
  const all = searchDirectory(directory, {});
  assert.equal(all.total, directory.businesses.length);
  assert.deepEqual(names(all), [...names(all)].sort((a, b) => a.localeCompare(b)));

  assert.deepEqual(names(searchDirectory(directory, { q: "TIRE" })), ["Example Tire & Lube"]);
  assert.deepEqual(names(searchDirectory(directory, { q: "tire & lube" })), ["Example Tire & Lube"]);
  assert.deepEqual(names(searchDirectory(directory, { q: "oil change" })), ["Example Tire & Lube"], "service tags");
  assert.deepEqual(names(searchDirectory(directory, { q: "salon" })), ["Example Hair Loft"], "category label");
  assert.deepEqual(names(searchDirectory(directory, { q: "tire bakery" })), [], "every token must match");
  assert.deepEqual(names(searchDirectory(directory, { category: "auto" })), ["Example Auto Glass", "Example Tire & Lube"]);
  assert.equal(searchDirectory(directory, { category: "not-a-category" }).total, all.total, "unknown category is ignored");

  assert.deepEqual(publicZips(directory), ["75601", "75602", "75604", "75605"]);
  const zip = searchDirectory(directory, { zip: "75601" });
  assert.deepEqual(names(zip), ["Example Family Dental Studio", "Example Night Owl Diner", "Example Tire & Lube"]);
  assert.ok(zip.results.every((b) => b.address.street !== null), "hidden addresses never match a ZIP");

  // Friday 2026-09-25 at 12:00 in Longview (CDT, UTC-5).
  const noonFriday = new Date("2026-09-25T17:00:00Z");
  const open = searchDirectory(directory, { openNow: true, now: noonFriday });
  assert.deepEqual(names(open), [
    "Example Bookkeeping Office",
    "Example Books & Gifts",
    "Example Night Owl Diner",
    "Example Tire & Lube",
    "Example Walk-In Clinic",
  ]);

  const page2 = searchDirectory(directory, { pageSize: 3, page: 2 });
  assert.equal(page2.pages, 4);
  assert.equal(page2.page, 2);
  assert.deepEqual(names(page2), names(all).slice(3, 6));
  assert.equal(searchDirectory(directory, { pageSize: 3, page: 99 }).page, 4, "page is clamped");
  assert.equal(searchDirectory(directory, { pageSize: 3, page: "x" }).page, 1);
  assert.deepEqual(paginate([], 3), { results: [], total: 0, page: 1, pages: 1 });
});

test("open now reads the business's own hours in America/Chicago", () => {
  const weekdays: WeeklyHours = { mon: [["08:00", "17:00"]], tue: [["08:00", "17:00"]], sun: [] };
  // The same UTC clock time lands an hour apart across the spring change (2026-03-08).
  assert.equal(openNow(weekdays, new Date("2026-03-02T13:30:00Z")), false, "Mon 7:30 AM CST");
  assert.equal(openNow(weekdays, new Date("2026-03-09T13:30:00Z")), true, "Mon 8:30 AM CDT");
  // And across the fall change (2026-11-01).
  assert.equal(openNow(weekdays, new Date("2026-10-26T22:30:00Z")), false, "Mon 5:30 PM CDT");
  assert.equal(openNow(weekdays, new Date("2026-11-02T22:30:00Z")), true, "Mon 4:30 PM CST");

  const night: WeeklyHours = { fri: [["18:00", "02:00"]], sat: [["11:00", "24:00"]] };
  assert.equal(openNow(night, new Date("2026-09-26T04:00:00Z")), true, "Fri 11 PM");
  assert.equal(openNow(night, new Date("2026-09-26T06:30:00Z")), true, "Sat 1:30 AM, still Friday's range");
  assert.equal(openNow(night, new Date("2026-09-26T07:30:00Z")), false, "Sat 2:30 AM, Saturday stated");
  assert.equal(openNow(night, new Date("2026-09-27T04:59:00Z")), true, "Sat 11:59 PM, open until 24:00");
  assert.equal(openNow(night, new Date("2026-09-27T05:30:00Z")), null, "Sun 12:30 AM, Sunday not stated");

  assert.equal(openNow(weekdays, new Date("2026-09-27T17:00:00Z")), false, "Sunday stated closed");
  assert.equal(openNow(weekdays, new Date("2026-09-26T17:00:00Z")), null, "Saturday not stated is unknown, never closed");
  assert.equal(openNow(null, new Date("2026-09-25T17:00:00Z")), null);
  assert.equal(openNow({ mon: [["00:00", "24:00"]] }, new Date("2026-09-28T05:00:00Z")), true, "Mon midnight, 24 hours");
});

test("hours are written the way people read them", () => {
  assert.equal(formatTime("08:00"), "8:00 AM");
  assert.equal(formatTime("17:30"), "5:30 PM");
  assert.equal(formatTime("12:00"), "12:00 PM");
  assert.equal(formatTime("24:00"), "12:00 AM");
  assert.equal(formatHours([["08:00", "17:30"]]), "8:00 AM – 5:30 PM");
  assert.equal(formatHours([["11:00", "14:00"], ["17:00", "21:00"]]), "11:00 AM – 2:00 PM, 5:00 PM – 9:00 PM");
  assert.equal(formatHours([["18:00", "02:00"]]), "6:00 PM – 2:00 AM");
  assert.equal(formatHours([["00:00", "24:00"]]), "Open 24 hours");
  assert.equal(formatHours([]), "Closed");
  const { rows, someDaysMissing } = hoursRows({ mon: [["08:00", "17:00"]], sun: [] });
  assert.deepEqual(rows.map((r) => [r.label, r.text]), [["Monday", "8:00 AM – 5:00 PM"], ["Sunday", "Closed"]]);
  assert.equal(someDaysMissing, true);
});

test("New in Longview is the 180 days before the batch, newest first", () => {
  const directory = sample();
  assert.deepEqual(
    newInLongview(directory).map((b) => [b.name, b.permitSince]),
    [
      ["Example Books & Gifts", "2026-09-01"],
      ["Example Night Owl Diner", "2026-08-03"],
      ["Example Lawn Crew", "2026-06-15"],
      ["Example Hair Loft", "2026-04-15"],
    ],
  );
  // 2026-03-01 is 207 days before the batch; a wider window takes it in.
  assert.ok(newInLongview(directory, 210).some((b) => b.name === "Example Walk-In Clinic"));
  assert.deepEqual(newInLongview({ ...directory, generatedAt: null }), []);
});

test("the hiring list is every business with a careers page on its own site, A to Z", () => {
  const directory = sample();
  assert.deepEqual(
    hiringList(directory).map((b) => [b.name, b.hiringRoles]),
    [
      ["Example Family Dental Studio", ["dental_assistant", "front_desk", "office_manager"]],
      ["Example Storage & Freight", []],
      ["Example Tire & Lube", ["front_desk"]],
      ["Example Walk-In Clinic", ["medical_assistant", "receptionist"]],
    ],
  );
});

test("indexing needs the owner's switch, real data, and a fact from the business's own website", () => {
  const directory = sample();
  const tire = bySlug(directory, "example-tire-and-lube");
  const lawn = bySlug(directory, "example-lawn-crew");
  assert.equal(isDirectoryIndexable(directory), false, "sample data is never indexable");
  assert.equal(isIndexable(directory, { ...tire, indexable: true }), false);

  const live: Directory = {
    ...directory,
    sample: false,
    indexable: true,
    businesses: directory.businesses.map((b) => ({ ...b, indexable: true })),
  };
  assert.equal(isDirectoryIndexable(live), true);
  assert.equal(isIndexable(live, bySlug(live, "example-tire-and-lube")), true);
  assert.equal(isIndexable(live, bySlug(live, "example-lawn-crew")), false, "no website fact");
  assert.equal(isIndexable(live, { ...bySlug(live, "example-tire-and-lube"), indexable: false }), false);
  assert.equal(isIndexable({ ...live, indexable: false }, tire), false, "the global switch wins");
  assert.equal(lawn.facts.some((f) => f.source === "website"), false);

  const entries = directorySitemapEntries(live, "https://www.theleadflowpro.com");
  const urls = entries.map((e) => e.url);
  assert.ok(urls.includes("https://www.theleadflowpro.com/longview/businesses"));
  assert.ok(urls.includes("https://www.theleadflowpro.com/longview/businesses/category/auto"));
  assert.ok(urls.includes("https://www.theleadflowpro.com/longview/businesses/example-tire-and-lube"));
  assert.ok(!urls.includes("https://www.theleadflowpro.com/longview/businesses/example-lawn-crew"));
  assert.deepEqual(directorySitemapEntries(directory), []);
});

test("the sitemap adds no directory URL with the committed empty batch", () => {
  delete process.env.LONGVIEW_DIRECTORY_FILE;
  const urls = sitemap().map((entry) => entry.url);
  assert.equal(urls.filter((url) => url.includes("/longview/businesses")).length, 0);
  assert.ok(urls.includes("https://www.theleadflowpro.com/longview"));
});

function pythonConstants(source: string): Map<string, string> {
  // Evaluates the simple top-level string constants in config.py: literals,
  // f-strings over earlier constants, "+" and implicit concatenation.
  const values = new Map<string, string>();
  const assignment = /^([A-Z][A-Z0-9_]*)\s*=\s*(\([\s\S]*?\n\)|[^\n]+)$/gm;
  for (const [, name, expression] of source.matchAll(assignment)) {
    let text = expression.trim();
    if (text.startsWith("(") && text.endsWith(")")) text = text.slice(1, -1);
    const token = /\s*(?:(f?)"((?:[^"\\]|\\.)*)"|([A-Z][A-Z0-9_]*)|(\+))/y;
    let out = "";
    let ok = true;
    let pos = 0;
    let m: RegExpExecArray | null;
    while (ok && (m = token.exec(text))) {
      pos = token.lastIndex;
      if (m[4]) continue;
      if (m[3] !== undefined) {
        if (!values.has(m[3])) ok = false;
        else out += values.get(m[3]);
        continue;
      }
      out += m[1]
        ? m[2].replace(/\{([A-Z][A-Z0-9_]*)\}/g, (_, key: string) => {
            if (!values.has(key)) ok = false;
            return values.get(key) ?? "";
          })
        : m[2];
    }
    if (ok && text.slice(pos).trim() === "") values.set(name, out);
  }
  return values;
}

test("the crawler identity on the about page is exactly the engine's USER_AGENT and limits", () => {
  const source = readFileSync(CONFIG_PY, "utf8");
  const constants = pythonConstants(source);
  assert.equal(constants.get("CONTACT_EMAIL"), BUSINESS.email.hello);
  assert.equal(constants.get("DIRECTORY_URL"), "https://www.theleadflowpro.com/longview/businesses");
  assert.equal(CRAWLER_USER_AGENT, constants.get("USER_AGENT"));
  assert.equal(
    CRAWLER_USER_AGENT,
    "LeadFlowPro-LongviewArchive/1.0 (+https://www.theleadflowpro.com/longview/businesses/about; hello@theleadflowpro.com)",
  );

  const setting = (name: string) => {
    const m = new RegExp(`^\\s+${name}: \\w+ = ([\\d_.]+)\\s*$`, "m").exec(source);
    assert.ok(m, name);
    return Number(m[1].replace(/_/g, ""));
  };
  assert.equal(setting("max_sites_concurrent"), CRAWLER_LIMITS.sitesAtOnce);
  assert.equal(setting("min_host_delay_s"), CRAWLER_LIMITS.secondsBetweenRequests);
  assert.equal(setting("max_pages_per_visit"), CRAWLER_LIMITS.pagesPerVisit);
  assert.equal(setting("max_page_bytes"), CRAWLER_LIMITS.maxPageMegabytes * 1_000_000);
  assert.equal(setting("robots_ttl_s"), CRAWLER_LIMITS.robotsRefreshHours * 3600);
});

test("links, dates, and the claim email say only what the listing holds", () => {
  const directory = sample();
  const tire = bySlug(directory, "example-tire-and-lube");
  const lawn = bySlug(directory, "example-lawn-crew");
  assert.equal(addressLine(tire), "100 Example St Ste 4, Longview, TX 75601");
  assert.equal(addressLine(lawn), "Longview, TX");
  assert.equal(
    new URL(mapsSearchUrl(tire)).searchParams.get("query"),
    "Example Tire & Lube, 100 Example St Ste 4, Longview, TX 75601",
  );
  assert.equal(new URL(mapsSearchUrl(lawn)).searchParams.get("query"), "Example Lawn Crew, Longview, TX");
  assert.match(mapsSearchUrl(lawn), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);

  const mail = claimMailto(tire);
  assert.ok(mail.startsWith(`mailto:${BUSINESS.email.hello}?subject=`));
  const query = new URLSearchParams(mail.split("?")[1]);
  assert.equal(query.get("subject"), `Longview directory: Example Tire & Lube (${tire.id})`);
  assert.match(query.get("body") ?? "", /\/longview\/businesses\/example-tire-and-lube/);

  assert.equal(formatDay("2026-09-24"), "Sep 24, 2026");
  assert.equal(formatMonthYear("2019-03-01"), "March 2019");
  assert.equal(monogramInitials("Example Tire & Lube"), "ET");
  assert.equal(monogramInitials("The Example Co"), "E");
  assert.equal(DIRECTORY_DISCLAIMER, "Not affiliated with the businesses listed. No rankings, no reviews, no endorsements.");
});

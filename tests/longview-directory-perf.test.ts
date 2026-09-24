// The "Open now" filter must resolve Longview's local time once per request,
// not once per business: building Intl formatters is what made a 5,000
// business batch cost about half a second of CPU per ?open=1 request.
//
// Fixtures are fictional: *.example domains, names starting "Example".

import assert from "node:assert/strict";
import test from "node:test";
import { directoryClock, openNow, openNowAt } from "../lib/longviewDirectory/hours.ts";
import { searchDirectory } from "../lib/longviewDirectory/query.ts";
import type { Directory, DirectoryBusiness, WeeklyHours } from "../lib/longviewDirectory/types.ts";

const HOURS: (WeeklyHours | null)[] = [
  { mon: [["08:00", "17:00"]], tue: [["08:00", "17:00"]], wed: [["08:00", "17:00"]], thu: [["08:00", "17:00"]], fri: [["08:00", "17:00"]], sun: [] },
  { fri: [["18:00", "02:00"]], sat: [["18:00", "24:00"]] },
  { mon: [["00:00", "24:00"]], sat: [["09:00", "12:00"], ["13:00", "16:00"]] },
  null,
];

function bigDirectory(count: number): Directory {
  const businesses = Array.from({ length: count }, (_, i) => {
    const n = String(i).padStart(5, "0");
    return {
      id: `lv-perf${n}`,
      slug: `example-business-${n}`,
      name: `Example Business ${n}`,
      category: "other",
      categoryLabel: "Other services",
      address: { street: null, city: "Longview", state: "TX", zip: null },
      permitSince: null,
      website: null,
      phone: null,
      email: null,
      hours: HOURS[i % HOURS.length],
      social: { facebook: null, instagram: null },
      careersUrl: null,
      hiringRoles: [],
      services: i % 2 ? ["oil change"] : [],
      facts: [],
      updatedAt: "2026-09-24",
      indexable: false,
    } as unknown as DirectoryBusiness;
  });
  return {
    schemaVersion: 1,
    generatedAt: "2026-09-24T18:00:00Z",
    batchId: "2026-09-24T18:00Z",
    sample: true,
    indexable: false,
    scope: "City of Longview, Texas",
    counts: { published: count, inArchive: count, heldForPrivacy: 0, needsReview: 0 },
    sources: [],
    categories: [{ slug: "other", name: "Other Services", count }],
    businesses,
  } as unknown as Directory;
}

/** Count Intl.DateTimeFormat constructions while `fn` runs. */
function countFormatters<T>(fn: () => T): { value: T; built: number } {
  const Original = Intl.DateTimeFormat;
  let built = 0;
  const Counting = new Proxy(Original, {
    construct(target, args) {
      built += 1;
      return Reflect.construct(target, args);
    },
    apply(target, thisArg, args) {
      built += 1;
      return Reflect.apply(target, thisArg, args);
    },
  });
  Intl.DateTimeFormat = Counting;
  try {
    return { value: fn(), built };
  } finally {
    Intl.DateTimeFormat = Original;
  }
}

test("Open now builds a constant number of Intl formatters per request, however many businesses", () => {
  const now = new Date("2026-09-25T17:00:00Z"); // Friday noon in Longview
  const small = countFormatters(() => searchDirectory(bigDirectory(40), { openNow: true, now }));
  const large = countFormatters(() => searchDirectory(bigDirectory(5000), { openNow: true, now }));
  assert.ok(large.built <= 4, `built ${large.built} formatters for 5,000 businesses`);
  assert.equal(large.built, small.built, "formatter count must not grow with the batch");
  // Weekday 8-5 (1 in 4) and the 24-hour Monday / split Saturday (closed-unknown on Friday) pattern.
  assert.equal(large.value.total, 1250);

  const none = countFormatters(() => searchDirectory(bigDirectory(5000), { now }));
  assert.equal(none.built, 0, "no Open now filter, no time zone work");
});

test("Open now filter keeps exactly the businesses openNow says are open", () => {
  const directory = bigDirectory(400);
  const instants = [
    "2026-09-25T17:00:00Z", // Fri 12:00 PM CDT
    "2026-09-26T06:30:00Z", // Sat 1:30 AM, inside Friday's past-midnight range
    "2026-09-26T19:30:00Z", // Sat 2:30 PM, second split range
    "2026-09-28T05:00:00Z", // Mon midnight, 24 hours
    "2026-11-02T22:30:00Z", // Mon 4:30 PM CST
    "2026-09-27T17:00:00Z", // Sunday, stated closed
  ];
  for (const iso of instants) {
    const now = new Date(iso);
    const expected = directory.businesses.filter((b) => openNow(b.hours, now) === true).map((b) => b.slug).sort();
    const got = searchDirectory(directory, { openNow: true, now, pageSize: 1000 }).results.map((b) => b.slug).sort();
    assert.deepEqual(got, expected, iso);
    const clock = directoryClock(now);
    for (const hours of HOURS) assert.equal(openNowAt(hours, clock), openNow(hours, now), `${iso} ${JSON.stringify(hours)}`);
  }
});

test("Text search results are unchanged by the memoized search text", () => {
  const directory = bigDirectory(200);
  const first = searchDirectory(directory, { q: "oil change", pageSize: 1000 });
  const again = searchDirectory(directory, { q: "OIL  change", pageSize: 1000 });
  assert.equal(first.total, 100);
  assert.deepEqual(
    again.results.map((b) => b.slug),
    first.results.map((b) => b.slug),
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEAT_HOLDING_STATUSES,
  REGISTRATION_STATUSES,
  STANDS_ALONE_DISCLOSURE,
  addressIsPublic,
  buildEventIcs,
  eventLocationLine,
  formatEventWhen,
  priceUsd,
  workshopContent,
  type EventRow,
} from "../lib/events.ts";

const EVENT: EventRow = {
  id: "11111111-2222-3333-4444-555555555555",
  slug: "chatgpt-for-business-owners-longview",
  title: "ChatGPT for Business Owners: Live in Longview",
  subtitle: "A hands-on 90-minute working session.",
  internal_title: "East Texas ChatGPT Operator Workshop",
  description: null,
  venue: "Longview Training Center",
  city: "Longview, TX",
  address_line: null,
  address_visibility: "after_payment",
  starts_at: "2026-09-10T23:30:00.000Z", // 6:30 PM CDT
  duration_minutes: 90,
  timezone: "America/Chicago",
  price_usd: "97",
  price_note: null,
  capacity: 10,
  instructor_name: "Ryan Nichols",
  clinic_enabled: true,
  is_published: true,
  registration_closed: false,
  date_confirmed: false,
  cancellation_policy: null,
  recording_notice: null,
};

test("priceUsd coerces numeric strings and garbage", () => {
  assert.equal(priceUsd(EVENT), 97);
  assert.equal(priceUsd({ price_usd: 0 }), 0);
  assert.equal(priceUsd({ price_usd: "nope" }), 0);
});

test("formatEventWhen renders the event's own timezone", () => {
  const when = formatEventWhen(EVENT);
  assert.equal(when.dateLabel, "Thursday, September 10, 2026");
  assert.match(when.timeLabel, /6:30 PM – 8:00 PM CDT/);
  assert.equal(when.iso, "2026-09-10T23:30:00.000Z");
  assert.equal(when.endIso, "2026-09-11T01:00:00.000Z");
});

test("formatEventWhen with no date announces nothing invented", () => {
  const when = formatEventWhen({ ...EVENT, starts_at: null });
  assert.equal(when.full, "Date to be announced");
  assert.equal(when.iso, null);
});

test("location line hides the address unless explicitly included", () => {
  const withAddress = { ...EVENT, address_line: "123 Private St" };
  assert.equal(
    eventLocationLine(withAddress),
    "Longview Training Center · Longview, TX",
  );
  assert.equal(
    eventLocationLine(withAddress, { includeAddress: true }),
    "Longview Training Center · 123 Private St · Longview, TX",
  );
  assert.equal(addressIsPublic(EVENT), false);
  assert.equal(addressIsPublic({ address_visibility: "public" }), true);
});

test("ICS carries the window and only the permitted address", () => {
  const ics = buildEventIcs(
    { ...EVENT, address_line: "2800 Example Rd" },
    { includeAddress: true, url: "https://www.theleadflowpro.com/events/x" },
  );
  assert.ok(ics);
  assert.match(ics!, /BEGIN:VEVENT/);
  assert.match(ics!, /DTSTART:20260910T233000Z/);
  assert.match(ics!, /DTEND:20260911T010000Z/);
  assert.match(ics!, /2800 Example Rd/);

  const hidden = buildEventIcs(
    { ...EVENT, address_line: "2800 Example Rd" },
    { includeAddress: false, url: "https://www.theleadflowpro.com/events/x" },
  );
  assert.ok(!hidden!.includes("2800 Example Rd"));

  const dateless = buildEventIcs(
    { ...EVENT, starts_at: null },
    { includeAddress: false, url: "https://x" },
  );
  assert.equal(dateless, null);
});

test("seat accounting statuses stay in sync", () => {
  for (const status of SEAT_HOLDING_STATUSES) {
    assert.ok(REGISTRATION_STATUSES.includes(status));
  }
  assert.ok(!SEAT_HOLDING_STATUSES.includes("pending" as never));
  assert.ok(!SEAT_HOLDING_STATUSES.includes("cancelled" as never));
  assert.ok(!SEAT_HOLDING_STATUSES.includes("overbooked" as never));
});

test("workshop content exists for the founding workshop and stays ChatGPT-only", () => {
  const content = workshopContent("chatgpt-for-business-owners-longview");
  assert.ok(content);
  assert.equal(content!.agenda.length, 7);
  // The curriculum windows cover the full 90 minutes in order.
  assert.equal(content!.agenda[0].window, "0–10 min");
  assert.equal(content!.agenda[6].window, "88–90 min");
  // Claude belongs to the future advanced workshop, not this one.
  const body = JSON.stringify(content);
  assert.ok(!body.includes("Claude Code class"));
  assert.ok(content!.notForYou.some((line) => line.includes("Claude")));
  // The stands-alone disclosure appears verbatim in the FAQ.
  assert.ok(content!.faq.some((item) => item.a.includes(STANDS_ALONE_DISCLOSURE)));
  assert.equal(workshopContent("some-other-event"), null);
});

test("no revenue guarantees anywhere in the workshop copy", () => {
  const body = JSON.stringify(workshopContent("chatgpt-for-business-owners-longview")).toLowerCase();
  for (const banned of ["guarantee", "guaranteed revenue", "guaranteed leads", "10x your"]) {
    assert.ok(!body.includes(banned), `found banned claim: ${banned}`);
  }
});

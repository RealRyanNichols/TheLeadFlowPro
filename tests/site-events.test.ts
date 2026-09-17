import assert from "node:assert/strict";
import test from "node:test";
import {
  FEATURED_EVENT_SLUG,
  PAST_EVENT_COPY,
  SITE_EVENTS,
  eventEndsAt,
  eventWhen,
  eventsRedirectTarget,
  featuredEvent,
  featuredEventStartMs,
  resolveEventStatus,
  resolveFeaturedEvent,
  type SiteEvent,
} from "../lib/site/events.ts";
import { PRICES } from "../lib/site/prices.ts";

const EVENT = featuredEvent();

// Thursday, September 17, 2026, 6:30 PM CDT. The class runs 90 minutes and the
// optional clinic 30 more, so the room closes at 8:30 PM CDT (01:30Z Sep 18).
const BEFORE = new Date("2026-09-17T20:00:00Z"); // 3:00 PM CDT the same day
const DURING = new Date("2026-09-18T00:30:00Z"); // 7:30 PM CDT
const CLOSED = new Date("2026-09-18T01:30:00Z"); // 8:30 PM CDT, exact close
const NEXT_DAY = new Date("2026-09-18T15:00:00Z");

test("the featured event is the September 17 Longview workshop with the config price", () => {
  assert.equal(EVENT.slug, FEATURED_EVENT_SLUG);
  assert.equal(EVENT.priceUsd, PRICES.workshopSeat);
  assert.equal(EVENT.seats, 10);
  assert.equal(EVENT.timezone, "America/Chicago");
  assert.equal(eventEndsAt(EVENT).toISOString(), "2026-09-18T01:30:00.000Z");
});

test("status derives from the clock: upcoming before, still upcoming during, past once the room closes", () => {
  assert.equal(resolveEventStatus(EVENT, { now: BEFORE }), "upcoming");
  assert.equal(resolveEventStatus(EVENT, { now: DURING }), "upcoming");
  assert.equal(resolveEventStatus(EVENT, { now: CLOSED }), "past");
  assert.equal(resolveEventStatus(EVENT, { now: NEXT_DAY }), "past");
});

test("live seat facts turn upcoming into sold_out but never resurrect a past event", () => {
  assert.equal(resolveEventStatus(EVENT, { now: BEFORE, live: { soldOut: true } }), "sold_out");
  assert.equal(resolveEventStatus(EVENT, { now: BEFORE, live: { seatsRemaining: 0 } }), "sold_out");
  assert.equal(resolveEventStatus(EVENT, { now: BEFORE, live: { registrationClosed: true } }), "sold_out");
  assert.equal(resolveEventStatus(EVENT, { now: BEFORE, live: { seatsRemaining: 3 } }), "upcoming");
  assert.equal(resolveEventStatus(EVENT, { now: NEXT_DAY, live: { soldOut: false, seatsRemaining: 5 } }), "past");
});

test("the database date wins over the config date when it moves", () => {
  const moved = { startsAt: "2026-10-01T23:30:00Z", durationMinutes: 90 };
  assert.equal(resolveEventStatus(EVENT, { now: NEXT_DAY, live: moved }), "upcoming");
  const when = eventWhen(EVENT, moved);
  assert.equal(when.dateLabel, "Thursday, October 1, 2026");
  assert.equal(when.timeRange, "6:30–8:00 PM Central");
});

test("Ryan's one-value override forces the past state regardless of the clock", () => {
  const forced: SiteEvent = { ...EVENT, status: "past" };
  assert.equal(resolveEventStatus(forced, { now: BEFORE }), "past");
  const held: SiteEvent = { ...EVENT, status: "upcoming" };
  assert.equal(resolveEventStatus(held, { now: NEXT_DAY }), "upcoming");
});

test("the hero card reads the wall clock in America/Chicago", () => {
  const when = eventWhen(EVENT);
  assert.equal(when.monthUpper, "SEPTEMBER");
  assert.equal(when.day, "17");
  assert.equal(when.weekdayUpper, "THURSDAY");
  assert.equal(when.dateLabel, "Thursday, September 17, 2026");
  assert.equal(when.shortDate, "September 17");
  assert.equal(when.timeRange, "6:30–8:00 PM Central");
  assert.equal(when.isoStart, "2026-09-17T23:30:00.000Z");
  assert.equal(when.isoEnd, "2026-09-18T01:30:00.000Z");
});

test("resolveFeaturedEvent prefers live price and capacity and reports whether it had them", () => {
  const offline = resolveFeaturedEvent({ now: BEFORE });
  assert.equal(offline.live, false);
  assert.equal(offline.priceUsd, PRICES.workshopSeat);
  assert.equal(offline.seatsRemaining, null);
  assert.equal(offline.reserveHref, `/events/${FEATURED_EVENT_SLUG}`);
  assert.equal(offline.detailsHref, EVENT.externalSiteUrl);

  const online = resolveFeaturedEvent({
    now: BEFORE,
    live: { priceUsd: 97, capacity: 10, seatsRemaining: 4, soldOut: false },
  });
  assert.equal(online.live, true);
  assert.equal(online.seatsRemaining, 4);
  assert.equal(online.status, "upcoming");
});

test("/events forwards to the standalone funnel only while the event is on", () => {
  assert.equal(eventsRedirectTarget(BEFORE), EVENT.externalSiteUrl);
  assert.equal(eventsRedirectTarget(CLOSED), null);
});

test("the nurture cutoff is the class start, not a hand-typed date", () => {
  assert.equal(featuredEventStartMs(), Date.parse("2026-09-17T23:30:00Z"));
});

test("next_event_ref must point at a real configured event", () => {
  for (const event of SITE_EVENTS) {
    if (event.nextEventRef) {
      assert.ok(SITE_EVENTS.some((e) => e.slug === event.nextEventRef), event.slug);
    }
  }
});

test("the past-state copy claims nothing about attendance or outcomes", () => {
  const copy = JSON.stringify(PAST_EVENT_COPY).toLowerCase();
  for (const banned of ["sold out", "packed", "record", "%", "guarantee", "results", "testimonial"]) {
    assert.ok(!copy.includes(banned), `past-state copy must not say "${banned}"`);
  }
  assert.equal(PAST_EVENT_COPY.lessonPath, "/chatgpt/free");
});

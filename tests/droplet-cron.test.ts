import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cronMatches,
  loadJobs,
  parseSchedule,
  runMinute,
} from "../deploy/droplet/cron-runner.mjs";

// The droplet replaces Vercel Cron with deploy/droplet/cron-runner.mjs, which
// reads vercel.json. These tests pin that it fires every registered job on the
// same UTC minutes Vercel would, and never while the cutover flag is off.

const at = (iso: string) => new Date(iso);

function firesPerDay(schedule: string, dayIso: string) {
  const parsed = parseSchedule(schedule);
  const start = at(`${dayIso}T00:00:00Z`).getTime();
  let count = 0;
  for (let m = 0; m < 24 * 60; m++) {
    if (cronMatches(parsed, new Date(start + m * 60_000))) count++;
  }
  return count;
}

test("every job in vercel.json loads, so the droplet runs the same registry", () => {
  const registry = JSON.parse(readFileSync("vercel.json", "utf8")).crons as { path: string }[];
  const jobs = loadJobs("vercel.json");
  assert.equal(jobs.length, registry.length);
  assert.ok(jobs.length >= 12);
  assert.deepEqual(
    jobs.map((j: { path: string }) => j.path),
    registry.map((c) => c.path),
  );
});

test("the five-minute polls fire 288 times a day, on the fives", () => {
  assert.equal(firesPerDay("*/5 * * * *", "2026-09-24"), 288);
  const parsed = parseSchedule("*/5 * * * *");
  assert.ok(cronMatches(parsed, at("2026-09-24T04:05:00Z")));
  assert.ok(!cronMatches(parsed, at("2026-09-24T04:06:00Z")));
});

test("the hourly nurture fires at minute zero, 24 times a day", () => {
  assert.equal(firesPerDay("0 * * * *", "2026-09-24"), 24);
  assert.ok(cronMatches(parseSchedule("0 * * * *"), at("2026-09-24T04:00:00Z")));
});

test("schedules are UTC, like Vercel", () => {
  const followups = parseSchedule("0 15 * * *");
  assert.ok(cronMatches(followups, at("2026-09-24T15:00:00Z")));
  assert.ok(!cronMatches(followups, at("2026-09-24T15:00:00-05:00")));
});

test("the Monday digest fires only on Mondays at 13:00 UTC", () => {
  const digest = parseSchedule("0 13 * * 1");
  assert.ok(cronMatches(digest, at("2026-09-28T13:00:00Z"))); // Monday
  assert.ok(!cronMatches(digest, at("2026-09-29T13:00:00Z"))); // Tuesday
  assert.equal(firesPerDay("0 13 * * 1", "2026-09-27"), 0); // Sunday
});

test("day of month and day of week follow the standard either-one rule", () => {
  const both = parseSchedule("0 0 1 * 1");
  assert.ok(cronMatches(both, at("2026-10-01T00:00:00Z"))); // the 1st, a Thursday
  assert.ok(cronMatches(both, at("2026-10-05T00:00:00Z"))); // a Monday
  assert.ok(!cronMatches(both, at("2026-10-06T00:00:00Z")));
  assert.ok(cronMatches(parseSchedule("0 0 * * 7"), at("2026-09-27T00:00:00Z"))); // 7 is Sunday
});

test("lists, ranges and stepped ranges parse; nonsense throws", () => {
  const p = parseSchedule("0,30 9-17/4 * * 1-5");
  assert.deepEqual([...p.minute].sort((a, b) => a - b), [0, 30]);
  assert.deepEqual([...p.hour].sort((a, b) => a - b), [9, 13, 17]);
  assert.throws(() => parseSchedule("61 * * * *"));
  assert.throws(() => parseSchedule("* * * *"));
  assert.throws(() => parseSchedule("*/0 * * * *"));
  assert.throws(() => parseSchedule("@hourly"));
});

type Call = { url: string; auth: string | null };

function fakeFetch(calls: Call[], respond: () => Promise<Response> = async () => new Response("ok")) {
  return async (url: string, init: RequestInit) => {
    calls.push({ url, auth: new Headers(init.headers).get("authorization") });
    return respond();
  };
}

const jobsFor = (entries: [string, string][]) =>
  entries.map(([path, schedule]) => ({ path, schedule, parsed: parseSchedule(schedule) }));

test("nothing fires while the cutover flag is off", () => {
  const calls: Call[] = [];
  const started = runMinute({
    jobs: jobsFor([["/api/cron/nurture", "0 * * * *"]]),
    now: at("2026-09-24T04:00:00Z"),
    enabled: false,
    target: "http://web:3000",
    secret: "s3cret",
    inflight: new Set(),
    fetchImpl: fakeFetch(calls),
    timeoutMs: 1000,
  });
  assert.deepEqual(started, []);
  assert.equal(calls.length, 0);
});

test("a due job is called on the web container with the cron bearer", async () => {
  const calls: Call[] = [];
  const results: { path: string; status: unknown }[] = [];
  const started = runMinute({
    jobs: jobsFor([
      ["/api/cron/nurture", "0 * * * *"],
      ["/api/cron/digest", "0 13 * * 1"],
    ]),
    now: at("2026-09-24T04:00:00Z"),
    enabled: true,
    target: "http://web:3000",
    secret: "s3cret",
    inflight: new Set(),
    fetchImpl: fakeFetch(calls),
    onResult: (r: { path: string; status: unknown }) => results.push(r),
    timeoutMs: 1000,
  });
  assert.deepEqual(started, ["/api/cron/nurture"]);
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(calls, [{ url: "http://web:3000/api/cron/nurture", auth: "Bearer s3cret" }]);
  assert.equal(results[0].status, 200);
});

test("a slow job never overlaps itself; the next minute skips it", async () => {
  const calls: Call[] = [];
  const results: { path: string; status: unknown }[] = [];
  let release: () => void = () => {};
  const slow = () => new Promise<Response>((resolve) => (release = () => resolve(new Response("ok"))));
  const inflight = new Set<string>();
  const base = {
    jobs: jobsFor([["/api/meta-leads", "*/5 * * * *"]]),
    enabled: true,
    target: "http://web:3000",
    secret: "s3cret",
    inflight,
    fetchImpl: fakeFetch(calls, slow),
    onResult: (r: { path: string; status: unknown }) => results.push(r),
    timeoutMs: 1000,
  };
  runMinute({ ...base, now: at("2026-09-24T04:05:00Z") });
  await new Promise((r) => setTimeout(r, 5));
  const second = runMinute({ ...base, now: at("2026-09-24T04:10:00Z") });
  assert.deepEqual(second, []);
  assert.equal(results.at(-1)?.status, "skipped_overlap");
  release();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(inflight.size, 0);
  assert.equal(calls.length, 1);
});

test("a network error is reported, not thrown, and frees the job", async () => {
  const results: { path: string; status: unknown }[] = [];
  const inflight = new Set<string>();
  runMinute({
    jobs: jobsFor([["/api/cron/hq-pulse", "*/5 * * * *"]]),
    now: at("2026-09-24T04:05:00Z"),
    enabled: true,
    target: "http://web:3000",
    secret: "s3cret",
    inflight,
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
    onResult: (r: { path: string; status: unknown }) => results.push(r),
    timeoutMs: 1000,
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(results[0].status, "error");
  assert.equal(inflight.size, 0);
});

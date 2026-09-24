// Replaces Vercel Cron on the droplet.
//
// vercel.json "crons" stays the one registry of scheduled jobs: this runner
// re-reads it every minute and calls each due path on the web container the
// way Vercel does (GET, Authorization: Bearer $CRON_SECRET, UTC schedules).
// To stop Vercel's copy at cutover, turn cron jobs off in the Vercel project
// settings; do not delete them from vercel.json.
//
// It does nothing until the flag file exists (CRON_FLAG_FILE). That keeps the
// droplet and Vercel from both running the same job: deploy/droplet/cutover.sh
// creates the flag only after Ryan confirms Vercel's cron jobs are off.
//
// A job never overlaps itself, a missed minute is not replayed (Vercel does
// not replay either), and every run is written to CRON_STATUS_FILE for
// deploy/droplet/check.sh.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FIELD_RANGES = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week, 0 and 7 are Sunday
];

/** Expands one cron field ("*", "5", "1-5", "* /15", "0,30", "10-40/10") to a set. */
export function parseField(text, [min, max]) {
  const values = new Set();
  for (const part of String(text).split(",")) {
    const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part.trim());
    if (!match) throw new Error(`Unsupported cron field "${text}"`);
    const [, range, stepText] = match;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Bad step in "${text}"`);
    let lo = min;
    let hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number);
      lo = a;
      hi = b === undefined ? (stepText === undefined ? a : max) : b;
    }
    if (lo < min || hi > max || lo > hi) throw new Error(`Out of range cron field "${text}"`);
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return values;
}

/** Parses a five-field cron expression. Throws on anything it cannot read. */
export function parseSchedule(schedule) {
  const fields = String(schedule).trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`Cron schedule needs 5 fields: "${schedule}"`);
  const [minute, hour, dom, month, dow] = fields.map((f, i) => parseField(f, FIELD_RANGES[i]));
  if (dow.has(7)) dow.add(0);
  return {
    minute,
    hour,
    dom,
    month,
    dow,
    domRestricted: fields[2] !== "*",
    dowRestricted: fields[4] !== "*",
  };
}

/** True when the schedule fires in the UTC minute that contains `date`. */
export function cronMatches(parsed, date) {
  if (!parsed.minute.has(date.getUTCMinutes())) return false;
  if (!parsed.hour.has(date.getUTCHours())) return false;
  if (!parsed.month.has(date.getUTCMonth() + 1)) return false;
  const domOk = parsed.dom.has(date.getUTCDate());
  const dowOk = parsed.dow.has(date.getUTCDay());
  // Standard cron: when both day fields are restricted, either one may match.
  if (parsed.domRestricted && parsed.dowRestricted) return domOk || dowOk;
  return domOk && dowOk;
}

/** Reads vercel.json and returns [{ path, schedule, parsed }]. */
export function loadJobs(vercelJsonPath) {
  const config = JSON.parse(readFileSync(vercelJsonPath, "utf8"));
  const crons = Array.isArray(config.crons) ? config.crons : [];
  return crons.map((c) => {
    if (typeof c.path !== "string" || !c.path.startsWith("/")) {
      throw new Error(`Cron path must start with "/": ${JSON.stringify(c)}`);
    }
    return { path: c.path, schedule: c.schedule, parsed: parseSchedule(c.schedule) };
  });
}

/**
 * Fires every job due in `now`'s minute. Returns the list of paths started.
 * `inflight` is shared across minutes so a slow job never overlaps itself.
 *
 * @param {{
 *   jobs: { path: string, schedule: string, parsed: ReturnType<typeof parseSchedule> }[],
 *   now: Date, enabled: boolean, target: string, secret: string,
 *   inflight: Set<string>, fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
 *   onResult?: (result: Record<string, unknown> & { path: string, status: unknown }) => void,
 *   timeoutMs: number,
 * }} options
 * @returns {string[]}
 */
export function runMinute({ jobs, now, enabled, target, secret, inflight, fetchImpl, onResult, timeoutMs }) {
  if (!enabled) return [];
  const started = [];
  for (const job of jobs) {
    if (!cronMatches(job.parsed, now)) continue;
    if (inflight.has(job.path)) {
      onResult?.({ path: job.path, status: "skipped_overlap", at: now.toISOString() });
      continue;
    }
    inflight.add(job.path);
    started.push(job.path);
    const startedAt = Date.now();
    Promise.resolve()
      .then(() =>
        fetchImpl(`${target}${job.path}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${secret}`, "User-Agent": "vercel-cron/1.0 (droplet)" },
          signal: AbortSignal.timeout(timeoutMs),
        }),
      )
      .then(
        (res) => ({ path: job.path, status: res.status, ok: res.ok }),
        (error) => ({ path: job.path, status: "error", ok: false, error: String(error?.message || error) }),
      )
      .then((result) => {
        inflight.delete(job.path);
        onResult?.({ ...result, at: now.toISOString(), ms: Date.now() - startedAt });
      });
  }
  return started;
}

function writeStatus(file, status) {
  if (!file) return;
  try {
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(status, null, 2));
    renameSync(tmp, file);
  } catch (error) {
    log("warn", { event: "status.write_failed", error: String(error) });
  }
}

function log(level, fields) {
  console.log(JSON.stringify({ at: new Date().toISOString(), level, ...fields }));
}

async function main() {
  const target = (process.env.CRON_TARGET || "http://web:3000").replace(/\/$/, "");
  const secret = (process.env.CRON_SECRET || "").trim();
  const vercelJson = process.env.CRON_VERCEL_JSON || "/app/vercel.json";
  const flagFile = process.env.CRON_FLAG_FILE || "/config/cron-enabled";
  const statusFile = process.env.CRON_STATUS_FILE || "/state/cron-status.json";
  const timeoutMs = Number(process.env.CRON_TIMEOUT_MS || 15 * 60 * 1000);
  if (!secret) throw new Error("CRON_SECRET is required; the cron routes refuse to run without it.");

  const inflight = new Set();
  const status = { target, flagFile, enabled: false, updatedAt: null, jobs: {} };
  let lastEnabled = null;

  const tick = (fire) => {
    const now = new Date();
    now.setUTCSeconds(0, 0);
    const enabled = existsSync(flagFile);
    if (enabled !== lastEnabled) {
      log("info", { event: enabled ? "cron.enabled" : "cron.disabled", flagFile });
      lastEnabled = enabled;
    }
    let jobs = [];
    try {
      jobs = loadJobs(vercelJson);
    } catch (error) {
      log("error", { event: "jobs.load_failed", error: String(error) });
    }
    status.enabled = enabled;
    status.updatedAt = new Date().toISOString();
    status.jobCount = jobs.length;
    runMinute({
      jobs,
      now,
      enabled: fire && enabled,
      target,
      secret,
      inflight,
      timeoutMs,
      fetchImpl: fetch,
      onResult: (result) => {
        const entry = (status.jobs[result.path] ||= { runs: 0 });
        if (result.status !== "skipped_overlap") entry.runs += 1;
        entry.last = result;
        log(result.ok || result.status === "skipped_overlap" ? "info" : "error", { event: "cron.run", ...result });
        writeStatus(statusFile, status);
      },
    });
    writeStatus(statusFile, status);
  };

  const schedule = () => {
    const ms = 60_000 - (Date.now() % 60_000) + 250;
    setTimeout(() => {
      tick(true);
      schedule();
    }, ms);
  };

  log("info", { event: "cron.started", target, vercelJson, flagFile, jobs: loadJobs(vercelJson).length });
  // Status only: the minute it starts in may already have run in the container
  // this one replaced, so the first fire is the next whole minute.
  tick(false);
  schedule();
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    log("error", { event: "cron.fatal", error: String(error) });
    process.exit(1);
  });
}

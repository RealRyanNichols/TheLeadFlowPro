"""The archive's main loop: ``python -m longview_archive run``.

One process with one SQLite connection, owned by the loop's thread. Open-data
syncs, matching, publishing, the status page, and backups run there one after
another; only website visits run on worker threads, and those touch the
network only (their results come back to the loop thread to be written). Every
schedule is read from the database (``runs`` for the syncs, ``meta`` for the
rest), so a restart continues where the last process stopped instead of
repeating work or hammering an API.

A PAUSE file or low disk stops the network work while the status page keeps
updating. A stop (SIGTERM from systemd) or a pause also ends a website visit or
an API retry at its next wait: a polite visit spends minutes waiting between
requests, and systemd kills the service 60 seconds after asking it to stop.
An open-data request in flight is abandoned the same way (it runs on a helper
thread the loop can walk away from), and the PAUSE file is checked again
between every step, sync, and visit, not only when a loop pass starts.

A site is leased before its visit starts (``next_crawl_at`` moved one rung up
the backoff ladder), so a process killed in the middle of a visit does not
fetch the same site again on every restart; the real schedule replaces the
lease when the visit is written. Host state (backoff, challenges, robots.txt)
is saved after every visit, and the heartbeat and status page keep updating
while a slow visit runs.
"""

from __future__ import annotations

import logging
import shutil
import threading
import time
import traceback
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor
from concurrent.futures import wait as wait_futures
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Mapping, Optional

from . import backup, categories, db, github_pr, matching, publish, status, worker
from .fetcher import PoliteFetcher
from .sources import comptroller, npi, osm, tabc
from .sources import http as api_http

log = logging.getLogger(__name__)

SYNC_RETRY_S = 6 * 3600           # a failed sync is tried again after this, not after a week
DONE_STATUSES = ("ok", "partial", "skipped")
INTERRUPTED = "interrupted: the service stopped"
WAIT_STEP_S = 0.25                # how often a wait checks for a stop or a pause
ERROR_PAUSE_S = 30.0              # after an unexpected loop error, before trying again
HOLD_AFTER_FAILURE_S = 15 * 60    # matching or site selection failed: not retried every loop
KEEPALIVE_S = 60.0                # while visits run, heartbeat and status are refreshed this often
STATES = status.STATES


class Interrupted(BaseException):
    """Ends a visit or an API retry at its next wait when the service stops or pauses.

    A BaseException so the source modules' and the worker's ``except
    Exception`` handlers do not record it as a failure of the site or source.
    """


# ---------------------------------------------------------------- open data syncs

@dataclass(frozen=True)
class SyncJob:
    name: str             # the CLI name
    kind: str             # runs.kind written by the source module
    module: Any
    function: str         # looked up at call time so tests can swap it
    period_setting: str   # Settings attribute with the period in days
    transport: str        # key in the service's transports mapping

    def period(self, settings) -> timedelta:
        return timedelta(days=float(getattr(settings, self.period_setting)))


SYNC_JOBS = (
    SyncJob("sales-tax", comptroller.RUN_KIND, comptroller, "sync_sales_tax", "open_data_sync_days", "socrata"),
    SyncJob("tabc", tabc.RUN_KIND, tabc, "sync_tabc", "open_data_sync_days", "socrata"),
    SyncJob("npi", npi.RUN_KIND, npi, "sync_npi", "npi_sync_days", "npi"),
    SyncJob("osm", osm.RUN_KIND, osm, "sync_osm", "osm_sync_days", "overpass"),
)
SYNC_BY_NAME = {job.name: job for job in SYNC_JOBS}


@dataclass
class SyncOutcome:
    job: SyncJob
    status: str                      # ok | partial | skipped | error
    counts: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None      # safe text: an API host and status, or an exception class
    error_class: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.status in ("ok", "partial")


def run_sync(conn, settings, job: SyncJob, now: Any = None, transport=None) -> SyncOutcome:
    """Run one sync. The source module records any failure; it is returned, never raised."""
    func = getattr(job.module, job.function)
    try:
        counts = func(conn, settings, now=now, transport=transport)
    except Exception as exc:  # noqa: BLE001 - one source failing never stops the others
        return SyncOutcome(job, "error", {}, api_http.error_text(exc), type(exc).__name__)
    counts = counts if isinstance(counts, dict) else {}
    state = str(counts.get("status") or "ok")
    error = None
    if state == "error":
        error = str(counts.get("error") or "error")
    elif state == "skipped":
        error = str(counts.get("skipped_reason") or "skipped")
    return SyncOutcome(job, state, counts, error)


def sync_due_at(conn, settings, job: SyncJob) -> Optional[datetime]:
    """When ``job`` is next due (None: now).

    A finished run (ok, partial, skipped) sets the next run one period later. A
    later attempt that failed, or that never finished because the process
    died, holds the retry off for six hours so a broken API or a crash loop is
    not hit again at once. A run the service interrupted on purpose does not.
    """
    last_done = conn.execute(
        f"SELECT MAX(started_at) FROM runs WHERE kind=? AND status IN ({','.join('?' * len(DONE_STATUSES))})",
        (job.kind, *DONE_STATUSES),
    ).fetchone()[0]
    last_try = conn.execute(
        "SELECT MAX(started_at) FROM runs WHERE kind=? AND NOT (status='error' AND IFNULL(error,'')=?)",
        (job.kind, INTERRUPTED),
    ).fetchone()[0]
    done_at = publish.as_datetime(last_done)
    due = done_at + job.period(settings) if done_at else None
    tried_at = publish.as_datetime(last_try)
    if tried_at is not None and (done_at is None or tried_at > done_at):
        retry = tried_at + timedelta(seconds=SYNC_RETRY_S)
        due = retry if due is None else max(due, retry)
    return due


# ---------------------------------------------------------------- shared helpers

def bootstrap(settings):
    """Data folders, the database connection, schema, and category tables."""
    settings.ensure_dirs()
    conn = db.connect(settings.db_path)
    db.migrate(conn)
    with db.transaction(conn):
        categories.seed(conn)
    return conn


def local_day(now: Any) -> str:
    return publish.local_date(now) or ""


def take_backup(conn, settings, now: Any) -> Optional[Path]:
    """Today's (America/Chicago) backup, recorded as a ``backup`` run for the status page."""
    now_dt = publish.resolve_now(now)
    stamp = db.now_iso(now_dt)
    run_id = db.start_run(conn, "backup", stamp)
    try:
        path = backup.nightly_backup(conn, settings, local_day(now_dt))
    except Exception as exc:
        db.finish_run(conn, run_id, "error", error=type(exc).__name__, now=stamp)
        raise
    if path is None:
        db.finish_run(conn, run_id, "skipped", {"reason": "exists"}, now=stamp)
    else:
        db.finish_run(conn, run_id, "ok", {"bytes": path.stat().st_size}, now=stamp)
    return path


def where(exc: BaseException) -> str:
    """file:line of the innermost frame: enough to find a bug, no message text."""
    frames = traceback.extract_tb(exc.__traceback__)
    if not frames:
        return "?"
    return f"{Path(frames[-1].filename).name}:{frames[-1].lineno}"


def _due(last: Optional[datetime], now: datetime, every_s: float) -> bool:
    if last is None:
        return True
    elapsed = (now - last).total_seconds()
    return elapsed >= every_s or elapsed < -60  # a clock that jumped back must not stall the job


def _hhmm(text: str) -> tuple:
    hours, _, minutes = str(text or "03:30").partition(":")
    return int(hours), int(minutes or 0)


# ---------------------------------------------------------------- the service

class ArchiveService:
    """The loop. ``run_once`` is one iteration; ``run_forever`` repeats it until stopped."""

    keepalive_s = KEEPALIVE_S

    def __init__(self, settings, transports: Optional[Mapping[str, Any]] = None, fetcher=None,
                 clock: Optional[Callable[[], Any]] = None, sleep: Optional[Callable[[float], None]] = None,
                 disk_usage: Optional[Callable[[Any], Any]] = None):
        self.settings = settings
        self.transports = dict(transports or {})
        self.fetcher = fetcher
        self._clock = clock
        self._sleep = sleep or self._idle
        self._disk_usage = disk_usage or shutil.disk_usage
        self.conn = None
        self._stop = False
        self._started = False
        self._state: Optional[str] = None          # last state written to meta
        self._status_state: Optional[str] = None   # state shown on the last status page written
        self._host_state_loaded = False
        self._holds: Dict[str, float] = {}         # job -> monotonic time before which it is not retried
        self._local = threading.local()

    # ------------------------------------------------------------ time and waits
    def now(self) -> datetime:
        value = self._clock() if self._clock is not None else None
        if value is None:
            return datetime.now(timezone.utc)
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        return publish.resolve_now(value)

    def _wall_clock(self) -> float:
        return self.now().timestamp()

    def request_stop(self) -> None:
        """Ask the loop to stop. Safe from a signal handler: it only sets a flag."""
        self._stop = True

    @property
    def stopping(self) -> bool:
        return self._stop

    def _idle(self, seconds: float) -> None:
        """The default loop sleep: returns early when a stop is requested."""
        deadline = time.monotonic() + max(0.0, float(seconds))
        while not self._stop:
            left = deadline - time.monotonic()
            if left <= 0:
                return
            time.sleep(min(left, WAIT_STEP_S))

    def _wait_or_raise(self, seconds: float, should_end: Callable[[], bool]) -> None:
        deadline = time.monotonic() + max(0.0, float(seconds))
        while True:
            if should_end():
                self._local.interrupted = True
                raise Interrupted()
            left = deadline - time.monotonic()
            if left <= 0:
                return
            time.sleep(min(left, WAIT_STEP_S))

    def _halted(self) -> bool:
        """A stop was requested or the PAUSE file is present: start no new network work."""
        if self._stop:
            return True
        try:
            return self.settings.pause_file.exists()
        except OSError:
            return False

    def _visit_wait(self, seconds: float) -> None:
        """The fetcher's sleep: a visit ends at its next wait on a stop or a pause."""
        self._wait_or_raise(seconds, self._halted)

    def _api_wait(self, seconds: float) -> None:
        """The open-data client's sleep while the loop runs: a retry wait ends on a stop or a pause."""
        self._wait_or_raise(seconds, self._halted)

    def _abandonable(self, send=None):
        """Wrap an open-data transport so a stop or a pause abandons a request in flight.

        The request runs on a daemon helper thread (network only, no database)
        and the loop thread checks for a stop or the PAUSE file every
        WAIT_STEP_S, so a 200-second Overpass read cannot outlast systemd's
        60-second stop timeout. A request that runs far past its own timeout
        (a server dripping bytes) is given up as a network error.
        """
        send = send or api_http.default_transport

        def call(method, url, headers, body, timeout):
            box: Dict[str, Any] = {}
            done = threading.Event()

            def target():
                try:
                    box["value"] = send(method, url, headers, body, timeout)
                except BaseException as exc:  # noqa: BLE001 - handed back to the loop thread
                    box["error"] = exc
                finally:
                    done.set()

            threading.Thread(target=target, name="api-request", daemon=True).start()
            limit = time.monotonic() + float(timeout) * 2 + 30
            while not done.wait(WAIT_STEP_S):
                if self._halted():
                    self._local.interrupted = True
                    raise Interrupted()
                if time.monotonic() > limit:
                    raise TimeoutError("api request deadline")
            if "error" in box:
                raise box["error"]
            return box["value"]

        return call

    # ------------------------------------------------------------ open and close
    def open(self):
        """Open the database (on the calling thread) and the shared fetcher."""
        if self.conn is None:
            self.conn = bootstrap(self.settings)
            self._host_state_loaded = False
        if self.fetcher is None:
            self.fetcher = PoliteFetcher(self.settings, transport=self.transports.get("web"),
                                         wall_clock=self._wall_clock, sleep=self._visit_wait)
        if not self._host_state_loaded:
            self._host_state_loaded = True
            try:
                worker.load_host_state(self.conn, self.fetcher)
            except Exception as exc:  # noqa: BLE001 - start without the cache rather than not at all
                log.warning("host state not loaded: %s at %s", type(exc).__name__, where(exc))
        return self.conn

    def _persist_host_state(self) -> None:
        if self.conn is None or self.fetcher is None or not self._host_state_loaded:
            return
        try:
            worker.persist_host_state(self.conn, self.fetcher)
        except Exception as exc:  # noqa: BLE001
            log.warning("host state not saved: %s at %s", type(exc).__name__, where(exc))

    def close(self) -> None:
        """Save host state and close the database. No state change (see ``shutdown``)."""
        if self.conn is None:
            return
        self._persist_host_state()
        try:
            self.conn.close()
        finally:
            self.conn = None
            self._host_state_loaded = False

    def shutdown(self) -> None:
        """The end of ``run``: state ``stopping``, a last status page, then close."""
        if self.conn is None:
            return
        try:
            now = self.now()
            self._set_state("stopping")
            db.set_meta(self.conn, "heartbeat_at", db.now_iso(now))
            self._persist_host_state()
            self._write_status(now)
        except Exception as exc:  # noqa: BLE001 - closing matters more than the last page
            log.warning("shutdown step failed: %s at %s", type(exc).__name__, where(exc))
        finally:
            self.close()

    # ------------------------------------------------------------ state and status
    def _set_state(self, state: str) -> None:
        previous = self._state
        db.set_meta(self.conn, "state", state)
        self._state = state
        if state == previous:
            return
        if state == "paused":
            log.info("paused: the PAUSE file is present; no sync, crawl, or publish")
        elif state == "disk_guard":
            free = db.get_meta(self.conn, "disk_free_bytes")
            log.warning("disk guard on: %s bytes free, under the %d byte guard; no sync or crawl",
                        free, self.settings.disk_guard_bytes)
        elif state == "running" and previous in ("paused", "disk_guard"):
            log.info("resumed from %s", previous)

    def _write_status(self, now: datetime) -> bool:
        try:
            status.write_status(self.settings, status.collect(self.conn, self.settings, now))
            ok = True
        except Exception as exc:  # noqa: BLE001 - the page is informational; the loop goes on
            log.warning("status page not written: %s at %s", type(exc).__name__, where(exc))
            ok = False
        # Recorded either way, so a broken page is retried on schedule, not every loop.
        db.set_meta(self.conn, "last_status_at", db.now_iso(now))
        self._status_state = self._state
        return ok

    def _status_due(self, now: datetime) -> bool:
        if self._status_state != self._state:
            return True
        last = publish.as_datetime(db.get_meta(self.conn, "last_status_at"))
        return _due(last, now, self.settings.status_every_s)

    def _disk_free(self) -> Optional[int]:
        try:
            free = int(self._disk_usage(self.settings.data_dir).free)
        except (OSError, AttributeError, TypeError, ValueError) as exc:
            log.warning("disk usage unreadable: %s", type(exc).__name__)
            return None
        db.set_meta(self.conn, "disk_free_bytes", str(free))
        return free

    # ------------------------------------------------------------ one iteration
    def run_once(self, now: Any = None) -> Dict[str, Any]:
        """One loop iteration; returns a short summary of what happened."""
        self.open()
        fixed = publish.resolve_now(now) if now is not None else None
        clock = (lambda: fixed) if fixed is not None else self.now
        start = clock()
        report: Dict[str, Any] = {
            "state": None, "synced": [], "synced_ok": [], "sync_failed": [], "matched": None, "visits": 0,
            "applied": {}, "interrupted": 0, "visit_errors": 0, "published": None,
            "status_written": False, "backup": None, "publish_pr": None,
        }
        db.set_meta(self.conn, "heartbeat_at", db.now_iso(start))
        free = self._disk_free()
        if not self._started:
            self._started = True
            self._set_state("starting")
            report["status_written"] = self._write_status(start)

        if self.settings.pause_file.exists():
            self._set_state("paused")
            report["state"] = "paused"
            if self._status_due(start):
                report["status_written"] = self._write_status(start)
            return report

        guard = free is not None and free < self.settings.disk_guard_bytes
        state = "disk_guard" if guard else "running"
        self._set_state(state)
        report["state"] = state

        # PAUSE is checked again before every step, so a pause during a long sync
        # also skips the crawl, the export, and the backup that would follow it.
        if not guard and not self._halted():
            self._sync_step(clock, report)
            if not self._halted():
                self._match_step(clock, report)
            if not self._halted():
                self.crawl(fixed, report=report)
        if not self._halted():
            self._publish_step(clock(), report)
        if not guard and not self._halted():
            self._publish_pr_step(clock(), report)
        if not guard and not self._halted():
            self._backup_step(clock(), report)

        end = clock()
        if report["synced"] or report["published"] is not None or self._status_due(end):
            report["status_written"] = self._write_status(end) or report["status_written"]
        self._log_iteration(report)
        return report

    def _sync_step(self, clock, report) -> None:
        for job in SYNC_JOBS:
            if self._halted():
                return
            step = clock()
            due = sync_due_at(self.conn, self.settings, job)
            if due is not None and step < due:
                continue
            stamp = db.now_iso(step)
            report["synced"].append(job.kind)
            try:
                outcome = run_sync(self.conn, self.settings, job, stamp,
                                   self._abandonable(self.transports.get(job.transport)))
            except Interrupted:
                self.conn.execute(
                    "UPDATE runs SET status='error', finished_at=?, error=? WHERE kind=? AND status='running'"
                    " AND started_at=?",
                    (db.now_iso(clock()), INTERRUPTED, job.kind, stamp),
                )
                report["sync_failed"].append(job.kind)
                log.info("%s interrupted by a stop or pause", job.kind)
                return
            if not outcome.ok and outcome.status != "skipped":
                report["sync_failed"].append(job.kind)
                log.warning("%s failed (%s); next try in %d hours", job.kind,
                            outcome.error_class or outcome.status, SYNC_RETRY_S // 3600)
            elif outcome.ok:
                report["synced_ok"].append(job.kind)

    def _held(self, job: str) -> bool:
        until = self._holds.get(job)
        return until is not None and time.monotonic() < until

    def _hold(self, job: str) -> None:
        """After an unexpected failure, wait before trying again instead of failing every loop."""
        self._holds[job] = time.monotonic() + HOLD_AFTER_FAILURE_S

    def _match_step(self, clock, report) -> None:
        """Match after a sync, and pick up records left new (a crash between sync and match, a review)."""
        pending = self.conn.execute(
            "SELECT 1 FROM source_records WHERE match_state='new' AND active=1 LIMIT 1"
        ).fetchone()
        if not report["synced_ok"] and (pending is None or self._held("match")):
            return
        try:
            report["matched"] = matching.match_pending(self.conn, clock())
        except Exception as exc:  # noqa: BLE001
            self._hold("match")
            log.warning("matching failed: %s at %s", type(exc).__name__, where(exc))

    def _publish_step(self, now: datetime, report) -> None:
        last = publish.as_datetime(db.get_meta(self.conn, "last_publish_at"))
        if not _due(last, now, self.settings.publish_every_s):
            return
        try:
            counts = publish.run_publish(self.conn, self.settings, now)
            report["published"] = {k: counts.get(k, 0) for k in ("published", "added", "removed", "updated")}
        except Exception as exc:  # noqa: BLE001 - recorded as a failed publish run
            report["published"] = {"error": type(exc).__name__}
            log.warning("publish failed: %s at %s", type(exc).__name__, where(exc))
        # Recorded either way: a failing export is retried on schedule, not every loop.
        db.set_meta(self.conn, "last_publish_at", db.now_iso(now))

    def _publish_pr_step(self, now: datetime, report) -> None:
        """Right after a fresh export: open or update the batch pull request when it is on and due.

        Off unless the GitHub token file exists; github_pr decides the rest
        (24-hour limit, skips, the large-removal hold). The GitHub calls run
        through the abandonable wrapper, so a stop or a pause ends them.
        """
        published = report.get("published")
        if not published or "error" in published:
            return
        try:
            send = self._abandonable(self.transports.get("github") or github_pr.default_transport)
            result = github_pr.run_publish_pr(self.conn, self.settings, now, transport=send)
            report["publish_pr"] = result.get("status")
        except Interrupted:
            report["publish_pr"] = "interrupted"
            log.info("publish_pr interrupted by a stop or pause")
        except Exception as exc:  # noqa: BLE001 - recorded as a failed publish_pr run
            report["publish_pr"] = "error"
            log.warning("publish_pr failed: %s at %s", type(exc).__name__, where(exc))

    def _backup_step(self, now: datetime, report) -> None:
        local = publish.to_local(now)
        if local is None or (local.hour, local.minute) < _hhmm(self.settings.backup_local_time):
            return
        day = local.strftime("%Y-%m-%d")
        if db.get_meta(self.conn, "last_backup_date") == day:
            return
        try:
            path = take_backup(self.conn, self.settings, now)
            report["backup"] = str(path) if path else "exists"
        except Exception as exc:  # noqa: BLE001 - recorded as a failed backup run; tried again tomorrow
            report["backup"] = "error"
            log.warning("backup failed: %s at %s", type(exc).__name__, where(exc))
        db.set_meta(self.conn, "last_backup_date", day)

    def _log_iteration(self, report) -> None:
        parts = []
        if report["synced"]:
            parts.append(f"synced {len(report['synced'])} ({len(report['sync_failed'])} failed)")
        if report["matched"]:
            parts.append("matching " + ", ".join(f"{k} {v}" for k, v in sorted(report["matched"].items())))
        if report["visits"]:
            outcomes = ", ".join(f"{k} {v}" for k, v in sorted(report["applied"].items())) or "none applied"
            parts.append(f"visited {report['visits']} ({outcomes}; interrupted {report['interrupted']},"
                         f" errors {report['visit_errors']})")
        if report["published"] is not None:
            parts.append("export " + ", ".join(f"{k} {v}" for k, v in report["published"].items()))
        if report.get("publish_pr") not in (None, "off", "not_due"):
            parts.append(f"batch pull request {report['publish_pr']}")
        if report["backup"]:
            parts.append("backup " + (report["backup"] if report["backup"] in ("exists", "error") else "written"))
        if parts:
            log.info("loop: %s", "; ".join(parts))

    # ------------------------------------------------------------ the crawl
    def _visit(self, snapshot):
        """Runs on a worker thread: network only. Returns (result, interrupted)."""
        self._local.interrupted = False
        try:
            result = worker.visit(snapshot, self.fetcher, self.settings)
        except Interrupted:
            return None, True
        return result, bool(getattr(self._local, "interrupted", False))

    def crawl(self, now: Any = None, limit: Optional[int] = None, report: Optional[dict] = None) -> Dict[str, Any]:
        """Visit due websites once, never more than ``max_sites_concurrent`` at a time.

        Visits run on a thread pool sharing one fetcher (which spaces requests
        per site); each result is written here, on the calling thread, as soon
        as it arrives, and host state is saved right after it. Each site is
        leased before its visit starts, so a crash mid-visit does not bring it
        straight back after a restart. A visit cut short by a stop or a pause
        is not written and its lease is handed back, so the site stays due.
        While visits run, the heartbeat and status page keep being refreshed.
        """
        self.open()
        report = report if report is not None else {"visits": 0, "applied": {}, "interrupted": 0, "visit_errors": 0}
        workers = max(1, int(self.settings.max_sites_concurrent))
        limit = workers if limit is None else max(0, int(limit))
        if self._halted() or limit == 0:
            return report
        when = publish.resolve_now(now) if now is not None else self.now()
        if self._held("crawl"):
            return report
        try:
            snapshots = list(worker.due_businesses(self.conn, self.settings, when, limit=limit))[:limit]
        except Exception as exc:  # noqa: BLE001
            self._hold("crawl")
            log.warning("choosing websites failed: %s at %s", type(exc).__name__, where(exc))
            return report
        if not snapshots:
            return report
        leases = self._lease(snapshots, when)
        with ThreadPoolExecutor(max_workers=min(workers, len(snapshots)), thread_name_prefix="visit") as pool:
            futures = {}
            for snap in snapshots:
                if self._halted():
                    self._release(snap, leases)  # never started: due again after the stop or pause
                    continue
                futures[pool.submit(self._visit, snap)] = snap
            pending = set(futures)
            while pending:
                done, pending = wait_futures(pending, timeout=self.keepalive_s, return_when=FIRST_COMPLETED)
                if not done:
                    self._keepalive()
                    continue
                for future in done:
                    self._handle_visit(future, futures[future], now, when, leases, report)
        self._persist_host_state()
        return report

    def _handle_visit(self, future, snap, now, when: datetime, leases, report) -> None:
        """Write one finished visit (loop thread), then save host state at once."""
        report["visits"] += 1
        ref = getattr(snap, "public_id", "?")
        try:
            try:
                result, interrupted = future.result()
            except Exception as exc:  # noqa: BLE001 - one site's bug must not stop the crawl
                report["visit_errors"] += 1
                log.warning("visit %s failed: %s at %s", ref, type(exc).__name__, where(exc))
                self._defer(snap, when)
                return
            if interrupted:
                report["interrupted"] += 1
                self._release(snap, leases)
                return
            try:
                outcome = worker.apply_visit(self.conn, snap, result, self.settings,
                                             now if now is not None else self.now())
            except Exception as exc:  # noqa: BLE001
                report["visit_errors"] += 1
                log.warning("apply %s failed: %s at %s", ref, type(exc).__name__, where(exc))
                self._defer(snap, when)
                return
            report["applied"][outcome] = report["applied"].get(outcome, 0) + 1
        finally:
            # A fresh 429/503 backoff or challenge must survive an abrupt kill right after.
            self._persist_host_state()

    def _keepalive(self) -> None:
        """Visits still running: keep the heartbeat and the status page current."""
        try:
            tick = self.now()
            db.set_meta(self.conn, "heartbeat_at", db.now_iso(tick))
            if self._status_due(tick):
                self._write_status(tick)
        except Exception as exc:  # noqa: BLE001 - informational only
            log.warning("keepalive failed: %s at %s", type(exc).__name__, where(exc))

    def _lease(self, snapshots, when: datetime) -> Dict[int, Optional[str]]:
        """Move each chosen site's ``next_crawl_at`` one rung up the ladder before visiting it.

        Returns the previous values so an interrupted visit can hand its lease
        back. apply_visit (or _defer) replaces the lease with the real schedule.
        """
        saved: Dict[int, Optional[str]] = {}
        ladder = tuple(self.settings.backoff_days) or (1,)
        try:
            with db.transaction(self.conn):
                for snap in snapshots:
                    business_id = getattr(snap, "id", None)
                    if business_id is None:
                        continue
                    row = self.conn.execute(
                        "SELECT next_crawl_at, crawl_failures FROM businesses WHERE id=?", (business_id,)
                    ).fetchone()
                    if row is None:
                        continue
                    saved[business_id] = row["next_crawl_at"]
                    days = ladder[min(int(row["crawl_failures"] or 0), len(ladder) - 1)]
                    self.conn.execute("UPDATE businesses SET next_crawl_at=? WHERE id=?",
                                      (db.now_iso(when + timedelta(days=days)), business_id))
        except Exception as exc:  # noqa: BLE001 - visiting without a lease beats not visiting
            log.warning("could not lease sites: %s at %s", type(exc).__name__, where(exc))
            return {}
        return saved

    def _release(self, snap, leases: Dict[int, Optional[str]]) -> None:
        business_id = getattr(snap, "id", None)
        if business_id not in leases:
            return
        try:
            self.conn.execute("UPDATE businesses SET next_crawl_at=? WHERE id=?", (leases[business_id], business_id))
        except Exception as exc:  # noqa: BLE001
            log.warning("could not release %s: %s", getattr(snap, "public_id", "?"), type(exc).__name__)

    def _defer(self, snap, when: datetime) -> None:
        """A site whose visit crashed waits a day instead of being retried every loop."""
        business_id = getattr(snap, "id", None)
        if business_id is None:
            return
        days = (tuple(self.settings.backoff_days) or (1,))[0]
        try:
            self.conn.execute("UPDATE businesses SET next_crawl_at=? WHERE id=?",
                              (db.now_iso(when + timedelta(days=days)), business_id))
        except Exception as exc:  # noqa: BLE001
            log.warning("could not defer %s: %s", getattr(snap, "public_id", "?"), type(exc).__name__)

    # ------------------------------------------------------------ forever
    def run_forever(self) -> None:
        """Loop until ``request_stop``; then state ``stopping``, a last status page, close."""
        previous_api_sleep = api_http.sleep
        api_http.sleep = self._api_wait
        try:
            self.open()
            while not self._stop:
                try:
                    report = self.run_once()
                except Exception as exc:  # noqa: BLE001 - log, wait, and try again
                    log.error("loop iteration failed: %s at %s", type(exc).__name__, where(exc))
                    self._sleep(max(self.settings.loop_idle_s, ERROR_PAUSE_S))
                    continue
                if self._stop:
                    break
                paused = report.get("state") == "paused"
                self._sleep(self.settings.pause_poll_s if paused else self.settings.loop_idle_s)
        finally:
            api_http.sleep = previous_api_sleep
            self.shutdown()

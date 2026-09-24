"""The service loop: pause, disk guard, isolation, schedules, restarts, concurrency, backups, stop.

The open-data syncs and the website worker are replaced with fakes that
behave like the real modules at their boundary (a sync records its own run
row; a visit is network only), so these tests exercise the loop itself.
Nothing here touches the network; all hosts are ``.example``.
"""

import dataclasses
import json
import sqlite3
import stat
import tempfile
import threading
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from longview_archive import backup, config, db, matching, service, worker
from longview_archive.fetcher import Headers, RawResponse
from longview_archive.sources import http as api_http
from tests.fixtures import builders as b

START = datetime(2026, 9, 24, 7, 0, 0, tzinfo=timezone.utc)  # 02:00 in Chicago: before the backup time
GIB = config.GIB
SALES, TABC, NPI, OSM = (job.kind for job in service.SYNC_JOBS)
ALL_SYNCS = [SALES, TABC, NPI, OSM]


class FakeClock:
    def __init__(self, start=START):
        self.t = start

    def __call__(self):
        return self.t

    def advance(self, **kw):
        self.t += timedelta(**kw)
        return self.t


class FakeDisk:
    def __init__(self, free=50 * GIB):
        self.free = free

    def __call__(self, path):
        return SimpleNamespace(total=100 * GIB, used=100 * GIB - self.free, free=self.free)


class FakeSyncs:
    """Stand-ins for the four sync functions that record runs the way the real ones do."""

    def __init__(self):
        self.calls = []
        self.fail = set()

    def make(self, job):
        def fake(conn, settings, now=None, transport=None):
            self.calls.append(job.kind)
            run_id = db.start_run(conn, job.kind, now)
            if job.kind in self.fail:
                db.finish_run(conn, run_id, "error", {}, "api.example 503: http_503", now)
                if job.kind == TABC:  # TABC records and returns instead of raising
                    return {"status": "error", "error": "api.example 503: http_503"}
                raise api_http.ApiError(503, "http_503", "api.example")
            db.finish_run(conn, run_id, "ok", {"fetched": 0}, now=now)
            return {"status": "ok", "fetched": 0}
        return fake

    def patchers(self):
        return {job.kind: mock.patch.object(job.module, job.function, self.make(job)) for job in service.SYNC_JOBS}


def snap(n):
    return SimpleNamespace(id=n, public_id=f"lv-test{n:05d}", host=f"site{n}.example",
                           website=f"https://site{n}.example/")


class FakeWorker:
    def __init__(self):
        self.batches = []        # each due_businesses call pops one list
        self.due_limits = []
        self.visited = []
        self.applied = []
        self.apply_threads = []
        self.loaded = 0
        self.persisted = 0

    def due_businesses(self, conn, settings, now, limit):
        self.due_limits.append(limit)
        return list(self.batches.pop(0)) if self.batches else []

    def visit(self, snapshot, fetcher, settings):
        self.visited.append(snapshot.id)
        return {"id": snapshot.id}

    def apply_visit(self, conn, snapshot, result, settings, now):
        self.applied.append(snapshot.id)
        self.apply_threads.append(threading.current_thread())
        return "ok"

    def load_host_state(self, conn, fetcher):
        self.loaded += 1
        return 0

    def persist_host_state(self, conn, fetcher):
        self.persisted += 1
        return 0

    def patcher(self):
        return mock.patch.multiple(
            worker, due_businesses=self.due_businesses, visit=self.visit, apply_visit=self.apply_visit,
            load_host_state=self.load_host_state, persist_host_state=self.persist_host_state,
        )


class ServiceTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(
            data_dir=Path(self.tmp.name) / "data", allow_private_hosts=True, loop_idle_s=0.01, pause_poll_s=0.01,
            socrata_base="https://data.texas.example", overpass_url="https://overpass.example/api/interpreter",
            npi_url="https://npi.example/api/",
        )
        self.clock = FakeClock()
        self.disk = FakeDisk()
        self.syncs = FakeSyncs()
        self.work = FakeWorker()
        self.sync_patchers = self.syncs.patchers()
        for patcher in list(self.sync_patchers.values()) + [self.work.patcher()]:
            patcher.start()
            self.addCleanup(patcher.stop)  # stopping twice is harmless
        self.match_calls = []
        real_match = matching.match_pending

        def counting_match(conn, now=None):
            self.match_calls.append(now)
            return real_match(conn, now)

        patcher = mock.patch.object(matching, "match_pending", counting_match)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.services = []
        self.addCleanup(self._close_services)

    def _close_services(self):
        for svc in self.services:
            svc.close()

    def make(self, settings=None, **kw):
        kw.setdefault("clock", self.clock)
        kw.setdefault("disk_usage", self.disk)
        kw.setdefault("fetcher", object())
        svc = service.ArchiveService(settings or self.settings, **kw)
        self.services.append(svc)
        return svc

    def status_json(self):
        return json.loads((self.settings.www_dir / "status.json").read_text(encoding="utf-8"))

    def meta(self, key):
        conn = db.connect(self.settings.db_path)
        try:
            return db.get_meta(conn, key)
        finally:
            conn.close()


class FirstIteration(ServiceTestBase):
    def test_first_iteration_runs_everything_due(self):
        self.work.batches = [[snap(1)]]
        svc = self.make()
        report = svc.run_once()
        self.assertEqual(report["state"], "running")
        self.assertEqual(self.syncs.calls, ALL_SYNCS)
        self.assertEqual(report["sync_failed"], [])
        self.assertEqual(len(self.match_calls), 1)
        self.assertEqual(self.work.due_limits, [self.settings.max_sites_concurrent])
        self.assertEqual(self.work.applied, [1])
        self.assertEqual(self.work.loaded, 1)
        self.assertGreaterEqual(self.work.persisted, 1)
        self.assertIsNotNone(report["published"])
        self.assertTrue(self.settings.publish_export_path.exists())
        self.assertEqual(json.loads(self.settings.publish_export_path.read_text())["schemaVersion"], 1)
        self.assertTrue(report["status_written"])
        self.assertEqual(self.status_json()["state"], "running")
        self.assertEqual(db.get_meta(svc.conn, "heartbeat_at"), "2026-09-24T07:00:00Z")
        self.assertEqual(db.get_meta(svc.conn, "disk_free_bytes"), str(50 * GIB))
        self.assertIsNone(report["backup"])  # 02:00 in Chicago


class Pause(ServiceTestBase):
    def test_pause_idles_but_keeps_the_status_page(self):
        self.settings.pause_file.parent.mkdir(parents=True, exist_ok=True)
        self.settings.pause_file.touch()
        svc = self.make()
        report = svc.run_once()
        self.assertEqual(report["state"], "paused")
        self.assertEqual(self.syncs.calls, [])
        self.assertEqual(self.work.due_limits, [])
        self.assertIsNone(report["published"])
        self.assertFalse(self.settings.publish_export_path.exists())
        self.assertTrue(report["status_written"])
        self.assertEqual(self.status_json()["state"], "paused")
        self.assertEqual(db.get_meta(svc.conn, "state"), "paused")

        self.clock.advance(minutes=1)
        self.assertFalse(svc.run_once()["status_written"])  # throttled to status_every_s
        self.assertEqual(db.get_meta(svc.conn, "heartbeat_at"), "2026-09-24T07:01:00Z")
        self.clock.advance(minutes=10)
        self.assertTrue(svc.run_once()["status_written"])
        self.assertEqual(self.syncs.calls, [])

        self.settings.pause_file.unlink()
        self.clock.advance(minutes=1)
        report = svc.run_once()
        self.assertEqual(report["state"], "running")
        self.assertEqual(self.syncs.calls, ALL_SYNCS)
        self.assertIsNotNone(report["published"])
        self.assertEqual(self.status_json()["state"], "running")


class DiskGuard(ServiceTestBase):
    def test_low_disk_stops_sync_and_crawl_but_not_status(self):
        self.disk.free = 1 * GIB
        self.work.batches = [[snap(1)]]
        svc = self.make()
        with self.assertLogs("longview_archive.service", "WARNING") as logs:
            first = svc.run_once()
            self.clock.advance(minutes=1)
            second = svc.run_once()
        self.assertEqual((first["state"], second["state"]), ("disk_guard", "disk_guard"))
        self.assertEqual(self.syncs.calls, [])
        self.assertEqual(self.work.due_limits, [])
        self.assertEqual(sum("disk guard" in line for line in logs.output), 1)  # once per state change
        page = self.status_json()
        self.assertEqual(page["state"], "disk_guard")
        self.assertTrue(page["disk"]["guard"])
        self.assertIsNotNone(first["published"])  # the export is tiny and may continue
        self.assertIsNone(first["backup"])

        self.disk.free = 40 * GIB
        self.clock.advance(minutes=1)
        report = svc.run_once()
        self.assertEqual(report["state"], "running")
        self.assertEqual(self.syncs.calls, ALL_SYNCS)
        self.assertEqual(self.work.applied, [1])
        self.assertFalse(self.status_json()["disk"]["guard"])


class SyncFailures(ServiceTestBase):
    def test_failed_sync_is_isolated_and_retried_after_six_hours(self):
        self.syncs.fail = {SALES}
        self.work.batches = [[snap(1)], [snap(2)]]
        svc = self.make()
        with self.assertLogs("longview_archive.service", "WARNING") as logs:
            report = svc.run_once()
        self.assertEqual(report["sync_failed"], [SALES])
        self.assertEqual(self.syncs.calls, ALL_SYNCS)
        self.assertEqual(self.work.applied, [1])  # the crawl still ran
        self.assertTrue(any(SALES in line and "ApiError" in line for line in logs.output))

        self.syncs.calls.clear()
        self.syncs.fail = set()
        self.clock.advance(minutes=1)
        report = svc.run_once()
        self.assertEqual(self.syncs.calls, [])  # not retried at once
        self.assertEqual(self.work.applied, [1, 2])  # and the next iteration still crawls
        self.clock.advance(hours=5, minutes=58)
        svc.run_once()
        self.assertEqual(self.syncs.calls, [])
        self.clock.advance(minutes=2)
        report = svc.run_once()
        self.assertEqual(self.syncs.calls, [SALES])
        self.assertEqual(report["sync_failed"], [])
        self.assertEqual(len(self.match_calls), 2)  # after each iteration where a sync succeeded

    def test_failed_tabc_returns_instead_of_raising_and_is_also_retried_later(self):
        self.syncs.fail = {TABC}
        svc = self.make()
        self.assertEqual(svc.run_once()["sync_failed"], [TABC])
        self.syncs.calls.clear()
        self.clock.advance(hours=1)
        svc.run_once()
        self.assertEqual(self.syncs.calls, [])
        self.clock.advance(hours=5, seconds=1)
        svc.run_once()
        self.assertEqual(self.syncs.calls, [TABC])

    def test_real_sales_tax_sync_failing_on_the_network_is_recorded_and_isolated(self):
        calls = []

        def dead_socrata(method, url, headers, body, timeout):
            calls.append(url)
            raise OSError("connection refused")

        sleeps = []
        self.sync_patchers[SALES].stop()  # the real comptroller sync, with a dead network
        with mock.patch.object(api_http, "sleep", sleeps.append):
            api_http.reset_rate_limits()
            self.work.batches = [[snap(3)]]
            svc = self.make(transports={"socrata": dead_socrata})
            report = svc.run_once()
            self.assertEqual(report["sync_failed"], [SALES])
            self.assertEqual(len(calls), 1 + api_http.MAX_RETRIES)
            self.assertEqual(self.work.applied, [3])
            row = svc.conn.execute("SELECT status, error FROM runs WHERE kind=?", (SALES,)).fetchone()
            self.assertEqual(row["status"], "error")
            self.assertIn("network_", row["error"])
            source = svc.conn.execute("SELECT last_status FROM sources WHERE id='tx_sales_tax'").fetchone()
            self.assertEqual(source["last_status"], "error")
            self.assertIn(SALES, [e["kind"] for e in self.status_json()["errors"]])
            self.clock.advance(minutes=1)
            svc.run_once()
            self.assertEqual(len(calls), 1 + api_http.MAX_RETRIES)


class Matching(ServiceTestBase):
    def add_new_record(self, conn):
        return b.add_record(conn, None, key="00000000001:00009", name="Example Tire & Lube",
                            name_norm="example tire and lube", street="1200 W Marshall Ave",
                            street_norm="1200 w marshall ave", zip="75601")

    def test_records_left_new_are_matched_without_a_sync(self):
        svc = self.make()
        svc.run_once()
        self.match_calls.clear()
        self.add_new_record(svc.conn)  # as after a crash between a sync and its matching
        self.clock.advance(minutes=1)
        report = svc.run_once()
        self.assertEqual(len(self.match_calls), 1)
        self.assertEqual(report["matched"]["created"], 1)
        self.clock.advance(minutes=1)
        svc.run_once()
        self.assertEqual(len(self.match_calls), 1)  # nothing new is left

    def test_a_failing_match_is_not_retried_every_loop(self):
        calls = []

        def broken(conn, now=None):
            calls.append(now)
            raise RuntimeError("matching bug")

        with mock.patch.object(matching, "match_pending", broken):
            svc = self.make()
            svc.open()
            self.add_new_record(svc.conn)
            with self.assertLogs("longview_archive.service", "WARNING"):
                svc.run_once()
            self.clock.advance(minutes=1)
            report = svc.run_once()
        self.assertEqual(len(calls), 1)
        self.assertIsNone(report["matched"])
        self.assertEqual(report["state"], "running")


class DueTimes(ServiceTestBase):
    def test_sync_week_publish_and_status_cadence(self):
        svc = self.make()
        first = svc.run_once()
        self.assertEqual(self.syncs.calls, ALL_SYNCS)
        self.assertIsNotNone(first["published"])
        self.syncs.calls.clear()

        self.clock.advance(minutes=5)
        report = svc.run_once()
        self.assertEqual((report["published"], report["status_written"]), (None, False))
        self.clock.advance(minutes=5)  # 10 minutes since the last status page
        report = svc.run_once()
        self.assertEqual((report["published"], report["status_written"]), (None, True))
        self.clock.advance(minutes=34)  # 44 minutes since the last export
        self.assertIsNone(svc.run_once()["published"])
        self.clock.advance(minutes=1)
        self.assertIsNotNone(svc.run_once()["published"])
        self.assertEqual(self.syncs.calls, [])

        self.clock.t = START + timedelta(days=6, hours=23, minutes=59)
        svc.run_once()
        self.assertEqual(self.syncs.calls, [])
        self.clock.t = START + timedelta(days=7)
        svc.run_once()
        self.assertEqual(self.syncs.calls, ALL_SYNCS)

    def test_a_run_left_running_by_a_crash_waits_six_hours(self):
        svc = self.make()
        svc.open()
        db.start_run(svc.conn, SALES, "2026-09-24T06:30:00Z")  # the process died mid-sync
        job = service.SYNC_BY_NAME["sales-tax"]
        self.assertEqual(service.sync_due_at(svc.conn, self.settings, job),
                         datetime(2026, 9, 24, 12, 30, tzinfo=timezone.utc))
        self.assertIsNone(service.sync_due_at(svc.conn, self.settings, service.SYNC_BY_NAME["osm"]))


class Restart(ServiceTestBase):
    def test_restart_keeps_the_schedule(self):
        first = self.make()
        first.run_once()
        self.assertEqual(self.syncs.calls, ALL_SYNCS)
        first.close()
        self.syncs.calls.clear()

        self.clock.advance(minutes=30)
        second = self.make()
        report = second.run_once()
        self.assertEqual(self.syncs.calls, [])       # the week has not passed
        self.assertIsNone(report["published"])       # nor 45 minutes since the last export
        self.assertTrue(report["status_written"])    # a new process always writes its page
        self.assertEqual(self.status_json()["state"], "running")
        second.close()

        self.clock.t = START + timedelta(days=7, minutes=1)
        third = self.make()
        third.run_once()
        self.assertEqual(self.syncs.calls, ALL_SYNCS)


class Concurrency(ServiceTestBase):
    def test_never_more_than_max_sites_in_flight(self):
        lock = threading.Lock()
        both_in = threading.Event()
        state = {"now": 0, "max": 0}

        def slow_visit(snapshot, fetcher, settings):
            with lock:
                state["now"] += 1
                state["max"] = max(state["max"], state["now"])
                if state["now"] >= self.settings.max_sites_concurrent:
                    both_in.set()
            both_in.wait(5)   # the first visits wait until the cap is reached
            time.sleep(0.02)
            with lock:
                state["now"] -= 1
            return {"id": snapshot.id}

        self.work.batches = [[snap(n) for n in range(1, 7)]]
        with mock.patch.object(worker, "visit", slow_visit):
            svc = self.make()
            svc.open()
            report = svc.crawl(limit=6)
        self.assertTrue(both_in.is_set())
        self.assertEqual(state["max"], self.settings.max_sites_concurrent)
        self.assertEqual(sorted(self.work.applied), [1, 2, 3, 4, 5, 6])
        self.assertEqual(report["visits"], 6)
        self.assertTrue(all(t is threading.main_thread() for t in self.work.apply_threads))

    def test_loop_asks_for_at_most_the_cap_and_never_visits_more(self):
        self.work.batches = [[snap(1), snap(2), snap(3)]]  # a worker that ignores the limit
        svc = self.make()
        report = svc.run_once()
        self.assertEqual(self.work.due_limits, [2])
        self.assertEqual(sorted(self.work.visited), [1, 2])
        self.assertEqual(report["visits"], 2)

    def test_a_crashing_visit_is_deferred_not_retried_every_loop(self):
        svc = self.make()
        svc.open()
        svc.conn.execute(
            "INSERT INTO businesses(id, name, name_norm, first_seen_at, updated_at, website)"
            " VALUES (7, 'Example Tire & Lube', 'example tire and lube', ?, ?, 'https://site7.example/')",
            ("2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z"),
        )
        self.work.batches = [[snap(7)]]
        with mock.patch.object(worker, "visit", side_effect=RuntimeError("boom")):
            report = svc.run_once()
        self.assertEqual(report["visit_errors"], 1)
        self.assertEqual(self.work.applied, [])
        row = svc.conn.execute("SELECT next_crawl_at FROM businesses WHERE id=7").fetchone()
        self.assertEqual(row["next_crawl_at"], "2026-09-25T07:00:00Z")


class NightlyBackup(ServiceTestBase):
    def test_once_per_chicago_date_after_0330_keeping_14(self):
        folder = self.settings.backup_dir
        folder.mkdir(parents=True)
        first = datetime(2026, 8, 15)
        for n in range(20):
            (folder / f"archive-{(first + timedelta(days=n)):%Y-%m-%d}.db").write_bytes(b"old")
        keep = [folder / "notes.txt", folder / "archive-latest.db", folder / "archive-2026-02-30.db"]
        for path in keep:
            path.write_text("not a backup")

        self.clock.t = datetime(2026, 9, 24, 8, 29, tzinfo=timezone.utc)  # 03:29 CDT
        svc = self.make()
        self.assertIsNone(svc.run_once()["backup"])
        self.clock.t = datetime(2026, 9, 24, 8, 30, tzinfo=timezone.utc)  # 03:30 CDT
        report = svc.run_once()
        today = folder / "archive-2026-09-24.db"
        self.assertEqual(report["backup"], str(today))
        self.assertEqual(stat.S_IMODE(today.stat().st_mode), 0o600)
        backups = backup.backup_files(folder)
        self.assertEqual(len(backups), 14)
        self.assertEqual(backups[0], today)
        self.assertEqual(backups[-1].name, "archive-2026-08-22.db")
        for path in keep:
            self.assertTrue(path.exists(), path)
        self.assertEqual(db.get_meta(svc.conn, "last_backup_date"), "2026-09-24")

        self.clock.t = datetime(2026, 9, 24, 18, 0, tzinfo=timezone.utc)
        self.assertIsNone(svc.run_once()["backup"])
        self.clock.t = datetime(2026, 9, 25, 4, 30, tzinfo=timezone.utc)  # 23:30 CDT, still the 24th
        self.assertIsNone(svc.run_once()["backup"])
        svc.close()
        self.clock.t = datetime(2026, 9, 25, 8, 45, tzinfo=timezone.utc)  # 03:45 CDT on the 25th
        report = self.make().run_once()
        self.assertEqual(report["backup"], str(folder / "archive-2026-09-25.db"))
        self.assertEqual(len(backup.backup_files(folder)), 14)
        check = sqlite3.connect(str(folder / "archive-2026-09-25.db"))  # db.connect would switch it to WAL
        try:
            self.assertEqual(check.execute("PRAGMA journal_mode").fetchone()[0], "delete")
            self.assertEqual(check.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()[0],
                             str(db.SCHEMA_VERSION))
        finally:
            check.close()
        self.assertEqual(sorted(p.name for p in folder.iterdir() if not p.name.startswith("archive-20")),
                         ["archive-latest.db", "notes.txt"])  # no temporary or journal files left behind

    def test_backup_is_skipped_under_the_disk_guard(self):
        self.disk.free = GIB
        self.clock.t = datetime(2026, 9, 24, 12, 0, tzinfo=timezone.utc)
        self.assertIsNone(self.make().run_once()["backup"])
        self.assertEqual(backup.backup_files(self.settings.backup_dir), [])

    def test_nightly_backup_skips_an_existing_file(self):
        conn = db.connect(":memory:")
        db.migrate(conn)
        path = backup.nightly_backup(conn, self.settings, "2026-09-24")
        self.assertTrue(path.exists())
        self.assertIsNone(backup.nightly_backup(conn, self.settings, "2026-09-24"))
        self.assertEqual([p.name for p in self.settings.backup_dir.iterdir()], ["archive-2026-09-24.db"])
        conn.close()


class Stopping(ServiceTestBase):
    def test_stop_during_a_visit_waits_for_it_and_ends_stopping(self):
        entered, release = threading.Event(), threading.Event()

        def blocking_visit(snapshot, fetcher, settings):
            entered.set()
            release.wait(10)
            return {"id": snapshot.id}

        self.work.batches = [[snap(1)]]
        with mock.patch.object(worker, "visit", blocking_visit):
            svc = self.make()
            thread = threading.Thread(target=svc.run_forever)
            thread.start()
            self.assertTrue(entered.wait(10))
            svc.request_stop()
            time.sleep(0.3)
            self.assertTrue(thread.is_alive())  # waiting for the visit in flight
            release.set()
            thread.join(10)
        self.assertFalse(thread.is_alive())
        self.assertEqual(self.work.applied, [1])     # the visit finished, so it was written
        self.assertGreaterEqual(self.work.persisted, 1)
        self.assertIsNone(svc.conn)
        self.assertEqual(self.meta("state"), "stopping")
        self.assertEqual(self.status_json()["state"], "stopping")

    def _fetching_visit(self, fetched):
        def visit(snapshot, fetcher, settings):
            fetched.append(fetcher.fetch(snapshot.website))            # robots.txt, then the page
            fetched.append(fetcher.fetch(snapshot.website + "contact"))  # waits min_host_delay_s
            return {"id": snapshot.id}
        return visit

    def _web(self, requests):
        def transport(url, headers, timeout, max_bytes):
            requests.append(url)
            if url.endswith("/robots.txt"):
                return RawResponse(404, Headers({"Content-Type": "text/plain"}), b"")
            return RawResponse(200, Headers({"Content-Type": "text/html"}), b"<html><title>Example</title></html>")
        return transport

    def _wait_for(self, predicate, timeout=10):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if predicate():
                return True
            time.sleep(0.02)
        return False

    def test_stop_ends_a_visit_at_its_next_wait_and_leaves_the_site_due(self):
        settings = dataclasses.replace(self.settings, min_host_delay_s=30.0)
        requests, fetched = [], []
        self.work.batches = [[snap(1)]]
        with mock.patch.object(worker, "visit", self._fetching_visit(fetched)):
            svc = self.make(settings, fetcher=None, transports={"web": self._web(requests)})
            thread = threading.Thread(target=svc.run_forever)
            thread.start()
            self.assertTrue(self._wait_for(lambda: len(requests) >= 1))  # robots.txt; the page waits 30 s
            started = time.monotonic()
            svc.request_stop()
            thread.join(10)
        self.assertFalse(thread.is_alive())
        self.assertLess(time.monotonic() - started, 5)
        self.assertEqual(requests, ["https://site1.example/robots.txt"])  # nothing after the stop
        self.assertEqual(self.work.applied, [])  # a cut-short visit is never written
        self.assertEqual(self.meta("state"), "stopping")

    def test_pause_ends_a_visit_in_flight(self):
        settings = dataclasses.replace(self.settings, min_host_delay_s=30.0)
        requests, fetched, reports = [], [], []
        self.work.batches = [[snap(1)]]
        with mock.patch.object(worker, "visit", self._fetching_visit(fetched)):
            svc = self.make(settings, fetcher=None, transports={"web": self._web(requests)})
            def one_iteration():  # the connection belongs to the thread that opens it
                reports.append(svc.run_once())
                svc.close()

            thread = threading.Thread(target=one_iteration)
            thread.start()
            self.assertTrue(self._wait_for(lambda: len(requests) >= 1))
            settings.pause_file.touch()
            thread.join(10)
        self.assertFalse(thread.is_alive())
        self.assertEqual(reports[0]["interrupted"], 1)
        self.assertEqual(self.work.applied, [])
        self.assertEqual(len(requests), 1)

    def test_stop_ends_an_api_retry_wait_and_the_sync_is_not_held_back(self):
        calls = []
        started = threading.Event()

        def dead_socrata(method, url, headers, body, timeout):
            calls.append(url)
            started.set()
            raise OSError("connection refused")

        original_sleep = api_http.sleep
        self.sync_patchers[SALES].stop()  # the real comptroller sync; the others stay fakes
        api_http.reset_rate_limits()
        svc = self.make(transports={"socrata": dead_socrata})
        thread = threading.Thread(target=svc.run_forever)
        thread.start()
        self.assertTrue(started.wait(10))
        time.sleep(0.3)   # inside the first 2-second retry wait
        svc.request_stop()
        thread.join(10)
        self.assertFalse(thread.is_alive())
        self.assertIs(api_http.sleep, original_sleep)
        self.assertEqual(len(calls), 1)
        conn = db.connect(self.settings.db_path)
        try:
            row = conn.execute("SELECT status, error FROM runs WHERE kind=?", (SALES,)).fetchone()
            self.assertEqual((row["status"], row["error"]), ("error", service.INTERRUPTED))
            self.assertIsNone(service.sync_due_at(conn, self.settings, service.SYNC_BY_NAME["sales-tax"]))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM runs WHERE kind=?", (TABC,)).fetchone()[0], 0)
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()

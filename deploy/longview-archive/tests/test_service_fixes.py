"""Service loop regressions from the crawl and service reviews.

Crash-loop leases, host state saved after every visit, a heartbeat that keeps
ticking during a long visit, PAUSE honoured between steps and during API
waits, and a stop that abandons an open-data request in flight. No network:
every transport is a fake and all hosts are ``.example``.
"""

import threading
import time
import unittest
from unittest import mock

from longview_archive import db, service, worker
from longview_archive.sources import http as api_http
from tests.fixtures import builders as b
from tests.test_service import SALES, START, ServiceTestBase, snap

REAL_DUE = worker.due_businesses  # captured before the fakes are patched in


def wait_for(predicate, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            if predicate():
                return True
        except Exception:  # noqa: BLE001 - the database may not be migrated yet
            pass
        time.sleep(0.02)
    return False


class ServiceFixesBase(ServiceTestBase):
    def run_in_thread(self, svc, body):
        """Run ``body(svc)`` on its own thread (the connection belongs to the thread that opens it)."""
        out = {}

        def target():
            try:
                svc.open()
                out["value"] = body(svc)
            except BaseException as exc:  # pragma: no cover - surfaced by the caller
                out["error"] = exc
            finally:
                svc.close()

        thread = threading.Thread(target=target)
        thread.start()
        return thread, out

    def read_db(self, sql, params=()):
        conn = db.connect(self.settings.db_path)
        try:
            return conn.execute(sql, params).fetchall()
        finally:
            conn.close()


class CrashLoopLease(ServiceFixesBase):
    def add_site(self, svc):
        with db.transaction(svc.conn):
            bid = b.add_business(svc.conn, "Example Tire & Lube", website="https://www.exampletire.example/",
                                 website_domain="exampletire.example")
            b.add_record(svc.conn, bid, "tx_sales_tax")
        return bid

    def test_a_site_is_leased_before_its_visit_so_a_crash_does_not_refetch_it(self):
        svc = self.make()
        svc.open()
        bid = self.add_site(svc)
        seen = {}

        def visit(snapshot, fetcher, settings):
            # What a restarted process would pick if this one died right now.
            other = db.connect(self.settings.db_path)
            try:
                seen["due"] = [s.id for s in REAL_DUE(other, self.settings, START, 5)]
                seen["next"] = other.execute("SELECT next_crawl_at FROM businesses WHERE id=?",
                                             (bid,)).fetchone()[0]
            finally:
                other.close()
            return {"id": snapshot.id}

        with mock.patch.object(worker, "due_businesses", REAL_DUE), mock.patch.object(worker, "visit", visit):
            report = svc.crawl()
        self.assertEqual(report["visits"], 1)
        self.assertEqual(seen["due"], [])
        self.assertEqual(seen["next"], "2026-09-25T07:00:00Z")  # one rung of the ladder (1 day)

    def test_an_interrupted_visit_hands_its_lease_back(self):
        svc = self.make()
        svc.open()
        bid = self.add_site(svc)

        def visit(snapshot, fetcher, settings):
            raise service.Interrupted()

        with mock.patch.object(worker, "due_businesses", REAL_DUE), mock.patch.object(worker, "visit", visit):
            report = svc.crawl()
        self.assertEqual(report["interrupted"], 1)
        row = svc.conn.execute("SELECT next_crawl_at FROM businesses WHERE id=?", (bid,)).fetchone()
        self.assertIsNone(row["next_crawl_at"])  # still due after the stop or pause


class HostStatePersistence(ServiceFixesBase):
    def test_host_state_is_saved_after_each_visit_not_only_at_batch_end(self):
        release = threading.Event()
        self.addCleanup(release.set)

        def visit(snapshot, fetcher, settings):
            if snapshot.id == 2:
                release.wait(10)
            return {"id": snapshot.id}

        self.work.batches = [[snap(1), snap(2)]]
        with mock.patch.object(worker, "visit", visit):
            svc = self.make()
            thread, _ = self.run_in_thread(svc, lambda s: s.crawl())
            try:
                # Site 1 is written while site 2 is still being visited, and its state is saved.
                self.assertTrue(wait_for(lambda: self.work.applied == [1] and self.work.persisted >= 1))
            finally:
                release.set()
                thread.join(10)
        self.assertEqual(sorted(self.work.applied), [1, 2])


class Keepalive(ServiceFixesBase):
    def test_heartbeat_and_status_keep_ticking_during_a_long_visit(self):
        release = threading.Event()
        self.addCleanup(release.set)
        advanced = START.replace(minute=30)

        def visit(snapshot, fetcher, settings):
            self.clock.t = advanced  # half an hour of polite waiting goes by
            release.wait(10)
            return {"id": snapshot.id}

        self.work.batches = [[snap(1)]]
        with mock.patch.object(worker, "visit", visit):
            svc = self.make()
            svc.keepalive_s = 0.05
            thread, _ = self.run_in_thread(svc, lambda s: s.run_once())
            try:
                self.assertTrue(wait_for(lambda: self.meta("heartbeat_at") == db.now_iso(advanced)))
                self.assertTrue(wait_for(lambda: self.meta("last_status_at") == db.now_iso(advanced)))
            finally:
                release.set()
                thread.join(10)


class PauseBetweenSteps(ServiceFixesBase):
    def test_pause_during_a_sync_skips_the_rest_of_the_pass(self):
        fake_sales = self.syncs.make(service.SYNC_BY_NAME["sales-tax"])

        def pausing_sales(conn, settings, now=None, transport=None):
            out = fake_sales(conn, settings, now=now, transport=transport)
            settings.pause_file.touch()
            return out

        self.sync_patchers[SALES].stop()
        self.work.batches = [[snap(1)]]
        with mock.patch.object(service.SYNC_BY_NAME["sales-tax"].module, "sync_sales_tax", pausing_sales):
            svc = self.make()
            report = svc.run_once()
        self.assertEqual(self.syncs.calls, [SALES])  # TABC, NPI, and OSM wait for the resume
        self.assertEqual(self.work.due_limits, [])    # no sites chosen
        self.assertEqual(self.work.visited, [])
        self.assertIsNone(report["published"])        # no export while paused

    def test_pause_ends_an_api_retry_wait_and_the_sync_is_retried_after_resume(self):
        calls, started = [], threading.Event()

        def dead_socrata(method, url, headers, body, timeout):
            calls.append(url)
            started.set()
            raise OSError("connection refused")

        self.sync_patchers[SALES].stop()
        api_http.reset_rate_limits()
        svc = self.make(transports={"socrata": dead_socrata})
        thread = threading.Thread(target=svc.run_forever)
        thread.start()
        try:
            self.assertTrue(started.wait(10))
            time.sleep(0.3)  # inside the first 2-second retry wait
            self.settings.pause_file.touch()
            self.assertTrue(wait_for(lambda: self.meta("state") == "paused"))
            time.sleep(2.5)  # past the retry wait: no second request while paused
            self.assertEqual(len(calls), 1)
        finally:
            svc.request_stop()
            thread.join(10)
        self.assertFalse(thread.is_alive())
        rows = self.read_db("SELECT status, error FROM runs WHERE kind=?", (SALES,))
        self.assertEqual([(r["status"], r["error"]) for r in rows], [("error", service.INTERRUPTED)])


class StopAbandonsApiRequest(ServiceFixesBase):
    def test_stop_during_a_hanging_api_request_is_honoured_quickly(self):
        release, started = threading.Event(), threading.Event()
        self.addCleanup(release.set)

        def hanging_socrata(method, url, headers, body, timeout):
            started.set()
            release.wait(30)  # a server that accepts and never answers
            raise OSError("reset")

        self.sync_patchers[SALES].stop()
        api_http.reset_rate_limits()
        svc = self.make(transports={"socrata": hanging_socrata})
        thread = threading.Thread(target=svc.run_forever)
        thread.start()
        self.assertTrue(started.wait(10))
        stopped_at = time.monotonic()
        svc.request_stop()
        thread.join(5)
        self.assertFalse(thread.is_alive())
        self.assertLess(time.monotonic() - stopped_at, 3)
        self.assertEqual(self.meta("state"), "stopping")
        rows = self.read_db("SELECT status, error FROM runs WHERE kind=?", (SALES,))
        self.assertEqual([(r["status"], r["error"]) for r in rows], [("error", service.INTERRUPTED)])


if __name__ == "__main__":
    unittest.main()

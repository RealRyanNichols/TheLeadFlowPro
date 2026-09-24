import html
import json
import stat
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from longview_archive import config, db, publish, status
from tests.fixtures import builders as b
from tests.test_publish import build_world

NOW = datetime(2026, 9, 24, 18, 0, 0, tzinfo=timezone.utc)

KEYS = ["generatedAt", "version", "state", "heartbeatAt", "archive", "factsVerified", "publish", "reviewOpen",
        "newThisWeek", "newPermits90d", "hiringSignals", "crawl", "sources", "otherZips", "errors", "disk",
        "lastExportAt"]


class StatusPage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(data_dir=Path(self.tmp.name) / "data")
        self.conn = b.make_db()
        self.ids = build_world(self.conn)
        publish.evaluate(self.conn, self.settings, NOW)
        self.names = [r[0] for r in self.conn.execute("SELECT name FROM businesses")]
        db.set_meta(self.conn, "state", "running")
        db.set_meta(self.conn, "heartbeat_at", "2026-09-24T17:57:00Z")
        db.set_meta(self.conn, "disk_free_bytes", str(40 * config.GIB))
        db.set_meta(self.conn, "last_export_at", "2026-09-24T17:15:00Z")
        run = db.start_run(self.conn, "sync_tx_sales_tax", "2026-09-24T11:00:00Z")
        db.finish_run(self.conn, run, "ok", {"rows": 18, "other_zips": {"75647": 3, "75662": 1, "75601": 9}},
                      now="2026-09-24T11:05:00Z")
        run = db.start_run(self.conn, "crawl", "2026-09-24T16:00:00Z")
        db.finish_run(self.conn, run, "error",
                      error="HTTPError 500 at https://www.exampletire.example/contact for Example Tire & Lube"
                            " (info@exampletire.example, 903-555-0100) host www.exampletire.example "
                            + "x" * 300,
                      now="2026-09-24T16:01:00Z")
        # Recent activity for the week counters.
        self.conn.execute("UPDATE businesses SET last_crawled_at='2026-09-23T12:00:00Z' WHERE id=?",
                          (self.ids["tire"],))
        self.conn.execute("UPDATE businesses SET first_seen_at='2026-09-22T12:00:00Z', permit_start='2026-08-01'"
                          " WHERE id=?", (self.ids["office"],))
        self.conn.execute("INSERT INTO host_state(host, backoff_level, backoff_until) VALUES (?,?,?)",
                          ("slow.example", 1, "2026-09-25T00:00:00Z"))
        self.data = status.collect(self.conn, self.settings, NOW)

    def write(self, data=None):
        status.write_status(self.settings, data or self.data)
        www = self.settings.www_dir
        return (www / "status" / "index.html").read_text(encoding="utf-8")

    def test_status_json_keys_and_types(self):
        d = self.data
        self.assertEqual(list(d), KEYS)
        self.assertEqual(d["generatedAt"], "2026-09-24T18:00:00Z")
        self.assertEqual(d["version"], config.VERSION)
        self.assertEqual(d["state"], "running")
        self.assertEqual(d["heartbeatAt"], "2026-09-24T17:57:00Z")
        self.assertEqual(list(d["archive"]), ["businesses", "inCity", "nearby", "withWebsite", "readThisWeek"])
        self.assertEqual(d["archive"], {"businesses": 14, "inCity": 13, "nearby": 1, "withWebsite": 7,
                                        "readThisWeek": 7})
        self.assertEqual(list(d["factsVerified"]), list(status.FACT_FIELDS))
        self.assertEqual(d["factsVerified"]["website"], 7)
        self.assertEqual(d["factsVerified"]["phone"], 3)
        self.assertEqual(d["publish"], {"ready": 7, "review": 1, "held": 3, "suppressed": 4, "pending": 0})
        self.assertEqual(d["reviewOpen"], {})
        self.assertEqual((d["newThisWeek"], d["newPermits90d"], d["hiringSignals"]), (1, 1, 1))
        self.assertEqual(list(d["crawl"]), ["due", "ok", "blocked", "dead", "moved", "hostsInBackoff"])
        self.assertEqual(d["crawl"]["ok"], 7)
        self.assertEqual(d["crawl"]["due"], 5)  # never crawled; suppressed ones are skipped
        self.assertEqual(d["crawl"]["hostsInBackoff"], 1)
        self.assertEqual([s["id"] for s in d["sources"]], ["tx_sales_tax", "tx_tabc", "osm", "npi", "website"])
        for source in d["sources"]:
            self.assertEqual(list(source), ["id", "name", "lastSyncedAt", "status", "rows"])
        self.assertEqual(d["otherZips"], {"75647": 3, "75662": 1})
        self.assertEqual(len(d["errors"]), 1)
        self.assertEqual(list(d["errors"][0]), ["kind", "at", "message"])
        self.assertLessEqual(len(d["errors"][0]["message"]), 200)
        self.assertEqual(d["disk"], {"freeGb": 40.0, "guard": False})
        self.assertEqual(d["lastExportAt"], "2026-09-24T17:15:00Z")
        for value in (d["newThisWeek"], d["newPermits90d"], d["hiringSignals"], *d["archive"].values(),
                      *d["publish"].values(), *d["crawl"].values(), *d["factsVerified"].values()):
            self.assertIs(type(value), int)
        json.dumps(d)  # serializable

    def test_error_messages_are_scrubbed(self):
        message = self.data["errors"][0]["message"]
        self.assertTrue(message.startswith("HTTPError 500 at [link] for [name] ([email], [number]) host [host] xxx"),
                        message)
        for needle in ("http", "Example Tire", "@", "555-0100", "exampletire"):
            self.assertNotIn(needle, message)

    def test_html_rules(self):
        page = self.write()
        self.assertEqual(page.count("<h1"), 1)
        self.assertIn("<h1>Longview archive status</h1>", page)
        self.assertIn('<html lang="en">', page)
        self.assertIn('<meta name="robots" content="noindex,nofollow">', page)
        self.assertIn('<meta name="viewport" content="width=device-width, initial-scale=1">', page)
        self.assertIn('<link rel="stylesheet" href="/status/status.css">', page)
        lowered = page.lower()
        for banned in ("<script", " style=", "<style", "http://", "https://", "<img", "<iframe", "@import"):
            self.assertNotIn(banned, lowered)
        self.assertIn(">Running<", page)
        self.assertIn("3 minutes before this page was written", page)
        self.assertIn("CDT", page)  # Central time

    def test_no_business_data_on_the_page(self):
        page = self.write()
        raw = (self.settings.www_dir / "status.json").read_text(encoding="utf-8")
        for text in (page, raw):
            for name in self.names:
                self.assertNotIn(name, text)
                self.assertNotIn(html.escape(name), text)
            for needle in ("1200 W Marshall", "+1903", "(903)", "info@", ".example", "http://", "https://"):
                self.assertNotIn(needle, text)

    def test_files_and_modes(self):
        self.write()
        www = self.settings.www_dir
        self.assertEqual((www / "robots.txt").read_text(), "User-agent: *\nDisallow: /\n")
        index = (www / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="/status/"', index)
        self.assertIn('<meta name="robots" content="noindex,nofollow">', index)
        self.assertNotIn("<script", index)
        css = (www / "status" / "status.css").read_text(encoding="utf-8")
        for token in ("#0A1220", "#F7F5F2", "#FFFFFF", "#DED8D0", "#1240E8", "#146C34", "#92400E"):
            self.assertIn(token, css)
        self.assertNotIn("url(", css)
        self.assertNotIn("@import", css)
        self.assertEqual(json.loads((www / "status.json").read_text(encoding="utf-8")), self.data)
        for path in (www / "status.json", www / "robots.txt", www / "index.html", www / "status" / "index.html",
                     www / "status" / "status.css"):
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o644, path)
        leftovers = [p.name for p in www.rglob("*.tmp")]
        self.assertEqual(leftovers, [])

    def test_paused_and_disk_guard_state_lines(self):
        db.set_meta(self.conn, "state", "paused")
        page = self.write(status.collect(self.conn, self.settings, NOW))
        self.assertIn("Paused: the PAUSE file is present", page)
        db.set_meta(self.conn, "state", "disk_guard")
        db.set_meta(self.conn, "disk_free_bytes", str(2 * config.GIB))
        data = status.collect(self.conn, self.settings, NOW)
        self.assertEqual(data["disk"], {"freeGb": 2.0, "guard": True})
        page = self.write(data)
        self.assertIn("Crawling stopped: free disk space is low", page)
        self.assertNotIn(">Running<", page)
        for state, line in (("starting", "Starting"), ("stopping", "Stopping")):
            db.set_meta(self.conn, "state", state)
            self.assertIn(f">{line}<", self.write(status.collect(self.conn, self.settings, NOW)))

    def test_stale_or_missing_heartbeat_is_said_plainly(self):
        db.set_meta(self.conn, "heartbeat_at", "2026-09-24T17:00:00Z")
        page = self.write(status.collect(self.conn, self.settings, NOW))
        self.assertIn("60 minutes before this page was written. The engine may have stopped.", page)
        self.conn.execute("DELETE FROM meta WHERE key='heartbeat_at'")
        page = self.write(status.collect(self.conn, self.settings, NOW))
        self.assertIn("No heartbeat has been recorded yet.", page)

    def test_empty_database(self):
        conn = b.make_db()
        data = status.collect(conn, self.settings, NOW)
        self.assertEqual(data["state"], "starting")
        self.assertEqual(data["disk"], {"freeGb": None, "guard": False})
        self.assertEqual((data["otherZips"], data["errors"], data["reviewOpen"]), ({}, [], {}))
        page = self.write(data)
        self.assertIn("Nothing is waiting for review.", page)
        self.assertIn("No failed jobs.", page)


if __name__ == "__main__":
    unittest.main()

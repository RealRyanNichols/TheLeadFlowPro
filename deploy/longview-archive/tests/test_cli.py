"""The command line, run as the operator runs it: ``python -m longview_archive <command>``.

Every command runs in a subprocess against a temporary LVA_DATA_DIR with the
open-data endpoints pointed at 127.0.0.1:9, where nothing listens, and with an
environment built from scratch (no proxies, no tokens). Seeded rows are
fictional: ``.example`` domains and 903-555-01xx numbers.
"""

import contextlib
import io
import json
import os
import re
import shlex
import signal
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

from longview_archive import __main__ as cli
from longview_archive import db, facts, privacy
from tests.fixtures import builders as b

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
DEAD = "http://127.0.0.1:9"


def base_env(data_dir: Path, **extra) -> dict:
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "LANG": "C.UTF-8",
        "PYTHONDONTWRITEBYTECODE": "1",
        "no_proxy": "*",
        "NO_PROXY": "*",
        "LVA_DATA_DIR": str(data_dir),
        "LVA_ALLOW_PRIVATE_HOSTS": "1",
        "LVA_SOCRATA_BASE": DEAD,
        "LVA_OVERPASS_URL": DEAD + "/api/interpreter",
        "LVA_NPI_URL": DEAD + "/api/",
        "LVA_LOOP_IDLE": "0.2",
        "LVA_PAUSE_POLL": "0.2",
        "LVA_STATUS_EVERY": "1",
        # The default 5 GiB guard would make a small test machine look unhealthy.
        "LVA_DISK_GUARD_BYTES": str(1024 * 1024),
    }
    env.update(extra)
    return env


class CliTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.data = Path(self.tmp.name) / "data"
        self.env = base_env(self.data)

    def lva(self, *args, env=None, timeout=90):
        proc = subprocess.run(
            [sys.executable, "-m", "longview_archive", *args], cwd=str(ROOT), env=env or self.env,
            capture_output=True, text=True, timeout=timeout,
        )
        self.assertNotIn("Traceback", proc.stderr, proc.stderr)
        return proc

    def conn(self):
        return db.connect(self.data / "db" / "archive.db")

    def status_json(self):
        return json.loads((self.data / "www" / "status.json").read_text(encoding="utf-8"))

    def wait_for(self, predicate, timeout=20.0):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                if predicate():
                    return True
            except (OSError, ValueError, KeyError):
                pass
            time.sleep(0.1)
        return False


class Basics(CliTestBase):
    def test_migrate(self):
        proc = self.lva("migrate")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("schema version 1", proc.stdout)
        conn = self.conn()
        try:
            self.assertEqual(db.get_meta(conn, "schema_version"), str(db.SCHEMA_VERSION))
            self.assertGreater(conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0], 0)
        finally:
            conn.close()
        self.assertEqual(stat.S_IMODE((self.data / "db").stat().st_mode), 0o700)

    def test_check_passes_on_a_healthy_folder(self):
        proc = self.lva("check")
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        for needle in ("version 1.0.0", str(self.data), "schema version 1", "PAUSE file: not present",
                       "Running under longview-archive.service: no", "Result: OK"):
            self.assertIn(needle, proc.stdout)

    def test_check_fails_below_the_disk_guard_and_reports_pause(self):
        self.data.mkdir(parents=True)
        (self.data / "PAUSE").touch()
        proc = self.lva("check", env=base_env(self.data, LVA_DISK_GUARD_BYTES=str(10 ** 18)))
        self.assertEqual(proc.returncode, 1)
        self.assertIn("BELOW GUARD", proc.stdout)
        self.assertIn("PAUSE file: present", proc.stdout)
        self.assertIn("free disk space is below the guard", proc.stdout)

    def test_check_refuses_the_ssrf_escape_hatch_on_the_production_folder(self):
        report = io.StringIO()
        with mock.patch.dict(os.environ, {"LVA_ALLOW_PRIVATE_HOSTS": "1"}, clear=True), \
                mock.patch.object(cli.config.Settings, "ensure_dirs", lambda self: None), \
                mock.patch.object(cli, "bootstrap", side_effect=OSError("not here")), \
                mock.patch.object(cli, "_writable", return_value=True), \
                contextlib.redirect_stdout(report):
            code = cli.cmd_check(None, cli.config.load_settings())
        self.assertEqual(code, 1)
        self.assertIn("the SSRF guard is off", report.getvalue())

    def test_bad_settings_are_one_line(self):
        env = dict(self.env)
        del env["LVA_ALLOW_PRIVATE_HOSTS"]
        env["LVA_MAX_SITES"] = "5"
        proc = self.lva("check", env=env)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("Settings problem", proc.stderr)

    def test_status_writes_the_page(self):
        proc = self.lva("status")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        data = self.status_json()
        self.assertEqual(data["version"], "1.0.0")
        self.assertTrue((self.data / "www" / "status" / "index.html").exists())
        self.assertEqual((self.data / "www" / "robots.txt").read_text(), "User-agent: *\nDisallow: /\n")

    def test_publish_out_writes_a_valid_export(self):
        out = Path(self.tmp.name) / "batch" / "directory.json"
        proc = self.lva("publish", "--out", str(out))
        self.assertEqual(proc.returncode, 0, proc.stderr)
        data = json.loads(out.read_text(encoding="utf-8"))
        self.assertEqual(data["schemaVersion"], 1)
        self.assertIs(data["sample"], False)
        self.assertEqual(data["businesses"], [])
        self.assertIn(str(out), proc.stdout)
        self.assertFalse((self.data / "exports" / "publish" / "directory.json").exists())

    def test_match_exports_backup_and_crawl_once_on_an_empty_archive(self):
        proc = self.lva("match")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("created=0", proc.stdout)
        proc = self.lva("exports")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        for name in ("website-prospects.csv", "hiring-partners.csv"):
            path = self.data / "exports" / "private" / name
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        proc = self.lva("backup")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        files = list((self.data / "backups").glob("archive-*.db"))
        self.assertEqual(len(files), 1)
        self.assertEqual(stat.S_IMODE(files[0].stat().st_mode), 0o600)
        again = self.lva("backup")
        self.assertEqual(again.returncode, 0)
        self.assertIn("already exists", again.stdout)
        proc = self.lva("crawl-once", "--limit", "1")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("No website is due", proc.stdout)
        (self.data / "PAUSE").touch()
        proc = self.lva("crawl-once")
        self.assertEqual(proc.returncode, 1)
        self.assertIn("PAUSE", proc.stderr)

    def test_usage_errors_exit_2(self):
        self.assertEqual(self.lva("fly").returncode, 2)
        self.assertEqual(self.lva("sync", "everything").returncode, 2)
        self.assertEqual(self.lva("suppress", "--id", "lv-abcde12345").returncode, 2)  # --reason is required
        self.assertEqual(self.lva("crawl-once", "--limit", "0").returncode, 2)


class Sync(CliTestBase):
    def test_network_failure_is_one_clear_line_and_exit_1(self):
        proc = self.lva("sync", "sales-tax", timeout=120)
        self.assertEqual(proc.returncode, 1)
        lines = [line for line in proc.stderr.splitlines() if line.startswith("sync sales-tax failed")]
        self.assertEqual(len(lines), 1, proc.stderr)
        self.assertIn("could not reach 127.0.0.1", lines[0])
        conn = self.conn()
        try:
            row = conn.execute("SELECT status FROM runs WHERE kind='sync_tx_sales_tax'").fetchone()
            self.assertEqual(row["status"], "error")
        finally:
            conn.close()


class SuppressAndReview(CliTestBase):
    def seed(self):
        self.assertEqual(self.lva("migrate").returncode, 0)
        conn = self.conn()
        try:
            with db.transaction(conn):
                tire = b.add_business(conn, "Example Tire & Lube", public_id="lv-test00001")
                b.add_record(conn, tire, key="12345678901:00001")
                b.add_site(conn, tire, "https://www.exampletire.example/")
                b.add_fact(conn, tire, "phone", "+19035550100", source_url="https://www.exampletire.example/")
                person = b.add_business(conn, "Pat Sample", public_id="lv-test00002", street="400 N Fictional St")
                b.add_record(conn, person, key="98765432109:00002")
                loose = b.add_record(conn, None, key="55555555555:00003", name="Example Tyre and Lube",
                                     street="1200 W Example Ave", street_norm="1200 w example ave",
                                     zip="75601", phone="+19035550177")
            # A second phone seen on the business's own site conflicts with the checked one.
            self.assertEqual(facts.observe(conn, tire, "phone", "+19035550142", "website",
                                           "https://www.exampletire.example/contact", "tel_link", 0.95), "review")
            with db.transaction(conn):
                db.add_review(conn, kind="person_name_check", business_id=person, proposed="Pat Sample",
                              detail="The listed name may be a person's name.")
                db.add_review(conn, kind="merge_ambiguous", business_id=tire, source_record_id=loose,
                              source_url="https://records.example/tx_sales_tax/3",
                              detail="Both list +19035550177 but at 1200 w example ave and 400 n fictional st.")
                db.add_review(conn, kind="shared_phone", field="phone", proposed="+19035550177",
                              detail="This phone is listed at 3 streets.")
            ids = {r["kind"]: r["id"] for r in conn.execute("SELECT id, kind FROM review_queue")}
        finally:
            conn.close()
        return ids

    def test_suppress_each_kind_is_normalized_like_privacy_compares(self):
        self.assertEqual(self.lva("migrate").returncode, 0)
        env = dict(self.env, LVA_ALLOW_FICTIONAL_PHONES="1")
        for args in (("--id", " LV-TEST00001 "), ("--domain", "https://WWW.ExampleTire.example/contact"),
                     ("--phone", "(903) 555-0150"), ("--name-zip", "The Example Tire & Lube, LLC", "75601-1234")):
            proc = self.lva("suppress", *args, "--reason", "owner asked", "--note", "email of 2026-09-24", env=env)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertNotIn("555-0150", proc.stdout)
        conn = self.conn()
        try:
            rows = {(r["kind"], r["value"]) for r in conn.execute("SELECT kind, value FROM suppressions")}
            reasons = {r[0] for r in conn.execute("SELECT reason FROM suppressions")}
        finally:
            conn.close()
        self.assertEqual(rows, {
            ("public_id", "lv-test00001"),
            ("domain", "exampletire.example"),
            ("phone", "+19035550150"),
            ("name_zip", privacy.name_zip_key("Example Tire & Lube", "75601")),
        })
        self.assertEqual(reasons, {"owner asked"})
        again = self.lva("suppress", "--id", "lv-test00001", "--reason", "owner asked")
        self.assertIn("Already suppressed", again.stdout)
        bad = self.lva("suppress", "--phone", "12", "--reason", "owner asked")
        self.assertEqual(bad.returncode, 1)
        self.assertIn("not a US phone number", bad.stderr)

    def test_suppress_by_id_then_review_list_shows_only_safe_values(self):
        ids = self.seed()
        proc = self.lva("suppress", "--id", "lv-test00001", "--reason", "owner asked")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("Suppressed public id lv-test00001", proc.stdout)
        export = json.loads((self.data / "exports" / "publish" / "directory.json").read_text())
        self.assertNotIn("lv-test00001", [biz["id"] for biz in export["businesses"]])
        conn = self.conn()
        try:
            state = conn.execute("SELECT publish_state FROM businesses WHERE public_id='lv-test00001'").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual(state, "suppressed")

        proc = self.lva("review", "list")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        text = proc.stdout
        conflict = next(line for line in text.splitlines() if line.split()[:1] == [str(ids["field_conflict"])])
        self.assertIn("field_conflict", conflict)
        self.assertIn("lv-test00001", conflict)
        self.assertIn("+19035550142", conflict)          # read on the business's own site
        self.assertIn("https://www.exampletire.example/contact", conflict)
        for secret in ("Pat Sample", "+19035550177", "example ave", "fictional st", "12345678901", "98765432109",
                       "55555555555", "records.example"):
            self.assertNotIn(secret, text.lower() if secret.islower() else text)
        self.assertIn("4 open review item(s)", text)

        only = self.lva("review", "list", "--kind", "shared_phone", "--limit", "1")
        self.assertIn(str(ids["shared_phone"]), only.stdout)
        self.assertNotIn("field_conflict", only.stdout)

    def test_review_accept_and_reject(self):
        ids = self.seed()
        proc = self.lva("review", "accept", str(ids["field_conflict"]), "--actor", "Tester")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("accepted by Tester", proc.stdout)
        conn = self.conn()
        try:
            fact = conn.execute("SELECT value_json, accepted_by FROM facts WHERE field='phone'").fetchone()
        finally:
            conn.close()
        self.assertEqual((json.loads(fact["value_json"]), fact["accepted_by"]), ("+19035550142", "Tester"))

        proc = self.lva("review", "reject", str(ids["person_name_check"]))  # the README form, no --actor
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("rejected by operator", proc.stdout)

        proc = self.lva("review", "reject", str(ids["merge_ambiguous"]), "--actor", "Tester")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        conn = self.conn()
        try:
            state = conn.execute("SELECT match_state FROM source_records WHERE source_key='55555555555:00003'"
                                 ).fetchone()[0]
            person = conn.execute("SELECT publish_state, publish_reason FROM businesses"
                                  " WHERE public_id='lv-test00002'").fetchone()
        finally:
            conn.close()
        self.assertNotEqual(state, "new")  # matching looked at the record again
        self.assertEqual(tuple(person), ("held", "person_name_rejected"))

        for args in (("accept", "999"), ("reject", str(ids["field_conflict"]))):
            proc = self.lva("review", *args, "--actor", "Tester")
            self.assertEqual(proc.returncode, 1)
            self.assertIn("Could not", proc.stderr)

    def test_accepting_website_reviews_points_the_worker_at_the_right_site(self):
        self.assertEqual(self.lva("migrate").returncode, 0)
        conn = self.conn()
        try:
            with db.transaction(conn):
                old = b.add_business(conn, "Example Florist", public_id="lv-test00011")
                b.add_record(conn, old, key="12345678901:00011")
                b.add_site(conn, old, "https://www.oldflorist.example/")
                b.add_fact(conn, old, "phone", "+19035550150", source_url="https://www.oldflorist.example/")
                b.add_hiring(conn, old, "https://www.oldflorist.example/jobs", ["front_desk"])
                conn.execute("UPDATE businesses SET next_crawl_at='2026-10-24T00:00:00Z' WHERE id=?", (old,))
                moved = db.add_review(conn, kind="website_moved", business_id=old, field="website",
                                      proposed="https://www.newflorist.example/",
                                      detail="home page redirected to another domain")
                other = b.add_business(conn, "Sample Bakery", public_id="lv-test00012", street="300 Sample St")
                b.add_record(conn, other, key="12345678901:00012")
                conn.execute("UPDATE businesses SET website='https://www.bakery.example/',"
                             " website_domain='bakery.example', next_crawl_at='2026-10-24T00:00:00Z' WHERE id=?",
                             (other,))
                identity = db.add_review(conn, kind="website_identity", business_id=other, field="website",
                                         detail="name not found on the site",
                                         source_url="https://www.bakery.example/")
        finally:
            conn.close()

        self.assertEqual(self.lva("review", "accept", str(moved), "--actor", "Tester").returncode, 0)
        self.assertEqual(self.lva("review", "accept", str(identity), "--actor", "Tester").returncode, 0)
        conn = self.conn()
        try:
            florist = conn.execute("SELECT website, website_domain, website_status, next_crawl_at"
                                   " FROM businesses WHERE id=?", (old,)).fetchone()
            site_facts = conn.execute("SELECT COUNT(*) FROM facts WHERE business_id=? AND source_id='website'",
                                      (old,)).fetchone()[0]
            hiring = conn.execute("SELECT active FROM hiring_signals WHERE business_id=?", (old,)).fetchone()[0]
            bakery_next = conn.execute("SELECT next_crawl_at FROM businesses WHERE id=?", (other,)).fetchone()[0]
            decided = [r[0] for r in conn.execute("SELECT status FROM review_queue ORDER BY id")]
        finally:
            conn.close()
        self.assertEqual(tuple(florist), ("https://www.newflorist.example/", "newflorist.example", "unknown", None))
        self.assertEqual(site_facts, 0)  # the old site's facts no longer describe this business
        self.assertEqual(hiring, 0)
        self.assertIsNone(bakery_next)  # re-read on the next loop instead of in a month
        self.assertEqual(decided, ["accepted", "accepted"])


class RunCommand(CliTestBase):
    def start(self, env=None):
        proc = subprocess.Popen(
            [sys.executable, "-m", "longview_archive", "run"], cwd=str(ROOT), env=env or self.env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        self.addCleanup(self._kill, proc)
        return proc

    @staticmethod
    def _kill(proc):
        if proc.poll() is None:
            proc.kill()
            proc.wait(10)
        for stream in (proc.stdout, proc.stderr):
            if stream:
                stream.close()

    def stop(self, proc):
        started = time.monotonic()
        proc.send_signal(signal.SIGTERM)
        out, err = proc.communicate(timeout=30)
        self.assertLess(time.monotonic() - started, 30)
        self.assertEqual(proc.returncode, 0, err)
        self.assertNotIn("Traceback", err)
        return err

    def test_run_writes_status_and_stops_cleanly_on_sigterm(self):
        proc = self.start()
        self.assertTrue(self.wait_for(lambda: (self.data / "www" / "status.json").exists()), "no status page")
        crawl = self.lva("crawl-once")  # the running service holds the crawl lock
        self.assertEqual(crawl.returncode, 1)
        self.assertIn("service is running", crawl.stderr)
        err = self.stop(proc)
        self.assertEqual(self.status_json()["state"], "stopping")
        self.assertIn("INFO longview_archive starting", err)
        self.assertIn("INFO longview_archive stopped", err)
        for line in err.splitlines():
            self.assertRegex(line, r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL) longview_archive[\w.]* ")

    def test_run_with_pause_reports_paused_and_does_no_network_work(self):
        self.data.mkdir(parents=True)
        (self.data / "PAUSE").touch()
        proc = self.start()
        self.assertTrue(self.wait_for(lambda: self.status_json()["state"] == "paused"), "never paused")
        err = self.stop(proc)
        self.assertIn("paused", err)
        conn = self.conn()
        try:
            syncs = conn.execute("SELECT COUNT(*) FROM runs WHERE kind LIKE 'sync_%'").fetchone()[0]
            publishes = conn.execute("SELECT COUNT(*) FROM runs WHERE kind='publish'").fetchone()[0]
        finally:
            conn.close()
        self.assertEqual((syncs, publishes), (0, 0))
        self.assertEqual(self.status_json()["state"], "stopping")


class Documentation(unittest.TestCase):
    """Every ``lva ...`` command the README shows parses (in process; nothing runs)."""

    def test_readme_commands_parse(self):
        text = README.read_text(encoding="utf-8")
        found = set()
        for raw in re.findall(r"\blva ([a-z][^`\n|]*)", text):
            words = shlex.split(raw.replace("<id>", "7"))
            if words and words[0] in ("()", "{"):
                continue
            found.add(tuple(words))
        commands = {words[0] for words in found}
        self.assertGreaterEqual(commands, {"check", "status", "sync", "match", "crawl-once", "backup", "migrate",
                                           "publish", "suppress", "review"})
        parser = cli.build_parser()
        for words in sorted(found):
            with self.subTest(command=" ".join(words)):
                if "--help" in words:
                    with self.assertRaises(SystemExit) as ctx, contextlib.redirect_stdout(io.StringIO()):
                        parser.parse_args(list(words))
                    self.assertEqual(ctx.exception.code, 0)
                else:
                    args = parser.parse_args(list(words))
                    self.assertTrue(callable(args.handler))

    def test_cgroup_report_reads_the_service_caps(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "cgroup"
            unit = root / "system.slice" / cli.SERVICE_UNIT
            unit.mkdir(parents=True)
            (unit / "memory.max").write_text("734003200\n")
            (unit / "cpu.max").write_text("50000 100000\n")
            proc_file = Path(tmp) / "proc-cgroup"
            proc_file.write_text(f"0::/system.slice/{cli.SERVICE_UNIT}\n")
            info = cli.service_cgroup_info(proc_file, root)
            self.assertEqual((info["under_service"], info["memory_max"], info["cpu_max"]),
                             (True, "700 MB", "50% of one CPU"))
            proc_file.write_text("0::/user.slice/session-3.scope\n")
            info = cli.service_cgroup_info(proc_file, root)
            self.assertFalse(info["under_service"])
            self.assertEqual(info["memory_max"], "700 MB")  # read from the service's own cgroup
            info = cli.service_cgroup_info(proc_file, Path(tmp) / "missing")
            self.assertEqual((info["memory_max"], info["cgroup"]), (None, None))


if __name__ == "__main__":
    unittest.main()

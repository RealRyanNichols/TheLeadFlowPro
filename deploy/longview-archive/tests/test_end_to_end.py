"""The whole engine, end to end, against the fixture internet in tests/fixtures/e2e/.

Open-data syncs (fake Socrata, Overpass, and NPI transports) -> matching ->
due/visit/apply until nothing is due (PoliteFetcher over fake websites, with
the real 20-second spacing on a fake clock) -> publish -> status. Then the
export is checked against every privacy and provenance rule, run twice for
determinism, and handed to the website's own validator
(lib/longviewDirectory/validate.ts) through node. All data is fictional and
nothing touches the network.

    cd deploy/longview-archive && python3 -m unittest tests.test_end_to_end -v
"""

from __future__ import annotations

import contextlib
import io
import json
import logging
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.parse import urlsplit

from longview_archive import db, normalize, publish
from tests.fixtures.e2e import pipeline

REPO_ROOT = Path(__file__).resolve().parents[3]
VALIDATOR = REPO_ROOT / "lib" / "longviewDirectory" / "validate.ts"
REGISTER = REPO_ROOT / "scripts" / "register-ts.mjs"
RUN_DATE = "2026-09-24"  # START is 13:00 UTC, 08:00 in Longview

EXPECTED_SLUGS = [
    "example-auto-glass", "example-barber-shop", "example-family-dental", "example-florist",
    "example-insurance-agency", "example-lawn-care", "example-pawn-and-jewelry", "example-taqueria",
    "example-tire-and-lube", "example-tire-and-lube-sample-ave",
]
WEBSITE_ONLY = {"website", "phone", "email", "hours", "facebook", "instagram", "careers", "services"}
FIXTURE_NAMES = (
    "Example Taqueria", "Example Tire", "John Q Public", "Example Lawn Care", "Example Feed",
    "Example Storage", "Example Barber", "Example Bakery", "Example Auto Glass", "Example Florist",
    "Example Pawn", "Example Insurance", "Example Family Dental", "Example Coffee Cart",
)


class _Capture(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.DEBUG)
        self.lines = []

    def emit(self, record):
        self.lines.append(self.format(record))


def run_captured(data_dir: Path):
    """Run the pipeline with every engine log line captured (and kept off the console)."""
    logger = logging.getLogger("longview_archive")
    handler = _Capture()
    old_level, old_propagate = logger.level, logger.propagate
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    try:
        run = pipeline.run_pipeline(data_dir)
    finally:
        logger.removeHandler(handler)
        logger.setLevel(old_level)
        logger.propagate = old_propagate
    return run, "\n".join(handler.lines)


def without_batch_stamp(text: str) -> str:
    return re.sub(r'^  "(?:generatedAt|batchId)": .*\n', "", text, flags=re.M)


class EndToEndTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="lva-e2e-")
        cls.pipe, cls.log_text = run_captured(Path(cls.tmp.name) / "first")
        cls.conn = cls.pipe.conn
        cls.export = cls.pipe.export()
        cls.by_slug = {b["slug"]: b for b in cls.export["businesses"]}

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()
        cls.tmp.cleanup()

    def business(self, name, street_norm=None):
        return self.conn.execute("SELECT * FROM businesses WHERE id=?",
                                 (pipeline.business_id(self.conn, name, street_norm),)).fetchone()

    def exported_ids(self):
        return {b["id"] for b in self.export["businesses"]}

    # ------------------------------------------------------------ the pipeline ran as intended

    def test_sources_synced_and_matched(self):
        counts = self.pipe.sync_counts
        self.assertEqual(counts["tx_sales_tax"]["status"], "ok")
        self.assertEqual(counts["tx_sales_tax"]["dataset_id"], "lvex-0001")  # not the decoy
        self.assertEqual(counts["tx_sales_tax"]["skipped_city"], 1)
        self.assertEqual(counts["tx_tabc"]["status"], "skipped")
        self.assertEqual(counts["npi"]["status"], "ok")
        self.assertEqual(counts["osm"]["status"], "ok")
        self.assertEqual(sum(c["review"] for c in self.pipe.match_counts), 0)
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM source_records WHERE match_state IN ('new','review')").fetchone()[0], 0)

    def test_crawl_drained_and_every_visit_was_polite(self):
        self.assertEqual(self.pipe.visits, 8)
        self.assertEqual(sorted(self.pipe.outcomes.values()),
                         ["blocked", "moved", "ok", "ok", "ok", "ok", "ok", "ok"])
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM businesses WHERE website IS NOT NULL AND next_crawl_at IS NULL"
            " AND publish_state != 'suppressed'").fetchone()[0], 0)
        by_host = {}
        for t, url in self.pipe.web.timeline:
            by_host.setdefault(urlsplit(url).hostname, []).append((t, url))
        for host, hits in by_host.items():
            self.assertTrue(hits[0][1].endswith("/robots.txt"), host)
            times = [t for t, _ in hits]
            self.assertTrue(all(b - a >= 20.0 for a, b in zip(times, times[1:])), host)
            self.assertLessEqual(len([u for _, u in hits if not u.endswith("/robots.txt")]), 6, host)
        self.assertNotIn("https://www.barbershop.example/contact", self.pipe.web.requests)

    # ------------------------------------------------------------ counts

    def test_export_counts(self):
        self.assertEqual(self.export["counts"],
                         {"published": 10, "inArchive": 13, "heldForPrivacy": 1, "needsReview": 1})
        self.assertEqual(sorted(self.by_slug), EXPECTED_SLUGS)
        self.assertEqual(len(self.export["businesses"]), 10)
        self.assertEqual([b["slug"] for b in self.export["businesses"]], EXPECTED_SLUGS)  # ordered by slug
        self.assertEqual([(c["slug"], c["count"]) for c in self.export["categories"]], [
            ("restaurants", 1), ("auto", 3), ("health-dental", 1), ("beauty", 1), ("home-services", 1),
            ("retail", 1), ("professional", 2)])
        self.assertEqual([s["id"] for s in self.export["sources"]], ["tx_sales_tax", "npi"])
        self.assertIs(self.export["sample"], False)
        self.assertIs(self.export["indexable"], False)
        for key in ("ready", "review", "held", "suppressed"):
            self.assertEqual(self.pipe.publish_counts[key], {"ready": 10, "review": 1, "held": 3, "suppressed": 1}[key])

    # ------------------------------------------------------------ privacy outcomes

    def test_sole_proprietor_under_his_own_name_is_held(self):
        row = self.business("John Q Public")
        self.assertEqual((row["publish_state"], row["publish_reason"]), ("held", "personal_name_no_presence"))
        self.assertNotIn(row["public_id"], self.exported_ids())

    def test_individual_with_trade_name_shows_longview_only(self):
        lawn = self.by_slug["example-lawn-care"]
        self.assertEqual(lawn["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})
        self.assertNotIn("address", {f["field"] for f in lawn["facts"]})
        self.assertIsNone(lawn["website"])

    def test_llc_restaurant_with_storefront_naics_shows_street(self):
        taq = self.by_slug["example-taqueria"]
        self.assertEqual(taq["address"], {"street": "100 Example St", "city": "Longview", "state": "TX",
                                          "zip": "75601"})

    def test_outside_city_limits_and_other_zip_are_nearby_and_unpublished(self):
        for name in ("Example Feed & Supply", "Example Storage"):
            row = self.business(name)
            self.assertEqual((row["scope"], row["publish_state"], row["publish_reason"]),
                             ("nearby", "held", "out_of_scope"), name)
            self.assertNotIn(row["public_id"], self.exported_ids())
        self.assertEqual(self.business("Example Storage")["zip"], "75606")
        self.assertEqual(self.pipe.sync_counts["tx_sales_tax"]["other_zips"], {"75606": 1})

    def test_chain_outlets_are_two_profiles(self):
        a, b = self.by_slug["example-tire-and-lube"], self.by_slug["example-tire-and-lube-sample-ave"]
        self.assertNotEqual(a["id"], b["id"])
        self.assertEqual((a["address"]["street"], b["address"]["street"]), ("500 Example St", "900 Sample Ave"))
        self.assertEqual(a["name"], b["name"])
        self.assertIsNotNone(a["website"])
        self.assertIsNone(b["website"])  # the site belongs to the outlet OpenStreetMap placed it at

    def test_duplicate_outlet_row_is_merged(self):
        barber = self.business("Example Barber Shop")
        records = self.conn.execute(
            "SELECT source_id, name FROM source_records WHERE business_id=? ORDER BY id", (barber["id"],)).fetchall()
        self.assertEqual(sorted(r["source_id"] for r in records), ["osm", "tx_sales_tax", "tx_sales_tax"])
        rules = {r["rule"] for r in self.conn.execute("SELECT rule FROM merges WHERE business_id=?", (barber["id"],))}
        self.assertEqual(rules, {"same_address_similar_name"})
        self.assertEqual(len([s for s in self.by_slug if "barber" in s]), 1)
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM businesses WHERE name LIKE 'Example Barber%'").fetchone()[0], 1)

    def test_suppressed_business_is_absent_and_never_crawled(self):
        bakery = self.business("Example Bakery")
        self.assertEqual(bakery["public_id"], self.pipe.suppressed_id)
        self.assertEqual(bakery["publish_state"], "suppressed")
        self.assertNotIn(bakery["public_id"], self.exported_ids())
        self.assertFalse(any("bakery.example" in u for u in self.pipe.web.requests))
        self.assertIsNone(bakery["last_crawled_at"])

    def test_npi_dental_practice_under_its_dba_name(self):
        dental = self.by_slug["example-family-dental"]
        self.assertEqual(dental["name"], "Example Family Dental")
        self.assertEqual(dental["category"], "health-dental")
        self.assertEqual(dental["address"]["street"], "700 Sample Ave Ste 200")
        name_fact = next(f for f in dental["facts"] if f["field"] == "name")
        self.assertEqual(name_fact["source"], "npi")
        self.assertEqual(dental["phone"], {"e164": "+19035550170", "display": "(903) 555-0170"})
        self.assertEqual(dental["careersUrl"], "https://www.examplefamilydental.example/careers")
        self.assertEqual(dental["hiringRoles"], ["front_desk", "receptionist"])
        self.assertEqual(dental["email"], "info@examplefamilydental.example")
        self.assertIsNone(dental["permitSince"])

    def test_osm_only_place_waits_for_review(self):
        cart = self.business("Example Coffee Cart")
        self.assertEqual((cart["publish_state"], cart["publish_reason"]), ("review", "osm_only_needs_primary_source"))
        self.assertNotIn(cart["public_id"], self.exported_ids())

    # ------------------------------------------------------------ website outcomes

    def test_website_outcomes(self):
        florist = self.business("Example Florist")
        self.assertEqual(florist["website_status"], "moved")
        self.assertIsNone(self.by_slug["example-florist"]["website"])  # never verified, never shown
        pawn = self.business("Example Pawn & Jewelry")
        self.assertEqual(pawn["website_status"], "blocked")
        self.assertIsNone(self.by_slug["example-pawn-and-jewelry"]["website"])

        glass = self.by_slug["example-auto-glass"]
        self.assertIsNone(glass["hours"])
        self.assertEqual(glass["phone"]["e164"], "+19035550120")

        insurance = self.by_slug["example-insurance-agency"]
        self.assertIsNone(insurance["phone"])
        self.assertEqual(insurance["website"], {"url": "https://www.insurance.example/", "status": "ok"})

        taq = self.by_slug["example-taqueria"]
        self.assertEqual(taq["social"], {"facebook": "https://www.facebook.com/exampletaqueria", "instagram": None})
        self.assertEqual(taq["hours"]["fri"], [["11:00", "22:00"]])
        self.assertNotIn("sun", taq["hours"])  # not stated is not "closed"
        self.assertEqual(taq["email"], "info@taqueria.example")

        tire = self.by_slug["example-tire-and-lube"]
        self.assertEqual(tire["hours"]["sun"], [])
        self.assertEqual(tire["email"], "info@exampletire.example")
        self.assertIn("oil change", tire["services"])

        open_reviews = {(r["kind"], r["field"]) for r in self.conn.execute(
            "SELECT kind, field FROM review_queue WHERE status='open'")}
        self.assertEqual(open_reviews, {("website_moved", "website"), ("ambiguous_ampm", "hours"),
                                        ("phone_out_of_area", "phone"), ("social_mismatch", "instagram")})

    def test_facts_provenance(self):
        dataset_url = "https://data.texas.example/d/lvex-0001"
        for biz in self.export["businesses"]:
            facts = biz["facts"]
            fields = [f["field"] for f in facts]
            self.assertEqual(len(fields), len(set(fields)), biz["slug"])
            site_host = urlsplit(biz["website"]["url"]).hostname if biz["website"] else None
            for fact in facts:
                self.assertEqual(fact["checkedAt"], RUN_DATE, (biz["slug"], fact))
                if fact["field"] in WEBSITE_ONLY:
                    self.assertEqual(fact["source"], "website", (biz["slug"], fact))
                if fact["source"] == "website":
                    self.assertEqual(urlsplit(fact["url"]).hostname, site_host, (biz["slug"], fact))
                elif fact["source"] == "tx_sales_tax":
                    self.assertEqual(fact["url"], dataset_url)
                else:
                    self.assertEqual(fact["source"], "npi")
            for field in ("name", "category"):
                self.assertIn(field, fields, biz["slug"])
            if biz["permitSince"]:
                self.assertEqual(next(f for f in facts if f["field"] == "permitSince")["source"], "tx_sales_tax")
            self.assertEqual(biz["updatedAt"], RUN_DATE)
        for source in self.export["sources"]:
            self.assertEqual(source["lastSyncedAt"], RUN_DATE)
        tire = self.by_slug["example-tire-and-lube"]
        by_field = {f["field"]: f for f in tire["facts"]}
        self.assertEqual(by_field["hours"]["url"], "https://www.exampletire.example/hours")
        self.assertEqual(by_field["email"]["url"], "https://www.exampletire.example/contact")
        self.assertEqual(by_field["address"], {"field": "address", "source": "website",
                                               "url": "https://www.exampletire.example/locations",
                                               "checkedAt": RUN_DATE})

    # ------------------------------------------------------------ nothing private leaves

    def private_texts(self):
        www = self.pipe.settings.www_dir
        return {
            "export": self.pipe.export_path.read_text(encoding="utf-8"),
            "status.json": (www / "status.json").read_text(encoding="utf-8"),
            "status page": (www / "status" / "index.html").read_text(encoding="utf-8"),
            "logs": self.log_text,
        }

    def test_no_taxpayer_or_person_data_anywhere(self):
        for label, text in self.private_texts().items():
            upper = text.upper()
            for name in pipeline.TAXPAYER_NAMES:
                self.assertNotIn(name.upper(), upper, (label, name))
            for number in pipeline.TAXPAYER_NUMBERS:
                self.assertNotIn(number, text, (label, number))
            for person in pipeline.PERSON_NAMES:
                self.assertNotIn(person.upper(), upper, (label, person))
            for word in pipeline.NPI_OFFICIAL:
                self.assertIsNone(re.search(rf"\b{word}\b", upper), (label, word))
            for email in pipeline.PRIVATE_EMAILS:
                self.assertNotIn(email, text, (label, email))

    def test_status_and_logs_carry_no_business_details(self):
        texts = self.private_texts()
        for label in ("status.json", "status page", "logs"):
            text = texts[label]
            for name in FIXTURE_NAMES:
                self.assertNotIn(name, text, (label, name))
            self.assertNotIn("555-01", text, label)
            self.assertNotIn("+1903555", text, label)
            self.assertNotIn("@", text.replace("@media", ""), label)
            self.assertNotIn("Example St", text, label)

    def test_status_counts_match_the_database(self):
        data = self.pipe.status_json()
        states = {r["publish_state"]: r["n"] for r in self.conn.execute(
            "SELECT publish_state, COUNT(*) AS n FROM businesses GROUP BY publish_state")}
        for state in ("ready", "review", "held", "suppressed", "pending"):
            self.assertEqual(data["publish"][state], states.get(state, 0), state)
        fact_counts = {r["field"]: r["n"] for r in self.conn.execute(
            "SELECT field, COUNT(*) AS n FROM facts GROUP BY field")}
        for field, count in data["factsVerified"].items():
            self.assertEqual(count, fact_counts.get(field, 0), field)
        reviews = {r["kind"]: r["n"] for r in self.conn.execute(
            "SELECT kind, COUNT(*) AS n FROM review_queue WHERE status='open' GROUP BY kind")}
        self.assertEqual(data["reviewOpen"], reviews)
        one = lambda sql: self.conn.execute(sql).fetchone()[0]  # noqa: E731
        self.assertEqual(data["archive"]["businesses"], one("SELECT COUNT(*) FROM businesses WHERE active=1"))
        self.assertEqual(data["archive"]["inCity"], one(
            "SELECT COUNT(*) FROM businesses WHERE active=1 AND scope='city'"))
        self.assertEqual(data["archive"]["inCity"], self.export["counts"]["inArchive"])
        for status in ("ok", "moved", "blocked", "dead"):
            self.assertEqual(data["crawl"][status], one(
                f"SELECT COUNT(*) FROM businesses WHERE active=1 AND website_status='{status}'"), status)
        self.assertEqual(data["crawl"]["due"], 0)
        self.assertEqual(data["hiringSignals"], one("SELECT COUNT(*) FROM hiring_signals WHERE active=1"))
        self.assertEqual(data["lastExportAt"], self.export["generatedAt"])
        self.assertEqual(data["state"], "running")

    # ------------------------------------------------------------ determinism and the site's validator

    def test_run_twice_from_scratch_gives_the_same_export(self):
        second, _ = run_captured(Path(self.tmp.name) / "second")
        try:
            first_text = self.pipe.export_path.read_text(encoding="utf-8")
            second_text = second.export_path.read_text(encoding="utf-8")
        finally:
            second.conn.close()
        self.assertEqual(without_batch_stamp(first_text), without_batch_stamp(second_text))
        self.assertNotIn('"generatedAt"', without_batch_stamp(first_text))

    def test_site_validator_accepts_the_export(self):
        node = shutil.which("node")
        if node is None:
            self.skipTest("node is not installed; the site validator (validate.ts) was not run")
        if not VALIDATOR.exists() or not REGISTER.exists():
            self.skipTest("lib/longviewDirectory/validate.ts or scripts/register-ts.mjs is missing")
        with tempfile.TemporaryDirectory(prefix="lva-validate-") as tmp:
            script = Path(tmp) / "validate_export.ts"
            script.write_text(
                'import { readFileSync } from "node:fs";\n'
                f'import {{ validateDirectory }} from {json.dumps(VALIDATOR.as_uri())};\n'
                "const raw: unknown = JSON.parse(readFileSync(process.argv[2], \"utf8\"));\n"
                "const result = validateDirectory(raw);\n"
                "console.log(JSON.stringify({ dropped: result.dropped, issues: result.issues,"
                " published: result.directory.businesses.length }));\n",
                encoding="utf-8",
            )
            proc = subprocess.run(
                [node, "--experimental-strip-types", "--no-warnings", "--import", "./scripts/register-ts.mjs",
                 str(script), str(self.pipe.export_path)],
                cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=120,
            )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        report = json.loads(proc.stdout.strip().splitlines()[-1])
        self.assertEqual(report["dropped"], [])
        self.assertEqual(report["issues"], [])
        self.assertEqual(report["published"], 10)

    def test_export_round_trips_through_diff(self):
        diff = publish.diff_exports(self.export, json.loads(json.dumps(self.export)))
        self.assertEqual(diff, {"added": [], "removed": [], "changed": []})
        self.assertEqual(self.pipe.publish_counts["added"], 10)
        self.assertEqual(db.get_meta(self.conn, "last_export_at"), self.export["generatedAt"])
        for biz in self.export["businesses"]:
            if biz["email"]:
                self.assertEqual(normalize.registrable_domain(biz["email"].split("@")[1]),
                                 normalize.registrable_domain(biz["website"]["url"]))


class SampleDirectoryTest(unittest.TestCase):
    """tests/make_sample_directory.py writes a sample export and never into the committed folder."""

    def test_writes_a_sample_and_refuses_the_committed_folder(self):
        from tests import make_sample_directory as sample

        with tempfile.TemporaryDirectory(prefix="lva-sample-test-") as tmp:
            out = Path(tmp) / "sample.json"
            with contextlib.redirect_stdout(io.StringIO()) as printed, \
                    self.assertLogs("longview_archive", level="WARNING"):  # the TABC skip note
                self.assertEqual(sample.main([str(out)]), 0)
            self.assertIn("sample: true", printed.getvalue())
            data = json.loads(out.read_text(encoding="utf-8"))
            self.assertIs(data["sample"], True)
            self.assertEqual(data["counts"]["published"], 10)

            committed = REPO_ROOT / "content" / "longview-directory" / "directory.json"
            before = committed.read_bytes() if committed.exists() else None
            proc = subprocess.run(
                [sys.executable, "tests/make_sample_directory.py", str(committed)],
                cwd=str(Path(__file__).resolve().parents[1]), capture_output=True, text=True, timeout=120,
            )
            self.assertEqual(proc.returncode, 2)
            self.assertIn("refusing", proc.stderr)
            self.assertEqual(committed.read_bytes() if committed.exists() else None, before)
            self.assertTrue(sample.inside_committed_directory(Path(tmp) / "content" / "longview-directory" / "a.json"))
            self.assertFalse(sample.inside_committed_directory(out))


if __name__ == "__main__":
    unittest.main()

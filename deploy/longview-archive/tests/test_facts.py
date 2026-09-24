import json
import unittest

from longview_archive import db, facts
from tests.fixtures import builders as b

T1 = "2026-09-20T15:00:00Z"
T2 = "2026-09-24T15:00:00Z"
SITE = "https://www.exampletire.example/contact"


def fact_row(conn, bid, field):
    return conn.execute("SELECT * FROM facts WHERE business_id=? AND field=?", (bid, field)).fetchone()


def open_reviews(conn, bid):
    return conn.execute(
        "SELECT * FROM review_queue WHERE business_id=? AND status='open' ORDER BY id", (bid,)
    ).fetchall()


class ObserveRules(unittest.TestCase):
    def setUp(self):
        self.conn = b.make_db()
        self.bid = b.add_business(self.conn)

    def observe(self, field, value, confidence=0.95, at=T1, url=SITE, method="tel_link", **kw):
        return facts.observe(self.conn, self.bid, field, value, "website", url, method, confidence,
                             observed_at=at, **kw)

    def test_first_value_accepted(self):
        self.assertEqual(self.observe("phone", "+19035550100"), "accepted")
        row = fact_row(self.conn, self.bid, "phone")
        self.assertEqual(json.loads(row["value_json"]), "+19035550100")
        self.assertEqual(row["source_id"], "website")
        self.assertEqual(row["source_url"], SITE)
        self.assertEqual(row["accepted_by"], "rules")
        self.assertEqual((row["first_observed_at"], row["checked_at"]), (T1, T1))

    def test_same_value_confirmed_and_checked_at_bumped(self):
        self.observe("phone", "+19035550100", confidence=0.8, method="text")
        # The same number written differently is the same value.
        self.assertEqual(
            self.observe("phone", "+19035550100", confidence=0.95, at=T2,
                         url="https://www.exampletire.example/", method="tel_link"),
            "confirmed",
        )
        row = fact_row(self.conn, self.bid, "phone")
        self.assertEqual(row["checked_at"], T2)
        self.assertEqual(row["first_observed_at"], T1)
        # Higher confidence: provenance moves to the better observation.
        self.assertEqual(row["source_url"], "https://www.exampletire.example/")
        self.assertEqual(row["method"], "tel_link")
        # Lower confidence later: checked_at moves, provenance stays.
        self.assertEqual(self.observe("phone", "+19035550100", confidence=0.8, at="2026-09-25T15:00:00Z",
                                      url="https://www.exampletire.example/about", method="text"), "confirmed")
        row = fact_row(self.conn, self.bid, "phone")
        self.assertEqual(row["checked_at"], "2026-09-25T15:00:00Z")
        self.assertEqual(row["source_url"], "https://www.exampletire.example/")
        self.assertEqual(open_reviews(self.conn, self.bid), [])

    def test_canonical_comparisons(self):
        self.assertEqual(self.observe("email", "Info@ExampleTire.example"), "accepted")
        self.assertEqual(self.observe("email", "info@exampletire.example", at=T2), "confirmed")
        self.assertEqual(self.observe("website", "HTTPS://WWW.ExampleTire.example?utm_source=x"), "accepted")
        self.assertEqual(self.observe("website", "https://www.exampletire.example/", at=T2), "confirmed")
        hours = {"tue": [["08:00", "17:30"]], "mon": [["13:00", "17:00"], ["08:00", "12:00"]]}
        self.assertEqual(self.observe("hours", hours), "accepted")
        same = {"mon": [["08:00", "12:00"], ["13:00", "17:00"]], "tue": [["08:00", "17:30"]]}
        self.assertEqual(self.observe("hours", same, at=T2), "confirmed")
        self.assertEqual(self.observe("services", ["oil change", "brake repair", "oil change"]), "accepted")
        self.assertEqual(self.observe("services", ["brake repair", "oil change"], at=T2), "confirmed")
        self.assertEqual(json.loads(fact_row(self.conn, self.bid, "services")["value_json"]),
                         ["brake repair", "oil change"])
        self.assertEqual(self.observe("address_listed", True), "accepted")
        self.assertEqual(self.observe("name_on_site", "  Example   Tire & Lube "), "accepted")
        self.assertEqual(json.loads(fact_row(self.conn, self.bid, "name_on_site")["value_json"]),
                         "Example Tire & Lube")

    def test_different_value_goes_to_review_and_fact_unchanged(self):
        self.observe("phone", "+19035550100")
        before = dict(fact_row(self.conn, self.bid, "phone"))
        self.assertEqual(self.observe("phone", "+19035550101", at=T2), "review")
        self.assertEqual(dict(fact_row(self.conn, self.bid, "phone")), before)
        items = open_reviews(self.conn, self.bid)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["kind"], "field_conflict")
        self.assertEqual(items[0]["field"], "phone")
        self.assertEqual(json.loads(items[0]["proposed_json"]), "+19035550101")
        self.assertEqual(json.loads(items[0]["current_json"]), "+19035550100")
        # Seeing the same conflicting value again does not queue it twice.
        self.assertEqual(self.observe("phone", "+19035550101", at="2026-09-25T15:00:00Z"), "review")
        self.assertEqual(len(open_reviews(self.conn, self.bid)), 1)

    def test_low_confidence_goes_to_review(self):
        self.assertEqual(self.observe("phone", "+19035550100", confidence=0.6, method="text"), "review")
        self.assertIsNone(fact_row(self.conn, self.bid, "phone"))
        items = open_reviews(self.conn, self.bid)
        self.assertEqual([i["kind"] for i in items], ["low_confidence"])
        self.assertIsNone(items[0]["current_json"])

    def test_flagged_goes_to_review_with_that_kind(self):
        self.assertEqual(
            self.observe("phone", "+12145550100", flagged="phone_out_of_area"), "review")
        self.assertEqual(self.observe("facebook", "https://www.facebook.com/someoneelse.example",
                                      flagged="social_mismatch"), "review")
        self.assertIsNone(fact_row(self.conn, self.bid, "phone"))
        self.assertIsNone(fact_row(self.conn, self.bid, "facebook"))
        kinds = sorted(i["kind"] for i in open_reviews(self.conn, self.bid))
        self.assertEqual(kinds, ["phone_out_of_area", "social_mismatch"])

    def test_empty_values_rejected(self):
        for field, value in (("phone", None), ("phone", ""), ("phone", "12"), ("email", ""),
                             ("website", "mailto:info@exampletire.example"), ("hours", {}),
                             ("hours", {"mon": [["8", "5"]]}), ("services", []), ("name_on_site", "  ")):
            with self.subTest(field=field, value=value):
                self.assertEqual(self.observe(field, value), "rejected")
        with self.assertLogs("longview_archive.facts", "WARNING"):
            self.assertEqual(self.observe("not_a_field", "x"), "rejected")
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM observations").fetchone()[0], 0)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM review_queue").fetchone()[0], 0)

    def test_services_new_tags_go_to_review(self):
        self.observe("services", ["brake repair", "oil change"])
        self.assertEqual(self.observe("services", ["brake repair", "oil change", "tire rotation"], at=T2), "review")
        self.assertEqual(json.loads(fact_row(self.conn, self.bid, "services")["value_json"]),
                         ["brake repair", "oil change"])
        item = open_reviews(self.conn, self.bid)[0]
        self.assertEqual(item["kind"], "field_conflict")
        self.assertEqual(json.loads(item["proposed_json"]), ["brake repair", "oil change", "tire rotation"])

    def test_observation_upsert_dedupes(self):
        self.observe("phone", "+19035550100", confidence=0.8, method="text")
        self.observe("phone", "+19035550100", at=T2)
        rows = self.conn.execute("SELECT * FROM observations WHERE field='phone'").fetchall()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["first_observed_at"], T1)
        self.assertEqual(rows[0]["last_observed_at"], T2)
        self.assertEqual(rows[0]["confidence"], 0.95)
        self.assertEqual(rows[0]["value_hash"], db.value_hash("+19035550100"))
        # A different page is a separate observation of the same value.
        self.observe("phone", "+19035550100", url="https://www.exampletire.example/", at=T2)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM observations").fetchone()[0], 2)

    def test_raw_phone_text_is_parsed_strictly(self):
        # 555-01xx is fiction: only an extractor running with the test flag
        # hands it over, already in E.164. Raw text gets the strict parser.
        self.assertEqual(self.observe("phone", "(903) 555-0100"), "rejected")
        self.assertEqual(self.observe("phone", "+19035550100"), "accepted")


class HumanReview(unittest.TestCase):
    def setUp(self):
        self.conn = b.make_db()
        self.bid = b.add_business(self.conn)
        facts.observe(self.conn, self.bid, "phone", "+19035550100", "website", SITE, "tel_link", 0.95, T1)
        facts.observe(self.conn, self.bid, "phone", "+19035550101", "website",
                      "https://www.exampletire.example/", "text", 0.8, T2)
        self.item = open_reviews(self.conn, self.bid)[0]

    def test_accept_review_replaces_the_fact_and_records_the_actor(self):
        result = facts.accept_review(self.conn, self.item["id"], "owner", now="2026-09-26T12:00:00Z")
        self.assertTrue(result["fact_written"])
        row = fact_row(self.conn, self.bid, "phone")
        self.assertEqual(json.loads(row["value_json"]), "+19035550101")
        self.assertEqual(row["accepted_by"], "owner")
        self.assertEqual(row["source_url"], "https://www.exampletire.example/")
        self.assertEqual(row["method"], "text")
        self.assertEqual(row["checked_at"], T2)
        item = self.conn.execute("SELECT * FROM review_queue WHERE id=?", (self.item["id"],)).fetchone()
        self.assertEqual(item["status"], "accepted")
        self.assertEqual(item["resolved_by"], "owner")
        self.assertEqual(item["resolved_at"], "2026-09-26T12:00:00Z")
        # The accepted value now confirms instead of conflicting.
        self.assertEqual(facts.observe(self.conn, self.bid, "phone", "+19035550101", "website",
                                       "https://www.exampletire.example/", "text", 0.8,
                                       "2026-09-27T12:00:00Z"), "confirmed")
        with self.assertRaises(ValueError):
            facts.accept_review(self.conn, self.item["id"], "owner")

    def test_reject_review_leaves_the_fact(self):
        before = dict(fact_row(self.conn, self.bid, "phone"))
        result = facts.reject_review(self.conn, self.item["id"], "owner", now="2026-09-26T12:00:00Z")
        self.assertFalse(result["fact_written"])
        self.assertEqual(dict(fact_row(self.conn, self.bid, "phone")), before)
        item = self.conn.execute("SELECT * FROM review_queue WHERE id=?", (self.item["id"],)).fetchone()
        self.assertEqual((item["status"], item["resolved_by"]), ("rejected", "owner"))
        # The rejected value is not queued again.
        facts.observe(self.conn, self.bid, "phone", "+19035550101", "website",
                      "https://www.exampletire.example/", "text", 0.8, "2026-09-27T12:00:00Z")
        self.assertEqual(open_reviews(self.conn, self.bid), [])

    def test_accept_needs_an_actor_and_an_existing_item(self):
        with self.assertRaises(ValueError):
            facts.accept_review(self.conn, self.item["id"], " ")
        with self.assertRaises(ValueError):
            facts.accept_review(self.conn, 9999, "owner")
        with self.assertRaises(ValueError):
            facts.reject_review(self.conn, 9999, "owner")

    def test_accept_without_observation_writes_nothing(self):
        rid = db.add_review(self.conn, kind="social_mismatch", business_id=self.bid, field="facebook",
                            proposed="https://www.facebook.com/exampletire.example")
        with self.assertRaises(ValueError):
            facts.accept_review(self.conn, rid, "owner")
        self.assertIsNone(fact_row(self.conn, self.bid, "facebook"))
        self.assertEqual(
            self.conn.execute("SELECT status FROM review_queue WHERE id=?", (rid,)).fetchone()[0], "open")

    def test_accepting_a_non_field_item_only_marks_it(self):
        rid = db.add_review(self.conn, kind="merge_ambiguous", business_id=self.bid, detail="two records")
        result = facts.accept_review(self.conn, rid, "owner")
        self.assertFalse(result["fact_written"])
        self.assertEqual(
            self.conn.execute("SELECT status FROM review_queue WHERE id=?", (rid,)).fetchone()[0], "accepted")


if __name__ == "__main__":
    unittest.main()

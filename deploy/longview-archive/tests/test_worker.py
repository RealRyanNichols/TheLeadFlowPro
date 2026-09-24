"""Tests for longview_archive/worker.py: choosing sites, visiting them, applying visits.

No network: the PoliteFetcher gets the fixture internet from
tests/fixtures/e2e/ (fictional ``.example`` sites, 555-01xx phones), a
resolver that hands those hosts a public-looking address, and a fake clock
whose sleep returns at once while the real 20-second spacing still applies.

    cd deploy/longview-archive && python3 -m unittest tests.test_worker -v
"""

from __future__ import annotations

import json
import logging
import unittest
from datetime import timedelta
from pathlib import Path

from longview_archive import config, db, facts, normalize, worker
from tests.fixtures import builders as b
from tests.fixtures.e2e.pipeline import START, FakeClock, FakeWeb, make_fetcher

DAY = 86400.0


def make_settings(**overrides) -> config.Settings:
    values = dict(data_dir=Path("/nonexistent/lva-worker-test"), allow_fictional_phones=True)
    values.update(overrides)
    return config.Settings(**values)


def plus_days(iso: str, days: float) -> str:
    return db.now_iso(db.parse_iso(iso) + timedelta(days=days))


class WorkerCase(unittest.TestCase):
    def setUp(self):
        self.conn = b.make_db()
        b.standard_sources(self.conn)
        self.settings = make_settings()
        self.clock = FakeClock(START)
        self.web = FakeWeb(clock=self.clock)
        self.fetcher = make_fetcher(self.settings, self.web, self.clock)

    def tearDown(self):
        self.conn.close()

    def add(self, name: str, site: str | None, **kw) -> int:
        if site is not None:
            kw.setdefault("website", site)
            kw.setdefault("website_domain", normalize.registrable_domain(site))
        bid = b.add_business(self.conn, name, **kw)
        b.add_record(self.conn, bid, "tx_sales_tax")
        return bid

    def row(self, bid: int):
        return self.conn.execute("SELECT * FROM businesses WHERE id=?", (bid,)).fetchone()

    def snap(self, bid: int) -> worker.BusinessSnapshot:
        return worker.snapshot(self.conn, self.row(bid))

    def crawl(self, bid: int):
        snap = self.snap(bid)
        result = worker.visit(snap, self.fetcher, self.settings)
        outcome = worker.apply_visit(self.conn, snap, result, self.settings, self.clock.iso())
        return result, outcome

    def facts_of(self, bid: int) -> dict:
        return {r["field"]: r for r in self.conn.execute("SELECT * FROM facts WHERE business_id=?", (bid,))}

    def value(self, bid: int, field: str):
        row = facts.get_fact(self.conn, bid, field)
        return json.loads(row["value_json"]) if row else None

    def reviews(self, bid: int, kind: str | None = None) -> list:
        sql, params = "SELECT * FROM review_queue WHERE business_id=?", [bid]
        if kind:
            sql += " AND kind=?"
            params.append(kind)
        return self.conn.execute(sql + " ORDER BY id", params).fetchall()

    def later(self, days: float) -> None:
        self.clock.advance(days * DAY)


# ---------------------------------------------------------------- choosing work

class DueBusinessesTest(WorkerCase):
    def test_filters_order_and_one_per_host(self):
        now = self.clock.iso()
        past, future = plus_days(now, -2), plus_days(now, 2)
        older = plus_days(now, -5)
        a = self.add("Example Tire & Lube", "https://www.exampletire.example/")
        c = self.add("Example Barber Shop", "https://www.barbershop.example/", next_crawl_at=past)
        d = self.add("Example Auto Glass", "https://www.autoglass.example/", next_crawl_at=older)
        self.add("Example Future", "https://www.taqueria.example/", next_crawl_at=future)
        self.add("Example No Site", None)
        self.add("Example Inactive", "https://www.insurance.example/", active=0)
        self.add("Example Out", "https://www.bakery.example/", scope="out")
        self.add("Example Held", "https://www.guarded.example/", publish_state="suppressed")
        self.add("Example Removed", "https://www.pancakehouse.example/")
        b.add_suppression(self.conn, "domain", "pancakehouse.example")
        self.add("Example Twin", "https://www.exampletire.example/other-location")  # same host as a
        self.add("Example Busy", "https://www.busy.example/")
        self.conn.execute("INSERT INTO host_state(host, backoff_level, backoff_until) VALUES (?,?,?)",
                          ("www.busy.example", 1, future))
        nearby = self.add("Example Nearby", "https://www.examplefamilydental.example/", scope="nearby",
                          next_crawl_at=now)

        due = worker.due_businesses(self.conn, self.settings, now, 10)
        self.assertEqual([s.id for s in due], [a, d, c, nearby])
        self.assertEqual(len({s.host for s in due}), len(due))
        self.assertEqual([s.id for s in worker.due_businesses(self.conn, self.settings, now, 2)], [a, d])
        self.assertEqual(worker.due_businesses(self.conn, self.settings, now, 0), [])

    def test_snapshot_carries_known_phone_for_identity(self):
        bid = self.add("Example Tire & Lube", "https://www.exampletire.example/")
        self.assertIsNone(self.snap(bid).phone)
        b.add_record(self.conn, bid, "npi", phone="+19035550110")
        self.assertEqual(self.snap(bid).phone, "+19035550110")
        b.add_fact(self.conn, bid, "phone", "+19035550111")
        snap = self.snap(bid)
        self.assertEqual(snap.phone, "+19035550111")
        self.assertEqual(snap.host, "www.exampletire.example")
        self.assertEqual(snap.website_domain, "exampletire.example")
        with self.assertRaises(Exception):
            snap.name = "changed"  # frozen: safe to hand to a worker thread


# ---------------------------------------------------------------- choosing pages

class ChoosePagesTest(unittest.TestCase):
    def test_rank_order(self):
        order = [
            ("https://s.example/contact-us", "Reach us"),
            ("https://s.example/hours", "Hours"),
            ("https://s.example/find-us", "Directions"),
            ("https://s.example/about", "About"),
            ("https://s.example/careers", "Join our team"),
            ("https://s.example/menu", "Menu"),
        ]
        self.assertEqual([worker.link_rank(u, t) for u, t in order], [0, 1, 2, 3, 4, 5])
        self.assertIsNone(worker.link_rank("https://s.example/gallery", "Gallery"))

    def test_skips_media_queries_and_logins(self):
        for url in ("https://s.example/contact.pdf", "https://s.example/about/team.JPG",
                    "https://s.example/services?a=1&b=2", "https://s.example/account/contact",
                    "https://s.example/wp-login.php"):
            self.assertTrue(worker._skippable(url), url)
        self.assertFalse(worker._skippable("https://s.example/services?page=2"))


# ---------------------------------------------------------------- visiting

class VisitTest(WorkerCase):
    def test_full_visit_reads_at_most_six_pages_politely(self):
        bid = self.add("Example Tire & Lube", "https://www.exampletire.example/", street="500 Example St")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        pages = self.web.page_requests("www.exampletire.example")
        self.assertLessEqual(len(pages), self.settings.max_pages_per_visit)
        self.assertEqual(result.pages_fetched, 6)
        base = "https://www.exampletire.example/"
        self.assertEqual(pages, [base, base + "contact", base + "hours", base + "locations", base + "about",
                                 base + "services"])
        for junk in ("coupon.pdf", "shop.jpg", "cart", "specials", "blog", "contact-us", "?"):
            self.assertFalse(any(junk in u for u in pages), junk)
        # robots.txt first, then every request to the host at least 20 s after the previous one.
        times = [t for t, u in self.web.timeline if "exampletire" in u]
        self.assertTrue(self.web.timeline[0][1].endswith("/robots.txt"))
        self.assertTrue(all(b_ - a_ >= 20.0 for a_, b_ in zip(times, times[1:])))
        self.assertTrue(result.complete)

    def test_robots_disallowed_page_is_never_requested(self):
        bid = self.add("Example Barber Shop", "https://www.barbershop.example/", street="210 Fixture Rd",
                       naics="812111")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        pages = self.web.page_requests("www.barbershop.example")
        self.assertNotIn("https://www.barbershop.example/contact", pages)
        self.assertIn("https://www.barbershop.example/services", pages)
        self.assertTrue(result.complete)
        self.assertEqual(self.value(bid, "phone"), "+19035550130")  # not the contact page's number
        self.assertEqual(self.value(bid, "services"), ["beard trim", "haircuts", "hot towel shave", "kids haircuts"])

    def test_facts_come_from_the_website_with_provenance(self):
        bid = self.add("Example Taqueria", "https://www.taqueria.example/", street="100 Example St",
                       naics="722511")
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        rows = self.facts_of(bid)
        self.assertEqual(set(rows), {"website", "phone", "email", "hours", "facebook", "services",
                                     "address_listed"})
        for field, row in rows.items():
            self.assertEqual(row["source_id"], "website", field)
            self.assertTrue(row["source_url"].startswith("https://www.taqueria.example/"), field)
            self.assertGreaterEqual(row["checked_at"], now)
        self.assertEqual(self.value(bid, "website"), "https://www.taqueria.example/")
        self.assertEqual(rows["website"]["method"], "identity")
        self.assertEqual(self.value(bid, "phone"), "+19035550101")
        self.assertEqual(self.value(bid, "email"), "info@taqueria.example")
        self.assertEqual(rows["email"]["source_url"], "https://www.taqueria.example/contact")
        self.assertEqual(self.value(bid, "hours"), {
            "mon": [["11:00", "21:00"]], "tue": [["11:00", "21:00"]], "wed": [["11:00", "21:00"]],
            "thu": [["11:00", "21:00"]], "fri": [["11:00", "22:00"]], "sat": [["11:00", "22:00"]]})
        self.assertEqual(rows["hours"]["method"], "jsonld")
        self.assertEqual(self.value(bid, "facebook"), "https://www.facebook.com/exampletaqueria")
        self.assertIn("tacos", self.value(bid, "services"))
        self.assertIs(self.value(bid, "address_listed"), True)
        row = self.row(bid)
        self.assertEqual(row["website_status"], "ok")
        self.assertEqual(row["crawl_failures"], 0)
        self.assertEqual(row["next_crawl_at"], plus_days(row["last_crawled_at"], self.settings.reverify_days))

    def test_social_mismatch_goes_to_review(self):
        bid = self.add("Example Taqueria", "https://www.taqueria.example/", street="100 Example St")
        self.crawl(bid)
        self.assertIsNone(facts.get_fact(self.conn, bid, "instagram"))
        items = self.reviews(bid, "social_mismatch")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["field"], "instagram")
        self.assertEqual(json.loads(items[0]["proposed_json"]),
                         "https://www.instagram.com/placeholder_partner_sample")
        # The share button is not a profile and never becomes a candidate.
        self.assertFalse(self.conn.execute(
            "SELECT 1 FROM observations WHERE value_json LIKE '%sharer%'").fetchone())

    def test_personal_email_is_dropped_and_text_hours_keep_the_closed_day(self):
        bid = self.add("Example Tire & Lube", "https://www.exampletire.example/", street="500 Example St")
        self.crawl(bid)
        self.assertEqual(self.value(bid, "email"), "info@exampletire.example")
        self.assertFalse(self.conn.execute(
            "SELECT 1 FROM observations WHERE value_json LIKE '%jsmith%'").fetchone())
        self.assertFalse(self.conn.execute(
            "SELECT 1 FROM review_queue WHERE IFNULL(proposed_json,'') LIKE '%jsmith%'").fetchone())
        hours = self.value(bid, "hours")
        self.assertEqual(hours["sun"], [])
        self.assertEqual(hours["sat"], [["08:00", "14:00"]])
        self.assertEqual(hours["mon"], [["07:30", "18:00"]])
        self.assertEqual(self.facts_of(bid)["hours"]["source_url"], "https://www.exampletire.example/hours")
        # The fax number is not a phone candidate at all.
        self.assertFalse(self.conn.execute(
            "SELECT 1 FROM observations WHERE value_json LIKE '%5550111%'").fetchone())

    def test_out_of_area_phone_goes_to_review(self):
        bid = self.add("Example Insurance Agency", "https://www.insurance.example/",
                       street="88 Placeholder Dr Ste 5", naics="524210")
        _, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertIsNone(facts.get_fact(self.conn, bid, "phone"))
        self.assertIsNotNone(facts.get_fact(self.conn, bid, "website"))
        items = self.reviews(bid, "phone_out_of_area")
        self.assertEqual(len(items), 1)
        self.assertEqual(json.loads(items[0]["proposed_json"]), "+12145550142")

    def test_identity_mismatch_writes_no_facts(self):
        bid = self.add("Example Tire & Lube", "https://www.pancakehouse.example/", street="500 Example St")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "identity_mismatch")
        self.assertFalse(result.identity.matches)
        self.assertEqual(self.facts_of(bid), {})
        self.assertFalse(self.conn.execute(
            "SELECT 1 FROM observations WHERE business_id=?", (bid,)).fetchone())
        items = self.reviews(bid)
        self.assertEqual([i["kind"] for i in items], ["website_identity"])
        self.assertEqual(items[0]["field"], "website")
        self.assertEqual(items[0]["detail"], "no_match")
        self.assertEqual(items[0]["source_url"], "https://www.pancakehouse.example/")
        self.assertIsNone(self.conn.execute("SELECT 1 FROM hiring_signals WHERE business_id=?", (bid,)).fetchone())

    def test_reviewer_accepted_identity_lets_the_next_visit_write_facts(self):
        bid = self.add("Example Tire & Lube", "https://www.pancakehouse.example/", street="500 Example St")
        self.crawl(bid)
        item = self.reviews(bid, "website_identity")[0]
        facts.accept_review(self.conn, item["id"], "ryan")
        self.later(31)
        _, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(self.value(bid, "website"), "https://www.pancakehouse.example/")

    def test_429_backs_off_on_the_ladder(self):
        bid = self.add("Example Busy Shop", "https://www.busy.example/")
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "backoff")
        self.assertTrue(result.backoff)
        row = self.row(bid)
        self.assertEqual(row["website_status"], "unknown")  # a 429 says nothing about the site
        self.assertEqual(row["crawl_failures"], 1)
        self.assertEqual(row["next_crawl_at"][:13], plus_days(now, self.settings.backoff_days[0])[:13])
        self.assertEqual(row["next_crawl_at"], result.backoff_until)
        self.assertEqual(self.facts_of(bid), {})

        worker.persist_host_state(self.conn, self.fetcher)
        state = self.conn.execute("SELECT * FROM host_state WHERE host='www.busy.example'").fetchone()
        self.assertEqual(state["backoff_level"], 1)
        self.assertEqual(state["backoff_until"], row["next_crawl_at"])
        # Even if the business itself were due, its host is skipped while in backoff.
        self.conn.execute("UPDATE businesses SET next_crawl_at=NULL WHERE id=?", (bid,))
        self.assertEqual(worker.due_businesses(self.conn, self.settings, self.clock.iso(), 5), [])

        # The next 429 after the backoff ends climbs the ladder (3 days).
        self.later(1.1)
        self.assertEqual([s.id for s in worker.due_businesses(self.conn, self.settings, self.clock.iso(), 5)], [bid])
        second = self.clock.iso()
        self.crawl(bid)
        row = self.row(bid)
        self.assertEqual(row["crawl_failures"], 2)
        self.assertEqual(row["next_crawl_at"][:13], plus_days(second, self.settings.backoff_days[1])[:13])

    def test_host_state_round_trip(self):
        bid = self.add("Example Busy Shop", "https://www.busy.example/")
        self.crawl(bid)
        self.assertEqual(worker.persist_host_state(self.conn, self.fetcher), 1)
        fresh = make_fetcher(self.settings, FakeWeb(clock=self.clock), self.clock)
        self.assertEqual(worker.load_host_state(self.conn, fresh), 1)
        self.assertTrue(fresh.host_in_backoff("www.busy.example"))
        # Persisting again updates the same row.
        worker.persist_host_state(self.conn, self.fetcher)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM host_state").fetchone()[0], 1)

    def test_cloudflare_challenge_is_blocked_for_14_days(self):
        bid = self.add("Example Pawn & Jewelry", "https://www.guarded.example/")
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "blocked")
        self.assertEqual(result.blocked, "challenge")
        row = self.row(bid)
        self.assertEqual(row["website_status"], "blocked")
        self.assertEqual(row["next_crawl_at"][:13], plus_days(now, 14)[:13])
        self.assertEqual(self.web.page_requests("www.guarded.example"), ["https://www.guarded.example/"])
        self.assertEqual(self.facts_of(bid), {})

    def test_robots_blocked_home_waits_30_days(self):
        bid = self.add("Example Barber Shop", "https://www.barbershop.example/")
        self.web.override("https://www.barbershop.example/robots.txt", 200, {"Content-Type": "text/plain"},
                          b"User-agent: *\nDisallow: /\n")
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual((outcome, result.blocked), ("blocked", "robots"))
        self.assertEqual(self.web.page_requests("www.barbershop.example"), [])
        self.assertEqual(self.row(bid)["next_crawl_at"][:13], plus_days(now, 30)[:13])

    def test_offsite_redirect_is_moved_and_reviewed(self):
        bid = self.add("Example Florist", "https://www.oldflorist.example/")
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "moved")
        self.assertEqual(result.moved_to, "https://www.newflorist.example/")
        row = self.row(bid)
        self.assertEqual(row["website_status"], "moved")
        self.assertEqual(row["website"], "https://www.oldflorist.example/")  # never replaced by itself
        self.assertEqual(row["next_crawl_at"][:13], plus_days(now, 30)[:13])
        self.assertEqual(self.facts_of(bid), {})  # nothing from the other domain
        self.assertFalse(self.conn.execute("SELECT 1 FROM observations").fetchone())
        items = self.reviews(bid, "website_moved")
        self.assertEqual(len(items), 1)
        self.assertEqual(json.loads(items[0]["proposed_json"]), "https://www.newflorist.example/")
        self.assertEqual(items[0]["detail"], "home page redirected to another domain")

    def test_dns_failure_is_dead_and_404_home_is_dead(self):
        gone = self.add("Example Gone", "https://www.gone.example/")
        now = self.clock.iso()
        result, outcome = self.crawl(gone)
        self.assertEqual((outcome, result.status, result.error), ("dead", "dead", "dns"))
        self.assertEqual(self.row(gone)["next_crawl_at"][:13], plus_days(now, 1)[:13])
        self.later(1.1)
        second = self.clock.iso()
        self.crawl(gone)
        self.assertEqual(self.row(gone)["crawl_failures"], 2)
        self.assertEqual(self.row(gone)["next_crawl_at"][:13], plus_days(second, 3)[:13])

        glass = self.add("Example Auto Glass", "https://www.autoglass.example/")
        self.web.override("https://www.autoglass.example/", 404)
        _, outcome = self.crawl(glass)
        self.assertEqual(outcome, "dead")
        self.assertEqual(self.row(glass)["website_status"], "dead")

    def test_5xx_keeps_the_previous_status(self):
        bid = self.add("Example Auto Glass", "https://www.autoglass.example/", website_status="ok")
        self.web.override("https://www.autoglass.example/", 500)
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual((outcome, result.error), ("failed", "http_5xx"))
        row = self.row(bid)
        self.assertEqual(row["website_status"], "ok")
        self.assertEqual(row["crawl_failures"], 1)
        self.assertEqual(row["next_crawl_at"][:13], plus_days(now, 1)[:13])

    def test_revisit_with_same_values_confirms(self):
        bid = self.add("Example Taqueria", "https://www.taqueria.example/", street="100 Example St")
        self.crawl(bid)
        first = {f: (r["value_json"], r["checked_at"], r["first_observed_at"]) for f, r in self.facts_of(bid).items()}
        reviews_before = len(self.reviews(bid))
        self.later(31)
        second_at = self.clock.iso()
        _, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        after = self.facts_of(bid)
        self.assertEqual(set(after), set(first))
        for field, row in after.items():
            value, checked, first_seen = first[field]
            self.assertEqual(row["value_json"], value, field)
            self.assertEqual(row["first_observed_at"], first_seen, field)
            self.assertGreater(row["checked_at"], checked, field)
            self.assertGreaterEqual(row["checked_at"], second_at, field)
        self.assertEqual(len(self.reviews(bid)), reviews_before)

    def test_changed_phone_on_revisit_goes_to_review(self):
        bid = self.add("Example Auto Glass", "https://www.autoglass.example/", street="300 Fixture Rd")
        self.crawl(bid)
        self.assertEqual(self.value(bid, "phone"), "+19035550120")
        page = self.web.read("www.autoglass.example", "/").replace(b"555-0120", b"555-0121").replace(
            b"+19035550120", b"+19035550121")
        self.web.override("https://www.autoglass.example/", 200, None, page)
        self.later(31)
        self.crawl(bid)
        self.assertEqual(self.value(bid, "phone"), "+19035550120")  # fill-only: never overwritten
        items = self.reviews(bid, "field_conflict")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["field"], "phone")
        self.assertEqual(json.loads(items[0]["proposed_json"]), "+19035550121")
        self.assertEqual(json.loads(items[0]["current_json"]), "+19035550120")

    def test_ambiguous_hours_go_to_review_without_a_fact(self):
        bid = self.add("Example Auto Glass", "https://www.autoglass.example/", street="300 Fixture Rd")
        _, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertIsNone(facts.get_fact(self.conn, bid, "hours"))
        items = self.reviews(bid, "ambiguous_ampm")
        self.assertEqual(len(items), 1)
        self.assertEqual((items[0]["field"], items[0]["detail"]), ("hours", "ambiguous_ampm"))
        self.assertIsNone(items[0]["proposed_json"])
        self.assertEqual(items[0]["source_url"], "https://www.autoglass.example/")
        # A second visit does not queue the same question again.
        self.later(31)
        self.crawl(bid)
        self.assertEqual(len(self.reviews(bid, "ambiguous_ampm")), 1)

    def test_hiring_signal_with_front_desk_and_receptionist(self):
        bid = self.add("Example Family Dental", "https://www.examplefamilydental.example/",
                       street="700 Sample Ave Ste 200", naics="621210")
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(result.roles, ["front_desk", "receptionist"])
        signal = self.conn.execute("SELECT * FROM hiring_signals WHERE business_id=?", (bid,)).fetchone()
        self.assertEqual(signal["careers_url"], "https://www.examplefamilydental.example/careers")
        self.assertEqual(json.loads(signal["roles_json"]), ["front_desk", "receptionist"])
        self.assertEqual(signal["active"], 1)
        self.assertEqual(self.value(bid, "careers"), "https://www.examplefamilydental.example/careers")
        self.assertNotIn("https://www.examplefamilydental.example/forms/new-patient.pdf", self.web.requests)
        self.assertNotIn("https://www.examplefamilydental.example/smile-gallery", self.web.requests)

        # The careers link disappears: after a full visit the signal goes inactive.
        home = self.web.read("www.examplefamilydental.example", "/").replace(
            b'<a href="/careers">Careers</a>', b"")
        self.web.override("https://www.examplefamilydental.example/", 200, None, home)
        self.later(31)
        result, _ = self.crawl(bid)
        self.assertIsNone(result.careers_url)
        self.assertTrue(result.complete)
        signal = self.conn.execute("SELECT * FROM hiring_signals WHERE business_id=?", (bid,)).fetchone()
        self.assertEqual(signal["active"], 0)

    def test_logs_carry_no_names_phones_or_emails(self):
        bid = self.add("Example Taqueria", "https://www.taqueria.example/", street="100 Example St")
        other = self.add("Example Insurance Agency", "https://www.insurance.example/")
        logger = logging.getLogger("longview_archive")
        with self.assertLogs(logger, level="DEBUG") as captured:
            self.crawl(bid)
            self.crawl(other)
        text = "\n".join(captured.output)
        self.assertIn("www.taqueria.example", text)  # hosts are fine
        for secret in ("Example Taqueria", "Example Insurance", "555-01", "+1903555", "+1214555", "@",
                       "100 Example St", "placeholder_partner_sample", "Fresh tortillas"):
            self.assertNotIn(secret, text)

    def test_suppressed_meanwhile_gets_schedule_only(self):
        bid = self.add("Example Taqueria", "https://www.taqueria.example/")
        snap = self.snap(bid)
        result = worker.visit(snap, self.fetcher, self.settings)
        b.add_suppression(self.conn, "public_id", snap.public_id)
        outcome = worker.apply_visit(self.conn, snap, result, self.settings, self.clock.iso())
        self.assertEqual(outcome, "suppressed")
        self.assertEqual(self.facts_of(bid), {})
        self.assertIsNotNone(self.row(bid)["next_crawl_at"])


if __name__ == "__main__":
    unittest.main()

"""Go-live fixes for the public directory: true copy, honest counts, links that work, no bare 404.

* The public pages never claim a person approves every batch: with auto-approve
  on, batches are approved with no one looking (c10).
* The About page does not count places known only from OpenStreetMap as
  "waiting for a person to review them" when no review item exists (c11).
* The crawler's user agent, the canonical tags, and the claim email's listing
  link point where the directory is actually served, from one setting,
  LVA_PUBLIC_BASE_URL (c12).
* A fresh install answers with the "first batch is being checked" page and the
  About page before the first sync and crawl, not a bare 404 (s1).

Everything is offline and fictional: the fixture pipeline (tests/fixtures/e2e/)
and tests/fixtures/builders.py (.example domains, 903-555-01xx numbers).

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_site -v
"""

from __future__ import annotations

import copy
import re
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from urllib.parse import unquote, urlsplit

from longview_archive import approval, config, db, facts, publish, service, site, worker
from tests.fixtures import builders as b
from tests.fixtures.e2e import pipeline
from tests.test_service import ServiceTestBase
from tests.test_site import BASE, NOW, Page, fixture_export, pages

ROOT = Path(__file__).resolve().parents[1]
CADDY = ROOT / "caddy" / "longview-archive.caddy"
SERVED = "https://longview.165-227-248-110.sslip.io"
FUTURE = "https://www.theleadflowpro.com"
OLD_CLAIM = "A person approves each batch"
NEW_CLAIM = "A batch that would take many listings off the directory waits for a person to approve it."


def site_text(settings) -> str:
    return " ".join(Page(text).text for text in pages(site.site_dir(settings)).values())


# ---------------------------------------------------------------- c10: true whether auto-approve is on or off

class ApprovalCopy(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-golive-copy-")
        self.addCleanup(self.tmp.cleanup)
        self.run_ = pipeline.run_pipeline(Path(self.tmp.name) / "data")
        self.addCleanup(self.run_.conn.close)
        self.conn = self.run_.conn
        self.settings = self.run_.settings

    def about(self) -> str:
        return Page((site.site_dir(self.settings) / "about" / "index.html").read_text(encoding="utf-8")).text

    def test_an_auto_approved_batch_never_claims_a_person_approved_it(self):
        approval.set_auto(self.conn, True)
        self.assertEqual(approval.auto_approve(self.conn, self.settings, NOW)["status"], "approved")
        self.assertEqual(db.get_meta(self.conn, "approved_by"), approval.AUTO_ACTOR)
        about = self.about()
        self.assertNotIn(OLD_CLAIM, about)
        self.assertIn("Every batch is checked against these privacy and accuracy rules automatically", about)
        self.assertIn(NEW_CLAIM, about)
        self.assertNotRegex(site_text(self.settings), r"(?i)person approves")

    def test_the_same_true_copy_when_a_person_approves(self):
        approval.approve(self.conn, self.settings, actor="Amanda", now=NOW)
        about = self.about()
        self.assertNotIn(OLD_CLAIM, about)
        self.assertIn(NEW_CLAIM, about)

    def test_the_first_batch_pages_say_approved_not_approved_by_a_person(self):
        # Nothing approved yet, with auto-approve off and on.
        for auto in (False, True):
            with self.subTest(auto=auto):
                approval.set_auto(self.conn, auto)
                approval.rebuild_site(self.conn, self.settings, NOW)
                text = site_text(self.settings)
                self.assertIn("Listings appear here once the first batch is approved.", text)
                self.assertIn("listings appear here once it is approved.", self.about())
                self.assertNotRegex(text, r"(?i)person approves")
        # An empty batch auto-approved (the first syncs failed): still no claim of a person.
        empty = copy.deepcopy(self.run_.export())
        empty["businesses"], empty["categories"], empty["batchId"] = [], [], "2026-09-24T21:00Z"
        self.settings.approved_export_path.unlink(missing_ok=True)
        publish.write_export(self.settings.publish_export_path, empty)
        self.assertEqual(approval.auto_approve(self.conn, self.settings, NOW)["status"], "approved")
        text = site_text(self.settings)
        self.assertIn("The first batch is being checked", text)
        self.assertNotRegex(text, r"(?i)person approves")


# ---------------------------------------------------------------- c11: an honest review count

class ReviewCount(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-golive-count-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(data_dir=Path(self.tmp.name) / "data")
        self.conn = b.make_db()
        self.addCleanup(self.conn.close)
        b.standard_sources(self.conn)
        tire = b.add_business(self.conn, "Example Tire & Lube")
        b.add_record(self.conn, tire, "tx_sales_tax")
        self.osm = []
        for n in range(3):
            bid = b.add_business(self.conn, f"Example Gift Shop {n}", street=f"{n + 1} Example St", naics="453220")
            b.add_record(self.conn, bid, "osm", key=f"node/9{n}", tags_json='{"shop": "gift"}')
            self.osm.append(bid)
        # A crawl of one of them found a moved website: an open item, but the place still waits
        # for a public record, not for a person.
        b.add_site(self.conn, self.osm[0], "https://www.giftshop.example/")
        db.add_review(self.conn, kind="website_moved", business_id=self.osm[0], field="website",
                      proposed="https://www.newgiftshop.example/", now=b.NOW)

    def export(self) -> dict:
        publish.evaluate(self.conn, self.settings, NOW)
        return publish.build_export(self.conn, self.settings, NOW)

    def about(self, data: dict) -> str:
        site.build_site(self.settings, data, NOW)
        text = (site.site_dir(self.settings) / "about" / "index.html").read_text(encoding="utf-8")
        return Page(text).text

    def test_openstreetmap_only_places_are_not_waiting_for_a_person(self):
        data = self.export()
        for bid in self.osm:
            self.assertEqual(b.state(self.conn, bid), ("review", "osm_only_needs_primary_source"))
        self.assertEqual(data["counts"], {"published": 1, "inArchive": 4, "heldForPrivacy": 0, "needsReview": 0})
        about = self.about(data)
        self.assertIn("0 are waiting for a person to review them", about)
        self.assertNotIn("3 are waiting", about)

    def test_places_a_person_must_check_are_counted(self):
        person = b.add_business(self.conn, "Dale Fictional", naics="541211", street="7 Sample Rd")
        b.add_record(self.conn, person, "tx_sales_tax")
        merge = b.add_business(self.conn, "Example Auto Glass", street="9 Fixture Ln")
        b.add_record(self.conn, merge, "tx_sales_tax")
        merge_item = db.add_review(self.conn, kind="merge_ambiguous", business_id=merge, detail="same phone")
        data = self.export()
        self.assertEqual(b.state(self.conn, person), ("review", "person_name_check"))
        self.assertEqual(b.state(self.conn, merge), ("review", "open_merge_review"))
        self.assertEqual(data["counts"]["needsReview"], 2)
        self.assertIn("2 are waiting for a person to review them", self.about(data))
        facts.accept_review(self.conn, merge_item, "owner")
        self.assertEqual(self.export()["counts"]["needsReview"], 1)


# ---------------------------------------------------------------- c12: one public base URL

class PublicBaseUrl(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-golive-url-")
        self.addCleanup(self.tmp.cleanup)

    def settings(self, **env) -> config.Settings:
        return config.load_settings(dict({"LVA_DATA_DIR": str(Path(self.tmp.name) / "data")}, **env))

    def test_the_user_agent_names_the_about_page_that_is_served(self):
        expected = ("LeadFlowPro-LongviewArchive/1.0 (+https://longview.165-227-248-110.sslip.io/longview/businesses"
                    "/about/; hello@theleadflowpro.com)")
        self.assertEqual(config.USER_AGENT, expected)
        self.assertEqual(config.Settings().user_agent, expected)
        self.assertEqual(self.settings().user_agent, expected)
        self.assertNotIn("theleadflowpro.com/longview", expected)
        # The URL in it is a page the site builds, on the host the Caddy file serves the directory from.
        url = re.search(r"\(\+(\S+);", expected).group(1)
        parts = urlsplit(url)
        caddy = CADDY.read_text(encoding="utf-8")
        self.assertRegex(caddy, rf"(?m)^{re.escape(parts.hostname)} \{{$")
        self.assertIn("handle /longview/businesses/* {", caddy)
        self.assertTrue(parts.path.startswith(BASE))
        settings = self.settings()
        site.build_site(settings, None, NOW)
        self.assertTrue((site.site_dir(settings) / parts.path[len(BASE):] / "index.html").is_file())

    def test_default_links_point_where_the_directory_is_served(self):
        settings = self.settings()
        self.assertEqual(settings.public_base_url, SERVED)
        built = self.build(settings)
        for rel, text in built.items():
            with self.subTest(page=rel):
                self.assertNotIn(FUTURE + "/longview/businesses", text)
                canon = [a["href"] for a in Page(text).attrs("link") if a.get("rel") == "canonical"]
                self.assertEqual(canon, [SERVED + BASE + rel[: -len("index.html")]])
        self.assertIn(f"Listing: {SERVED}{BASE}example-taqueria/", self.claim_body(built))

    def test_one_setting_moves_the_user_agent_and_every_absolute_link(self):
        settings = self.settings(LVA_PUBLIC_BASE_URL=FUTURE + "/")
        self.assertEqual(settings.public_base_url, FUTURE)
        self.assertEqual(settings.user_agent, "LeadFlowPro-LongviewArchive/1.0"
                                              " (+https://www.theleadflowpro.com/longview/businesses/about/;"
                                              " hello@theleadflowpro.com)")
        built = self.build(settings)
        for rel, text in built.items():
            with self.subTest(page=rel):
                self.assertNotIn("sslip.io", text)
                self.assertEqual(Page(text).robots(), "noindex,nofollow")
                canon = [a["href"] for a in Page(text).attrs("link") if a.get("rel") == "canonical"]
                self.assertEqual(canon, [FUTURE + BASE + rel[: -len("index.html")]])
        self.assertIn(f"Listing: {FUTURE}{BASE}example-taqueria/", self.claim_body(built))
        about = Page(built["about/index.html"]).text
        self.assertIn(settings.user_agent, about)
        self.assertIn("User-agent: LeadFlowPro-LongviewArchive Disallow: /", about)
        self.assertIn("mailto:hello@theleadflowpro.com", built["about/index.html"])
        # An explicit LVA_USER_AGENT still wins, and the About page shows the one actually sent.
        custom = self.settings(LVA_USER_AGENT="LeadFlowPro-LongviewArchive/1.1 (+https://x.example/; a@b.example)")
        self.assertIn(custom.user_agent, Page(self.build(custom)["about/index.html"]).text)

    def test_a_base_url_that_is_not_https_and_a_host_is_refused(self):
        for bad in ("http://www.theleadflowpro.com", "www.theleadflowpro.com",
                    "https://www.theleadflowpro.com/longview/businesses", "https://user@www.theleadflowpro.com",
                    "https://www.theleadflowpro.com?x=1", "https://x.example; a@b.example)"):
            with self.subTest(value=bad), self.assertRaises(ValueError):
                self.settings(LVA_PUBLIC_BASE_URL=bad)
        self.assertEqual(self.settings(LVA_PUBLIC_BASE_URL="https://dir.example:8443").public_base_url,
                         "https://dir.example:8443")

    def build(self, settings) -> dict:
        site.build_site(settings, fixture_export(), NOW)
        return pages(site.site_dir(settings))

    @staticmethod
    def claim_body(built: dict) -> str:
        hrefs = [a.get("href") or "" for a in Page(built["example-taqueria/index.html"]).attrs("a")]
        claim = next(h for h in hrefs if h.startswith("mailto:hello@theleadflowpro.com?subject="))
        return unquote(claim.split("&body=", 1)[1])


# ---------------------------------------------------------------- s1: no bare 404 in the first minutes

class DirectoryFromTheStart(ServiceTestBase):
    def seen_during(self) -> dict:
        """Run one first iteration; record what the directory looked like during the syncs and the crawl."""
        seen: dict = {}
        real_sync, real_due = service.run_sync, worker.due_businesses

        def look(when: str) -> None:
            index = site.site_dir(self.settings) / "index.html"
            about = site.site_dir(self.settings) / "about" / "index.html"
            seen.setdefault(when, {
                "status": (self.settings.www_dir / "status.json").is_file(),
                "index": index.is_file() and "The first batch is being checked" in index.read_text(),
                "about": about.is_file(),
                "noindex": index.is_file() and about.is_file()
                and Page(index.read_text()).robots() == Page(about.read_text()).robots() == "noindex,nofollow",
            })

        def sync(*args, **kw):
            look("sync")
            return real_sync(*args, **kw)

        def due(*args, **kw):
            look("crawl")
            return real_due(*args, **kw)

        with mock.patch.object(service, "run_sync", sync), mock.patch.object(worker, "due_businesses", due):
            self.report = self.make().run_once()
        return seen

    def test_the_being_checked_page_and_about_exist_before_the_first_sync(self):
        seen = self.seen_during()
        everything = {"status": True, "index": True, "about": True, "noindex": True}
        self.assertEqual(seen, {"sync": everything, "crawl": everything})
        self.assertEqual(self.report["site"], 0)

    def test_later_iterations_do_not_rebuild_it(self):
        svc = self.make()
        with mock.patch.object(approval, "rebuild_site", wraps=approval.rebuild_site) as rebuild:
            svc.run_once()
            self.assertEqual(rebuild.call_count, 1)
            self.clock.advance(minutes=1)
            svc.run_once()
            self.assertEqual(rebuild.call_count, 1)

    def test_a_pause_still_builds_nothing(self):
        self.settings.pause_file.parent.mkdir(parents=True, exist_ok=True)
        self.settings.pause_file.touch()
        report = self.make().run_once()
        self.assertEqual(report["state"], "paused")
        self.assertFalse(site.site_exists(self.settings))


if __name__ == "__main__":
    unittest.main()

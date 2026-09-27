"""Go-live regressions, review round 2 (misc):

* dos: the HTML parser keeps no state keyed by a page's tag names across pages
  (a page can supply a tag name as long as itself).
* crawl: ``fetcher.forbidden_site`` is memoized per host with a bounded cache
  and gives the same answers; more directory, aggregator, job-board, and
  chamber-platform hosts are forbidden; a chamber-like business name goes to
  review, a chamber platform does not.
* crawl: a businesses.website on a forbidden host (stored before the guard) is
  never kept as the website candidate nor published.
* site: the About page's robots.txt opt-out names the token the crawler obeys.
* site: the CLI hint and the install summary use the public base URL setting.

No network. All data is fictional: '.example' businesses, 903-555-01xx
phones, 'Example ...' names and made-up streets.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_misc -v
"""

from __future__ import annotations

import gc
import inspect
import subprocess
import tempfile
import tracemalloc
import unittest
from pathlib import Path
from unittest import mock

from longview_archive import __main__ as cli, config, fetcher as f, matching, publish, site, worker
from longview_archive.extract import html as html_mod
from longview_archive.extract.html import parse_page
from longview_archive.sources import osm
from tests.fixtures import builders as b
from tests.test_golive_crawl import FORBIDDEN_URLS, IN_DOUBT_URLS, OWN_SITES, _element
from tests.test_site import NOW, Page, fixture_export, pages
from tests.test_sources import NOW1, NOW2, NoWaitCase, make_settings as source_settings, overpass_transport

ENGINE = Path(__file__).resolve().parent.parent
FACEBOOK = "https://www.facebook.com/exampleplumbing"
OWN = "https://www.exampleplumbing.example/"


# ---------------------------------------------------------------- dos: no cache keyed by page tag names

class ParserKeepsNoPageStateTest(unittest.TestCase):
    def test_long_distinct_tag_names_are_not_retained(self):
        self.assertFalse(hasattr(html_mod._searches_ended_by, "cache_info"))
        gc.collect()
        tracemalloc.start()
        try:
            before = tracemalloc.get_traced_memory()[0]
            for i in range(8):
                tag = "x%06d" % i + "a" * 200_000
                page = parse_page(f"<p><{tag}>Oil change</{tag}></p>", "https://www.example-cafe.example/")
                self.assertIn("Oil change", page.text)
                del page
                gc.collect()
            retained = tracemalloc.get_traced_memory()[0] - before
        finally:
            tracemalloc.stop()
        self.assertLess(retained, 1_000_000)

    def test_the_fixed_table_gives_the_same_answers(self):
        tags = set(html_mod._INLINE_TAGS) | set(html_mod._BOUNDED_CLOSE) | {"div", "section", "custom-tag", "x" * 500}
        for values in html_mod._SCOPE_LIMIT.values():
            tags |= values
        for tag in tags:
            with self.subTest(tag=tag[:20]):
                self.assertEqual(html_mod._searches_ended_by(tag), html_mod._compute_searches_ended_by(tag))


# ---------------------------------------------------------------- crawl: memoized guard, more hosts

NEW_FORBIDDEN = (
    "https://share.google/AbCdEf",
    "https://posts.gle/AbCdEf",
    "https://restaurantguru.com/Example-Grill-Longview",
    "https://www.restaurantji.com/tx/longview/example-grill-/",
    "https://www.allmenus.com/tx/longview/1-example-grill/menu/",
    "https://www.menupix.com/longview/restaurants/1/Example-Grill",
    "https://www.zmenu.com/example-grill-longview/",
    "https://www.sirved.com/restaurant/longview-texas-usa/example-grill/1/menus",
    "https://places.singleplatform.com/example-grill/menu",
    "https://www.whitepages.com/business/TX/Longview/Example-Plumbing",
    "https://www.dnb.com/business-directory/company-profiles.example_plumbing.html",
    "https://www.yellowbook.com/profile/example-plumbing.html",
    "https://reviews.birdeye.com/example-plumbing-1",
    "https://www.alignable.com/longview-tx/example-plumbing",
    "https://www.brownbook.net/business/1/example-plumbing",
    "https://www.ezlocal.com/tx/longview/plumber/1",
    "https://www.showmelocal.com/1-example-plumbing-longview",
    "https://www.cybo.com/US-biz/example-plumbing",
    "https://example-plumbing.nicelocal.com/",
    "https://npiprofile.com/npi/1234567890",
    "https://www.sharecare.com/doctor/example-1",
    "https://www.doximity.com/pub/example-dentist",
    "https://www.ratemds.com/doctor-ratings/1/Dr-Example-Longview-TX.html",
    "https://longview.chamberorganizer.com/members/example-plumbing",
    "https://www.chambernation.com/longview/example-plumbing",
    "https://longviewchamber.memberclicks.net/directory/example-plumbing",
    "https://www.careerbuilder.com/company/example-plumbing/1",
    "https://www.monster.com/jobs/q-example-plumbing-jobs",
    "https://www.simplyhired.com/search?q=example+plumbing",
    "https://www.snagajob.com/jobs/1",
    "https://business.longviewchamber.com/list/member/example-plumbing",
    "https://www.chamberofcommerce.com/united-states/texas/longview/example-plumbing",
    "https://www.longview-chamber-of-commerce.org/directory/example-plumbing",
    "https://longviewtx.chambermaster.com/list/member/example-plumbing",
    "https://longview.growthzoneapp.com/ap/Member/1",
    "https://www.micronetonline.com/list/member/example-plumbing",
)
# Their own names end in "chamber": never dropped silently (a person reviews them).
CHAMBER_NAMED_BUSINESSES = IN_DOUBT_URLS + (
    "https://www.longviewescapechamber.example/",
    "https://www.saltchamber.example/",
)


class ForbiddenHostsTest(unittest.TestCase):
    def test_new_directory_hosts_are_forbidden_and_certain(self):
        for url in NEW_FORBIDDEN:
            with self.subTest(url=url):
                self.assertTrue(f.forbidden_site(url))
                self.assertFalse(f.forbidden_site_in_doubt(url))

    def test_chamber_named_businesses_go_to_review_not_away(self):
        for url in CHAMBER_NAMED_BUSINESSES:
            with self.subTest(url=url):
                self.assertTrue(f.forbidden_site_in_doubt(url))

    def test_memoized_guard_gives_the_same_answers(self):
        urls = FORBIDDEN_URLS + NEW_FORBIDDEN + OWN_SITES + CHAMBER_NAMED_BUSINESSES
        for url in urls:
            with self.subTest(url=url):
                first = f._forbidden_entries(url)
                again = f._forbidden_entries(url)
                self.assertEqual(first, again)
                host = f.urlsplit(f.normalize.norm_url(url) or url).hostname or ""
                self.assertEqual(first, set(f._host_forbidden_entries(
                    host, config.FORBIDDEN_SITES, config.FORBIDDEN_SITE_EXCEPTIONS)))

    def test_the_cache_is_bounded_and_skips_long_hosts(self):
        info = f._cached_host_forbidden_entries.cache_info()
        self.assertEqual(info.maxsize, f._HOST_CACHE_SIZE)
        self.assertLessEqual(f._HOST_CACHE_SIZE, 10_000)
        before = f._cached_host_forbidden_entries.cache_info().currsize
        long_host = ".".join(["a" * 60] * 6) + ".example"
        self.assertGreater(len(long_host), f._HOST_CACHE_MAX_LEN)
        self.assertFalse(f.forbidden_site(f"https://{long_host}/"))
        self.assertTrue(f.forbidden_site(f"https://{'a' * 300}.yelp.com/"))
        self.assertLessEqual(f._cached_host_forbidden_entries.cache_info().currsize, before)

    def test_a_patched_exception_list_is_not_answered_from_the_cache(self):
        site_url = "https://www.hyperbaricchamber.example/"
        self.assertTrue(f.forbidden_site(site_url))
        with mock.patch.object(f, "FORBIDDEN_SITE_EXCEPTIONS",
                               config.FORBIDDEN_SITE_EXCEPTIONS + ("hyperbaricchamber.example",)):
            self.assertFalse(f.forbidden_site(site_url))
        self.assertTrue(f.forbidden_site(site_url))


# ---------------------------------------------------------------- crawl: stored forbidden websites

class StoredForbiddenWebsiteTest(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.settings = source_settings()
        self.conn = b.make_db()
        self.addCleanup(self.conn.close)
        b.standard_sources(self.conn)

    def business(self, website):
        bid = b.add_business(self.conn, "Example Plumbing", street="4411 Example Ln", naics="238220")
        b.add_record(self.conn, bid, "tx_sales_tax")
        self.conn.execute("UPDATE businesses SET website=?, website_domain=?, website_source='osm' WHERE id=?",
                          (website, f.normalize.registrable_domain(website), bid))
        return bid

    def row(self, bid):
        return self.conn.execute("SELECT * FROM businesses WHERE id=?", (bid,)).fetchone()

    def test_a_stored_facebook_website_is_replaced_by_the_own_site(self):
        bid = self.business(FACEBOOK)
        osm.sync_osm(self.conn, self.settings, now=NOW1,
                     transport=overpass_transport({"elements": [_element({"website": OWN})]}))
        matching.match_pending(self.conn, NOW1)
        row = self.row(bid)
        self.assertEqual(row["website"], OWN)
        self.assertEqual(row["website_domain"], "exampleplumbing.example")
        self.assertIsNotNone(worker.snapshot(self.conn, row))
        kinds = [r["kind"] for r in self.conn.execute("SELECT kind FROM review_queue")]
        self.assertNotIn("website_conflict", kinds)

    def test_a_stored_directory_website_is_dropped_and_not_published(self):
        bid = self.business(FACEBOOK)
        # A stale OSM row stored before the guard, still waiting for a match, with no other website.
        b.add_record(self.conn, None, "osm", key="node/7009", name="Example Plumbing",
                     name_norm="example plumbing", street="4411 Example Ln",
                     street_norm=f.normalize.parse_street("4411 Example Ln")[0],
                     website="https://www.yelp.com/biz/example-plumbing",
                     website_domain="yelp.com")
        matching.match_pending(self.conn, NOW1)
        joined = self.conn.execute("SELECT business_id FROM source_records WHERE source_key='node/7009'").fetchone()
        self.assertEqual(joined[0], bid)  # the stale row joined the business (and enriched it) ...
        row = self.row(bid)
        self.assertIsNone(row["website"])  # ... and the stored Facebook page was dropped, not replaced by Yelp
        self.assertIsNone(row["website_domain"])
        profile = publish.business_profile(self.conn, config.Settings(data_dir=Path("/nonexistent-test-dir")), row)
        self.assertIsNotNone(profile)
        self.assertIsNone(profile["website"])

    def test_a_stale_forbidden_record_website_is_never_a_candidate(self):
        rid = b.add_record(self.conn, None, "osm", key="node/7010", name="Example Grill",
                           name_norm="example grill", street="9 Example Rd",
                           street_norm=f.normalize.parse_street("9 Example Rd")[0],
                           website="https://restaurantguru.com/Example-Grill-Longview",
                           website_domain="restaurantguru.com")
        rec = matching._load(self.conn.execute("SELECT * FROM source_records WHERE id=?", (rid,)).fetchone())
        self.assertEqual(rec.website, "")
        self.assertEqual(rec.website_domain, "")

    def test_publish_hides_a_stored_forbidden_website(self):
        bid = self.business(FACEBOOK)
        profile = publish.business_profile(self.conn, config.Settings(data_dir=Path("/nonexistent-test-dir")),
                                           self.row(bid))
        self.assertIsNotNone(profile)
        self.assertIsNone(profile["website"])


# ---------------------------------------------------------------- site: opt-out token, base URL

class AboutPageTokenTest(unittest.TestCase):
    def test_the_opt_out_names_the_token_the_crawler_obeys(self):
        with tempfile.TemporaryDirectory() as tmp:
            settings = config.load_settings({
                "LVA_DATA_DIR": str(Path(tmp) / "data"),
                "LVA_USER_AGENT": "ExampleArchiveBot/2.0 (+https://x.example/about/; hello@theleadflowpro.com)",
            })
            site.build_site(settings, fixture_export(), NOW)
            about = Page(pages(site.site_dir(settings))["about/index.html"]).text
        self.assertIn(f"User-agent: {f.ROBOTS_TOKEN} Disallow: /", about)
        self.assertNotIn("User-agent: ExampleArchiveBot", about)
        rules = f.RobotsRules(f"User-agent: {f.ROBOTS_TOKEN}\nDisallow: /\n")
        self.assertFalse(rules.can_fetch(f.ROBOTS_TOKEN, "https://www.taqueria.example/"))


class PublicBaseUrlHintTest(unittest.TestCase):
    def test_the_cli_hint_follows_the_setting(self):
        self.assertEqual(cli.SITE_URL_HINT, "https://longview.165-227-248-110.sslip.io/longview/businesses/")
        with tempfile.TemporaryDirectory() as tmp:
            moved = config.load_settings({"LVA_DATA_DIR": tmp, "LVA_PUBLIC_BASE_URL": "https://dir.example/"})
        self.assertEqual(cli.site_url_hint(moved), "https://dir.example/longview/businesses/")
        for command in (cli.cmd_publish, cli.cmd_approve):
            self.assertIn("site_url_hint(settings)", inspect.getsource(command))
            self.assertNotIn("{SITE_URL_HINT}", inspect.getsource(command))

    def summary_url(self, env):
        script = (ENGINE / "install.sh").read_text()
        lines = [line for line in script.splitlines()
                 if line.startswith(("STATUS_HOST=", "PUBLIC_BASE_URL="))]
        self.assertEqual(len(lines), 3)
        self.assertIn('say "  Directory: $PUBLIC_BASE_URL/longview/businesses/', script)
        proc = subprocess.run(["bash", "-c", "set -u\n" + "\n".join(lines) + '\necho "$PUBLIC_BASE_URL"'],
                              capture_output=True, text=True, env=env, check=True)
        return proc.stdout.strip()

    def test_the_install_summary_follows_the_setting(self):
        self.assertEqual(self.summary_url({"PATH": "/usr/bin:/bin"}), "https://longview.165-227-248-110.sslip.io")
        self.assertEqual(self.summary_url({"PATH": "/usr/bin:/bin", "LVA_PUBLIC_BASE_URL": "https://dir.example/"}),
                         "https://dir.example")


if __name__ == "__main__":
    unittest.main()

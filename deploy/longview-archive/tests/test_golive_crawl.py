"""Go-live regressions for the crawl review: directory sites are never read, and
a bot challenge on robots.txt closes the site like one on a page.

* c13 / s4: a BBB, Yelp, YellowPages, Chamber, Facebook, or Google Maps URL
  is never taken as a business's website (from OpenStreetMap or any stored
  row), never requested (not even robots.txt), and never reached through a
  redirect or a "same-site" link.
* s3: a Cloudflare challenge answering robots.txt is a 14-day challenge block,
  not a 1-day 429/503 backoff.

No network. Every resolver here answers every name with a public-looking
address, so an unguarded fetcher would really request the directory pages.
All data is fictional: '.example' businesses, 903-555-01xx phones,
'Example ...' names and made-up streets.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_crawl -v
"""

from __future__ import annotations

import socket
import unittest
from pathlib import Path
from urllib.parse import urlsplit

from longview_archive import config, fetcher as f, matching, worker
from longview_archive.sources import osm
from tests.fixtures import builders as b
from tests.fixtures.e2e.pipeline import PUBLIC_IP
from tests.test_fetcher import make, redirect, robots
from tests.test_sources import NOW1, NoWaitCase, make_settings as source_settings, overpass_transport
from tests.test_worker import WorkerCase, plus_days

DAY = 86_400

BBB = "https://www.bbb.org/us/tx/longview/profile/plumber/example-plumbing-0875-9"
FORBIDDEN_URLS = (
    BBB,
    "https://www.google.com/maps/place/Example+Plumbing/@32.5,-94.7,17z",
    "https://google.com/maps?cid=123",
    "https://maps.google.com/?cid=123",
    "https://maps.google.co.uk/maps?q=example",
    "https://goo.gl/maps/AbCdEf",
    "https://maps.app.goo.gl/AbCdEf",
    "https://g.page/example-plumbing",
    "https://www.yelp.com/biz/example-plumbing-longview",
    "https://m.yelp.com/biz/example-plumbing-longview",
    "https://www.facebook.com/exampleplumbing",
    "https://m.facebook.com/exampleplumbing",
    "https://fb.com/exampleplumbing",
    "https://fb.me/exampleplumbing",
    "https://www.instagram.com/exampleplumbing",
    "https://www.longviewchamber.com/list/member/example-plumbing",
    "https://business.longviewchamber.com/list/member/example-plumbing",
    "https://www.kilgorechamber.example/directory/example-plumbing",
    "https://www.yellowpages.com/longview-tx/mip/example-plumbing",
    "https://www.yp.com/longview-tx/mip/example-plumbing",
    "https://nextdoor.com/pages/example-plumbing-longview-tx",
    "https://www.indeed.com/cmp/Example-Plumbing",
    "https://www.manta.com/c/example/example-plumbing",
    "https://www.mapquest.com/us/texas/example-plumbing",
    "HTTPS://WWW.YELP.COM./biz/example-plumbing",
    "www.bbb.org/us/tx/longview/profile/plumber/example",
)
OWN_SITES = (
    "https://www.exampleplumbing.example/",
    "https://sites.google.com/view/exampleplumbinglongview",
    "https://www.chambersplumbing.example/",   # a business named Chambers, not a chamber of commerce
    "https://www.notyelp.example/",
    "https://www.facebookfans.example/",
)


def resolve_all(host, port, *args, **kwargs):
    """Every name resolves to a public address: only the forbidden-site guard can stop a request."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (PUBLIC_IP, port))]


def hosts_of(urls) -> set:
    return {(urlsplit(u).hostname or "").lower() for u in urls}


# ---------------------------------------------------------------- the one guard

class ForbiddenSiteTest(unittest.TestCase):
    def test_directory_map_and_social_urls_are_forbidden(self):
        for url in FORBIDDEN_URLS:
            with self.subTest(url=url):
                self.assertTrue(f.forbidden_site(url))

    def test_own_sites_are_not(self):
        for url in OWN_SITES + (None, "", "not a url", "http://[::1]/"):
            with self.subTest(url=url):
                self.assertFalse(f.forbidden_site(url))

    def test_the_list_lives_in_config(self):
        for entry in ("google.*", "yelp.*", "facebook.com", "instagram.com", "bbb.org", "*chamber.*",
                      "yellowpages.com", "nextdoor.com", "indeed.com", "manta.com", "mapquest.com"):
            self.assertIn(entry, config.FORBIDDEN_SITES)


# ---------------------------------------------------------------- the fetcher

class FetcherRefusesForbiddenSitesTest(unittest.TestCase):
    def test_never_requested_not_even_robots_or_dns(self):
        for url in FORBIDDEN_URLS:
            with self.subTest(url=url):
                fetcher, transport, _, resolver = make()
                result = fetcher.fetch(url)
                self.assertEqual(result.blocked, "forbidden")
                self.assertIsNone(result.text)
                self.assertEqual(transport.calls, [])
                self.assertEqual(resolver.calls, [])

    def test_refused_with_the_test_escape_hatch_too(self):
        settings = config.Settings(data_dir=Path("/nonexistent-test-dir"), allow_private_hosts=True)
        fetcher, transport, _, _ = make(settings=settings)
        self.assertEqual(fetcher.fetch(BBB).blocked, "forbidden")
        self.assertEqual(transport.calls, [])

    def test_redirect_to_a_directory_stops_before_it(self):
        for target in ("https://www.yelp.com/biz/joes-bbq-longview", "https://www.facebook.com/joesbbq",
                       "https://www.google.com/maps/place/Joes+BBQ"):
            with self.subTest(target=target):
                fetcher, transport, _, _ = make({"https://www.joesbbq.example/": redirect(target)})
                result = fetcher.fetch("https://www.joesbbq.example/")
                self.assertEqual(result.blocked, "forbidden")
                self.assertTrue(result.redirected_offsite)
                self.assertEqual(result.final_url, target)
                self.assertEqual(hosts_of(transport.urls()), {"www.joesbbq.example"})

    def test_robots_redirect_to_a_directory_is_not_followed(self):
        routes = {"https://www.joesbbq.example/robots.txt": redirect("https://www.yelp.com/robots.txt")}
        fetcher, transport, _, _ = make(routes)
        self.assertEqual(fetcher.fetch("https://www.joesbbq.example/").blocked, "robots")
        self.assertEqual(transport.urls(), ["https://www.joesbbq.example/robots.txt"])

    def test_own_sites_still_fetched(self):
        for url in OWN_SITES:
            with self.subTest(url=url):
                fetcher, _, _, _ = make()
                self.assertTrue(fetcher.fetch(url).ok)


# ---------------------------------------------------------------- website candidates

def _element(website_tags: dict, name="Example Plumbing") -> dict:
    tags = {"name": name, "craft": "plumber", "addr:housenumber": "4411", "addr:street": "Example Lane",
            "addr:postcode": "75601"}
    tags.update(website_tags)
    return {"type": "node", "id": 7001, "lat": 32.5, "lon": -94.7, "tags": tags}


class OsmWebsiteCandidateTest(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.settings = source_settings()

    def test_directory_website_is_dropped(self):
        for url in FORBIDDEN_URLS:
            for key in ("website", "contact:website", "url"):
                with self.subTest(url=url, key=key):
                    _, record, _ = osm.element_record(_element({key: url}), self.settings)
                    self.assertIsNone(record["website"])
                    self.assertIsNone(record["website_domain"])

    def test_the_business_own_site_is_kept_after_a_directory_link(self):
        tags = {"website": "https://www.facebook.com/exampleplumbing;https://www.exampleplumbing.example/",
                "contact:website": BBB}
        _, record, _ = osm.element_record(_element(tags), self.settings)
        self.assertEqual(record["website"], "https://www.exampleplumbing.example/")
        tags = {"website": "https://www.yelp.com/biz/example-plumbing", "url": "https://www.exampleplumbing.example/"}
        _, record, _ = osm.element_record(_element(tags), self.settings)
        self.assertEqual(record["website_domain"], "exampleplumbing.example")

    def test_sync_and_match_never_give_the_business_a_directory_website(self):
        conn = b.make_db()
        bid = b.add_business(conn, "Example Plumbing", street="4411 Example Ln", naics="238220")
        b.add_record(conn, bid, "tx_sales_tax")
        payload = {"elements": [_element({"website": BBB})]}
        osm.sync_osm(conn, self.settings, now=NOW1, transport=overpass_transport(payload))
        matching.match_pending(conn, NOW1)
        rec = conn.execute("SELECT * FROM source_records WHERE source_id='osm'").fetchone()
        self.assertEqual(rec["business_id"], bid)  # the OSM node joined the business ...
        row = conn.execute("SELECT * FROM businesses WHERE id=?", (bid,)).fetchone()
        self.assertIsNone(row["website"])  # ... but its BBB page did not become the website
        self.assertEqual(worker.due_businesses(conn, self.settings, NOW1, 5), [])
        conn.close()


# ---------------------------------------------------------------- the worker

class WorkerForbiddenSiteTest(WorkerCase):
    def setUp(self):
        super().setUp()
        self.fetcher = f.PoliteFetcher(self.settings, transport=self.web, clock=self.clock.monotonic,
                                       wall_clock=self.clock.time, sleep=self.clock.sleep, resolver=resolve_all)
        # A directory that would let us in: only the guard keeps the crawler out.
        listing = ("<html><head><title>Example Plumbing | Better Business Bureau</title></head><body>"
                   "<h1>Example Plumbing</h1><p>4411 Example Ln, Longview, TX 75601</p>"
                   "<p>Call <a href='tel:+19035550177'>(903) 555-0177</a></p></body></html>").encode()
        for url in (BBB, "https://www.yelp.com/biz/example-florist-longview",
                    "https://www.google.com/maps/place/Example+Florist"):
            self.web.override(url, 200, None, listing)
            host = urlsplit(url).hostname
            self.web.override(f"https://{host}/robots.txt", 200, {"Content-Type": "text/plain"},
                              b"User-agent: *\nAllow: /\n")

    def test_directory_website_from_any_source_is_never_visited(self):
        bid = self.add("Example Plumbing", BBB, street="4411 Example Ln", naics="238220")
        self.assertIsNone(self.snap(bid))
        self.assertEqual(worker.due_businesses(self.conn, self.settings, self.clock.iso(), 5), [])
        for url in FORBIDDEN_URLS:
            with self.subTest(url=url):
                self.conn.execute("UPDATE businesses SET website=? WHERE id=?", (url, bid))
                self.assertIsNone(self.snap(bid))
        self.assertEqual(self.web.requests, [])
        self.assertEqual(self.facts_of(bid), {})

    def test_a_forced_visit_makes_no_request(self):
        snap = worker.BusinessSnapshot(id=1, public_id="lv-test00001", name="Example Plumbing",
                                       category="other", street="4411 Example Ln", street_norm="4411 example ln",
                                       zip="75601", website=BBB, website_domain="bbb.org")
        result = worker.visit(snap, self.fetcher, self.settings)
        self.assertEqual((result.status, result.blocked), ("blocked", "forbidden"))
        self.assertIsNone(result.identity)
        self.assertEqual(self.web.requests, [])

    def test_own_domain_forwarding_to_yelp_is_never_followed(self):
        bid = self.add("Example Florist", "https://www.oldflorist.example/")
        self.web.override("https://www.oldflorist.example/", 301,
                          {"Location": "https://www.yelp.com/biz/example-florist-longview"})
        result, outcome = self.crawl(bid)
        self.assertEqual(hosts_of(self.web.requests), {"www.oldflorist.example"})
        self.assertEqual(outcome, "moved")  # a person looks; nothing is read from Yelp
        self.assertEqual(self.facts_of(bid), {})
        self.assertFalse(self.conn.execute("SELECT 1 FROM observations").fetchone())
        self.assertEqual(self.row(bid)["website"], "https://www.oldflorist.example/")

    def test_google_sites_page_never_reaches_google_maps(self):
        home = "https://sites.google.com/view/examplefloristlongview"
        self.web.override("https://sites.google.com/robots.txt", 200, {"Content-Type": "text/plain"},
                          b"User-agent: *\nAllow: /\n")
        self.web.override(home, 200, None, (
            "<html><head><title>Example Florist</title></head><body><h1>Example Florist</h1>"
            "<a href='https://www.google.com/maps/place/Example+Florist'>Get directions</a>"
            f"<a href='{home}/contact'>Contact</a></body></html>").encode())
        self.web.override(home + "/contact", 200, None,
                          b"<html><head><title>Contact Example Florist</title></head><body>"
                          b"<p>Call (903) 555-0142</p></body></html>")
        bid = self.add("Example Florist", home)
        result, outcome = self.crawl(bid)
        self.assertEqual(outcome, "ok")
        self.assertEqual(hosts_of(self.web.requests), {"sites.google.com"})
        self.assertIn(home + "/contact", self.web.requests)
        self.assertEqual(self.value(bid, "website"), home)


# ---------------------------------------------------------------- s3: a challenge on robots.txt

CF_503 = f.RawResponse(503, f.Headers({"Server": "cloudflare", "cf-mitigated": "challenge",
                                       "Content-Type": "text/html"}), b"<title>Just a moment...</title>")
CF_503_BODY_ONLY = f.RawResponse(503, f.Headers({"Server": "cloudflare", "Content-Type": "text/html"}),
                                 b"<html><title>Just a moment...</title><script src='/cdn-cgi/challenge-platform/x'>")
CF_403 = f.RawResponse(403, f.Headers({"cf-mitigated": "challenge"}), b"")


class RobotsChallengeTest(unittest.TestCase):
    def test_challenge_on_robots_closes_the_site_for_14_days(self):
        for name, response in (("503", CF_503), ("503_body", CF_503_BODY_ONLY), ("403", CF_403)):
            with self.subTest(name=name):
                fetcher, transport, clock, _ = make({"https://www.cfsite.example/robots.txt": response})
                result = fetcher.fetch("https://www.cfsite.example/")
                self.assertEqual(result.blocked, "challenge")
                self.assertEqual(transport.urls(), ["https://www.cfsite.example/robots.txt"])
                row = [r for r in fetcher.export_host_state() if r["host"] == "cfsite.example"][0]
                self.assertEqual(row["blocked_reason"], "challenge")
                self.assertAlmostEqual(f._epoch(row["backoff_until"]) - clock.wall(), 14 * DAY, delta=1)
                # Nothing more on the site for the whole 14 days (a backoff would retry on day 1), apex
                # and www alike.
                clock.advance(13 * DAY)
                self.assertEqual(fetcher.fetch("https://www.cfsite.example/").blocked, "challenge")
                self.assertEqual(fetcher.fetch("https://cfsite.example/contact").blocked, "challenge")
                self.assertEqual(len(transport.calls), 1)

    def test_plain_503_on_robots_is_still_the_backoff_ladder(self):
        fetcher, _, clock, _ = make({"https://www.busy.example/robots.txt": robots("", status=503)})
        self.assertEqual(fetcher.fetch("https://www.busy.example/").blocked, "backoff")
        row = [r for r in fetcher.export_host_state() if r["host"] == "busy.example"][0]
        self.assertEqual(row["blocked_reason"], "backoff")
        self.assertAlmostEqual(f._epoch(row["backoff_until"]) - clock.wall(), 1 * DAY, delta=1)


class WorkerRobotsChallengeTest(WorkerCase):
    def test_home_visit_is_blocked_by_challenge_for_14_days(self):
        bid = self.add("Example Pawn & Jewelry", "https://www.guarded.example/")
        self.web.override("https://www.guarded.example/robots.txt", CF_503.status, dict(CF_503.headers),
                          CF_503.body)
        now = self.clock.iso()
        result, outcome = self.crawl(bid)
        self.assertEqual((outcome, result.blocked), ("blocked", "challenge"))
        row = self.row(bid)
        self.assertEqual(row["website_status"], "blocked")
        self.assertEqual(row["next_crawl_at"][:13], plus_days(now, 14)[:13])
        self.assertEqual(self.web.page_requests("www.guarded.example"), [])
        self.assertEqual(self.facts_of(bid), {})


if __name__ == "__main__":
    unittest.main()

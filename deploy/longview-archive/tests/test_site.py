"""The static directory site, the site's own contract check, and the approval gate.

Everything runs offline against the fixture pipeline (tests/fixtures/e2e/),
whose businesses, phones, and domains are all fictional.

    cd deploy/longview-archive && python3 -m unittest tests.test_site -v
"""

from __future__ import annotations

import copy
import json
import logging
import re
import shutil
import tempfile
import unittest
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from unittest import mock

from longview_archive import __main__ as cli
from longview_archive import approval, config, db, publish, site, status, validate
from longview_archive.service import ArchiveService
from tests.fixtures.e2e import pipeline

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "longview_archive"
NOW = datetime(2026, 9, 24, 18, 0, 0, tzinfo=timezone.utc)
BASE = "/longview/businesses/"
CANON = "https://www.theleadflowpro.com/longview/businesses/"


class Page(HTMLParser):
    """The parts of a page the tests look at."""

    def __init__(self, text: str):
        super().__init__(convert_charrefs=True)
        self.tags: list = []  # (tag, attrs dict)
        self.h1 = 0
        self.text_parts: list = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
        if tag == "h1":
            self.h1 += 1

    handle_startendtag = handle_starttag

    def handle_data(self, data):
        self.text_parts.append(data)

    @property
    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.text_parts))

    def attrs(self, tag: str) -> list:
        return [a for t, a in self.tags if t == tag]

    def robots(self):
        for a in self.attrs("meta"):
            if a.get("name") == "robots":
                return a.get("content")
        return None


def pages(folder: Path) -> dict:
    return {str(p.relative_to(folder)): p.read_text(encoding="utf-8") for p in folder.rglob("*.html")}


def export_from_pipeline() -> dict:
    with tempfile.TemporaryDirectory(prefix="lva-site-fixture-") as tmp:
        run = pipeline.run_pipeline(Path(tmp) / "data")
        try:
            return run.export()
        finally:
            run.conn.close()


FIXTURE_EXPORT = None


def fixture_export() -> dict:
    global FIXTURE_EXPORT
    if FIXTURE_EXPORT is None:
        FIXTURE_EXPORT = export_from_pipeline()
    return copy.deepcopy(FIXTURE_EXPORT)


def by_slug(data: dict, slug: str) -> dict:
    return next(b for b in data["businesses"] if b["slug"] == slug)


def clone(record: dict, n: int, category: str = None) -> dict:
    """A bare copy of a fixture record with its own id, slug, and name (only sales-tax facts)."""
    b = copy.deepcopy(record)
    b["id"] = f"lv-zz{n:06d}"
    b["slug"] = f"fixture-shop-{n:04d}"
    b["name"] = f"Fixture Shop {n:04d}"
    if category:
        b["category"] = category
    return b


class SiteTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-site-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(data_dir=Path(self.tmp.name) / "data")

    def build(self, data, settings=None) -> dict:
        settings = settings or self.settings
        site.build_site(settings, data, NOW)
        return pages(site.site_dir(settings))

    def read(self, rel: str, settings=None) -> str:
        return (site.site_dir(settings or self.settings) / rel).read_text(encoding="utf-8")


# ---------------------------------------------------------------- the pages

class SitePages(SiteTestBase):
    def setUp(self):
        super().setUp()
        self.data = fixture_export()
        self.pages = self.build(self.data)

    def test_every_page_has_one_h1_and_no_inline_style_or_script(self):
        self.assertGreater(len(self.pages), 10)
        for rel, text in self.pages.items():
            with self.subTest(page=rel):
                parsed = Page(text)
                self.assertEqual(parsed.h1, 1)
                self.assertNotRegex(text, r"(?i)\sstyle\s*=")
                self.assertNotIn("<style", text.lower())
                for attrs in parsed.attrs("script"):
                    self.assertEqual(attrs.get("src"), BASE + "search.js")  # never an inline script
                self.assertNotRegex(text, r"(?i)\son[a-z]+\s*=")  # no event handler attributes
                self.assertEqual(Page(text).attrs("html")[0].get("lang"), "en")

    def test_assets_are_local_only(self):
        for rel, text in self.pages.items():
            parsed = Page(text)
            with self.subTest(page=rel):
                for tag, key in (("script", "src"), ("link", "href"), ("img", "src"), ("iframe", "src"),
                                 ("source", "src"), ("video", "src"), ("audio", "src"), ("embed", "src")):
                    for attrs in parsed.attrs(tag):
                        value = attrs.get(key) or ""
                        if tag == "link" and attrs.get("rel") == "canonical":
                            self.assertTrue(value.startswith(CANON), value)
                            continue
                        self.assertTrue(value.startswith("/") or value == "data:,", f"{tag} {value}")
                        self.assertFalse(value.startswith("//"))
                self.assertNotRegex(text, r"(?i)(src|href)=\"http://")
                self.assertNotIn("<img", text)
        css = self.read("directory.css")
        self.assertNotRegex(css, r"(?i)url\(|@import|https?:")
        js = self.read("search.js")
        for sink in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "Function("):
            self.assertNotIn(sink, js)
        self.assertNotRegex(js, r"https?://(?!www\.w3\.org/2000/svg)")

    def test_internal_links_resolve(self):
        folder = site.site_dir(self.settings)
        for rel, text in self.pages.items():
            for attrs in Page(text).attrs("a"):
                href = attrs.get("href") or ""
                if not href.startswith(BASE):
                    continue
                target = folder / href[len(BASE):] / "index.html" if href.endswith("/") else folder / href[len(BASE):]
                with self.subTest(page=rel, href=href):
                    self.assertTrue(target.is_file(), target)

    def test_noindex_canonical_and_footer_everywhere(self):
        for rel, text in self.pages.items():
            parsed = Page(text)
            with self.subTest(page=rel):
                self.assertEqual(parsed.robots(), "noindex,nofollow")
                canon = [a["href"] for a in parsed.attrs("link") if a.get("rel") == "canonical"]
                self.assertEqual(len(canon), 1)
                expected = CANON + ("" if rel == "index.html" else rel[: -len("index.html")])
                self.assertEqual(canon[0], expected)
                self.assertIn(site.FOOTER_RESOURCE, parsed.text)
                pitch = [a for a in parsed.attrs("a") if a.get("href") == "https://www.theleadflowpro.com/longview"]
                self.assertTrue(pitch)
                self.assertIn("Skip to the content", parsed.text)
        self.assertFalse((site.site_dir(self.settings) / "sitemap.xml").exists())

    def test_index_shows_the_real_count_links_and_search(self):
        text = self.pages["index.html"]
        parsed = Page(text)
        n = len(self.data["businesses"])
        self.assertIn(f"{n} businesses in the City of Longview", parsed.text)
        hrefs = {a.get("href") for a in parsed.attrs("a")}
        for want in (BASE + "new/", BASE + "hiring/", BASE + "about/", BASE + "category/auto/"):
            self.assertIn(want, hrefs)
        for b in self.data["businesses"]:
            self.assertIn(BASE + b["slug"] + "/", hrefs)
        # The search is one local script over search.json; without the script it stays hidden.
        section = re.search(r'<section class="band" id="search" hidden[^>]*>', text)
        self.assertIsNotNone(section)
        labels = {a.get("for") for a in parsed.attrs("label")}
        self.assertEqual(labels, {"search-q", "search-open"})
        data = json.loads(self.read("search.json"))
        self.assertEqual(len(data["businesses"]), n)
        row = next(r for r in data["businesses"] if r["slug"] == "example-taqueria")
        self.assertEqual(set(row), {"name", "slug", "category", "categoryLabel", "services", "zip", "hours"})
        bare = next(r for r in data["businesses"] if r["slug"] == "example-lawn-care")
        self.assertNotIn("zip", bare)  # no public address, no ZIP
        self.assertIsNone(bare["hours"])

    def test_category_pages(self):
        for category in self.data["categories"]:
            text = self.pages[f"category/{category['slug']}/index.html"]
            parsed = Page(text)
            with self.subTest(category=category["slug"]):
                self.assertIn(f"{category['name']} in Longview", parsed.text)
                self.assertIn(site.CATEGORY_LEAD, parsed.text)
                members = [b for b in self.data["businesses"] if b["category"] == category["slug"]]
                self.assertEqual(sum(1 for a in parsed.attrs("li") if a.get("class") == "card"), len(members))
        self.assertIn("3 businesses", Page(self.pages["category/auto/index.html"]).text)

    def test_full_profile(self):
        text = self.pages["example-tire-and-lube/index.html"]
        parsed = Page(text)
        b = by_slug(self.data, "example-tire-and-lube")
        self.assertIn('<svg class="cover"', text)
        self.assertRegex(text, r'<svg class="cover"[^>]*aria-hidden="true"')
        self.assertIn("Auto", parsed.text)
        self.assertIn("500 Example St, Longview, TX 75602", parsed.text)
        links = {a.get("href"): a for a in parsed.attrs("a")}
        maps = [h for h in links if h.startswith("https://www.google.com/maps/search/?api=1&query=")]
        self.assertEqual(len(maps), 1)
        self.assertEqual(links[maps[0]].get("rel"), "nofollow noopener noreferrer")
        self.assertEqual(links[b["website"]["url"]].get("rel"), "nofollow noopener noreferrer")
        self.assertIn("tel:+19035550110", links)
        self.assertIn("mailto:info@exampletire.example", links)
        self.assertIn("https://www.facebook.com/exampletireandlube", links)
        # Hours: stated days only; "Closed" only for the day the business states closed.
        self.assertIn("Monday 7:30 AM – 6:00 PM", parsed.text)
        self.assertIn("Saturday 8:00 AM – 2:00 PM", parsed.text)
        self.assertIn("Sunday Closed", parsed.text)
        self.assertNotIn("Hours not listed for other days", parsed.text)
        self.assertIn("Texas sales-tax permit on file since February 2015", parsed.text)
        self.assertIn("Sources and checks", parsed.text)
        for fact in b["facts"]:
            self.assertIn(site.FIELD_LABELS[fact["field"]], parsed.text)
        self.assertIn("checked Sep 24, 2026", parsed.text)
        self.assertIn(site.DISCLAIMER, parsed.text)
        claim = [h for h in links if h.startswith("mailto:hello@theleadflowpro.com?subject=")]
        self.assertEqual(len(claim), 1)
        self.assertIn("Longview%20directory%3A%20Example%20Tire%20%26%20Lube%20%28" + b["id"] + "%29", claim[0])
        self.assertIn("Claim, correct, or remove this listing", parsed.text)
        self.assertIn("Own this business?", parsed.text)
        self.assertIn("https://www.theleadflowpro.com/longview", links)

    def test_stated_days_only_and_hiring_roles(self):
        parsed = Page(self.pages["example-taqueria/index.html"])
        self.assertIn("Hours not listed for other days.", parsed.text)
        self.assertNotIn("Closed", parsed.text)
        self.assertNotIn("Sunday", parsed.text)
        dental = Page(self.pages["example-family-dental/index.html"])
        self.assertIn("Roles mentioned there: Front desk, Receptionist.", dental.text)
        self.assertIn("Careers page on examplefamilydental.example", dental.text)
        self.assertIn("Friday 8:00 AM – 12:00 PM", dental.text)
        hiring = Page(self.pages["hiring/index.html"])
        self.assertIn("Longview is hiring", hiring.text)
        self.assertIn("Example Family Dental", hiring.text)
        self.assertIn("Roles mentioned: Front desk, Receptionist", hiring.text)

    def test_bare_profile_fallbacks(self):
        parsed = Page(self.pages["example-lawn-care/index.html"])
        self.assertIn("Longview, TX", parsed.text)
        self.assertNotRegex(parsed.text, r"TX \d{5}")
        for line in ("No website found yet.", "No phone number listed on a website we could verify.",
                     "Hours not listed."):
            self.assertIn(line, parsed.text)
        self.assertNotIn("mailto:info@", self.pages["example-lawn-care/index.html"])
        self.assertIn("Directions", parsed.text)
        self.assertIn(site.DISCLAIMER, parsed.text)
        for field in ("Business name", "Category", "Sales-tax permit date"):
            self.assertIn(field, parsed.text)
        self.assertNotIn("Phone checked", parsed.text)

    def test_about_new_and_empty_lists(self):
        about = Page(self.pages["about/index.html"])
        self.assertIn(config.USER_AGENT, about.text)
        self.assertIn("At most 2 sites at a time.", about.text)
        self.assertIn("At least 20 seconds between requests to the same site.", about.text)
        self.assertIn("At most 6 pages per visit.", about.text)
        self.assertIn("At most 2.5 MB per page.", about.text)
        self.assertIn("User-agent: LeadFlowPro-LongviewArchive Disallow: /", about.text)
        self.assertIn("Claim, correct, or remove a listing", about.text)
        self.assertIn(site.DISCLAIMER, about.text)
        self.assertIn("OpenStreetMap contributors", about.text)
        self.assertIn("Active Sales Tax Permit Holders", about.text)
        new = Page(self.pages["new/index.html"])
        self.assertIn("New in Longview", new.text)
        self.assertIn("No new sales-tax permits in this window", new.text)

    def test_new_in_longview_is_newest_first_within_180_days(self):
        data = fixture_export()
        base = by_slug(data, "example-lawn-care")
        for n, since in ((1, "2026-09-01"), (2, "2026-05-01"), (3, "2025-01-01")):
            b = clone(base, n)
            b["permitSince"] = since
            data["businesses"].append(b)
        text = Page(self.build(data)["new/index.html"]).text
        self.assertLess(text.index("Fixture Shop 0001"), text.index("Fixture Shop 0002"))
        self.assertNotIn("Fixture Shop 0003", text)
        self.assertIn("Permit on file since Sep 1, 2026", text)

    def test_sample_banner(self):
        self.assertNotIn(site.SAMPLE_BANNER, self.pages["index.html"])
        data = fixture_export()
        data["sample"] = True
        for rel, text in self.build(data).items():
            with self.subTest(page=rel):
                self.assertIn(site.SAMPLE_BANNER, Page(text).text)


class Pagination(SiteTestBase):
    def test_fifty_per_page_with_plain_links(self):
        data = fixture_export()
        base = by_slug(data, "example-lawn-care")
        data["businesses"] += [clone(base, n) for n in range(1, 111)]  # 120 in all
        built = self.build(data)
        self.assertIn("index.html", built)
        self.assertIn("page-2/index.html", built)
        self.assertIn("page-3/index.html", built)
        self.assertNotIn("page-4/index.html", built)
        second = Page(built["page-2/index.html"])
        self.assertIn("Showing 51 to 100 of 120.", second.text)
        self.assertIn("Page 2 of 3", second.text)
        rels = {a.get("rel"): a.get("href") for a in second.attrs("a") if a.get("rel") in ("prev", "next")}
        self.assertEqual(rels, {"prev": BASE, "next": BASE + "page-3/"})
        self.assertEqual(sum(1 for a in second.attrs("li") if a.get("class") == "card"), 50)
        self.assertEqual(sum(1 for a in Page(built["page-3/index.html"]).attrs("li") if a.get("class") == "card"), 20)
        self.assertNotIn("search.js", built["page-2/index.html"])  # the search lives on the first page
        # Category pages paginate the same way (lawn care is home services: 1 + 110).
        self.assertIn("category/home-services/page-3/index.html", built)
        self.assertIn("111 businesses", Page(built["category/home-services/index.html"]).text)
        # A to Z with numbers in number order.
        names = [a for a in re.findall(r'class="card-name"><a href="[^"]+">([^<]+)<', built["index.html"])]
        self.assertEqual(names, sorted(names, key=lambda n: site.name_key({"name": n, "slug": ""})))


class Escaping(SiteTestBase):
    PAYLOAD_NAME = 'Evil <script>alert(1)</script> "><img src=x onerror=alert(2)> Shop'
    PAYLOAD_SERVICE = '"><img src=x onerror=alert(3)><script>alert(4)</script>'

    def planted(self) -> dict:
        data = fixture_export()
        b = by_slug(data, "example-taqueria")
        b["name"] = self.PAYLOAD_NAME
        b["services"] = [self.PAYLOAD_SERVICE, "tacos"]
        b["categoryLabel"] = "<b>bold</b>"
        return data

    def assert_no_markup(self, text: str):
        """No planted tag or attribute survived: only the page's own tags are in the parse."""
        self.assertNotIn("<script>alert", text)
        self.assertNotIn("<img", text)
        self.assertNotIn("<b>", text)
        parsed = Page(text)
        self.assertFalse([t for t, _ in parsed.tags if t in ("img", "b")])
        self.assertFalse([a for _, a in parsed.tags if "onerror" in a or "src" in a and a.get("src") == "x"])
        for attrs in parsed.attrs("script"):
            self.assertEqual(attrs.get("src"), BASE + "search.js")

    def test_renderer_escapes_every_value(self):
        # The renderer on its own (no contract check first) must still escape.
        files = site.render_site(self.planted(), self.settings)
        profile = files["example-taqueria/index.html"]
        self.assert_no_markup(profile)
        self.assertIn("Evil &lt;script&gt;alert(1)&lt;/script&gt; &quot;&gt;&lt;img src=x onerror=alert(2)&gt; Shop",
                      profile)
        self.assertIn("&quot;&gt;&lt;img src=x onerror=alert(3)&gt;&lt;script&gt;alert(4)&lt;/script&gt;", profile)
        self.assertIn("&lt;b&gt;bold&lt;/b&gt;", profile)
        title = re.search(r"<title>(.*?)</title>", profile).group(1)
        self.assertNotIn("<", title)
        for rel, text in files.items():
            if rel.endswith(".html"):
                with self.subTest(page=rel):
                    self.assert_no_markup(text)
                    self.assertEqual(Page(text).h1, 1)
        # search.json is data for textContent; it is valid JSON with the raw string.
        data = json.loads(files["search.json"])
        self.assertIn(self.PAYLOAD_NAME, [r["name"] for r in data["businesses"]])
        self.assertNotIn("innerHTML", files["search.js"])

    def test_contract_check_drops_markup_before_rendering(self):
        built = self.build(self.planted())
        self.assertNotIn("example-taqueria/index.html", built)
        for text in built.values():
            self.assertNotIn("alert(", text)
        self.assertNotIn("alert(", self.read("search.json"))

    def test_plain_punctuation_is_escaped_not_dropped(self):
        data = fixture_export()
        b = by_slug(data, "example-taqueria")
        b["name"] = 'Tom & Jerry\'s "Best" Tacos <3'
        built = self.build(data)
        profile = built["example-taqueria/index.html"]
        self.assertIn("<h1>Tom &amp; Jerry&#x27;s &quot;Best&quot; Tacos &lt;3</h1>", profile)
        self.assertIn("Tom%20%26%20Jerry%27s%20%22Best%22%20Tacos%20%3C3", profile)  # in the claim mailto

    def test_only_http_links_are_rendered(self):
        data = self.planted()
        b = by_slug(data, "example-tire-and-lube")
        b["social"]["facebook"] = "javascript:alert(1)//facebook.com"
        files = site.render_site(data, self.settings)
        self.assertNotIn("javascript:", files["example-tire-and-lube/index.html"])


# ---------------------------------------------------------------- indexing and empty batches

class Indexing(SiteTestBase):
    def test_indexable_drops_noindex_and_writes_a_sitemap(self):
        settings = config.Settings(data_dir=Path(self.tmp.name) / "idx", indexable=True)
        built = self.build(fixture_export(), settings)
        self.assertIsNone(Page(built["index.html"]).robots())
        self.assertIsNone(Page(built["category/auto/index.html"]).robots())
        self.assertIsNone(Page(built["example-tire-and-lube/index.html"]).robots())
        # A profile with no fact from the business's own website stays out of search.
        self.assertEqual(Page(built["example-lawn-care/index.html"]).robots(), "noindex,nofollow")
        sitemap = self.read("sitemap.xml", settings)
        self.assertIn(f"<loc>{CANON}</loc>", sitemap)
        self.assertIn(f"<loc>{CANON}example-tire-and-lube/</loc>", sitemap)
        self.assertIn(f"<loc>{CANON}category/auto/</loc>", sitemap)
        self.assertNotIn("example-lawn-care", sitemap)

    def test_sample_data_is_never_indexable(self):
        settings = config.Settings(data_dir=Path(self.tmp.name) / "idx", indexable=True)
        data = fixture_export()
        data["sample"] = True
        built = self.build(data, settings)
        self.assertEqual(Page(built["index.html"]).robots(), "noindex,nofollow")
        self.assertFalse((site.site_dir(settings) / "sitemap.xml").exists())


class EmptyBatch(SiteTestBase):
    def test_zero_businesses_builds_only_the_index_and_about(self):
        data = fixture_export()
        data["businesses"] = []
        data["categories"] = []
        for export in (data, None):
            with self.subTest(export="empty" if export else "none approved"):
                built = self.build(export)
                self.assertEqual(set(built), {"index.html", "about/index.html"})
                files = {str(p.relative_to(site.site_dir(self.settings)))
                         for p in site.site_dir(self.settings).rglob("*") if p.is_file()}
                self.assertEqual(files, {"index.html", "about/index.html", "directory.css"})
                index = Page(built["index.html"])
                self.assertIn("The first batch is being checked", index.text)
                self.assertEqual(index.h1, 1)
                self.assertNotIn("search.js", built["index.html"])
                self.assertIn("No batch has been published yet", Page(built["about/index.html"]).text)


# ---------------------------------------------------------------- the contract check

class Validator(unittest.TestCase):
    def setUp(self):
        self.data = fixture_export()

    def check(self, mutate) -> list:
        data = copy.deepcopy(self.data)
        mutate(by_slug(data, "example-tire-and-lube"))
        result = validate.validate_directory(data)
        return result.dropped

    def test_the_fixture_passes_untouched(self):
        result = validate.validate_directory(self.data)
        self.assertEqual(result.dropped, [])
        self.assertEqual(result.issues, [])
        self.assertEqual(len(result.directory["businesses"]), len(self.data["businesses"]))

    def test_bad_records_are_dropped_with_a_reason(self):
        tire = by_slug(self.data, "example-tire-and-lube")

        def personal_email(b):
            b["email"] = "jsmith@exampletire.example"

        def off_domain_fact(b):
            next(f for f in b["facts"] if f["field"] == "phone")["url"] = "https://www.yelp.example/biz/tire"

        def street_without_zip(b):
            b["address"]["zip"] = None

        def reserved_slug(b):
            b["slug"] = "about"

        def page_slug(b):
            b["slug"] = "page-2"

        def phone_from_state_record(b):
            next(f for f in b["facts"] if f["field"] == "phone")["source"] = "tx_sales_tax"

        def missing_fact(b):
            b["facts"] = [f for f in b["facts"] if f["field"] != "hours"]

        def email_on_other_domain(b):
            b["email"] = "info@another.example"

        def outside_longview(b):
            b["address"]["city"] = "Kilgore"

        cases = {
            personal_email: "email_not_generic",
            off_domain_fact: "website_fact_off_site:phone",
            street_without_zip: "address_street_and_zip_must_match",
            reserved_slug: "reserved_slug",
            page_slug: "reserved_slug",
            phone_from_state_record: "fact_not_from_website:phone",
            missing_fact: "missing_fact:hours",
            email_on_other_domain: "email_off_domain",
            outside_longview: "address_outside_longview",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                self.assertEqual(self.check(mutate), [(tire["id"], reason)])

    def test_build_drops_bad_records_and_logs_counts_only(self):
        data = copy.deepcopy(self.data)
        by_slug(data, "example-tire-and-lube")["email"] = "jsmith@exampletire.example"
        by_slug(data, "example-taqueria")["slug"] = "hiring"
        with tempfile.TemporaryDirectory() as tmp:
            settings = config.Settings(data_dir=Path(tmp))
            with self.assertLogs("longview_archive.site", level="WARNING") as logs:
                counts = site.build_site(settings, data, NOW)
            self.assertEqual(counts["dropped"], 2)
            self.assertEqual(counts["businesses"], len(data["businesses"]) - 2)
            built = pages(site.site_dir(settings))
            self.assertNotIn("example-tire-and-lube/index.html", built)
            self.assertIn("Hiring", Page(built["hiring/index.html"]).text)  # the real page, not the business
            joined = " ".join(logs.output)
            self.assertIn("2 record(s)", joined)
            for secret in ("jsmith", "Example Tire", "Taqueria", "exampletire"):
                self.assertNotIn(secret, joined)
            index = Page(built["index.html"])
            self.assertIn(f"{len(data['businesses']) - 2} businesses", index.text)

    def test_unknown_schema_is_never_half_read(self):
        data = copy.deepcopy(self.data)
        data["schemaVersion"] = 2
        self.assertEqual(validate.validate_directory(data).directory["businesses"], [])
        self.assertEqual(validate.validate_directory("nope").directory["businesses"], [])


# ---------------------------------------------------------------- atomic swap

class AtomicSwap(SiteTestBase):
    def test_a_failed_build_leaves_the_previous_site(self):
        first = fixture_export()
        self.build(first)
        link = site.site_dir(self.settings)
        self.assertTrue(link.is_symlink())
        target = link.resolve()
        before = self.read("index.html")
        second = fixture_export()
        second["businesses"] = second["businesses"][:3]
        calls = {"n": 0}
        real_write = site._write_file

        def failing(folder, rel, text):
            calls["n"] += 1
            if calls["n"] == 5:
                raise OSError("disk full")
            real_write(folder, rel, text)

        with mock.patch.object(site, "_write_file", failing):
            with self.assertRaises(OSError):
                site.build_site(self.settings, second, NOW)
        self.assertEqual(link.resolve(), target)
        self.assertEqual(self.read("index.html"), before)
        builds = sorted(p.name for p in (site.site_root(self.settings) / ".builds").iterdir())
        self.assertEqual(builds, [target.name])
        leftovers = [p.name for p in site.site_root(self.settings).iterdir() if p.name.startswith(".businesses-")]
        self.assertEqual(leftovers, [])

    def test_rebuilds_swap_and_keep_two_builds(self):
        data = fixture_export()
        for _ in range(4):
            self.build(data)
        builds = list((site.site_root(self.settings) / ".builds").iterdir())
        self.assertEqual(len(builds), 2)
        self.assertIn(site.site_dir(self.settings).resolve(), [p.resolve() for p in builds])
        mode = (site.site_dir(self.settings) / "index.html").stat().st_mode & 0o777
        self.assertEqual(mode, 0o644)
        self.assertEqual(site.site_dir(self.settings).resolve().stat().st_mode & 0o777, 0o755)

    def test_a_plain_folder_from_an_older_layout_is_replaced(self):
        old = site.site_dir(self.settings)
        old.mkdir(parents=True)
        (old / "index.html").write_text("old")
        self.build(fixture_export())
        self.assertTrue(site.site_dir(self.settings).is_symlink())
        self.assertIn("Longview businesses", self.read("index.html"))


# ---------------------------------------------------------------- the approval gate

class ApprovalGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-approval-")
        self.addCleanup(self.tmp.cleanup)
        self.run_ = pipeline.run_pipeline(Path(self.tmp.name) / "data")
        self.addCleanup(self.run_.conn.close)
        self.conn = self.run_.conn
        self.settings = self.run_.settings
        self.export = self.run_.export()
        self.names = [b["name"] for b in self.export["businesses"]]

    def site_text(self) -> str:
        return " ".join(pages(site.site_dir(self.settings)).values())

    def write_export(self, data: dict) -> None:
        publish.write_export(self.settings.publish_export_path, data)

    def test_nothing_is_public_until_approved(self):
        self.assertFalse(self.settings.approved_export_path.exists())
        approval.rebuild_site(self.conn, self.settings, NOW)
        text = self.site_text()
        self.assertIn("The first batch is being checked", text)
        for name in self.names:
            self.assertNotIn(html_name(name), text)
        # Auto-approve is off by default, so a fresh export changes nothing.
        self.assertFalse(approval.auto_enabled(self.conn))
        self.assertEqual(approval.auto_approve(self.conn, self.settings, NOW), {"status": "off"})
        self.assertFalse(self.settings.approved_export_path.exists())
        info = approval.status_info(self.conn, self.settings)
        self.assertIsNone(info["approvedBatchId"])
        self.assertEqual(info["waiting"]["added"], len(self.names))

    def test_approve_publishes_and_records_who(self):
        result = approval.approve(self.conn, self.settings, actor="Amanda", now=NOW)
        self.assertEqual(result["businesses"], len(self.names))
        approved = json.loads(self.settings.approved_export_path.read_text())
        self.assertEqual(approved["batchId"], self.export["batchId"])
        text = self.site_text()
        for name in self.names:
            self.assertIn(html_name(name), text)
        run = self.conn.execute("SELECT status, counts_json FROM runs WHERE kind='approve'").fetchone()
        self.assertEqual(run["status"], "ok")
        counts = json.loads(run["counts_json"])
        self.assertEqual((counts["actor"], counts["auto"], counts["added"]), ("Amanda", 0, len(self.names)))
        self.assertEqual(db.get_meta(self.conn, "approved_by"), "Amanda")
        info = approval.status_info(self.conn, self.settings)
        self.assertEqual(info["approvedBatchId"], self.export["batchId"])
        self.assertIsNone(info["waiting"])
        self.assertEqual(info["shownBusinesses"], len(self.names))

    def test_refusals(self):
        with self.assertRaises(approval.ApprovalError) as ctx:
            approval.approve(self.conn, self.settings, batch="2020-01-01T00:00Z", now=NOW)
        self.assertEqual(ctx.exception.reason, "batch_mismatch")
        approval.approve(self.conn, self.settings, batch=self.export["batchId"], now=NOW)  # the exact id is fine
        sample = dict(self.export, sample=True)
        self.write_export(sample)
        with self.assertRaises(approval.ApprovalError) as ctx:
            approval.approve(self.conn, self.settings, now=NOW)
        self.assertEqual(ctx.exception.reason, "sample")
        self.settings.publish_export_path.unlink()
        with self.assertRaises(approval.ApprovalError) as ctx:
            approval.approve(self.conn, self.settings, now=NOW)
        self.assertEqual(ctx.exception.reason, "no_export")

    def test_auto_approve_and_the_large_removal_hold(self):
        approval.approve(self.conn, self.settings, now=NOW)
        approval.set_auto(self.conn, True)
        self.assertEqual(approval.auto_approve(self.conn, self.settings, NOW)["status"], "same")

        # A small change is approved by itself.
        smaller = copy.deepcopy(self.export)
        smaller["businesses"] = smaller["businesses"][1:]
        smaller["batchId"] = "2026-09-24T19:00Z"
        self.write_export(smaller)
        result = approval.auto_approve(self.conn, self.settings, NOW)
        self.assertEqual(result["status"], "approved")
        self.assertEqual(result["removed"], 1)
        self.assertEqual(json.loads(self.settings.approved_export_path.read_text())["batchId"], "2026-09-24T19:00Z")
        self.assertEqual(db.get_meta(self.conn, "approved_by"), approval.AUTO_ACTOR)

        # Removing more than a quarter waits for a person.
        much = copy.deepcopy(smaller)
        much["businesses"] = much["businesses"][:5]  # 9 -> 5 removes 4 (44%)
        much["batchId"] = "2026-09-24T20:00Z"
        self.write_export(much)
        result = approval.auto_approve(self.conn, self.settings, NOW)
        self.assertEqual((result["status"], result["removed"], result["approved"]), ("held", 4, 9))
        self.assertEqual(json.loads(self.settings.approved_export_path.read_text())["batchId"], "2026-09-24T19:00Z")
        approval.auto_approve(self.conn, self.settings, NOW)  # the same held batch is recorded once
        held_runs = self.conn.execute("SELECT COUNT(*) FROM runs WHERE kind='approve' AND status='skipped'").fetchone()[0]
        self.assertEqual(held_runs, 1)
        info = approval.status_info(self.conn, self.settings)
        self.assertEqual(info["heldForPerson"], {"batchId": "2026-09-24T20:00Z", "removed": 4, "approved": 9})
        page = status.render_html(status.collect(self.conn, self.settings, NOW))
        self.assertIn("Auto-approve is holding batch 2026-09-24T20:00Z", page)
        self.assertIn("Waiting for approval", page)
        self.assertIn("0 new, 4 removed, 0 changed", page)

        # A person approves it; the hold clears.
        approval.approve(self.conn, self.settings, actor="Ryan", now=NOW)
        self.assertIsNone(approval.status_info(self.conn, self.settings)["heldForPerson"])
        self.assertEqual(len(json.loads(self.settings.approved_export_path.read_text())["businesses"]), 5)

    def test_suppress_takes_effect_at_once(self):
        approval.approve(self.conn, self.settings, now=NOW)
        target = by_slug(self.export, "example-taqueria")
        self.assertTrue((site.site_dir(self.settings) / "example-taqueria" / "index.html").exists())
        args = cli.build_parser().parse_args(["suppress", "--id", target["id"], "--reason", "owner asked"])
        with mock.patch.object(cli, "out"):  # the command opens its own connection, as on the droplet
            self.assertEqual(args.handler(args, self.settings), 0)
        approved = json.loads(self.settings.approved_export_path.read_text())
        self.assertNotIn(target["id"], [b["id"] for b in approved["businesses"]])
        self.assertEqual(approved["counts"]["published"], len(self.names) - 1)
        self.assertFalse((site.site_dir(self.settings) / "example-taqueria").exists())
        self.assertNotIn("Example Taqueria", self.site_text())
        self.assertNotIn("example-taqueria", self.read_search())

    def test_every_build_filters_suppressions_even_from_an_old_approved_file(self):
        approval.approve(self.conn, self.settings, now=NOW)
        target = by_slug(self.export, "example-barber-shop")
        pipeline.suppress(self.conn, "domain", "barbershop.example", "owner asked", "2026-09-24T18:00:00Z")
        approval.rebuild_site(self.conn, self.settings, NOW)
        self.assertFalse((site.site_dir(self.settings) / target["slug"]).exists())

    def test_service_builds_the_site_and_auto_approves_after_an_export(self):
        service = ArchiveService(self.settings)
        service.conn = self.conn
        report = {"published": None}
        service._site_step(NOW, report)
        self.assertEqual(report["site"], 0)  # nothing approved yet: the "being checked" page
        self.assertTrue(site.site_exists(self.settings))
        report = {"published": {"published": 10}}
        service._site_step(NOW, report)
        self.assertNotIn("site", report)  # already built, same indexing switch
        service._approval_step(NOW, report)
        self.assertEqual(report["approval"], "off")
        approval.set_auto(self.conn, True)
        service._approval_step(NOW, report)
        self.assertEqual(report["approval"], "approved")
        self.assertIn("Example Taqueria", self.site_text())

    def read_search(self) -> str:
        return (site.site_dir(self.settings) / "search.json").read_text()


def html_name(name: str) -> str:
    import html as _html
    return _html.escape(name, quote=True)


class CommandLine(unittest.TestCase):
    def test_approve_and_site_commands_exist_and_publish_pr_is_gone(self):
        parser = cli.build_parser()
        args = parser.parse_args(["approve"])
        self.assertEqual((args.batch, args.auto, args.actor), ("latest", None, None))
        args = parser.parse_args(["approve", "--batch", "latest", "--actor", "Amanda"])
        self.assertEqual(args.actor, "Amanda")
        self.assertEqual(parser.parse_args(["approve", "--auto", "on"]).auto, "on")
        self.assertTrue(callable(parser.parse_args(["site"]).handler))
        with self.assertRaises(SystemExit), mock.patch("sys.stderr"):
            parser.parse_args(["publish-pr"])


class NoCodeHostCalls(unittest.TestCase):
    """The engine deploys nothing anywhere: no GitHub, no Vercel, no code host at all."""

    def test_no_github_or_vercel_in_the_engine(self):
        offenders = []
        for path in PACKAGE.rglob("*.py"):
            text = path.read_text(encoding="utf-8").lower()
            for needle in ("github", "vercel", "api.github.com", "pull request", "gitlab", "bitbucket"):
                if needle in text:
                    offenders.append(f"{path.relative_to(ROOT)}: {needle}")
        self.assertEqual(offenders, [])
        self.assertFalse((PACKAGE / "github_pr.py").exists())
        self.assertFalse(any(name.startswith(("github", "publish_pr")) for name in vars(config.Settings())))

    def test_no_github_settings_or_env(self):
        settings = config.load_settings({"LVA_GITHUB_TOKEN_FILE": "/tmp/x", "LVA_PUBLISH_PR_EVERY": "1"})
        self.assertFalse(any("github" in f or "publish_pr" in f for f in settings.__dataclass_fields__))


if __name__ == "__main__":
    unittest.main()

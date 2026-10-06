"""What search engines read, and that none of it exists while indexing is off.

With ``settings.indexable`` off (the default, and always for sample data) the
pages must be exactly what they were before this markup existed. With it on, an
indexable profile is a schema.org LocalBusiness whose microdata, read back the
way a search engine reads it, equals ``site.ld_dict``: name and town, street and
ZIP only when shown, contact values and hours only from the business's own
website, never a rating, a review, or coordinates.

    cd deploy/longview-archive && python3 -m unittest tests.test_seo -v
"""

from __future__ import annotations

import copy
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

from longview_archive import config, places, site
from tests import test_site as T

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
MARKUP = ("itemscope", "itemprop", "itemtype", "og:", "theme-color", site.ICON_NAME)
LISTS = ("sameAs", "openingHours")
FORBIDDEN = re.compile(r"aggregateRating|review|geo|GeoCoordinates|latitude|longitude|ratingValue", re.I)


# ---------------------------------------------------------------- reading microdata back

class Node:
    def __init__(self, tag: str, attrs: dict, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, attrs, parent, []

    def text(self) -> str:
        return "".join(c if isinstance(c, str) else c.text() for c in self.children)


class Tree(HTMLParser):
    def __init__(self, html: str):
        super().__init__(convert_charrefs=True)
        self.root = self.cur = Node("#root", {})
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs), self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, dict(attrs), self.cur))

    def handle_endtag(self, tag):
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.cur = node.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def _value(node: Node):
    if "itemscope" in node.attrs:
        return read_item(node)
    if node.tag == "meta":
        return node.attrs.get("content", "")
    if node.tag in ("a", "link"):
        return node.attrs.get("href", "")
    return node.text()


def read_item(scope: Node) -> dict:
    """The properties of one item, as the microdata algorithm collects them."""
    props: dict = {"@type": scope.attrs.get("itemtype", "").rsplit("/", 1)[-1]}

    def walk(node: Node):
        for child in node.children:
            if isinstance(child, str):
                continue
            if "itemprop" in child.attrs:
                props.setdefault(child.attrs["itemprop"], []).append(_value(child))
            if "itemscope" not in child.attrs:
                walk(child)
    walk(scope)
    return props


def items(html: str) -> list:
    """Every top-level item on a page (an itemscope that is nobody's property)."""
    found = []

    def walk(node: Node):
        for child in node.children:
            if isinstance(child, str):
                continue
            if "itemscope" in child.attrs and "itemprop" not in child.attrs:
                found.append(read_item(child))
            walk(child)
    walk(Tree(html).root)
    return found


def as_ld(item: dict) -> dict:
    """A LocalBusiness item in ld_dict's shape (lists only where schema.org repeats a property)."""
    out = {"@context": "https://schema.org", "@type": item["@type"]}
    for key, values in item.items():
        if key == "@type":
            continue
        values = [as_address(v) if isinstance(v, dict) else v for v in values]
        out[key] = values if key in LISTS else (values[0] if len(values) == 1 else values)
    return out


def as_address(item: dict) -> dict:
    out = {"@type": item["@type"]}
    out.update({k: v[0] for k, v in item.items() if k != "@type"})
    return out


# ---------------------------------------------------------------- builds

def build(data, folder: Path, **kwargs):
    settings = config.Settings(data_dir=folder, **kwargs)
    site.build_site(settings, data, T.NOW)
    return settings


def files_of(settings) -> dict:
    """Every served file (the towns' sections and the hub) by its path under www/."""
    www = Path(settings.www_dir)
    out = {}
    for top in sorted(www.iterdir()):
        served = top if top.name == site.HUB_DIR else top / "businesses"
        if served.is_dir():
            for f in served.rglob("*"):
                if f.is_file():
                    out[str(f.relative_to(www))] = f.read_text(encoding="utf-8")
    return out


def normalise(html: str) -> str:
    """A page with everything the switch adds taken away, so the two builds can be compared."""
    html = re.sub(r'<meta name="robots"[^>]*>\n', "", html)
    html = re.sub(r'<meta (?:name="theme-color"|property="og:[a-z]+")[^>]*>\n', "", html)
    html = re.sub(r'<link rel="icon" href="[^"]*"( type="image/svg\+xml")?>', '<link rel="icon" href="data:,">', html)
    html = re.sub(r"<meta itemprop=[^>]*>", "", html)
    html = re.sub(r' item(?:prop|type)="[^"]*"| itemscope', "", html)
    return html.replace("<span>", "").replace("</span>", "")


class SwitchOff(unittest.TestCase):
    """Indexing off: not one attribute, tag, or file of it."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-seo-off-")
        self.addCleanup(self.tmp.cleanup)

    def assert_clean(self, settings):
        files = files_of(settings)
        self.assertTrue(files)
        for rel, text in files.items():
            self.assertFalse(rel.endswith(site.ICON_NAME), rel)
            self.assertFalse(rel.endswith("sitemap.xml"), rel)
            if rel.endswith(".html"):
                for needle in MARKUP:
                    self.assertNotIn(needle, text, f"{rel}: {needle}")
                self.assertIn('<link rel="icon" href="data:,">', text, rel)
                self.assertIn('<meta name="robots" content="noindex,nofollow">', text, rel)

    def test_default_build_has_none_of_it(self):
        self.assert_clean(build(T.fixture_export(), Path(self.tmp.name) / "a"))

    def test_default_ring_build_and_hub_have_none_of_it(self):
        from tests import test_places as TP
        self.assert_clean(build(TP.ring_export(), Path(self.tmp.name) / "b", places=TP.RING))

    def test_sample_data_never_gets_it_even_with_the_switch_on(self):
        data = T.fixture_export()
        data["sample"] = True
        self.assert_clean(build(data, Path(self.tmp.name) / "c", indexable=True))

    def test_the_markup_only_adds_never_changes_what_a_visitor_sees(self):
        off = files_of(build(T.fixture_export(), Path(self.tmp.name) / "off"))
        on = files_of(build(T.fixture_export(), Path(self.tmp.name) / "on", indexable=True))
        pages = sorted(rel for rel in off if rel.endswith(".html"))
        self.assertEqual(pages, sorted(rel for rel in on if rel.endswith(".html")))
        for rel in pages:
            with self.subTest(page=rel):
                self.assertEqual(normalise(on[rel]), normalise(off[rel]))
        self.assertEqual(set(on) - set(off), {"longview/businesses/sitemap.xml", "longview/businesses/icon.svg"})


class SwitchOn(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="lva-seo-on-")
        cls.data = T.fixture_export()
        cls.settings = build(copy.deepcopy(cls.data), Path(cls.tmp.name) / "on", indexable=True)
        cls.files = files_of(cls.settings)
        cls.d = site.Directory(site.place_directory(cls.data, places.LONGVIEW), cls.settings)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def page(self, rel: str) -> str:
        return self.files[f"longview/businesses/{rel}"]

    def test_every_indexable_profile_says_what_ld_dict_says(self):
        checked = 0
        for b in self.d.businesses:
            html = self.page(f"{b['slug']}/index.html")
            found = [i for i in items(html) if i["@type"] == "LocalBusiness"]
            with self.subTest(slug=b["slug"]):
                if self.d.profile_indexable(b):
                    self.assertEqual(len(found), 1)
                    self.assertEqual(as_ld(found[0]), site.ld_dict(self.d, b))
                    checked += 1
                else:  # no fact from its own website: no markup of any kind
                    self.assertEqual(found, [])
                    self.assertNotIn("itemscope", html)
                    self.assertNotIn("og:", html)
        self.assertGreaterEqual(checked, 5)
        self.assertIn("itemscope", self.page("example-tire-and-lube/index.html"))
        self.assertNotIn("itemscope", self.page("example-lawn-care/index.html"))

    def test_the_full_profile_carries_every_kind_of_value(self):
        ld = site.ld_dict(self.d, T.by_slug(self.data, "example-tire-and-lube"))
        self.assertEqual(ld["address"]["streetAddress"], "500 Example St")
        self.assertEqual(ld["address"]["postalCode"], "75602")
        self.assertEqual(ld["telephone"], "+19035550110")
        self.assertEqual(ld["url"], "https://www.exampletire.example/")
        self.assertEqual(ld["sameAs"], ["https://www.facebook.com/exampletireandlube"])
        self.assertEqual(ld["openingHours"][0], "Mo 07:30-18:00")
        self.assertNotIn("Su", " ".join(ld["openingHours"]))  # stated closed on Sunday: said nowhere

    def test_never_a_rating_a_review_or_coordinates(self):
        for rel, text in self.files.items():
            for attr in re.findall(r'item(?:prop|type)="([^"]*)"', text):
                self.assertNotRegex(attr, FORBIDDEN, rel)
        for b in self.d.businesses:
            self.assertFalse(set(site.ld_dict(self.d, b)) & {"aggregateRating", "review", "geo"})
        self.assertNotIn("<script>", "".join(self.files.values()))
        self.assertNotIn("application/ld+json", "".join(self.files.values()))

    def test_breadcrumbs_match_the_trail_a_visitor_sees(self):
        html = self.page("category/auto/index.html")
        crumbs = [i for i in items(html) if i["@type"] == "BreadcrumbList"]
        self.assertEqual(len(crumbs), 1)
        trail = crumbs[0]["itemListElement"]
        self.assertEqual([c["position"] for c in trail], [["1"], ["2"]])
        self.assertEqual(trail[0]["item"], [T.BASE])
        self.assertEqual(trail[0]["name"], ["Longview businesses"])
        self.assertNotIn("item", trail[1])  # the page itself: a name, no link
        self.assertNotIn("BreadcrumbList", self.page("example-lawn-care/index.html"))

    def test_share_tags_theme_and_icon_on_indexable_pages_only(self):
        index = T.Page(self.page("index.html"))
        meta = {a.get("property") or a.get("name"): a.get("content") for a in index.attrs("meta")}
        canonical = next(a["href"] for a in index.attrs("link") if a.get("rel") == "canonical")
        self.assertEqual(meta["og:url"], canonical)
        self.assertEqual(meta["og:type"], "website")
        self.assertEqual(meta["theme-color"], site.THEME_COLOR)
        self.assertTrue(meta["og:title"] and meta["og:description"])
        icon = next(a for a in index.attrs("link") if a.get("rel") == "icon")
        self.assertEqual(icon["href"], T.BASE + site.ICON_NAME)
        lawn = self.page("example-lawn-care/index.html")  # noindex profile: the icon, no share tags
        self.assertIn(f'<link rel="icon" href="{T.BASE}{site.ICON_NAME}"', lawn)
        self.assertNotIn("og:", lawn)
        svg = self.page(site.ICON_NAME)
        self.assertLessEqual(len(svg.encode()), 300)
        root = ET.fromstring(svg)
        self.assertEqual(root.tag, "{http://www.w3.org/2000/svg}svg")
        self.assertNotRegex(svg, r"(?i)script|href|style|on[a-z]+=")

    def test_sitemaps_are_well_formed_and_never_list_paged_lists(self):
        tree = ET.fromstring(self.page("sitemap.xml"))
        locs = [u.text for u in tree.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        self.assertIn(f"{T.CANON}example-tire-and-lube/", locs)
        self.assertNotIn(f"{T.CANON}example-lawn-care/", locs)
        self.assertFalse([u for u in locs if "/page-" in u])


class Details(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-seo-detail-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(data_dir=Path(self.tmp.name) / "d", indexable=True)

    def directory(self, data):
        return site.Directory(site.place_directory(data, places.LONGVIEW), self.settings)

    def test_a_hidden_street_says_the_town_only(self):
        data = T.fixture_export()
        tire = T.by_slug(data, "example-tire-and-lube")
        tire["address"]["street"] = None
        tire["address"]["zip"] = None
        tire["facts"] = [f for f in tire["facts"] if f["field"] != "address"]
        build(data, Path(self.tmp.name) / "hidden", indexable=True)
        html = (site.site_dir(config.Settings(data_dir=Path(self.tmp.name) / "hidden")) /
                "example-tire-and-lube" / "index.html").read_text(encoding="utf-8")
        business = next(i for i in items(html) if i["@type"] == "LocalBusiness")
        address = business["address"][0]
        self.assertEqual(address["addressLocality"], ["Longview"])
        self.assertEqual(address["addressRegion"], ["TX"])
        self.assertNotIn("streetAddress", address)
        self.assertNotIn("postalCode", address)
        self.assertNotIn("500 Example St", html)
        self.assertNotIn("75602", html)

    def test_street_and_zip_only_together_as_the_page_shows_them(self):
        data = T.fixture_export()
        d = self.directory(data)
        for street, zip_code in (("500 Example St", None), (None, "75602")):
            tire = copy.deepcopy(T.by_slug(data, "example-tire-and-lube"))
            tire["address"].update(street=street, zip=zip_code)
            with self.subTest(street=street, zip=zip_code):
                self.assertEqual(site.address_line(tire), "Longview, TX")
                self.assertEqual(site.ld_dict(d, tire)["address"],
                                 {"@type": "PostalAddress", "addressLocality": "Longview", "addressRegion": "TX"})

    def test_contact_values_only_from_the_business_website(self):
        data = T.fixture_export()
        tire = T.by_slug(data, "example-tire-and-lube")
        d = self.directory(data)
        for field in ("phone", "website", "facebook", "hours"):
            other = copy.deepcopy(tire)
            for f in other["facts"]:
                if f["field"] == field:
                    f["source"] = "tx_sales_tax"
            ld = site.ld_dict(d, other)
            key = {"phone": "telephone", "website": "url", "facebook": "sameAs", "hours": "openingHours"}[field]
            with self.subTest(field=field):
                self.assertNotIn(key, ld)

    def test_a_website_that_forwards_or_fails_is_not_its_url(self):
        data = T.fixture_export()
        d = self.directory(data)
        for status in ("moved", "dead", "blocked"):
            tire = copy.deepcopy(T.by_slug(data, "example-tire-and-lube"))
            tire["website"]["status"] = status
            with self.subTest(status=status):
                self.assertNotIn("url", site.ld_dict(d, tire))

    def test_hours_say_stated_ranges_only(self):
        self.assertEqual(site.schema_hours({"tue": [["11:00", "14:00"], ["17:00", "21:00"]], "sun": []}),
                         ["Tu 11:00-14:00", "Tu 17:00-21:00"])
        self.assertEqual(site.schema_hours({"sun": []}), [])
        data = T.fixture_export()
        tire = copy.deepcopy(T.by_slug(data, "example-tire-and-lube"))
        tire["hours"] = {"sun": []}
        self.assertNotIn("openingHours", site.ld_dict(self.directory(data), tire))

    def test_a_partial_week_is_never_given_as_a_schedule(self):
        # Search engines read a day missing from openingHours as closed; the page says "not listed".
        data = T.fixture_export()
        d = self.directory(data)
        weekdays = {k: [["08:00", "17:00"]] for k in ("mon", "tue", "wed", "thu", "fri")}
        tire = copy.deepcopy(T.by_slug(data, "example-tire-and-lube"))
        tire["hours"] = dict(weekdays)
        self.assertNotIn("openingHours", site.ld_dict(d, tire))  # Mon-Fri only (or "Sat by appointment")
        tire["hours"] = dict(weekdays, sat=[], sun=[])  # the same week, weekend stated closed
        self.assertEqual(site.ld_dict(d, tire)["openingHours"],
                         [f"{day} 08:00-17:00" for day in ("Mo", "Tu", "We", "Th", "Fr")])
        settings = build(T.fixture_export(), Path(self.tmp.name) / "week", indexable=True)
        for slug in ("example-taqueria", "example-family-dental"):  # fixture profiles with a partial week
            html = (site.site_dir(settings) / slug / "index.html").read_text(encoding="utf-8")
            with self.subTest(slug=slug):
                self.assertIn("Hours not listed for other days.", html)
                self.assertNotIn("openingHours", html)
                self.assertIn('itemtype="https://schema.org/LocalBusiness"', html)

    def test_a_website_shown_but_not_its_url_has_no_url_markup(self):
        data = T.fixture_export()
        T.by_slug(data, "example-tire-and-lube")["website"]["status"] = "moved"
        settings = build(data, Path(self.tmp.name) / "moved", indexable=True)
        html = (site.site_dir(settings) / "example-tire-and-lube" / "index.html").read_text(encoding="utf-8")
        self.assertIn(">exampletire.example</a>", html)  # still shown to a visitor, with its note
        self.assertNotIn('itemprop="url"', html)
        business = next(i for i in items(html) if i["@type"] == "LocalBusiness")
        self.assertNotIn("url", business)

    def test_paged_lists_get_no_share_tags(self):
        data = T.fixture_export()
        record = T.by_slug(data, "example-tire-and-lube")
        data["businesses"] += [T.clone(record, n) for n in range(60)]
        settings = build(data, Path(self.tmp.name) / "paged", indexable=True)
        page2 = (site.site_dir(settings) / "page-2" / "index.html").read_text(encoding="utf-8")
        self.assertEqual(T.Page(page2).robots(), "noindex,follow")
        self.assertNotIn("og:", page2)
        self.assertNotIn("theme-color", page2)


class Hub(unittest.TestCase):
    def setUp(self):
        from tests import test_places as TP
        self.TP = TP
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-seo-hub-")
        self.addCleanup(self.tmp.cleanup)

    def test_the_sitemap_index_lists_each_town_with_businesses(self):
        data = self.TP.ring_export(diana=0)
        settings = build(data, Path(self.tmp.name) / "on", indexable=True, places=self.TP.RING)
        files = files_of(settings)
        tree = ET.fromstring(files["places/sitemap.xml"])
        self.assertEqual(tree.tag, "{http://www.sitemaps.org/schemas/sitemap/0.9}sitemapindex")
        locs = [u.text for u in tree.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        root = str(settings.public_base_url).rstrip("/")
        self.assertEqual(locs, [f"{root}/longview/businesses/sitemap.xml", f"{root}/marshall/businesses/sitemap.xml"])
        for loc in locs:
            self.assertIn(loc[len(root) + 1:], files)
        self.assertNotIn("diana/businesses/sitemap.xml", files)
        hub = files["places/index.html"]
        self.assertIn(f'<link rel="icon" href="{places.HUB_PATH}{site.ICON_NAME}"', hub)
        self.assertIn('<meta property="og:url" content="' + root + places.HUB_PATH + '">', hub)
        self.assertIn("places/icon.svg", files)

    def test_no_index_without_the_switch(self):
        settings = build(self.TP.ring_export(), Path(self.tmp.name) / "off", places=self.TP.RING)
        self.assertFalse((Path(settings.www_dir) / "places" / "sitemap.xml").exists())


class Preview(unittest.TestCase):
    """site.seo_preview: what `lva seo-preview` writes (the command's own checks are in test_cli)."""

    def test_a_sample_of_profiles_and_every_sitemap_with_the_switch_left_off(self):
        from tests import test_places as TP
        settings = config.Settings(data_dir=Path(tempfile.gettempdir()) / "unused", places=TP.RING)
        data = TP.ring_export()
        tire = copy.deepcopy(T.by_slug(T.fixture_export(), "example-tire-and-lube"))
        tire.update(place="marshall")
        tire["address"]["city"] = "Marshall"
        data["businesses"].append(tire)
        files = site.seo_preview(data, settings, sample=5)
        self.assertFalse(settings.indexable)
        profiles = sorted(rel for rel in files if rel.endswith("/index.html"))
        self.assertLessEqual(len(profiles), 5)
        for rel in profiles:
            self.assertIn('itemtype="https://schema.org/LocalBusiness"', files[rel])
            self.assertNotIn('content="noindex', files[rel])
        self.assertIn("marshall/businesses/example-tire-and-lube/index.html", profiles)
        for town in TP.RING:
            self.assertIn(f"{town}/businesses/sitemap.xml", files)
        self.assertIn("places/sitemap.xml", files)

    def test_records_that_fail_the_contract_are_not_previewed(self):
        data = T.fixture_export()
        bad = copy.deepcopy(T.by_slug(data, "example-tire-and-lube"))
        bad.update(id="lv-zzbad00001", slug="Not A Slug!", name="Contract Breaker Garage")
        data["businesses"].append(bad)
        settings = config.Settings(data_dir=Path(tempfile.gettempdir()) / "unused")
        blob = "".join(site.seo_preview(data, settings, sample=50).values())
        self.assertIn("example-tire-and-lube/", blob)
        self.assertNotIn("Contract Breaker", blob)
        self.assertNotIn("Not A Slug", blob)

    def test_sample_data_previews_nothing(self):
        data = T.fixture_export()
        data["sample"] = True
        settings = config.Settings(data_dir=Path(tempfile.gettempdir()) / "unused")
        self.assertEqual(site.seo_preview(data, settings), {})


if __name__ == "__main__":
    unittest.main()

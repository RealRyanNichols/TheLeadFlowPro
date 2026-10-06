"""Page weight and colour contrast budgets for the static directory.

The droplet is short on memory and disk, and most visitors are on phones, so
every page type has a size ceiling. The colour tokens must keep text readable
(WCAG AA, 4.5:1) in both the light and the dark scheme.

    cd deploy/longview-archive && python3 -m unittest tests.test_budget -v
"""

from __future__ import annotations

import gzip
import re
import tempfile
import unittest
from pathlib import Path

from longview_archive import config, places, site
from tests import test_site as T

CARD_MAX = 650
LIST_PAGE_MAX = 36_000
LIST_PAGE_GZIP_MAX = 8_000
CSS_MAX = 18_000
CSS_GZIP_MAX = 5_000
# A profile with every field (action bar, fact chips, hours, services, sources, A to Z
# neighbours) is under 10 KB; the average across a town stays under 7.5 KB.
PROFILE_MAX = 10_000
PROFILE_AVERAGE_MAX = 7_500
SPRITE_MAX = 900
HUB_MAX = 20_000
# With indexing on, an indexable profile also carries its schema.org microdata, the
# breadcrumb list, and the share tags (about 1.8 KB on the fullest profile).
INDEXED_PROFILE_MAX = 12_000
INDEXED_PROFILE_AVERAGE_MAX = 8_500
ICON_MAX = 300

CARD_RE = re.compile(r'<li class="card"[^>]*>.*?</li>(?=<li class="card"|</ul>)', re.S)


def _built(extra_rows: int = 0):
    data = T.fixture_export()
    record = data["businesses"][0]
    data["businesses"] += [T.clone(record, n) for n in range(extra_rows)]
    tmp = tempfile.TemporaryDirectory(prefix="lva-budget-")
    settings = config.Settings(data_dir=Path(tmp.name) / "data")
    site.build_site(settings, data, T.NOW)
    return tmp, settings, data


class PageWeight(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp, cls.settings, cls.data = _built(extra_rows=2000)
        cls.root = site.site_dir(cls.settings)
        cls.pages = T.pages(cls.root)
        cls.slugs = {b["slug"] for b in cls.data["businesses"]}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def list_pages(self):
        return {k: v for k, v in self.pages.items() if k.split("/")[0] not in self.slugs and k != "about/index.html"}

    def test_cards_are_small(self):
        cards = [c for v in self.list_pages().values() for c in CARD_RE.findall(v)]
        self.assertGreater(len(cards), 100)
        for c in cards:
            self.assertLessEqual(len(c.encode()), CARD_MAX, c[:120])

    def test_list_pages_are_small(self):
        for rel, text in self.list_pages().items():
            raw = text.encode()
            with self.subTest(page=rel):
                self.assertLessEqual(len(raw), LIST_PAGE_MAX)
                self.assertLessEqual(len(gzip.compress(raw)), LIST_PAGE_GZIP_MAX)

    def test_stylesheet_is_small_and_self_contained(self):
        css = (self.root / site.CSS_NAME).read_bytes()
        self.assertLessEqual(len(css), CSS_MAX)
        self.assertLessEqual(len(gzip.compress(css)), CSS_GZIP_MAX)
        text = css.decode()
        for banned in ("url(", "@import", "http"):
            self.assertNotIn(banned, text)

    def test_profiles_are_small(self):
        profiles = {k: v for k, v in self.pages.items() if k.split("/")[0] in self.slugs}
        self.assertGreater(len(profiles), 2000)
        for rel, text in profiles.items():
            self.assertLessEqual(len(text.encode()), PROFILE_MAX, rel)
            sprite = re.search(r'<svg class="sprite".*?</svg>', text)
            if sprite:
                self.assertLessEqual(len(sprite.group(0).encode()), SPRITE_MAX, rel)

    def test_real_profiles_are_small_on_average(self):
        real = [b["slug"] for b in self.data["businesses"] if not b["slug"].startswith("fixture-shop-")]
        sizes = [len(self.pages[f"{slug}/index.html"].encode()) for slug in real]
        self.assertLessEqual(max(sizes), PROFILE_MAX)
        self.assertLessEqual(sum(sizes) / len(sizes), PROFILE_AVERAGE_MAX)

    def test_every_page_has_a_viewport(self):
        for rel, text in self.pages.items():
            self.assertIn('<meta name="viewport" content="width=device-width, initial-scale=1">', text, rel)


class IndexedWeight(unittest.TestCase):
    def test_indexable_profiles_and_the_icon_stay_small(self):
        data = T.fixture_export()
        with tempfile.TemporaryDirectory(prefix="lva-budget-idx-") as tmp:
            settings = config.Settings(data_dir=Path(tmp) / "data", indexable=True)
            site.build_site(settings, data, T.NOW)
            root = site.site_dir(settings)
            sizes = [len((root / b["slug"] / "index.html").read_bytes()) for b in data["businesses"]]
            self.assertLessEqual(max(sizes), INDEXED_PROFILE_MAX)
            self.assertLessEqual(sum(sizes) / len(sizes), INDEXED_PROFILE_AVERAGE_MAX)
            self.assertLessEqual(len((root / site.ICON_NAME).read_bytes()), ICON_MAX)


class HubWeight(unittest.TestCase):
    def test_hub_is_small_and_has_a_viewport(self):
        data = T.fixture_export()
        settings = config.Settings(data_dir=Path(tempfile.gettempdir()) / "unused")
        hub = site.hub_page(data, settings, places.PLACES)
        self.assertLessEqual(len(hub.encode()), HUB_MAX)
        self.assertIn('<meta name="viewport"', hub)


# ---------------------------------------------------------------- contrast

def _luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    channels = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a: str, b: str) -> float:
    la, lb = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def _tokens(block: str) -> dict:
    return dict(re.findall(r"--([a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;", block))


class Contrast(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        css = site.SITE_CSS
        light_block = css[css.index(":root {"):css.index("}", css.index(":root {"))]
        dark_start = css.index("@media (prefers-color-scheme: dark)")
        dark_root = css.index(":root {", dark_start)
        dark_block = css[dark_root:css.index("}", dark_root)]
        cls.light = _tokens(light_block)
        cls.dark = {**cls.light, **_tokens(dark_block)}
        cls.categories = dict(re.findall(r"\.cat-([a-z-]+) \{ --c: (#[0-9A-Fa-f]{6}); \}", css))

    def test_text_is_readable_in_both_schemes(self):
        for scheme, t in (("light", self.light), ("dark", self.dark)):
            for fg in ("ink", "body", "muted"):
                for bg in ("canvas", "panel", "tint"):
                    with self.subTest(scheme=scheme, fg=fg, bg=bg):
                        self.assertGreaterEqual(contrast(t[fg], t[bg]), 4.5)
            with self.subTest(scheme=scheme, fg="cobalt", bg="panel"):
                self.assertGreaterEqual(contrast(t["cobalt"], t["panel"]), 4.5)
            for fg, bg in (("mint", "mint-soft"), ("warn", "warn-soft"), ("open", "open-soft")):
                with self.subTest(scheme=scheme, fg=fg, bg=bg):
                    self.assertGreaterEqual(contrast(t[fg], t[bg]), 4.5)

    def test_primary_button_keeps_white_text_readable(self):
        self.assertGreaterEqual(contrast("#FFFFFF", self.light["btn"]), 4.5)
        self.assertGreaterEqual(contrast("#FFFFFF", self.light["btn-hover"]), 4.5)
        self.assertNotIn("btn", _tokens(site.SITE_CSS[site.SITE_CSS.index("@media (prefers-color-scheme: dark)"):]))

    def test_white_initials_on_every_category_colour(self):
        self.assertEqual(set(self.categories), set(site.CATEGORY_CLASSES))
        for slug, colour in self.categories.items():
            with self.subTest(category=slug):
                self.assertGreaterEqual(contrast("#FFFFFF", colour), 4.5)


if __name__ == "__main__":
    unittest.main()

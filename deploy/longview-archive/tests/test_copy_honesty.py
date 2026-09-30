"""The directory's own words never rank, review, or invent.

Every generated page is scanned for ranking and praise words and for claims
the public records cannot support ("founded", "years in business"). Business
names are left out of the scan (a real business may be called "Top Notch"),
as are the few fixed sentences that say what the directory does NOT do.

    cd deploy/longview-archive && python3 -m unittest tests.test_copy_honesty -v
"""

from __future__ import annotations

import re
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

from longview_archive import config, places, site
from tests import test_site as T

BANNED = re.compile(r"\b(best|top|leading|trusted|favou?rite|popular|#1|number one|founded|established"
                    r"|years in business|rated|ratings?|reviews?|reviewed|featured)\b", re.I)
# Fixed sentences that name what the directory does not do.
ALLOWED = (
    site.DISCLAIMER,
    "Not ranked, no reviews.",
    "No ratings, reviews, rankings, or endorsements.",
    # "review" as the directory's own human check, never as customer reviews:
    "waiting for a person to review them.",
    "some listings wait for review,",
    "a person reviews it before it is shown.",
)
# Text inside these elements is a business's own name (or the page title that repeats it).
NAME_TAGS = {"h1", "title"}
NAME_CLASSES = {"card-name", "mono", "crumbs"}


class Text(HTMLParser):
    """The page's visible text, without business names."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list = []
        self.parts: list = []

    def handle_starttag(self, tag, attrs):
        classes = set((dict(attrs).get("class") or "").split())
        skip = tag in NAME_TAGS or bool(classes & NAME_CLASSES) or bool(self.stack and self.stack[-1][1])
        if tag not in ("meta", "link", "br", "input", "img", "hr"):
            self.stack.append((tag, skip))

    def handle_endtag(self, tag):
        while self.stack:
            open_tag, _ = self.stack.pop()
            if open_tag == tag:
                break

    def handle_data(self, data):
        if not (self.stack and self.stack[-1][1]):
            self.parts.append(data)

    @property
    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self.parts))


def visible_text(html: str) -> str:
    parser = Text()
    parser.feed(html)
    text = parser.text
    for sentence in ALLOWED:
        text = text.replace(sentence, " ")
    return text


class CopyHonesty(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="lva-honesty-")
        cls.settings = config.Settings(data_dir=Path(cls.tmp.name) / "data")
        cls.data = T.fixture_export()
        site.build_site(cls.settings, cls.data, T.NOW)
        cls.pages = T.pages(site.site_dir(cls.settings))
        cls.pages["places/index.html"] = site.hub_page(cls.data, cls.settings, places.PLACES)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_no_ranking_praise_or_invented_history(self):
        self.assertGreater(len(self.pages), 10)
        for rel, html in self.pages.items():
            found = BANNED.findall(visible_text(html))
            self.assertEqual(found, [], f"{rel}: {found}")

    def test_since_lines_use_record_wording_only(self):
        for rel, html in self.pages.items():
            for line in re.findall(r'<p class="card-since">([^<]*)</p>', html):
                self.assertRegex(line, r"^(Permit on file since|Registered since) \d{4}$", rel)

    def test_scan_catches_a_planted_word(self):
        self.assertTrue(BANNED.search(visible_text("<p>The best tacos in town</p>")))
        self.assertFalse(BANNED.search(visible_text('<h3 class="card-name"><a>Top Notch Tires</a></h3>')))


if __name__ == "__main__":
    unittest.main()

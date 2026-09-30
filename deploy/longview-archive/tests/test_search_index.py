"""The search index (idx/): what it holds, what it never holds, and how big it gets.

    cd deploy/longview-archive && python3 -m unittest tests.test_search_index -v
"""

from __future__ import annotations

import copy
import json
import random
import re
import tempfile
import unittest
from pathlib import Path

from longview_archive import config, places, site
from tests import test_site as T

FILE_MAX = 48_000
MANIFEST_MAX = 8_000
MANIFEST_KEYS = {"v", "h", "base", "town", "n", "cats", "keys", "kf", "chunk", "batchDate", "stride", "hours"}
HUB_MANIFEST_KEYS = MANIFEST_KEYS | {"towns"}


def build(data, **settings):
    tmp = tempfile.TemporaryDirectory(prefix="lva-idx-")
    s = config.Settings(data_dir=Path(tmp.name) / "data", **settings)
    site.build_site(s, data, T.NOW)
    return tmp, s


def idx_files(folder: Path) -> dict:
    return {p.name: p.read_text(encoding="utf-8") for p in (folder / "idx").iterdir()}


def rows_of(files: dict) -> list:
    chunks = sorted((n for n in files if n.startswith("r-")), key=lambda n: int(n.split(".")[0][2:]))
    return [r for n in chunks for r in json.loads(files[n])]


def word_lists(files: dict) -> dict:
    out = {}
    for name, text in files.items():
        if name.startswith("t-"):
            for word, deltas in json.loads(text).items():
                nums, n = [], 0
                for dlt in deltas:
                    n += dlt
                    nums.append(n)
                out[word] = nums
    return out


class IndexContents(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = T.fixture_export()
        cls.tmp, cls.settings = build(copy.deepcopy(cls.data))
        cls.files = idx_files(site.site_dir(cls.settings))
        cls.manifest = json.loads(cls.files["manifest.json"])
        cls.rows = rows_of(cls.files)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_rows_follow_the_a_to_z_list_and_hold_only_card_fields(self):
        names = [b["name"] for b in sorted(self.data["businesses"], key=site.name_key)]
        self.assertEqual([r[0] for r in self.rows], names)
        for r in self.rows:
            self.assertEqual(len(r), 7)  # name, slug, category, label, flags, since, zip
            self.assertRegex(r[1], r"^[a-z0-9-]+$")
            self.assertTrue(r[5] == 0 or re.fullmatch(r"[PR]\d{4}", r[5]))

    def test_zip_only_with_a_shown_street(self):
        lawn = next(r for r in self.rows if r[1] == "example-lawn-care")  # no street: town only
        self.assertEqual(lawn[6], 0)
        for b in self.data["businesses"]:
            r = next(x for x in self.rows if x[1] == b["slug"])
            shown = bool(b["address"]["street"] and b["address"]["zip"])
            self.assertEqual(r[6], b["address"]["zip"] if shown else 0, b["slug"])

    def test_no_private_or_contact_value_anywhere_in_idx(self):
        blob = "\n".join(self.files.values())
        self.assertNotRegex(blob, r"lv-[a-z0-9]{6,}")
        for b in self.data["businesses"]:
            for value in (b["address"]["street"], b["email"], (b["phone"] or {}).get("display"),
                          (b["phone"] or {}).get("e164")):
                if value:
                    self.assertNotIn(value, blob, b["slug"])
            if b["website"]:
                host = re.sub(r"^https?://(www\.)?", "", b["website"]["url"]).split("/")[0]
                self.assertNotIn(host, blob, b["slug"])

    def test_every_business_with_a_word_is_findable(self):
        words = word_lists(self.files)
        reachable = {n for nums in words.values() for n in nums}
        d = site.Directory(site.place_directory(self.data, places.LONGVIEW), self.settings, places.LONGVIEW, False)
        expected = {i for i, b in enumerate(d.businesses) if site.index_tokens(d, b)}
        self.assertEqual(reachable, expected)
        tire = next(i for i, r in enumerate(self.rows) if r[1] == "example-tire-and-lube")
        self.assertIn(tire, words["tire"])

    def test_manifest_is_small_and_allow_listed(self):
        self.assertLessEqual(len(self.files["manifest.json"].encode()), MANIFEST_MAX)
        self.assertEqual(set(self.manifest), MANIFEST_KEYS)
        self.assertEqual(len(self.manifest["keys"]), len(self.manifest["kf"]))
        for name in self.files:
            if name != "manifest.json":
                self.assertIn(f".{self.manifest['h']}.json", name)

    def test_hours_file_writes_stated_days_only(self):
        hours = json.loads(next(v for k, v in self.files.items() if k.startswith("o.")))
        self.assertEqual(site.hours_code({"mon": [["07:30", "18:00"]], "sun": []}), "mon0730-1800;sun-")
        self.assertEqual(site.hours_code({"tue": [["11:00", "14:00"], ["17:00", "21:00"]]}), "tue1100-1400,1700-2100")
        by_slug = {b["slug"]: b for b in self.data["businesses"]}
        for n, p in hours["rows"].items():
            b = by_slug[self.rows[int(n)][1]]
            code = hours["pats"][p]
            stated = {part[:3] for part in code.split(";")}
            self.assertEqual(stated, set(b["hours"]))  # an unstated day is never written as closed


class NormParity(unittest.TestCase):
    CASES = {
        "Café Olé": "cafe ole", "Bob's Tire & Lube": "bobs tire and lube", "A-1   Auto": "a 1 auto",
        "  O’Brien's  ": "obriens", "TEXAS #1": "texas 1", "": "",
    }

    def test_python_folds_like_the_script(self):
        for raw, want in self.CASES.items():
            self.assertEqual(site.norm_py(raw), want, raw)
        js = site.SEARCH_JS
        for literal in ('.normalize("NFKD")', '.replace(/&/g, " and ")', "/['\\u2019]/g", "/[^a-z0-9]+/g"):
            self.assertIn(literal, js)


class Suppression(unittest.TestCase):
    def test_a_removed_business_is_in_no_index_file(self):
        data = T.fixture_export()
        gone = data["businesses"].pop(0)
        tmp, s = build(data)
        self.addCleanup(tmp.cleanup)
        blob = "\n".join(idx_files(site.site_dir(s)).values())
        self.assertNotIn(gone["name"], blob)
        self.assertNotIn(gone["slug"], blob)


class TownsKeepTheirOwn(unittest.TestCase):
    def test_each_town_indexes_its_own_businesses(self):
        from tests import test_places as TP
        tmp = tempfile.TemporaryDirectory(prefix="lva-idx-towns-")
        self.addCleanup(tmp.cleanup)
        s = config.Settings(data_dir=Path(tmp.name) / "data", places=TP.RING)
        site.build_site(s, TP.ring_export(), T.NOW)
        for slug, n in (("longview", 3), ("marshall", 2), ("diana", 1)):
            files = idx_files(s.www_dir / slug / "businesses")
            manifest = json.loads(files["manifest.json"])
            self.assertEqual(manifest["n"], n)
            self.assertEqual(manifest["base"], f"/{slug}/businesses/")
            self.assertEqual(manifest["town"], places.get(slug).name)
            self.assertEqual(len(rows_of(files)), n)


class SearchPage(unittest.TestCase):
    def test_search_page_is_never_indexed_and_has_a_fallback(self):
        tmp, s = build(T.fixture_export(), indexable=True)
        self.addCleanup(tmp.cleanup)
        page = (site.site_dir(s) / "search" / "index.html").read_text(encoding="utf-8")
        self.assertIn('<meta name="robots" content="noindex,nofollow">', page)
        self.assertIn(f'<link rel="canonical" href="{T.CANON}search/">', page)
        self.assertEqual(page.count("<h1>"), 1)
        self.assertIn('id="search-fallback"', page)
        self.assertIn("Search needs JavaScript. Browse A to Z or by category:", page)
        index = (site.site_dir(s) / "index.html").read_text(encoding="utf-8")
        self.assertIn(f'<a class="brand-search" href="{T.BASE}search/">Search</a>', index)

    def test_an_empty_batch_has_no_search_page(self):
        data = T.fixture_export()
        data["businesses"] = []
        tmp, s = build(data)
        self.addCleanup(tmp.cleanup)
        self.assertFalse((site.site_dir(s) / "search").exists())
        self.assertFalse((site.site_dir(s) / "idx").exists())


class HubIndex(unittest.TestCase):
    def setUp(self):
        from tests import test_places as TP
        self.TP = TP
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-idx-hub-")
        self.addCleanup(self.tmp.cleanup)

    def build(self, data, towns):
        s = config.Settings(data_dir=Path(self.tmp.name) / "data", places=towns)
        site.build_site(s, data, T.NOW)
        return s

    def test_one_list_for_every_town_that_is_on(self):
        data = self.TP.ring_export()
        s = self.build(data, self.TP.RING)
        hub = s.www_dir / "places"
        files = idx_files(hub)
        manifest = json.loads(files["manifest.json"])
        self.assertEqual(set(manifest), HUB_MANIFEST_KEYS)
        self.assertEqual([t[0] for t in manifest["towns"]], list(self.TP.RING))
        self.assertFalse(manifest["hours"])
        self.assertFalse(any(n.startswith("o.") for n in files))  # no hours file on the hub
        rows = rows_of(files)
        self.assertEqual(len(rows), len(data["businesses"]))
        for r in rows:
            self.assertEqual(r[6], 0)  # no ZIP on the hub
            town = manifest["towns"][r[7]]
            self.assertTrue((s.www_dir / town[0] / "businesses" / r[1] / "index.html").is_file())
        page = (hub / "index.html").read_text(encoding="utf-8")
        self.assertIn('<script src="/places/search.js" defer></script>', page)
        self.assertIn('data-hub="1"', page)
        self.assertIn('<select id="search-town" name="town">', page)
        self.assertNotIn('id="search-open"', page)
        self.assertTrue((hub / "search.js").is_file())

    def test_a_removed_business_is_not_in_the_hub_index(self):
        data = self.TP.ring_export()
        gone = data["businesses"].pop()
        s = self.build(data, self.TP.RING)
        blob = "\n".join(idx_files(s.www_dir / "places").values())
        self.assertNotIn(gone["slug"], blob)

    def test_longview_alone_has_no_hub(self):
        s = self.build(T.fixture_export(), ("longview",))
        self.assertFalse((s.www_dir / "places").exists())


class IndexSize(unittest.TestCase):
    def test_files_stay_small_on_a_big_town_with_a_common_word(self):
        data = T.fixture_export()
        base = data["businesses"][0]
        rnd = random.Random(7)
        syl = ["ace", "bay", "cor", "dex", "eli", "fox", "gra", "hal", "ion", "jet", "kin", "lum", "mor"]
        for n in range(5000):
            b = T.clone(base, n)
            b["name"] = " ".join(rnd.choice(syl) + rnd.choice(syl) for _ in range(3))
            b["services"] = ["repair"] if n % 2 else ["tires"]  # half the town shares one word
            data["businesses"].append(b)
        tmp, s = build(data)
        self.addCleanup(tmp.cleanup)
        files = idx_files(site.site_dir(s))
        for name, text in files.items():
            self.assertLessEqual(len(text.encode()), FILE_MAX, name)
        self.assertLessEqual(len(files["manifest.json"].encode()), MANIFEST_MAX)
        self.assertLessEqual(len(site.SEARCH_JS.encode()), 15_000)  # about 4 KB gzipped
        self.assertGreaterEqual(len(word_lists(files)["repair"]), 2500)


if __name__ == "__main__":
    unittest.main()

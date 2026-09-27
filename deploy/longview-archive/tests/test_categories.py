import unittest

from longview_archive import categories as c
from longview_archive import db


class CategoryTests(unittest.TestCase):
    def test_longest_prefix(self):
        cases = [
            ("722511", "restaurants"),
            ("811111", "auto"),
            ("811192", "auto"),
            ("812111", "beauty"),
            ("621210", "health-dental"),
            ("813110", "faith-community"),
            ("624410", "education-childcare"),
            ("721110", "lodging-recreation"),
            ("238220", "home-services"),
            ("236118", "home-services"),
            ("236220", "industrial"),
            ("561730", "home-services"),
            ("561320", "professional"),
            ("445110", "retail"),
            ("447110", "auto"),
            ("446110", "health-dental"),
            ("541110", "professional"),
            ("541940", "health-dental"),
            ("311811", "restaurants"),
            ("921110", "other"),
            ("999999", "other"),
        ]
        for code, slug in cases:
            with self.subTest(code=code):
                self.assertEqual(c.categorize(code)[0], slug)

    def test_every_sector_has_a_category(self):
        for sector in ("11", "21", "22", "23", "31", "32", "33", "42", "44", "45", "48", "49", "51", "52",
                       "53", "54", "55", "56", "61", "62", "71", "72", "81", "92"):
            with self.subTest(sector=sector):
                slug, label = c.categorize(sector + "0000")
                self.assertIn(slug, c.CATEGORY_NAMES)
                self.assertTrue(label)

    def test_osm_fallback(self):
        self.assertEqual(c.categorize(None, {"amenity": "dentist"})[0], "health-dental")
        self.assertEqual(c.categorize("", {"shop": "car_repair"})[0], "auto")
        self.assertEqual(c.categorize("", {"shop": "books"})[0], "retail")
        self.assertEqual(c.categorize("", {"craft": "plumber"})[0], "home-services")
        self.assertEqual(c.categorize("", {"taxonomy": "Dentist, General Practice"})[0], "health-dental")
        self.assertEqual(c.categorize(None, None), c.FALLBACK)

    def test_naics_wins_over_tags(self):
        self.assertEqual(c.categorize("722511", {"shop": "car_repair"})[0], "restaurants")

    def test_seed_idempotent(self):
        conn = db.connect(":memory:")
        db.migrate(conn)
        c.seed(conn)
        c.seed(conn)
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0], len(c.CATEGORIES))
        self.assertEqual(conn.execute("SELECT COUNT(*) FROM category_naics").fetchone()[0], len(c.NAICS_MAP))


if __name__ == "__main__":
    unittest.main()

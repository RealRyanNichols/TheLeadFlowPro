import unittest

from longview_archive import normalize as n


class NameTests(unittest.TestCase):
    def test_norm_name(self):
        cases = [
            ("The Example Tire & Lube, LLC", "example tire and lube"),
            ("EXAMPLE TIRE AND LUBE L.L.C.", "example tire and lube"),
            ("Sample Holdings Inc DBA Sample Street Tacos", "sample street tacos"),
            ("Sample Holdings Inc d/b/a Sample Street Tacos", "sample street tacos"),
            ("Sample Holdings, Inc. D.B.A. Sample Street Tacos", "sample street tacos"),
            ("Joe's Example Café", "joes example cafe"),
            ("The", "the"),
            ("", ""),
            (None, ""),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(n.norm_name(raw), expected)

    def test_similarity(self):
        self.assertEqual(n.name_similarity("Example Tire & Lube", "EXAMPLE TIRE AND LUBE LLC"), 1.0)
        self.assertEqual(n.name_similarity("Example Tire", "Example Tire & Lube of Longview"), 1.0)
        self.assertGreaterEqual(n.name_similarity("Example Tire and Lube", "Example Tires & Lube"), 0.6)
        self.assertLess(n.name_similarity("Sample Street Tacos", "Fictional Family Dental"), 0.4)
        self.assertEqual(n.name_similarity("", "Anything"), 0.0)

    def test_tokens(self):
        self.assertEqual(n.name_tokens("The Example Tire & Lube of Longview LLC"), {"example", "tire", "lube"})

    def test_title_case(self):
        self.assertEqual(n.title_case_name("EXAMPLE TIRE & LUBE"), "Example Tire & Lube")
        self.assertEqual(n.title_case_name("JOE'S BBQ AND GRILL"), "Joe's BBQ and Grill")
        self.assertEqual(n.title_case_name("Already Mixed Case"), "Already Mixed Case")


class StreetTests(unittest.TestCase):
    def test_same_place_many_spellings(self):
        groups = [
            ["1200 W. MARSHALL AVE., SUITE 4", "1200 West Marshall Avenue Ste 4", "1200 W Marshall Ave #4"],
            ["100 US HIGHWAY 259 N", "100 U.S. Hwy 259 North", "100 Hwy 259 N", "100 US-259 N"],
            ["200 State Highway 31 E", "200 SH 31 E", "200 Hwy 31 East"],
            ["300 Farm to Market Rd 2206", "300 FM 2206", "300 F.M. 2206", "300 FM Road 2206"],
            ["400 Loop 281", "400 LOOP 281"],
            ["500 N Eastman Rd Bldg 2", "500 North Eastman Road Building 2"],
        ]
        for group in groups:
            keys = {n.parse_street(line) for line in group}
            with self.subTest(group=group):
                self.assertEqual(len(keys), 1, keys)

    def test_parse_street_values(self):
        self.assertEqual(n.parse_street("1200 W. MARSHALL AVE., SUITE 4"), ("1200 w marshall ave", "4"))
        self.assertEqual(n.parse_street("100 Example St Unit B"), ("100 example st", "b"))
        self.assertEqual(n.parse_street("100 Example Rd B"), ("100 example rd", "b"))
        self.assertEqual(n.parse_street("100 Main St E"), ("100 main st e", ""))
        self.assertEqual(n.parse_street(""), ("", ""))

    def test_display_street(self):
        self.assertEqual(n.display_street("1200 W. MARSHALL AVE., SUITE 4"), "1200 W Marshall Ave Ste 4")
        self.assertEqual(n.display_street("300 farm to market road 2206"), "300 FM 2206")

    def test_zip5(self):
        self.assertEqual(n.zip5("75604-1234"), "75604")
        self.assertEqual(n.zip5("756041234"), "75604")
        self.assertIsNone(n.zip5("7560"))
        self.assertIsNone(n.zip5(None))


class PhoneTests(unittest.TestCase):
    def test_valid(self):
        for raw in ("(903) 212-4400", "903.212.4400", "+1 903 212 4400", "1-903-212-4400", "903-212-4400 ext. 12"):
            with self.subTest(raw=raw):
                self.assertEqual(n.norm_phone(raw), "+19032124400")

    def test_invalid(self):
        for raw in ("(103) 212-4400", "903-112-4400", "911-212-4400", "903-911-4400", "212-4400", "", None, "555-212-4400"):
            with self.subTest(raw=raw):
                self.assertIsNone(n.norm_phone(raw))

    def test_fictional_range(self):
        self.assertIsNone(n.norm_phone("903-555-0100"))
        self.assertEqual(n.norm_phone("903-555-0100", allow_fictional=True), "+19035550100")
        self.assertIsNone(n.norm_phone("903-555-1212", allow_fictional=True))

    def test_display(self):
        self.assertEqual(n.display_phone("+19035550100"), "(903) 555-0100")
        self.assertEqual(n.display_phone("bad"), "")


class UrlTests(unittest.TestCase):
    def test_norm_url(self):
        cases = [
            ("https://WWW.ExampleTire.example/Contact?utm_source=x&id=2#top", "https://www.exampletire.example/Contact?id=2"),
            ("exampletire.example", "https://exampletire.example/"),
            ("http://exampletire.example:80/", "http://exampletire.example/"),
            ("https://exampletire.example:8443/x", "https://exampletire.example:8443/x"),
            ("//exampletire.example/a", "https://exampletire.example/a"),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(n.norm_url(raw), expected)

    def test_rejects(self):
        for raw in ("mailto:info@x.example", "tel:9035550100", "javascript:alert(1)", "not a url", "ftp://x.example/",
                    "https://user:pw@x.example/", "", None, "example"):
            with self.subTest(raw=raw):
                self.assertIsNone(n.norm_url(raw))

    def test_registrable_domain(self):
        self.assertEqual(n.registrable_domain("https://www.shop.exampletire.example/x"), "exampletire.example")
        self.assertEqual(n.registrable_domain("www.example.co.uk"), "example.co.uk")
        self.assertEqual(n.registrable_domain("exampletire.example"), "exampletire.example")
        self.assertEqual(n.registrable_domain(""), "")

    def test_slugify(self):
        self.assertEqual(n.slugify("Joe's Example Tire & Lube"), "joes-example-tire-and-lube")
        self.assertEqual(n.slugify("Café  Olé!!"), "cafe-ole")
        long = n.slugify("word " * 40)
        self.assertLessEqual(len(long), 80)
        self.assertFalse(long.endswith("-"))


if __name__ == "__main__":
    unittest.main()

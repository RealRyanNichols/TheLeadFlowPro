"""Go-live regressions, round 2 (names and slugs): structural rules instead of
name spellings.

1. A taxpayer is clearly an entity only on positive evidence (an entity org
   type, or a legal form in its own name); every other taxpayer may be a person.
2. For a taxpayer that may be a person, a shown name sharing any word with the
   owner's name (the taxpayer name before a DBA marker) is owner-named: held
   without a public presence, then checked by a person. Never auto-published.
3. A name or slug shaped like a street address waits for a person, whatever
   street the business has now.
4. A couple's name ('Thanh & Hoa Nguyen') looks like a person's even without a
   listed given name.

Every problem in the round-2 review (names and slugs) has a case here, next
to guards that ordinary business names still publish. All data is fictional.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_names2 -v
"""

import json
import unittest

from longview_archive import matching as m, normalize, privacy as p, publish
from longview_archive.sources import comptroller
from tests.fixtures import builders as b
from tests.test_golive_names import SETTINGS, business, export, project, row, synced
from tests.test_golive_slug import PipelineCase, key_of, outlet
from tests.test_matching import LATER, business_of
from tests.test_sources import make_settings, sales_tax_transport

# Every org type that is not positive evidence of an entity.
MAYBE_PERSON_ORGS = ("Sole Owner", "IS", "Individual", "General Partnership", "Texas General Partnership",
                     "Joint Venture", "", None, "PB", "CL", "PG")
LLC = "Texas Limited Liability Company"


def exported_names(data):
    return sorted(e["name"] for e in data["businesses"])


class ClearlyAnEntity(unittest.TestCase):
    """Rule 1: positive evidence only."""

    def test_entity_org_types(self):
        for org in (LLC, "LLC", "Foreign Limited Liability Company", "Texas For-Profit Corporation", "Corporation",
                    "Incorporated", "Texas Limited Partnership", "Limited Liability Partnership", "LLP", "PLLC",
                    "Professional Corporation", "Professional Association", "Texas Business Trust", "Trust",
                    "Nonprofit Corporation", "Non-Profit Association", "Church", "City Government", "County",
                    "Independent School District", "ISD", "Government Entity"):
            with self.subTest(org=org):
                self.assertTrue(p.org_is_entity(org))

    def test_everything_else_may_be_a_person(self):
        for org in MAYBE_PERSON_ORGS + ("CT", "XX", "Estate", "Other"):
            with self.subTest(org=org):
                self.assertFalse(p.org_is_entity(org))

    def test_legal_forms_in_the_taxpayer_name(self):
        for name in ("EXAMPLE HOLDINGS LLC", "EXAMPLE L.L.C.", "EXAMPLE L L C", "SAMPLE INC.", "SAMPLE CORP",
                     "SAMPLE CO", "SAMPLE COMPANY", "SAMPLE LTD", "SAMPLE LP", "SAMPLE LLP", "SAMPLE PLLC",
                     "SAMPLE PC", "SAMPLE P.A.", "SAMPLE FAMILY TRUST", "SAMPLE HOMEOWNERS ASSOCIATION",
                     "FIRST BAPTIST CHURCH", "CHURCH OF CHRIST", "CITY OF LONGVIEW", "GREGG COUNTY",
                     "LONGVIEW ISD", "WAL-MART STORES TEXAS LLC", "ＥＸＡＭＰＬＥ ＬＬＣ"):
            with self.subTest(name=name):
                self.assertTrue(p.name_is_entity(name))
        # A surname that is a marker word, and a legal form only in the trade name, are not.
        for name in ("CHURCH JAMAL", "JOHN AND MARY CHURCH", "TEMPLE JAMAL", "SMITH JOHN",
                     "SMITH JOHN DBA ACME ROOFING LLC", "NGUYEN THANH/HOA", ""):
            with self.subTest(name=name):
                self.assertFalse(p.name_is_entity(name))


class OwnerTokens(unittest.TestCase):
    """Rule 2: the owner's name words, however they are joined."""

    def test_owner_tokens(self):
        for taxpayer, tokens in (
            ("DE LA CRUZ XIOMARA DE LOS ANGELES", {"cruz", "xiomara", "angeles"}),
            ("NGUYEN THANH/HOA", {"nguyen", "thanh", "hoa"}),
            ("TRAN MINH OR HOA", {"tran", "minh", "hoa"}),
            ("SMITH JOHN ET UX MARY", {"smith", "john", "mary"}),
            ("SMITH JOHN ET AL", {"smith", "john"}),
            ("SMITH, JOHN A JR", {"smith", "john"}),
            ("SMITH JOHN + MARY", {"smith", "john", "mary"}),
            ("JOHN SMITH D-B-A ACE LAWN", {"john", "smith"}),
            ("JOHN SMITH ＤＢＡ ACE LAWN", {"john", "smith"}),
            ("O'SHEA PATRICK", {"oshea", "patrick"}),
        ):
            with self.subTest(taxpayer=taxpayer):
                self.assertEqual(p.owner_name_tokens(taxpayer), tokens)

    def test_shared_words(self):
        self.assertTrue(p.shares_owner_name("Maria’s Bakery", "GARCIA MARIA"))
        self.assertTrue(p.shares_owner_name("O’Shea Tile", "O'SHEA PATRICK"))
        self.assertTrue(p.shares_owner_name("Hoa Nails", "NGUYEN THANH/HOA"))
        self.assertFalse(p.shares_owner_name("Ace Lawn Service", "SMITH JOHN"))
        self.assertFalse(p.shares_owner_name("The Lawn of Longview", "DE LA CRUZ XIOMARA"))  # stop words only


class PossiblyAPersonIsHeld(unittest.TestCase):
    """r2 names 1-3: long names with particles, 'FIRST LAST' with a business-word
    surname, and joint owners joined by '/', 'OR' or 'ET UX' are held, whatever
    the org type says when it is not an entity."""

    CASES = (
        ("DE LA CRUZ XIOMARA DE LOS ANGELES", "XIOMARA DE LOS ANGELES DE LA CRUZ", "Xiomara"),
        ("RODRIGUEZ DE LA CRUZ XIOMARA DEL CARMEN", "XIOMARA DEL CARMEN RODRIGUEZ DE LA CRUZ", "Xiomara"),
        ("JAMAL TEMPLE", "JAMAL TEMPLE", "Jamal"),
        ("KEISHA BARBER", "KEISHA BARBER", "Keisha"),
        ("NGUYEN THANH/HOA", "NGUYEN THANH/HOA", "Thanh"),
        ("TRAN MINH OR HOA", "TRAN MINH OR HOA", "Minh"),
        ("SMITH JOHN ET UX MARY", "JOHN & MARY SMITH", "Mary"),
    )

    def test_flags_for_every_org_form(self):
        for taxpayer, outlet_name, _ in self.CASES:
            for org in MAYBE_PERSON_ORGS:
                with self.subTest(taxpayer=taxpayer, org=org):
                    record = project(taxpayer, outlet_name, org)
                    self.assertEqual((record["is_individual"], record["personal_name"]), (True, True))
                    self.assertTrue(json.loads(record["tags_json"]).get("owner_named"))

    def test_never_exported_and_reviewed_once_public(self):
        rows = [row(taxpayer, outlet_name, org, naics="722511", zip_code="75605")
                for taxpayer, outlet_name, _ in self.CASES for org in ("", None, "PB", "CL", "General Partnership")]
        conn = synced(rows)
        data = export(conn)
        self.assertEqual(data["businesses"], [])
        bizs = conn.execute("SELECT * FROM businesses").fetchall()
        self.assertEqual(len(bizs), len(rows))
        for biz in bizs:
            self.assertEqual((biz["is_individual"], biz["publish_state"], biz["publish_reason"]),
                             (1, "held", "personal_name_no_presence"), biz["name"])
            self.assertFalse(p.address_is_public(conn, biz["id"])[0], biz["name"])  # NAICS alone never shows it
        for biz in bizs:
            b.add_site(conn, biz["id"], f"https://www.site{biz['id']}.example/")
        data = export(conn)
        self.assertEqual(data["businesses"], [])
        for biz in bizs:
            self.assertEqual(b.state(conn, biz["id"]), ("review", "person_name_check"), biz["name"])
        text = json.dumps(data).lower()
        for _, _, given in self.CASES:
            self.assertNotIn(given.lower(), text)

    def test_a_trade_name_with_one_owner_word_waits_for_a_person(self):
        conn = synced([row("SMITH JOHN", "SMITH LAWN SERVICE", "IS"),
                       row("GARCIA MARIA", "MARIA’S BAKERY", "", naics="311811"),
                       row("NGUYEN THANH/HOA", "HOA NAILS", "Texas General Partnership", naics="812113")])
        ids = [r["id"] for r in conn.execute("SELECT id FROM businesses ORDER BY id").fetchall()]
        self.assertEqual(export(conn)["businesses"], [])
        for bid in ids:
            self.assertEqual(b.state(conn, bid), ("held", "personal_name_no_presence"))
            b.add_site(conn, bid, f"https://www.site{bid}.example/")
        self.assertEqual(export(conn)["businesses"], [])
        for bid in ids:
            self.assertEqual(b.state(conn, bid), ("review", "person_name_check"))


class DbaMarkers(unittest.TestCase):
    """r2 names 5: D-B-A and fullwidth markers; a name that starts with 'DBA'."""

    def test_hyphenated_and_fullwidth_markers(self):
        for outlet_name in ("JOHN SMITH D-B-A ACE LAWN SERVICE", "JOHN SMITH ＤＢＡ ACE LAWN SERVICE",
                            "JOHN SMITH Ｄ/Ｂ/Ａ ACE LAWN SERVICE", "JOHN SMITH d - b - a ACE LAWN SERVICE"):
            for org in ("IS", "", None):
                with self.subTest(outlet=outlet_name, org=org):
                    record = project("SMITH, JOHN", outlet_name, org)
                    self.assertEqual((record["name"], record["name_norm"]), ("Ace Lawn Service", "ace lawn service"))
                    self.assertTrue(record["personal_name"])
            self.assertTrue(normalize.has_dba(outlet_name))
        self.assertEqual(normalize.norm_name("JOHN SMITH D-B-A ACE LAWN SERVICE"), "ace lawn service")

    def test_a_name_that_starts_with_dba_keeps_its_name(self):
        self.assertEqual(normalize.split_dba("DBA LOUNGE"), ("DBA LOUNGE", ""))
        self.assertFalse(normalize.has_dba("DBA Lounge"))
        conn = synced([row("DBA LOUNGE LLC", "DBA LOUNGE", LLC, naics="722410"),
                       row("ACME ROOFING LLC", "ACME ROOFING DBA", LLC, naics="238160")])
        data = export(conn)
        self.assertEqual([(e["name"], e["slug"]) for e in data["businesses"]], [("Dba Lounge", "dba-lounge")])
        self.assertEqual(b.state(conn, business(conn, "Acme Roofing Dba")["id"]), ("held", "dba_legal_name"))

    def test_owner_name_before_a_hyphenated_marker_never_reaches_the_export(self):
        conn = synced([row("SMITH, JOHN", "JOHN SMITH D-B-A ACE LAWN SERVICE", "IS"),
                       row("SMITH, JOHN", "JOHN SMITH ＤＢＡ SMITH TILE", "")])
        for biz in conn.execute("SELECT id FROM businesses").fetchall():
            b.add_site(conn, biz["id"], f"https://www.site{biz['id']}.example/")
        data = export(conn)
        self.assertEqual(exported_names(data), ["Ace Lawn Service"])
        self.assertNotIn("john", json.dumps(data).lower())
        self.assertEqual(b.state(conn, business(conn, "Smith Tile")["id"]), ("review", "person_name_check"))


class DwellingStreets(unittest.TestCase):
    """r2 names 6: a mobile home, an RV space, a duplex letter, or a bare unit
    word still marks a dwelling, so the NAICS code alone does not show the street."""

    STREETS = ("4100 EXAMPLE LN MOBILE HOME 5", "4100 EXAMPLE LN RV 5", "4100 EXAMPLE LN B", "12 EXAMPLE RD LOT",
               "14 EXAMPLE RD APT")

    def test_display_keeps_the_unit(self):
        for raw, shown in zip(self.STREETS, ("4100 Example Ln Mobile Home 5", "4100 Example Ln Rv 5",
                                             "4100 Example Ln #B", "12 Example Rd Lot", "14 Example Rd Apt")):
            with self.subTest(raw=raw):
                self.assertEqual(normalize.display_street(raw), shown)
                self.assertEqual(normalize.display_street(shown), shown)
                self.assertTrue(p.residential_unit(shown))
        self.assertEqual(normalize.parse_street("12 EXAMPLE RD LOT"), ("12 example rd", ""))  # the key is unchanged

    def test_llc_dwelling_streets_are_not_exported(self):
        conn = synced([row(f"EXAMPLE EATS {i} LLC", f"EXAMPLE EATS {i}", LLC, naics=naics, street=street,
                           zip_code="75605")
                       for i, (street, naics) in enumerate(zip(self.STREETS, ("722511", "447110", "722511",
                                                                              "447110", "722511")))])
        data = export(conn)
        self.assertEqual(len(data["businesses"]), len(self.STREETS))
        for entry in data["businesses"]:
            self.assertEqual(entry["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})


class CouplesUnderAnEntity(unittest.TestCase):
    """r2 names 7 (rule 4): a couple's name shown by an LLC waits for a person."""

    def test_couple_shape_looks_like_a_person(self):
        for name in ("Thanh & Hoa Nguyen", "Thanh and Hoa Nguyen", "Minh & Hoa Tran", "Dalix & Oriel Quillfeather",
                     "Thanh Nguyen & Hoa Nguyen"):
            with self.subTest(name=name):
                self.assertTrue(p.looks_like_person_name(name))
        for name in ("Jones & Jones", "Salt and Pepper", "Smith & Wesson", "Example Tire & Lube", "Ben & Jerry's",
                     "Black and White Catering", "Tire & Wheel"):
            with self.subTest(name=name):
                self.assertFalse(p.looks_like_person_name(name))

    def test_llc_couple_outlet_is_reviewed_not_published(self):
        conn = synced([row("NGUYEN HOLDINGS LLC", "THANH & HOA NGUYEN", LLC, naics="812113")])
        biz = business(conn, "Thanh & Hoa Nguyen")
        data = export(conn)
        self.assertEqual(data["businesses"], [])
        self.assertEqual(b.state(conn, biz["id"]), ("review", "person_name_check"))
        b.add_site(conn, biz["id"], "https://www.nails.example/")
        self.assertEqual(export(conn)["businesses"], [])
        self.assertNotIn("thanh", json.dumps(export(conn)).lower())


class AddressShapedNames(unittest.TestCase):
    """Rule 3 on its own: what reads as a street address."""

    def test_addresses(self):
        for name in ("77 Sample Ct", "500 South St", "12 West St", "100 N St", "12 Center St", "12 Cove Ln",
                     "4100 1/2 Example Ln", "4100-A Example Ln", "4100A Example Ln", "4100 A Example Ln",
                     "4100-1-2-example-ln", "77SAMPLE CT", "12 O’Neal St", "Scentsy 4100 Example Lane",
                     "907 North Placeholder Drive", "4100 Hwy 80", "4100 US Hwy 80", "4100 FM 1845",
                     "1200 Loop 281", "100 5th St", "scentsy-77-sample-ct", "12 Example Rd W", "3 Fixture Cir",
                     "44 Plaza Way", "12 Example Pkwy", "12 Example Trl", "12 Example Pl", "12 Example Ter",
                     "12 Example Blvd", "12 Example Ave"):
            with self.subTest(name=name):
                self.assertTrue(p.looks_like_address(name))

    def test_ordinary_names_are_not_addresses(self):
        for name in ("7-Eleven", "24 Hour Fitness", "1st Choice Plumbing", "3 Amigos", "4 Way Tire",
                     "2 Guys Pizza Place", "Walmart Supercenter #123", "Highway 80 Grill", "24/7 Towing",
                     "Route 66 Diner", "Studio 54", "A1 Auto", "4x4 Parts", "Sample Ct Grill", "Scentsy", "",
                     None, "Hwy 80 Liquor", "I-20 Truck Stop"):
            with self.subTest(name=name):
                self.assertFalse(p.looks_like_address(name))

    def test_what_spells_a_street_round_two(self):
        for name, street in (("500 South St", "500 s st"), ("12 Center St", "12 ctr st"), ("12 Cove Ln", "12 cv ln"),
                             ("100 N St", "100 n st"), ("Plaza Way Candles", "44 plz way"),
                             ("Center St Candle Shop", "12 ctr st"), ("South St Candle Shop", "500 s st"),
                             ("4100 Example Ln", "4100 1 2 example ln"), ("4100 Example Ln", "4100 a example ln"),
                             ("Example Ln Candle Shop", "4100 1 2 example ln"),
                             ("12 O’Neal St", "12 o'neal st"), ("12-oneal-st", "12 o'neal st")):
            with self.subTest(name=name, street=street):
                self.assertTrue(p.name_spells_street(name, street))
        for name, street in (("St Example Crafts", "100 n st"), ("Sample Candles", "77 sample ct"),
                             ("Scentsy", "500 s st"), ("Candles", "12 cv ln")):
            with self.subTest(name=name, street=street):
                self.assertFalse(p.name_spells_street(name, street))


class AddressNamesInThePipeline(PipelineCase):
    """r2 slugs 1-4: a sole owner's name or slug that is (or carries) a home
    address waits for a person, at a fractional or lettered number, with a
    curly apostrophe or a glued number, and after the business moves."""

    def assert_waits(self, row):
        biz = business_of(self.conn, "tx_sales_tax", key_of(row))
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "name_contains_address"),
                         biz["name"])

    def test_direction_and_suffix_word_streets(self):
        rows = [outlet("40000000021", "500 SOUTH ST", "500 SOUTH ST"),
                outlet("40000000022", "12 WEST ST", "12 WEST ST", owner="ROE, MARY"),
                outlet("40000000023", "100 N ST", "100 N ST", owner="POE, ANN"),
                outlet("40000000024", "12 CENTER ST", "12 CENTER ST", owner="LOE, KIM"),
                outlet("40000000025", "12 COVE LN", "12 COVE LN", owner="MOE, SAM"),
                outlet("40000000026", "PLAZA WAY CANDLES", "44 PLAZA WAY", owner="NOE, AMY"),
                outlet("40000000027", "CENTER ST CANDLE SHOP", "14 CENTER ST", owner="KOE, RAY"),
                outlet("40000000028", "SOUTH ST CANDLE SHOP", "502 SOUTH ST", owner="VOE, LIZ")]
        self.sync(rows)
        directory, _ = self.published()
        self.assertEqual(directory["businesses"], [])
        for r in rows:
            self.assert_waits(r)

    def test_fractional_lettered_glued_and_curly_numbers(self):
        rows = [outlet("40000000101", "4100 EXAMPLE LN", "4100 1/2 EXAMPLE LN"),
                outlet("40000000102", "4102 EXAMPLE LN", "4102-A EXAMPLE LN", owner="ROE, MARY"),
                outlet("40000000103", "SCENTSY 4104 EXAMPLE LN", "4104 1/2 EXAMPLE LN", owner="POE, ANN"),
                outlet("40000000104", "EXAMPLE LN CANDLE SHOP", "4106 1/2 EXAMPLE LN", owner="LOE, KIM"),
                outlet("40000000105", "EXAMPLE LN CANDLE STUDIO", "4108-A EXAMPLE LN", owner="MOE, SAM"),
                outlet("40000000106", "12 O’NEAL ST", "12 O'NEAL ST", owner="NOE, AMY"),
                outlet("40000000107", "77SAMPLE CT", "77 SAMPLE CT", owner="KOE, RAY")]
        self.sync(rows)
        directory, _ = self.published()
        self.assertEqual(directory["businesses"], [])
        for r in rows:
            self.assert_waits(r)

    def test_after_a_move_the_old_address_in_the_name_or_slug_still_waits(self):
        home = outlet("40000000071", "77 SAMPLE CT", "77 SAMPLE CT")
        renamed = outlet("40000000072", "4100 EXAMPLE LN", "4100 EXAMPLE LN", owner="ROE, MARY")
        self.sync([home, renamed])
        self.sync([dict(home, outlet_address="12 OTHER EXAMPLE RD"),
                   dict(renamed, outlet_address="12 OTHER EXAMPLE RD", outlet_name="SCENTSY")], now=LATER)
        biz = business_of(self.conn, "tx_sales_tax", key_of(home))
        self.assertEqual((biz["street_norm"], biz["slug"]), ("12 other example rd", "77-sample-ct"))
        self.assertEqual(business_of(self.conn, "tx_sales_tax", key_of(renamed))["slug"], "4100-example-ln")
        directory, _ = self.published()
        self.assertEqual(directory["businesses"], [])
        for r in (home, renamed):
            self.assert_waits(r)

    def test_ordinary_numbered_names_publish(self):
        rows = [dict(outlet(f"4000000020{i}", name, f"{300 + i} EXAMPLE ST", owner=owner, naics="722511"),
                     taxpayer_org_type=org)
                for i, (name, owner, org) in enumerate((
                    ("7-ELEVEN", "7-ELEVEN INC", "Foreign For-Profit Corporation"),
                    ("24 HOUR FITNESS", "24 HOUR FITNESS USA LLC", "Foreign Limited Liability Company"),
                    ("1ST CHOICE PLUMBING", "FIRST CHOICE PLUMBING LLC", LLC),
                    ("3 AMIGOS", "THREE AMIGOS RESTAURANT LLC", LLC)))]
        self.sync(rows)
        directory, _ = self.published()
        self.assertEqual(sorted(biz["name"] for biz in directory["businesses"]),
                         ["1st Choice Plumbing", "24 Hour Fitness", "3 Amigos", "7-Eleven"])


class BusinessesStillPublish(unittest.TestCase):
    """Rule 5: clearly-entity trade names and unrelated sole-owner trade names
    publish as before, with the same slugs across syncs."""

    ROWS = (
        ("SMITH JOHN", "ACE LAWN SERVICE", "Sole Owner", "561730"),
        ("SMITH JOHN", "ACE LAWN SERVICE", "", "561730"),
        ("WAL-MART STORES TEXAS LLC", "WALMART SUPERCENTER #123", "Foreign Limited Liability Company", "452311"),
        ("7-ELEVEN INC", "7-ELEVEN", "Foreign For-Profit Corporation", "445131"),
        ("SMITH FAMILY DENTAL PLLC", "SMITH FAMILY DENTAL", "Professional Limited Liability Company", "621210"),
        ("SAMPLE ROOFING LLC", "SAMPLE ROOFING", "", "238160"),
        ("EXAMPLE TIRE & LUBE LLC", "EXAMPLE TIRE & LUBE", LLC, "811111"),
        ("EXAMPLE HOLDINGS LLC", "EXAMPLE HOLDINGS LLC DBA EXAMPLE TIRE", LLC, "811111"),
        ("FIRST BAPTIST CHURCH OF LONGVIEW", "FIRST BAPTIST CHURCH BOOKSTORE", "", "451211"),
    )
    NAMES = ["7-Eleven", "Ace Lawn Service", "Ace Lawn Service", "Example Tire", "Example Tire & Lube",
             "First Baptist Church Bookstore", "Sample Roofing", "Smith Family Dental", "Walmart Supercenter #123"]

    def rows(self):
        return [dict(row(taxpayer, outlet_name, org, naics=naics), taxpayer_number=f"3277000000{i}")
                for i, (taxpayer, outlet_name, org, naics) in enumerate(self.ROWS)]

    def test_flags(self):
        for taxpayer, outlet_name, org, _ in self.ROWS[2:]:
            with self.subTest(outlet=outlet_name):
                record = project(taxpayer, outlet_name, org)
                self.assertEqual((record["is_individual"], record["personal_name"]), (False, False))
                self.assertNotIn("owner_named", json.loads(record["tags_json"]))
        record = project("SMITH JOHN", "ACE LAWN SERVICE", "Sole Owner")
        self.assertEqual((record["is_individual"], record["personal_name"]), (True, False))

    def test_published_with_stable_slugs(self):
        conn = synced(self.rows())
        data = export(conn)
        self.assertEqual(exported_names(data), self.NAMES)
        slugs = {e["id"]: e["slug"] for e in data["businesses"]}
        self.assertIn("walmart-supercenter-123", slugs.values())
        # The next sync keeps every slug, and every business stays ready.
        comptroller.sync_sales_tax(conn, make_settings(), now=LATER, transport=sales_tax_transport(rows=self.rows()))
        m.match_pending(conn, now=LATER)
        publish.evaluate(conn, SETTINGS, now=LATER)
        again = {r["public_id"]: (r["slug"], r["publish_state"])
                 for r in conn.execute("SELECT public_id, slug, publish_state FROM businesses")}
        for public_id, slug in slugs.items():
            self.assertEqual(again[public_id], (slug, "ready"))


if __name__ == "__main__":
    unittest.main()

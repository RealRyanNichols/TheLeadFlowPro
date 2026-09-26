"""Go-live regressions (names): no owner's, couple's, or joint owners' name and
no home street reaches the export, whatever form the Comptroller row takes.

Rows go through the real comptroller.project_row, or the whole sync -> match
-> publish chain, so the display name and both flags are the ones the engine
stores. All data is fictional: '.example' sites, 'Example'/'Sample' streets,
and made-up owners.

    cd deploy/longview-archive && python3 -m unittest tests.test_golive_names -v
"""

import itertools
import json
import tempfile
import unittest
from pathlib import Path

from longview_archive import config, matching, normalize, privacy as p, publish
from longview_archive.sources import comptroller
from tests.fixtures import builders as b
from tests.test_sources import make_settings, sales_tax_transport

NOW = "2026-09-24T12:00:00Z"
SETTINGS = config.Settings(data_dir=Path(tempfile.gettempdir()) / "lva-test")
FIELDS = {logical: candidates[0] for logical, candidates in comptroller.FIELD_CANDIDATES.items()}
_numbers = itertools.count(1)

# The org type as the live file may carry it: a description, the two-letter
# code, blank, or no column at all (None).
ORG_FORMS = ("Sole Owner", "IS", "", None)


def row(taxpayer, outlet, org="Sole Owner", naics="561730", street=None, zip_code="75604"):
    n = next(_numbers)
    values = {
        "taxpayer_number": f"3299{n:07d}", "taxpayer_name": taxpayer, "outlet_number": "00001",
        "outlet_name": outlet, "outlet_address": street or f"{100 + n} Sample Ct",
        "outlet_city": "LONGVIEW", "outlet_zip_code": zip_code, "outlet_naics_code": naics,
        "outlet_inside_outside_city_limits_indicator": "I",
        "outlet_permit_issue_date": "2021-01-04T00:00:00.000",
    }
    if org is not None:
        values["taxpayer_organizational_type"] = org
    return values


def project(taxpayer, outlet, org="Sole Owner", **kw):
    fields = dict(FIELDS)
    if org is None:
        fields["taxpayer_org_type"] = None  # the column is missing
    key, record, _ = comptroller.project_row(row(taxpayer, outlet, org, **kw), fields)
    return record


def synced(rows):
    conn = b.make_db()
    comptroller.sync_sales_tax(conn, make_settings(), now=NOW, transport=sales_tax_transport(rows=rows))
    matching.match_pending(conn, now=NOW)
    return conn


def export(conn):
    publish.evaluate(conn, SETTINGS, now=NOW)
    return publish.build_export(conn, SETTINGS, now=NOW)


def business(conn, name):
    return conn.execute("SELECT * FROM businesses WHERE name=?", (name,)).fetchone()


class DbaOutlets(unittest.TestCase):
    """c1, c4: 'OWNER NAME DBA TRADE NAME' shows only the trade name and is held."""

    def test_only_the_trade_name_is_shown_for_every_marker_and_org_form(self):
        for outlet in ("JOHN SMITH DBA SMITH LAWN SERVICE", "JOHN SMITH D/B/A SMITH LAWN SERVICE",
                       "JOHN SMITH D.B.A. SMITH LAWN SERVICE", "JOHN SMITH doing business as SMITH LAWN SERVICE"):
            for org in ORG_FORMS:
                with self.subTest(outlet=outlet, org=org):
                    record = project("SMITH, JOHN", outlet, org)
                    self.assertEqual((record["name"], record["name_norm"]), ("Smith Lawn Service", "smith lawn service"))
                    self.assertEqual((record["is_individual"], record["personal_name"]), (True, True))

    def test_owner_name_next_to_business_words_is_personal(self):
        for taxpayer, outlet, shown in (
            ("GARCIA MARIA", "MARIA GARCIA DBA MARIA'S BAKERY", "Maria's Bakery"),
            ("SMITH JOHN", "SMITH JOHN DBA SMITH'S LAWN CARE", "Smith's Lawn Care"),
            ("SMITH JOHN", "JOHN SMITH D/B/A ACME ROOFING", "Acme Roofing"),
            ("SMITH, JOHN", "J SMITH DBA ACME ROOFING", "Acme Roofing"),
        ):
            for org in ORG_FORMS:
                with self.subTest(outlet=outlet, org=org):
                    record = project(taxpayer, outlet, org)
                    self.assertEqual(record["name"], shown)
                    self.assertTrue(record["personal_name"])
        self.assertTrue(p.outlet_is_personal_name("JOHN SMITH LAWN SERVICE", "SMITH, JOHN", True))
        self.assertFalse(p.outlet_is_personal_name("Quillfeather Plumbing", "QUILLFEATHER, DALIX", True))

    def test_an_entity_dba_also_shows_only_the_trade_name(self):
        record = project("EXAMPLE HOLDINGS LLC", "EXAMPLE HOLDINGS LLC DBA EXAMPLE TIRE",
                         "Texas Limited Liability Company", naics="811111")
        self.assertEqual((record["name"], record["is_individual"], record["personal_name"]),
                         ("Example Tire", False, False))

    def test_owner_name_never_reaches_the_export_even_with_a_website(self):
        conn = synced([row("SMITH, JOHN", "JOHN SMITH DBA SMITH LAWN SERVICE", "IS"),
                       row("GARCIA MARIA", "MARIA GARCIA DBA MARIA'S BAKERY", "Sole Owner", naics="311811")])
        data = export(conn)
        self.assertEqual(data["businesses"], [])
        for name in ("Smith Lawn Service", "Maria's Bakery"):
            biz = business(conn, name)
            self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("held", "personal_name_no_presence"))
        b.add_site(conn, business(conn, "Smith Lawn Service")["id"], "https://www.smithlawn.example/")
        b.add_site(conn, business(conn, "Maria's Bakery")["id"], "https://www.bakery.example/")
        data = export(conn)
        self.assertEqual(sorted(e["name"] for e in data["businesses"]), ["Maria's Bakery", "Smith Lawn Service"])
        self.assertEqual(sorted(e["slug"] for e in data["businesses"]), ["marias-bakery", "smith-lawn-service"])
        text = json.dumps(data).lower()
        for private in ("john", "garcia", "dba", "d/b/a"):
            self.assertNotIn(private, text)


class JointOwnersAndLongNames(unittest.TestCase):
    """c2, c5: couples, joint owners, and five-word names are people too."""

    COUPLES = ("SMITH JOHN & MARY", "SMITH, JOHN & MARY", "JOHN AND MARY SMITH", "JOHN SMITH & MARY SMITH",
               "SMITH JOHN A & MARY B", "NGUYEN THANH & HOA")

    def test_couples_are_individuals_whatever_the_partnership_form(self):
        for taxpayer in self.COUPLES:
            for org in ("General Partnership", "Texas General Partnership", "PG", "PB", "", None):
                with self.subTest(taxpayer=taxpayer, org=org):
                    self.assertTrue(p.is_individual_taxpayer(taxpayer, org))

    def test_couple_outlets_are_held(self):
        for taxpayer, outlet, org in (
            ("SMITH JOHN & MARY", "JOHN & MARY SMITH", "General Partnership"),
            ("SMITH JOHN & MARY", "JOHN & MARY SMITH", "PG"),
            ("SMITH JOHN & MARY", "SMITH JOHN & MARY", "Texas General Partnership"),
            ("SMITH JOHN & MARY", "SMITH JOHN & MARY", "PB"),
            ("JOHN AND MARY SMITH", "JOHN AND MARY SMITH", None),
            ("SMITH JOHN", "JOHN & MARY SMITH", "Sole Owner"),  # the owner's name plus the spouse's
        ):
            with self.subTest(taxpayer=taxpayer, outlet=outlet, org=org):
                record = project(taxpayer, outlet, org)
                self.assertEqual((record["is_individual"], record["personal_name"]), (True, True))

    def test_five_and_six_word_names(self):
        for taxpayer, outlet in (("DE LA CRUZ MARIA ELENA", "MARIA ELENA DE LA CRUZ"),
                                 ("DE LOS SANTOS, JOSE LUIS", "JOSE LUIS DE LOS SANTOS"),
                                 ("RODRIGUEZ MARIA DE LOS ANGELES", "MARIA DE LOS ANGELES RODRIGUEZ")):
            for org in ORG_FORMS:
                with self.subTest(taxpayer=taxpayer, org=org):
                    record = project(taxpayer, outlet, org)
                    self.assertEqual((record["is_individual"], record["personal_name"]), (True, True))
        self.assertTrue(p.outlet_is_personal_name("MARIA ELENA DE LA CRUZ", "GARCIA, MARIA", True))

    def test_couples_and_long_names_look_like_people(self):
        for name in ("Smith John & Mary", "John and Mary Smith", "Smith, John & Mary", "Robert & Linda Jones",
                     "Maria Elena De La Cruz", "Jose Luis De Los Santos", "John Allen Smith Jr"):
            with self.subTest(name=name):
                self.assertTrue(p.looks_like_person_name(name))
        for name in ("Smith & Wesson", "Example Tire & Lube", "Ben & Jerry's", "Bob and Sons", "Jones & Jones",
                     "Example Pawn & Jewelry", "Salt and Pepper", "Smith & Sons"):
            with self.subTest(name=name):
                self.assertFalse(p.looks_like_person_name(name))

    def test_businesses_with_and_stay_businesses(self):
        for taxpayer, org, outlet in (("EXAMPLE TIRE & LUBE LLC", None, "EXAMPLE TIRE & LUBE"),
                                      ("EXAMPLE PAWN & JEWELRY", "", "EXAMPLE PAWN & JEWELRY"),
                                      ("JONES & JONES", "PB", "JONES & JONES"),
                                      ("SMITH & WESSON", "", "SMITH & WESSON")):
            with self.subTest(taxpayer=taxpayer):
                self.assertFalse(p.is_individual_taxpayer(taxpayer, org, outlet))

    def test_couple_partnerships_are_held_then_reviewed(self):
        conn = synced([row("SMITH JOHN & MARY", "SMITH JOHN & MARY", "Texas General Partnership"),
                       row("JOHN AND MARY SMITH", "JOHN AND MARY SMITH", "PB")])
        data = export(conn)
        self.assertEqual(data["businesses"], [])
        self.assertNotIn("mary", json.dumps(data).lower())
        couple = business(conn, "Smith John & Mary")
        self.assertEqual((couple["publish_state"], couple["publish_reason"]), ("held", "personal_name_no_presence"))
        b.add_site(conn, couple["id"], "https://www.smithfamily.example/")
        self.assertEqual(export(conn)["businesses"], [])
        self.assertEqual(b.state(conn, couple["id"]), ("review", "person_name_check"))


class OrgTypeCodesAndBlank(unittest.TestCase):
    """c3: the 'IS' code and a blank or missing org type still find the sole owner."""

    def test_is_code_is_an_individual(self):
        for org in ("IS", "is", " IS "):
            self.assertTrue(p.is_individual_taxpayer("EXAMPLE TIRE & LUBE", org))
        self.assertFalse(p.is_individual_taxpayer("SAMPLE HOLDINGS INC", "CT"))

    def test_names_the_old_guess_missed(self):
        for taxpayer, outlet in (("O'SHEA PATRICK", "PATRICK O'SHEA"), ("JOHNSON LA'SHONDA", "LA'SHONDA JOHNSON"),
                                 ("D'SOUZA MARIA", "MARIA D'SOUZA"), ("TEMPLE JOHN", "JOHN TEMPLE"),
                                 ("GLASS MARY", "MARY GLASS"), ("CHURCH JOHN", "JOHN CHURCH"),
                                 ("CHURCH, JOHN", "JOHN CHURCH"), ("DE LA ROSA MARIA ELENA", "MARIA ELENA DE LA ROSA"),
                                 ("DE LA ROSA, MARIA ELENA", "MARIA ELENA DE LA ROSA")):
            for org in ORG_FORMS:
                with self.subTest(taxpayer=taxpayer, org=org):
                    record = project(taxpayer, outlet, org)
                    self.assertEqual((record["is_individual"], record["personal_name"]), (True, True))

    def test_a_possessive_is_still_a_business_word(self):
        self.assertFalse(p.looks_like_person_name("Joe's Tacos"))
        self.assertFalse(p.outlet_is_personal_name("Rosa's Kitchen", "GARCIA, ROSA", True))
        self.assertFalse(p.is_individual_taxpayer("SAMPLE ROOFING", "", "SAMPLE ROOFING"))

    def test_sole_owner_by_code_or_blank_is_held_and_its_street_hidden(self):
        conn = synced([row("O'SHEA PATRICK", "PATRICK O'SHEA", "IS", naics="811192", street="9 SAMPLE CT"),
                       row("TEMPLE JOHN", "JOHN TEMPLE", "", naics="722511", street="6 EXAMPLE CT"),
                       row("JOHNSON LA'SHONDA", "LA'SHONDA JOHNSON", "IS")])
        data = export(conn)
        self.assertEqual(data["businesses"], [])
        for name in ("Patrick O'Shea", "John Temple", "La'Shonda Johnson"):
            biz = business(conn, name)
            self.assertEqual((biz["is_individual"], biz["publish_state"], biz["publish_reason"]),
                             (1, "held", "personal_name_no_presence"), name)
        self.assertEqual(p.address_is_public(conn, business(conn, "John Temple")["id"]),
                         (False, "no_storefront_evidence"))

    def test_an_owner_named_listing_with_a_website_waits_for_a_person(self):
        conn = synced([row("TEMPLE JOHN", "JOHN TEMPLE", "")])
        bid = business(conn, "John Temple")["id"]
        b.add_site(conn, bid, "https://www.johntemple.example/")
        self.assertEqual(export(conn)["businesses"], [])
        self.assertEqual(b.state(conn, bid), ("review", "person_name_check"))


class DwellingUnitsAndMobileTrades(unittest.TestCase):
    """c7: a storefront NAICS code does not show a street with a dwelling unit,
    and car washes (mobile detailing) and bars (mobile bars) need other evidence."""

    def check(self, naics, street, is_individual=0):
        conn = b.make_db()
        bid = b.add_business(conn, "Example Eats", naics=naics, street=street, is_individual=is_individual)
        return p.address_is_public(conn, bid)

    def test_dwelling_units_block_naics_evidence(self):
        for raw in ("77 SAMPLE CT APT 4", "77 SAMPLE CT APARTMENT 4", "12 EXAMPLE RD LOT 9", "8 EXAMPLE RD SPACE 12",
                    "5 SAMPLE LN # 3", "5 SAMPLE LN #3", "5 SAMPLE LN UNIT 3", "8 EXAMPLE RD TRLR 5"):
            street = normalize.display_street(raw)
            with self.subTest(street=street):
                self.assertTrue(p.residential_unit(street))
                self.assertEqual(self.check("722511", street), (False, "no_storefront_evidence"))

    def test_commercial_suites_still_count(self):
        for street in ("100 Example St", "100 Example St Ste 4", "100 Example St Bldg 2"):
            with self.subTest(street=street):
                self.assertFalse(p.residential_unit(street))
                self.assertEqual(self.check("722511", street), (True, "storefront_naics"))

    def test_mobile_trades_need_other_evidence(self):
        for naics in ("811192", "722410"):
            with self.subTest(naics=naics):
                self.assertEqual(self.check(naics, "4100 Example Ln"), (False, "no_storefront_evidence"))
        conn = b.make_db()
        bid = b.add_business(conn, "Example Car Wash", naics="811192", street="4100 Example Ln")
        b.add_record(conn, bid, "osm", tags_json='{"amenity": "car_wash"}')
        self.assertEqual(p.address_is_public(conn, bid), (True, "osm_premises"))

    def test_llc_home_streets_are_not_exported(self):
        conn = synced([
            row("SHINE ON MOBILE DETAILING LLC", "SHINE ON MOBILE DETAILING", "Texas Limited Liability Company",
                naics="811192", street="4100 EXAMPLE LN", zip_code="75605"),
            row("POUR DECISIONS LLC", "POUR DECISIONS MOBILE BAR", "Texas Limited Liability Company",
                naics="722410", street="77 SAMPLE CT APT 4", zip_code="75605"),
            row("EXAMPLE EATS LLC", "EXAMPLE EATS", "Texas Limited Liability Company",
                naics="722511", street="12 EXAMPLE RD LOT 9", zip_code="75605"),
        ])
        data = export(conn)
        self.assertEqual(len(data["businesses"]), 3)
        for entry in data["businesses"]:
            self.assertEqual(entry["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})
        text = json.dumps(data)
        for street in ("4100 Example", "77 Sample", "12 Example"):
            self.assertNotIn(street, text)

    def test_unshown_website_listing_does_not_fall_back_to_naics_at_a_dwelling(self):
        conn = b.make_db()
        b.standard_sources(conn)
        bid = b.add_business(conn, "Example Eats", naics="722511", street="77 Sample Ct Apt 4")
        b.add_record(conn, bid, "tx_sales_tax")
        b.add_site(conn, bid, "https://www.exampleeats.example/", status="dead")  # not shown
        b.add_fact(conn, bid, "address_listed", True, source_url="https://www.exampleeats.example/contact")
        (entry,) = export(conn)["businesses"]
        self.assertEqual(entry["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})


class DbaNameBackstop(unittest.TestCase):
    """c4: a name that still carries a DBA marker (any source) waits for a person."""

    def test_dba_marker_in_the_shown_name_goes_to_review(self):
        conn = b.make_db()
        b.standard_sources(conn)
        bid = b.add_business(conn, "Sampleton Holdings D/B/A Example Bar", naics="722410")
        b.add_record(conn, bid, "tx_tabc")
        self.assertEqual(export(conn)["businesses"], [])
        self.assertEqual(b.state(conn, bid), ("review", "person_name_check"))


if __name__ == "__main__":
    unittest.main()

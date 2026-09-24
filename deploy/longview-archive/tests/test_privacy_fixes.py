"""Regressions for the privacy and honesty review: storefront evidence, owner
names, the website's street listing, and identity that follows its records.

All data is fictional: '.example' domains, 903-555-01xx phones, 'Example ...'
names and made-up streets.
"""

import json
import logging
import tempfile
import unittest
from pathlib import Path

from longview_archive import config, db, matching as m, normalize, privacy as p, publish
from longview_archive.extract import identity
from longview_archive.extract.html import parse_page
from tests.fixtures import builders as b
from tests.test_matching import LATER, NOW, P1, add_record, business_of, record


def settings():
    return config.Settings(data_dir=Path(tempfile.gettempdir()) / "lva-test")


def export(conn, now):
    publish.evaluate(conn, settings(), now=now)
    return publish.build_export(conn, settings(), now=now)


class OsmStorefrontEvidence(unittest.TestCase):
    """privacy:1: an OSM node at a home is not a storefront."""

    def setUp(self):
        self.conn = b.make_db()
        self.bid = b.add_business(self.conn, "Example Lawn Care", street="77 Sample Ct", naics="561730",
                                  is_individual=1)

    def osm(self, tags, street="77 Sample Ct"):
        b.add_record(self.conn, self.bid, "osm", tags_json=json.dumps(tags),
                     street=street, street_norm=normalize.parse_street(street)[0])

    def test_home_based_tags_are_not_premises(self):
        for tags in ({"craft": "gardener"}, {"office": "company"}, {"healthcare": "physiotherapist"},
                     {"amenity": "childcare"}, {"amenity": "kindergarten"}, {"amenity": "place_of_worship"},
                     {"amenity": "driving_school"}, {"tourism": "guest_house"}, {"sport": "karate"}, {}):
            with self.subTest(tags=tags):
                self.conn.execute("DELETE FROM source_records")
                self.osm(tags)
                self.assertEqual(p.address_is_public(self.conn, self.bid), (False, "no_storefront_evidence"))

    def test_storefront_tags_at_the_same_street_are_premises(self):
        for tags in ({"shop": "garden_centre"}, {"amenity": "dentist"}, {"amenity": "fuel"},
                     {"tourism": "motel"}, {"leisure": "fitness_centre"}):
            with self.subTest(tags=tags):
                self.conn.execute("DELETE FROM source_records")
                self.osm(tags)
                self.assertEqual(p.address_is_public(self.conn, self.bid), (True, "osm_premises"))
        self.conn.execute("DELETE FROM source_records")
        self.osm({"shop": "garden_centre"}, street="900 Other Example Rd")
        self.assertFalse(p.address_is_public(self.conn, self.bid)[0])

    def test_tabc_and_npi_premises_still_count(self):
        b.add_record(self.conn, self.bid, "npi")
        self.assertEqual(p.address_is_public(self.conn, self.bid), (True, "npi_premises"))


class OwnerNamedOutlets(unittest.TestCase):
    """privacy:2: middle names, Jr/II and hyphens still mark the owner's own name."""

    def test_variants_of_the_owner_name(self):
        for outlet, taxpayer in (
            ("DALIX VANTREE QUILLFEATHER", "QUILLFEATHER, DALIX V"),   # middle name added
            ("DALIX QUILLFEATHER JR", "QUILLFEATHER, DALIX"),          # generational suffix
            ("ORRIN BRAMBLEWORTH II", "BRAMBLEWORTH, ORRIN"),
            ("MIRELDA SAMPLETON-OAKES", "SAMPLETON OAKES, MIRELDA"),   # hyphenated surname
            ("MIRELDA SAMPLETON OAKES", "SAMPLETON-OAKES, MIRELDA"),
            ("ZAVIER QUILL", "BRAMBLEWORTH, ORRIN"),                   # plain name, no business word
        ):
            with self.subTest(outlet=outlet):
                self.assertTrue(p.outlet_is_personal_name(outlet, taxpayer, True))

    def test_trade_names_are_not_personal(self):
        for outlet in ("Example Lawn Care", "Quillfeather Plumbing", "Dalix's BBQ", "Example Threads Boutique"):
            with self.subTest(outlet=outlet):
                self.assertFalse(p.outlet_is_personal_name(outlet, "QUILLFEATHER, DALIX", True))
        self.assertFalse(p.outlet_is_personal_name("DALIX QUILLFEATHER JR", "QUILLFEATHER, DALIX", False))


class StorefrontNaics(unittest.TestCase):
    """privacy:3: only establishments that cannot run from a home count by NAICS alone."""

    def check(self, naics, is_individual=0):
        conn = b.make_db()
        bid = b.add_business(conn, "Example Threads", naics=naics, is_individual=is_individual)
        return p.address_is_public(conn, bid)

    def test_home_capable_codes_need_other_evidence(self):
        for naics in ("458110", "459999", "459420", "456120", "457210", "449110", "455219", "448140",
                      "812111", "812112", "811111", "722513", "722515", "454110", "621210"):
            with self.subTest(naics=naics):
                self.assertEqual(self.check(naics), (False, "no_storefront_evidence"))

    def test_storefront_codes(self):
        for naics in ("721110", "622110", "447110", "457110", "457120", "445110", "445120", "445131",
                      "452210", "455110", "455211", "441110", "441120", "811192", "522110", "512131",
                      "713950", "722511", "722410"):
            with self.subTest(naics=naics):
                self.assertEqual(self.check(naics), (True, "storefront_naics"))
                self.assertEqual(self.check(naics, is_individual=1), (False, "no_storefront_evidence"))


class AddressListedOnSite(unittest.TestCase):
    """privacy:4: the house number must be followed by the street."""

    def listed(self, text, street):
        page = parse_page(f"<title>Welcome</title><p>{text}</p>", "https://www.exampleplumbing.example/")
        return identity.site_matches_business(page, "Unrelated Name", street)[2]

    def test_year_and_town_is_not_a_street(self):
        self.assertFalse(self.listed("Serving Longview and Example Oak since 2012.", "2012 Oak Sample Dr"))
        self.assertFalse(self.listed("Mowing, mulch and pine straw installs for 20 years.", "20 Pine Example Rd"))
        self.assertFalse(self.listed("Example Ave repairs since 1200 customers", "1200 W Example Ave"))

    def test_number_then_street(self):
        for text, street in (
            ("1200 W Example Ave, Longview, TX 75601", "1200 W Example Ave"),
            ("Visit us at 1200 W. Example Avenue", "1200 W Example Ave"),
            ("1200 West Example Ave Ste 4", "1200 W Example Ave"),
            ("1200 Example Avenue", "1200 Example Ave"),
            ("100 U.S. Hwy 259 N", "100 US Highway 259 N"),
            ("2012 Oak Sample Dr, Longview", "2012 Oak Sample Dr"),
        ):
            with self.subTest(text=text):
                self.assertTrue(self.listed(text, street))


class IdentityFollowsItsSource(unittest.TestCase):
    """privacy:5 and honesty:4: a moved or renamed outlet is not shown under its old identity."""

    def setUp(self):
        self.conn = b.make_db()
        b.standard_sources(self.conn)
        self.rid = add_record(self.conn, "tx_sales_tax", "S1", "Example Threads LLC", street="123 Example Ln",
                              naics="458110", permit_start="2019-03-01")
        m.match_pending(self.conn, now=NOW)
        self.biz = business_of(self.conn, "tx_sales_tax", "S1")
        b.add_fact(self.conn, self.biz["id"], "address_listed", True)

    def resync(self, rid, **cols):
        sets = ", ".join(f"{k}=?" for k in cols)
        self.conn.execute(f"UPDATE source_records SET {sets}, match_state='new' WHERE id=?", (*cols.values(), rid))

    def test_identity_source_rename_and_move_are_followed(self):
        self.resync(self.rid, name="Sample Auto Care", name_norm=normalize.norm_name("Sample Auto Care"),
                    street="500 W SAMPLE ST STE 2", street_norm="500 w sample st", suite="2", zip="75602",
                    naics="811192")
        with self.assertLogs("longview_archive", level=logging.DEBUG) as logs:
            m.match_pending(self.conn, now=LATER)
        after = business_of(self.conn, "tx_sales_tax", "S1")
        self.assertEqual((after["name"], after["name_norm"]), ("Sample Auto Care", "sample auto care"))
        self.assertEqual((after["street"], after["street_norm"], after["suite"], after["zip"]),
                         ("500 W Sample St Ste 2", "500 w sample st", "2", "75602"))
        self.assertEqual((after["naics"], after["category"]), ("811192", "auto"))
        self.assertEqual((after["public_id"], after["slug"]), (self.biz["public_id"], self.biz["slug"]))
        self.assertEqual(after["permit_start"], "2019-03-01")
        # The website's listing vouched for the old street only.
        self.assertIsNone(self.conn.execute(
            "SELECT 1 FROM facts WHERE business_id=? AND field='address_listed'", (after["id"],)).fetchone())
        items = {r["field"]: r for r in self.conn.execute(
            "SELECT * FROM review_queue WHERE kind='identity_changed' AND status='open'")}
        self.assertEqual(set(items), {"name", "address"})
        self.assertEqual((json.loads(items["name"]["proposed_json"]), json.loads(items["name"]["current_json"])),
                         ("Sample Auto Care", "Example Threads LLC"))
        self.assertEqual((json.loads(items["address"]["proposed_json"]),
                          json.loads(items["address"]["current_json"])),
                         ("500 W Sample St Ste 2", "123 Example Ln"))
        text = " ".join(logs.output)
        for value in ("Sample Auto Care", "Example Threads", "123 Example", "500 W", "sample auto"):
            self.assertNotIn(value.lower(), text.lower())

        # The export shows only what the record states now, credited to it.
        data = export(self.conn, LATER)
        (entry,) = data["businesses"]
        self.assertEqual(entry["name"], "Sample Auto Care")
        self.assertNotIn("123 Example Ln", json.dumps(data))
        self.assertNotIn("Example Threads", json.dumps(data))
        self.assertEqual(entry["address"]["street"], "500 W Sample St Ste 2")  # car wash: storefront NAICS

    def test_other_record_disagreeing_goes_to_review_only(self):
        tabc = add_record(self.conn, "tx_tabc", "T1", "Example Threads", street="123 Example Ln")
        m.match_pending(self.conn, now=NOW)
        self.assertEqual(business_of(self.conn, "tx_tabc", "T1")["id"], self.biz["id"])
        self.resync(tabc, name="Unrelated Fixture Cantina", name_norm="unrelated fixture cantina",
                    street="900 Sample Pkwy", street_norm="900 sample pkwy")
        m.match_pending(self.conn, now=LATER)
        after = business_of(self.conn, "tx_sales_tax", "S1")
        self.assertEqual((after["name"], after["street"]), ("Example Threads LLC", "123 Example Ln"))
        fields = {r["field"] for r in self.conn.execute(
            "SELECT field FROM review_queue WHERE kind='source_conflict' AND status='open'")}
        self.assertEqual(fields, {"name", "address"})
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM review_queue WHERE kind='identity_changed'").fetchone()[0], 0)

    def test_identity_source_is_first_by_priority_then_key(self):
        other = add_record(self.conn, "tx_sales_tax", "S2", "EXAMPLE THREADS", street="123 Example Ln")
        m.match_pending(self.conn, now=NOW)
        self.assertEqual(business_of(self.conn, "tx_sales_tax", "S2")["id"], self.biz["id"])
        self.resync(other, name="EXAMPLE THREADS OUTLET", name_norm="example threads outlet")
        m.match_pending(self.conn, now=LATER)
        self.assertEqual(business_of(self.conn, "tx_sales_tax", "S1")["name"], "Example Threads LLC")


class OsmOnlyReplacedByPrimary(unittest.TestCase):
    """privacy:6 and honesty:2: nothing OSM-only survives a primary join, slug included."""

    def test_primary_values_replace_osm_values(self):
        conn = b.make_db()
        b.standard_sources(conn)
        add_record(conn, "osm", "node/7", "Dalix Quillfeather DDS", street="300 Fixture Road Unit B",
                   zip_code="75605", phone=P1, lat=32.5, lon=-94.7, tags={"amenity": "clinic"})
        m.match_pending(conn, now=NOW)
        osm_biz = business_of(conn, "osm", "node/7")
        self.assertEqual((osm_biz["slug"], osm_biz["suite"]), ("dalix-quillfeather-dds", "b"))

        add_record(conn, "npi", "1000000001", "Example Family Dental PLLC", street="300 FIXTURE RD",
                   zip_code="75605", phone=P1, tags={"taxonomy": "Dentist"})
        m.match_pending(conn, now=LATER)
        biz = business_of(conn, "npi", "1000000001")
        self.assertEqual(biz["id"], osm_biz["id"])
        self.assertEqual(biz["public_id"], osm_biz["public_id"])
        self.assertEqual((biz["name"], biz["slug"]), ("Example Family Dental PLLC", "example-family-dental-pllc"))
        self.assertEqual((biz["street"], biz["street_norm"], biz["suite"], biz["zip"]),
                         ("300 Fixture Rd", "300 fixture rd", None, "75605"))
        self.assertEqual((biz["category"], biz["category_label"]), ("health-dental", "Dentist office"))
        self.assertEqual((biz["lat"], biz["lon"]), (32.5, -94.7))  # the NPI record has no position
        self.assertIsNone(conn.execute("SELECT 1 FROM businesses WHERE slug='dalix-quillfeather-dds'").fetchone())

        data = export(conn, LATER)
        (entry,) = data["businesses"]
        self.assertEqual((entry["slug"], entry["name"]), ("example-family-dental-pllc", "Example Family Dental PLLC"))
        self.assertEqual(entry["address"]["street"], "300 Fixture Rd")
        self.assertEqual({f["field"]: f["source"] for f in entry["facts"]},
                         {"name": "npi", "address": "npi", "category": "npi"})
        text = json.dumps(data).lower()
        self.assertNotIn("quillfeather", text)
        self.assertNotIn("ste b", text)


if __name__ == "__main__":
    unittest.main()

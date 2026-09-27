"""Go-live regressions for profile slugs (c6, c8): a repeated or reserved name
is told apart by the end of its public id, never by its street, because a
home address is shown as "Longview, TX" only and a slug never changes once set.
A name (and so its slug) that spells out that street itself waits for a person.

Rows go through the real sales-tax projection, writer, matching, publish,
contract check and site renderer. All data is fictional: made-up streets,
taxpayer numbers and owner names.
"""

import dataclasses
import tempfile
import unittest
from pathlib import Path

from longview_archive import config, facts, matching as m, privacy, publish, site, validate
from longview_archive.sources import comptroller
from longview_archive.sources.http import RecordWriter
from tests.fixtures import builders as b
from tests.test_matching import LATER, NOW, add_record, business_of, expected_public_id

FIELDS = {k: k for k in (
    "taxpayer_number", "outlet_number", "outlet_name", "outlet_city", "outlet_address", "outlet_zip",
    "outlet_naics", "taxpayer_name", "taxpayer_org_type", "inside_city_limits", "permit_start")}
# Every fixture street as a slug would spell it; none may reach a URL.
STREETS = ("example-ln", "sample-ct", "fixture-cir", "sample-ln", "placeholder-dr", "fictional-branch-rd",
           "imaginary-hollow-ln")


def outlet(taxpayer, name, address, owner="DOE, JANE", naics="454390", zip_code="75605", inside="Y"):
    """A sole owner's sales-tax outlet, as the Comptroller lists it."""
    return dict(taxpayer_number=taxpayer, outlet_number="00001", outlet_name=name, outlet_city="LONGVIEW",
                outlet_address=address, outlet_zip=zip_code, outlet_naics=naics, taxpayer_name=owner,
                taxpayer_org_type="Sole Owner", inside_city_limits=inside, permit_start="2016-04-01")


def key_of(row):
    return f"{row['taxpayer_number']}:{row['outlet_number']}"


class PipelineCase(unittest.TestCase):
    """Fresh fictional archive; rows go through the real pipeline."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-slug-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(data_dir=Path(self.tmp.name) / "data")
        self.conn = b.make_db()
        b.standard_sources(self.conn)

    def sync(self, rows, now=NOW, conn=None):
        conn = conn or self.conn
        writer = RecordWriter(conn, "tx_sales_tax", now, {})
        for row in rows:
            key, record, _ = comptroller.project_row(row, FIELDS)
            writer.add(key, record, row, "public", b.DATASET_URL)
        writer.flush()
        m.match_pending(conn, now=now)

    def slug(self, row, conn=None):
        return business_of(conn or self.conn, "tx_sales_tax", key_of(row))["slug"]

    def published(self):
        """The directory and every site file, after the site's own contract check."""
        publish.evaluate(self.conn, self.settings, now=NOW)
        result = validate.validate_directory(publish.build_export(self.conn, self.settings, now=NOW))
        self.assertEqual(result.dropped, [])
        return result.directory, site.render_site(result.directory, self.settings)

    def assert_no_street_in_any_url(self, expected_slugs):
        directory, files = self.published()
        self.assertEqual(sorted(biz["slug"] for biz in directory["businesses"]), sorted(expected_slugs))
        for biz in directory["businesses"]:
            self.assertEqual(site.address_line(biz), "Longview, TX")
        for rel, text in files.items():  # profile paths, canonical tags, cards, search.json, claim mailto
            for street in STREETS:
                with self.subTest(file=rel, street=street):
                    self.assertNotIn(street, rel)
                    self.assertNotIn(street, text.casefold())
                    self.assertNotIn(street.replace("-", " "), text.casefold())  # names, titles, headings

    def suffixed(self, base, row):
        return f"{base}-{expected_public_id('tx_sales_tax', key_of(row))[-4:]}"


class SlugNeverCarriesTheStreet(PipelineCase):
    def test_repeated_home_based_names_c6(self):
        rows = [outlet("30000000011", "SCENTSY", "4100 EXAMPLE LN"),
                outlet("30000000022", "SCENTSY", "77 SAMPLE CT", owner="ROE, MARY"),
                outlet("30000000033", "SCENTSY", "3 FIXTURE CIR APT 4", owner="POE, ANN")]
        self.sync(rows)
        self.assertEqual([self.slug(r) for r in rows],
                         ["scentsy", self.suffixed("scentsy", rows[1]), self.suffixed("scentsy", rows[2])])
        self.assert_no_street_in_any_url([self.slug(r) for r in rows])

    def test_generic_trade_names_c6_c8(self):
        rows = [outlet("30000000041", "LAWN SERVICE", "4100 EXAMPLE LN", naics="561730"),
                outlet("30000000042", "LAWN SERVICE", "77 SAMPLE CT", owner="ROE, RICHARD", naics="561730"),
                outlet("30000000051", "EXAMPLE BEAUTY CONSULTANT", "4411 SAMPLE LN"),
                outlet("30000000052", "EXAMPLE BEAUTY CONSULTANT", "907 PLACEHOLDER DR", owner="ROE, MARY")]
        self.sync(rows)
        self.assertEqual(self.slug(rows[1]), self.suffixed("lawn-service", rows[1]))
        self.assertEqual(self.slug(rows[3]), self.suffixed("example-beauty-consultant", rows[3]))
        self.assert_no_street_in_any_url([self.slug(r) for r in rows])

    def test_name_taken_by_an_unpublished_business_c8(self):
        # "Unpublished" is the city-only setting (LVA_PUBLISH_SCOPES=city); by default nearby is listed too.
        self.settings = dataclasses.replace(self.settings, publish_scopes=("city",))
        nearby = outlet("30000000061", "AVON", "1204 FICTIONAL BRANCH RD", zip_code="75604", inside="O")
        home = outlet("30000000062", "AVON", "318 IMAGINARY HOLLOW LN", owner="ROE, MARY")
        self.sync([nearby, home])
        self.assertEqual(business_of(self.conn, "tx_sales_tax", key_of(nearby))["scope"], "nearby")
        self.assertEqual((self.slug(nearby), self.slug(home)), ("avon", self.suffixed("avon", home)))
        self.assert_no_street_in_any_url([self.slug(home)])

    def test_reserved_names_at_homes_c8(self):
        rows = [outlet("30000000071", "ABOUT", "318 IMAGINARY HOLLOW LN"),
                outlet("30000000072", "STATUS", "77 SAMPLE CT", owner="ROE, MARY"),
                outlet("30000000073", "PAGE 2", "907 PLACEHOLDER DR", owner="POE, ANN")]
        self.sync(rows)
        for row, base in zip(rows, ("about", "status", "page-2")):
            self.assertEqual(self.slug(row), self.suffixed(base, row))
            self.assertFalse(m._reserved(self.slug(row)))
        self.assert_no_street_in_any_url([self.slug(r) for r in rows])

    def test_osm_confirmation_rebuilds_the_slug_without_the_street(self):
        first = outlet("30000000081", "LAWN SERVICE", "4100 EXAMPLE LN", naics="561730")
        self.sync([first])
        add_record(self.conn, "osm", "node/81", "Lawn Service", street="77 Sample Ct", zip_code="75605",
                   tags={"craft": "gardener"})
        m.match_pending(self.conn, now=NOW)
        held = business_of(self.conn, "osm", "node/81")
        self.assertEqual(held["slug"], "lawn-service-" + held["public_id"][-4:])
        home = outlet("30000000082", "LAWN SERVICE", "77 SAMPLE CT", owner="ROE, RICHARD", naics="561730")
        self.sync([first, home], now=LATER)
        confirmed = business_of(self.conn, "tx_sales_tax", key_of(home))
        self.assertEqual(confirmed["id"], held["id"])
        self.assertEqual(confirmed["slug"], "lawn-service-" + held["public_id"][-4:])
        self.assertNotIn("sample-ct", confirmed["slug"])

    def test_slugs_are_stable_across_runs_and_rebuilds(self):
        rows = [outlet("30000000091", "SCENTSY", "4100 EXAMPLE LN"),
                outlet("30000000092", "SCENTSY", "77 SAMPLE CT", owner="ROE, MARY"),
                outlet("30000000093", "SCENTSY", "3 FIXTURE CIR APT 4", owner="POE, ANN")]
        self.sync(rows)
        before = [self.slug(r) for r in rows]
        # The next sync, with the second outlet moved, keeps every slug.
        moved = dict(rows[1], outlet_address="12 OTHER EXAMPLE RD")
        self.sync([rows[0], moved, rows[2]], now=LATER)
        self.assertEqual([self.slug(r) for r in rows], before)
        # A rebuild from the same records, stored in the other order, gives the same slugs.
        rebuilt = b.make_db()
        self.sync(list(reversed(rows)), conn=rebuilt)
        self.assertEqual([self.slug(r, rebuilt) for r in rows], before)


class NameThatSpellsTheHomeStreet(PipelineCase):
    """The outlet's own registered name carries its home address (review round 1)."""

    def assert_waits_for_a_person(self, row):
        biz = business_of(self.conn, "tx_sales_tax", key_of(row))
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "name_contains_address"))
        items = self.conn.execute(
            "SELECT status FROM review_queue WHERE business_id=? AND kind='name_contains_address'", (biz["id"],)
        ).fetchall()
        self.assertEqual([i["status"] for i in items], ["open"])
        return biz

    def test_names_that_are_the_address_are_held_from_the_directory(self):
        rows = [outlet("30000000101", "SCENTSY - 4100 EXAMPLE LN", "4100 EXAMPLE LN"),
                outlet("30000000102", "77 SAMPLE CT", "77 SAMPLE CT", owner="ROE, MARY")]
        self.sync(rows)
        self.assertEqual([self.slug(r) for r in rows], ["scentsy-4100-example-ln", "77-sample-ct"])
        self.assert_no_street_in_any_url([])  # evaluates, builds, checks and renders
        for row in rows:
            self.assert_waits_for_a_person(row)

    def test_name_with_the_street_after_a_taken_name(self):
        taken = outlet("30000000111", "SCENTSY", "4100 EXAMPLE LN")
        home = outlet("30000000112", "SCENTSY 77 SAMPLE CT", "77 SAMPLE CT", owner="ROE, MARY")
        self.sync([taken, home])
        self.assertEqual((self.slug(taken), self.slug(home)), ("scentsy", "scentsy-77-sample-ct"))
        self.assert_no_street_in_any_url(["scentsy"])
        self.assert_waits_for_a_person(home)

    def test_spelled_out_suffix_house_number_and_direction(self):
        rows = [outlet("30000000121", "SAMPLE COURT CANDLE SHOP", "77 SAMPLE CT"),
                outlet("30000000122", "SCENTSY 4100 EXAMPLE", "4100 EXAMPLE LN", owner="ROE, MARY"),
                outlet("30000000123", "907 NORTH PLACEHOLDER DRIVE", "907 N PLACEHOLDER DR", owner="POE, ANN")]
        self.sync(rows)
        self.assert_no_street_in_any_url([])
        for row in rows:
            self.assert_waits_for_a_person(row)

    def test_a_person_decides_and_the_answer_sticks(self):
        yes = outlet("30000000131", "77 SAMPLE CT", "77 SAMPLE CT")
        no = outlet("30000000132", "SCENTSY - 4100 EXAMPLE LN", "4100 EXAMPLE LN", owner="ROE, MARY")
        self.sync([yes, no])
        publish.evaluate(self.conn, self.settings, now=NOW)
        item = {}
        for row in (yes, no):
            item[key_of(row)] = self.conn.execute(
                "SELECT id FROM review_queue WHERE business_id=? AND kind='name_contains_address'",
                (self.assert_waits_for_a_person(row)["id"],)).fetchone()["id"]
        facts.accept_review(self.conn, item[key_of(yes)], "owner")
        facts.reject_review(self.conn, item[key_of(no)], "owner")
        directory, _ = self.published()
        self.assertEqual([biz["slug"] for biz in directory["businesses"]], ["77-sample-ct"])
        held = business_of(self.conn, "tx_sales_tax", key_of(no))
        self.assertEqual((held["publish_state"], held["publish_reason"]), ("held", "name_address_rejected"))
        count = self.conn.execute("SELECT COUNT(*) FROM review_queue WHERE kind='name_contains_address'")
        self.assertEqual(count.fetchone()[0], 2)  # no new item on the next evaluate

    def test_a_slug_fixed_before_a_rename_still_waits(self):
        row = outlet("30000000141", "77 SAMPLE CT", "77 SAMPLE CT")
        self.sync([row])
        self.sync([dict(row, outlet_name="SCENTSY")], now=LATER)
        biz = business_of(self.conn, "tx_sales_tax", key_of(row))
        self.assertEqual((biz["name"], biz["slug"]), ("Scentsy", "77-sample-ct"))
        self.assert_no_street_in_any_url([])
        self.assert_waits_for_a_person(row)

    def test_a_storefront_may_carry_its_street_in_its_name(self):
        grill = dict(outlet("30000000151", "SAMPLE CT GRILL", "77 SAMPLE CT", owner="SAMPLE GRILL LLC",
                            naics="722511"), taxpayer_org_type="Texas Limited Liability Company")
        self.sync([grill])
        directory, _ = self.published()
        self.assertEqual([biz["slug"] for biz in directory["businesses"]], ["sample-ct-grill"])
        self.assertEqual(site.address_line(directory["businesses"][0]), "77 Sample Ct, Longview, TX 75605")

    def test_what_spells_a_street(self):
        spells = [("77 Sample CT", "77 sample ct"), ("Scentsy - 4100 Example LN", "4100 example ln"),
                  ("scentsy-77-sample-ct", "77 sample ct"), ("Sample Court Candles", "77 sample ct"),
                  ("Scentsy 77 Sample", "77 sample ct"), ("1200 West Example Avenue Crafts", "1200 w example ave"),
                  ("Farm to Market 1845 Storage", "4100 fm 1845"), ("Candles at 3 Fixture Cir", "3 fixture cir")]
        for name, street in spells:
            with self.subTest(name=name):
                self.assertTrue(privacy.name_spells_street(name, street))
        # A street's name alone, or a bare suffix, is not an address.
        for name, street in [("Sample Candles", "77 sample ct"), ("Example Tire and Lube", "1200 w example ave"),
                             ("Scentsy", "77 sample ct"), ("St Example Crafts", "100 n st"),
                             ("77 Sample Ct", None), ("77 Candles", "77 sample ct")]:
            with self.subTest(name=name):
                self.assertFalse(privacy.name_spells_street(name, street))


if __name__ == "__main__":
    unittest.main()


def setUpModule():  # these tests cover the NAICS storefront rule, which is off in production
    privacy.NAICS_STOREFRONT = True


def tearDownModule():
    privacy.NAICS_STOREFRONT = False

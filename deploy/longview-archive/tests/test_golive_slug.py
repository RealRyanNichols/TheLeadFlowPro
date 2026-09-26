"""Go-live regressions for profile slugs (c6, c8): a repeated or reserved name
is told apart by the end of its public id, never by its street, because a
home address is shown as "Longview, TX" only and a slug never changes once set.

Rows go through the real sales-tax projection, writer, matching, publish,
contract check and site renderer. All data is fictional: made-up streets,
taxpayer numbers and owner names.
"""

import tempfile
import unittest
from pathlib import Path

from longview_archive import config, matching as m, publish, site, validate
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


class SlugNeverCarriesTheStreet(unittest.TestCase):
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
                    self.assertNotIn(street, text)

    def suffixed(self, base, row):
        return f"{base}-{expected_public_id('tx_sales_tax', key_of(row))[-4:]}"

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


if __name__ == "__main__":
    unittest.main()

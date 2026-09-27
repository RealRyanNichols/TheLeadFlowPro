"""Final go-live holds: a possibly-a-person taxpayer, and no street on the NAICS code alone."""
import unittest

from longview_archive import privacy
from longview_archive.sources import comptroller


def row(taxpayer, outlet, naics="722511", org=None, street="319 EXAMPLE DR"):
    r = {
        "taxpayer_name": taxpayer,
        "outlet_name": outlet,
        "outlet_address": street,
        "outlet_city": "LONGVIEW",
        "outlet_zip_code": "75604",
        "outlet_naics_code": naics,
        "outlet_inside_outside_city_limits_indicator": "I",
        "outlet_permit_issue_date": "2021-01-04T00:00:00.000",
        "taxpayer_number": "00000000001",
        "outlet_number": "00001",
    }
    if org is not None:
        r["taxpayer_organizational_type"] = org
    return r


class PossiblyAPerson(unittest.TestCase):
    def project(self, r):
        fields = {logical: candidates[0] for logical, candidates in comptroller.FIELD_CANDIDATES.items()}
        if "taxpayer_organizational_type" not in r:
            fields["taxpayer_org_type"] = None  # the column is missing
        _key, record, reason = comptroller.project_row(r, fields)
        self.assertIsNotNone(record, reason)
        return record

    def test_a_surname_that_reads_like_a_trade_word_is_still_a_person(self):
        for taxpayer, outlet in (("GLASS JENNIFER D B A ALL STAR CINEMA", "ALL STAR CINEMA"),
                                 ("TEMPLE NICOLE", "CYPRESS MOTORS"),
                                 ("AMY AND NICOLE BARBER", "BRIGHT INN")):
            with self.subTest(taxpayer=taxpayer):
                self.assertTrue(self.project(row(taxpayer, outlet))["is_individual"])

    def test_a_clearly_named_company_is_not_a_person(self):
        record = self.project(row("RED RIVER GRILL LLC", "RED RIVER GRILL", org="Texas Limited Liability Company"))
        self.assertFalse(record["is_individual"])


class NoStreetOnTheNaicsCodeAlone(unittest.TestCase):
    def test_the_rule_is_off_in_production(self):
        self.assertFalse(privacy.NAICS_STOREFRONT)

    def test_a_company_with_a_storefront_code_does_not_show_its_street_without_other_evidence(self):
        from tests.test_privacy import add_business, make_db
        conn = make_db()
        bid = add_business(conn, naics="722511")  # a restaurant code, a company taxpayer, no unit
        self.assertEqual(privacy.address_is_public(conn, bid), (False, "no_storefront_evidence"))


if __name__ == "__main__":
    unittest.main()

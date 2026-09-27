"""The Texas Comptroller's "Active Franchise Taxpayers" list as a source (sources/franchise.py).

Companies with a Longview address that have no sales-tax outlet get a listing
from the franchise-tax list: its name, "Longview, TX", and the year its
franchise-tax registration began. These tests cover the good-standing and
exemption filters, the de-duplication against sales-tax outlets in both sync
orders, the person-name holds, the mailing address (never requested, stored,
or shown), the category fallback, the scope and ZIP rules with the new default
publish scopes, the fail-safe skip on a schema mismatch, the franchise list as a
primary source (alone, and joined by name to an OpenStreetMap place), and the
whole chain sync -> match -> publish -> approve -> site with a fake
data.texas.gov. All data is fictional: made-up names, taxpayer numbers,
streets, and .example hosts. Nothing touches the network.

    cd deploy/longview-archive && python3 -m unittest tests.test_franchise -v
"""

from __future__ import annotations

import dataclasses
import json
import logging
import tempfile
import unittest
from pathlib import Path

from longview_archive import approval, categories, config, db, matching, privacy, publish, service, site, status, validate
from longview_archive.sources import franchise
from tests.test_matching import add_record
from tests.test_sources import SOCRATA_HOST, FakeTransport, NoWaitCase

NOW = "2026-09-24T12:00:00Z"
LATER = "2026-10-01T12:00:00Z"
LATEST = "2026-10-08T12:00:00Z"
FR_ID = "frnc-0001"
ST_ID = "stax-0001"
MAILING = "900 PRIVATE HOME LN"  # a planted mailing address: must never leave the engine

FR_COLUMNS = [
    "secretary_of_state_sos_or_coa_file_number", "taxpayer_state", "record_type_code", "taxpayer_city",
    "right_to_transact_business_code", "taxpayer_number", "_621111", "current_exempt_reason_code",
    "sos_status_code", "sos_status_date", "sos_charter_date", "responsibility_beginning_date", "taxpayer_name",
    "taxpayer_organizational_type", "taxpayer_county_code", "taxpayer_zip", "taxpayer_address", "exempt_begin_date",
]
ST_COLUMNS = [
    "taxpayer_number", "taxpayer_name", "taxpayer_address", "taxpayer_organizational_type", "outlet_number",
    "outlet_name", "outlet_address", "outlet_city", "outlet_zip_code", "outlet_naics_code",
    "outlet_inside_outside_city_limits_indicator", "outlet_permit_issue_date",
]


def fr_row(number, name, org="CL", zip_code="75601", rtt="A", exempt=None, since="2014-05-01T00:00:00.000",
           city="LONGVIEW"):
    row = {
        "taxpayer_number": number, "taxpayer_name": name, "taxpayer_address": MAILING, "taxpayer_city": city,
        "taxpayer_state": "TX", "taxpayer_zip": zip_code, "taxpayer_organizational_type": org,
        "record_type_code": "U", "sos_status_code": "A", "sos_charter_date": "2013-11-20T00:00:00.000",
        "responsibility_beginning_date": since, "taxpayer_county_code": "092",
    }
    if rtt is not None:
        row["right_to_transact_business_code"] = rtt
    if exempt is not None:  # Socrata leaves a null column out of the row
        row["current_exempt_reason_code"] = exempt
    return row


def st_row(number, outlet, name, street, zip_code="75601", naics="811111", taxpayer="EXAMPLE HOLDINGS LLC",
           inside="I"):
    return {
        "taxpayer_number": number, "taxpayer_name": taxpayer, "taxpayer_address": MAILING,
        "taxpayer_organizational_type": "Texas Limited Liability Company", "outlet_number": outlet,
        "outlet_name": name, "outlet_address": street, "outlet_city": "LONGVIEW", "outlet_zip_code": zip_code,
        "outlet_naics_code": naics, "outlet_inside_outside_city_limits_indicator": inside,
        "outlet_permit_issue_date": "2020-02-01T00:00:00.000",
    }


def catalog_entry(dataset_id, name, columns, domain=SOCRATA_HOST):
    return {"resource": {"id": dataset_id, "name": name, "type": "dataset", "updatedAt": "2026-09-20T05:00:00.000Z",
                         "columns_field_name": list(columns)},
            "metadata": {"domain": domain}}


def view(dataset_id, name, columns):
    return {"id": dataset_id, "name": name, "license": {"name": "Public Domain"},
            "columns": [{"fieldName": c} for c in columns]}


class FakeDataTexas(FakeTransport):
    """data.texas.gov with the sales-tax and franchise-tax datasets; rows can change between syncs."""

    def __init__(self, franchise_rows=(), sales_rows=(), franchise_columns=FR_COLUMNS, with_franchise=True):
        super().__init__()
        self.rows = {FR_ID: list(franchise_rows), ST_ID: list(sales_rows)}
        entries = [catalog_entry(ST_ID, "Active Sales Tax Permit Holders", ST_COLUMNS),
                   # A decoy on another domain, and an unrelated franchise dataset without the columns.
                   catalog_entry("frnc-9999", "Active Franchise Taxpayers", FR_COLUMNS, domain="data.other.example"),
                   catalog_entry("frnc-0002", "Franchise Tax Refunds by County", ["county", "amount"])]
        views = {ST_ID: view(ST_ID, "Active Sales Tax Permit Holders", ST_COLUMNS),
                 "frnc-0002": view("frnc-0002", "Franchise Tax Refunds by County", ["county", "amount"])}
        if with_franchise:
            entries.append(catalog_entry(FR_ID, "Active Franchise Taxpayers", franchise_columns))
            views[FR_ID] = view(FR_ID, "Active Franchise Taxpayers", franchise_columns)
        self.on("GET", SOCRATA_HOST, "/api/catalog/v1", lambda c: {"results": entries})
        for dataset_id, body in views.items():
            self.on("GET", SOCRATA_HOST, f"/api/views/{dataset_id}.json", lambda c, v=body: v)
        for dataset_id in (FR_ID, ST_ID):
            def serve(c, dataset_id=dataset_id):
                offset, limit = int(c.query.get("$offset", 0)), int(c.query["$limit"])
                return self.rows[dataset_id][offset:offset + limit]
            self.on("GET", SOCRATA_HOST, f"/resource/{dataset_id}.json", serve)


def make_settings(tmp, **kw):
    values = dict(data_dir=Path(tmp) / "data", socrata_base=f"https://{SOCRATA_HOST}", api_min_interval_s=0.0,
                  allow_fictional_phones=True)
    values.update(kw)
    return config.Settings(**values)


class FranchiseCase(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-franchise-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = make_settings(self.tmp.name)
        self.conn = db.connect(":memory:")
        db.migrate(self.conn)
        with db.transaction(self.conn):
            categories.seed(self.conn)
        self.addCleanup(self.conn.close)
        self.api = FakeDataTexas()

    # ------------------------------------------------------------ helpers
    def sync_franchise(self, rows=None, now=NOW):
        if rows is not None:
            self.api.rows[FR_ID] = list(rows)
        return franchise.sync_franchise(self.conn, self.settings, now=now, transport=self.api)

    def sync_sales(self, rows, now=NOW):
        from longview_archive.sources import comptroller
        self.api.rows[ST_ID] = list(rows)
        return comptroller.sync_sales_tax(self.conn, self.settings, now=now, transport=self.api)

    def match(self, now=NOW):
        return matching.match_pending(self.conn, now)

    def record(self, source_id, key):
        return self.conn.execute("SELECT * FROM source_records WHERE source_id=? AND source_key=?",
                                 (source_id, key)).fetchone()

    def business_of(self, source_id, key):
        rec = self.record(source_id, key)
        if rec is None or rec["business_id"] is None:
            return None
        return self.conn.execute("SELECT * FROM businesses WHERE id=?", (rec["business_id"],)).fetchone()

    def evaluate(self, settings=None):
        publish.evaluate(self.conn, settings or self.settings, LATEST)

    def state(self, source_id, key):
        biz = self.business_of(source_id, key)
        return (biz["publish_state"], biz["publish_reason"]) if biz is not None else None

    def export(self, settings=None):
        return publish.build_export(self.conn, settings or self.settings, LATEST)

    def active_businesses(self):
        return self.conn.execute("SELECT COUNT(*) FROM businesses WHERE active=1").fetchone()[0]


# ---------------------------------------------------------------- the sync

class SyncTests(FranchiseCase):
    def test_good_standing_and_exempt_filters(self):
        counts = self.sync_franchise([
            fr_row("32000000101", "EXAMPLE WIDGETS LLC"),
            fr_row("32000000102", "EXAMPLE FORFEITED LLC", rtt="N"),
            fr_row("32000000103", "EXAMPLE DISSOLVED INC", org="CT", rtt="D"),
            fr_row("32000000104", "EXAMPLE UNKNOWN LLC", rtt="U"),
            fr_row("32000000105", "EXAMPLE CHARITY INC", org="CN", exempt="12"),
            fr_row("32000000106", "EXAMPLE OUT OF TOWN LLC", city="KILGORE"),
            fr_row("", "EXAMPLE NO NUMBER LLC"),
        ])
        self.assertEqual(counts["status"], "ok")
        self.assertEqual(counts["dataset_id"], FR_ID)  # not the decoy, not the refunds dataset
        self.assertEqual((counts["fetched"], counts["kept"]), (7, 1))
        self.assertEqual(counts["skipped_not_in_good_standing"], 3)
        self.assertEqual(counts["skipped_exempt"], 1)
        self.assertEqual((counts["skipped_city"], counts["skipped_no_key"]), (1, 1))
        keys = [r["source_key"] for r in self.conn.execute("SELECT source_key FROM source_records")]
        self.assertEqual(keys, ["32000000101"])  # the key is the taxpayer number
        where = self.api.to(f"/resource/{FR_ID}.json")[0].query["$where"]
        self.assertEqual(where, "upper(taxpayer_city) = 'LONGVIEW'")

    def test_without_the_standing_column_every_row_counts_as_listed(self):
        columns = [c for c in FR_COLUMNS if c != "right_to_transact_business_code"]
        self.api = FakeDataTexas(franchise_columns=columns)
        counts = self.sync_franchise([fr_row("32000000111", "EXAMPLE WIDGETS LLC", rtt=None)])
        self.assertEqual(counts["kept"], 1)

    def test_a_row_that_left_good_standing_is_retired(self):
        self.sync_franchise([fr_row("32000000121", "EXAMPLE WIDGETS LLC"), fr_row("32000000122", "EXAMPLE GEARS LLC")])
        self.match()
        self.sync_franchise([fr_row("32000000121", "EXAMPLE WIDGETS LLC"),
                             fr_row("32000000122", "EXAMPLE GEARS LLC", rtt="N")], now=LATER)
        self.match(LATER)
        self.assertEqual(self.record("tx_franchise", "32000000122")["active"], 0)
        self.assertEqual(self.business_of("tx_franchise", "32000000122")["active"], 0)
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000122"), ("held", "inactive"))

    def test_schema_mismatch_is_skipped_with_the_reason(self):
        columns = [c for c in FR_COLUMNS if c != "taxpayer_zip"]
        self.api = FakeDataTexas(franchise_columns=columns)
        with self.assertLogs("longview_archive", level="WARNING"):
            counts = self.sync_franchise([fr_row("32000000131", "EXAMPLE WIDGETS LLC")])
        self.assertEqual(counts["status"], "skipped")
        self.assertIn("schema_mismatch", counts["skipped_reason"])
        self.assertIn("zip", counts["skipped_reason"])
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0], 0)
        src = self.conn.execute("SELECT last_status FROM sources WHERE id='tx_franchise'").fetchone()
        self.assertEqual(src["last_status"], "skipped")
        self.assertEqual(self.api.to(f"/resource/{FR_ID}.json"), [])  # no rows were read

    def test_no_dataset_is_skipped_and_the_service_carries_on(self):
        self.api = FakeDataTexas(with_franchise=False)
        job = service.SYNC_BY_NAME["franchise"]
        with self.assertLogs("longview_archive", level="WARNING"):
            outcome = service.run_sync(self.conn, self.settings, job, NOW, self.api)
        self.assertEqual(outcome.status, "skipped")
        # Only the unrelated "Franchise Tax Refunds" dataset matches the name: its columns do not fit.
        self.assertTrue(outcome.error.startswith("schema_mismatch: missing taxpayer_number"), outcome.error)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0], 0)

    def test_the_job_is_a_weekly_open_data_sync(self):
        job = service.SYNC_BY_NAME["franchise"]
        self.assertIn(job, service.SYNC_JOBS)
        self.assertEqual((job.kind, job.transport, job.period(self.settings).days),
                         ("sync_tx_franchise", "socrata", 7))

    def test_mailing_address_is_never_requested_or_stored(self):
        self.sync_franchise([fr_row("32000000141", "EXAMPLE WIDGETS LLC")])
        select = self.api.to(f"/resource/{FR_ID}.json")[0].query["$select"]
        self.assertNotIn("taxpayer_address", select)
        self.assertIn("taxpayer_number", select)
        rec = self.record("tx_franchise", "32000000141")
        # The fake server ignores $select and sends the address anyway: it is dropped before storing.
        self.assertNotIn(MAILING, rec["raw_json"])
        self.assertNotIn("taxpayer_address", json.loads(rec["raw_json"]))
        for column in ("street", "street_norm", "suite", "zip", "phone", "naics", "permit_start"):
            self.assertIsNone(rec[column], column)

    def test_logs_carry_counts_only(self):
        with self.assertLogs("longview_archive", level="INFO") as logs:
            self.sync_franchise([fr_row("32000000151", "ZEPHYRA QUILLBY LLC")])
            self.match()
        text = "\n".join(logs.output)
        for private in ("ZEPHYRA", "Zephyra", "32000000151", MAILING, "PRIVATE"):
            self.assertNotIn(private, text)


# ---------------------------------------------------------------- scope and ZIPs

class ScopeTests(FranchiseCase):
    def test_postal_zips_are_city_and_other_zips_nearby(self):
        rows = [fr_row(f"320000002{i:02d}", f"EXAMPLE COMPANY {i} LLC", zip_code=z)
                for i, z in enumerate(("75601", "75605", "75606", "75607", "75608-1234", "75647", ""))]
        counts = self.sync_franchise(rows)
        scopes = [self.record("tx_franchise", f"320000002{i:02d}")["scope"] for i in range(len(rows))]
        self.assertEqual(scopes, ["city", "city", "city", "city", "city", "nearby", "nearby"])
        self.assertEqual((counts["city"], counts["nearby"]), (5, 2))
        self.assertEqual(counts["other_zips"], {"75647": 1, "missing": 1})
        self.assertEqual(config.LONGVIEW_POSTAL_ZIPS[-3:], ("75606", "75607", "75608"))
        self.assertEqual(config.LONGVIEW_ZIPS, ("75601", "75602", "75603", "75604", "75605"))  # unchanged

    def test_default_lists_nearby_and_city_only_holds_it(self):
        self.assertEqual(config.Settings().publish_scopes, ("city", "nearby"))
        self.sync_franchise([fr_row("32000000211", "EXAMPLE NEARBY WIDGETS LLC", zip_code="75647")])
        self.match()
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000211"), ("ready", None))
        export = self.export()
        self.assertEqual(export["scope"], config.SCOPE_LABEL_POSTAL)
        self.assertEqual(export["counts"]["inArchive"], 1)
        city_only = dataclasses.replace(self.settings, publish_scopes=("city",))
        self.evaluate(city_only)
        self.assertEqual(self.state("tx_franchise", "32000000211"), ("held", "out_of_scope"))
        export = self.export(city_only)
        self.assertEqual((export["scope"], export["counts"]["inArchive"]), (config.SCOPE_LABEL, 0))

    def test_publish_scopes_setting(self):
        self.assertEqual(config.load_settings({}).publish_scopes, ("city", "nearby"))
        self.assertEqual(config.load_settings({"LVA_PUBLISH_SCOPES": "city"}).publish_scopes, ("city",))
        self.assertEqual(config.load_settings({"LVA_PUBLISH_SCOPES": "nearby, city"}).publish_scopes,
                         ("city", "nearby"))
        for bad in ("out", "city,everywhere", ","):
            with self.assertRaises(ValueError, msg=bad):
                config.load_settings({"LVA_PUBLISH_SCOPES": bad})


# ---------------------------------------------------------------- de-duplication with sales tax

class SalesTaxDedupeTests(FranchiseCase):
    TAXPAYER = "32000000301"

    def outlet(self, name="EXAMPLE GEAR WORKS", street="100 EXAMPLE ST"):
        return st_row(self.TAXPAYER, "00001", name, street, taxpayer="EXAMPLE GEAR WORKS LLC")

    def company(self):
        return fr_row(self.TAXPAYER, "EXAMPLE GEAR WORKS LLC")

    def assert_one_listing_from_the_outlet(self):
        self.evaluate()
        export = self.export()
        self.assertEqual(len(export["businesses"]), 1)
        listing = export["businesses"][0]
        self.assertEqual({f["source"] for f in listing["facts"] if f["field"] == "name"}, {"tx_sales_tax"})
        self.assertNotIn("registeredSince", listing)
        rec = self.record("tx_franchise", self.TAXPAYER)
        self.assertEqual((rec["business_id"], rec["match_state"]), (None, "ignored"))
        self.assertEqual(self.active_businesses(), 1)

    def test_sales_tax_first(self):
        self.sync_sales([self.outlet()])
        self.match()
        counts = self.sync_franchise([self.company()])
        self.assertEqual(counts["with_sales_tax_outlet"], 1)
        self.match()
        self.assert_one_listing_from_the_outlet()

    def test_franchise_first_then_the_outlet_appears(self):
        self.sync_franchise([self.company()])
        self.match()
        self.evaluate()
        first = self.business_of("tx_franchise", self.TAXPAYER)
        self.assertEqual(first["publish_state"], "ready")
        # The next sales-tax sync lists the same taxpayer's outlet, under another trade name.
        self.sync_sales([self.outlet(name="EXAMPLE GEARS & AXLES")], now=LATER)
        result = self.match(LATER)
        self.assertGreaterEqual(result["ignored"], 1)
        self.assert_one_listing_from_the_outlet()
        retired = self.conn.execute("SELECT * FROM businesses WHERE id=?", (first["id"],)).fetchone()
        self.assertEqual((retired["active"], retired["publish_state"], retired["publish_reason"]),
                         (0, "held", "inactive"))

    def test_franchise_first_and_the_outlet_has_the_same_name(self):
        self.sync_franchise([self.company()])
        self.match()
        first = self.business_of("tx_franchise", self.TAXPAYER)
        self.sync_sales([self.outlet()], now=LATER)
        self.match(LATER)
        # The outlet joined the company by name, so the listing (and its link) carries on.
        self.assertEqual(self.business_of("tx_sales_tax", f"{self.TAXPAYER}:00001")["id"], first["id"])
        self.assert_one_listing_from_the_outlet()
        biz = self.business_of("tx_sales_tax", f"{self.TAXPAYER}:00001")
        self.assertEqual(biz["street"], "100 Example St")  # the outlet's location, not the mailing address

    def test_both_in_one_batch(self):
        self.sync_franchise([self.company()])
        self.sync_sales([self.outlet(name="EXAMPLE GEARS & AXLES")])
        self.match()
        self.assert_one_listing_from_the_outlet()

    def test_the_company_comes_back_when_its_outlet_closes(self):
        self.sync_sales([self.outlet(), st_row("32000000399", "00001", "EXAMPLE OTHER SHOP", "5 SAMPLE AVE")])
        self.sync_franchise([self.company()])
        self.match()
        self.sync_sales([st_row("32000000399", "00001", "EXAMPLE OTHER SHOP", "5 SAMPLE AVE")], now=LATER)
        self.match(LATER)
        biz = self.business_of("tx_franchise", self.TAXPAYER)
        self.assertIsNotNone(biz)
        self.assertEqual(biz["active"], 1)
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", self.TAXPAYER), ("ready", None))

    def test_a_different_taxpayer_with_a_similar_name_is_not_merged(self):
        self.sync_sales([st_row("32000000311", "00001", "EXAMPLE GEAR WORKS", "100 EXAMPLE ST")])
        self.sync_franchise([fr_row("32000000312", "EXAMPLE GEARWORKS SUPPLY LLC")])
        self.match()
        self.assertNotEqual(self.business_of("tx_sales_tax", "32000000311:00001")["id"],
                            self.business_of("tx_franchise", "32000000312")["id"])


# ---------------------------------------------------------------- privacy

class PrivacyTests(FranchiseCase):
    def sync_one(self, name, org="CL", number="32000000401"):
        self.sync_franchise([fr_row(number, name, org=org)])
        self.match()
        self.evaluate()
        return self.record("tx_franchise", number), self.business_of("tx_franchise", number)

    def test_a_company_name_is_published(self):
        rec, biz = self.sync_one("EXAMPLE WIDGETS LLC")
        self.assertEqual((rec["personal_name"], rec["is_individual"]), (0, 0))
        self.assertEqual(biz["name"], "Example Widgets LLC")
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("ready", None))

    def test_person_names_are_held(self):
        cases = [
            ("JOHN A SAMPLE", "PB"),            # not clearly an entity: may be a person
            ("SAMPLE, JANE", "CT"),             # an entity code, but the name is a person's
            ("JANE DOE LLC", "CL"),             # a person's name with a legal form
            ("JOHN & MARY SAMPLE LLC", "CL"),   # a couple
            ("QUILLBY ORCHARD", "PI"),          # an uncertain code and no legal form: may be a person
            ("SAMPLE FAMILY TRUST", "TR"),      # a family trust
            ("SAMPLE FAMILY TRUST", "CT"),      # a trust by its name, whatever the code
            ("ESTATE OF JOHN SAMPLE", "CL"),    # an estate
        ]
        for i, (name, org) in enumerate(cases):
            number = f"3200000041{i}"
            rec, biz = self.sync_one(name, org=org, number=number)
            self.assertEqual(rec["personal_name"], 1, name)
            self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("held", "personal_name_no_presence"),
                             name)
            self.assertTrue(json.loads(rec["tags_json"]).get("owner_named"), name)
        self.assertEqual(self.export()["businesses"], [])

    def test_trade_words_are_not_trusts_or_estates(self):
        for name in ("EXAMPLE REAL ESTATE LLC", "EXAMPLE BANK & TRUST", "EXAMPLE ESTATE HOLDINGS LLC"):
            self.assertFalse(franchise.is_trust_or_estate(name, "CT"), name)
            self.assertEqual(franchise.privacy_flags(name, "CT"), (False, False, False), name)
        for name in ("SAMPLE FAMILY TRUST", "JOHN SAMPLE TRUSTEE", "ESTATE OF JOHN SAMPLE", "SAMPLE TRUST LLC"):
            self.assertTrue(franchise.is_trust_or_estate(name, "CL"), name)

    def test_entity_codes_decide_like_the_sales_tax_descriptions(self):
        for code in ("CT", "CF", "CN", "CP", "CL", "PL", "PF", "AP", "AF"):
            self.assertTrue(privacy.org_is_entity(franchise.ENTITY_ORG_TYPES[code]), code)
        for code in ("PB", "PI", "AR", "CI", "CM", "TR", "IS", ""):
            self.assertNotIn(code, franchise.ENTITY_ORG_TYPES)
            self.assertFalse(privacy.org_is_entity(code), code)
        self.assertEqual(franchise.privacy_flags("EXAMPLE ORCHARD", "CL"), (False, False, False))
        self.assertEqual(franchise.privacy_flags("EXAMPLE ORCHARD", "PB"), (True, True, True))
        self.assertEqual(franchise.privacy_flags("EXAMPLE ORCHARD LLC", "PB"), (False, False, False))

    def test_a_person_like_name_with_a_public_presence_waits_for_a_person(self):
        add_record(self.conn, "osm", "node/401", "Jane Doe", street="12 Sample Ave", zip_code="75601",
                   tags={"office": "consulting"}, website="https://www.janedoe.example/")
        self.matched_osm = self.match()
        rec, biz = self.sync_one("JANE DOE LLC")
        self.assertEqual(biz["id"], self.business_of("osm", "node/401")["id"])  # the same name joined them
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "person_name_check"))
        self.assertEqual(self.export()["businesses"], [])

    def test_a_name_that_reads_as_an_address_waits_for_a_person(self):
        rec, biz = self.sync_one("4100 EXAMPLE LN LLC")
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "name_contains_address"))


# ---------------------------------------------------------------- category and facts

class ListingTests(FranchiseCase):
    def test_no_category_is_guessed_from_the_name(self):
        self.sync_franchise([fr_row("32000000501", "EXAMPLE PIZZA & DENTAL LLC")])
        self.match()
        self.evaluate()
        biz = self.business_of("tx_franchise", "32000000501")
        self.assertEqual((biz["category"], biz["category_label"]), categories.COMPANY_FALLBACK)
        self.assertEqual(categories.COMPANY_FALLBACK[0], categories.FALLBACK[0])
        [listing] = self.export()["businesses"]
        self.assertEqual((listing["category"], listing["categoryLabel"]),
                         ("other", "Registered company; kind of business not on record"))

    def test_listing_shows_longview_tx_and_the_registration_year_with_its_source(self):
        self.sync_franchise([fr_row("32000000511", "EXAMPLE WIDGETS LLC", since="2014-05-01T00:00:00.000")])
        self.match()
        self.evaluate()
        export = self.export()
        [listing] = export["businesses"]
        self.assertEqual(listing["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})
        self.assertIsNone(listing["permitSince"])
        self.assertEqual(listing["registeredSince"], "2014-05-01")
        facts = {f["field"]: f for f in listing["facts"]}
        self.assertEqual(set(facts), {"name", "category", "registeredSince"})
        for fact in facts.values():
            self.assertEqual(fact["source"], "tx_franchise")
            self.assertEqual(fact["url"], f"https://{SOCRATA_HOST}/d/{FR_ID}")
            self.assertEqual(fact["checkedAt"], "2026-09-24")
        self.assertEqual([s["id"] for s in export["sources"]], ["tx_franchise"])
        self.assertEqual(export["sources"][0]["name"], "Active Franchise Taxpayers")
        result = validate.validate_directory(export)
        self.assertEqual((result.dropped, result.issues), ([], []))
        self.assertEqual(result.directory["businesses"][0]["registeredSince"], "2014-05-01")

    def test_the_contract_check_refuses_misattributed_facts(self):
        self.sync_franchise([fr_row("32000000521", "EXAMPLE WIDGETS LLC")])
        self.match()
        self.evaluate()
        export = self.export()
        listing = export["businesses"][0]
        bad_source = json.loads(json.dumps(export))
        for fact in bad_source["businesses"][0]["facts"]:
            if fact["field"] == "registeredSince":
                fact["source"] = "tx_sales_tax"
        self.assertEqual(validate.validate_directory(bad_source).dropped,
                         [(listing["id"], "registered_fact_not_from_franchise_list")])
        street = json.loads(json.dumps(export))
        street["businesses"][0]["address"].update({"street": "900 Private Home Ln", "zip": "75601"})
        street["businesses"][0]["facts"].append(
            {"field": "address", "source": "tx_franchise", "url": None, "checkedAt": "2026-09-24"})
        self.assertEqual(validate.validate_directory(street).dropped, [(listing["id"], "address_from_mailing_list")])
        missing = json.loads(json.dumps(export))
        missing["businesses"][0]["facts"] = [f for f in missing["businesses"][0]["facts"]
                                             if f["field"] != "registeredSince"]
        self.assertEqual(validate.validate_directory(missing).dropped, [(listing["id"], "missing_fact:registeredSince")])

    def test_status_counts_the_new_source(self):
        self.sync_franchise([fr_row("32000000531", "EXAMPLE WIDGETS LLC"), fr_row("32000000532", "EXAMPLE GEARS LLC")])
        data = status.collect(self.conn, self.settings, LATEST)
        row = next(s for s in data["sources"] if s["id"] == "tx_franchise")
        self.assertEqual((row["name"], row["status"], row["rows"]), ("Active Franchise Taxpayers", "ok", 2))
        html = status.render_html(data)
        self.assertIn("Active Franchise Taxpayers", html)
        self.assertNotIn("Example Widgets", html)


# ---------------------------------------------------------------- a primary source

class PrimarySourceTests(FranchiseCase):
    def test_a_franchise_only_company_is_published(self):
        self.assertIn("tx_franchise", matching.PRIMARY_SOURCES)
        self.assertIn("tx_franchise", publish.PRIMARY_SOURCES)
        self.sync_franchise([fr_row("32000000601", "EXAMPLE WIDGETS LLC")])
        result = self.match()
        self.assertEqual(result["created"], 1)
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000601"), ("ready", None))

    def test_an_osm_place_found_first_is_no_longer_osm_only(self):
        add_record(self.conn, "osm", "node/602", "Example Widgets", street="77 Sample Ct", zip_code="75605",
                   tags={"shop": "hardware"}, website="https://www.widgets.example/", lat=32.5, lon=-94.7)
        self.match()
        self.evaluate()
        self.assertEqual(self.state("osm", "node/602"), ("review", matching.OSM_ONLY_REASON))
        self.sync_franchise([fr_row("32000000602", "EXAMPLE WIDGETS LLC")], now=LATER)
        self.match(LATER)
        biz = self.business_of("tx_franchise", "32000000602")
        self.assertEqual(biz["id"], self.business_of("osm", "node/602")["id"])
        self.evaluate()
        self.assertEqual((biz["name"], self.state("osm", "node/602")), ("Example Widgets LLC", ("ready", None)))
        biz = self.business_of("osm", "node/602")
        # Nothing OpenStreetMap said about the place is shown under the Comptroller's name.
        self.assertEqual((biz["street"], biz["zip"], biz["lat"]), (None, None, None))
        self.assertEqual((biz["category"], biz["category_label"]), categories.COMPANY_FALLBACK)
        self.assertEqual(biz["website"], "https://www.widgets.example/")  # a candidate to read, not shown yet
        rule = self.conn.execute("SELECT rule FROM merges WHERE business_id=?", (biz["id"],)).fetchone()["rule"]
        self.assertEqual(rule, matching.RULE_SAME_NAME)
        [listing] = self.export()["businesses"]
        self.assertEqual(listing["address"]["street"], None)
        self.assertIsNone(listing["website"])

    def test_an_osm_place_found_later_joins_the_company(self):
        self.sync_franchise([fr_row("32000000603", "EXAMPLE WIDGETS LLC")])
        self.match()
        add_record(self.conn, "osm", "node/603", "Example Widgets", street="77 Sample Ct", zip_code="75605",
                   tags={"shop": "hardware"}, website="https://www.widgets.example/", lat=32.5, lon=-94.7)
        self.match(LATER)
        biz = self.business_of("osm", "node/603")
        self.assertEqual(biz["id"], self.business_of("tx_franchise", "32000000603")["id"])
        self.assertEqual((biz["street"], biz["zip"], biz["lat"]), (None, None, None))
        self.assertEqual((biz["category"], biz["category_label"]), categories.COMPANY_FALLBACK)
        self.assertEqual(biz["website"], "https://www.widgets.example/")
        self.evaluate()
        self.assertEqual(self.state("osm", "node/603"), ("ready", None))
        self.assertEqual(self.active_businesses(), 1)

    def test_similar_but_different_names_are_not_merged(self):
        add_record(self.conn, "osm", "node/604", "Example Widget Works", street="77 Sample Ct", zip_code="75605",
                   tags={"shop": "hardware"})
        self.sync_franchise([fr_row("32000000604", "EXAMPLE WIDGETS LLC")])
        self.match()
        self.assertNotEqual(self.business_of("osm", "node/604")["id"],
                            self.business_of("tx_franchise", "32000000604")["id"])
        self.evaluate()
        self.assertEqual(self.state("osm", "node/604"), ("review", matching.OSM_ONLY_REASON))

    def test_two_registrations_with_one_name_stay_two_companies(self):
        self.sync_franchise([fr_row("32000000605", "EXAMPLE WIDGETS LLC"),
                             fr_row("32000000606", "EXAMPLE WIDGETS LP", org="PL")])
        self.match()
        self.assertNotEqual(self.business_of("tx_franchise", "32000000605")["id"],
                            self.business_of("tx_franchise", "32000000606")["id"])

    def test_several_businesses_with_the_name_go_to_a_person(self):
        self.sync_sales([st_row("32000000611", "00001", "EXAMPLE TIRE", "100 EXAMPLE ST"),
                         st_row("32000000611", "00002", "EXAMPLE TIRE", "900 SAMPLE AVE")])
        self.sync_franchise([fr_row("32000000612", "EXAMPLE TIRE LLC")])
        result = self.match()
        self.assertEqual(result["review"], 1)
        rec = self.record("tx_franchise", "32000000612")
        self.assertEqual((rec["match_state"], rec["business_id"]), ("review", None))
        questions = self.conn.execute(
            "SELECT COUNT(*) FROM review_queue WHERE source_record_id=? AND kind='merge_ambiguous' AND status='open'",
            (rec["id"],)).fetchone()[0]
        self.assertEqual(questions, 2)
        self.assertEqual(self.active_businesses(), 2)

    def test_an_npi_practice_and_its_company_are_one_listing(self):
        add_record(self.conn, "npi", "1999999901", "Example Family Dental", street="700 Sample Ave Ste 200",
                   zip_code="75605", tags={"taxonomy": "Dentist"})
        self.sync_franchise([fr_row("32000000621", "EXAMPLE FAMILY DENTAL PLLC", org="CP")])
        self.match()
        biz = self.business_of("tx_franchise", "32000000621")
        self.assertEqual(biz["id"], self.business_of("npi", "1999999901")["id"])
        self.evaluate()
        [listing] = self.export()["businesses"]
        self.assertEqual(listing["address"]["street"], "700 Sample Ave Ste 200")
        self.assertEqual(next(f for f in listing["facts"] if f["field"] == "address")["source"], "npi")
        self.assertEqual(listing["registeredSince"], "2014-05-01")


# ---------------------------------------------------------------- end to end

class EndToEndTests(FranchiseCase):
    """sync (every Socrata job the service runs) -> match -> publish -> approve -> the static site."""

    def test_sync_match_publish_site(self):
        self.api.rows[ST_ID] = [
            st_row("32000000701", "00001", "EXAMPLE TIRE & LUBE", "500 EXAMPLE ST", taxpayer="EXAMPLE TIRE CO LLC"),
        ]
        self.api.rows[FR_ID] = [
            fr_row("32000000701", "EXAMPLE TIRE CO LLC"),                       # listed by its outlet
            fr_row("32000000702", "EXAMPLE WIDGETS LLC", since="2014-05-01T00:00:00.000"),
            fr_row("32000000703", "EXAMPLE NORTH HOLDINGS LP", org="PL", zip_code="75647",
                   since="2019-01-15T00:00:00.000"),                           # nearby: listed by default
            fr_row("32000000704", "ZEPHYRA QUILLBY", org="PB"),                 # may be a person: held
            fr_row("32000000705", "EXAMPLE CHARITY INC", org="CN", exempt="12"),  # exempt: not listed
            fr_row("32000000706", "EXAMPLE GONE LLC", rtt="N"),                 # not in good standing
        ]
        conn = service.bootstrap(self.settings)
        self.addCleanup(conn.close)
        logger = logging.getLogger("longview_archive")
        with self.assertLogs(logger, level="DEBUG") as logs:
            outcomes = {job.name: service.run_sync(conn, self.settings, job, NOW, self.api)
                        for job in service.SYNC_JOBS if job.transport == "socrata"}
            matching.match_pending(conn, NOW)
            counts = publish.run_publish(conn, self.settings, LATEST)
            approval.approve(conn, self.settings, actor="test", now=LATEST)
        self.assertEqual({k: v.status for k, v in outcomes.items()},
                         {"sales-tax": "ok", "tabc": "skipped", "franchise": "ok"})
        self.assertEqual(counts["published"], 3)

        export = json.loads(self.settings.publish_export_path.read_text(encoding="utf-8"))
        by_name = {b["name"]: b for b in export["businesses"]}
        self.assertEqual(sorted(by_name), ["Example North Holdings LP", "Example Tire & Lube", "Example Widgets LLC"])
        self.assertEqual(export["scope"], config.SCOPE_LABEL_POSTAL)
        self.assertEqual([s["id"] for s in export["sources"]], ["tx_sales_tax", "tx_franchise"])
        widgets = by_name["Example Widgets LLC"]
        self.assertEqual(widgets["registeredSince"], "2014-05-01")
        self.assertEqual(widgets["address"]["street"], None)
        self.assertNotIn("registeredSince", by_name["Example Tire & Lube"])
        self.assertEqual(validate.validate_directory(export).dropped, [])

        folder = site.site_dir(self.settings)
        profile = (folder / widgets["slug"] / "index.html").read_text(encoding="utf-8")
        self.assertIn("Registered with the Texas Comptroller for franchise tax since 2014.", profile)
        self.assertIn("Texas Comptroller open data (franchise tax)", profile)
        self.assertIn("Longview, TX", profile)
        about = (folder / "about" / "index.html").read_text(encoding="utf-8")
        self.assertIn("with a Longview, Texas address", about)
        self.assertIn("franchise-tax list", about)
        self.assertNotIn("in the City of Longview", about)
        index = (folder / "index.html").read_text(encoding="utf-8")
        self.assertIn("3 businesses with a Longview address", index)

        public = " ".join(p.read_text(encoding="utf-8") for p in folder.rglob("*.html"))
        public += self.settings.publish_export_path.read_text(encoding="utf-8")
        status.write_status(self.settings, status.collect(conn, self.settings, LATEST))
        private_views = public + (self.settings.www_dir / "status.json").read_text(encoding="utf-8") \
            + "\n".join(logs.output)
        for secret in (MAILING, "Private Home", "32000000702", "32000000703"):
            self.assertNotIn(secret, private_views, secret)
        for held in ("Zephyra", "ZEPHYRA", "Charity", "Example Gone"):
            self.assertNotIn(held, public, held)
        state = conn.execute("SELECT publish_state, publish_reason FROM businesses WHERE name=?",
                             ("Zephyra Quillby",)).fetchone()
        self.assertEqual(tuple(state), ("held", "personal_name_no_presence"))
        status_data = json.loads((self.settings.www_dir / "status.json").read_text(encoding="utf-8"))
        row = next(s for s in status_data["sources"] if s["id"] == "tx_franchise")
        self.assertEqual(row["rows"], 4)


if __name__ == "__main__":
    unittest.main()

"""The Texas Comptroller's "Active Franchise Taxpayers" list as a source (sources/franchise.py).

Companies with a Longview address that have no sales-tax outlet get a listing
from the franchise-tax list: its name, "Longview, TX", and the year its
franchise-tax registration began. These tests cover the good-standing,
exemption, and Texas-only filters, the de-duplication against sales-tax outlets
in both sync orders, the taxpayer number as a hard key (companies with the same
name are never merged across taxpayers), the person-name holds (names with a
legal form included), the mailing address (never requested, stored, or shown),
the company category, the scope and ZIP rules with the new default publish
scopes, the fail-safe skip on a schema mismatch, the franchise list as a
primary source (alone, and joined by name to an OpenStreetMap place), the
question a franchise record asks about a TABC or NPI practice with its name,
and the whole chain sync -> match -> publish -> approve -> site with a fake
data.texas.gov. All data is fictional: made-up names, taxpayer numbers,
streets, and .example hosts. Nothing touches the network.

    cd deploy/longview-archive && python3 -m unittest tests.test_franchise -v
"""

from __future__ import annotations

import contextlib
import dataclasses
import importlib.util
import io
import json
import logging
import tempfile
import unittest
from pathlib import Path

from longview_archive import (approval, categories, config, db, facts, matching, privacy, publish, service, site,
                              status, validate)
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
# Every organizational type code seen on the Longview rows, plus a blank and an unknown one.
ALL_CODES = ("CL", "CT", "CN", "PL", "CP", "CI", "AR", "CF", "AP", "PB", "CM", "TR", "AF", "PF", "PI", "", "ZZ")
ENTITY_CODES = ("CT", "CF", "CN", "CP", "CL", "PL", "PF", "AP", "AF")

# A company name that is plainly a company's (it has a trade word), for listings that must publish.
WIDGETS = "EXAMPLE HARDWARE SUPPLY LLC"
WIDGETS_SHOWN = "Example Hardware Supply LLC"


def fr_row(number, name, org="CL", zip_code="75601", rtt="A", exempt=None, since="2014-05-01T00:00:00.000",
           city="LONGVIEW", state="TX"):
    row = {
        "taxpayer_number": number, "taxpayer_name": name, "taxpayer_address": MAILING, "taxpayer_city": city,
        "taxpayer_state": state, "taxpayer_zip": zip_code, "taxpayer_organizational_type": org,
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

    def listing_of(self, source_id, key, export=None):
        biz = self.business_of(source_id, key)
        export = export or self.export()
        return next((b for b in export["businesses"] if biz is not None and b["id"] == biz["public_id"]), None)

    def active_businesses(self):
        return self.conn.execute("SELECT COUNT(*) FROM businesses WHERE active=1").fetchone()[0]

    def answer(self, source_id, key, accept, business_id=None):
        """A person answers the open merge questions of a record, then matching reads the answer."""
        rec = self.record(source_id, key)
        items = self.conn.execute(
            "SELECT id, business_id FROM review_queue WHERE source_record_id=? AND kind='merge_ambiguous'"
            " AND status='open'", (rec["id"],)).fetchall()
        self.assertTrue(items)
        for item in items:
            if business_id is not None and item["business_id"] != business_id:
                continue
            (facts.accept_review if accept else facts.reject_review)(self.conn, item["id"], "test", LATER)
        self.conn.execute("UPDATE source_records SET match_state='new' WHERE id=?", (rec["id"],))
        self.match(LATER)


# ---------------------------------------------------------------- the sync

class SyncTests(FranchiseCase):
    def test_good_standing_exempt_and_texas_filters(self):
        counts = self.sync_franchise([
            fr_row("32000000101", WIDGETS),
            fr_row("32000000102", "EXAMPLE FORFEITED LLC", rtt="N"),
            fr_row("32000000103", "EXAMPLE DISSOLVED INC", org="CT", rtt="D"),
            fr_row("32000000104", "EXAMPLE UNKNOWN LLC", rtt="U"),
            fr_row("32000000105", "EXAMPLE CHARITY INC", org="CN", exempt="12"),
            fr_row("32000000106", "EXAMPLE OUT OF TOWN LLC", city="KILGORE"),
            fr_row("", "EXAMPLE NO NUMBER LLC"),
            # A server that ignored the state filter: Longview, Washington is not Longview, Texas.
            fr_row("32000000107", "EXAMPLE CASCADE TIMBER LLC", zip_code="98632", state="WA"),
        ])
        self.assertEqual(counts["status"], "ok")
        self.assertEqual(counts["dataset_id"], FR_ID)  # not the decoy, not the refunds dataset
        self.assertEqual((counts["fetched"], counts["kept"]), (8, 1))
        self.assertEqual(counts["skipped_not_in_good_standing"], 3)
        self.assertEqual(counts["skipped_exempt"], 1)
        self.assertEqual((counts["skipped_city"], counts["skipped_no_key"], counts["skipped_state"]), (1, 1, 1))
        keys = [r["source_key"] for r in self.conn.execute("SELECT source_key FROM source_records")]
        self.assertEqual(keys, ["32000000101"])  # the key is the taxpayer number
        query = self.api.to(f"/resource/{FR_ID}.json")[0].query
        self.assertEqual(query["$where"], "upper(taxpayer_city) = 'LONGVIEW' AND upper(taxpayer_state) = 'TX'")
        self.assertIn("taxpayer_state", query["$select"])

    def test_without_the_standing_column_every_row_counts_as_listed(self):
        columns = [c for c in FR_COLUMNS if c != "right_to_transact_business_code"]
        self.api = FakeDataTexas(franchise_columns=columns)
        counts = self.sync_franchise([fr_row("32000000111", WIDGETS, rtt=None)])
        self.assertEqual(counts["kept"], 1)

    def test_a_row_that_left_good_standing_is_retired(self):
        self.sync_franchise([fr_row("32000000121", WIDGETS), fr_row("32000000122", "EXAMPLE PAINT WORKS LLC")])
        self.match()
        self.sync_franchise([fr_row("32000000121", WIDGETS),
                             fr_row("32000000122", "EXAMPLE PAINT WORKS LLC", rtt="N")], now=LATER)
        self.match(LATER)
        self.assertEqual(self.record("tx_franchise", "32000000122")["active"], 0)
        self.assertEqual(self.business_of("tx_franchise", "32000000122")["active"], 0)
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000122"), ("held", "inactive"))

    def test_schema_mismatch_is_skipped_with_the_reason(self):
        columns = [c for c in FR_COLUMNS if c != "taxpayer_zip"]
        self.api = FakeDataTexas(franchise_columns=columns)
        with self.assertLogs("longview_archive", level="WARNING"):
            counts = self.sync_franchise([fr_row("32000000131", WIDGETS)])
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
        self.sync_franchise([fr_row("32000000141", WIDGETS)])
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


# ---------------------------------------------------------------- scope, ZIPs, and the state

class ScopeTests(FranchiseCase):
    def test_longview_postal_zips_are_city_and_anything_else_is_out(self):
        rows = [fr_row(f"320000002{i:02d}", f"EXAMPLE SUPPLY {i} LLC", zip_code=z)
                for i, z in enumerate(("75601", "75605", "75606", "75607", "75608-1234", "75647", "", "98632"))]
        counts = self.sync_franchise(rows)
        scopes = [self.record("tx_franchise", f"320000002{i:02d}")["scope"] for i in range(len(rows))]
        self.assertEqual(scopes, ["city"] * 5 + ["out"] * 3)
        self.assertEqual((counts["city"], counts["out"]), (5, 3))
        self.assertEqual(counts["other_zips"], {"75647": 1, "missing": 1, "98632": 1})
        self.assertEqual(config.LONGVIEW_POSTAL_ZIPS[-3:], ("75606", "75607", "75608"))
        self.assertEqual(config.LONGVIEW_ZIPS, ("75601", "75602", "75603", "75604", "75605"))  # unchanged
        # Nothing that is not a Longview, Texas ZIP is published, under any setting.
        self.match()
        self.evaluate()
        for i in (5, 6, 7):
            self.assertEqual(self.state("tx_franchise", f"320000002{i:02d}"), ("held", "out_of_scope"))
        self.assertEqual(len(self.export()["businesses"]), 5)

    def test_without_the_state_column_the_zip_still_keeps_washington_out(self):
        columns = [c for c in FR_COLUMNS if c != "taxpayer_state"]
        self.api = FakeDataTexas(franchise_columns=columns)
        row = fr_row("32000000221", "EXAMPLE COLUMBIA MILLS INC", org="CF", zip_code="98632", state="WA")
        counts = self.sync_franchise([row, fr_row("32000000222", "EXAMPLE NO ZIP SUPPLY LLC", zip_code="")])
        self.assertEqual(counts["kept"], 2)
        self.assertEqual(self.api.to(f"/resource/{FR_ID}.json")[0].query["$where"],
                         "upper(taxpayer_city) = 'LONGVIEW'")
        self.match()
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000221"), ("held", "out_of_scope"))
        self.assertEqual(self.state("tx_franchise", "32000000222"), ("held", "out_of_scope"))
        self.assertEqual(self.export()["businesses"], [])

    def test_default_lists_nearby_and_city_only_holds_it(self):
        self.assertEqual(config.Settings().publish_scopes, ("city", "nearby"))
        # A sales-tax outlet just outside the city limits, with a Longview address.
        self.sync_sales([st_row("32000000231", "00001", "EXAMPLE OUTSIDE TIRE", "12 EXAMPLE RD", inside="O")])
        self.match()
        self.evaluate()
        self.assertEqual(self.business_of("tx_sales_tax", "32000000231:00001")["scope"], "nearby")
        self.assertEqual(self.state("tx_sales_tax", "32000000231:00001"), ("ready", None))
        export = self.export()
        self.assertEqual(export["scope"], config.SCOPE_LABEL_POSTAL)
        self.assertEqual(export["counts"]["inArchive"], 1)
        city_only = dataclasses.replace(self.settings, publish_scopes=("city",))
        self.evaluate(city_only)
        self.assertEqual(self.state("tx_sales_tax", "32000000231:00001"), ("held", "out_of_scope"))
        export = self.export(city_only)
        self.assertEqual((export["scope"], export["counts"]["inArchive"]), (config.SCOPE_LABEL, 0))

    def test_publish_scopes_setting(self):
        self.assertEqual(config.load_settings({}).publish_scopes, ("city", "nearby"))
        self.assertEqual(config.load_settings({"LVA_PUBLISH_SCOPES": "city"}).publish_scopes, ("city",))
        self.assertEqual(config.load_settings({"LVA_PUBLISH_SCOPES": "nearby, city"}).publish_scopes,
                         ("city", "nearby"))
        # The city is always listed: 'nearby' alone would list none of it under a label that claims it.
        for bad in ("out", "city,everywhere", ",", "nearby", "nearby,out"):
            with self.assertRaises(ValueError, msg=bad):
                config.load_settings({"LVA_PUBLISH_SCOPES": bad})

    def test_a_nearby_outlet_needs_a_longview_texas_zip(self):
        # Under the default scopes, "nearby" is listed as "Longview, TX": only a Longview postal ZIP proves it.
        rows = [st_row("32000000901", "00001", "EXAMPLE CASCADE LUMBER", "12 SAMPLE AVE", zip_code="98632", inside="O"),
                st_row("32000000902", "00001", "EXAMPLE NOZIP SUPPLY", "14 SAMPLE AVE", zip_code="", inside="O"),
                st_row("32000000903", "00001", "EXAMPLE FARAWAY PARTS", "16 SAMPLE AVE", zip_code="77001", inside=""),
                st_row("32000000904", "00001", "EXAMPLE INSIDE OTHER ZIP TIRE", "18 SAMPLE AVE", zip_code="75662"),
                st_row("32000000905", "00001", "EXAMPLE LAKESIDE TIRE", "20 SAMPLE RD", zip_code="75603", inside="O"),
                st_row("32000000906", "00001", "EXAMPLE HILLTOP TIRE", "22 SAMPLE RD", zip_code="75607")]
        counts = self.sync_sales(rows)
        self.assertEqual((counts["city"], counts["nearby"], counts["out"]), (0, 2, 4))
        self.assertEqual(counts["other_zips"], {"98632": 1, "missing": 1, "77001": 1, "75662": 1, "75607": 1})
        self.match()
        self.evaluate()
        for number in ("32000000901", "32000000902", "32000000903", "32000000904"):
            key = f"{number}:00001"
            self.assertEqual(self.business_of("tx_sales_tax", key)["scope"], "out", number)
            self.assertEqual(self.state("tx_sales_tax", key), ("held", "out_of_scope"), number)
        for number in ("32000000905", "32000000906"):
            key = f"{number}:00001"
            self.assertEqual(self.business_of("tx_sales_tax", key)["scope"], "nearby", number)
            self.assertEqual(self.state("tx_sales_tax", key), ("ready", None), number)
        names = sorted(b["name"] for b in self.export()["businesses"])
        self.assertEqual(names, ["Example Hilltop Tire", "Example Lakeside Tire"])

    def test_an_outlet_or_licence_in_another_state_is_skipped(self):
        from longview_archive.sources import comptroller, tabc
        fields = {logical: candidates[0] for logical, candidates in comptroller.FIELD_CANDIDATES.items()}
        row = st_row("32000000911", "00001", "EXAMPLE CASCADE LUMBER", "12 SAMPLE AVE", zip_code="75601")
        self.assertEqual(comptroller.project_row(dict(row, outlet_state="WA"), fields)[2], "skipped_state")
        self.assertIsNotNone(comptroller.project_row(dict(row, outlet_state="TX"), fields)[0])
        self.assertIsNotNone(comptroller.project_row(row, fields)[0])  # no state value: the ZIP decides
        tfields = {logical: candidates[0] for logical, candidates in tabc.FIELD_CANDIDATES.items()}
        licence = {"trade_name": "EXAMPLE CASCADE TAVERN", "address": "1 SAMPLE ST", "city": "LONGVIEW",
                   "zip": "98632", "license_id": "MB000911", "status": "Active", "state": "WA"}
        self.assertEqual(tabc.project_row(licence, tfields, self.settings)[2], "skipped_state")
        key, record, _ = tabc.project_row(dict(licence, state="TX"), tfields, self.settings)
        self.assertEqual(record["scope"], "out")  # 98632 is not a Longview, Texas ZIP
        key, record, _ = tabc.project_row(dict(licence, state="TX", zip="75606"), tfields, self.settings)
        self.assertEqual(record["scope"], "nearby")
        self.assertEqual([config.longview_scope(z) for z in ("75601", "75606", "75647", "", None)],
                         ["city", "nearby", "out", "out", "out"])
        self.assertEqual(config.longview_scope("75601", outside_city_limits=True), "nearby")


# ---------------------------------------------------------------- de-duplication with sales tax

class SalesTaxDedupeTests(FranchiseCase):
    TAXPAYER = "32000000301"

    def outlet(self, name="EXAMPLE PAINT WORKS", street="100 EXAMPLE ST"):
        return st_row(self.TAXPAYER, "00001", name, street, taxpayer="EXAMPLE PAINT WORKS LLC")

    def company(self):
        return fr_row(self.TAXPAYER, "EXAMPLE PAINT WORKS LLC")

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
        # The same taxpayer's outlet with the same name takes the listing (and its link) over.
        self.assertEqual(self.business_of("tx_sales_tax", f"{self.TAXPAYER}:00001")["id"], first["id"])
        self.assert_one_listing_from_the_outlet()
        biz = self.business_of("tx_sales_tax", f"{self.TAXPAYER}:00001")
        self.assertEqual(biz["street"], "100 Example St")  # the outlet's location, not the mailing address
        self.assertEqual((biz["category"], biz["naics"]), ("auto", "811111"))  # its kind now comes from NAICS

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
        self.sync_sales([st_row("32000000311", "00001", "EXAMPLE PAINT WORKS", "100 EXAMPLE ST")])
        self.sync_franchise([fr_row("32000000312", "EXAMPLE PAINTWORKS SUPPLY LLC")])
        self.match()
        self.assertNotEqual(self.business_of("tx_sales_tax", "32000000311:00001")["id"],
                            self.business_of("tx_franchise", "32000000312")["id"])

    def test_one_key_format_for_the_outlet_check_and_the_requeue(self):
        # An outlet key whose taxpayer part is not plain digits never equals a franchise key, in both checks.
        add_record(self.conn, "tx_sales_tax", "32-000000321:00001", "Example Paint Works", street="100 Example St")
        self.sync_franchise([fr_row("32000000321", "EXAMPLE PAINT WORKS LLC")])
        self.assertFalse(franchise.has_sales_tax_outlet(self.conn, "32000000321"))
        self.assertNotIn("32000000321", franchise.sales_tax_taxpayers(self.conn))
        self.assertEqual(franchise.outlet_taxpayer("32000000321:00007"), "32000000321")
        self.match()
        self.assertEqual(self.record("tx_franchise", "32000000321")["match_state"], "created")
        self.assertEqual(matching._requeue_franchise(self.conn), 0)  # stable: not matched again every run


# ---------------------------------------------------------------- the taxpayer number is a hard key

class TaxpayerKeyTests(FranchiseCase):
    """Two lists, one key: a sales-tax outlet and a franchise record of different taxpayers are two companies."""

    def test_another_taxpayers_outlet_is_not_merged_franchise_second(self):
        self.sync_sales([st_row("32000000111", "00001", "EXAMPLE TIRE", "100 EXAMPLE ST", zip_code="75603",
                                inside="O")])
        self.match()
        self.sync_franchise([fr_row("32000000222", "EXAMPLE TIRE INC", org="CT", since="1990-01-01T00:00:00.000")])
        self.match()
        outlet = self.business_of("tx_sales_tax", "32000000111:00001")
        company = self.business_of("tx_franchise", "32000000222")
        self.assertNotEqual(outlet["id"], company["id"])
        self.assertEqual(outlet["scope"], "nearby")  # its own place decides, not another company's mailing ZIP
        self.evaluate()
        listing = self.listing_of("tx_sales_tax", "32000000111:00001")
        self.assertNotIn("registeredSince", listing)
        self.assertEqual(self.listing_of("tx_franchise", "32000000222")["registeredSince"], "1990-01-01")
        city_only = dataclasses.replace(self.settings, publish_scopes=("city",))
        self.evaluate(city_only)
        self.assertEqual(self.state("tx_sales_tax", "32000000111:00001"), ("held", "out_of_scope"))

    def test_another_taxpayers_outlet_is_not_merged_franchise_first(self):
        self.sync_franchise([fr_row("32000000901", "EXAMPLE TIRE LLC", since="2001-01-01T00:00:00.000")])
        self.match()
        self.sync_sales([st_row("32000000999", "00001", "EXAMPLE TIRE", "500 EXAMPLE ST",
                                taxpayer="EXAMPLE TIRE AND LUBE INC")], now=LATER)
        self.match(LATER)
        outlet = self.business_of("tx_sales_tax", "32000000999:00001")
        company = self.business_of("tx_franchise", "32000000901")
        self.assertNotEqual(outlet["id"], company["id"])
        self.evaluate()
        export = self.export()
        self.assertEqual(len(export["businesses"]), 2)
        outlet_listing = self.listing_of("tx_sales_tax", "32000000999:00001", export)
        self.assertEqual((outlet_listing["name"], outlet_listing["permitSince"]), ("Example Tire", "2020-02-01"))
        self.assertNotIn("registeredSince", outlet_listing)
        company_listing = self.listing_of("tx_franchise", "32000000901", export)
        self.assertEqual((company_listing["name"], company_listing["permitSince"]), ("Example Tire LLC", None))

    def test_a_same_named_company_never_takes_an_outlet_off_the_site(self):
        self.sync_sales([st_row("32000000333", "00001", "SMITH PLUMBING", "10 EXAMPLE ST", taxpayer="SMITH PLUMBING LLC")])
        self.match()
        self.evaluate()
        self.assertEqual(self.state("tx_sales_tax", "32000000333:00001"), ("ready", None))
        # Another taxpayer, whose org code is not clearly an entity: it may be a person.
        self.sync_franchise([fr_row("32000000334", "SMITH PLUMBING", org="PB")])
        self.match()
        self.evaluate()
        self.assertEqual(self.state("tx_sales_tax", "32000000333:00001"), ("ready", None))
        self.assertEqual(self.state("tx_franchise", "32000000334"), ("held", "personal_name_no_presence"))

    def test_several_outlets_of_another_taxpayer_stay_published(self):
        self.sync_sales([st_row("32000000611", "00001", "EXAMPLE TIRE", "100 EXAMPLE ST"),
                         st_row("32000000611", "00002", "EXAMPLE TIRE", "900 SAMPLE AVE")])
        self.match()
        self.evaluate()
        self.assertEqual(len(self.export()["businesses"]), 2)
        self.sync_franchise([fr_row("32000000612", "EXAMPLE TIRE INC", org="CT")])
        result = self.match()
        self.assertEqual(result["review"], 0)
        self.evaluate()
        for key in ("32000000611:00001", "32000000611:00002"):
            self.assertEqual(self.state("tx_sales_tax", key), ("ready", None))
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM review_queue WHERE kind='merge_ambiguous'")
                         .fetchone()[0], 0)
        self.assertEqual(len(self.export()["businesses"]), 3)  # the other company is listed on its own

    def test_an_outlet_never_joins_another_taxpayers_company_through_a_phone(self):
        # A franchise-only company joined by an OpenStreetMap place that carries a phone.
        self.sync_franchise([fr_row("32000000701", WIDGETS)])
        self.match()
        add_record(self.conn, "osm", "node/701", "Example Hardware Supply", phone="+19035550101",
                   tags={"shop": "hardware"})
        self.match()
        company = self.business_of("tx_franchise", "32000000701")
        self.assertEqual(self.business_of("osm", "node/701")["id"], company["id"])
        add_record(self.conn, "tx_sales_tax", "32000000702:00001", "Example Hardware Supply",
                   street="40 Example St", phone="+19035550101")
        self.match()
        self.assertNotEqual(self.business_of("tx_sales_tax", "32000000702:00001")["id"], company["id"])


# ---------------------------------------------------------------- privacy

class PrivacyTests(FranchiseCase):
    def sync_one(self, name, org="CL", number="32000000401"):
        self.sync_franchise([fr_row(number, name, org=org)])
        self.match()
        self.evaluate()
        return self.record("tx_franchise", number), self.business_of("tx_franchise", number)

    def test_a_company_name_is_published(self):
        rec, biz = self.sync_one(WIDGETS)
        self.assertEqual((rec["personal_name"], rec["is_individual"]), (0, 0))
        self.assertEqual(biz["name"], WIDGETS_SHOWN)
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
        for code in ENTITY_CODES:
            self.assertTrue(privacy.org_is_entity(franchise.ENTITY_ORG_TYPES[code]), code)
        for code in ("PB", "PI", "AR", "CI", "CM", "TR", "IS", ""):
            self.assertNotIn(code, franchise.ENTITY_ORG_TYPES)
            self.assertFalse(privacy.org_is_entity(code), code)
        self.assertEqual(franchise.privacy_flags("EXAMPLE HARDWARE SUPPLY", "CL"), (False, False, False))
        self.assertEqual(franchise.privacy_flags("EXAMPLE HARDWARE SUPPLY", "PB"), (True, True, True))
        self.assertEqual(franchise.privacy_flags("EXAMPLE HARDWARE SUPPLY LLC", "PB"), (False, False, False))

    def test_a_person_like_name_with_a_public_presence_waits_for_a_person(self):
        add_record(self.conn, "osm", "node/401", "Jane Doe", street="12 Sample Ave", zip_code="75601",
                   tags={"office": "consulting"}, website="https://www.janedoe.example/")
        self.match()
        rec, biz = self.sync_one("JANE DOE LLC")
        self.assertEqual(biz["id"], self.business_of("osm", "node/401")["id"])  # the same name joined them
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "person_name_check"))
        self.assertEqual(self.export()["businesses"], [])

    def test_a_name_that_reads_as_an_address_waits_for_a_person(self):
        rec, biz = self.sync_one("4100 EXAMPLE LN LLC")
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "name_contains_address"))

    def test_a_name_that_reads_as_a_po_box_waits_for_a_person(self):
        for text in ("PO BOX 1234 LLC", "P.O. Box 9 Holdings", "Post Office Box 77 LLC", "po-box-1234-llc",
                     "Example Box 12 Supply"):
            self.assertTrue(privacy.looks_like_address(text), text)
        for text in ("Example Boxing Club", "Example Box Company", "Jack Box Supply", "3 Amigos"):
            self.assertFalse(privacy.looks_like_address(text), text)
        rec, biz = self.sync_one("PO BOX 1234 LLC")
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "name_contains_address"))
        self.assertEqual(self.export()["businesses"], [])


class PersonNameWithALegalFormTests(FranchiseCase):
    """A person's name wearing a legal form is never published with no person looking, for any org code."""

    # Given names not in privacy.GIVEN_NAMES, surname-first order, a professional's title.
    UNLISTED_GIVEN_NAMES = ("NGUYEN HOA LLC", "TRAN THANH PLLC", "PATEL RAJESH LLC", "WANG WEI PLLC",
                            "MOHAMMED ALI LLC", "LE VAN LLC", "QUILLFEATHER DALIX LLC", "DALIX QUILLFEATHER MD PA",
                            "ZEPHYRA QUILLBY LLC")
    # A full name inside a professional or company name.
    NAME_IN_A_COMPANY = ("JOHN SMITH CPA PC", "JOHN SMITH ATTORNEY AT LAW PC", "LAW OFFICE OF JOHN SMITH PLLC",
                         "THE JOHN SMITH COMPANY", "JOHN SMITH HOLDINGS LP", "JOHN SMITH ENTERPRISES LLC",
                         "JOHN SMITH INVESTMENTS LLC", "MARIA GARCIA DDS PA", "JOHN SMITH MD PA",
                         # A full name whose given name is not on the list, next to a credential or a trade.
                         "WEI ZHANG CPA PLLC", "ANH NGUYEN CPA PC", "DALIX QUILLFEATHER CPA PC",
                         "DALIX QUILLFEATHER ATTORNEY AT LAW PC", "LAW OFFICE OF DALIX QUILLFEATHER PLLC",
                         "LAW OFFICES OF ANH NGUYEN PC", "DR ANH NGUYEN DDS PLLC",
                         "DALIX QUILLFEATHER INSURANCE AGENCY INC", "DALIX QUILLFEATHER CONSTRUCTION LLC",
                         "QUILLFEATHER & ZHANG CONSTRUCTION LLC", "DALIX QUILLFEATHER AND ASSOCIATES PLLC")
    # A family's own holding vehicle or a numbered trust: often one household's, named for it.
    FAMILY_VEHICLES = ("SMITH FAMILY LP", "THE QUILLFEATHER FAMILY LIMITED PARTNERSHIP", "SMITH FAMILY PARTNERSHIP LTD",
                       "SMITH FAMILY HOLDINGS LLC", "SMITH FAMILY LLC", "NGUYEN FAMILY LP", "SMITH FAMILY TR",
                       "QUILLFEATHER TRUST NO 2", "QUILLFEATHER TRUST 2019", "SMITH FAMILY INVESTMENTS LTD",
                       "SMITH FAMILY L P")
    # Plainly a company's: published for an entity code.
    COMPANIES = ("EXAMPLE TIRE LLC", "SMITH PLUMBING LLC", "GRACE PLUMBING LLC", "EXAMPLE OIL & GAS LLC",
                 "EXAMPLE HOLDINGS LLC", "EXAMPLE REAL ESTATE LLC", "QUILLBY LLC", "NGUYEN FAMILY DENTISTRY PLLC",
                 "EXAMPLE FAMILY RESTAURANT LLC", "EXAMPLE BANK & TRUST")

    def test_family_vehicles_and_numbered_trusts(self):
        for name in self.FAMILY_VEHICLES:
            self.assertTrue(franchise.is_trust_or_estate(name), name)
        for name in ("NGUYEN FAMILY DENTISTRY PLLC", "EXAMPLE FAMILY RESTAURANT LLC", "EXAMPLE BANK & TRUST",
                     "EXAMPLE REAL ESTATE LLC", "EXAMPLE TIRE NO 2 LLC"):
            self.assertFalse(franchise.is_trust_or_estate(name), name)

    def test_the_word_run_rule(self):
        for name in ("WEI ZHANG CPA PLLC", "PINEY WOODS SUPPLY LLC", "SMITH & JONES CONSTRUCTION LLC"):
            self.assertTrue(franchise.name_word_run(name), name)
        for name in ("SMITH PLUMBING LLC", "SMITH & ASSOCIATES", "EXAMPLE HARDWARE SUPPLY LLC", "QUILLBY LLC",
                     "LAW OFFICE OF SMITH PC", "SMITH CPA PC", "JOE'S EXAMPLE TIRE"):
            self.assertFalse(franchise.name_word_run(name), name)

    def test_the_flags(self):
        for name in self.UNLISTED_GIVEN_NAMES + self.NAME_IN_A_COMPANY + self.FAMILY_VEHICLES:
            if name not in self.FAMILY_VEHICLES:
                self.assertTrue(franchise.carries_person_name(name), name)
            for code in ALL_CODES:
                is_individual, personal, owner_named = franchise.privacy_flags(name, code)
                self.assertTrue(personal and owner_named, (name, code))
        for name in self.COMPANIES:
            self.assertFalse(franchise.carries_person_name(name), name)
            for code in ENTITY_CODES:
                self.assertEqual(franchise.privacy_flags(name, code), (False, False, False), (name, code))

    def test_never_published_for_any_code(self):
        rows, number = [], 0
        for name in self.UNLISTED_GIVEN_NAMES + self.NAME_IN_A_COMPANY + self.FAMILY_VEHICLES:
            for code in ALL_CODES:
                number += 1
                rows.append(fr_row(f"329{number:08d}", name, org=code))
        self.sync_franchise(rows)
        self.match()
        self.evaluate()
        states = {tuple(r) for r in self.conn.execute("SELECT publish_state, publish_reason FROM businesses")}
        self.assertEqual(states, {("held", "personal_name_no_presence")})
        export = self.export()
        self.assertEqual(export["businesses"], [])

    def test_with_a_public_presence_a_person_checks_it(self):
        add_record(self.conn, "osm", "node/451", "Nguyen Hoa", tags={"office": "consulting"})
        self.match()
        self.sync_franchise([fr_row("32000000451", "NGUYEN HOA LLC", org="CL")])
        self.match()
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000451"), ("review", "person_name_check"))

    def test_companies_are_published_for_entity_codes(self):
        rows = [fr_row(f"3280000{i:04d}", name, org=code)
                for i, (name, code) in enumerate((n, c) for n in self.COMPANIES for c in ENTITY_CODES)]
        self.sync_franchise(rows)
        self.match()
        self.evaluate()
        states = {tuple(r) for r in self.conn.execute("SELECT publish_state, publish_reason FROM businesses")}
        self.assertEqual(states, {("ready", None)})


# ---------------------------------------------------------------- category and facts

class ListingTests(FranchiseCase):
    def test_no_category_is_guessed_from_the_name(self):
        self.sync_franchise([fr_row("32000000501", "EXAMPLE PIZZA & DENTAL LLC")])
        self.match()
        self.evaluate()
        biz = self.business_of("tx_franchise", "32000000501")
        self.assertEqual((biz["category"], biz["category_label"]), categories.COMPANY_FALLBACK)
        self.assertEqual(categories.COMPANY_FALLBACK[0], "registered-company")
        self.assertNotEqual(categories.COMPANY_FALLBACK[0], categories.FALLBACK[0])  # not "Other Services"
        export = self.export()
        [listing] = export["businesses"]
        self.assertEqual((listing["category"], listing["categoryLabel"]),
                         ("registered-company", "Registered company; kind of business not on record"))
        self.assertEqual([(c["slug"], c["name"]) for c in export["categories"]],
                         [("registered-company", "Registered Companies")])

    def test_listing_shows_longview_tx_and_the_registration_year_with_its_source(self):
        self.sync_franchise([fr_row("32000000511", WIDGETS, since="2014-05-01T00:00:00.000")])
        self.match()
        self.evaluate()
        export = self.export()
        [listing] = export["businesses"]
        self.assertEqual(listing["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})
        self.assertIsNone(listing["permitSince"])
        self.assertEqual(listing["registeredSince"], "2014-05-01")
        facts_by_field = {f["field"]: f for f in listing["facts"]}
        self.assertEqual(set(facts_by_field), {"name", "category", "registeredSince"})
        for fact in facts_by_field.values():
            self.assertEqual(fact["source"], "tx_franchise")
            self.assertEqual(fact["url"], f"https://{SOCRATA_HOST}/d/{FR_ID}")
            self.assertEqual(fact["checkedAt"], "2026-09-24")
        self.assertEqual([s["id"] for s in export["sources"]], ["tx_franchise"])
        self.assertEqual(export["sources"][0]["name"], "Active Franchise Taxpayers")
        result = validate.validate_directory(export)
        self.assertEqual((result.dropped, result.issues), ([], []))
        self.assertEqual(result.directory["businesses"][0]["registeredSince"], "2014-05-01")

    def test_the_contract_check_refuses_misattributed_facts(self):
        self.sync_franchise([fr_row("32000000521", WIDGETS)])
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
        self.sync_franchise([fr_row("32000000531", WIDGETS), fr_row("32000000532", "EXAMPLE PAINT WORKS LLC")])
        data = status.collect(self.conn, self.settings, LATEST)
        row = next(s for s in data["sources"] if s["id"] == "tx_franchise")
        self.assertEqual((row["name"], row["status"], row["rows"]), ("Active Franchise Taxpayers", "ok", 2))
        html = status.render_html(data)
        self.assertIn("Active Franchise Taxpayers", html)
        self.assertIn("franchise-tax only: a Longview postal ZIP", html)
        self.assertNotIn("Example Hardware", html)


# ---------------------------------------------------------------- a primary source

class PrimarySourceTests(FranchiseCase):
    def test_a_franchise_only_company_is_published(self):
        self.assertIn("tx_franchise", matching.PRIMARY_SOURCES)
        self.assertIn("tx_franchise", publish.PRIMARY_SOURCES)
        self.sync_franchise([fr_row("32000000601", WIDGETS)])
        result = self.match()
        self.assertEqual(result["created"], 1)
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000601"), ("ready", None))

    def test_an_osm_place_found_first_is_no_longer_osm_only(self):
        add_record(self.conn, "osm", "node/602", "Example Hardware Supply", street="77 Sample Ct", zip_code="75605",
                   tags={"shop": "hardware"}, website="https://www.widgets.example/", lat=32.5, lon=-94.7)
        self.match()
        self.evaluate()
        self.assertEqual(self.state("osm", "node/602"), ("review", matching.OSM_ONLY_REASON))
        self.sync_franchise([fr_row("32000000602", WIDGETS)], now=LATER)
        self.match(LATER)
        biz = self.business_of("tx_franchise", "32000000602")
        self.assertEqual(biz["id"], self.business_of("osm", "node/602")["id"])
        self.evaluate()
        self.assertEqual((biz["name"], self.state("osm", "node/602")), (WIDGETS_SHOWN, ("ready", None)))
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
        self.sync_franchise([fr_row("32000000603", WIDGETS)])
        self.match()
        add_record(self.conn, "osm", "node/603", "Example Hardware Supply", street="77 Sample Ct", zip_code="75605",
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
        add_record(self.conn, "osm", "node/604", "Example Hardware Works", street="77 Sample Ct", zip_code="75605",
                   tags={"shop": "hardware"})
        self.sync_franchise([fr_row("32000000604", WIDGETS)])
        self.match()
        self.assertNotEqual(self.business_of("osm", "node/604")["id"],
                            self.business_of("tx_franchise", "32000000604")["id"])
        self.evaluate()
        self.assertEqual(self.state("osm", "node/604"), ("review", matching.OSM_ONLY_REASON))

    def test_two_registrations_with_one_name_stay_two_companies(self):
        self.sync_franchise([fr_row("32000000605", WIDGETS),
                             fr_row("32000000606", "EXAMPLE HARDWARE SUPPLY LP", org="PL")])
        self.match()
        self.assertNotEqual(self.business_of("tx_franchise", "32000000605")["id"],
                            self.business_of("tx_franchise", "32000000606")["id"])
        # An OpenStreetMap place with that name cannot tell them apart: it joins neither, and asks nothing.
        add_record(self.conn, "osm", "node/605", "Example Hardware Supply", tags={"shop": "hardware"})
        self.match()
        self.assertNotIn(self.business_of("osm", "node/605")["id"],
                         {self.business_of("tx_franchise", k)["id"] for k in ("32000000605", "32000000606")})
        self.evaluate()
        self.assertEqual(self.state("tx_franchise", "32000000605"), ("ready", None))
        self.assertEqual(self.state("tx_franchise", "32000000606"), ("ready", None))

    def test_several_places_with_the_name_go_to_a_person_and_take_nothing_off_the_site(self):
        for key, street in (("node/611", "100 Example St"), ("node/612", "900 Sample Ave")):
            add_record(self.conn, "osm", key, "Example Tire", street=street, tags={"shop": "tyres"})
        self.match()
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


class PracticeQuestionTests(FranchiseCase):
    """A franchise record with the name of a TABC- or NPI-backed business waits for a person, in either order."""

    NPI_KEY = "1999999901"
    TAXPAYER = "32000000621"

    def add_practice(self):
        add_record(self.conn, "npi", self.NPI_KEY, "Example Family Dental", street="700 Sample Ave Ste 200",
                   zip_code="75605", tags={"taxonomy": "Dentist"})

    def company(self):
        return fr_row(self.TAXPAYER, "EXAMPLE FAMILY DENTAL PLLC", org="CP")

    def assert_waiting(self):
        rec = self.record("tx_franchise", self.TAXPAYER)
        self.assertEqual((rec["match_state"], rec["business_id"]), ("review", None))
        self.evaluate()
        # The practice stays on the site while the question waits.
        self.assertEqual(self.state("npi", self.NPI_KEY), ("ready", None))
        export = self.export()
        self.assertEqual(len(export["businesses"]), 1)
        self.assertNotIn("registeredSince", export["businesses"][0])

    def test_practice_first(self):
        self.add_practice()
        self.match()
        self.sync_franchise([self.company()])
        self.match()
        self.assert_waiting()

    def test_company_first_then_the_practice_appears(self):
        self.sync_franchise([self.company()])
        self.match()
        first = self.business_of("tx_franchise", self.TAXPAYER)
        self.add_practice()
        self.match(LATER)
        self.assertEqual(self.conn.execute("SELECT active FROM businesses WHERE id=?", (first["id"],)).fetchone()[0], 0)
        self.assert_waiting()

    def test_accepted_they_are_one_listing(self):
        self.add_practice()
        self.match()
        self.sync_franchise([self.company()])
        self.match()
        self.answer("tx_franchise", self.TAXPAYER, accept=True)
        self.assertEqual(self.business_of("tx_franchise", self.TAXPAYER)["id"],
                         self.business_of("npi", self.NPI_KEY)["id"])
        self.evaluate()
        [listing] = self.export()["businesses"]
        self.assertEqual(listing["address"]["street"], "700 Sample Ave Ste 200")
        self.assertEqual(next(f for f in listing["facts"] if f["field"] == "address")["source"], "npi")
        self.assertEqual(listing["registeredSince"], "2014-05-01")
        self.match(LATEST)  # stays joined
        self.assertEqual(self.business_of("tx_franchise", self.TAXPAYER)["id"],
                         self.business_of("npi", self.NPI_KEY)["id"])

    def test_rejected_the_company_is_listed_on_its_own(self):
        self.add_practice()
        self.match()
        self.sync_franchise([self.company()])
        self.match()
        self.answer("tx_franchise", self.TAXPAYER, accept=False)
        company = self.business_of("tx_franchise", self.TAXPAYER)
        self.assertNotEqual(company["id"], self.business_of("npi", self.NPI_KEY)["id"])
        self.evaluate()
        self.assertEqual(len(self.export()["businesses"]), 2)
        self.match(LATEST)  # the answer sticks
        self.assertEqual(self.business_of("tx_franchise", self.TAXPAYER)["id"], company["id"])


# ---------------------------------------------------------------- the probe tool

class ProbeToolTests(FranchiseCase):
    def test_person_name_counts_by_source_are_counts_only(self):
        path = Path(__file__).resolve().parents[1] / "tools" / "probe_public_data.py"
        spec = importlib.util.spec_from_file_location("probe_public_data", path)
        probe = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(probe)
        self.sync_franchise([fr_row("32000000801", WIDGETS), fr_row("32000000802", "NGUYEN HOA LLC")])
        self.sync_sales([st_row("32000000803", "00001", "EXAMPLE TIRE", "100 EXAMPLE ST")])
        self.match()
        self.evaluate()
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            probe.published_by_source(self.conn)
        text = out.getvalue()
        self.assertIn("tx_franchise: looks_like_person_name=0 may_name_owner(bare)=0 carries_person_name=0 broad=0 (of 1)",
                      text)
        self.assertIn("tx_sales_tax:", text)
        self.assertIn("should have been held (expected 0): 0 by the hold rule, 0 by the broad check", text)
        for private in ("Nguyen", "NGUYEN", "Hardware", "Example Tire", "32000000"):
            self.assertNotIn(private, text)


# ---------------------------------------------------------------- end to end

class EndToEndTests(FranchiseCase):
    """sync (every Socrata job the service runs) -> match -> publish -> approve -> the static site."""

    def test_sync_match_publish_site(self):
        self.api.rows[ST_ID] = [
            st_row("32000000701", "00001", "EXAMPLE TIRE & LUBE", "500 EXAMPLE ST", taxpayer="EXAMPLE TIRE CO LLC"),
        ]
        self.api.rows[FR_ID] = [
            fr_row("32000000701", "EXAMPLE TIRE CO LLC"),                       # listed by its outlet
            fr_row("32000000702", WIDGETS, since="2014-05-01T00:00:00.000"),
            fr_row("32000000703", "EXAMPLE LAND HOLDINGS LP", org="PL", zip_code="75606",
                   since="2019-01-15T00:00:00.000"),                           # a PO-box ZIP: Longview
            fr_row("32000000704", "ZEPHYRA QUILLBY", org="PB"),                 # may be a person: held
            fr_row("32000000705", "EXAMPLE CHARITY INC", org="CN", exempt="12"),  # exempt: not listed
            fr_row("32000000706", "EXAMPLE GONE LLC", rtt="N"),                 # not in good standing
            fr_row("32000000707", "NGUYEN HOA LLC"),                            # a person's name with a legal form
            fr_row("32000000708", "EXAMPLE CASCADE MILLS INC", org="CF", zip_code="98632",
                   state="WA"),                                                # Longview, Washington
            fr_row("32000000709", "EXAMPLE ODD ZIP SUPPLY LLC", zip_code="75647"),  # not a Longview ZIP
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
        self.assertEqual(sorted(by_name), [WIDGETS_SHOWN, "Example Land Holdings LP", "Example Tire & Lube"])
        self.assertEqual(export["scope"], config.SCOPE_LABEL_POSTAL)
        self.assertEqual([s["id"] for s in export["sources"]], ["tx_sales_tax", "tx_franchise"])
        widgets = by_name[WIDGETS_SHOWN]
        self.assertEqual(widgets["registeredSince"], "2014-05-01")
        self.assertEqual(widgets["address"]["street"], None)
        self.assertEqual(widgets["category"], "registered-company")
        self.assertNotIn("registeredSince", by_name["Example Tire & Lube"])
        self.assertEqual(validate.validate_directory(export).dropped, [])

        folder = site.site_dir(self.settings)
        profile = (folder / widgets["slug"] / "index.html").read_text(encoding="utf-8")
        self.assertIn("Registered with the Texas Comptroller for franchise tax since 2014.", profile)
        self.assertIn("Texas Comptroller open data (franchise tax)", profile)
        self.assertIn("Longview, TX", profile)
        self.assertIn("Registered Companies", profile)
        self.assertNotIn("Other Services", profile)
        # No place to visit: no Directions link to a mailing address.
        self.assertNotIn("google.com/maps", profile)
        self.assertNotIn(">Directions<", profile)
        outlet = (folder / by_name["Example Tire & Lube"]["slug"] / "index.html").read_text(encoding="utf-8")
        self.assertIn(">Directions<", outlet)
        self.assertTrue((folder / "category" / "registered-company" / "index.html").exists())
        self.assertFalse((folder / "category" / "other" / "index.html").exists())
        about = (folder / "about" / "index.html").read_text(encoding="utf-8")
        self.assertIn("with a Longview, Texas address", about)
        self.assertIn("franchise-tax list", about)
        self.assertIn("held back", about)
        self.assertNotIn("every company", about)
        self.assertNotIn("every location", about)
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
        for held in ("Zephyra", "ZEPHYRA", "Charity", "Example Gone", "Nguyen", "Cascade", "Odd Zip"):
            self.assertNotIn(held, public, held)
        state = conn.execute("SELECT publish_state, publish_reason FROM businesses WHERE name=?",
                             ("Zephyra Quillby",)).fetchone()
        self.assertEqual(tuple(state), ("held", "personal_name_no_presence"))
        state = conn.execute("SELECT publish_state, publish_reason FROM businesses WHERE name=?",
                             ("Nguyen Hoa LLC",)).fetchone()
        self.assertEqual(tuple(state), ("held", "personal_name_no_presence"))
        status_data = json.loads((self.settings.www_dir / "status.json").read_text(encoding="utf-8"))
        row = next(s for s in status_data["sources"] if s["id"] == "tx_franchise")
        self.assertEqual(row["rows"], 6)


if __name__ == "__main__":
    unittest.main()

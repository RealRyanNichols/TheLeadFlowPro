"""Tests for the open-data adapters in longview_archive/sources/.

No network: a fake transport routes each request by method, host, and path to
fixture JSON under tests/fixtures/sources/ (all fictional: .example hosts,
555-01xx phones, placeholder names). The clock and sleep hooks in
sources/http.py are replaced so nothing waits.

    cd deploy/longview-archive && python3 -m unittest tests.test_sources -v
"""

from __future__ import annotations

import copy
import json
import re
import threading
import unittest
from pathlib import Path
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from longview_archive import db
from longview_archive.config import Settings
from longview_archive.sources import comptroller, http, npi, osm, socrata, tabc

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "sources"
SOCRATA_HOST = "data.texas.example"
NPI_HOST = "npiregistry.example"
OVERPASS_HOST = "overpass.example"
NOW1 = "2026-09-24T12:00:00Z"
NOW2 = "2026-10-01T12:00:00Z"
NOW3 = "2026-10-08T12:00:00Z"


def load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def make_settings(**overrides) -> Settings:
    values = dict(
        data_dir=Path("/nonexistent/lva-test"),
        socrata_base=f"https://{SOCRATA_HOST}",
        overpass_url=f"https://{OVERPASS_HOST}/api/interpreter",
        npi_url=f"https://{NPI_HOST}/api/",
        api_min_interval_s=0.0,
        allow_fictional_phones=True,
    )
    values.update(overrides)
    return Settings(**values)


def make_db():
    conn = db.connect(":memory:")
    db.migrate(conn)
    return conn


class Call:
    def __init__(self, method, url, headers, body, timeout):
        parts = urlsplit(url)
        self.method = method
        self.url = url
        self.host = parts.hostname
        self.path = parts.path
        self.query = {k: v[-1] for k, v in parse_qs(parts.query, keep_blank_values=True).items()}
        self.headers = headers
        self.body = body
        self.timeout = timeout


class FakeTransport:
    """Routes (method, host, path) to a handler(call) -> JSON-able object or (status, headers, body)."""

    def __init__(self):
        self.routes = {}
        self.calls = []

    def on(self, method, host, path, handler):
        self.routes[(method, host, path)] = handler

    def __call__(self, method, url, headers, body, timeout):
        call = Call(method, url, headers, body, timeout)
        self.calls.append(call)
        handler = self.routes.get((method, call.host, call.path))
        if handler is None:
            return 404, {}, b'{"message": "no route"}'
        result = handler(call)
        if isinstance(result, tuple):
            return result
        return 200, {"Content-Type": "application/json"}, json.dumps(result).encode("utf-8")

    def to(self, path):
        return [c for c in self.calls if c.path == path]


def socrata_transport(catalog, views, rows):
    """catalog JSON; views {id: view JSON}; rows {id: list of rows}, served by $offset/$limit."""
    t = FakeTransport()
    t.on("GET", SOCRATA_HOST, "/api/catalog/v1", lambda c: catalog)
    for dataset_id, view in views.items():
        t.on("GET", SOCRATA_HOST, f"/api/views/{dataset_id}.json", lambda c, v=view: v)
    for dataset_id, data in rows.items():
        def serve(c, data=data):
            offset, limit = int(c.query.get("$offset", 0)), int(c.query["$limit"])
            return data[offset:offset + limit]
        t.on("GET", SOCRATA_HOST, f"/resource/{dataset_id}.json", serve)
    return t


def sales_tax_transport(rows=None, catalog=None, view=None):
    return socrata_transport(
        catalog or load("sales_tax_catalog.json"),
        {"abcd-1234": view or load("sales_tax_view.json")},
        {"abcd-1234": load("sales_tax_rows.json") if rows is None else rows},
    )


def text_outside_raw(conn) -> str:
    """Every stored value in every table except source_records.raw_json, upper-cased."""
    chunks = []
    for (table,) in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall():
        cur = conn.execute(f"SELECT * FROM {table}")
        cols = [d[0] for d in cur.description]
        for row in cur.fetchall():
            for col, value in zip(cols, row):
                if table == "source_records" and col == "raw_json":
                    continue
                if value is not None:
                    chunks.append(str(value))
    return "\n".join(chunks).upper()


def records(conn, source_id):
    return {r["source_key"]: r for r in conn.execute(
        "SELECT * FROM source_records WHERE source_id=?", (source_id,)).fetchall()}


def last_run(conn, kind):
    return conn.execute("SELECT * FROM runs WHERE kind=? ORDER BY id DESC LIMIT 1", (kind,)).fetchone()


def source_row(conn, source_id):
    return conn.execute("SELECT * FROM sources WHERE id=?", (source_id,)).fetchone()


def add_business(conn, name, source_id, source_key):
    cur = conn.execute(
        "INSERT INTO businesses(name, name_norm, first_seen_at, updated_at) VALUES (?,?,?,?)",
        (name, name.lower(), NOW1, NOW1),
    )
    conn.execute("UPDATE source_records SET business_id=? WHERE source_id=? AND source_key=?",
                 (cur.lastrowid, source_id, source_key))
    return cur.lastrowid


class NoWaitCase(unittest.TestCase):
    """Replaces the sleep hook so retries never wait, and resets the per-host slots."""

    def setUp(self):
        http.reset_rate_limits()
        self.sleeps = []
        patcher = mock.patch.object(http, "sleep", self.sleeps.append)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(http.reset_rate_limits)


# ---------------------------------------------------------------- http


def sequence_transport(responses):
    calls = []

    def transport(method, url, headers, body, timeout):
        calls.append(Call(method, url, headers, body, timeout))
        item = responses[min(len(calls) - 1, len(responses) - 1)]
        if isinstance(item, BaseException):
            raise item
        return item

    transport.calls = calls
    return transport


OK_JSON = (200, {"Content-Type": "application/json"}, b'{"ok": true}')


class HttpTests(NoWaitCase):
    def test_headers_params_and_timeout(self):
        settings = make_settings()
        t = sequence_transport([OK_JSON])
        result = http.get_json("https://api.example/resource.json", settings,
                               params={"$where": "upper(city) = 'LONGVIEW'", "$limit": 5}, transport=t)
        self.assertEqual(result, {"ok": True})
        call = t.calls[0]
        self.assertEqual(call.method, "GET")
        self.assertEqual(call.headers["User-Agent"], settings.user_agent)
        self.assertEqual(call.headers["Accept"], "application/json")
        self.assertEqual(call.query, {"$where": "upper(city) = 'LONGVIEW'", "$limit": "5"})
        self.assertEqual(call.timeout, settings.api_timeout_s)
        self.assertIsNone(call.body)

    def test_post_form_data(self):
        t = sequence_transport([OK_JSON])
        http.get_json("https://overpass.example/api/interpreter", make_settings(),
                      data={"data": '[out:json];nwr["shop"];out;'}, transport=t, timeout=200)
        call = t.calls[0]
        self.assertEqual(call.method, "POST")
        self.assertEqual(call.headers["Content-Type"], "application/x-www-form-urlencoded")
        self.assertEqual(parse_qs(call.body.decode())["data"], ['[out:json];nwr["shop"];out;'])
        self.assertEqual(call.timeout, 200)

    def test_retries_503_then_succeeds(self):
        t = sequence_transport([(503, {}, b"busy"), (503, {}, b"busy"), OK_JSON])
        self.assertEqual(http.get_json("https://api.example/x", make_settings(), transport=t), {"ok": True})
        self.assertEqual(len(t.calls), 3)
        self.assertEqual(self.sleeps, [http.RETRY_BACKOFF_S[0], http.RETRY_BACKOFF_S[1]])

    def test_retry_after_seconds_honoured_up_to_120(self):
        t = sequence_transport([(429, {"Retry-After": "7"}, b""), (429, {"retry-after": "600"}, b""),
                                (503, {"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"}, b""), OK_JSON])
        http.get_json("https://api.example/x", make_settings(), transport=t)
        self.assertEqual(self.sleeps, [7.0, http.RETRY_BACKOFF_S[1], http.RETRY_BACKOFF_S[2]])

    def test_gives_up_after_three_retries(self):
        t = sequence_transport([(503, {}, b"secret body text")])
        with self.assertRaises(http.ApiError) as ctx:
            http.get_json("https://api.example/x", make_settings(), transport=t)
        self.assertEqual(len(t.calls), 1 + http.MAX_RETRIES)
        self.assertEqual(ctx.exception.status, 503)
        self.assertEqual(ctx.exception.host, "api.example")
        self.assertNotIn("secret", str(ctx.exception))
        self.assertEqual(len(self.sleeps), 3)

    def test_client_error_is_not_retried(self):
        t = sequence_transport([(404, {}, b"missing")])
        with self.assertRaises(http.ApiError) as ctx:
            http.get_json("https://api.example/x", make_settings(), transport=t)
        self.assertEqual((ctx.exception.status, len(t.calls), self.sleeps), (404, 1, []))

    def test_network_errors_are_retried_then_reported(self):
        t = sequence_transport([ConnectionResetError("reset"), OK_JSON])
        self.assertEqual(http.get_json("https://api.example/x", make_settings(), transport=t), {"ok": True})
        t = sequence_transport([TimeoutError("slow")])
        with self.assertRaises(http.ApiError) as ctx:
            http.get_json("https://api.example/x", make_settings(), transport=t)
        self.assertEqual(ctx.exception.status, 0)
        self.assertIn("TimeoutError", ctx.exception.reason)

    def test_invalid_json(self):
        t = sequence_transport([(200, {}, b"<html>not json</html>")])
        with self.assertRaises(http.ApiError) as ctx:
            http.get_json("https://api.example/x", make_settings(), transport=t)
        self.assertEqual(ctx.exception.reason, "invalid_json")
        self.assertNotIn("html", str(ctx.exception))

    def test_min_interval_per_host_with_fake_clock(self):
        now = [100.0]
        waits = []

        def fake_sleep(seconds):
            waits.append(seconds)
            now[0] += seconds

        settings = make_settings(api_min_interval_s=1.0)
        t = sequence_transport([OK_JSON])
        with mock.patch.object(http, "clock", lambda: now[0]), mock.patch.object(http, "sleep", fake_sleep):
            for _ in range(3):
                http.get_json("https://a.example/x", settings, transport=t)
            http.get_json("https://b.example/x", settings, transport=t)  # another host: no wait
            now[0] += 5.0
            http.get_json("https://a.example/x", settings, transport=t)  # interval long past
        self.assertEqual(waits, [1.0, 1.0])
        self.assertEqual(len(t.calls), 5)

    def test_min_interval_is_shared_across_threads(self):
        waits = []
        lock = threading.Lock()

        def fake_sleep(seconds):
            with lock:
                waits.append(seconds)

        settings = make_settings(api_min_interval_s=1.0)
        t = sequence_transport([OK_JSON])
        with mock.patch.object(http, "clock", lambda: 50.0), mock.patch.object(http, "sleep", fake_sleep):
            threads = [threading.Thread(target=http.get_json, args=("https://a.example/x", settings),
                                        kwargs={"transport": t}) for _ in range(5)]
            for th in threads:
                th.start()
            for th in threads:
                th.join()
        # Each thread got its own one-second slot.
        self.assertEqual(sorted(waits), [1.0, 2.0, 3.0, 4.0])


# ---------------------------------------------------------------- socrata


class DiscoveryTests(NoWaitCase):
    REQUIRED = [comptroller.FIELD_CANDIDATES[f] for f in comptroller.REQUIRED_FIELDS]

    def test_picks_the_right_dataset_among_decoys(self):
        t = sales_tax_transport()
        info = socrata.discover_dataset(make_settings(), comptroller.QUERY, comptroller.NAME_PATTERN,
                                        self.REQUIRED, transport=t)
        self.assertEqual(info.id, "abcd-1234")
        self.assertEqual(info.url, f"https://{SOCRATA_HOST}/d/abcd-1234")
        self.assertEqual(info.license, "Public Domain")
        self.assertEqual(info.name, "Active Sales Tax Permit Holders")
        self.assertEqual(info.updated_at, "2026-09-01T05:00:00.000Z")
        self.assertIn("outlet_inside_outside_city_limits_indicator", info.columns)
        catalog_call = t.to("/api/catalog/v1")[0]
        self.assertEqual(catalog_call.query, {"q": "active sales tax permit holders", "only": "dataset",
                                              "domains": SOCRATA_HOST, "limit": "50"})
        self.assertEqual([c.path for c in t.calls], ["/api/catalog/v1", "/api/views/abcd-1234.json"])

    def test_licence_fallbacks(self):
        view = load("sales_tax_view.json")
        view.pop("license")
        info = socrata.discover_dataset(make_settings(), comptroller.QUERY, comptroller.NAME_PATTERN,
                                        self.REQUIRED, transport=sales_tax_transport(view=view))
        self.assertEqual(info.license, "PUBLIC_DOMAIN")
        view.pop("licenseId")
        info = socrata.discover_dataset(make_settings(), comptroller.QUERY, comptroller.NAME_PATTERN,
                                        self.REQUIRED, transport=sales_tax_transport(view=view))
        self.assertEqual(info.license, "See dataset page")

    def test_nothing_matches(self):
        t = socrata_transport(load("unrelated_catalog.json"), {}, {})
        with self.assertRaises(socrata.DatasetNotFound):
            socrata.discover_dataset(make_settings(), comptroller.QUERY, comptroller.NAME_PATTERN,
                                     self.REQUIRED, transport=t)

    def test_fetch_rows_pages_until_a_short_page(self):
        rows = [{"n": str(i)} for i in range(3)]
        t = socrata_transport({"results": []}, {}, {"abcd-1234": rows})
        got = list(socrata.fetch_rows(make_settings(), "abcd-1234", "upper(outlet_city) = 'LONGVIEW'",
                                      page_size=2, transport=t))
        self.assertEqual(got, rows)
        calls = t.to("/resource/abcd-1234.json")
        self.assertEqual([c.query["$offset"] for c in calls], ["0", "2"])
        self.assertEqual({c.query["$order"] for c in calls}, {":id"})
        self.assertEqual({c.query["$where"] for c in calls}, {"upper(outlet_city) = 'LONGVIEW'"})

    def test_resolve_fields_takes_first_present_candidate(self):
        fields = socrata.resolve_fields(
            ["outlet_name", "outlet_address", "outlet_city", "outlet_zip", "outlet_zip_code_extra",
             "taxpayer_number", "outlet_number", "naics_code"],
            comptroller.FIELD_CANDIDATES, comptroller.REQUIRED_FIELDS)
        self.assertEqual(fields["outlet_zip"], "outlet_zip")
        self.assertEqual(fields["outlet_naics"], "naics_code")
        self.assertIsNone(fields["inside_city_limits"])


# ---------------------------------------------------------------- comptroller


class SalesTaxTests(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.conn = make_db()
        self.settings = make_settings()

    def sync(self, rows=None, now=NOW1, **kw):
        self.transport = sales_tax_transport(rows=rows, **kw)
        return comptroller.sync_sales_tax(self.conn, self.settings, now=now, transport=self.transport)

    def test_fields_scope_flags_and_pagination(self):
        with mock.patch.object(comptroller, "PAGE_SIZE", 4):
            counts = self.sync()
        pages = self.transport.to("/resource/abcd-1234.json")
        self.assertEqual([c.query["$offset"] for c in pages], ["0", "4"])
        self.assertEqual({c.query["$where"] for c in pages}, {"upper(outlet_city) = 'LONGVIEW'"})
        self.assertEqual({c.query["$limit"] for c in pages}, {"4"})

        recs = records(self.conn, "tx_sales_tax")
        self.assertEqual(sorted(recs), ["32000000001:00001", "32000000002:00001", "32000000003:00002",
                                        "32000000004:00001", "32000000005:00003"])
        tire = recs["32000000001:00001"]
        self.assertEqual(tire["name"], "Example Tire & Lube")
        self.assertEqual(tire["name_norm"], "example tire and lube")
        self.assertEqual(tire["street"], "100 Example Blvd Ste 4")
        self.assertEqual((tire["street_norm"], tire["suite"], tire["city"], tire["zip"]),
                         ("100 example blvd", "4", "Longview", "75601"))
        self.assertEqual((tire["naics"], tire["permit_start"], tire["scope"]), ("811111", "2019-03-01", "city"))
        self.assertEqual((tire["is_individual"], tire["personal_name"], tire["active"]), (0, 0, 1))
        self.assertEqual(tire["license"], "Public Domain")
        self.assertEqual(tire["source_url"], f"https://{SOCRATA_HOST}/d/abcd-1234")
        self.assertEqual((tire["fetched_at"], tire["first_seen_at"], tire["last_seen_at"]), (NOW1, NOW1, NOW1))
        self.assertEqual(tire["match_state"], "new")
        self.assertIsNone(tire["phone"])

        # Scope: the indicator decides first, then the ZIP.
        scopes = {k: (r["scope"], r["zip"]) for k, r in recs.items()}
        self.assertEqual(scopes["32000000001:00001"], ("city", "75601"))     # inside, Longview ZIP
        self.assertEqual(scopes["32000000002:00001"], ("nearby", "75604"))   # outside wins over a Longview ZIP
        self.assertEqual(scopes["32000000003:00002"], ("city", "75605"))     # indicator absent, Longview ZIP
        self.assertEqual(scopes["32000000004:00001"], ("nearby", "75662"))   # inside, but another ZIP
        self.assertEqual(scopes["32000000005:00003"], ("nearby", "75693"))   # unknown indicator, another ZIP
        self.assertEqual(counts["city"], 2)
        self.assertEqual(counts["nearby"], 3)
        self.assertEqual(counts["other_zips"], {"75662": 1, "75693": 1})
        self.assertEqual(counts["inside_other_zip"], 1)
        self.assertEqual(counts["fetched"], 6)
        self.assertEqual(counts["kept"], 5)
        self.assertEqual(counts["inserted"], 5)
        self.assertEqual(counts["skipped_no_name"], 1)

        # Individual and personal-name flags.
        tacos, person = recs["32000000002:00001"], recs["32000000003:00002"]
        self.assertEqual((tacos["is_individual"], tacos["personal_name"]), (1, 0))
        self.assertEqual((person["is_individual"], person["personal_name"]), (1, 1))
        self.assertEqual((counts["individual"], counts["personal_name"]), (2, 1))
        self.assertEqual(tacos["permit_start"], "2021-03-15")
        self.assertEqual(person["permit_start"], "2020-01-05")
        self.assertEqual(json.loads(recs["32000000005:00003"]["tags_json"]), {"city_limits": "unknown"})

        src = source_row(self.conn, "tx_sales_tax")
        self.assertEqual((src["dataset_id"], src["dataset_url"], src["license"]),
                         ("abcd-1234", f"https://{SOCRATA_HOST}/d/abcd-1234", "Public Domain"))
        self.assertEqual((src["row_count"], src["last_synced_at"], src["last_status"], src["last_error"]),
                         (5, NOW1, "ok", None))
        self.assertIn("outlet_zip_code", json.loads(src["columns_json"]))
        run = last_run(self.conn, "sync_tx_sales_tax")
        self.assertEqual((run["status"], run["started_at"], run["finished_at"]), ("ok", NOW1, NOW1))
        self.assertEqual(json.loads(run["counts_json"])["kept"], 5)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0], 1)

    def test_taxpayer_name_only_in_raw_json(self):
        with self.assertLogs("longview_archive", level="DEBUG") as logs:
            self.sync()
        stored = text_outside_raw(self.conn)
        for secret in ("DOE, JANE Q", "PUBLIC, JOHN Q", "ROE, RICHARD", "PRIVATE LN"):
            self.assertNotIn(secret, stored)
        for token in ("JANE", "DOE", "RICHARD", "ROE"):
            self.assertIsNone(re.search(rf"\b{token}\b", stored), token)
        raw = json.loads(records(self.conn, "tx_sales_tax")["32000000002:00001"]["raw_json"])
        self.assertEqual(raw["taxpayer_name"], "DOE, JANE Q")
        logged = "\n".join(logs.output).upper()
        for secret in ("JANE", "DOE", "PUBLIC", "RICHARD", "PRIVATE", "TACOS", "32000000002"):
            self.assertNotIn(secret, logged)

    def test_schema_mismatch_writes_nothing(self):
        catalog = load("sales_tax_catalog.json")
        catalog["results"] = [r for r in catalog["results"] if r["resource"]["id"] == "abcd-1234"]
        catalog["results"][0]["resource"]["columns_field_name"].remove("outlet_zip_code")
        view = load("sales_tax_view.json")
        view["columns"] = [c for c in view["columns"] if c["fieldName"] != "outlet_zip_code"]
        with self.assertRaises(comptroller.SchemaMismatch) as ctx:
            self.sync(catalog=catalog, view=view)
        self.assertEqual(ctx.exception.missing, ["outlet_zip"])
        self.assertEqual(self.transport.to("/resource/abcd-1234.json"), [])
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0], 0)
        run = last_run(self.conn, "sync_tx_sales_tax")
        self.assertEqual(run["status"], "error")
        src = source_row(self.conn, "tx_sales_tax")
        self.assertEqual(src["last_status"], "error")
        self.assertEqual((src["last_synced_at"], src["dataset_id"], src["dataset_url"]), (None, None, None))
        for column in ("outlet_name", "outlet_address", "taxpayer_name", "outlet_inside_outside_city_limits_indicator"):
            self.assertIn(column, src["last_error"])
        self.assertIn("outlet_zip_code|outlet_zip", src["last_error"])
        self.assertEqual(run["error"], src["last_error"])

    def test_resync_keeps_first_seen_resets_only_changed_and_deactivates_vanished(self):
        self.sync(now=NOW1)
        self.conn.execute("UPDATE source_records SET match_state='matched'")
        biz_tire = add_business(self.conn, "Example Tire & Lube", "tx_sales_tax", "32000000001:00001")
        biz_pies = add_business(self.conn, "Placeholder Pies", "tx_sales_tax", "32000000005:00003")

        rows = load("sales_tax_rows.json")
        rows[0]["taxpayer_address"] = "999 PRIVATE LN"      # raw-only change
        rows[1]["outlet_address"] = "210 SAMPLE ST"         # projection change
        second = [r for r in rows if r["taxpayer_number"] != "32000000005"]
        counts = self.sync(rows=second, now=NOW2)

        recs = records(self.conn, "tx_sales_tax")
        tire, tacos, pies = recs["32000000001:00001"], recs["32000000002:00001"], recs["32000000005:00003"]
        self.assertEqual((tire["first_seen_at"], tire["last_seen_at"], tire["fetched_at"]), (NOW1, NOW2, NOW2))
        self.assertEqual(tire["match_state"], "matched")
        self.assertIn("999 PRIVATE LN", tire["raw_json"])
        self.assertEqual((tacos["match_state"], tacos["street_norm"], tacos["first_seen_at"]),
                         ("new", "210 sample st", NOW1))
        self.assertEqual(recs["32000000003:00002"]["match_state"], "matched")
        self.assertEqual((pies["active"], pies["last_seen_at"], pies["match_state"]), (0, NOW1, "matched"))
        self.assertEqual((counts["updated"], counts["unchanged"], counts["deactivated"]), (1, 3, 1))
        self.assertEqual(counts["businesses_deactivated"], 1)
        active = {r["id"]: r["active"] for r in self.conn.execute("SELECT id, active FROM businesses")}
        self.assertEqual(active, {biz_tire: 1, biz_pies: 0})
        self.assertEqual(source_row(self.conn, "tx_sales_tax")["row_count"], 4)

        # It comes back: active again, sent back to matching, and so is its business.
        counts = self.sync(now=NOW3)
        pies = records(self.conn, "tx_sales_tax")["32000000005:00003"]
        self.assertEqual((pies["active"], pies["match_state"], pies["first_seen_at"]), (1, "new", NOW1))
        self.assertEqual(counts["reactivated"], 1)
        self.assertEqual(self.conn.execute("SELECT active FROM businesses WHERE id=?", (biz_pies,)).fetchone()[0], 1)

    def test_empty_result_does_not_deactivate(self):
        self.sync(now=NOW1)
        with self.assertRaises(http.EmptyResult):
            self.sync(rows=[], now=NOW2)
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM source_records WHERE active=1").fetchone()[0], 5)
        run = last_run(self.conn, "sync_tx_sales_tax")
        self.assertEqual((run["status"], run["error"]), ("error", "empty_result"))
        src = source_row(self.conn, "tx_sales_tax")
        self.assertEqual((src["last_status"], src["last_synced_at"], src["row_count"]), ("error", NOW1, 5))

    def test_api_error_is_recorded_and_raised(self):
        t = FakeTransport()
        t.on("GET", SOCRATA_HOST, "/api/catalog/v1", lambda c: (500, {}, b"oops"))
        with self.assertRaises(http.ApiError):
            comptroller.sync_sales_tax(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(len(t.calls), 1 + http.MAX_RETRIES)
        self.assertEqual(last_run(self.conn, "sync_tx_sales_tax")["status"], "error")
        self.assertIn("500", source_row(self.conn, "tx_sales_tax")["last_error"])

    def test_suppressed_name_zip_is_not_stored(self):
        self.conn.execute(
            "INSERT INTO suppressions(kind, value, reason, created_at) VALUES ('name_zip', ?, 'owner asked', ?)",
            ("example tire and lube|75601", NOW1))
        counts = self.sync()
        self.assertNotIn("32000000001:00001", records(self.conn, "tx_sales_tax"))
        self.assertEqual((counts["suppressed"], counts["kept"]), (1, 4))

    def test_small_parsers(self):
        self.assertEqual(comptroller.parse_date("2019-03-01T00:00:00.000"), "2019-03-01")
        self.assertEqual(comptroller.parse_date("2019-03-01"), "2019-03-01")
        self.assertEqual(comptroller.parse_date("3/1/2019"), "2019-03-01")
        self.assertEqual(comptroller.parse_date("20190301"), "2019-03-01")
        self.assertIsNone(comptroller.parse_date("2019-02-30"))
        self.assertIsNone(comptroller.parse_date("soon"))
        for value, expected in (("i", "inside"), (" Yes ", "inside"), ("true", "inside"), ("OUT", "outside"),
                                ("n", "outside"), ("False", "outside"), ("U", "unknown"), (None, "unknown")):
            self.assertEqual(comptroller.city_limits(value), expected, value)


# ---------------------------------------------------------------- tabc


class TabcTests(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.conn = make_db()
        self.settings = make_settings()

    def test_skipped_cleanly_when_no_dataset_matches(self):
        t = socrata_transport(load("unrelated_catalog.json"), {}, {})
        counts = tabc.sync_tabc(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(counts["status"], "skipped")
        self.assertTrue(counts["skipped_reason"].startswith("no_dataset"))
        run = last_run(self.conn, "sync_tx_tabc")
        self.assertEqual(run["status"], "skipped")
        self.assertTrue(run["error"].startswith("no_dataset"))
        src = source_row(self.conn, "tx_tabc")
        self.assertEqual(src["last_status"], "skipped")
        self.assertIsNone(src["last_synced_at"])
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0], 0)

    def test_skipped_when_columns_do_not_fit(self):
        catalog = load("tabc_catalog.json")
        catalog["results"] = [r for r in catalog["results"] if r["resource"]["id"] == "tdlr-0001"]
        view = {"id": "tdlr-0001", "name": "Sample Occupational License Holders",
                "columns": [{"fieldName": f} for f in ("license_number", "license_type", "holder_name", "county")]}
        t = socrata_transport(catalog, {"tdlr-0001": view}, {})
        counts = tabc.sync_tabc(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(counts["status"], "skipped")
        self.assertIn("trade_name", counts["skipped_reason"])
        self.assertEqual(last_run(self.conn, "sync_tx_tabc")["status"], "skipped")
        self.assertEqual(t.to("/resource/tdlr-0001.json"), [])

    def test_ingests_active_longview_licences(self):
        t = socrata_transport(load("tabc_catalog.json"), {"tabc-0001": load("tabc_view.json")},
                              {"tabc-0001": load("tabc_rows.json")})
        counts = tabc.sync_tabc(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(counts["status"], "ok")
        self.assertEqual((counts["fetched"], counts["kept"], counts["skipped_status"]), (5, 3, 2))
        self.assertEqual(t.to("/resource/tabc-0001.json")[0].query["$where"], "upper(city) = 'LONGVIEW'")
        recs = records(self.conn, "tx_tabc")
        self.assertEqual(sorted(recs), ["MB000001", "MB000005", "P0000004"])
        tacos = recs["MB000001"]
        self.assertEqual((tacos["name"], tacos["street_norm"], tacos["zip"], tacos["phone"], tacos["scope"]),
                         ("Sample Street Tacos", "200 sample st", "75604", "+19035550102", "city"))
        self.assertEqual(tacos["license"], "PUBLIC_DOMAIN")
        self.assertEqual(tacos["source_url"], f"https://{SOCRATA_HOST}/d/tabc-0001")
        bistro = recs["MB000005"]
        self.assertEqual((bistro["street"], bistro["suite"], bistro["phone"]),
                         ("900 Sample Pkwy Ste 12", "12", "+19035550105"))
        wine = recs["P0000004"]
        self.assertEqual((wine["scope"], wine["phone"]), ("nearby", None))
        self.assertEqual(counts["other_zips"], {"75662": 1})
        stored = text_outside_raw(self.conn)
        self.assertNotIn("DOE, JANE Q", stored)
        self.assertIn("DOE, JANE Q", tacos["raw_json"])
        src = source_row(self.conn, "tx_tabc")
        self.assertEqual((src["last_status"], src["dataset_id"], src["row_count"]), ("ok", "tabc-0001", 3))
        self.assertEqual(last_run(self.conn, "sync_tx_tabc")["status"], "ok")

    def test_errors_are_recorded_not_raised(self):
        t = FakeTransport()
        t.on("GET", SOCRATA_HOST, "/api/catalog/v1", lambda c: (502, {}, b"bad gateway"))
        counts = tabc.sync_tabc(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(counts["status"], "error")
        self.assertEqual(last_run(self.conn, "sync_tx_tabc")["status"], "error")

    def test_status_words(self):
        for value in ("Active", "ACTIVE - Renewal Due", "Current", "Issued"):
            self.assertTrue(tabc.status_is_active(value), value)
        for value in ("Inactive", "Expired", "Cancelled", "Suspended - Active Hold", "", None, "Surrendered"):
            self.assertFalse(tabc.status_is_active(value), value)


# ---------------------------------------------------------------- osm


def overpass_transport(payload):
    t = FakeTransport()
    t.on("POST", OVERPASS_HOST, "/api/interpreter", lambda c: payload)
    return t


class OsmTests(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.conn = make_db()
        self.settings = make_settings()

    def test_query_and_records(self):
        t = overpass_transport(load("overpass.json"))
        counts = osm.sync_osm(self.conn, self.settings, now=NOW1, transport=t)
        call = t.calls[0]
        self.assertEqual(call.method, "POST")
        self.assertGreaterEqual(call.timeout, 180)
        query = parse_qs(call.body.decode())["data"][0]
        self.assertTrue(query.startswith("[out:json][timeout:180];"))
        self.assertIn('area["ISO3166-2"="US-TX"]["admin_level"="4"]->.tx;', query)
        self.assertIn('area["name"="Longview"]["boundary"="administrative"]["admin_level"="8"](area.tx)->.lv;', query)
        for part in ('nwr["shop"](area.lv);', 'nwr["office"](area.lv);', 'nwr["craft"](area.lv);',
                     'nwr["healthcare"](area.lv);', '"^(hotel|motel|guest_house)$"',
                     '"^(fitness_centre|sports_centre|bowling_alley)$"', "dentist", "place_of_worship", "dojo"):
            self.assertIn(part, query)
        self.assertTrue(query.rstrip().endswith("out center tags;"))

        recs = records(self.conn, "osm")
        self.assertEqual(sorted(recs), ["node/1001", "node/1005", "relation/3003", "way/2002"])
        self.assertEqual((counts["fetched"], counts["kept"], counts["skipped_no_name"]), (5, 4, 1))
        tire = recs["node/1001"]
        self.assertEqual((tire["name"], tire["street"], tire["street_norm"], tire["suite"], tire["zip"]),
                         ("Example Tire & Lube", "100 Example Blvd Ste 4", "100 example blvd", "4", "75601"))
        self.assertEqual((tire["lat"], tire["lon"]), (32.5001, -94.7401))
        self.assertEqual(tire["phone"], "+19035550101")
        self.assertEqual(tire["website"], "https://www.exampletire.example/?x=1")
        self.assertEqual(tire["website_domain"], "exampletire.example")
        self.assertEqual(tire["source_url"], "https://www.openstreetmap.org/node/1001")
        self.assertEqual(tire["license"], "ODbL 1.0 (© OpenStreetMap contributors)")
        self.assertEqual(json.loads(tire["tags_json"])["shop"], "tyres")
        self.assertEqual((tire["scope"], tire["city"], tire["naics"]), ("city", "Longview", None))
        tacos = recs["way/2002"]
        self.assertEqual((tacos["lat"], tacos["lon"]), (32.5102, -94.7503))
        self.assertEqual(tacos["phone"], "+19035550104")
        self.assertEqual(tacos["website"], "https://sampletacos.example/menu")
        self.assertEqual((tacos["street_norm"], tacos["zip"]), ("200 sample st", "75604"))
        dental = recs["relation/3003"]
        self.assertEqual((dental["street"], dental["street_norm"], dental["lat"]), (None, None, 32.5203))
        self.assertEqual(dental["website"], "http://fictionaldental.example/")
        pies = recs["node/1005"]
        self.assertEqual((pies["website"], pies["phone"]), (None, None))
        src = source_row(self.conn, "osm")
        self.assertEqual((src["last_status"], src["row_count"], src["license"]),
                         ("ok", 4, "ODbL 1.0 (© OpenStreetMap contributors)"))
        self.assertEqual(last_run(self.conn, "sync_osm")["status"], "ok")

    def test_resync_deactivates_unseen_but_not_on_empty(self):
        payload = load("overpass.json")
        osm.sync_osm(self.conn, self.settings, now=NOW1, transport=overpass_transport(payload))
        smaller = copy.deepcopy(payload)
        smaller["elements"] = [e for e in smaller["elements"] if e["id"] != 2002]
        counts = osm.sync_osm(self.conn, self.settings, now=NOW2, transport=overpass_transport(smaller))
        self.assertEqual(counts["deactivated"], 1)
        self.assertEqual(records(self.conn, "osm")["way/2002"]["active"], 0)
        empty = dict(payload, elements=[])
        with self.assertRaises(http.EmptyResult):
            osm.sync_osm(self.conn, self.settings, now=NOW3, transport=overpass_transport(empty))
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM source_records WHERE source_id='osm' AND active=1").fetchone()[0], 3)
        self.assertEqual(last_run(self.conn, "sync_osm")["status"], "error")

    def test_overpass_remark_means_incomplete(self):
        payload = dict(load("overpass.json"), remark="runtime error: Query timed out")
        with self.assertRaises(http.ApiError):
            osm.sync_osm(self.conn, self.settings, now=NOW1, transport=overpass_transport(payload))
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0], 0)
        self.assertEqual(last_run(self.conn, "sync_osm")["error"], "overpass 200: overpass_remark")


# ---------------------------------------------------------------- npi


def org(number, name, zip_code="75601"):
    return {
        "number": str(number),
        "enumeration_type": "NPI-2",
        "basic": {"organization_name": name, "status": "A"},
        "addresses": [{"address_purpose": "LOCATION", "address_1": "10 EXAMPLE BLVD", "city": "LONGVIEW",
                       "state": "TX", "postal_code": zip_code, "telephone_number": "903-555-0150"}],
        "taxonomies": [{"desc": "Clinic/Center", "primary": True}],
    }


def npi_transport(results, one_letter_errors=False):
    t = FakeTransport()

    def serve(c):
        q = c.query
        skip, limit = int(q.get("skip", 0)), int(q.get("limit", 10))
        if skip > 1000 or limit > 200:
            return {"Errors": [{"description": "skip or limit out of range", "field": "skip", "number": "99"}]}
        prefix = q.get("organization_name")
        bare = prefix.rstrip("*").upper() if prefix is not None else None
        if bare is not None and one_letter_errors and len(bare) < 2:
            return {"Errors": [{"description": "at least two characters", "field": "organization_name", "number": "20"}]}
        assert (q["version"], q["enumeration_type"], q["city"], q["state"]) == ("2.1", "NPI-2", "LONGVIEW", "TX")
        matches = [
            r for r in results
            if any(str(a.get("postal_code") or "")[:5] == q["postal_code"] for a in r["addresses"])
            and (bare is None or r["basic"]["organization_name"].upper().startswith(bare))
        ]
        page = matches[skip:skip + limit]
        return {"result_count": len(page), "results": page}

    t.on("GET", NPI_HOST, "/api/", serve)
    return t


class NpiTests(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.conn = make_db()
        self.settings = make_settings()

    def test_location_address_dba_and_private_officials(self):
        t = npi_transport(load("npi_results.json"))
        counts = npi.sync_npi(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(sorted({c.query["postal_code"] for c in t.calls}), ["75601", "75602", "75603", "75604", "75605"])
        self.assertFalse(any("organization_name" in c.query for c in t.calls))
        recs = records(self.conn, "npi")
        self.assertEqual(sorted(recs), ["1000000001", "1000000002", "1000000004"])
        self.assertEqual(counts["skipped_location_elsewhere"], 1)
        dental = recs["1000000001"]
        self.assertEqual(dental["name"], "Fictional Family Dental")
        self.assertEqual((dental["street"], dental["street_norm"], dental["suite"], dental["zip"]),
                         ("400 Placeholder Ave Ste 200", "400 placeholder ave", "200", "75601"))
        self.assertEqual((dental["phone"], dental["scope"], dental["naics"]), ("+19035550110", "city", None))
        self.assertEqual(json.loads(dental["tags_json"]),
                         {"taxonomy": "Dentist, General Practice", "taxonomies": ["Dentist, General Practice", "Dentist"]})
        self.assertEqual(dental["source_url"], "https://npiregistry.cms.hhs.gov/provider-view/1000000001")
        self.assertEqual(dental["license"], "U.S. government public data (CMS NPPES)")
        self.assertEqual(recs["1000000002"]["name"], "Sample Health Clinic")   # "Other Name" is not a DBA
        self.assertEqual(recs["1000000002"]["phone"], "+19035550111")
        care = recs["1000000004"]
        self.assertEqual((care["name"], care["zip"]), ("Example Care Partners", "75603"))
        self.assertEqual(json.loads(care["tags_json"])["taxonomy"], "Home Health")
        stored = text_outside_raw(self.conn)
        for token in ("JANE", "DOE", "RICHARD", "ROE", "HOLDINGS"):
            self.assertIsNone(re.search(rf"\b{token}\b", stored), token)
        self.assertIn('"authorized_official_last_name":"DOE"', dental["raw_json"])
        self.assertEqual(last_run(self.conn, "sync_npi")["status"], "ok")
        self.assertEqual(source_row(self.conn, "npi")["row_count"], 3)

    def test_cap_triggers_prefix_split_and_results_are_deduplicated(self):
        bulk = ([org(1100000000 + i, f"EXAMPLE CARE {i:04d}") for i in range(700)]
                + [org(1200000000 + i, f"ELM SAMPLE CLINIC {i:04d}") for i in range(510)]
                + [org(1300000000 + i, f"FICTIONAL THERAPY {i:04d}") for i in range(60)])
        t = npi_transport(bulk + load("npi_results.json"))
        counts = npi.sync_npi(self.conn, self.settings, now=NOW1, transport=t)
        prefixes = {c.query.get("organization_name") for c in t.calls if c.query["postal_code"] == "75601"}
        self.assertTrue({None, "E*", "F*", "EX*", "EL*"} <= prefixes)
        self.assertNotIn("FA*", prefixes)   # F never reached the cap
        self.assertFalse(any(c.query.get("organization_name") for c in t.calls if c.query["postal_code"] != "75601"))
        self.assertLessEqual(max(int(c.query["skip"]) for c in t.calls), 1000)
        self.assertEqual({c.query["limit"] for c in t.calls}, {"200"})
        stored = self.conn.execute("SELECT COUNT(*) FROM source_records WHERE source_id='npi'").fetchone()[0]
        self.assertEqual(stored, 1270 + 3)   # every bulk org once, plus three fixture orgs in Longview
        self.assertEqual(counts["unique"], 1270 + 4)
        self.assertGreater(counts["duplicates"], 0)
        self.assertEqual((counts["capped_queries"], counts["still_capped"]), (2, 0))
        self.assertIn("1000000001", records(self.conn, "npi"))   # only reachable through the split
        self.assertEqual(last_run(self.conn, "sync_npi")["status"], "ok")

    def test_one_letter_prefix_rejected_falls_back_to_two_letters(self):
        results = [org(1400000000 + i, f"EXAMPLE CLINIC {i}") for i in range(3)] + \
                  [org(1500000000 + i, f"ELM CLINIC {i}") for i in range(3)]
        t = npi_transport(results, one_letter_errors=True)
        with mock.patch.object(npi, "PAGE_SIZE", 2), mock.patch.object(npi, "MAX_SKIP", 2):
            counts = npi.sync_npi(self.conn, self.settings, now=NOW1, transport=t)
        self.assertEqual(len(records(self.conn, "npi")), 6)
        self.assertEqual(counts["still_capped"], 0)
        self.assertGreater(counts["prefix_errors"], 0)
        self.assertEqual(last_run(self.conn, "sync_npi")["status"], "ok")

    def test_still_capped_is_partial_and_does_not_deactivate(self):
        self.conn.execute(
            "INSERT INTO source_records(source_id, source_key, license, source_url, fetched_at, first_seen_at,"
            " last_seen_at, raw_json) VALUES ('npi','1999999999','x','https://npi.example/',?,?,?,'{}')",
            (NOW1, NOW1, NOW1))
        results = [org(1600000000 + i, f"EXAMPLE CLINIC {i}") for i in range(5)]
        with mock.patch.object(npi, "PAGE_SIZE", 2), mock.patch.object(npi, "MAX_SKIP", 2):
            counts = npi.sync_npi(self.conn, self.settings, now=NOW2, transport=npi_transport(results))
        self.assertGreater(counts["still_capped"], 0)
        recs = records(self.conn, "npi")
        self.assertEqual(recs["1999999999"]["active"], 1)
        # The ceiling (4 here) hides the fifth org; the four found are stored.
        self.assertEqual((len(recs), counts["kept"], counts["deactivated"]), (5, 4, 0))
        run = last_run(self.conn, "sync_npi")
        self.assertEqual(run["status"], "partial")
        self.assertEqual(source_row(self.conn, "npi")["last_status"], "partial")

    def test_empty_result_raises_and_deactivates_nothing(self):
        npi.sync_npi(self.conn, self.settings, now=NOW1, transport=npi_transport(load("npi_results.json")))
        with self.assertRaises(http.EmptyResult):
            npi.sync_npi(self.conn, self.settings, now=NOW2, transport=npi_transport([]))
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM source_records WHERE source_id='npi' AND active=1").fetchone()[0], 3)


if __name__ == "__main__":
    unittest.main()

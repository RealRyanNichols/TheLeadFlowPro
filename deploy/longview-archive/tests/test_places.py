"""Many towns: the places registry, per-town sources, matching, pages, Caddy paths, and the removal hold.

Longview first, then the towns around it, turned on ring by ring with
LVA_PLACES. These tests use fictional rows for Longview, Marshall, and Diana (an
unincorporated town) and check that:

* each record is assigned to its town by postal city and ZIP, with Longview's
  scope rules applied the same way in every town;
* two towns' records are never joined, and a franchise-tax company steps aside
  only for a sales-tax outlet in its own town;
* each town gets its own section at /<town>/businesses/, with honest counts
  and "<Town>, TX" wherever no street may be shown, plus a hub at /places/;
* the Caddy files serve exactly those paths (with a real Caddy when one is on
  PATH), and never a path the website app owns;
* turning a town on never trips the auto-approve removal hold, and a town
  losing more than a quarter of its listings does;
* the privacy rules hold the same listings back in every town.

All names, taxpayer numbers, and streets are made up. Nothing touches the network.

    cd deploy/longview-archive && python3 -m unittest tests.test_places -v
"""

from __future__ import annotations

import copy
import json
import os
import re
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from longview_archive import approval, categories, config, db, matching, places, publish, site, status, validate
from longview_archive.sources import comptroller, franchise, npi, osm
from tests.test_franchise import FR_ID, ST_ID, FakeDataTexas, fr_row, make_settings, st_row
from tests.test_matching import add_record
from tests.test_site import NOW as SITE_NOW, fixture_export, pages
from tests.test_sources import NPI_HOST, OVERPASS_HOST, FakeTransport, NoWaitCase
from tests.test_sources import make_settings as sources_settings

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
CADDY_DIR = ROOT / "caddy"
SYNC_NOW = "2026-09-24T12:00:00Z"
LATER = "2026-10-01T12:00:00Z"
RING = ("longview", "marshall", "diana")
FIELDS = {"outlet_name": "outlet_name", "outlet_address": "outlet_address", "outlet_city": "outlet_city",
          "outlet_zip": "outlet_zip_code", "outlet_state": None, "outlet_naics": "outlet_naics_code",
          "permit_start": "outlet_permit_issue_date", "taxpayer_number": "taxpayer_number",
          "outlet_number": "outlet_number", "taxpayer_name": "taxpayer_name",
          "taxpayer_org_type": "taxpayer_organizational_type",
          "inside_city_limits": "outlet_inside_outside_city_limits_indicator"}


def town_row(number, outlet, name, street, city, zip_code, inside="I", naics="445110",
             taxpayer="EXAMPLE HOLDINGS LLC", org="Texas Limited Liability Company"):
    row = st_row(number, outlet, name, street, zip_code=zip_code, naics=naics, taxpayer=taxpayer, inside=inside)
    row["outlet_city"] = city
    row["taxpayer_organizational_type"] = org
    return row


# ---------------------------------------------------------------- the registry

class Registry(unittest.TestCase):
    def test_longview_is_exactly_what_it_always_was(self):
        lv = places.LONGVIEW
        self.assertEqual((lv.slug, lv.name, lv.postal_cities), ("longview", "Longview", ("LONGVIEW",)))
        self.assertEqual(config.LONGVIEW_ZIPS, ("75601", "75602", "75603", "75604", "75605"))
        self.assertEqual(config.LONGVIEW_POSTAL_ZIPS, config.LONGVIEW_ZIPS + ("75606", "75607", "75608"))
        self.assertEqual(lv.base, "/longview/businesses/")
        self.assertEqual(lv.base, site.BASE)
        self.assertEqual(config.Settings().places, ("longview",))
        self.assertEqual(config.Settings().site_dir, config.Settings().place_site_dir("longview"))

    def test_first_ring_is_seeded(self):
        self.assertEqual(
            [p.slug for p in places.PLACES],
            ["longview", "marshall", "kilgore", "white-oak", "hallsville", "diana", "harleton", "gladewater",
             "clarksville-city", "easton", "scottsville", "elysian-fields", "waskom", "ore-city", "gilmer",
             "karnack", "jefferson", "tatum", "henderson", "carthage"])
        for p in places.PLACES:
            with self.subTest(place=p.slug):
                self.assertEqual(p.state, "TX")
                self.assertTrue(p.postal_cities)
                self.assertTrue(all(c == c.upper() for c in p.postal_cities))
        # Where a ZIP was not certain, the town is matched by its name alone.
        self.assertEqual(places.get("clarksville-city").zips, ())
        self.assertFalse(places.get("diana").incorporated)

    def test_lva_places(self):
        load = config.load_settings
        self.assertEqual(load({}).places, ("longview",))
        self.assertEqual(load({"LVA_PLACES": "marshall, longview"}).places, ("longview", "marshall"))
        self.assertEqual(load({"LVA_PLACES": "all"}).places, tuple(p.slug for p in places.PLACES))
        with self.assertRaisesRegex(ValueError, "unknown places: tyler"):
            load({"LVA_PLACES": "longview,tyler"})
        self.assertEqual([p.name for p in load({"LVA_PLACES": "diana,longview"}).active_places],
                         ["Longview", "Diana"])

    def test_the_settings_file_may_turn_towns_on(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "env"
            path.write_text("LVA_PLACES=longview,marshall,diana\n")
            env = config.environment({}, path)
            self.assertEqual(config.load_settings(env).places, RING)

    def test_registry_refuses_what_could_route_or_match_wrongly(self):
        bad = (
            places.Place("places", "Places", ("PLACES",)),
            places.Place("Marshall", "Marshall", ("MARSHALL",)),
            places.Place("x", "X", ("O'NEIL",)),
            places.Place("y", "Y", ("LONGVIEW",)),
            places.Place("z", "Z", ("ZED",), ("75601",)),
        )
        for p in bad:
            with self.subTest(place=p.slug), self.assertRaises(ValueError):
                places._check_registry(places.PLACES + (p,))

    def test_scope_rules_per_town(self):
        m, d, c = places.get("marshall"), places.get("diana"), places.get("clarksville-city")
        self.assertEqual([m.scope(z) for z in ("75670", "75672", "75671", "75601", "", None)],
                         ["city", "city", "nearby", "out", "out", "out"])
        self.assertEqual(m.scope("75670", outside_city_limits=True), "nearby")
        # No city limits in an unincorporated town: never "city".
        self.assertEqual([d.scope(z) for z in ("75640", "75601", None)], ["nearby", "out", "out"])
        # No ZIP list: the town's name places it; a missing ZIP is still out.
        self.assertEqual([c.scope(z) for z in ("75647", None)], ["city", "out"])
        self.assertEqual([m.mailing_scope(z) for z in ("75671", "75601", None)], ["city", "out", "out"])
        self.assertEqual(d.mailing_scope("75640"), "nearby")
        # Longview's own rule, through config as before.
        self.assertEqual([config.longview_scope(z) for z in ("75601", "75606", "75670", None)],
                         ["city", "nearby", "out", "out"])

    def test_soql_filter(self):
        self.assertEqual(places.PlaceIndex().where("outlet_city"), "upper(outlet_city) = 'LONGVIEW'")
        index = places.PlaceIndex(places.resolve(RING))
        self.assertEqual(index.where("city"), "upper(city) IN ('LONGVIEW', 'MARSHALL', 'DIANA')")
        self.assertIs(index.for_city(" marshall "), places.get("marshall"))
        self.assertIsNone(index.for_city("KILGORE"))  # seeded, but not turned on


# ---------------------------------------------------------------- assignment

class Assignment(unittest.TestCase):
    def setUp(self):
        self.index = places.PlaceIndex(places.resolve(RING))

    def project(self, **kw):
        return comptroller.project_row(town_row("32000000001", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", **kw),
                                       FIELDS, self.index)

    def test_by_postal_city_and_zip(self):
        cases = (
            (dict(city="LONGVIEW", zip_code="75601"), ("longview", "Longview", "city")),
            (dict(city="LONGVIEW", zip_code="75670"), ("longview", "Longview", "out")),
            (dict(city="MARSHALL", zip_code="75670"), ("marshall", "Marshall", "city")),
            (dict(city="MARSHALL", zip_code="75670", inside="O"), ("marshall", "Marshall", "nearby")),
            (dict(city="MARSHALL", zip_code="75671"), ("marshall", "Marshall", "nearby")),
            (dict(city="MARSHALL", zip_code="75601"), ("marshall", "Marshall", "out")),
            (dict(city="DIANA", zip_code="75640"), ("diana", "Diana", "nearby")),
        )
        for kw, want in cases:
            with self.subTest(**kw):
                key, record, _ = self.project(**kw)
                self.assertIsNotNone(key)
                self.assertEqual((record["place"], record["city"], record["scope"]), want)
        self.assertEqual(self.project(city="KILGORE", zip_code="75662")[2], "skipped_city")

    def test_longview_rows_project_exactly_as_before(self):
        row = town_row("32000000001", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", "LONGVIEW", "75601")
        alone = comptroller.project_row(row, FIELDS)
        ringed = comptroller.project_row(row, FIELDS, self.index)
        self.assertEqual(alone, ringed)
        self.assertEqual(alone[1]["city"], "Longview")


# ---------------------------------------------------------------- OpenStreetMap and NPI: modest requests

class MapAndNpiRequests(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.conn = db.connect(":memory:")
        db.migrate(self.conn)
        self.addCleanup(self.conn.close)
        self.settings = sources_settings(places=("longview", "marshall", "diana", "clarksville-city"))

    def test_osm_one_query_per_incorporated_town(self):
        from urllib.parse import parse_qs
        t = FakeTransport()

        def serve(call):
            query = parse_qs(call.body.decode())["data"][0]
            town = re.search(r'area\.here\["name"="([^"]+)"\]\["boundary"', query).group(1)
            lat, lon = next(p.center for p in places.PLACES if p.name == town)
            return {"elements": [{"type": "node", "id": sum(map(ord, town)), "lat": lat, "lon": lon,
                                  "tags": {"name": f"Example Cafe {town}", "amenity": "cafe"}}]}
        t.on("POST", OVERPASS_HOST, "/api/interpreter", serve)
        counts = osm.sync_osm(self.conn, self.settings, now=SYNC_NOW, transport=t)
        self.assertEqual(len(t.calls), 3)  # Diana has no city boundary: not asked for, nothing drawn instead
        self.assertEqual(counts["skipped_places"], 1)
        rows = {r["place"]: r["city"] for r in self.conn.execute("SELECT place, city FROM source_records")}
        self.assertEqual(rows, {"longview": "Longview", "marshall": "Marshall", "clarksville-city": "Clarksville City"})
        self.assertIn('area.here["name"="Longview"]', osm.build_query())

    def test_npi_by_zip_or_by_town_name(self):
        t = FakeTransport()

        def serve(call):
            city = call.query["city"]
            return {"result_count": 1, "results": [{
                "number": str(abs(hash((city, call.query.get("postal_code")))) % 10 ** 10).zfill(10),
                "enumeration_type": "NPI-2", "basic": {"organization_name": f"EXAMPLE CLINIC {city}", "status": "A"},
                "addresses": [{"address_purpose": "LOCATION", "address_1": "1 CLINIC WAY", "city": city,
                               "state": "TX", "postal_code": call.query.get("postal_code") or "75647"}],
                "taxonomies": [{"desc": "Clinic/Center", "primary": True}]}]}
        t.on("GET", NPI_HOST, "/api/", serve)
        npi.sync_npi(self.conn, self.settings, now=SYNC_NOW, transport=t)
        asked = sorted((c.query["city"], c.query.get("postal_code", "-")) for c in t.calls)
        self.assertEqual(asked, sorted(
            [("LONGVIEW", z) for z in places.LONGVIEW.zips] + [("MARSHALL", "75670"), ("MARSHALL", "75672"),
                                                              ("DIANA", "75640"), ("CLARKSVILLE CITY", "-")]))
        scopes = {r["place"]: r["scope"] for r in self.conn.execute("SELECT place, scope FROM source_records")}
        self.assertEqual(scopes["diana"], "nearby")
        self.assertEqual(scopes["clarksville-city"], "city")


# ---------------------------------------------------------------- sync, matching, publishing

class TownsCase(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-places-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = make_settings(self.tmp.name, places=RING)
        self.conn = db.connect(":memory:")
        db.migrate(self.conn)
        with db.transaction(self.conn):
            categories.seed(self.conn)
        self.addCleanup(self.conn.close)
        self.api = FakeDataTexas()

    def sync(self, sales=(), franchises=(), now=SYNC_NOW, settings=None):
        settings = settings or self.settings
        self.api.rows[ST_ID] = list(sales)
        self.api.rows[FR_ID] = list(franchises)
        st = comptroller.sync_sales_tax(self.conn, settings, now=now, transport=self.api)
        fr = franchise.sync_franchise(self.conn, settings, now=now, transport=self.api)
        matching.match_pending(self.conn, now)
        return st, fr

    def biz(self, source_id, key):
        return self.conn.execute(
            "SELECT b.* FROM businesses b JOIN source_records s ON s.business_id=b.id"
            " WHERE s.source_id=? AND s.source_key=?", (source_id, key)).fetchone()

    def premises(self, key, name, street, zip_code, place):
        """A TABC licence at the street: public evidence of a storefront there (so the street may be shown)."""
        rid = add_record(self.conn, "tx_tabc", key, name, street=street, zip_code=zip_code)
        self.conn.execute("UPDATE source_records SET place=?, city=? WHERE id=?",
                          (place, places.get(place).name, rid))
        # As if a complete TABC sync had covered the ring (a record no sync covered is held).
        db.set_meta(self.conn, "synced_places:tx_tabc", json.dumps(sorted(RING)))
        matching.match_pending(self.conn, SYNC_NOW)

    def export(self, settings=None):
        settings = settings or self.settings
        publish.evaluate(self.conn, settings, LATER)
        return publish.build_export(self.conn, settings, LATER)


class SyncAndMatch(TownsCase):
    def test_one_query_for_all_towns_and_counts_per_town(self):
        st, fr = self.sync(
            sales=[town_row("32000000001", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", "LONGVIEW", "75601"),
                   town_row("32000000002", "00001", "EXAMPLE TIRE SHOP", "200 END BLVD", "MARSHALL", "75670"),
                   town_row("32000000003", "00001", "EXAMPLE FEED STORE", "300 FARM RD", "DIANA", "75640"),
                   town_row("32000000004", "00001", "EXAMPLE FAR AWAY", "400 ELSEWHERE ST", "KILGORE", "75662")],
            franchises=[fr_row("32000000010", "EXAMPLE HARDWARE SUPPLY LLC", zip_code="75672", city="MARSHALL")])
        wheres = {c.query.get("$where") for c in self.api.calls if c.query.get("$where")}
        self.assertIn("upper(outlet_city) IN ('LONGVIEW', 'MARSHALL', 'DIANA')", wheres)
        self.assertIn("upper(taxpayer_city) IN ('LONGVIEW', 'MARSHALL', 'DIANA') AND upper(taxpayer_state) = 'TX'",
                      wheres)
        self.assertEqual(st["skipped_city"], 1)  # Kilgore is seeded but not on
        self.assertEqual({k: v["kept"] for k, v in st["places"].items()}, {"longview": 1, "marshall": 1, "diana": 1})
        self.assertEqual(fr["places"]["marshall"], {"kept": 1, "city": 1, "nearby": 0, "out": 0})
        rows = self.conn.execute("SELECT source_id, place, city FROM source_records ORDER BY id").fetchall()
        self.assertEqual([tuple(r) for r in rows], [
            ("tx_sales_tax", "longview", "Longview"), ("tx_sales_tax", "marshall", "Marshall"),
            ("tx_sales_tax", "diana", "Diana"), ("tx_franchise", "marshall", "Marshall")])
        self.assertEqual({r["place"] for r in self.conn.execute("SELECT place FROM businesses")},
                         {"longview", "marshall", "diana"})

    def test_a_town_that_is_not_queried_keeps_its_records(self):
        rows = [town_row("32000000001", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", "LONGVIEW", "75601"),
                town_row("32000000002", "00001", "EXAMPLE TIRE SHOP", "200 END BLVD", "MARSHALL", "75670")]
        self.sync(sales=rows)
        # Marshall turned off: its rows are not asked for, so they are not retired either.
        lv_only = make_settings(self.tmp.name)
        self.sync(sales=rows[:1], now=LATER, settings=lv_only)
        self.assertEqual(self.conn.execute(
            "SELECT COUNT(*) FROM source_records WHERE place='marshall' AND active=1").fetchone()[0], 1)
        # ...but the town is not published while it is off.
        publish.evaluate(self.conn, lv_only, LATER)
        self.assertEqual(tuple(self.biz("tx_sales_tax", "32000000002:00001")[k]
                               for k in ("publish_state", "publish_reason")), ("held", "place_not_active"))
        self.assertEqual([b["address"]["city"] for b in publish.build_export(self.conn, lv_only, LATER)["businesses"]],
                         ["Longview"])

    def test_no_merge_across_towns(self):
        # Same name, same street line, same phone: two towns, so two businesses.
        a = add_record(self.conn, "tx_tabc", "T-1", "Example Grill", street="100 Main St", zip_code=None,
                       phone="+19035550100")
        b = add_record(self.conn, "tx_tabc", "T-2", "Example Grill", street="100 Main St", zip_code=None,
                       phone="+19035550100")
        c = add_record(self.conn, "osm", "node/3", "Example Grill", street="100 Main St", zip_code=None,
                       phone="+19035550100")
        self.conn.execute("UPDATE source_records SET place='marshall', city='Marshall' WHERE id IN (?, ?)", (b, c))
        matching.match_pending(self.conn, SYNC_NOW)
        ids = {r["id"]: r["business_id"] for r in self.conn.execute("SELECT id, business_id FROM source_records")}
        self.assertNotEqual(ids[a], ids[b])
        self.assertEqual(ids[b], ids[c])  # within Marshall they are the same place
        towns = {r["id"]: r["place"] for r in self.conn.execute("SELECT id, place FROM businesses")}
        self.assertEqual((towns[ids[a]], towns[ids[b]]), ("longview", "marshall"))
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM review_queue").fetchone()[0], 0)

    def test_franchise_steps_aside_only_for_an_outlet_in_its_own_town(self):
        self.sync(
            sales=[town_row("32000000020", "00001", "EXAMPLE HARDWARE SUPPLY", "200 END BLVD", "MARSHALL", "75670")],
            franchises=[fr_row("32000000020", "EXAMPLE HARDWARE SUPPLY LLC", zip_code="75601")])
        # The company's mailing address is in Longview and its only outlet is in Marshall: both are listed,
        # each in its own town, and turning Marshall on took nothing away from Longview.
        lv = self.biz("tx_franchise", "32000000020")
        mh = self.biz("tx_sales_tax", "32000000020:00001")
        self.assertIsNotNone(lv)
        self.assertEqual((lv["place"], mh["place"]), ("longview", "marshall"))
        self.assertNotEqual(lv["id"], mh["id"])
        # An outlet in the same town: the franchise record steps aside, as it always has in Longview.
        self.sync(
            sales=[town_row("32000000020", "00001", "EXAMPLE HARDWARE SUPPLY", "200 END BLVD", "MARSHALL", "75670"),
                   town_row("32000000020", "00002", "EXAMPLE HARDWARE SUPPLY", "9 SAMPLE ST", "LONGVIEW", "75601")],
            franchises=[fr_row("32000000020", "EXAMPLE HARDWARE SUPPLY LLC", zip_code="75601")], now=LATER)
        rec = self.conn.execute("SELECT * FROM source_records WHERE source_id='tx_franchise'").fetchone()
        self.assertEqual((rec["match_state"], rec["business_id"]), ("ignored", None))

    def test_a_record_that_moves_town_leaves_its_business(self):
        row = town_row("32000000030", "00001", "EXAMPLE TIRE SHOP", "200 END BLVD", "LONGVIEW", "75601")
        self.sync(sales=[row])
        old = self.biz("tx_sales_tax", "32000000030:00001")
        self.sync(sales=[dict(row, outlet_city="MARSHALL", outlet_zip_code="75670")], now=LATER)
        new = self.biz("tx_sales_tax", "32000000030:00001")
        self.assertNotEqual(old["id"], new["id"])
        self.assertEqual(new["place"], "marshall")
        self.assertEqual(self.conn.execute("SELECT active FROM businesses WHERE id=?", (old["id"],)).fetchone()[0], 0)

    def test_export_per_town(self):
        self.sync(
            sales=[town_row("32000000001", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", "LONGVIEW", "75601"),
                   town_row("32000000002", "00001", "EXAMPLE TIRE SHOP", "200 END BLVD", "MARSHALL", "75670"),
                   town_row("32000000003", "00001", "EXAMPLE FEED STORE", "300 FARM RD", "DIANA", "75640")])
        self.premises("TABC-2", "Example Tire Shop", "200 End Blvd", "75670", "marshall")
        data = self.export()
        self.assertEqual(list(data)[:8], ["schemaVersion", "generatedAt", "batchId", "sample", "indexable", "scope",
                                          "counts", "places"])
        self.assertEqual([(p["slug"], p["name"], p["published"]) for p in data["places"]],
                         [("longview", "Longview", 1), ("marshall", "Marshall", 1), ("diana", "Diana", 1)])
        by_town = {b.get("place", "longview"): b for b in data["businesses"]}
        self.assertNotIn("place", by_town["longview"])  # a Longview listing keeps its exact shape
        self.assertEqual(by_town["marshall"]["address"],
                         {"street": "200 End Blvd", "city": "Marshall", "state": "TX", "zip": "75670"})
        self.assertEqual(list(by_town["marshall"])[5:7], ["address", "place"])
        # The site's own contract check accepts it, and refuses a town it does not know.
        result = validate.validate_directory(data)
        self.assertEqual(result.dropped, [])
        self.assertEqual([p["published"] for p in result.directory["places"]], [1, 1, 1])
        wrong = copy.deepcopy(data)
        wrong["businesses"][0]["place"] = "atlantis"
        wrong["businesses"][1]["address"]["city"] = "Longview"
        reasons = sorted(r for _, r in validate.validate_directory(wrong).dropped)
        self.assertIn("unknown_place", reasons)

    def test_longview_alone_keeps_its_export_shape(self):
        self.sync(sales=[town_row("32000000001", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", "LONGVIEW", "75601")])
        lv_only = make_settings(self.tmp.name)
        data = self.export(lv_only)
        self.assertNotIn("places", data)
        self.assertEqual(data["businesses"][0]["address"]["city"], "Longview")
        self.assertNotIn("place", data["businesses"][0])

    def test_privacy_rules_are_the_same_in_every_town(self):
        """The same rows in Longview and Marshall get the same holds and the same hidden street."""
        def rows(n, city, zip_code):
            return [
                # A person's own name as the shop name: held without a public presence.
                town_row(f"3200000{n}01", "00001", "DALIX QUILLFEATHER", "12 QUIET LN", city, zip_code,
                         naics="561730", taxpayer="QUILLFEATHER, DALIX", org="Sole Owner"),
                # A sole owner's lawn service: listed, but its street (likely a home) is never shown.
                town_row(f"3200000{n}02", "00001", "EXAMPLE LAWN CARE", "14 QUIET LN", city, zip_code,
                         naics="561730", taxpayer="SAMPLE, JANE", org="Sole Owner"),
                # A company's shop with a storefront trade: street shown.
                town_row(f"3200000{n}03", "00001", "EXAMPLE AUTO REPAIR", "100 MAIN ST", city, zip_code),
            ]
        self.sync(sales=rows(1, "LONGVIEW", "75601") + rows(2, "MARSHALL", "75670"))
        self.premises("TABC-1", "Example Auto Repair", "100 Main St", "75601", "longview")
        self.premises("TABC-2", "Example Auto Repair", "100 Main St", "75670", "marshall")
        data = self.export()
        states = {}
        for r in self.conn.execute("SELECT place, name, publish_state, publish_reason FROM businesses"):
            states.setdefault(r["place"], {})[r["name"]] = (r["publish_state"], r["publish_reason"])
        self.assertEqual(states["longview"], states["marshall"])
        self.assertEqual(states["marshall"]["Dalix Quillfeather"], ("held", "personal_name_no_presence"))
        shown = {(b.get("place", "longview"), b["name"]): b["address"] for b in data["businesses"]}
        for town, name in (("longview", "Longview"), ("marshall", "Marshall")):
            with self.subTest(town=town):
                self.assertEqual(shown[(town, "Example Lawn Care")],
                                 {"street": None, "city": name, "state": "TX", "zip": None})
                self.assertIsNotNone(shown[(town, "Example Auto Repair")]["street"])
                self.assertNotIn((town, "Dalix Quillfeather"), shown)
        text = json.dumps(data)
        for private in ("Quillfeather", "QUILLFEATHER", "Quiet Ln", "SAMPLE, JANE"):
            self.assertNotIn(private, text)


# ---------------------------------------------------------------- the site

def town_listing(base: dict, n: int, place: str) -> dict:
    """A contract-valid copy of a fixture listing, moved to ``place`` with its own id, slug, and name."""
    b = copy.deepcopy(base)
    b["id"] = f"lv-tw{n:06d}"
    b["slug"] = f"town-shop-{n:04d}"
    b["name"] = f"Town Shop {n:04d}"
    town = places.get(place)
    b["address"]["city"] = town.name
    if b["address"]["street"]:
        b["address"]["zip"] = town.zips[0]
    if place != "longview":
        items = list(b.items())
        i = [k for k, _ in items].index("address") + 1
        b = dict(items[:i] + [("place", place)] + items[i:])
    return b


def ring_export(longview=3, marshall=2, diana=1) -> dict:
    data = fixture_export()
    base = next(b for b in data["businesses"] if b["address"]["street"])
    data["businesses"] = ([town_listing(base, i, "longview") for i in range(longview)]
                          + [town_listing(base, 100 + i, "marshall") for i in range(marshall)]
                          + [town_listing(base, 200 + i, "diana") for i in range(diana)])
    per = places.counts_by_place(data["businesses"])
    data["places"] = [{"slug": s, "name": places.get(s).name, "published": per.get(s, 0), "inArchive": per.get(s, 0),
                       "heldForPrivacy": 0, "needsReview": 0} for s in RING]
    data["counts"]["published"] = len(data["businesses"])
    return data


class Pages(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="lva-places-site-")
        self.addCleanup(self.tmp.cleanup)
        self.settings = config.Settings(data_dir=Path(self.tmp.name) / "data", places=RING)
        self.www = self.settings.www_dir

    def test_each_town_has_its_own_section_and_the_hub_links_them(self):
        counts = site.build_site(self.settings, ring_export(), SITE_NOW)
        self.assertEqual(counts["places"], {"longview": 3, "marshall": 2, "diana": 1})
        self.assertEqual(counts["businesses"], 6)
        for slug, n in (("longview", 3), ("marshall", 2), ("diana", 1)):
            folder = self.www / slug / "businesses"
            with self.subTest(town=slug):
                self.assertTrue(folder.is_symlink())
                got = pages(folder)
                profiles = [p for p in got if re.fullmatch(r"town-shop-\d+/index\.html", p)]
                self.assertEqual(len(profiles), n)
                for rel in ("index.html", "about/index.html", "new/index.html", "hiring/index.html"):
                    self.assertIn(rel, got)
                search = json.loads((folder / "search.json").read_text())
                self.assertEqual(search["base"], f"/{slug}/businesses/")
                self.assertEqual(len(search["businesses"]), n)  # each town's search.json holds its own only
                name = places.get(slug).name
                for rel, text in got.items():
                    hrefs = re.findall(r'href="(/[^"]*)"', text)
                    for href in hrefs:
                        self.assertTrue(href.startswith((f"/{slug}/businesses/", "/places/")), (rel, href))
                self.assertIn(f"<h1>{name} businesses</h1>", got["index.html"])
                # The fixture batch is city-only; Diana has no city limits, so it always lists by address.
                where = f"with a {name}, Texas address" if slug == "diana" else f"in the City of {name}, Texas"
                self.assertIn(where, got["about/index.html"])
                self.assertIn(f"subject={name}%20directory", got["about/index.html"])
                self.assertIn('href="/places/"', got["index.html"])  # the hub, since several towns are on
                if slug != "longview":
                    self.assertNotIn("Longview, TX", "".join(got.values()))
                    self.assertIn(f'data-town="{name}"', got["index.html"])
        diana_about = (self.www / "diana" / "businesses" / "about" / "index.html").read_text()
        self.assertIn("Diana is not an incorporated city", diana_about)
        self.assertNotIn("City of Diana", "".join(pages(self.www / "diana" / "businesses").values()))
        hub = (self.www / "places" / "index.html").read_text()
        for slug, n in (("longview", "3 businesses"), ("marshall", "2 businesses"), ("diana", "1 business")):
            self.assertIn(f'href="/{slug}/businesses/"', hub)
            self.assertIn(n, hub)
        self.assertTrue((self.www / "places" / "directory.css").is_file())
        self.assertIn('<meta name="robots" content="noindex,nofollow">', hub)

    def test_an_address_without_a_street_says_the_town(self):
        data = ring_export()
        m = next(b for b in data["businesses"] if b.get("place") == "marshall")
        m["address"].update(street=None, zip=None)
        m["facts"] = [f for f in m["facts"] if f["field"] != "address"]
        site.build_site(self.settings, data, SITE_NOW)
        page = (self.www / "marshall" / "businesses" / m["slug"] / "index.html").read_text()
        self.assertIn("<span>Marshall, TX</span>", page)
        self.assertIn("in Marshall, TX", page)

    def test_turning_a_town_off_takes_its_pages_down(self):
        site.build_site(self.settings, ring_export(), SITE_NOW)
        lv_only = config.Settings(data_dir=self.settings.data_dir)
        counts = site.build_site(lv_only, ring_export(), SITE_NOW)
        self.assertEqual(counts["businesses"], 3)
        self.assertNotIn("places", counts)
        self.assertTrue((self.www / "longview" / "businesses" / "index.html").is_file())
        for gone in ("marshall/businesses", "marshall/.builds", "diana/businesses", "places", ".places-builds"):
            self.assertFalse((self.www / gone).exists() or (self.www / gone).is_symlink(), gone)
        self.assertNotIn('href="/places/"', (self.www / "longview" / "businesses" / "index.html").read_text())

    def test_a_town_just_turned_on_is_built_and_waits_for_its_first_batch(self):
        lv_only = config.Settings(data_dir=self.settings.data_dir)
        data = fixture_export()  # a Longview batch from before the towns
        site.build_site(lv_only, data, SITE_NOW)
        self.assertTrue(site.site_exists(lv_only))
        self.assertFalse(site.site_exists(self.settings))  # Marshall and Diana have no section yet
        self.assertNotEqual(site.build_key(lv_only), site.build_key(self.settings))
        counts = site.build_site(self.settings, data, SITE_NOW)
        self.assertEqual(counts["places"], {"longview": len(data["businesses"]), "marshall": 0, "diana": 0})
        marshall = (self.www / "marshall" / "businesses" / "index.html").read_text()
        self.assertIn("The first batch is being checked", marshall)

    def test_longview_pages_are_unchanged_by_the_towns(self):
        """Longview's section from a Longview batch is the same whether other towns are on or not,
        except for the one footer link to the hub."""
        data = fixture_export()
        lv_only = site.render_site(data, config.Settings(data_dir=self.settings.data_dir))
        ringed = site.render_site(data, self.settings, places.LONGVIEW, hub=True)
        self.assertEqual(sorted(lv_only), sorted(ringed))
        hub = '<p><a href="/places/">Other towns in the directory</a></p>'
        for rel in lv_only:
            self.assertEqual(lv_only[rel], ringed[rel].replace(hub, ""), rel)


# ---------------------------------------------------------------- Caddy

class CaddyPaths(unittest.TestCase):
    PATTERN = re.compile(places.path_pattern())

    def test_the_caddy_files_list_every_seeded_town(self):
        for name, patterns in (("website.routes", (places.path_pattern(), places.hub_bare_pattern())),
                               ("website.errors", (places.path_pattern(),)),
                               ("longview-archive.caddy", (places.path_pattern(), places.hub_bare_pattern(),
                                                           places.files_path_pattern())),
                               ("public-host.caddy.in", (places.path_pattern(),))):
            text = (CADDY_DIR / name).read_text()
            for pattern in patterns:
                with self.subTest(file=name, pattern=pattern):
                    self.assertIn(f"path_regexp {pattern}\n", text)
        # The bare-path redirects, town map included, are exactly what places.py generates.
        for name, matchers in (("website.routes", ("longview_archive_bare", "longview_archive_hub_bare")),
                               ("longview-archive.caddy", ("longview_directory_bare", "longview_directory_hub_bare"))):
            with self.subTest(file=name):
                text = (CADDY_DIR / name).read_text()
                self.assertIn(places.caddy_bare_redirects(*matchers) + "\n", text)
                self.assertIn(f"path_regexp lva_bare {places.bare_path_pattern()}\n", text)
                self.assertNotIn("redir * {path}", text, "a redirect built from the raw path")

    def test_which_paths_are_the_directory(self):
        yes = ("/longview/businesses", "/longview/businesses/", "/longview/businesses/about/",
               "/marshall/businesses/town-shop-0001/", "/white-oak/businesses/search.json", "/places", "/places/",
               "/places/directory.css")
        # Any case, as Caddy's plain path matcher always matched Longview's section.
        yes += ("/Longview/businesses/", "/LONGVIEW/BUSINESSES", "/longview/Businesses", "/Places/")
        no = ("/", "/longview", "/longview/", "/longview/businesses-old", "/businesses", "/businesses/",
              "/marshall", "/tyler/businesses/", "/placesx", "/status/", "/longview/.builds/b1/",
              "/x/longview/businesses/", "/Longview/")
        for path in yes:
            with self.subTest(path=path):
                self.assertRegex(path, self.PATTERN)
        for path in no:
            with self.subTest(path=path):
                self.assertNotRegex(path, self.PATTERN)

    def test_no_town_shadows_a_route_of_the_website_app(self):
        app = REPO / "app"
        if not app.is_dir():
            self.skipTest("the website app is not in this checkout")
        self.assertFalse((app / "places").exists(), "the hub path /places/ belongs to the directory")
        for p in places.PLACES:
            with self.subTest(place=p.slug):
                self.assertFalse((app / p.slug / "businesses").exists())
        # /longview itself is the app's page; only /longview/businesses... is the directory.
        self.assertTrue((app / "longview" / "page.tsx").is_file())
        self.assertNotRegex("/longview/", self.PATTERN)

    def caddy(self):
        caddy = shutil.which("caddy")
        if not caddy:
            self.skipTest("caddy not installed")
        return caddy

    def test_real_caddy_serves_every_town_and_leaves_the_rest_to_the_app(self):
        caddy = self.caddy()
        import http.server
        import threading

        class App(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                body = f"app {self.path}".encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        app = http.server.ThreadingHTTPServer(("127.0.0.1", 0), App)
        threading.Thread(target=app.serve_forever, daemon=True).start()
        self.addCleanup(app.server_close)
        self.addCleanup(app.shutdown)
        with tempfile.TemporaryDirectory() as tmp:
            settings = config.Settings(data_dir=Path(tmp) / "data", places=RING)
            site.build_site(settings, ring_export(), SITE_NOW)
            www = settings.www_dir
            routes_dir = Path(tmp) / "routes"
            routes_dir.mkdir()
            (routes_dir / "website.routes").write_text(
                (CADDY_DIR / "website.routes").read_text().replace("/var/lib/longview-archive/www", str(www)))
            shutil.copy(CADDY_DIR / "website.errors", routes_dir / "website.errors")
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            website = (REPO / "deploy" / "droplet" / "theleadflowpro.caddy").read_text()
            block = f"http://127.0.0.1:{port} {{" + website.split("\nwww.theleadflowpro.com {", 1)[1]
            block = block.replace("/etc/caddy/longview-archive", str(routes_dir))
            block = block.replace("127.0.0.1:3100", f"127.0.0.1:{app.server_address[1]}")
            status_code = self.serve(caddy, tmp, "{\n\tadmin off\n}\n\n" + block, port)
            directory_csp = re.search(r'Content-Security-Policy "([^"]+)"',
                                      (CADDY_DIR / "website.routes").read_text()).group(1)
            for path in ("/longview/businesses/", "/marshall/businesses/", "/diana/businesses/about/",
                         "/marshall/businesses/town-shop-0100/", "/places/", "/places/directory.css",
                         "/marshall/businesses/search.json"):
                with self.subTest(path=path):
                    code, headers, _ = status_code(path)
                    self.assertEqual(code, 200)
                    self.assertEqual(headers["Content-Security-Policy"], directory_csp)
                    self.assertIn("noindex", headers["X-Robots-Tag"])
            for path in ("/marshall/businesses", "/places", "/diana/businesses"):
                with self.subTest(path=path):
                    code, headers, _ = status_code(path)
                    self.assertEqual((code, headers["Location"]), (308, path + "/"))
            # A seeded town that is not on: claimed by the directory, and not found.
            code, headers, _ = status_code("/kilgore/businesses/")
            self.assertEqual(code, 404)
            self.assertIn("noindex", headers["X-Robots-Tag"])
            for path in ("/", "/longview", "/longview/", "/marshall", "/businesses/", "/marshall/.builds/",
                         "/.places-builds/", "/tyler/businesses/"):
                with self.subTest(path=path):
                    code, headers, text = status_code(path)
                    self.assertEqual((code, text), (200, f"app {path}"))
                    self.assertIsNone(headers["X-Robots-Tag"])

    def test_real_caddy_staging_host_serves_every_town(self):
        caddy = self.caddy()
        with tempfile.TemporaryDirectory() as tmp:
            settings = config.Settings(data_dir=Path(tmp) / "data", places=RING)
            site.build_site(settings, ring_export(), SITE_NOW)
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            text = (CADDY_DIR / "longview-archive.caddy").read_text()
            text = text.replace("longview.165-227-248-110.sslip.io {", f"http://127.0.0.1:{port} {{")
            text = text.replace("/var/lib/longview-archive/www", str(settings.www_dir))
            get = self.serve(caddy, tmp, "{\n\tadmin off\n}\n\n" + text, port)
            self.assertEqual(get("/")[:2][0], 302)
            for path in ("/longview/businesses/", "/marshall/businesses/", "/places/"):
                with self.subTest(path=path):
                    code, headers, _ = get(path)
                    self.assertEqual(code, 200)
                    self.assertIn("script-src 'self'", headers["Content-Security-Policy"])
            code, headers, _ = get("/marshall/businesses")
            self.assertEqual((code, headers["Location"]), (308, "/marshall/businesses/"))
            for path in ("/kilgore/businesses/", "/marshall/.builds/", "/elsewhere"):
                with self.subTest(path=path):
                    code, headers, _ = get(path)
                    self.assertEqual(code, 404)
                    self.assertNotIn("script-src", headers["Content-Security-Policy"])

    def serve(self, caddy, tmp, caddyfile_text, port):
        caddyfile = Path(tmp) / "Caddyfile"
        caddyfile.write_text(caddyfile_text)
        env = {**os.environ, "HOME": tmp, "XDG_DATA_HOME": tmp, "XDG_CONFIG_HOME": tmp}
        proc = subprocess.Popen([caddy, "run", "--config", str(caddyfile), "--adapter", "caddyfile"],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)

        def stop():
            proc.terminate()
            proc.wait(timeout=30)
        self.addCleanup(stop)

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None

        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

        def get(path):
            deadline = time.monotonic() + 15
            while True:
                try:
                    resp = opener.open(f"http://127.0.0.1:{port}{path}", timeout=5)
                    return resp.status, resp.headers, resp.read().decode()
                except urllib.error.HTTPError as exc:
                    return exc.code, exc.headers, exc.read().decode()
                except OSError:
                    if time.monotonic() > deadline:
                        raise
                    time.sleep(0.2)
        return get


# ---------------------------------------------------------------- the removal hold

def batch(ids_by_town: dict, batch_id: str) -> dict:
    return {"schemaVersion": 1, "batchId": batch_id, "sample": False, "businesses": [
        dict({"id": i}, **({} if town == "longview" else {"place": town}))
        for town, ids in ids_by_town.items() for i in ids]}


class RemovalHold(unittest.TestCase):
    LV = [f"lv-l{i:05d}" for i in range(40)]
    MH = [f"lv-m{i:05d}" for i in range(40)]

    def test_turning_a_town_on_only_adds(self):
        approved = batch({"longview": self.LV}, "a")
        export = batch({"longview": self.LV, "marshall": self.MH}, "b")
        self.assertIsNone(approval.large_removal(approved, export))
        self.assertEqual(approval.removal_share(approved, export), (0, 40))

    def test_a_town_losing_more_than_a_quarter_waits_even_when_another_grows(self):
        approved = batch({"longview": self.LV, "marshall": self.MH[:20]}, "a")
        # Longview loses 11 of 40 (more than a quarter); the whole batch loses 11 of 60 (less).
        export = batch({"longview": self.LV[11:], "marshall": self.MH}, "b")
        removed, base = approval.removal_share(approved, export)
        self.assertLessEqual(removed, approval.LARGE_REMOVAL_SHARE * base)
        hold = approval.large_removal(approved, export)
        self.assertEqual(hold["places"], [{"place": "longview", "removed": 11, "approved": 40}])

    def test_a_town_losing_its_listings_counts_when_no_active_towns_are_given(self):
        approved = batch({"longview": self.LV, "marshall": self.MH[:30]}, "a")
        hold = approval.large_removal(approved, batch({"longview": self.LV}, "b"))
        self.assertEqual(hold["places"], [{"place": "marshall", "removed": 30, "approved": 30}])

    def test_a_small_town_is_covered_by_the_whole_batch_only(self):
        approved = batch({"longview": self.LV, "diana": ["lv-d00001", "lv-d00002", "lv-d00003"]}, "a")
        self.assertIsNone(approval.large_removal(approved, batch({"longview": self.LV, "diana": ["lv-d00001"]}, "b")))

    def test_auto_approve_holds_on_a_town_and_says_so_on_the_status_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            settings = config.Settings(data_dir=Path(tmp) / "data", places=("longview", "marshall"))
            settings.ensure_dirs()
            conn = db.connect(settings.db_path)
            self.addCleanup(conn.close)
            db.migrate(conn)
            approval.set_auto(conn, True)
            publish.write_export(settings.approved_export_path, batch({"longview": self.LV}, "a"))
            publish.write_export(settings.publish_export_path, batch({"longview": self.LV[20:], "marshall": self.MH},
                                                                      "b"))
            result = approval.auto_approve(conn, settings, SYNC_NOW)
            self.assertEqual(result["status"], "held")
            self.assertEqual(result["places"], [{"place": "longview", "removed": 20, "approved": 40}])
            info = status.collect(conn, settings, SYNC_NOW)
            self.assertEqual(info["directorySite"]["heldForPerson"]["places"][0]["place"], "longview")
            self.assertEqual([p["slug"] for p in info["places"]], ["longview", "marshall"])
            self.assertIn("Towns losing more than a quarter: longview: 20 of 40.", status.render_html(info))


if __name__ == "__main__":
    unittest.main()

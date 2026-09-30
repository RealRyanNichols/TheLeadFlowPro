"""Regression tests for the many-towns review fixes (fictional data only).

1. A removal request follows a record that moves town.
2. A town turned (back) on syncs at once and shows nothing no sync re-checked.
3/4. Caddy: the bare-path redirect is built from the matched town (no //host
   open redirect) and the directory's paths match in any case (real Caddy).
5. Turning a town off never freezes auto-approve for the others; LVA_PLACES
   must include Longview.
6. OpenStreetMap: a town's own boundary and box, and its own city and ZIPs;
   Gilmer's and Henderson's ZIPs.
"""

from __future__ import annotations

import json
import re
import socket
import tempfile
import unittest
from pathlib import Path
from urllib.parse import parse_qs

from longview_archive import approval, config, db, matching, places, publish, service, site
from longview_archive.sources import osm
from longview_archive.sources.http import covered_places
from tests.test_franchise import ST_ID, make_settings
from tests.test_places import (CADDY_DIR, LATER, REPO, RING, SYNC_NOW, CaddyPaths, TownsCase, batch, ring_export,
                               town_row)
from tests.test_site import NOW as SITE_NOW
from tests.test_sources import OVERPASS_HOST, FakeTransport, NoWaitCase
from tests.test_sources import make_settings as sources_settings

LATEST = "2026-10-08T12:00:00Z"


# ---------------------------------------------------------------- 1. removal requests follow a move

class SuppressionFollowsTheRecord(TownsCase):
    def setUp(self):
        super().setUp()
        self.settings = make_settings(self.tmp.name, places=("longview", "white-oak"))

    def suppress(self, public_id):
        self.conn.execute("INSERT INTO suppressions(kind, value, reason, note, created_at)"
                          " VALUES ('public_id', ?, 'owner asked', NULL, ?)", (public_id, SYNC_NOW))

    def names(self):
        return sorted(b["name"] for b in self.export()["businesses"])

    def test_a_removed_listing_stays_removed_when_its_record_moves_town(self):
        row = town_row("32000009001", "00001", "EXAMPLE QUIET BAKERY", "77 SAMPLE ST", "LONGVIEW", "75604")
        self.sync(sales=[row])
        old = self.biz("tx_sales_tax", "32000009001:00001")
        self.suppress(old["public_id"])
        self.assertEqual(self.names(), [])
        self.sync(sales=[dict(row, outlet_city="WHITE OAK", outlet_zip_code="75693")], now=LATER)
        new = self.biz("tx_sales_tax", "32000009001:00001")
        self.assertNotEqual(new["id"], old["id"])
        self.assertEqual(new["place"], "white-oak")
        self.assertEqual(new["publish_state"], "suppressed")
        carried = self.conn.execute("SELECT reason, note FROM suppressions WHERE kind='public_id' AND value=?",
                                    (new["public_id"],)).fetchone()
        self.assertEqual(carried["reason"], "removal request carried over: the record moved town")
        self.assertEqual(carried["note"], f"from {old['public_id']}")
        self.assertEqual(self.names(), [])
        # The approved batch and the site never show it either.
        approval.set_auto(self.conn, True)
        publish.run_publish(self.conn, self.settings, LATEST)
        approval.auto_approve(self.conn, self.settings, LATEST)
        approved = json.loads(self.settings.approved_export_path.read_text())
        self.assertEqual(approved["businesses"], [])
        # The move is on the record's trail.
        rule = self.conn.execute("SELECT rule FROM merges WHERE business_id=?", (old["id"],)).fetchone()
        self.assertEqual(rule["rule"], "left_place")

    def test_the_request_follows_it_onto_a_business_it_joins_in_the_new_town(self):
        # White Oak already lists the same outlet under another permit at the same street and phone.
        there = town_row("32000009002", "00001", "EXAMPLE QUIET BAKERY", "5 OAK ST", "WHITE OAK", "75693")
        row = town_row("32000009001", "00001", "EXAMPLE QUIET BAKERY", "77 SAMPLE ST", "LONGVIEW", "75604")
        self.sync(sales=[row, there])
        old = self.biz("tx_sales_tax", "32000009001:00001")
        self.suppress(old["public_id"])
        self.sync(sales=[dict(row, outlet_city="WHITE OAK", outlet_zip_code="75693", outlet_address="5 OAK ST"),
                         there], now=LATER)
        landed = self.biz("tx_sales_tax", "32000009001:00001")
        self.assertEqual(landed["place"], "white-oak")
        self.assertEqual(landed["publish_state"], "suppressed")
        self.assertNotIn("Example Quiet Bakery", self.names())

    def test_a_listing_nobody_asked_to_remove_moves_and_is_published(self):
        row = town_row("32000009003", "00001", "EXAMPLE OPEN DINER", "8 SAMPLE ST", "LONGVIEW", "75604")
        self.sync(sales=[row])
        self.sync(sales=[dict(row, outlet_city="WHITE OAK", outlet_zip_code="75693")], now=LATER)
        new = self.biz("tx_sales_tax", "32000009003:00001")
        self.assertEqual(new["place"], "white-oak")
        self.assertNotEqual(new["publish_state"], "suppressed")
        self.assertEqual(self.names(), ["Example Open Diner"])
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM suppressions").fetchone()[0], 0)


# ---------------------------------------------------------------- 2. a town turned on again

class TownTurnedBackOn(TownsCase):
    def test_stale_records_are_held_and_the_sync_is_due_at_once(self):
        on = make_settings(self.tmp.name, places=("longview", "kilgore"))
        off = make_settings(self.tmp.name, places=("longview",))
        lv = town_row("32000050001", "00001", "EXAMPLE LONGVIEW DELI", "5 MAIN ST", "LONGVIEW", "75601")
        kg = town_row("32000050002", "00001", "EXAMPLE CLOSED KILGORE CAFE", "9 OIL ST", "KILGORE", "75662")
        job = service.SYNC_BY_NAME["sales-tax"]
        self.api.rows[ST_ID] = [lv, kg]
        service.run_sync(self.conn, on, job, "2026-01-05T12:00:00Z", self.api)
        self.assertEqual(set(covered_places(self.conn, "tx_sales_tax")), {"longview", "kilgore"})
        self.assertEqual(service.ran_places(self.conn, job), {"longview", "kilgore"})
        # Kilgore turned off; weekly Longview-only syncs; the cafe closes meanwhile.
        self.api.rows[ST_ID] = [lv]
        service.run_sync(self.conn, off, job, "2026-06-01T12:00:00Z", self.api)
        matching.match_pending(self.conn, "2026-06-01T12:00:00Z")
        self.assertEqual(covered_places(self.conn, "tx_sales_tax"), ("longview",))
        self.assertIsNotNone(service.sync_due_at(self.conn, off, job))  # Longview alone: one period later
        # Kilgore on again: due now, and the cafe nobody re-checked is held.
        self.assertIsNone(service.sync_due_at(self.conn, on, job))
        publish.evaluate(self.conn, on, "2026-06-03T12:00:00Z")
        cafe = self.biz("tx_sales_tax", "32000050002:00001")
        self.assertEqual((cafe["publish_state"], cafe["publish_reason"]), ("held", "place_not_synced"))
        names = [b["name"] for b in publish.build_export(self.conn, on, "2026-06-03T12:00:00Z")["businesses"]]
        self.assertEqual(names, ["Example Longview Deli"])
        # The sync with Kilgore runs: the cafe is gone from the data, so it is retired, never shown.
        service.run_sync(self.conn, on, job, "2026-06-03T12:00:00Z", self.api)
        matching.match_pending(self.conn, "2026-06-03T12:00:00Z")
        publish.evaluate(self.conn, on, "2026-06-03T12:00:01Z")
        cafe = self.biz("tx_sales_tax", "32000050002:00001")
        self.assertEqual((cafe["publish_state"], cafe["publish_reason"]), ("held", "inactive"))
        self.assertIsNotNone(service.sync_due_at(self.conn, on, job))

    def test_a_town_still_listed_is_shown_again_after_its_sync(self):
        on = make_settings(self.tmp.name, places=("longview", "kilgore"))
        off = make_settings(self.tmp.name, places=("longview",))
        lv = town_row("32000050001", "00001", "EXAMPLE LONGVIEW DELI", "5 MAIN ST", "LONGVIEW", "75601")
        kg = town_row("32000050003", "00001", "EXAMPLE OPEN KILGORE CAFE", "9 OIL ST", "KILGORE", "75662")
        self.sync(sales=[lv, kg], settings=on)
        self.sync(sales=[lv], settings=off, now=LATER)
        publish.evaluate(self.conn, on, LATER)
        self.assertEqual(self.biz("tx_sales_tax", "32000050003:00001")["publish_reason"], "place_not_synced")
        self.sync(sales=[lv, kg], settings=on, now=LATEST)
        publish.evaluate(self.conn, on, LATEST)
        self.assertEqual(self.biz("tx_sales_tax", "32000050003:00001")["publish_state"], "ready")

    def test_a_failed_sync_after_turning_a_town_on_waits_for_its_retry(self):
        on = make_settings(self.tmp.name, places=("longview", "kilgore"))
        off = make_settings(self.tmp.name, places=("longview",))
        job = service.SYNC_BY_NAME["sales-tax"]
        self.api.rows[ST_ID] = [
            town_row("32000050001", "00001", "EXAMPLE LONGVIEW DELI", "5 MAIN ST", "LONGVIEW", "75601")]
        service.run_sync(self.conn, off, job, SYNC_NOW, self.api)
        db.start_run(self.conn, job.kind, LATER)  # a try that never finished (the process died)
        due = service.sync_due_at(self.conn, on, job)
        self.assertEqual(db.now_iso(due), "2026-10-01T18:00:00Z")

    def test_an_osm_sync_covers_a_town_without_a_boundary(self):
        conn = db.connect(":memory:")
        db.migrate(conn)
        self.addCleanup(conn.close)
        settings = sources_settings(places=("longview", "diana"))
        t = FakeTransport()
        t.on("POST", OVERPASS_HOST, "/api/interpreter", lambda c: {"elements": [
            {"type": "node", "id": 1, "lat": 32.5, "lon": -94.74, "tags": {"name": "Example Cafe", "amenity": "cafe"}}]})
        job = service.SYNC_BY_NAME["osm"]
        outcome = service.run_sync(conn, settings, job, SYNC_NOW, t)
        self.assertEqual(outcome.status, "ok")
        self.assertEqual(set(covered_places(conn, "osm")), {"longview", "diana"})
        self.assertIsNotNone(service.sync_due_at(conn, settings, job))  # not due again at once

    def test_an_archive_from_before_towns_covered_longview_only(self):
        self.assertEqual(covered_places(self.conn, "tx_tabc"), ("longview",))
        self.assertEqual(service.ran_places(self.conn, service.SYNC_BY_NAME["tabc"]), {"longview"})


# ---------------------------------------------------------------- 3/4. Caddy: no open redirect, any case

class CaddyRedirects(unittest.TestCase):
    caddy = CaddyPaths.caddy
    serve = CaddyPaths.serve

    def test_the_redirect_target_is_the_matched_town(self):
        pattern = re.compile(places.bare_path_pattern())
        self.assertEqual(pattern.match("/LONGVIEW/Businesses").group(1), "LONGVIEW")
        self.assertIsNone(pattern.match("/longview/businesses/"))
        self.assertIsNone(pattern.match("/places"))
        self.assertRegex("/PLACES", places.hub_bare_pattern())
        block = places.caddy_bare_redirects("m", "h")
        self.assertIn("redir * /{lva_town}/businesses/ 308", block)
        for p in places.PLACES:
            self.assertIn(f"~(?i)^{p.slug}$ {p.slug}\n", block)
        self.assertIn("default longview", block)

    def test_real_caddy_website_routes_redirect_only_inside_the_site(self):
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
            routes_dir = Path(tmp) / "routes"
            routes_dir.mkdir()
            (routes_dir / "website.routes").write_text(
                (CADDY_DIR / "website.routes").read_text().replace("/var/lib/longview-archive/www",
                                                                   str(settings.www_dir)))
            (routes_dir / "website.errors").write_text((CADDY_DIR / "website.errors").read_text())
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            website = (REPO / "deploy" / "droplet" / "theleadflowpro.caddy").read_text()
            block = f"http://127.0.0.1:{port} {{" + website.split("\nwww.theleadflowpro.com {", 1)[1]
            block = block.replace("/etc/caddy/longview-archive", str(routes_dir))
            block = block.replace("127.0.0.1:3100", f"127.0.0.1:{app.server_address[1]}")
            get = self.serve(caddy, tmp, "{\n\tadmin off\n}\n\n" + block, port)
            self.check_redirects(get)
            # Mixed case is the directory's, as Caddy's plain path matcher always had it for Longview.
            for path in ("/Longview/businesses/", "/LONGVIEW/BUSINESSES/", "/Marshall/Businesses/x/"):
                with self.subTest(path=path):
                    code, headers, text = get(path)
                    self.assertEqual((code, text), (404, "Not found"))
                    self.assertIn("noindex", headers["X-Robots-Tag"])
            code, _, text = get("/longview")
            self.assertEqual((code, text), (200, "app /longview"))

    def test_real_caddy_staging_host_redirects_only_inside_the_site(self):
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
            self.check_redirects(get)
            code, headers, _ = get("/Longview/businesses/")
            self.assertEqual(code, 404)  # the directory's path, not found (as the staging host's own 404s)
            self.assertIn("noindex", headers["X-Robots-Tag"])

    def check_redirects(self, get):
        for path, target in (("/longview/businesses", "/longview/businesses/"),
                             ("//longview/businesses", "/longview/businesses/"),
                             ("///longview/businesses", "/longview/businesses/"),
                             ("//marshall/businesses", "/marshall/businesses/"),
                             ("/LONGVIEW/BUSINESSES", "/longview/businesses/"),
                             ("/longview/Businesses", "/longview/businesses/"),
                             ("/White-Oak/businesses", "/white-oak/businesses/"),
                             ("/places", "/places/"), ("//places", "/places/"), ("/Places", "/places/")):
            with self.subTest(path=path):
                code, headers, _ = get(path)
                self.assertEqual((code, headers["Location"]), (308, target))
                self.assertIn("noindex", headers["X-Robots-Tag"])


# ---------------------------------------------------------------- 5. turning a town off

class TurningATownOff(unittest.TestCase):
    LV = [f"lv-l{i:05d}" for i in range(40)]
    MH = [f"lv-m{i:05d}" for i in range(40)]

    def test_the_approved_batch_is_compared_for_the_towns_that_are_on(self):
        approved = batch({"longview": self.LV, "marshall": self.MH[:30]}, "a")
        export = batch({"longview": self.LV}, "b")
        self.assertIsNotNone(approval.large_removal(approved, export))
        self.assertIsNone(approval.large_removal(approved, export, ("longview",)))
        # A town that is on still waits for a person when it loses more than a quarter.
        hold = approval.large_removal(approved, batch({"longview": self.LV[20:]}, "c"), ("longview",))
        self.assertEqual(hold["places"], [{"place": "longview", "removed": 20, "approved": 40}])

    def test_auto_approve_keeps_the_other_towns_updating(self):
        with tempfile.TemporaryDirectory() as tmp:
            both = config.Settings(data_dir=Path(tmp) / "data", places=("longview", "marshall"))
            lv = config.Settings(data_dir=Path(tmp) / "data", places=("longview",))
            both.ensure_dirs()
            conn = db.connect(both.db_path)
            self.addCleanup(conn.close)
            db.migrate(conn)
            approval.set_auto(conn, True)
            publish.write_export(both.approved_export_path, batch({"longview": self.LV, "marshall": self.MH}, "a"))
            publish.write_export(both.publish_export_path, batch({"longview": self.LV + ["lv-new00001"]}, "b"))
            result = approval.auto_approve(conn, lv, SYNC_NOW)
            self.assertEqual(result["status"], "approved")
            self.assertEqual(result["added"], 1)
            info = approval.status_info(conn, lv)
            self.assertIsNone(info["heldForPerson"])

    def test_lva_places_must_include_longview(self):
        for raw in ("marshall", "marshall,kilgore", "white-oak diana"):
            with self.subTest(raw=raw):
                with self.assertRaisesRegex(ValueError, "must include longview"):
                    places.parse_places(raw)
        self.assertEqual(places.parse_places("marshall, longview"), ("longview", "marshall"))
        self.assertEqual(places.parse_places(""), ("longview",))
        self.assertEqual(places.parse_places("all")[0], "longview")
        with self.assertRaisesRegex(ValueError, "must include longview"):
            config.load_settings({"LVA_PLACES": "marshall"})


# ---------------------------------------------------------------- 6. OpenStreetMap per town; ZIPs

EASTON = places.get("easton")


class OsmTownArea(NoWaitCase):
    def setUp(self):
        super().setUp()
        self.conn = db.connect(":memory:")
        db.migrate(self.conn)
        self.addCleanup(self.conn.close)

    def test_the_query_asks_for_the_boundary_that_contains_the_town(self):
        for p in places.PLACES:
            if not p.incorporated:
                continue
            with self.subTest(place=p.slug):
                query = osm.build_query(p)
                self.assertIn(f"is_in({p.center[0]},{p.center[1]})->.here;", query)
                self.assertIn(f'area.here["name"="{p.name}"]["boundary"="administrative"]["admin_level"="8"]->.lv;',
                              query)
                box = "({},{},{},{})".format(*p.bbox)
                self.assertEqual(query.count(f"(area.lv){box};"), 7)
                self.assertNotIn("(area.tx)", query)  # an area can not be filtered by an area: that matched every state

    def test_each_box_is_tight_around_its_own_town(self):
        towns = [p for p in places.PLACES if p.incorporated]
        for p in towns:
            with self.subTest(place=p.slug):
                self.assertTrue(p.in_bbox(*p.center))
                south, west, north, east = p.bbox
                self.assertLessEqual(north - south, 0.26)   # Longview, the largest: about 28 km
                self.assertLessEqual(east - west, 0.24)
                for other in towns:
                    if other is not p:
                        self.assertFalse(p.in_bbox(*other.center), f"{p.slug}'s box holds {other.slug}")
        for p in places.PLACES:
            if not p.incorporated:
                self.assertIsNone(p.bbox)

    def test_only_elements_of_the_town_itself_are_kept(self):
        settings = sources_settings(places=("longview", "easton"))
        lat, lon = EASTON.center
        elements = {
            "Easton": [
                # Easton, Pennsylvania: the same name, another state.
                {"type": "node", "id": 1, "lat": 40.6884, "lon": -75.2207,
                 "tags": {"name": "Example Pennsylvania Diner", "amenity": "restaurant", "addr:city": "Easton"}},
                # In the box, but its address is a neighbour's.
                {"type": "node", "id": 2, "lat": lat, "lon": lon,
                 "tags": {"name": "Example Longview Shop", "shop": "gift", "addr:city": "Longview"}},
                {"type": "node", "id": 3, "lat": lat, "lon": lon,
                 "tags": {"name": "Example Kilgore Shop", "shop": "gift", "addr:postcode": "75662"}},
                # The town's own: no address, or its own city and ZIP.
                {"type": "node", "id": 4, "lat": lat, "lon": lon, "tags": {"name": "Example Easton Cafe",
                                                                          "amenity": "cafe"}},
                {"type": "way", "id": 5, "center": {"lat": lat + 0.01, "lon": lon - 0.01},
                 "tags": {"name": "Example Easton Feed", "shop": "farm", "addr:city": "Easton, TX",
                          "addr:postcode": "75641-1234"}},
                # No position at all.
                {"type": "node", "id": 6, "tags": {"name": "Example Nowhere Shop", "shop": "gift"}},
            ],
            "Longview": [{"type": "node", "id": 7, "lat": 32.5, "lon": -94.74,
                          "tags": {"name": "Example Longview Cafe", "amenity": "cafe", "addr:postcode": "75601"}}],
        }
        t = FakeTransport()

        def serve(call):
            query = parse_qs(call.body.decode())["data"][0]
            return {"elements": elements[re.search(r'area\.here\["name"="([^"]+)"\]', query).group(1)]}
        t.on("POST", OVERPASS_HOST, "/api/interpreter", serve)
        counts = osm.sync_osm(self.conn, settings, now=SYNC_NOW, transport=t)
        kept = {r["source_key"]: r["place"] for r in self.conn.execute("SELECT source_key, place FROM source_records")}
        self.assertEqual(kept, {"node/4": "easton", "way/5": "easton", "node/7": "longview"})
        self.assertEqual((counts["skipped_outside_town"], counts["skipped_other_city"], counts["skipped_other_zip"]),
                         (2, 1, 1))
        self.assertEqual(counts["places"]["easton"], {"kept": 2})

    def test_element_check(self):
        lat, lon = EASTON.center
        self.assertEqual(osm.element_town_check(EASTON, lat, lon, {}), "")
        self.assertEqual(osm.element_town_check(EASTON, None, None, {}), "skipped_outside_town")
        self.assertEqual(osm.element_town_check(EASTON, lat, lon, {"addr:city": "Henderson"}), "skipped_other_city")
        self.assertEqual(osm.element_town_check(EASTON, lat, lon, {"addr:postcode": "7564"}), "skipped_other_zip")
        self.assertEqual(osm.element_town_check(EASTON, lat, lon, {"addr:city": " easton ", "addr:postcode": "75641"}),
                         "")
        cc = places.get("clarksville-city")  # no ZIP list: any ZIP, its own name only
        self.assertEqual(osm.element_town_check(cc, *cc.center, {"addr:postcode": "75693"}), "")
        self.assertEqual(osm.element_town_check(cc, *cc.center, {"addr:city": "White Oak"}), "skipped_other_city")


class TownZips(unittest.TestCase):
    def test_gilmer(self):
        gilmer = places.get("gilmer")
        self.assertEqual(gilmer.all_zips, ("75644", "75645"))
        self.assertEqual(gilmer.scope("75645"), "city")
        self.assertEqual(gilmer.scope("75645", outside_city_limits=True), "nearby")

    def test_henderson(self):
        henderson = places.get("henderson")
        self.assertEqual((henderson.zips, henderson.po_box_zips), (("75652", "75654"), ("75653",)))
        self.assertEqual(henderson.scope("75653"), "nearby")
        self.assertEqual(henderson.mailing_scope("75653"), "city")

    def test_longview_is_unchanged(self):
        lv = places.LONGVIEW
        self.assertEqual((lv.zips, lv.po_box_zips),
                         (("75601", "75602", "75603", "75604", "75605"), ("75606", "75607", "75608")))


if __name__ == "__main__":
    unittest.main()

import base64
import hashlib
import json
import random
import unittest

from longview_archive import db, matching as m, normalize

NOW = "2026-09-24T12:00:00Z"
LATER = "2026-10-01T12:00:00Z"


def ph(n):
    """A fictional East Texas number, 903-555-01nn."""
    return normalize.norm_phone(f"903-555-01{n:02d}", allow_fictional=True)


P1, P2, P3, P4 = ph(1), ph(2), ph(3), ph(4)


def make_db():
    conn = db.connect(":memory:")
    db.migrate(conn)
    return conn


def add_record(conn, source_id, key, name, street=None, zip_code="75601", phone=None, website=None,
               naics=None, permit_start=None, scope="city", tags=None, active=1, is_individual=0,
               lat=None, lon=None, raw=None):
    street_norm, suite = normalize.parse_street(street) if street else ("", "")
    url = normalize.norm_url(website) if website else None
    cur = conn.execute(
        "INSERT INTO source_records(source_id, source_key, license, source_url, fetched_at, first_seen_at,"
        " last_seen_at, active, raw_json, name, name_norm, street, street_norm, suite, city, zip, phone,"
        " website, website_domain, naics, lat, lon, permit_start, is_individual, personal_name, scope,"
        " tags_json, match_state) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new')",
        (
            source_id, key, "fixture", f"https://data.example/{source_id}/{key}", NOW, NOW, NOW, active,
            db.dumps(raw or {"fixture": True}), name, normalize.norm_name(name), street,
            street_norm or None, suite or None, "Longview", zip_code, phone, url,
            normalize.registrable_domain(url) if url else None, naics, lat, lon, permit_start,
            is_individual, 0, scope, db.dumps(tags) if tags else None,
        ),
    )
    return cur.lastrowid


def insert_all(conn, records):
    return [add_record(conn, **dict(r)) for r in records]


def business_of(conn, source_id, key):
    row = conn.execute(
        "SELECT b.* FROM businesses b JOIN source_records s ON s.business_id=b.id"
        " WHERE s.source_id=? AND s.source_key=?",
        (source_id, key),
    ).fetchone()
    return row


def record(conn, source_id, key):
    return conn.execute(
        "SELECT * FROM source_records WHERE source_id=? AND source_key=?", (source_id, key)
    ).fetchone()


def count(conn, sql, params=()):
    return conn.execute(sql, params).fetchone()[0]


def expected_public_id(source_id, key):
    digest = hashlib.sha256(f"{source_id}:{key}".encode()).digest()
    return "lv-" + base64.b32encode(digest).decode().rstrip("=").lower()[:10]


def R(source_id, key, name, **kw):
    return dict(source_id=source_id, key=key, name=name, **kw)


# A small fictional town that exercises every rule at once.
TOWN = [
    R("tx_sales_tax", "ST-1", "Example Tire & Lube", street="100 Example St", naics="811111",
      permit_start="2019-03-01"),
    R("tx_sales_tax", "ST-2", "EXAMPLE TIRE AND LUBE LLC", street="100 EXAMPLE STREET", naics="811111",
      permit_start="2015-06-01"),
    R("tx_sales_tax", "ST-3", "Example Tire & Lube", street="200 Sample Ave", zip_code="75602",
      naics="811111"),
    R("tx_sales_tax", "ST-4", "Example Tire & Lube", street="900 Sample Ave", zip_code="75602",
      naics="811111"),
    R("tx_sales_tax", "ST-5", "Fictional Family Dental", street="100 Example St", naics="621210"),
    R("tx_sales_tax", "ST-6", "Example Muffler Shop", street="100 Example St", naics="811112"),
    R("tx_sales_tax", "ST-7", "About", street="300 Fictional Rd", zip_code="75604", naics="453220"),
    R("tx_sales_tax", "ST-8", "Sample Lawn Care", street="700 Sample Ln", zip_code="75605", naics="561730",
      is_individual=1, raw={"taxpayer_name": "DOE, JANE Q", "taxpayer_organizational_type": "Sole Owner"}),
    R("tx_sales_tax", "ST-9", "Sample Feed Store", street="12 Sample Trl", zip_code="75699", naics="444240",
      scope="nearby"),
    R("tx_sales_tax", "ST-10", "Sample Closed Diner", street="999 Example St", naics="722511", active=0),
    R("tx_tabc", "TABC-1", "Sample Street Tacos", street="250 Sample Ave", zip_code="75602", phone=P1,
      website="https://www.samplestreettacos.example/"),
    R("tx_tabc", "TABC-2", "Sample Street Tacos", street="1800 Fictional Rd", zip_code="75604",
      website="https://samplestreettacos.example/"),
    R("npi", "NPI-1", "Fictional Family Dental", street="100 Example St", phone=P2,
      tags={"taxonomy": "Dentist"}, lat=32.5, lon=-94.7),
    R("npi", "NPI-2", "Fictional Eye Care", street="300 Fictional Rd", zip_code="75604", phone=P3,
      tags={"taxonomy": "Optometrist"}),
    R("npi", "NPI-3", "Fictional Hearing Center", street="600 Sample Ave", zip_code="75602", phone=P3,
      tags={"taxonomy": "Audiologist"}),
    R("npi", "NPI-4", "Fictional Kids Therapy", street="650 Example St", phone=P3,
      tags={"taxonomy": "Speech Therapist"}),
    R("osm", "node/1", "SST Cantina", street="250 Sample Avenue", zip_code=None, phone=P1),
    R("osm", "node/2", "Example Tire & Lube", street="100 Example St", tags={"shop": "tyres"},
      website="https://www.exampletire.example/", lat=32.51, lon=-94.71),
    R("osm", "node/3", "Example Tire & Lube", street="200 Sample Ave", zip_code="75602",
      website="https://www.exampletire.example/south"),
    R("osm", "node/4", "Sample Street Tacos", street="250 Sample Ave", zip_code="75602",
      website="https://www.othertacos.example/"),
    R("osm", "node/5", "Sample Bike Shop", street="800 Sample Ln", zip_code="75605", tags={"shop": "bicycle"}),
    R("osm", "node/6", "Fictional Family Dental", street="4500 Example St", phone=P2),
    R("osm", "node/7", "Sample Smoothie Bar", street="600 Sample Ave", zip_code="75602", phone=P3,
      tags={"amenity": "cafe"}),
    R("osm", "node/8", "Sample Street Tacos Truck", zip_code=None, phone=P1),
]


def town_db(order=None):
    conn = make_db()
    insert_all(conn, order if order is not None else TOWN)
    m.match_pending(conn, now=NOW)
    return conn


def snapshot(conn):
    """Everything matching decided, keyed by source keys and public ids instead of row ids."""
    key_of = {r["id"]: (r["source_id"], r["source_key"])
              for r in conn.execute("SELECT id, source_id, source_key FROM source_records")}
    pid_of = {r["id"]: r["public_id"] for r in conn.execute("SELECT id, public_id FROM businesses")}
    businesses = set()
    for b in conn.execute("SELECT * FROM businesses"):
        members = tuple(sorted(key_of[r["id"]] for r in conn.execute(
            "SELECT id FROM source_records WHERE business_id=?", (b["id"],))))
        businesses.add((
            b["public_id"], b["slug"], b["name"], b["name_norm"], b["street"], b["street_norm"], b["suite"],
            b["zip"], b["lat"], b["lon"], b["scope"], b["naics"], b["category"], b["category_label"],
            b["permit_start"], b["is_individual"], b["website"], b["website_domain"], b["website_source"],
            b["publish_state"], b["publish_reason"], b["active"], members,
        ))
    states = {key_of[r["id"]]: r["match_state"] for r in conn.execute("SELECT id, match_state FROM source_records")}
    merges = {(key_of[r["source_record_id"]], pid_of[r["business_id"]], r["rule"], r["evidence_json"],
               r["explanation"]) for r in conn.execute("SELECT * FROM merges")}
    reviews = {(r["kind"], pid_of.get(r["business_id"]), key_of.get(r["source_record_id"]), r["field"],
                r["proposed_json"], r["current_json"], r["detail"], r["status"])
               for r in conn.execute("SELECT * FROM review_queue")}
    return businesses, states, merges, reviews


class PhoneRules(unittest.TestCase):
    def test_same_phone_same_street_merges(self):
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave", phone=P1)
        add_record(conn, "osm", "node/1", "SST Cantina", street="250 Sample Avenue", phone=P1)
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(counts, {"matched": 1, "created": 1, "review": 0, "ignored": 0})
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)
        merge = conn.execute("SELECT * FROM merges").fetchone()
        self.assertEqual(merge["rule"], "same_phone")
        self.assertEqual(merge["explanation"], f"Joined because both records list {P1} at 250 sample ave.")
        evidence = json.loads(merge["evidence_json"])
        self.assertEqual(evidence["phone"], P1)
        self.assertEqual(evidence["street_norm"], "250 sample ave")
        self.assertEqual(record(conn, "osm", "node/1")["match_state"], "matched")

    def test_same_phone_when_one_side_has_no_street(self):
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave", phone=P1)
        add_record(conn, "osm", "node/8", "Sample Street Tacos Truck", phone=P1)
        m.match_pending(conn, now=NOW)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)
        merge = conn.execute("SELECT * FROM merges").fetchone()
        self.assertEqual(merge["rule"], "same_phone")
        self.assertIn("no street", merge["explanation"])
        # The business keeps its own street; the record had none to offer.
        self.assertEqual(business_of(conn, "osm", "node/8")["street_norm"], "250 sample ave")

    def test_same_phone_different_street_goes_to_review(self):
        conn = make_db()
        add_record(conn, "npi", "N1", "Fictional Family Dental", street="100 Example St", phone=P2)
        osm_id = add_record(conn, "osm", "node/6", "Fictional Family Dental", street="4500 Example St", phone=P2)
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(counts["review"], 1)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)  # no duplicate created
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges"), 0)
        rec = record(conn, "osm", "node/6")
        self.assertEqual(rec["match_state"], "review")
        self.assertIsNone(rec["business_id"])
        item = conn.execute("SELECT * FROM review_queue WHERE kind='merge_ambiguous'").fetchone()
        self.assertEqual(item["source_record_id"], osm_id)
        self.assertEqual(item["business_id"], business_of(conn, "npi", "N1")["id"])
        self.assertEqual(item["status"], "open")
        self.assertTrue(item["detail"].endswith("."))

    def test_phone_conflict_does_not_block_a_clean_address_match(self):
        # A chain's central line at another street must not stop a record joining its own storefront.
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave", phone=P1)
        add_record(conn, "tx_tabc", "T2", "Sample Street Tacos", street="1800 Fictional Rd")
        add_record(conn, "osm", "node/9", "Sample Street Tacos", street="1800 Fictional Rd", phone=P1)
        m.match_pending(conn, now=NOW)
        self.assertEqual(business_of(conn, "osm", "node/9")["id"], business_of(conn, "tx_tabc", "T2")["id"])
        self.assertEqual(conn.execute("SELECT rule FROM merges").fetchone()[0], "same_address_similar_name")

    def test_shared_line_is_never_merged_on(self):
        conn = make_db()
        add_record(conn, "npi", "N2", "Fictional Eye Care", street="300 Fictional Rd", phone=P3)
        add_record(conn, "npi", "N3", "Fictional Hearing Center", street="600 Sample Ave", phone=P3)
        add_record(conn, "npi", "N4", "Fictional Kids Therapy", street="650 Example St", phone=P3)
        add_record(conn, "osm", "node/7", "Example Tire & Lube", street="300 Fictional Rd", phone=P3)
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(counts, {"matched": 0, "created": 4, "review": 0, "ignored": 0})
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges"), 0)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue WHERE kind='merge_ambiguous'"), 0)
        shared = conn.execute("SELECT * FROM review_queue WHERE kind='shared_phone'").fetchall()
        self.assertEqual(len(shared), 1)
        self.assertEqual(json.loads(shared[0]["proposed_json"]), P3)
        self.assertEqual(shared[0]["field"], "phone")
        # Re-running everything still leaves one item for the phone.
        conn.execute("UPDATE source_records SET match_state='new'")
        m.match_pending(conn, now=LATER)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue WHERE kind='shared_phone'"), 1)

    def test_shared_line_found_later_releases_held_records(self):
        conn = make_db()
        add_record(conn, "npi", "N1", "Fictional Eye Care", street="300 Fictional Rd", phone=P4)
        add_record(conn, "npi", "N2", "Fictional Hearing Center", street="600 Sample Ave", phone=P4)
        m.match_pending(conn, now=NOW)
        self.assertEqual(record(conn, "npi", "N2")["match_state"], "review")
        add_record(conn, "npi", "N3", "Fictional Kids Therapy", street="650 Example St", phone=P4)
        m.match_pending(conn, now=LATER)
        self.assertEqual(record(conn, "npi", "N2")["match_state"], "created")
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 3)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue WHERE kind='shared_phone'"), 1)
        statuses = [r[0] for r in conn.execute("SELECT status FROM review_queue WHERE kind='merge_ambiguous'")]
        self.assertEqual(statuses, ["resolved"])


class AddressRules(unittest.TestCase):
    def test_same_address_similar_name_merges(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "EXAMPLE TIRE AND LUBE LLC", street="100 EXAMPLE STREET")
        add_record(conn, "osm", "node/2", "Example Tire & Lube", street="100 Example St")
        m.match_pending(conn, now=NOW)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)
        merge = conn.execute("SELECT * FROM merges").fetchone()
        self.assertEqual(merge["rule"], "same_address_similar_name")
        self.assertIn("100 example st", merge["explanation"])
        self.assertEqual(json.loads(merge["evidence_json"])["similarity"], 1.0)

    def test_two_tenants_at_one_address_stay_separate(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        add_record(conn, "tx_sales_tax", "S2", "Fictional Family Dental", street="100 Example St")
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(counts["created"], 2)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue"), 0)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges"), 0)

    def test_partial_similarity_at_one_address_goes_to_review(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        add_record(conn, "tx_sales_tax", "S2", "Example Muffler Shop", street="100 Example St")
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(counts, {"matched": 0, "created": 1, "review": 1, "ignored": 0})
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)
        item = conn.execute("SELECT * FROM review_queue").fetchone()
        self.assertEqual(item["kind"], "merge_ambiguous")
        self.assertIn("partly similar (0.49)", item["detail"])
        self.assertIsNone(record(conn, "tx_sales_tax", "S2")["business_id"])

    def test_different_suites_are_different_places(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="4500 Sample Ave Ste 4")
        add_record(conn, "tx_sales_tax", "S2", "Example Tire & Lube", street="4500 Sample Ave Ste 5")
        self.assertEqual(m.match_pending(conn, now=NOW)["created"], 2)

    def test_different_zip_is_a_different_place(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St", zip_code="75601")
        add_record(conn, "tx_sales_tax", "S2", "Example Tire & Lube", street="100 Example St", zip_code="75604")
        self.assertEqual(m.match_pending(conn, now=NOW)["created"], 2)

    def test_same_domain_same_address_merges(self):
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave",
                   website="https://www.samplestreettacos.example/")
        add_record(conn, "osm", "node/1", "SST Cantina", street="250 Sample Ave",
                   website="http://samplestreettacos.example/menu")
        m.match_pending(conn, now=NOW)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)
        merge = conn.execute("SELECT * FROM merges").fetchone()
        self.assertEqual(merge["rule"], "same_domain_same_address")
        self.assertEqual(merge["explanation"],
                         "Joined because both records list the website samplestreettacos.example at 250 sample ave.")
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue"), 0)  # same domain is no conflict

    def test_same_domain_different_address_is_a_chain(self):
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave",
                   website="https://www.samplestreettacos.example/")
        add_record(conn, "tx_tabc", "T2", "Sample Street Tacos", street="1800 Fictional Rd",
                   website="https://samplestreettacos.example/")
        m.match_pending(conn, now=NOW)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 2)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges"), 0)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue"), 0)

    def test_chain_name_on_two_streets_is_two_businesses(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        add_record(conn, "tx_sales_tax", "S2", "Example Tire & Lube", street="200 Sample Ave")
        add_record(conn, "osm", "node/3", "Example Tire & Lube", street="200 Sample Ave")
        m.match_pending(conn, now=NOW)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 2)
        self.assertEqual(business_of(conn, "osm", "node/3")["id"], business_of(conn, "tx_sales_tax", "S2")["id"])


class OsmOnly(unittest.TestCase):
    def test_osm_only_business_waits_for_a_primary_source(self):
        conn = make_db()
        add_record(conn, "osm", "node/2", "Example Tire & Lube", street="100 Example St", tags={"shop": "tyres"})
        result = m.match_record(conn, record(conn, "osm", "node/2")["id"], now=NOW)
        self.assertEqual((result.action, result.rule), ("created", "osm_only_needs_primary_source"))
        biz = business_of(conn, "osm", "node/2")
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("review", "osm_only_needs_primary_source"))
        self.assertEqual(biz["category"], "auto")
        public_id, slug = biz["public_id"], biz["slug"]

        add_record(conn, "tx_sales_tax", "S1", "EXAMPLE TIRE AND LUBE LLC", street="100 EXAMPLE STREET",
                   naics="811111", permit_start="2019-03-01")
        m.match_pending(conn, now=LATER)
        biz = business_of(conn, "tx_sales_tax", "S1")
        self.assertEqual(biz["id"], business_of(conn, "osm", "node/2")["id"])
        self.assertEqual(biz["name"], "EXAMPLE TIRE AND LUBE LLC")
        self.assertEqual(biz["name_norm"], "example tire and lube")
        self.assertEqual((biz["publish_state"], biz["publish_reason"]), ("pending", None))
        self.assertEqual((biz["naics"], biz["category"], biz["category_label"]), ("811111", "auto", "Auto repair shop"))
        self.assertEqual(biz["permit_start"], "2019-03-01")
        self.assertEqual((biz["public_id"], biz["slug"]), (public_id, slug))  # identity never moves
        self.assertEqual(biz["updated_at"], LATER)
        merge = conn.execute("SELECT * FROM merges").fetchone()
        self.assertIn("known only from OpenStreetMap", merge["explanation"])
        self.assertIn("sales tax record's name", merge["explanation"])

    def test_confirmation_with_the_same_name_only_clears_the_hold(self):
        conn = make_db()
        add_record(conn, "osm", "node/2", "Sample Bike Shop", street="800 Sample Ln")
        add_record(conn, "tx_sales_tax", "S1", "Sample Bike Shop", street="800 Sample Ln")
        counts = m.match_pending(conn, now=NOW)  # sales tax goes first, so the OSM node joins it
        self.assertEqual((counts["created"], counts["matched"]), (1, 1))
        conn2 = make_db()
        add_record(conn2, "osm", "node/2", "Sample Bike Shop", street="800 Sample Ln")
        m.match_pending(conn2, now=NOW)
        add_record(conn2, "tx_sales_tax", "S1", "Sample Bike Shop", street="800 Sample Ln")
        m.match_pending(conn2, now=LATER)
        explanation = conn2.execute("SELECT explanation FROM merges").fetchone()[0]
        self.assertIn("no longer held for a primary source", explanation)
        self.assertNotIn("now uses", explanation)
        self.assertEqual(business_of(conn2, "tx_sales_tax", "S1")["publish_state"], "pending")

    def test_suppressed_business_links_but_is_never_changed(self):
        conn = make_db()
        add_record(conn, "osm", "node/2", "Example Tire & Lube", street="100 Example St")
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "osm", "node/2")
        conn.execute("UPDATE businesses SET publish_state='suppressed', publish_reason='removal_request'"
                     " WHERE id=?", (biz["id"],))
        add_record(conn, "tx_sales_tax", "S1", "EXAMPLE TIRE AND LUBE LLC", street="100 Example St",
                   naics="811111", website="https://www.exampletire.example/")
        m.match_pending(conn, now=LATER)
        after = business_of(conn, "tx_sales_tax", "S1")
        self.assertEqual(after["id"], biz["id"])  # still linked
        self.assertEqual(after["name"], "Example Tire & Lube")
        self.assertEqual((after["publish_state"], after["publish_reason"]), ("suppressed", "removal_request"))
        self.assertIsNone(after["naics"])
        self.assertIsNone(after["website"])
        self.assertIn("suppressed", conn.execute("SELECT explanation FROM merges").fetchone()[0])

    def test_suppression_list_is_honored_before_publish_runs(self):
        conn = make_db()
        add_record(conn, "osm", "node/2", "Example Tire & Lube", street="100 Example St", zip_code=None)
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "osm", "node/2")
        conn.execute("INSERT INTO suppressions(kind, value, reason, created_at) VALUES ('public_id', ?, 'request', ?)",
                     (biz["public_id"], NOW))
        add_record(conn, "tx_sales_tax", "S1", "EXAMPLE TIRE AND LUBE LLC", street="100 Example St")
        m.match_pending(conn, now=LATER)
        after = business_of(conn, "tx_sales_tax", "S1")
        self.assertEqual(after["id"], biz["id"])
        self.assertEqual((after["name"], after["zip"], after["publish_state"]),
                         ("Example Tire & Lube", None, "review"))


class Enrichment(unittest.TestCase):
    def test_website_conflict_goes_to_review_and_is_not_overwritten(self):
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave",
                   website="https://www.samplestreettacos.example/")
        osm_id = add_record(conn, "osm", "node/4", "Sample Street Tacos", street="250 Sample Ave",
                            website="https://www.othertacos.example/")
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "osm", "node/4")
        self.assertEqual((biz["website"], biz["website_domain"], biz["website_source"]),
                         ("https://www.samplestreettacos.example/", "samplestreettacos.example", "tx_tabc"))
        item = conn.execute("SELECT * FROM review_queue WHERE kind='website_conflict'").fetchone()
        self.assertEqual((item["business_id"], item["source_record_id"], item["field"]), (biz["id"], osm_id, "website"))
        self.assertEqual(json.loads(item["proposed_json"]), "https://www.othertacos.example/")
        self.assertEqual(json.loads(item["current_json"]), "https://www.samplestreettacos.example/")

    def test_website_filled_when_business_has_none(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        add_record(conn, "osm", "node/2", "Example Tire & Lube", street="100 Example St",
                   website="https://www.exampletire.example/?utm_source=osm")
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "tx_sales_tax", "S1")
        self.assertEqual((biz["website"], biz["website_domain"], biz["website_source"]),
                         ("https://www.exampletire.example/", "exampletire.example", "osm"))

    def test_permit_start_keeps_the_earliest(self):
        for order in ((0, 1, 2), (2, 1, 0), (1, 2, 0)):
            with self.subTest(order=order):
                conn = make_db()
                recs = [
                    R("tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St", permit_start="2019-03-01"),
                    R("tx_sales_tax", "S2", "EXAMPLE TIRE AND LUBE LLC", street="100 Example St",
                      permit_start="2015-06-01"),
                    R("tx_sales_tax", "S3", "Example Tire and Lube", street="100 Example St",
                      permit_start="2021-01-01"),
                ]
                insert_all(conn, [recs[i] for i in order])
                m.match_pending(conn, now=NOW)
                self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 1)
                self.assertEqual(business_of(conn, "tx_sales_tax", "S3")["permit_start"], "2015-06-01")

    def test_fill_only_never_overwrites(self):
        conn = make_db()
        add_record(conn, "npi", "N1", "Fictional Family Dental", street="100 Example St", zip_code="75601",
                   lat=32.5, lon=-94.7, tags={"taxonomy": "Dentist"})
        add_record(conn, "osm", "node/2", "Fictional Family Dental", street="100 Example St Ste 9", zip_code=None,
                   lat=40.0, lon=-80.0, tags={"amenity": "restaurant"})
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "npi", "N1")
        self.assertEqual((biz["lat"], biz["lon"], biz["zip"], biz["suite"]), (32.5, -94.7, "75601", None))
        self.assertEqual((biz["category"], biz["category_label"]), ("health-dental", "Dentist office"))

    def test_empty_columns_are_filled(self):
        conn = make_db()
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", phone=P1, zip_code=None)
        add_record(conn, "osm", "node/1", "SST Cantina", street="250 Sample Ave", zip_code="75602", phone=P1,
                   lat=32.49, lon=-94.73, tags={"amenity": "restaurant"})
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "tx_tabc", "T1")
        self.assertEqual((biz["street"], biz["street_norm"], biz["zip"], biz["lat"], biz["lon"]),
                         ("250 Sample Ave", "250 sample ave", "75602", 32.49, -94.73))
        self.assertEqual(biz["category"], "restaurants")
        self.assertEqual(biz["name"], "Sample Street Tacos")  # an OSM name never replaces a primary name

    def test_scope_is_city_when_any_active_primary_is_city(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Sample Street Tacos", street="250 Sample Ave", scope="nearby")
        add_record(conn, "tx_tabc", "T1", "Sample Street Tacos", street="250 Sample Ave", scope="city")
        add_record(conn, "osm", "node/1", "Sample Street Tacos", street="250 Sample Ave", scope="out")
        m.match_pending(conn, now=NOW)
        self.assertEqual(business_of(conn, "tx_sales_tax", "S1")["scope"], "city")
        conn.execute("UPDATE source_records SET active=0 WHERE source_key='T1'")
        self.assertEqual(m.refresh_activity(conn, now=LATER), 1)
        self.assertEqual(business_of(conn, "tx_sales_tax", "S1")["scope"], "nearby")

    def test_npi_taxonomy_sets_the_category(self):
        conn = make_db()
        add_record(conn, "npi", "N1", "Fictional Family Dental", street="100 Example St", tags={"taxonomy": "Dentist"})
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "npi", "N1")
        self.assertEqual((biz["category"], biz["category_label"], biz["naics"]),
                         ("health-dental", "Dentist office", None))

    def test_individual_taxpayer_flag_carries_to_the_business(self):
        conn = make_db()
        add_record(conn, "osm", "node/5", "Sample Lawn Care", street="700 Sample Ln")
        add_record(conn, "tx_sales_tax", "S8", "Sample Lawn Care", street="700 Sample Ln", is_individual=1)
        m.match_pending(conn, now=NOW)
        self.assertEqual(business_of(conn, "osm", "node/5")["is_individual"], 1)


class Identity(unittest.TestCase):
    def test_public_id_is_derived_from_the_first_record_and_stable(self):
        conn = town_db()
        biz = business_of(conn, "tx_sales_tax", "ST-1")
        self.assertEqual(biz["public_id"], expected_public_id("tx_sales_tax", "ST-1"))
        for row in conn.execute("SELECT public_id FROM businesses"):
            self.assertRegex(row[0], r"^lv-[a-z2-7]{10}$")
        before = snapshot(conn)
        merges_before = count(conn, "SELECT COUNT(*) FROM merges")
        # Every record changes upstream and is matched again: nothing about identity moves.
        conn.execute("UPDATE source_records SET match_state='new' WHERE match_state != 'review'")
        m.match_pending(conn, now=LATER)
        after = snapshot(conn)
        self.assertEqual({b[:2] for b in before[0]}, {b[:2] for b in after[0]})
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges"), merges_before)
        # A rebuild from the same records gives the same ids.
        self.assertEqual({b[0] for b in snapshot(town_db())[0]}, {b[0] for b in before[0]})

    def test_existing_link_updates_in_place(self):
        conn = make_db()
        rid = add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        m.match_pending(conn, now=NOW)
        conn.execute("UPDATE source_records SET lat=32.5, lon=-94.7, naics='811111', match_state='new' WHERE id=?",
                     (rid,))
        result = m.match_record(conn, rid, now=LATER)
        self.assertEqual((result.action, result.rule), ("matched", "existing_link"))
        biz = business_of(conn, "tx_sales_tax", "S1")
        self.assertEqual((biz["lat"], biz["naics"], biz["category"]), (32.5, "811111", "auto"))
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges"), 0)
        self.assertEqual(record(conn, "tx_sales_tax", "S1")["match_state"], "matched")

    def test_slug_collisions(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        add_record(conn, "tx_sales_tax", "S2", "Example Tire & Lube", street="200 Sample Ave", zip_code="75602")
        add_record(conn, "tx_sales_tax", "S3", "Example Tire & Lube", street="900 Sample Ave", zip_code="75602")
        m.match_pending(conn, now=NOW)
        self.assertEqual(business_of(conn, "tx_sales_tax", "S1")["slug"], "example-tire-and-lube")
        self.assertEqual(business_of(conn, "tx_sales_tax", "S2")["slug"], "example-tire-and-lube-sample-ave")
        third = business_of(conn, "tx_sales_tax", "S3")
        self.assertEqual(third["slug"], "example-tire-and-lube-" + third["public_id"][-4:])

    def test_reserved_slugs_are_avoided(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "About", street="300 Fictional Rd")
        add_record(conn, "tx_sales_tax", "S2", "STATUS")
        add_record(conn, "tx_sales_tax", "S3", "New", street="12 Sample Trl")
        m.match_pending(conn, now=NOW)
        self.assertEqual(business_of(conn, "tx_sales_tax", "S1")["slug"], "about-fictional-rd")
        status = business_of(conn, "tx_sales_tax", "S2")
        self.assertEqual(status["slug"], "status-" + status["public_id"][-4:])
        self.assertEqual(business_of(conn, "tx_sales_tax", "S3")["slug"], "new-sample-trl")
        for (slug,) in conn.execute("SELECT slug FROM businesses"):
            self.assertNotIn(slug, m.RESERVED_SLUGS)

    def test_assign_identity_never_changes_a_set_identity(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        m.match_pending(conn, now=NOW)
        biz = business_of(conn, "tx_sales_tax", "S1")
        conn.execute("UPDATE businesses SET name='Renamed Example' WHERE id=?", (biz["id"],))
        self.assertEqual(m.assign_identity(conn, biz["id"]), (biz["public_id"], biz["slug"]))


class TownWide(unittest.TestCase):
    def test_town_outcomes(self):
        conn = town_db()
        same = lambda a, b: self.assertEqual(business_of(conn, *a)["id"], business_of(conn, *b)["id"])
        same(("tx_sales_tax", "ST-1"), ("tx_sales_tax", "ST-2"))
        same(("tx_sales_tax", "ST-1"), ("osm", "node/2"))
        same(("tx_sales_tax", "ST-3"), ("osm", "node/3"))
        same(("tx_sales_tax", "ST-5"), ("npi", "NPI-1"))
        same(("tx_tabc", "TABC-1"), ("osm", "node/1"))
        same(("tx_tabc", "TABC-1"), ("osm", "node/4"))
        same(("tx_tabc", "TABC-1"), ("osm", "node/8"))
        self.assertNotEqual(business_of(conn, "tx_tabc", "TABC-1")["id"], business_of(conn, "tx_tabc", "TABC-2")["id"])
        states = {(r["source_id"], r["source_key"]): r["match_state"] for r in conn.execute("SELECT * FROM source_records")}
        self.assertEqual(states[("tx_sales_tax", "ST-6")], "review")
        self.assertEqual(states[("osm", "node/6")], "review")
        self.assertEqual(states[("tx_sales_tax", "ST-10")], "new")  # inactive: never processed
        self.assertEqual(business_of(conn, "tx_sales_tax", "ST-1")["permit_start"], "2015-06-01")
        self.assertEqual(business_of(conn, "tx_sales_tax", "ST-9")["scope"], "nearby")
        self.assertEqual(business_of(conn, "osm", "node/5")["publish_state"], "review")
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue WHERE kind='shared_phone'"), 1)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM review_queue WHERE kind='website_conflict'"), 1)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM merges WHERE rule='same_phone'"), 2)

    def test_every_merge_has_a_plain_explanation(self):
        conn = town_db()
        merges = conn.execute("SELECT * FROM merges").fetchall()
        self.assertGreaterEqual(len(merges), 7)
        for merge in merges:
            with self.subTest(merge=merge["id"]):
                self.assertRegex(merge["explanation"], r"^Joined because .+\.$")
                self.assertIn(merge["rule"], {"same_phone", "same_address_similar_name", "same_domain_same_address",
                                              "reviewed_merge"})
                evidence = json.loads(merge["evidence_json"])
                self.assertIn("source_key", evidence)

    def test_results_do_not_depend_on_insertion_order(self):
        expected = snapshot(town_db())
        for seed in range(6):
            shuffled = list(TOWN)
            random.Random(seed).shuffle(shuffled)
            with self.subTest(seed=seed):
                self.assertEqual(snapshot(town_db(shuffled)), expected)

    def test_private_names_and_phones_stay_out_of_logs_and_tables(self):
        with self.assertLogs("longview_archive.matching", level="DEBUG") as logs:
            conn = town_db()
        text = "\n".join(logs.output)
        for secret in ("555", "+1903", "DOE", "JANE", "Example", "Tacos", "example.", "sample ave"):
            self.assertNotIn(secret, text)
        tables = [
            ("businesses", "name || IFNULL(street,'') || IFNULL(website,'') || IFNULL(publish_reason,'')"),
            ("merges", "evidence_json || explanation"),
            ("review_queue", "IFNULL(detail,'') || IFNULL(proposed_json,'') || IFNULL(current_json,'')"),
        ]
        for table, expr in tables:
            for (value,) in conn.execute(f"SELECT {expr} FROM {table}"):
                self.assertNotIn("DOE", value)
                self.assertNotIn("JANE", value)


class Activity(unittest.TestCase):
    def test_inactive_records_are_skipped(self):
        conn = make_db()
        rid = add_record(conn, "tx_sales_tax", "S1", "Sample Closed Diner", street="999 Example St", active=0)
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(counts, {"matched": 0, "created": 0, "review": 0, "ignored": 0})
        self.assertEqual(record(conn, "tx_sales_tax", "S1")["match_state"], "new")
        self.assertEqual(m.match_record(conn, rid, now=NOW).action, "ignored")
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 0)

    def test_refresh_activity(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        add_record(conn, "osm", "node/2", "Example Tire & Lube", street="100 Example St")
        m.match_pending(conn, now=NOW)
        bid = business_of(conn, "tx_sales_tax", "S1")["id"]
        conn.execute("UPDATE source_records SET active=0")
        self.assertEqual(m.refresh_activity(conn, now=LATER), 1)
        self.assertEqual(conn.execute("SELECT active FROM businesses WHERE id=?", (bid,)).fetchone()[0], 0)
        self.assertEqual(m.refresh_activity(conn, now=LATER), 0)
        conn.execute("UPDATE source_records SET active=1 WHERE source_key='node/2'")
        m.match_pending(conn, now=LATER)  # runs refresh_activity at the end
        self.assertEqual(conn.execute("SELECT active FROM businesses WHERE id=?", (bid,)).fetchone()[0], 1)

    def test_batches_commit_and_counts_add_up(self):
        conn = make_db()
        for i in range(m.BATCH_SIZE + 20):
            add_record(conn, "tx_sales_tax", f"S{i:04d}", f"Sample Shop {i}", street=f"{100 + i} Sample Ave")
        counts = m.match_pending(conn, now=NOW)
        self.assertEqual(sum(counts.values()), m.BATCH_SIZE + 20)
        self.assertFalse(conn.in_transaction)


class ReviewDecisions(unittest.TestCase):
    def held(self):
        conn = make_db()
        add_record(conn, "tx_sales_tax", "S1", "Example Tire & Lube", street="100 Example St")
        rid = add_record(conn, "tx_sales_tax", "S2", "Example Muffler Shop", street="100 Example St")
        m.match_pending(conn, now=NOW)
        return conn, rid

    def test_rejected_candidate_lets_the_record_stand_alone(self):
        conn, rid = self.held()
        conn.execute("UPDATE review_queue SET status='rejected', resolved_by='reviewer' WHERE source_record_id=?", (rid,))
        conn.execute("UPDATE source_records SET match_state='new' WHERE id=?", (rid,))
        self.assertEqual(m.match_pending(conn, now=LATER)["created"], 1)
        self.assertEqual(count(conn, "SELECT COUNT(*) FROM businesses"), 2)

    def test_accepted_candidate_joins(self):
        conn, rid = self.held()
        conn.execute("UPDATE review_queue SET status='accepted', resolved_by='reviewer' WHERE source_record_id=?", (rid,))
        conn.execute("UPDATE source_records SET match_state='new' WHERE id=?", (rid,))
        result = m.match_record(conn, rid, now=LATER)
        self.assertEqual((result.action, result.rule), ("matched", "reviewed_merge"))
        self.assertEqual(result.business_id, business_of(conn, "tx_sales_tax", "S1")["id"])
        self.assertEqual(conn.execute("SELECT explanation FROM merges").fetchone()[0],
                         "Joined because a reviewer accepted this match.")

    def test_question_closes_when_the_record_changes(self):
        conn, rid = self.held()
        conn.execute("UPDATE source_records SET name='Example Tire and Lube', name_norm='example tire and lube',"
                     " match_state='new' WHERE id=?", (rid,))
        self.assertEqual(m.match_pending(conn, now=LATER)["matched"], 1)
        self.assertEqual([r[0] for r in conn.execute("SELECT status FROM review_queue")], ["resolved"])

    def test_same_question_reopens_after_it_was_closed(self):
        conn, rid = self.held()
        conn.execute("UPDATE review_queue SET status='resolved', resolved_by='matching'")
        conn.execute("UPDATE source_records SET match_state='new' WHERE id=?", (rid,))
        m.match_pending(conn, now=LATER)
        self.assertEqual([r[0] for r in conn.execute("SELECT status FROM review_queue")], ["open"])


if __name__ == "__main__":
    unittest.main()

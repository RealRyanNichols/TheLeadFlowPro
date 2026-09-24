import unittest

from longview_archive import db, privacy as p

NOW = "2026-09-24T12:00:00Z"


def make_db():
    conn = db.connect(":memory:")
    db.migrate(conn)
    return conn


def add_business(conn, **kw):
    row = dict(public_id="lv-test000001", slug="example", name="Example Tire & Lube", name_norm="example tire and lube",
               street="1200 W Example Ave", street_norm="1200 w example ave", zip="75601", naics="811111",
               is_individual=0, website_domain=None, first_seen_at=NOW, updated_at=NOW)
    row.update(kw)
    cols = ",".join(row)
    cur = conn.execute(f"INSERT INTO businesses({cols}) VALUES ({','.join('?' * len(row))})", tuple(row.values()))
    return cur.lastrowid


def link(conn, business_id, source_id, key, street_norm="1200 w example ave"):
    conn.execute(
        "INSERT INTO source_records(source_id, source_key, business_id, license, source_url, fetched_at,"
        " first_seen_at, last_seen_at, raw_json, street_norm) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (source_id, key, business_id, "x", "https://data.example/", NOW, NOW, NOW, "{}", street_norm),
    )


def fact(conn, business_id, field, value):
    conn.execute(
        "INSERT INTO facts(business_id, field, value_json, source_id, method, confidence, first_observed_at, checked_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (business_id, field, db.dumps(value), "website", "test", 0.95, NOW, NOW),
    )


class NameRules(unittest.TestCase):
    def test_person_names(self):
        yes = ["SMITH, JOHN A", "John A Smith", "JOHN SMITH", "Mary Jones", "Garcia, Maria"]
        no = ["Smith Family Dentistry", "Example Tire & Lube", "Rosa's Kitchen", "Sample Street Tacos",
              "Dairy Example", "Johnson Plumbing", "Mary's Flowers", "Example", "", "Fictional Family Dental",
              "Longview Example Church", "A B"]
        for name in yes:
            with self.subTest(name=name):
                self.assertTrue(p.looks_like_person_name(name))
        for name in no:
            with self.subTest(name=name):
                self.assertFalse(p.looks_like_person_name(name))

    def test_individual_taxpayer(self):
        self.assertTrue(p.is_individual_taxpayer("SMITH, JOHN A"))
        self.assertTrue(p.is_individual_taxpayer("JOHN ALLEN SMITH"))
        self.assertTrue(p.is_individual_taxpayer("Anything", "Sole Owner"))
        self.assertTrue(p.is_individual_taxpayer("Anything", "Individual"))
        self.assertFalse(p.is_individual_taxpayer("EXAMPLE TIRE & LUBE LLC"))
        self.assertFalse(p.is_individual_taxpayer("SMITH, JOHN", "Texas Limited Liability Company"))
        self.assertFalse(p.is_individual_taxpayer("FIRST EXAMPLE BAPTIST CHURCH"))
        self.assertFalse(p.is_individual_taxpayer("SAMPLE HOLDINGS INC"))
        self.assertFalse(p.is_individual_taxpayer(None))

    def test_outlet_is_personal_name(self):
        self.assertTrue(p.outlet_is_personal_name("JOHN SMITH", "SMITH, JOHN", True))
        self.assertTrue(p.outlet_is_personal_name("SMITH JOHN A", "SMITH, JOHN A", True))
        self.assertFalse(p.outlet_is_personal_name("Johnny's BBQ", "SMITH, JOHN", True))
        self.assertFalse(p.outlet_is_personal_name("Example Lawn Care", "SMITH, JOHN", True))
        self.assertFalse(p.outlet_is_personal_name("JOHN SMITH", "SMITH, JOHN", False))


class EvidenceRules(unittest.TestCase):
    def test_storefront_naics_org(self):
        conn = make_db()
        bid = add_business(conn, naics="722511")  # auto repair (811111) alone no longer counts
        self.assertEqual(p.address_is_public(conn, bid), (True, "storefront_naics"))

    def test_individual_storefront_naics_is_not_enough(self):
        conn = make_db()
        bid = add_business(conn, is_individual=1)
        self.assertEqual(p.address_is_public(conn, bid), (False, "no_storefront_evidence"))

    def test_non_storefront_naics_hidden(self):
        conn = make_db()
        bid = add_business(conn, naics="238220")
        self.assertFalse(p.address_is_public(conn, bid)[0])

    def test_listed_on_own_website(self):
        conn = make_db()
        bid = add_business(conn, naics="238220", is_individual=1)
        fact(conn, bid, "address_listed", True)
        self.assertEqual(p.address_is_public(conn, bid), (True, "listed_on_own_website"))

    def test_address_listed_false_does_not_count(self):
        conn = make_db()
        bid = add_business(conn, naics="238220")
        fact(conn, bid, "address_listed", False)
        self.assertFalse(p.address_is_public(conn, bid)[0])

    def test_linked_premises_same_street_only(self):
        conn = make_db()
        bid = add_business(conn, naics="238220")
        link(conn, bid, "tx_tabc", "L1", street_norm="999 other rd")
        self.assertFalse(p.address_is_public(conn, bid)[0])
        link(conn, bid, "npi", "1234567890")
        self.assertEqual(p.address_is_public(conn, bid), (True, "npi_premises"))

    def test_no_street(self):
        conn = make_db()
        bid = add_business(conn, street=None, street_norm=None)
        self.assertEqual(p.address_is_public(conn, bid), (False, "no_street"))

    def test_presence(self):
        conn = make_db()
        bid = add_business(conn)
        self.assertFalse(p.has_public_presence(conn, bid))
        link(conn, bid, "tx_sales_tax", "1:1")
        self.assertFalse(p.has_public_presence(conn, bid))
        fact(conn, bid, "website", "https://exampletire.example/")
        self.assertTrue(p.has_public_presence(conn, bid))
        other = add_business(conn, public_id="lv-test000002", slug="other")
        link(conn, other, "osm", "node/1")
        self.assertTrue(p.has_public_presence(conn, other))


class ContactRules(unittest.TestCase):
    def test_generic_email(self):
        ok = [("info@exampletire.example", "exampletire.example"), ("Office@ExampleTire.example", "www.exampletire.example"),
              ("frontdesk@mail.exampletire.example", "exampletire.example")]
        bad = [("jane.doe@exampletire.example", "exampletire.example"), ("info@gmail.com", "exampletire.example"),
               ("john@exampletire.example", "exampletire.example"), ("info@other.example", "exampletire.example"),
               ("not-an-email", "exampletire.example"), ("info@exampletire.example", None)]
        for email, domain in ok:
            with self.subTest(email=email):
                self.assertTrue(p.generic_email_ok(email, domain))
        for email, domain in bad:
            with self.subTest(email=email):
                self.assertFalse(p.generic_email_ok(email, domain))


class SuppressionRules(unittest.TestCase):
    def test_each_kind(self):
        for kind, value, setup in (
            ("public_id", "lv-test000001", None),
            ("domain", "exampletire.example", None),
            ("phone", "+19035550100", "phone"),
            ("name_zip", "example tire and lube|75601", None),
        ):
            with self.subTest(kind=kind):
                conn = make_db()
                bid = add_business(conn, website_domain="www.exampletire.example")
                if setup:
                    fact(conn, bid, "phone", "+19035550100")
                business = conn.execute("SELECT * FROM businesses WHERE id=?", (bid,)).fetchone()
                self.assertFalse(p.is_suppressed(conn, business))
                conn.execute("INSERT INTO suppressions(kind, value, reason, created_at) VALUES (?,?,?,?)",
                             (kind, value, "owner request", NOW))
                self.assertTrue(p.is_suppressed(conn, business))


if __name__ == "__main__":
    unittest.main()

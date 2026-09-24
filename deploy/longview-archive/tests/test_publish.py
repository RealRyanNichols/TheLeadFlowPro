import csv
import json
import os
import re
import stat
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from longview_archive import config, db, exports, facts, normalize, privacy, publish
from longview_archive.categories import CATEGORIES
from tests.fixtures import builders as b

NOW = datetime(2026, 9, 24, 18, 0, 7, tzinfo=timezone.utc)
PLANTED = "ZEPHYRINE QUILLFEATHER-SAMPLETON"
SITE = "https://www.exampletire.example/"

# Mirrors lib/longviewDirectory/types.ts and the checks in validate.ts.
TOP_KEYS = ["schemaVersion", "generatedAt", "batchId", "sample", "indexable", "scope", "counts",
            "sources", "categories", "businesses"]
BUSINESS_KEYS = ["id", "slug", "name", "category", "categoryLabel", "address", "permitSince", "website",
                 "phone", "email", "hours", "social", "careersUrl", "hiringRoles", "services", "facts",
                 "updatedAt", "indexable"]
FACT_FIELDS = ["name", "address", "category", "permitSince", "website", "phone", "email", "hours",
               "facebook", "instagram", "careers", "services"]
FACT_SOURCES = {"tx_sales_tax", "tx_tabc", "npi", "website"}
WEBSITE_ONLY = {"website", "phone", "email", "hours", "facebook", "instagram", "careers", "services"}
HIRING_ROLES = ["front_desk", "office_manager", "medical_assistant", "dental_assistant", "receptionist"]
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
TIME_OPEN = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d")
TIME_CLOSE = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d|24:00")
E164 = re.compile(r"\+1[2-9]\d{2}[2-9]\d{6}")


def settings(tmp=None, **kw):
    return config.Settings(data_dir=Path(tmp or tempfile.gettempdir()) / "lva-test", **kw)


def build_world(conn):
    """Fictional fixture rows, one per rule under test. Returns name -> business id."""
    b.standard_sources(conn)
    ids = {}

    # A full profile: an organization mapped as a tire shop at its own street (storefront
    # evidence; auto repair alone is not), and a verified website with every field.
    ids["tire"] = t = b.add_business(conn, "Example Tire & Lube")
    b.add_record(conn, t, "tx_sales_tax", raw={"taxpayer_name": PLANTED, "outlet_name": "EXAMPLE TIRE & LUBE"})
    b.add_record(conn, t, "osm", key="node/9001", tags_json='{"shop": "tyres", "name": "Example Tire & Lube"}')
    b.add_site(conn, t, SITE)
    b.add_fact(conn, t, "phone", "+19035550100", source_url=SITE + "contact")
    b.add_fact(conn, t, "email", "info@exampletire.example", source_url=SITE + "contact")
    b.add_fact(conn, t, "hours", {"mon": [["08:00", "17:30"]], "sun": []}, source_url=SITE + "contact")
    b.add_fact(conn, t, "facebook", "https://www.facebook.com/exampletire", source_url=SITE)
    b.add_fact(conn, t, "careers", SITE + "careers", source_url=SITE)
    b.add_fact(conn, t, "services", ["brake repair", "oil change"], source_url=SITE + "services")
    b.add_hiring(conn, t, SITE + "careers", ["front_desk", "janitor", "front_desk"])

    # A sole proprietor listed under his own surname, with no public presence.
    ids["solo"] = s = b.add_business(conn, "Quillfeather", naics="238990", is_individual=1,
                                     street="45 Placeholder Ln", zip="75604")
    b.add_record(conn, s, "tx_sales_tax", raw={"taxpayer_name": "QUILLFEATHER, DALE"}, personal_name=1)
    # The same kind of listing, but it has its own website.
    ids["solo_site"] = s2 = b.add_business(conn, "Brambleworth", naics="238990", is_individual=1,
                                           street="46 Placeholder Ln", zip="75604")
    b.add_record(conn, s2, "tx_sales_tax", raw={"taxpayer_name": "BRAMBLEWORTH, DALE"}, personal_name=1)
    b.add_site(conn, s2, "https://brambleworth.example/")

    # No storefront evidence: the address is "Longview, TX" only.
    ids["office"] = o = b.add_business(conn, "Example Bookkeeping Office", naics="541211",
                                       street="300 Sample Ave Ste 2", zip="75605")
    b.add_record(conn, o, "tx_sales_tax")
    # The site lists the street: shown, and credited to the website.
    ids["listed"] = li = b.add_business(conn, "Example Consulting Group", naics="541611",
                                        street="18 Fixture Rd", zip="75602")
    b.add_record(conn, li, "tx_sales_tax")
    b.add_site(conn, li, "https://consulting.example/")
    b.add_fact(conn, li, "address_listed", True, source_url="https://consulting.example/contact")

    # Emails that are not a generic inbox on the site's own domain.
    ids["mail_personal"] = m1 = b.add_business(conn, "Sample Street Tacos", naics="722511", street="9 Sample St")
    b.add_record(conn, m1, "tx_sales_tax")
    b.add_site(conn, m1, "https://www.samplestreettacos.example/")
    b.add_fact(conn, m1, "email", "dale@samplestreettacos.example")
    ids["mail_offsite"] = m2 = b.add_business(conn, "Example Auto Glass", naics="811122", street="250 Sample Ave")
    b.add_record(conn, m2, "tx_sales_tax")
    b.add_site(conn, m2, "https://www.exampleautoglass.example/")
    b.add_fact(conn, m2, "email", "info@another-host.example")

    # A dental office known from NPI and OSM, both with a phone, and no website.
    ids["dental"] = d = b.add_business(conn, "Fictional Family Dental", naics="621210",
                                       street="401 Fixture Rd Ste 2", zip="75601", permit_start=None)
    b.add_record(conn, d, "npi", key="npi-1999999999", phone="+19035550104",
                 source_url="https://npiregistry.example/sample/1999999999")
    b.add_record(conn, d, "osm", key="node/1", phone="+19035550104")
    b.add_fact(conn, d, "phone", "+19035550104", source_id="npi")

    # Removal requests by id, domain, phone, and name + ZIP.
    for key, name in (("sup_id", "Example Pawn"), ("sup_domain", "Example Vape"),
                      ("sup_phone", "Example Nails"), ("sup_namezip", "Example Donuts")):
        ids[key] = x = b.add_business(conn, name, naics="453310", street=f"{len(ids)} Example St")
        b.add_record(conn, x, "tx_sales_tax")
    b.add_suppression(conn, "public_id", conn.execute(
        "SELECT public_id FROM businesses WHERE id=?", (ids["sup_id"],)).fetchone()[0])
    b.add_site(conn, ids["sup_domain"], "https://www.examplevape.example/")
    b.add_suppression(conn, "domain", "examplevape.example")
    b.add_site(conn, ids["sup_phone"], "https://examplenails.example/")
    b.add_fact(conn, ids["sup_phone"], "phone", "+19035550150")
    b.add_suppression(conn, "phone", "+19035550150")
    b.add_suppression(conn, "name_zip", privacy.name_zip_key("Example Donuts", "75601"))

    # OSM only: found on the map, no public record yet.
    ids["osm_only"] = x = b.add_business(conn, "Example Coffee Cart", naics=None, category="restaurants")
    b.add_record(conn, x, "osm", key="node/2")
    # Out of scope and inactive.
    ids["nearby"] = x = b.add_business(conn, "Example Feed Store", naics="444240", scope="nearby", zip="75647")
    b.add_record(conn, x, "tx_sales_tax", scope="nearby")
    ids["closed"] = x = b.add_business(conn, "Example Video Rental", naics="532282", active=0)
    b.add_record(conn, x, "tx_sales_tax", active=0)
    return ids


def export_by_id(export):
    return {x["id"]: x for x in export["businesses"]}


def public_id(conn, bid):
    return conn.execute("SELECT public_id FROM businesses WHERE id=?", (bid,)).fetchone()[0]


class ContractAssertions(unittest.TestCase):
    def assert_contract(self, export):
        """Every key and type in lib/longviewDirectory/types.ts, plus validate.ts rules."""
        self.assertEqual(list(export), TOP_KEYS)
        self.assertEqual(export["schemaVersion"], 1)
        self.assertRegex(export["generatedAt"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
        self.assertEqual(export["batchId"], export["generatedAt"][:16] + "Z")
        self.assertIs(export["sample"], False)
        self.assertIsInstance(export["indexable"], bool)
        self.assertEqual(export["scope"], config.SCOPE_LABEL)
        self.assertEqual(list(export["counts"]), ["published", "inArchive", "heldForPrivacy", "needsReview"])
        for value in export["counts"].values():
            self.assertIs(type(value), int)
            self.assertGreaterEqual(value, 0)
        self.assertEqual(export["counts"]["published"], len(export["businesses"]))
        for source in export["sources"]:
            self.assertEqual(list(source), ["id", "name", "publisher", "license", "url", "lastSyncedAt"])
            for key in ("id", "name", "publisher", "license"):
                self.assertIsInstance(source[key], str)
                self.assertTrue(source[key].strip())
            self.assertTrue(source["url"] is None or publish.http_url(source["url"]))
            self.assertTrue(source["lastSyncedAt"] is None or DATE.fullmatch(source["lastSyncedAt"]))
        order = [slug for slug, _ in CATEGORIES]
        for cat in export["categories"]:
            self.assertEqual(list(cat), ["slug", "name", "count"])
            self.assertIn(cat["slug"], order)
            self.assertGreater(cat["count"], 0)
        self.assertEqual([c["slug"] for c in export["categories"]],
                         sorted((c["slug"] for c in export["categories"]), key=order.index))
        slugs = [x["slug"] for x in export["businesses"]]
        self.assertEqual(slugs, sorted(slugs))
        self.assertEqual(len(set(slugs)), len(slugs))
        for biz in export["businesses"]:
            with self.subTest(business=biz["id"]):
                self.assert_business(biz, export["indexable"])

    def assert_business(self, x, global_indexable):
        self.assertEqual(list(x), BUSINESS_KEYS)
        self.assertRegex(x["id"], r"^lv-[a-z0-9]{4,40}$")
        self.assertRegex(x["slug"], r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
        self.assertIsInstance(x["name"], str)
        self.assertIn(x["category"], [slug for slug, _ in CATEGORIES])
        self.assertTrue(x["categoryLabel"] is None or isinstance(x["categoryLabel"], str))
        address = x["address"]
        self.assertEqual(list(address), ["street", "city", "state", "zip"])
        self.assertEqual((address["city"], address["state"]), ("Longview", "TX"))
        self.assertEqual(address["street"] is None, address["zip"] is None)
        if address["zip"] is not None:
            self.assertRegex(address["zip"], r"^\d{5}$")
            self.assertIsInstance(address["street"], str)
        self.assertTrue(x["permitSince"] is None or DATE.fullmatch(x["permitSince"]))
        if x["website"] is not None:
            self.assertEqual(list(x["website"]), ["url", "status"])
            self.assertTrue(publish.http_url(x["website"]["url"]))
            self.assertIn(x["website"]["status"], ("ok", "moved", "dead", "blocked"))
        if x["phone"] is not None:
            self.assertEqual(list(x["phone"]), ["e164", "display"])
            self.assertRegex(x["phone"]["e164"], E164)
            self.assertEqual(x["phone"]["display"], normalize.display_phone(x["phone"]["e164"]))
        if x["email"] is not None:
            self.assertIsNotNone(x["website"])
            self.assertTrue(privacy.generic_email_ok(x["email"], x["website"]["url"]))
        if x["hours"] is not None:
            self.assertIsInstance(x["hours"], dict)
            self.assertTrue(x["hours"])
            for day, ranges in x["hours"].items():
                self.assertIn(day, ("mon", "tue", "wed", "thu", "fri", "sat", "sun"))
                for opens, closes in ranges:
                    self.assertRegex(opens, TIME_OPEN)
                    self.assertRegex(closes, TIME_CLOSE)
        self.assertEqual(list(x["social"]), ["facebook", "instagram"])
        if x["social"]["facebook"]:
            self.assertRegex(x["social"]["facebook"], r"^https?://([a-z0-9-]+\.)*facebook\.com/")
        if x["social"]["instagram"]:
            self.assertRegex(x["social"]["instagram"], r"^https?://([a-z0-9-]+\.)*instagram\.com/")
        self.assertTrue(x["careersUrl"] is None or publish.http_url(x["careersUrl"]))
        self.assertIsInstance(x["hiringRoles"], list)
        self.assertTrue(set(x["hiringRoles"]) <= set(HIRING_ROLES))
        self.assertEqual(len(set(x["hiringRoles"])), len(x["hiringRoles"]))
        if x["hiringRoles"]:
            self.assertIsNotNone(x["careersUrl"])
        self.assertIsInstance(x["services"], list)
        for tag in x["services"]:
            self.assertIsInstance(tag, str)
            self.assertLessEqual(len(tag), 60)
        fields = []
        for fact in x["facts"]:
            self.assertEqual(list(fact), ["field", "source", "url", "checkedAt"])
            self.assertIn(fact["field"], FACT_FIELDS)
            self.assertIn(fact["source"], FACT_SOURCES)
            self.assertTrue(fact["url"] is None or publish.http_url(fact["url"]))
            self.assertRegex(fact["checkedAt"], DATE)
            if fact["field"] in WEBSITE_ONLY:
                self.assertEqual(fact["source"], "website")
            if fact["field"] == "permitSince":
                self.assertEqual(fact["source"], "tx_sales_tax")
            if fact["source"] == "website":
                self.assertIsNotNone(x["website"])
            fields.append(fact["field"])
        self.assertEqual(fields, [f for f in FACT_FIELDS if f in fields])  # one each, in order
        shown = ["name", "category"]
        shown += ["address"] if address["street"] else []
        shown += ["permitSince"] if x["permitSince"] else []
        shown += ["website"] if x["website"] else []
        shown += ["phone"] if x["phone"] else []
        shown += ["email"] if x["email"] else []
        shown += ["hours"] if x["hours"] else []
        shown += ["facebook"] if x["social"]["facebook"] else []
        shown += ["instagram"] if x["social"]["instagram"] else []
        shown += ["careers"] if x["careersUrl"] else []
        shown += ["services"] if x["services"] else []
        self.assertEqual(sorted(fields), sorted(shown))
        self.assertEqual(x["updatedAt"], max(f["checkedAt"] for f in x["facts"]))
        self.assertIs(x["indexable"], global_indexable and any(f["source"] == "website" for f in x["facts"]))


class ExportContract(ContractAssertions):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings = settings(self.tmp.name)
        self.conn = b.make_db()
        self.ids = build_world(self.conn)
        self.counts = publish.evaluate(self.conn, self.settings, NOW)
        self.export = publish.build_export(self.conn, self.settings, NOW)
        self.by_id = export_by_id(self.export)

    def pid(self, key):
        return public_id(self.conn, self.ids[key])

    def test_contract_shape(self):
        self.assert_contract(self.export)
        self.assertEqual(self.export["generatedAt"], "2026-09-24T18:00:07Z")
        self.assertEqual(self.export["batchId"], "2026-09-24T18:00Z")

    def test_full_profile_field_by_field(self):
        data = "https://data.texas.example/d/sample-permits"
        self.assertEqual(self.by_id[self.pid("tire")], {
            "id": self.pid("tire"),
            "slug": "example-tire-and-lube",
            "name": "Example Tire & Lube",
            "category": "auto",
            "categoryLabel": "Auto repair shop",
            "address": {"street": "1200 W Example Ave", "city": "Longview", "state": "TX", "zip": "75601"},
            "permitSince": "2019-03-01",
            "website": {"url": SITE, "status": "ok"},
            "phone": {"e164": "+19035550100", "display": "(903) 555-0100"},
            "email": "info@exampletire.example",
            "hours": {"mon": [["08:00", "17:30"]], "sun": []},
            "social": {"facebook": "https://www.facebook.com/exampletire", "instagram": None},
            "careersUrl": SITE + "careers",
            "hiringRoles": ["front_desk"],
            "services": ["brake repair", "oil change"],
            "facts": [
                {"field": "name", "source": "tx_sales_tax", "url": data, "checkedAt": "2026-09-24"},
                {"field": "address", "source": "tx_sales_tax", "url": data, "checkedAt": "2026-09-24"},
                {"field": "category", "source": "tx_sales_tax", "url": data, "checkedAt": "2026-09-24"},
                {"field": "permitSince", "source": "tx_sales_tax", "url": data, "checkedAt": "2026-09-24"},
                {"field": "website", "source": "website", "url": SITE, "checkedAt": "2026-09-22"},
                {"field": "phone", "source": "website", "url": SITE + "contact", "checkedAt": "2026-09-22"},
                {"field": "email", "source": "website", "url": SITE + "contact", "checkedAt": "2026-09-22"},
                {"field": "hours", "source": "website", "url": SITE + "contact", "checkedAt": "2026-09-22"},
                {"field": "facebook", "source": "website", "url": SITE, "checkedAt": "2026-09-22"},
                {"field": "careers", "source": "website", "url": SITE, "checkedAt": "2026-09-22"},
                {"field": "services", "source": "website", "url": SITE + "services", "checkedAt": "2026-09-22"},
            ],
            "updatedAt": "2026-09-24",
            "indexable": False,
        })

    def test_personal_name_without_presence_is_held_and_absent(self):
        self.assertEqual(b.state(self.conn, self.ids["solo"]), ("held", "personal_name_no_presence"))
        self.assertNotIn(self.pid("solo"), self.by_id)
        self.assertNotIn("Quillfeather", json.dumps(self.export))
        self.assertEqual(self.export["counts"]["heldForPrivacy"], 1)

    def test_personal_name_with_own_website_is_published(self):
        self.assertEqual(b.state(self.conn, self.ids["solo_site"]), ("ready", None))
        self.assertEqual(self.by_id[self.pid("solo_site")]["name"], "Brambleworth")
        # Individual taxpayer and a non-storefront trade: no street.
        self.assertEqual(self.by_id[self.pid("solo_site")]["address"],
                         {"street": None, "city": "Longview", "state": "TX", "zip": None})

    def test_no_storefront_evidence_hides_street_and_zip(self):
        office = self.by_id[self.pid("office")]
        self.assertEqual(office["address"], {"street": None, "city": "Longview", "state": "TX", "zip": None})
        self.assertNotIn("address", [f["field"] for f in office["facts"]])
        self.assertNotIn("300 Sample Ave", json.dumps(self.export))

    def test_mapped_storefront_at_the_same_street_shows_street(self):
        self.assertEqual(self.by_id[self.pid("tire")]["address"]["street"], "1200 W Example Ave")

    def test_address_listed_on_own_site_is_credited_to_the_website(self):
        listed = self.by_id[self.pid("listed")]
        self.assertEqual(listed["address"], {"street": "18 Fixture Rd", "city": "Longview", "state": "TX",
                                             "zip": "75602"})
        fact = [f for f in listed["facts"] if f["field"] == "address"][0]
        self.assertEqual(fact, {"field": "address", "source": "website",
                                "url": "https://consulting.example/contact", "checkedAt": "2026-09-22"})

    def test_emails_off_the_rules_are_dropped(self):
        for key in ("mail_personal", "mail_offsite"):
            biz = self.by_id[self.pid(key)]
            self.assertIsNone(biz["email"])
            self.assertNotIn("email", [f["field"] for f in biz["facts"]])
        text = json.dumps(self.export)
        self.assertNotIn("dale@", text)
        self.assertNotIn("another-host.example", text)

    def test_phone_from_records_is_never_exported(self):
        dental = self.by_id[self.pid("dental")]
        self.assertIsNone(dental["phone"])
        self.assertIsNone(dental["website"])
        self.assertNotIn("+19035550104", json.dumps(self.export))
        # Named and located by its NPI record; no sales-tax permit date.
        self.assertEqual([(f["field"], f["source"]) for f in dental["facts"]],
                         [("name", "npi"), ("address", "npi"), ("category", "npi")])
        self.assertEqual(dental["facts"][0]["url"], "https://npiregistry.example/sample/1999999999")
        self.assertIsNone(dental["permitSince"])
        self.assertEqual(dental["address"]["street"], "401 Fixture Rd Ste 2")

    def test_suppressed_by_id_domain_phone_and_name_zip(self):
        for key in ("sup_id", "sup_domain", "sup_phone", "sup_namezip"):
            with self.subTest(key=key):
                self.assertEqual(b.state(self.conn, self.ids[key])[0], "suppressed")
                self.assertNotIn(self.pid(key), self.by_id)
        text = json.dumps(self.export)
        for name in ("Example Pawn", "Example Vape", "Example Nails", "Example Donuts"):
            self.assertNotIn(name, text)

    def test_osm_only_out_of_scope_and_inactive(self):
        self.assertEqual(b.state(self.conn, self.ids["osm_only"]), ("review", "osm_only_needs_primary_source"))
        self.assertEqual(b.state(self.conn, self.ids["nearby"]), ("held", "out_of_scope"))
        self.assertEqual(b.state(self.conn, self.ids["closed"]), ("held", "inactive"))
        for key in ("osm_only", "nearby", "closed"):
            self.assertNotIn(self.pid(key), self.by_id)

    def test_counts(self):
        states = self.conn.execute("SELECT publish_state, COUNT(*) FROM businesses GROUP BY 1").fetchall()
        self.assertEqual(dict((r[0], r[1]) for r in states),
                         {"ready": 7, "held": 3, "suppressed": 4, "review": 1})
        self.assertEqual(self.counts["ready"], 7)
        self.assertEqual(self.export["counts"], {
            "published": 7,
            "inArchive": 13,  # active, city scope: 15 fixtures minus nearby and closed
            "heldForPrivacy": 1,
            "needsReview": 1,
        })

    def test_taxpayer_name_never_appears(self):
        text = json.dumps(self.export, ensure_ascii=False)
        for needle in (PLANTED, "QUILLFEATHER", "BRAMBLEWORTH, DALE", "taxpayer", "raw_json"):
            self.assertNotIn(needle, text)

    def test_categories_and_sources(self):
        self.assertEqual(self.export["categories"], [
            {"slug": "restaurants", "name": "Restaurants & Food", "count": 1},
            {"slug": "auto", "name": "Auto", "count": 2},
            {"slug": "health-dental", "name": "Health & Dental", "count": 1},
            {"slug": "home-services", "name": "Home Services", "count": 1},
            {"slug": "professional", "name": "Professional Services", "count": 2},
        ])
        self.assertEqual(self.export["sources"], [
            {"id": "tx_sales_tax", "name": "Active Sales Tax Permit Holders",
             "publisher": "Texas Comptroller of Public Accounts",
             "license": "See dataset license on data.texas.gov",
             "url": "https://data.texas.example/d/sample-permits", "lastSyncedAt": "2026-09-24"},
            {"id": "npi", "name": "NPPES NPI Registry", "publisher": "Centers for Medicare & Medicaid Services",
             "license": "U.S. government public data", "url": "https://npiregistry.cms.hhs.gov/",
             "lastSyncedAt": "2026-09-22"},
        ])

    def test_deterministic(self):
        again = publish.build_export(self.conn, self.settings, NOW)
        self.assertEqual(json.dumps(self.export, sort_keys=True), json.dumps(again, sort_keys=True))
        publish.evaluate(self.conn, self.settings, NOW)
        third = publish.build_export(self.conn, self.settings, NOW)
        self.assertEqual(json.dumps(self.export, sort_keys=True), json.dumps(third, sort_keys=True))


class PublishRules(ContractAssertions):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings = settings(self.tmp.name)
        self.conn = b.make_db()
        b.standard_sources(self.conn)

    def business(self, name="Example Tire & Lube", **kw):
        bid = b.add_business(self.conn, name, **kw)
        b.add_record(self.conn, bid, "tx_sales_tax")
        return bid

    def export(self, s=None):
        publish.evaluate(self.conn, s or self.settings, NOW)
        data = publish.build_export(self.conn, s or self.settings, NOW)
        self.assert_contract(data)
        return data

    def test_indexable_rule(self):
        with_site = self.business()
        b.add_site(self.conn, with_site, SITE)
        without = self.business("Example Bookkeeping Office", naics="541211", street="300 Sample Ave")
        data = self.export(settings(self.tmp.name, indexable=True))
        self.assertIs(data["indexable"], True)
        by_id = export_by_id(data)
        self.assertIs(by_id[public_id(self.conn, with_site)]["indexable"], True)
        self.assertIs(by_id[public_id(self.conn, without)]["indexable"], False)
        off = export_by_id(self.export())
        self.assertIs(off[public_id(self.conn, with_site)]["indexable"], False)

    def test_dead_website_hides_everything_read_from_it(self):
        bid = self.business("Example Consulting Group", naics="541611", street="18 Fixture Rd")
        b.add_site(self.conn, bid, "https://consulting.example/", status="dead")
        b.add_fact(self.conn, bid, "phone", "+19035550120")
        b.add_fact(self.conn, bid, "address_listed", True)
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertIsNone(biz["website"])
        self.assertIsNone(biz["phone"])
        self.assertIsNone(biz["address"]["street"])
        self.assertEqual({f["source"] for f in biz["facts"]}, {"tx_sales_tax"})

    def test_listed_address_falls_back_to_other_evidence_when_site_hidden(self):
        bid = self.business("Example Diner", naics="541611", street="100 Example St")
        b.add_record(self.conn, bid, "tx_tabc", key="tabc-1")
        b.add_site(self.conn, bid, "https://examplediner.example/", status="blocked")
        b.add_fact(self.conn, bid, "address_listed", True)
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual(biz["address"]["street"], "100 Example St")
        fact = [f for f in biz["facts"] if f["field"] == "address"][0]
        self.assertEqual((fact["source"], fact["url"]), ("tx_tabc", b.TABC_URL))

    def test_website_fact_from_another_source_is_not_shown(self):
        bid = self.business()
        b.add_site(self.conn, bid, SITE)
        b.add_fact(self.conn, bid, "website", SITE, source_id="osm")
        self.assertIsNone(export_by_id(self.export())[public_id(self.conn, bid)]["website"])

    def test_moved_website_is_shown_with_its_status(self):
        bid = self.business()
        b.add_site(self.conn, bid, SITE, status="moved")
        self.assertEqual(export_by_id(self.export())[public_id(self.conn, bid)]["website"],
                         {"url": SITE, "status": "moved"})

    def test_hiring_roles_need_a_careers_page(self):
        bid = self.business()
        b.add_site(self.conn, bid, SITE)
        b.add_hiring(self.conn, bid, SITE + "careers", ["receptionist", "front_desk"])
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual((biz["careersUrl"], biz["hiringRoles"]), (None, []))
        b.add_fact(self.conn, bid, "careers", SITE + "careers")
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual(biz["hiringRoles"], ["front_desk", "receptionist"])

    def test_careers_url_needs_an_active_hiring_signal(self):
        # The careers link disappeared: a complete visit set the signal inactive, but the
        # careers fact stays (fill only). No careersUrl, no Hiring badge, no roles.
        bid = self.business()
        b.add_site(self.conn, bid, SITE)
        b.add_fact(self.conn, bid, "careers", SITE + "careers")
        b.add_hiring(self.conn, bid, SITE + "careers", ["front_desk"], active=0)
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual((biz["careersUrl"], biz["hiringRoles"]), (None, []))
        self.assertNotIn("careers", [f["field"] for f in biz["facts"]])
        # No signal at all: same.
        self.conn.execute("DELETE FROM hiring_signals WHERE business_id=?", (bid,))
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual((biz["careersUrl"], biz["hiringRoles"]), (None, []))
        # Found again on a later visit: shown again.
        b.add_hiring(self.conn, bid, SITE + "careers", ["front_desk"])
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual((biz["careersUrl"], biz["hiringRoles"]), (SITE + "careers", ["front_desk"]))

    def test_careers_url_needs_the_signal_for_the_same_page(self):
        # The active signal points at a different careers page (a conflict waiting for
        # review): neither the old URL nor the other page's roles are shown.
        bid = self.business()
        b.add_site(self.conn, bid, SITE)
        b.add_fact(self.conn, bid, "careers", SITE + "careers")
        b.add_hiring(self.conn, bid, "https://exampletire.applytojob.example/jobs", ["receptionist"])
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual((biz["careersUrl"], biz["hiringRoles"]), (None, []))
        # The signal's raw link and the fact's normalized URL still compare equal.
        b.add_hiring(self.conn, bid, "HTTPS://WWW.EXAMPLETIRE.EXAMPLE/careers?utm_source=nav", ["receptionist"])
        biz = export_by_id(self.export())[public_id(self.conn, bid)]
        self.assertEqual((biz["careersUrl"], biz["hiringRoles"]), (SITE + "careers", ["receptionist"]))

    def test_bad_hours_are_dropped(self):
        bid = self.business()
        b.add_site(self.conn, bid, SITE)
        b.add_fact(self.conn, bid, "hours", {"mon": [["8:00", "5:00"]]})
        self.assertIsNone(export_by_id(self.export())[public_id(self.conn, bid)]["hours"])

    def test_checked_at_is_a_chicago_date(self):
        bid = self.business()
        self.conn.execute("UPDATE source_records SET last_seen_at='2026-09-25T03:30:00Z'")
        facts_ = export_by_id(self.export())[public_id(self.conn, bid)]["facts"]
        self.assertEqual({f["checkedAt"] for f in facts_}, {"2026-09-24"})
        self.assertEqual(publish.local_date("2026-01-15T05:59:00Z"), "2026-01-14")  # CST
        self.assertEqual(publish.local_date("2026-07-15T04:59:00Z"), "2026-07-14")  # CDT

    def test_person_name_check_waits_for_a_person(self):
        bid = self.business("Dale Fictional", naics="541211")
        self.assertEqual(self.export()["businesses"], [])
        self.assertEqual(b.state(self.conn, bid), ("review", "person_name_check"))
        item = self.conn.execute(
            "SELECT id FROM review_queue WHERE business_id=? AND kind='person_name_check'", (bid,)).fetchone()
        facts.accept_review(self.conn, item["id"], "owner")
        self.assertEqual(len(self.export()["businesses"]), 1)
        other = self.business("Dana Sample", naics="541211", street="2 Example St")
        publish.evaluate(self.conn, self.settings, NOW)
        item = self.conn.execute(
            "SELECT id FROM review_queue WHERE business_id=? AND kind='person_name_check'", (other,)).fetchone()
        facts.reject_review(self.conn, item["id"], "owner")
        publish.evaluate(self.conn, self.settings, NOW)
        self.assertEqual(b.state(self.conn, other), ("held", "person_name_rejected"))

    def test_open_merge_review_holds_the_business(self):
        bid = self.business()
        rid = db.add_review(self.conn, kind="merge_ambiguous", business_id=bid, detail="same phone")
        self.export()
        self.assertEqual(b.state(self.conn, bid), ("review", "open_merge_review"))
        facts.accept_review(self.conn, rid, "owner")
        self.export()
        self.assertEqual(b.state(self.conn, bid), ("ready", None))

    def test_manual_reason_is_never_changed(self):
        bid = self.business()
        self.conn.execute(
            "UPDATE businesses SET publish_state='held', publish_reason='manual: owner hold' WHERE id=?", (bid,))
        data = self.export()
        self.assertEqual(b.state(self.conn, bid), ("held", "manual: owner hold"))
        self.assertEqual(data["businesses"], [])

    def test_suppression_after_evaluate_is_still_honored(self):
        bid = self.business()
        publish.evaluate(self.conn, self.settings, NOW)
        b.add_suppression(self.conn, "public_id", public_id(self.conn, bid))
        self.assertEqual(publish.build_export(self.conn, self.settings, NOW)["businesses"], [])


class WriteAndDiff(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings = settings(self.tmp.name)
        self.conn = b.make_db()
        build_world(self.conn)
        publish.evaluate(self.conn, self.settings, NOW)
        self.data = publish.build_export(self.conn, self.settings, NOW)

    def test_write_export_is_atomic_and_readable(self):
        path = Path(self.tmp.name) / "publish" / "directory.json"
        old_umask = os.umask(0o077)
        try:
            publish.write_export(path, self.data)
        finally:
            os.umask(old_umask)
        text = path.read_text(encoding="utf-8")
        self.assertEqual(text, json.dumps(self.data, indent=2, ensure_ascii=False) + "\n")
        self.assertTrue(text.startswith('{\n  "schemaVersion": 1,\n  "generatedAt"'))
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o644)
        self.assertEqual(json.loads(text), self.data)
        self.assertEqual(os.listdir(path.parent), ["directory.json"])

        # A failure part-way leaves the old file whole and no temp file behind.
        changed = dict(self.data, generatedAt="2026-09-25T00:00:00Z")
        with mock.patch.object(publish.os, "replace", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                publish.write_export(path, changed)
        self.assertEqual(path.read_text(encoding="utf-8"), text)
        self.assertEqual(os.listdir(path.parent), ["directory.json"])

    def test_diff_exports(self):
        old = json.loads(json.dumps(self.data))
        new = json.loads(json.dumps(self.data))
        ids = [x["id"] for x in new["businesses"]]
        # Only the check dates moved: not a change.
        for fact in new["businesses"][0]["facts"]:
            fact["checkedAt"] = "2026-10-01"
        new["businesses"][0]["updatedAt"] = "2026-10-01"
        # A real change, a removal, and an addition.
        new["businesses"][1]["services"] = ["tire rotation"]
        removed = new["businesses"].pop(2)
        added = dict(new["businesses"][0], id="lv-test99999", slug="example-new-shop")
        new["businesses"].append(added)
        self.assertEqual(publish.diff_exports(old, new), {
            "added": ["lv-test99999"], "removed": [removed["id"]], "changed": [ids[1]],
        })
        self.assertEqual(publish.diff_exports(None, old)["added"], sorted(ids))
        self.assertEqual(publish.diff_exports(old, old), {"added": [], "removed": [], "changed": []})

    def test_run_publish_writes_file_and_records_the_run(self):
        out = Path(self.tmp.name) / "out" / "directory.json"
        counts = publish.run_publish(self.conn, self.settings, NOW, out_path=out)
        self.assertEqual(counts["published"], 7)
        self.assertEqual(counts["added"], 7)
        self.assertEqual(json.loads(out.read_text(encoding="utf-8"))["counts"]["published"], 7)
        self.assertEqual(db.get_meta(self.conn, "last_export_at"), "2026-09-24T18:00:07Z")
        run = self.conn.execute("SELECT * FROM runs WHERE kind='publish'").fetchone()
        self.assertEqual(run["status"], "ok")
        again = publish.run_publish(self.conn, self.settings, NOW, out_path=out)
        self.assertEqual((again["added"], again["removed"], again["updated"]), (0, 0, 0))


class PrivateExports(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.settings = settings(self.tmp.name)
        self.conn = b.make_db()
        self.ids = build_world(self.conn)
        # A held business with a hiring signal must not reach either list.
        b.add_hiring(self.conn, self.ids["solo"], "https://quillfeather.example/jobs", ["receptionist"])
        self.formula = b.add_business(self.conn, "@Example Sign Shop", naics="541211", street="7 Sample St")
        b.add_record(self.conn, self.formula, "tx_sales_tax")
        publish.evaluate(self.conn, self.settings, NOW)
        self.counts = exports.write_private_exports(self.conn, self.settings, NOW)
        self.dir = self.settings.private_export_dir

    def read(self, name):
        with open(self.dir / name, newline="", encoding="utf-8") as fh:
            return list(csv.reader(fh))

    def test_website_prospects(self):
        rows = self.read("website-prospects.csv")
        self.assertEqual(rows[0], ["id", "name", "category", "address", "permit_since", "website_status"])
        self.assertEqual(rows[1:], [
            [public_id(self.conn, self.formula), "'@Example Sign Shop", "Professional Services", "Longview, TX",
             "2019-03-01", "none"],
            [public_id(self.conn, self.ids["office"]), "Example Bookkeeping Office", "Professional Services",
             "Longview, TX", "2019-03-01", "none"],
            [public_id(self.conn, self.ids["dental"]), "Fictional Family Dental", "Health & Dental",
             "401 Fixture Rd Ste 2, Longview, TX 75601", "", "none"],
        ])
        self.assertEqual(self.counts, {"website_prospects": 3, "hiring_partners": 1})

    def test_dead_website_is_a_prospect(self):
        self.conn.execute("UPDATE businesses SET website_status='dead' WHERE id=?", (self.ids["mail_offsite"],))
        exports.write_private_exports(self.conn, self.settings, NOW)
        names = [r[1] for r in self.read("website-prospects.csv")[1:]]
        self.assertIn("Example Auto Glass", names)
        row = [r for r in self.read("website-prospects.csv") if r[1] == "Example Auto Glass"][0]
        self.assertEqual(row[5], "dead")

    def test_hiring_partners_show_only_what_the_directory_shows(self):
        rows = self.read("hiring-partners.csv")
        self.assertEqual(rows, [
            ["id", "name", "category", "careers_url", "roles", "phone", "email"],
            [public_id(self.conn, self.ids["tire"]), "Example Tire & Lube", "Auto", SITE + "careers",
             "front_desk", "(903) 555-0100", "info@exampletire.example"],
        ])

    def test_private_files(self):
        self.assertEqual(stat.S_IMODE(self.dir.stat().st_mode), 0o700)
        for name in ("website-prospects.csv", "hiring-partners.csv"):
            path = self.dir / name
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            text = path.read_text(encoding="utf-8")
            for needle in (PLANTED, "QUILLFEATHER", "Quillfeather", "Example Pawn", "300 Sample Ave"):
                self.assertNotIn(needle, text)
        self.assertEqual(sorted(os.listdir(self.dir)), ["hiring-partners.csv", "website-prospects.csv"])


if __name__ == "__main__":
    unittest.main()

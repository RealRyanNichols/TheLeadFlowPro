"""Small builders for in-memory archive fixtures.

Every business, record, and fact these make is fictional: ``.example``
domains, 903-555-01xx numbers, and names like "Example Tire & Lube". Any test
module may reuse them.
"""

from __future__ import annotations

import json
from typing import Any, Iterable, Optional

from longview_archive import categories, db, normalize

NOW = "2026-09-24T18:00:00Z"
DATASET_URL = "https://data.texas.example/d/sample-permits"
TABC_URL = "https://data.texas.example/d/sample-tabc-licenses"


def make_db():
    conn = db.connect(":memory:")
    db.migrate(conn)
    with db.transaction(conn):
        categories.seed(conn)
    return conn


def set_source(conn, source_id: str, **values) -> None:
    cols = ", ".join(f"{k}=?" for k in values)
    conn.execute(f"UPDATE sources SET {cols} WHERE id=?", (*values.values(), source_id))


def standard_sources(conn) -> None:
    set_source(conn, "tx_sales_tax", dataset_id="samp-le01", dataset_url=DATASET_URL,
               last_synced_at="2026-09-24T11:00:00Z", last_status="ok", row_count=4)
    set_source(conn, "tx_tabc", dataset_id="samp-le02", dataset_url=TABC_URL,
               last_synced_at="2026-09-23T11:00:00Z", last_status="ok", row_count=1)
    set_source(conn, "npi", last_synced_at="2026-09-22T11:00:00Z", last_status="ok", row_count=1)


def add_business(conn, name: str = "Example Tire & Lube", **kw) -> int:
    n = conn.execute("SELECT COUNT(*) FROM businesses").fetchone()[0] + 1
    street = kw.pop("street", "1200 W Marshall Ave")
    street_norm = normalize.parse_street(street)[0] if street else None
    naics = kw.pop("naics", "811111")
    slug_cat, label = categories.categorize(naics)
    row = dict(
        public_id=f"lv-test{n:05d}", slug=normalize.slugify(name) or f"business-{n}", name=name,
        name_norm=normalize.norm_name(name), street=street, street_norm=street_norm, city="Longview",
        zip="75601", scope="city", naics=naics, category=slug_cat, category_label=label,
        permit_start="2019-03-01", is_individual=0, website=None, website_domain=None,
        website_status="unknown", publish_state="pending", publish_reason=None, active=1,
        first_seen_at="2026-01-05T12:00:00Z", updated_at=NOW,
    )
    row.update(kw)
    cols = ",".join(row)
    cur = conn.execute(
        f"INSERT INTO businesses({cols}) VALUES ({','.join('?' * len(row))})", tuple(row.values())
    )
    return int(cur.lastrowid)


def add_record(conn, business_id: Optional[int], source_id: str = "tx_sales_tax", key: Optional[str] = None,
               raw: Optional[dict] = None, **kw) -> int:
    n = conn.execute("SELECT COUNT(*) FROM source_records").fetchone()[0] + 1
    biz = None
    if business_id is not None:
        biz = conn.execute("SELECT * FROM businesses WHERE id=?", (business_id,)).fetchone()
    row = dict(
        source_id=source_id, source_key=key or f"{source_id}-{n}", business_id=business_id,
        license="Sample licence text",
        source_url=kw.pop("source_url", f"https://records.example/{source_id}/{n}"),
        fetched_at=NOW, first_seen_at="2026-01-05T12:00:00Z", last_seen_at="2026-09-24T11:00:00Z", active=1,
        raw_json=json.dumps(raw or {}, sort_keys=True),
        name=biz["name"] if biz else None, name_norm=biz["name_norm"] if biz else None,
        street=biz["street"] if biz else None, street_norm=biz["street_norm"] if biz else None,
        zip=biz["zip"] if biz else None, naics=biz["naics"] if biz and source_id == "tx_sales_tax" else None,
        permit_start=biz["permit_start"] if biz and source_id == "tx_sales_tax" else None,
        is_individual=biz["is_individual"] if biz else 0, personal_name=0,
        scope=biz["scope"] if biz else "city", match_state="matched" if biz else "new",
    )
    row.update(kw)
    cols = ",".join(row)
    cur = conn.execute(
        f"INSERT INTO source_records({cols}) VALUES ({','.join('?' * len(row))})", tuple(row.values())
    )
    return int(cur.lastrowid)


def add_fact(conn, business_id: int, field: str, value: Any, source_id: str = "website",
             source_url: Optional[str] = None, checked_at: str = "2026-09-22T15:00:00Z",
             method: str = "jsonld", confidence: float = 0.95) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO facts(business_id, field, value_json, source_id, source_url, method,"
        " confidence, first_observed_at, checked_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (business_id, field, db.dumps(value), source_id, source_url, method, confidence,
         "2026-09-01T15:00:00Z", checked_at),
    )


def add_site(conn, business_id: int, url: str = "https://www.exampletire.example/", status: str = "ok",
             checked_at: str = "2026-09-22T15:00:00Z") -> None:
    """A verified own website: the business's candidate plus the website fact."""
    conn.execute(
        "UPDATE businesses SET website=?, website_domain=?, website_source='self', website_status=?,"
        " last_crawled_at=? WHERE id=?",
        (url, normalize.registrable_domain(url), status, checked_at, business_id),
    )
    add_fact(conn, business_id, "website", url, source_url=url, checked_at=checked_at)


def add_hiring(conn, business_id: int, careers_url: str, roles: Iterable[str], active: int = 1) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO hiring_signals(business_id, careers_url, roles_json, first_seen_at,"
        " last_seen_at, active) VALUES (?,?,?,?,?,?)",
        (business_id, careers_url, db.dumps(list(roles)), "2026-09-01T15:00:00Z", NOW, active),
    )


def add_suppression(conn, kind: str, value: str, reason: str = "owner asked") -> None:
    conn.execute(
        "INSERT INTO suppressions(kind, value, reason, created_at) VALUES (?,?,?,?)",
        (kind, value, reason, NOW),
    )


def state(conn, business_id: int):
    row = conn.execute("SELECT publish_state, publish_reason FROM businesses WHERE id=?", (business_id,)).fetchone()
    return row["publish_state"], row["publish_reason"]

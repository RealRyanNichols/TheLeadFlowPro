"""SQLite storage for the archive: connection, schema, and small helpers.

The schema below is the source of truth (see SPEC.md). ``migrate`` is
idempotent and records the schema version in ``meta``.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

SCHEMA_VERSION = 1

SCHEMA = r"""
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id             TEXT PRIMARY KEY,           -- tx_sales_tax | tx_tabc | osm | npi | website
  name           TEXT NOT NULL,
  publisher      TEXT NOT NULL,
  license        TEXT NOT NULL,
  terms_url      TEXT,
  dataset_id     TEXT,
  dataset_url    TEXT,
  columns_json   TEXT,
  row_count      INTEGER,
  last_synced_at TEXT,
  last_status    TEXT,
  last_error     TEXT
);

CREATE TABLE IF NOT EXISTS businesses (
  id              INTEGER PRIMARY KEY,
  public_id       TEXT UNIQUE,
  slug            TEXT UNIQUE,
  name            TEXT NOT NULL,              -- outlet / trade name, never a taxpayer's personal name
  name_norm       TEXT NOT NULL,
  street          TEXT,                       -- display street line including suite
  street_norm     TEXT,
  suite           TEXT,
  city            TEXT,
  zip             TEXT,
  lat             REAL,
  lon             REAL,
  scope           TEXT NOT NULL DEFAULT 'city' CHECK (scope IN ('city','nearby','out')),
  naics           TEXT,
  category        TEXT NOT NULL DEFAULT 'other',
  category_label  TEXT,
  permit_start    TEXT,                       -- YYYY-MM-DD, earliest active sales-tax permit
  is_individual   INTEGER NOT NULL DEFAULT 0, -- taxpayer is a person; never displayed
  -- website candidate and crawl state
  website         TEXT,
  website_domain  TEXT,
  website_source  TEXT,                       -- self | osm | npi | tx_tabc
  website_status  TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (website_status IN ('unknown','ok','moved','dead','blocked')),
  last_crawled_at TEXT,
  next_crawl_at   TEXT,
  crawl_failures  INTEGER NOT NULL DEFAULT 0,
  -- publishing
  publish_state   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (publish_state IN ('pending','ready','review','held','suppressed')),
  publish_reason  TEXT,
  active          INTEGER NOT NULL DEFAULT 1,
  first_seen_at   TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS businesses_addr ON businesses(street_norm, zip);
CREATE INDEX IF NOT EXISTS businesses_domain ON businesses(website_domain);
CREATE INDEX IF NOT EXISTS businesses_crawl ON businesses(next_crawl_at);
CREATE INDEX IF NOT EXISTS businesses_state ON businesses(publish_state);

CREATE TABLE IF NOT EXISTS source_records (
  id             INTEGER PRIMARY KEY,
  source_id      TEXT NOT NULL REFERENCES sources(id),
  source_key     TEXT NOT NULL,
  business_id    INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  license        TEXT NOT NULL,
  source_url     TEXT NOT NULL,
  fetched_at     TEXT NOT NULL,
  first_seen_at  TEXT NOT NULL,
  last_seen_at   TEXT NOT NULL,
  active         INTEGER NOT NULL DEFAULT 1,
  raw_json       TEXT NOT NULL,               -- private; never exported or logged
  name           TEXT,
  name_norm      TEXT,
  street         TEXT,
  street_norm    TEXT,
  suite          TEXT,
  city           TEXT,
  zip            TEXT,
  phone          TEXT,                        -- E.164 when the source has one
  website        TEXT,
  website_domain TEXT,
  naics          TEXT,
  lat            REAL,
  lon            REAL,
  permit_start   TEXT,
  is_individual  INTEGER NOT NULL DEFAULT 0,
  personal_name  INTEGER NOT NULL DEFAULT 0,  -- outlet name is the taxpayer's own name
  scope          TEXT NOT NULL DEFAULT 'city' CHECK (scope IN ('city','nearby','out')),
  tags_json      TEXT,                        -- OSM tags or other structured hints
  match_state    TEXT NOT NULL DEFAULT 'new'
                 CHECK (match_state IN ('new','matched','created','review','ignored')),
  UNIQUE (source_id, source_key)
);
CREATE INDEX IF NOT EXISTS source_records_business ON source_records(business_id);
CREATE INDEX IF NOT EXISTS source_records_phone ON source_records(phone);
CREATE INDEX IF NOT EXISTS source_records_addr ON source_records(street_norm, zip);
CREATE INDEX IF NOT EXISTS source_records_state ON source_records(match_state);

CREATE TABLE IF NOT EXISTS facts (
  business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  field             TEXT NOT NULL,
  value_json        TEXT NOT NULL,
  source_id         TEXT NOT NULL,
  source_url        TEXT,
  method            TEXT NOT NULL,
  confidence        REAL NOT NULL,
  first_observed_at TEXT NOT NULL,
  checked_at        TEXT NOT NULL,
  accepted_by       TEXT NOT NULL DEFAULT 'rules',
  PRIMARY KEY (business_id, field)
);

CREATE TABLE IF NOT EXISTS observations (
  id                INTEGER PRIMARY KEY,
  business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  field             TEXT NOT NULL,
  value_json        TEXT NOT NULL,
  value_hash        TEXT NOT NULL,
  source_id         TEXT NOT NULL,
  source_url        TEXT NOT NULL DEFAULT '',
  method            TEXT NOT NULL,
  confidence        REAL NOT NULL,
  first_observed_at TEXT NOT NULL,
  last_observed_at  TEXT NOT NULL,
  UNIQUE (business_id, field, value_hash, source_url)
);

CREATE TABLE IF NOT EXISTS merges (
  id               INTEGER PRIMARY KEY,
  business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source_record_id INTEGER NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  rule             TEXT NOT NULL,
  evidence_json    TEXT NOT NULL,
  explanation      TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  slug       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS category_naics (
  prefix TEXT PRIMARY KEY,
  slug   TEXT NOT NULL REFERENCES categories(slug),
  label  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_queue (
  id               INTEGER PRIMARY KEY,
  business_id      INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  source_record_id INTEGER REFERENCES source_records(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL,
  field            TEXT NOT NULL DEFAULT '',
  proposed_json    TEXT,
  proposed_hash    TEXT NOT NULL DEFAULT '',
  current_json     TEXT,
  source_url       TEXT,
  detail           TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','accepted','rejected','resolved')),
  created_at       TEXT NOT NULL,
  resolved_at      TEXT,
  resolved_by      TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS review_queue_dedupe ON review_queue(
  IFNULL(business_id, 0), IFNULL(source_record_id, 0), kind, field, proposed_hash
);
CREATE INDEX IF NOT EXISTS review_queue_status ON review_queue(status);

CREATE TABLE IF NOT EXISTS hiring_signals (
  business_id   INTEGER PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  careers_url   TEXT NOT NULL,
  roles_json    TEXT NOT NULL DEFAULT '[]',
  first_seen_at TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS suppressions (
  id         INTEGER PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('public_id','domain','phone','name_zip')),
  value      TEXT NOT NULL,
  reason     TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (kind, value)
);

CREATE TABLE IF NOT EXISTS host_state (
  host              TEXT PRIMARY KEY,
  robots_txt        TEXT,
  robots_status     INTEGER,
  robots_fetched_at TEXT,
  last_request_at   TEXT,
  backoff_level     INTEGER NOT NULL DEFAULT 0,
  backoff_until     TEXT,
  blocked_reason    TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY,
  kind        TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  status      TEXT NOT NULL DEFAULT 'running'
              CHECK (status IN ('running','ok','error','partial','skipped')),
  counts_json TEXT,
  error       TEXT
);
CREATE INDEX IF NOT EXISTS runs_kind ON runs(kind, started_at);
"""

SOURCE_DEFAULTS = (
    # id, name, publisher, license, terms_url
    (
        "tx_sales_tax",
        "Active Sales Tax Permit Holders",
        "Texas Comptroller of Public Accounts",
        "See dataset license on data.texas.gov",
        "https://data.texas.gov/",
    ),
    (
        "tx_tabc",
        "TABC license information",
        "Texas Alcoholic Beverage Commission",
        "See dataset license on data.texas.gov",
        "https://data.texas.gov/",
    ),
    (
        "osm",
        "OpenStreetMap",
        "OpenStreetMap contributors",
        "ODbL 1.0 (© OpenStreetMap contributors)",
        "https://www.openstreetmap.org/copyright",
    ),
    (
        "npi",
        "NPPES NPI Registry",
        "Centers for Medicare & Medicaid Services",
        "U.S. government public data",
        "https://npiregistry.cms.hhs.gov/",
    ),
    (
        "website",
        "The business's own website",
        "Each business",
        "Facts only; no text or images copied",
        None,
    ),
)


def now_iso(dt: Optional[datetime] = None) -> str:
    """UTC ISO-8601 with a Z suffix, second precision."""
    dt = dt or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def dumps(value: Any) -> str:
    """Canonical JSON for storage and hashing."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def value_hash(value: Any) -> str:
    return hashlib.sha256(dumps(value).encode("utf-8")).hexdigest()[:32]


def connect(path: Path | str) -> sqlite3.Connection:
    path = Path(path)
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=5000")
    if str(path) != ":memory:":
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def migrate(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    with transaction(conn):
        for source_id, name, publisher, license_, terms in SOURCE_DEFAULTS:
            conn.execute(
                "INSERT OR IGNORE INTO sources(id, name, publisher, license, terms_url)"
                " VALUES (?,?,?,?,?)",
                (source_id, name, publisher, license_, terms),
            )
        conn.execute(
            "INSERT INTO meta(key, value) VALUES('schema_version', ?)"
            " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (str(SCHEMA_VERSION),),
        )


class transaction:
    """``with transaction(conn):`` BEGIN IMMEDIATE ... COMMIT / ROLLBACK.

    Nested use is a no-op so helpers can open one without checking.
    """

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.outer = False

    def __enter__(self) -> sqlite3.Connection:
        if not self.conn.in_transaction:
            self.conn.execute("BEGIN IMMEDIATE")
            self.outer = True
        return self.conn

    def __exit__(self, exc_type, exc, tb) -> bool:
        if self.outer:
            if exc_type is None:
                self.conn.execute("COMMIT")
            else:
                self.conn.execute("ROLLBACK")
        return False


def get_meta(conn: sqlite3.Connection, key: str, default: Optional[str] = None) -> Optional[str]:
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_meta(conn: sqlite3.Connection, key: str, value: str) -> None:
    conn.execute(
        "INSERT INTO meta(key, value) VALUES(?, ?)"
        " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )


def start_run(conn: sqlite3.Connection, kind: str, now: Optional[str] = None) -> int:
    cur = conn.execute(
        "INSERT INTO runs(kind, started_at) VALUES (?, ?)", (kind, now or now_iso())
    )
    return int(cur.lastrowid)


def finish_run(
    conn: sqlite3.Connection,
    run_id: int,
    status: str,
    counts: Optional[dict] = None,
    error: Optional[str] = None,
    now: Optional[str] = None,
) -> None:
    conn.execute(
        "UPDATE runs SET finished_at=?, status=?, counts_json=?, error=? WHERE id=?",
        (now or now_iso(), status, dumps(counts or {}), (error or None), run_id),
    )


def add_review(
    conn: sqlite3.Connection,
    *,
    kind: str,
    business_id: Optional[int] = None,
    source_record_id: Optional[int] = None,
    field: str = "",
    proposed: Any = None,
    current: Any = None,
    source_url: Optional[str] = None,
    detail: Optional[str] = None,
    now: Optional[str] = None,
) -> Optional[int]:
    """Queue an item for a person. Duplicate open items are ignored."""
    proposed_json = dumps(proposed) if proposed is not None else None
    cur = conn.execute(
        "INSERT OR IGNORE INTO review_queue(business_id, source_record_id, kind, field,"
        " proposed_json, proposed_hash, current_json, source_url, detail, created_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?)",
        (
            business_id,
            source_record_id,
            kind,
            field,
            proposed_json,
            value_hash(proposed) if proposed is not None else "",
            dumps(current) if current is not None else None,
            source_url,
            detail,
            now or now_iso(),
        ),
    )
    return int(cur.lastrowid) if cur.rowcount else None


def rows(conn: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> list:
    return list(conn.execute(sql, tuple(params)).fetchall())

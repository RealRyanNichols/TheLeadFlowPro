"""Matching: decide which physical business each source record describes.

Open data lists the same shop several times (a sales-tax outlet, a TABC
license, an NPI organization, an OpenStreetMap node), each spelled its own way.
This module joins records only on evidence a person would accept: the same
phone at the same street, the same address with a similar name, or the same
website at the same address. Anything less certain goes to the review queue
instead of creating a duplicate, and a chain's locations or a building's
tenants never collapse into one listing. Every join writes a ``merges`` row with
a plain sentence saying why, so the source trail can be checked by hand.

Joining fills empty business columns only; it never overwrites a value, and it
never touches a suppressed business beyond linking the record. Two exceptions
keep the shown identity true to a current public record: a place known only
from OpenStreetMap is kept for review until a primary record joins it and
replaces its name, address, category and slug with that record's; and when
the business's identity source (its first active primary record by source
priority, then source key) changes its name or address, the business follows
it and a review item records the change. Only primary public records (sales
tax, TABC, NPI, franchise tax) create publishable businesses.

A franchise-tax record carries a company's name and nothing about where it
does business (its address is a mailing address and is never read). The
taxpayer number is its only hard link: a company that also has an active
Longview sales-tax outlet is listed by that outlet (its franchise record steps
aside, ``_franchise_step_aside``, whichever list synced first), and a sales-tax
record of any other taxpayer is another company, never merged with it
(``_taxpayer_bars``). By name alone, and only on an exact normalized name, it
joins a place known only from OpenStreetMap (or such a place joins it); a TABC
or NPI practice with its name is a question for a person that never takes the
practice off the site (``_match_franchise_twins``).
Nothing OpenStreetMap says about a franchise-only business (street, category,
map point) is shown under the Comptroller's name.

A business belongs to exactly one place (``places.py``): the town its records'
postal city names. Every rule below compares a record only with businesses of
its own place, so two towns' records are never joined, whatever they share (a
chain's phone line, a name). A record whose place changes leaves its old
business and is matched again in the new place. A removal request follows it:
the move is written to ``merges`` (rule ``left_place``), and whatever business
the record lands on later (created, joined now, or joined after a review) is
suppressed too, under its own public id (``_carry_suppression``). A removed
listing is never published again because its record moved town.

A batch is processed by source priority and then by source key, so the same
records produce the same businesses, public ids, and slugs whatever order they
were inserted in. Logs carry counts and row ids only.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import re
import sqlite3
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Dict, List, NamedTuple, Optional, Sequence, Tuple, Union

from . import categories, db, normalize, privacy
from .fetcher import forbidden_site, forbidden_site_in_doubt
from .sources import franchise

logger = logging.getLogger(__name__)

FRANCHISE = franchise.SOURCE_ID
PRIMARY_SOURCES: Tuple[str, ...] = ("tx_sales_tax", "tx_tabc", "npi", FRANCHISE)
# Primary records that place a business at a street (the franchise list gives only a mailing address).
PREMISES_SOURCES: Tuple[str, ...] = ("tx_sales_tax", "tx_tabc", "npi")
SOURCE_PRIORITY: Dict[str, int] = {"tx_sales_tax": 0, "tx_tabc": 1, "npi": 2, FRANCHISE: 3, "osm": 4}
SOURCE_LABELS: Dict[str, str] = {
    "tx_sales_tax": "sales tax",
    "tx_tabc": "TABC",
    "npi": "NPI",
    FRANCHISE: "franchise-tax",
    "osm": "OpenStreetMap",
}
# Where a website candidate came from (businesses.website_source).
WEBSITE_SOURCES: Dict[str, str] = {"osm": "osm", "npi": "npi", "tx_tabc": "tx_tabc"}

RESERVED_SLUGS = frozenset({"about", "new", "hiring", "category", "page", "search", "status"})
# The directory's A to Z pages live at page-2/, page-3/, ... next to the profiles.
_PAGE_SLUG = re.compile(r"page-\d+")


def _reserved(slug: str) -> bool:
    return slug in RESERVED_SLUGS or bool(_PAGE_SLUG.fullmatch(slug))

MERGE_SIMILARITY = 0.6
REVIEW_SIMILARITY = 0.4
SHARED_LINE_STREETS = 3
BATCH_SIZE = 500
MAX_PASSES = 3  # a newly found shared line re-queues its held records once

OSM_ONLY_REASON = "osm_only_needs_primary_source"
MATCHER = "matching"

# Rule names written to merges.rule and MatchResult.rule.
RULE_EXISTING = "existing_link"
RULE_REVIEWED = "reviewed_merge"
RULE_PHONE = "same_phone"
RULE_ADDRESS_NAME = "same_address_similar_name"
RULE_DOMAIN_ADDRESS = "same_domain_same_address"
RULE_NEW = "new_business"
RULE_OSM_ONLY = OSM_ONLY_REASON
RULE_SAME_NAME = "same_name_franchise"
RULE_FRANCHISE_OUTLET = "franchise_has_sales_tax_outlet"
RULE_LEFT_PLACE = "left_place"
CARRIED_REASON = "removal request carried over: the record moved town"
REVIEW_PHONE_STREET = "same_phone_different_street"
REVIEW_PHONE_MANY = "same_phone_several_businesses"
REVIEW_ADDRESS_MANY = "same_address_several_businesses"
REVIEW_ADDRESS_PARTIAL = "same_address_partial_name"
REVIEW_NAME_MANY = "same_name_several_businesses"
REVIEW_NAME_PRACTICE = "same_name_as_licensed_practice"

_ORDER_SQL = (
    "CASE source_id WHEN 'tx_sales_tax' THEN 0 WHEN 'tx_tabc' THEN 1"
    " WHEN 'npi' THEN 2 WHEN 'tx_franchise' THEN 3 WHEN 'osm' THEN 4 ELSE 5 END, source_key, id"
)
_PRIMARY_SQL = "('tx_sales_tax','tx_tabc','npi','tx_franchise')"
_PREMISES_SQL = "('tx_sales_tax','tx_tabc','npi')"

Now = Union[str, datetime, None]


class MatchResult(NamedTuple):
    action: str  # matched | created | review | ignored
    business_id: Optional[int]  # the linked business; None while held for review
    rule: str
    explanation: str  # may name a phone or street: store it, never log it


@dataclass(frozen=True)
class _Rec:
    """The normalized projection of one source record, with safe fallbacks."""

    id: int
    source_id: str
    source_key: str
    business_id: Optional[int]
    source_url: str
    active: bool
    name: str
    name_norm: str
    street_line: str
    street_norm: str
    suite: str
    city: str
    zip: str
    phone: str
    website: str
    website_domain: str
    naics: str
    lat: Optional[float]
    lon: Optional[float]
    permit_start: str
    is_individual: int
    scope: str
    tags: dict
    place: str = "longview"

    @property
    def is_primary(self) -> bool:
        return self.source_id in PRIMARY_SOURCES

    @property
    def label(self) -> str:
        return SOURCE_LABELS.get(self.source_id, self.source_id)

    def street_display(self) -> str:
        line = self.street_line or (
            self.street_norm + (f" ste {self.suite}" if self.suite else "") if self.street_norm else ""
        )
        return normalize.display_street(line) if line else ""


def _stamp(now: Now) -> str:
    if now is None:
        return db.now_iso()
    if isinstance(now, datetime):
        return db.now_iso(now)
    return str(now)


def _load(row: sqlite3.Row) -> _Rec:
    street_line = (row["street"] or "").strip()
    street_norm = (row["street_norm"] or "").strip()
    suite = (row["suite"] or "").strip()
    mailing_only = row["source_id"] == FRANCHISE
    if mailing_only:
        # Defence in depth: a franchise record never carries a location or a phone.
        street_line = street_norm = suite = ""
    if street_line and not street_norm:
        street_norm, parsed_suite = normalize.parse_street(street_line)
        suite = suite or parsed_suite
    # "Legal Name DBA Trade Name" from any source shows only the trade name.
    name = normalize.trade_name(row["name"])
    website = normalize.norm_url(row["website"]) if row["website"] else None
    if website and forbidden_site(website):
        website = None  # a directory, map, or social page (stored before the guard) is never a candidate
    domain = (row["website_domain"] or "").strip().lower()
    if website and not domain:
        domain = normalize.registrable_domain(website)
    if not website:
        domain = ""
    tags: dict = {}
    if row["tags_json"]:
        try:
            decoded = json.loads(row["tags_json"])
            tags = decoded if isinstance(decoded, dict) else {}
        except ValueError:
            tags = {}
    return _Rec(
        id=int(row["id"]),
        source_id=row["source_id"],
        source_key=row["source_key"],
        business_id=row["business_id"],
        source_url=row["source_url"],
        active=bool(row["active"]),
        name=name,
        name_norm=(row["name_norm"] or "").strip() or normalize.norm_name(name),
        street_line=street_line,
        street_norm=street_norm,
        suite=suite,
        city=(row["city"] or "").strip(),
        zip="" if mailing_only else (normalize.zip5(row["zip"]) or ""),
        phone="" if mailing_only else (row["phone"] or "").strip(),
        website=website or "",
        website_domain=domain,
        naics=(row["naics"] or "").strip(),
        lat=row["lat"],
        lon=row["lon"],
        permit_start=(row["permit_start"] or "").strip(),
        is_individual=1 if row["is_individual"] else 0,
        scope=row["scope"] or "city",
        tags=tags,
        place=row["place"] or "longview",
    )


# ---------------------------------------------------------------- comparisons

def _compatible(a: Optional[str], b: Optional[str]) -> bool:
    """Equal, or one side unknown (an OSM node often has no postcode or suite)."""
    return not a or not b or a == b


def _same_address(rec: _Rec, biz: sqlite3.Row) -> bool:
    return (
        bool(rec.street_norm)
        and rec.street_norm == (biz["street_norm"] or "")
        and _compatible(rec.zip, biz["zip"])
        and _compatible(rec.suite, biz["suite"])
    )


def _phone_addresses_agree(rec: _Rec, biz: sqlite3.Row) -> bool:
    if not rec.street_norm or not biz["street_norm"]:
        return True
    return rec.street_norm == biz["street_norm"] and _compatible(rec.zip, biz["zip"])


def _names(conn: sqlite3.Connection, biz: sqlite3.Row) -> List[str]:
    names = [biz["name"]]
    names += [r["name"] for r in conn.execute(
        "SELECT name FROM source_records WHERE business_id=? AND name IS NOT NULL AND name != ''",
        (biz["id"],),
    )]
    return names


def _similarity(conn: sqlite3.Connection, rec: _Rec, biz: sqlite3.Row) -> float:
    if not rec.name:
        return 0.0
    return max(normalize.name_similarity(rec.name, other) for other in _names(conn, biz))


def _domains(conn: sqlite3.Connection, biz: sqlite3.Row) -> set:
    domains = {r["website_domain"] for r in conn.execute(
        "SELECT website_domain FROM source_records WHERE business_id=? AND website_domain IS NOT NULL"
        " AND website_domain != ''",
        (biz["id"],),
    )}
    if biz["website_domain"]:
        domains.add(biz["website_domain"])
    return {d.lower() for d in domains}


def _business(conn: sqlite3.Connection, business_id: int) -> Optional[sqlite3.Row]:
    return conn.execute("SELECT * FROM businesses WHERE id=?", (business_id,)).fetchone()


def _same_place(biz: Optional[sqlite3.Row], rec: "_Rec") -> bool:
    """A record only ever joins a business of its own town."""
    return biz is not None and (biz["place"] or "longview") == rec.place


def _leave_place(conn: sqlite3.Connection, rec: "_Rec", old: sqlite3.Row, stamp: str) -> "_Rec":
    """The record now names another town: unlink it from its business, which is retired
    when no other active record keeps it, and match it again as a new record.

    The move is written to ``merges`` (rule ``left_place``, on the old business) so a
    removal request on the old business follows the record (``_carry_suppression``)."""
    conn.execute(
        "INSERT INTO merges(business_id, source_record_id, rule, evidence_json, explanation, created_at)"
        " VALUES (?,?,?,?,?,?)",
        (old["id"], rec.id, RULE_LEFT_PLACE,
         db.dumps({"from_place": old["place"] or "longview", "to_place": rec.place}),
         f"The {rec.label} record left this business because it now names another town.", stamp),
    )
    conn.execute("UPDATE source_records SET business_id=NULL, match_state='new' WHERE id=?", (rec.id,))
    conn.execute(
        "UPDATE businesses SET active=0, updated_at=? WHERE id=? AND active=1 AND NOT EXISTS"
        " (SELECT 1 FROM source_records WHERE business_id=? AND active=1)",
        (stamp, old["id"], old["id"]),
    )
    _resolve_merge_reviews(conn, rec.id, stamp)
    return replace(rec, business_id=None)


def _is_suppressed(conn: sqlite3.Connection, biz: sqlite3.Row) -> bool:
    return biz["publish_state"] == "suppressed" or privacy.is_suppressed(conn, biz)


def _carry_suppression(conn: sqlite3.Connection, record_id: int, business_id: Optional[int], stamp: str) -> bool:
    """A record that left a suppressed business (it moved town) suppresses the business it lands on.

    The suppression is stored under the new business's public id, so every later
    check (publish, approval, the site build, the worker) honors it like any other
    removal request."""
    if business_id is None:
        return False
    biz = _business(conn, business_id)
    if biz is None:
        return False
    for row in conn.execute(
        "SELECT DISTINCT business_id FROM merges WHERE source_record_id=? AND rule=? AND business_id != ?",
        (record_id, RULE_LEFT_PLACE, business_id),
    ).fetchall():
        old = _business(conn, row["business_id"])
        if old is None or not _is_suppressed(conn, old):
            continue
        public_id, _ = assign_identity(conn, business_id)
        conn.execute(
            "INSERT OR IGNORE INTO suppressions(kind, value, reason, note, created_at) VALUES ('public_id',?,?,?,?)",
            (public_id, CARRIED_REASON, f"from {_ref(old)}", stamp),
        )
        conn.execute(
            "UPDATE businesses SET publish_state='suppressed', publish_reason='suppressed', updated_at=?"
            " WHERE id=?", (stamp, business_id),
        )
        return True
    return False


def _ref(biz: sqlite3.Row) -> str:
    return biz["public_id"] or f"#{biz['id']}"


# ---------------------------------------------------------------- review helpers

def _decisions(conn: sqlite3.Connection, rec: _Rec) -> Tuple[List[int], set]:
    """Human answers to earlier merge questions about this record."""
    accepted, rejected = [], set()
    for row in conn.execute(
        "SELECT business_id, status FROM review_queue WHERE source_record_id=? AND kind='merge_ambiguous'"
        " AND status IN ('accepted','rejected') AND business_id IS NOT NULL ORDER BY business_id",
        (rec.id,),
    ):
        (accepted.append if row["status"] == "accepted" else rejected.add)(row["business_id"])
    return accepted, rejected


def _resolve_merge_reviews(conn: sqlite3.Connection, rec_id: int, stamp: str, keep: Sequence[int] = ()) -> None:
    """Close this record's open merge questions that no longer apply."""
    keep_list = list(keep)
    marks = ",".join("?" * len(keep_list))
    extra = f" AND business_id NOT IN ({marks})" if keep_list else ""
    conn.execute(
        "UPDATE review_queue SET status='resolved', resolved_at=?, resolved_by=?"
        " WHERE source_record_id=? AND kind='merge_ambiguous' AND status='open'" + extra,
        (stamp, MATCHER, rec_id, *keep_list),
    )


def _open_merge_review(conn: sqlite3.Connection, rec: _Rec, business_id: int, detail: str, stamp: str) -> None:
    added = db.add_review(
        conn, kind="merge_ambiguous", business_id=business_id, source_record_id=rec.id,
        source_url=rec.source_url, detail=detail, now=stamp,
    )
    if added is None:
        # Same question asked before and closed by matching: ask it again.
        conn.execute(
            "UPDATE review_queue SET status='open', detail=?, resolved_at=NULL, resolved_by=NULL"
            " WHERE business_id=? AND source_record_id=? AND kind='merge_ambiguous' AND field=''"
            " AND proposed_hash='' AND status='resolved'",
            (detail, business_id, rec.id),
        )


def _shared_line(conn: sqlite3.Connection, phone: str, stamp: str) -> bool:
    """A phone listed at three or more streets is a shared or central line."""
    streets = conn.execute(
        "SELECT COUNT(DISTINCT street_norm) FROM source_records WHERE phone=? AND active=1"
        " AND street_norm IS NOT NULL AND street_norm != ''",
        (phone,),
    ).fetchone()[0]
    if streets < SHARED_LINE_STREETS:
        return False
    proposed_hash = db.value_hash(phone)
    prior = conn.execute(
        "SELECT status FROM review_queue WHERE kind='shared_phone' AND field='phone' AND proposed_hash=?"
        " AND business_id IS NULL AND source_record_id IS NULL",
        (proposed_hash,),
    ).fetchone()
    if prior is not None and prior["status"] == "rejected":
        return False  # a person said this line identifies one business
    if prior is None:
        review_id = db.add_review(
            conn, kind="shared_phone", field="phone", proposed=phone, now=stamp,
            detail=(
                f"This phone is listed by active records at {streets} different streets, so it is"
                " treated as a shared line and never used to join records."
            ),
        )
        if review_id is not None:
            # Records held earlier because of this phone get another look.
            requeued = conn.execute(
                "UPDATE source_records SET match_state='new' WHERE phone=? AND match_state='review'"
                " AND active=1",
                (phone,),
            ).rowcount
            logger.info("shared phone line found at %d streets (review %d, %d records requeued)",
                        streets, review_id, requeued)
    return True


# ---------------------------------------------------------------- business updates

def _scope_for(conn: sqlite3.Connection, business_id: int, current: str) -> str:
    """'city' when any active linked primary record is in the city.

    Records that place the business at a street (sales tax, TABC, NPI) decide
    first: a franchise-tax record's scope comes from a mailing ZIP, so it
    decides only for a business no premises record places."""
    scopes: set = set()
    for sources_sql in (_PREMISES_SQL, _PRIMARY_SQL):
        scopes = {r["scope"] for r in conn.execute(
            f"SELECT scope FROM source_records WHERE business_id=? AND active=1 AND source_id IN {sources_sql}",
            (business_id,),
        )}
        if scopes:
            break
    if not scopes:
        return current
    for scope in ("city", "nearby", "out"):
        if scope in scopes:
            return scope
    return current


def _franchise_only(conn: sqlite3.Connection, business_id: int, exclude_id: Optional[int] = None) -> bool:
    """The business stands on a franchise-tax record: no active record places it at a street."""
    has_franchise = conn.execute(
        "SELECT 1 FROM source_records WHERE business_id=? AND source_id=? AND active=1 AND id != ? LIMIT 1",
        (business_id, FRANCHISE, exclude_id or 0),
    ).fetchone()
    if has_franchise is None:
        return False
    return conn.execute(
        f"SELECT 1 FROM source_records WHERE business_id=? AND active=1 AND source_id IN {_PREMISES_SQL}"
        " AND id != ? LIMIT 1",
        (business_id, exclude_id or 0),
    ).fetchone() is None


def _category_for(rec: "_Rec") -> Tuple[str, str]:
    """NAICS, then OSM tags; a franchise record names no kind of business and none is guessed."""
    if rec.source_id == FRANCHISE:
        return categories.COMPANY_FALLBACK
    return categories.categorize(rec.naics or None, rec.tags)


def _update(conn: sqlite3.Connection, business_id: int, values: dict) -> None:
    if not values:
        return
    cols = ", ".join(f"{k}=?" for k in values)
    conn.execute(f"UPDATE businesses SET {cols} WHERE id=?", (*values.values(), business_id))


def _enrich(conn: sqlite3.Connection, business_id: int, rec: _Rec, stamp: str, *, confirm_osm: bool) -> List[str]:
    """Fill the business's empty columns from ``rec``. Returns notes for the explanation."""
    biz = _business(conn, business_id)
    if biz is None:
        return []
    if _is_suppressed(conn, biz):
        return ["The business is suppressed, so none of its details were changed."]
    notes: List[str] = []
    values: dict = {}
    # OpenStreetMap joining a business known only from the franchise-tax list: its
    # website is a candidate to read, but its street, category, and map point are
    # never shown under the Comptroller's name (no premises record vouches for them).
    osm_on_franchise = rec.source_id == "osm" and not confirm_osm and _franchise_only(conn, business_id)

    if confirm_osm and rec.source_id == FRANCHISE:
        # A place known only from OpenStreetMap is the company on the franchise-tax
        # list with the same name: the company's name and the honest "kind not on
        # record" replace everything OSM contributed; no street or map point stays.
        category, label = categories.COMPANY_FALLBACK
        values.update({
            "street": None, "street_norm": None, "suite": None, "zip": None, "naics": None,
            "lat": None, "lon": None, "category": category, "category_label": label, "slug": None,
            "publish_state": "pending", "publish_reason": None,
        })
        if rec.name:
            values["name"] = rec.name
            values["name_norm"] = rec.name_norm
        notes.append(
            "It was known only from OpenStreetMap, so it now uses the franchise-tax record's name and shows"
            " no street or kind of business from OpenStreetMap; it is no longer held for a primary source."
        )
    elif confirm_osm:
        # Everything OSM contributed is replaced, so no OSM-only value is later
        # shown under the primary record's name. The business was always held
        # in review, so its slug was never public and is rebuilt below.
        renamed = bool(rec.name) and rec.name != biz["name"]
        category, label = categories.categorize(rec.naics or None, rec.tags)
        values.update({
            "street": rec.street_display() or None,
            "street_norm": rec.street_norm or None,
            "suite": rec.suite or None,
            "zip": rec.zip or None,
            "naics": rec.naics or None,
            "category": category,
            "category_label": label,
            "slug": None,
        })
        if rec.name:
            values["name"] = rec.name
            values["name_norm"] = rec.name_norm
        if rec.lat is not None and rec.lon is not None:
            values["lat"], values["lon"] = rec.lat, rec.lon
        values["publish_state"] = "pending"
        values["publish_reason"] = None
        notes.append(
            f"It was known only from OpenStreetMap, so it now uses the {rec.label} record's name, address"
            " and category and is no longer held for a primary source."
            if renamed else
            f"It was known only from OpenStreetMap, so its address and category now come from the"
            f" {rec.label} record and it is no longer held for a primary source."
        )
    else:
        if osm_on_franchise:
            pass
        elif not biz["street_norm"] and rec.street_norm:
            values["street"] = rec.street_display() or None
            values["street_norm"] = rec.street_norm
            values["suite"] = rec.suite or None
        if not biz["zip"] and rec.zip and not osm_on_franchise:
            values["zip"] = rec.zip
        if not biz["naics"] and not osm_on_franchise:
            if rec.naics:
                values["naics"] = rec.naics
                values["category"], values["category_label"] = categories.categorize(rec.naics, rec.tags)
            elif biz["category"] == categories.FALLBACK[0] and rec.tags:
                slug, label = categories.categorize(None, rec.tags)
                if slug != categories.FALLBACK[0]:
                    values["category"], values["category_label"] = slug, label

    if (biz["lat"] is None and biz["lon"] is None and rec.lat is not None and rec.lon is not None
            and not osm_on_franchise and "lat" not in values):
        values["lat"], values["lon"] = rec.lat, rec.lon
    if not biz["city"] and rec.city:
        values["city"] = rec.city
    if rec.permit_start:
        current = biz["permit_start"]
        if not current or (rec.source_id == "tx_sales_tax" and rec.permit_start < current):
            values["permit_start"] = rec.permit_start
    if rec.is_primary and rec.is_individual and not biz["is_individual"]:
        values["is_individual"] = 1  # privacy-conservative: any individual taxpayer counts

    # The same registrable domain is the same site (http/https, www, a location page).
    # A stored website on a directory, map, or social site (kept from before the guard) is no
    # website: the new candidate replaces it. One that is certainly such a site is cleared even
    # without a replacement; one only in doubt (a business called The Chamber) is kept for a
    # person, and it is still never read or published while it stays forbidden.
    existing_website = biz["website"]
    if existing_website and forbidden_site(existing_website):
        existing_website = None
        if not rec.website and not forbidden_site_in_doubt(biz["website"]):
            values["website"] = values["website_domain"] = values["website_source"] = None
    if rec.website:
        existing_domain = ((biz["website_domain"] if existing_website else "")
                           or normalize.registrable_domain(existing_website or "")).lower()
        if not existing_website:
            values["website"] = rec.website
            values["website_domain"] = rec.website_domain
            values["website_source"] = WEBSITE_SOURCES.get(rec.source_id, rec.source_id)
        elif rec.website_domain and rec.website_domain != existing_domain:
            db.add_review(
                conn, kind="website_conflict", business_id=business_id, source_record_id=rec.id,
                field="website", proposed=rec.website, current=existing_website, source_url=rec.source_url,
                now=stamp,
                detail=(
                    f"The {rec.label} record lists {rec.website_domain}, but the business already has"
                    f" {existing_domain or 'another website'}; the existing website was kept."
                ),
            )

    scope = _scope_for(conn, business_id, biz["scope"])
    if scope != biz["scope"]:
        values["scope"] = scope
    if values:
        values["updated_at"] = stamp
        _update(conn, business_id, values)
    if confirm_osm:
        assign_identity(conn, business_id)  # keeps public_id; the slug now comes from the primary name
    return notes


def _identity_source(conn: sqlite3.Connection, business_id: int) -> Optional[int]:
    """The record the business's name and address follow: its first active
    primary record by source priority, then source key."""
    row = conn.execute(
        f"SELECT id FROM source_records WHERE business_id=? AND active=1 AND source_id IN {_PRIMARY_SQL}"
        f" ORDER BY {_ORDER_SQL} LIMIT 1",
        (business_id,),
    ).fetchone()
    return int(row["id"]) if row else None


def _refresh_identity(conn: sqlite3.Connection, business_id: int, rec: _Rec, stamp: str) -> List[str]:
    """A changed primary record on an existing link: follow it if it is the
    identity source, otherwise ask a person when it now disagrees.

    Values go only into business columns and review items, never into logs.
    """
    biz = _business(conn, business_id)
    if biz is None or not rec.is_primary or _is_suppressed(conn, biz):
        return []
    # A name kept from before only the trade name was shown ('John Smith Dba
    # Smith Lawn Service') compares equal, since norm_name drops the legal
    # part, but it is renamed too, and its slug is chosen again from the trade name.
    dba_dropped = bool(rec.name) and normalize.has_dba(biz["name"]) and not normalize.has_dba(rec.name)
    name_differs = bool(rec.name) and (rec.name_norm != (biz["name_norm"] or "") or dba_dropped)
    street_differs = bool(rec.street_norm) and rec.street_norm != (biz["street_norm"] or "")

    if _identity_source(conn, business_id) != rec.id:
        # Different spellings across sources are normal; only a clearly
        # different name or another street is a conflict.
        name_conflict = bool(rec.name) and normalize.name_similarity(rec.name, biz["name"] or "") < MERGE_SIMILARITY
        street_conflict = street_differs and bool(biz["street_norm"])
        for field, conflict, proposed, current in (
            ("name", name_conflict, rec.name, biz["name"]),
            ("address", street_conflict, rec.street_display(), biz["street"]),
        ):
            if conflict:
                db.add_review(
                    conn, kind="source_conflict", business_id=business_id, source_record_id=rec.id,
                    field=field, proposed=proposed, current=current, source_url=rec.source_url, now=stamp,
                    detail=(f"The {rec.label} record now lists a different {field} than the business;"
                            " the business was not changed."),
                )
        return []

    values: dict = {}
    if name_differs:
        values["name"], values["name_norm"] = rec.name, rec.name_norm
    if dba_dropped:
        values["slug"] = None
    # The shown street follows too when only its units changed ('Bldg 2' now
    # 'Bldg 2 Apt 4'): the dwelling unit decides whether it may be shown.
    if rec.street_norm and (street_differs or (rec.suite or None) != biz["suite"]
                            or (rec.street_display() or None) != biz["street"]):
        values["street"] = rec.street_display() or None
        values["street_norm"] = rec.street_norm
        values["suite"] = rec.suite or None
    if rec.zip and rec.zip != biz["zip"]:
        values["zip"] = rec.zip
    if rec.naics and rec.naics != biz["naics"]:
        values["naics"] = rec.naics
        values["category"], values["category_label"] = categories.categorize(rec.naics, rec.tags)
    if not values:
        return []

    notes = []
    if name_differs:
        db.add_review(
            conn, kind="identity_changed", business_id=business_id, source_record_id=rec.id, field="name",
            proposed=rec.name, current=biz["name"], source_url=rec.source_url, now=stamp,
            detail=f"The {rec.label} record now lists a different name; the business follows it.",
        )
        notes.append(f"It now uses the {rec.label} record's current name.")
    if street_differs:
        if biz["street_norm"]:
            db.add_review(
                conn, kind="identity_changed", business_id=business_id, source_record_id=rec.id,
                field="address", proposed=rec.street_display(), current=biz["street"],
                source_url=rec.source_url, now=stamp,
                detail=f"The {rec.label} record now lists a different street; the business follows it.",
            )
        # The website's listing vouched for the old street, not this one.
        conn.execute("DELETE FROM facts WHERE business_id=? AND field='address_listed'", (business_id,))
        notes.append(f"It now uses the {rec.label} record's current street.")
    values["updated_at"] = stamp
    _update(conn, business_id, values)
    if dba_dropped:
        assign_identity(conn, business_id)  # keeps public_id; the old slug carried the legal name
    return notes


def _has_primary(conn: sqlite3.Connection, business_id: int, exclude_id: int) -> bool:
    return conn.execute(
        f"SELECT 1 FROM source_records WHERE business_id=? AND id != ? AND source_id IN {_PRIMARY_SQL} LIMIT 1",
        (business_id, exclude_id),
    ).fetchone() is not None


def _join(conn: sqlite3.Connection, rec: _Rec, business_id: int, rule: str, evidence: dict,
          explanation: str, stamp: str) -> MatchResult:
    confirm_osm = rec.is_primary and not _has_primary(conn, business_id, rec.id)
    conn.execute(
        "UPDATE source_records SET business_id=?, match_state='matched' WHERE id=?", (business_id, rec.id)
    )
    notes = _enrich(conn, business_id, rec, stamp, confirm_osm=confirm_osm)
    explanation = " ".join([explanation, *notes])
    evidence = dict(evidence, source_id=rec.source_id, source_key=rec.source_key)
    conn.execute(
        "INSERT INTO merges(business_id, source_record_id, rule, evidence_json, explanation, created_at)"
        " VALUES (?,?,?,?,?,?)",
        (business_id, rec.id, rule, db.dumps(evidence), explanation, stamp),
    )
    _resolve_merge_reviews(conn, rec.id, stamp)
    return MatchResult("matched", business_id, rule, explanation)


def _create(conn: sqlite3.Connection, rec: _Rec, stamp: str) -> MatchResult:
    osm_only = rec.source_id == "osm"
    category, label = _category_for(rec)
    values = {
        "name": rec.name,
        "name_norm": rec.name_norm,
        "street": rec.street_display() or None,
        "street_norm": rec.street_norm or None,
        "suite": rec.suite or None,
        "city": rec.city or None,
        "zip": rec.zip or None,
        "lat": rec.lat,
        "lon": rec.lon,
        "scope": rec.scope,
        "place": rec.place,
        "naics": rec.naics or None,
        "category": category,
        "category_label": label,
        "permit_start": rec.permit_start or None,
        "is_individual": rec.is_individual,
        "website": rec.website or None,
        "website_domain": rec.website_domain or None,
        "website_source": WEBSITE_SOURCES.get(rec.source_id, rec.source_id) if rec.website else None,
        "publish_state": "review" if osm_only else "pending",
        "publish_reason": OSM_ONLY_REASON if osm_only else None,
        "first_seen_at": stamp,
        "updated_at": stamp,
    }
    cols = ", ".join(values)
    cur = conn.execute(
        f"INSERT INTO businesses({cols}) VALUES ({','.join('?' * len(values))})", tuple(values.values())
    )
    business_id = int(cur.lastrowid)
    conn.execute(
        "UPDATE source_records SET business_id=?, match_state='created' WHERE id=?", (business_id, rec.id)
    )
    assign_identity(conn, business_id)
    _resolve_merge_reviews(conn, rec.id, stamp)
    if osm_only:
        return MatchResult(
            "created", business_id, RULE_OSM_ONLY,
            "Created a business held for review because only OpenStreetMap lists this place so far.",
        )
    return MatchResult(
        "created", business_id, RULE_NEW,
        f"Created a new business from the {rec.label} record because no existing business shares"
        " its phone, its address with a similar name, or its website at the same address.",
    )


def _review(conn: sqlite3.Connection, rec: _Rec, questions: List[Tuple[int, str]], rule: str,
            stamp: str) -> MatchResult:
    """Hold the record: one merge question per candidate business, no new business."""
    candidates = [bid for bid, _ in questions]
    _resolve_merge_reviews(conn, rec.id, stamp, keep=candidates)
    for business_id, detail in questions:
        _open_merge_review(conn, rec, business_id, detail, stamp)
    conn.execute("UPDATE source_records SET match_state='review' WHERE id=?", (rec.id,))
    return MatchResult("review", None, rule, questions[0][1])


def _ignore(conn: sqlite3.Connection, rec: _Rec, rule: str, explanation: str) -> MatchResult:
    conn.execute("UPDATE source_records SET match_state='ignored' WHERE id=?", (rec.id,))
    return MatchResult("ignored", None, rule, explanation)


# ---------------------------------------------------------------- franchise tax

def _detach_franchise(conn: sqlite3.Connection, rec: _Rec, stamp: str) -> bool:
    """Unlink a franchise record from its business. A business that stood on it
    alone (no sales-tax, TABC, or NPI record) is retired, and anything else linked
    to it (an OpenStreetMap place) goes back to matching. True when retired."""
    business_id = rec.business_id
    conn.execute("UPDATE source_records SET business_id=NULL WHERE id=?", (rec.id,))
    biz = _business(conn, business_id) if business_id is not None else None
    if biz is None:
        return False
    premises = conn.execute(
        f"SELECT 1 FROM source_records WHERE business_id=? AND active=1 AND source_id IN {_PREMISES_SQL} LIMIT 1",
        (business_id,),
    ).fetchone()
    if premises is not None:
        return False
    others = conn.execute("SELECT id, active FROM source_records WHERE business_id=?", (business_id,)).fetchall()
    for other in others:
        conn.execute(
            "UPDATE source_records SET business_id=NULL, match_state=CASE WHEN ? THEN 'new' ELSE match_state END"
            " WHERE id=?",
            (1 if other["active"] else 0, other["id"]),
        )
    conn.execute("UPDATE businesses SET active=0, updated_at=? WHERE id=?", (stamp, business_id))
    return True


def _franchise_step_aside(conn: sqlite3.Connection, rec: _Rec, stamp: str) -> MatchResult:
    """The taxpayer has an active Longview sales-tax outlet: the outlet is the listing.

    The franchise record is unlinked and ignored (``_detach_franchise``). Order
    does not matter: this runs whenever the franchise record is matched, and
    ``match_pending`` requeues franchise records whenever the sales-tax list
    changes which taxpayers have an outlet.
    """
    retired = _detach_franchise(conn, rec, stamp)
    conn.execute("UPDATE source_records SET match_state='ignored' WHERE id=?", (rec.id,))
    _resolve_merge_reviews(conn, rec.id, stamp)
    explanation = ("Not listed from the franchise-tax record: the same taxpayer has an active sales-tax"
                   " location in the same town, and that location is the listing.")
    if retired:
        explanation += " The listing made from the franchise-tax record was retired."
    return MatchResult("ignored", None, RULE_FRANCHISE_OUTLET, explanation)


# A business that a TABC or NPI record places at a street, with no sales-tax
# record (the taxpayer number is the only link to a sales-tax outlet) and no
# other franchise record (two registrations are two companies).
_TWIN_SQL = (
    "SELECT * FROM businesses b WHERE b.name_norm=? AND b.place=? AND b.active=1"
    " AND EXISTS (SELECT 1 FROM source_records p WHERE p.business_id=b.id AND p.active=1"
    "  AND p.source_id IN ('tx_tabc','npi'))"
    " AND NOT EXISTS (SELECT 1 FROM source_records t WHERE t.business_id=b.id AND t.source_id='tx_sales_tax')"
    " AND NOT EXISTS (SELECT 1 FROM source_records f WHERE f.business_id=b.id AND f.source_id='tx_franchise'"
    "  AND f.id != ?) ORDER BY b.id"
)


def _franchise_twins(conn: sqlite3.Connection, rec: _Rec, rejected: set) -> List[sqlite3.Row]:
    """Licensed or registered practices (TABC, NPI) with the franchise record's exact name."""
    if not rec.name_norm:
        return []
    return [b for b in conn.execute(_TWIN_SQL, (rec.name_norm, rec.place, rec.id)).fetchall()
            if b["id"] not in rejected]


def _match_franchise_twins(conn: sqlite3.Connection, rec: _Rec, accepted: List[int], rejected: set,
                           stamp: str) -> Optional[MatchResult]:
    """A franchise record with the same name as a TABC- or NPI-backed business: a person decides.

    Nothing but the name links them, and a franchise record gives no location to
    compare, so they are never joined automatically. The question waits on the
    franchise record (it is not listed meanwhile); it never takes the practice's
    listing off the site (``publish._decide`` ignores merge questions that a
    franchise-tax record asks). Accepted: the record joins that business.
    Rejected for every such business: the record is listed on its own. A
    franchise-only listing made before the practice appeared is retired while
    the question waits, so the same company is never listed twice.
    """
    twins = _franchise_twins(conn, rec, rejected)
    if not twins:
        return None
    ids = [b["id"] for b in twins]
    if rec.business_id in ids:
        return None  # already joined (a person accepted it): refreshed as usual
    for business_id in accepted:
        if business_id in ids:
            _detach_franchise(conn, rec, stamp)
            return _join(conn, rec, business_id, RULE_REVIEWED, {"review": "accepted"},
                         "Joined because a reviewer accepted this match.", stamp)
    if rec.business_id is not None:
        _detach_franchise(conn, rec, stamp)
    detail = (f"This {rec.label} record has the same name as a business a TABC or NPI record places at a street,"
              " and nothing else links them (the franchise-tax list gives only a mailing address). Join them"
              " if they are the same company; reject to list the company on its own.")
    return _review(conn, rec, [(bid, detail) for bid in ids], REVIEW_NAME_PRACTICE, stamp)


def _requeue_franchise(conn: sqlite3.Connection) -> int:
    """Franchise records are matched again when their taxpayer gains or loses an
    active sales-tax outlet, or when a TABC- or NPI-backed business with the same
    name appears that no person has ruled out."""
    with_outlet = franchise.sales_tax_taxpayer_places(conn)
    ids = []
    for row in conn.execute(
        "SELECT id, source_key, business_id, match_state, place FROM source_records WHERE source_id=? AND active=1",
        (FRANCHISE,),
    ):
        state = row["match_state"]
        if (row["source_key"], row["place"] or "longview") in with_outlet:
            if row["business_id"] is not None or state not in ("ignored", "new"):
                ids.append(row["id"])
        elif state == "ignored" and row["business_id"] is None:
            ids.append(row["id"])
    seen = set(ids)
    for row in conn.execute(
        "SELECT s.id FROM source_records s WHERE s.source_id=? AND s.active=1"
        " AND s.match_state IN ('matched','created')"
        " AND IFNULL(s.name_norm,'')<>''"
        " AND NOT EXISTS (SELECT 1 FROM source_records q WHERE q.business_id=s.business_id AND q.active=1"
        f"  AND q.source_id IN {_PREMISES_SQL})"
        " AND EXISTS (SELECT 1 FROM businesses b WHERE b.name_norm=s.name_norm AND b.place=s.place"
        "  AND b.active=1 AND b.id<>IFNULL(s.business_id,0)"
        "  AND EXISTS (SELECT 1 FROM source_records p WHERE p.business_id=b.id AND p.active=1"
        "   AND p.source_id IN ('tx_tabc','npi'))"
        "  AND NOT EXISTS (SELECT 1 FROM source_records t WHERE t.business_id=b.id AND t.source_id='tx_sales_tax')"
        "  AND NOT EXISTS (SELECT 1 FROM source_records f WHERE f.business_id=b.id AND f.source_id='tx_franchise'"
        "   AND f.id<>s.id)"
        "  AND NOT EXISTS (SELECT 1 FROM review_queue r WHERE r.source_record_id=s.id AND r.business_id=b.id"
        "   AND r.kind='merge_ambiguous' AND r.status='rejected'))",
        (FRANCHISE,),
    ):
        if row["id"] not in seen:
            ids.append(row["id"])
    with db.transaction(conn):
        for start in range(0, len(ids), BATCH_SIZE):
            chunk = ids[start:start + BATCH_SIZE]
            conn.execute(f"UPDATE source_records SET match_state='new' WHERE id IN ({','.join('?' * len(chunk))})",
                         chunk)
    return len(ids)


def _franchise_keys(conn: sqlite3.Connection, business_id: int) -> set:
    return {r["source_key"] for r in conn.execute(
        "SELECT source_key FROM source_records WHERE business_id=? AND source_id=? AND active=1",
        (business_id, FRANCHISE))}


def _taxpayer_bars(conn: sqlite3.Connection, rec: _Rec, business_id: int) -> bool:
    """The taxpayer number rules the join out (or nothing but a person may make it).

    * A franchise record never joins a business with a sales-tax record, active
      or not: the same taxpayer's outlet makes the record step aside, and any
      other taxpayer is another company.
    * A sales-tax record joins a business that holds a franchise record only
      when every such record carries the outlet's own taxpayer number.
    * A TABC or NPI record never joins a business known only from the franchise
      list by matching alone (the franchise record asks a person instead,
      ``_match_franchise_twins``).
    """
    if rec.source_id == FRANCHISE:
        return conn.execute(
            "SELECT 1 FROM source_records WHERE business_id=? AND source_id='tx_sales_tax' LIMIT 1", (business_id,)
        ).fetchone() is not None
    if rec.source_id == "tx_sales_tax":
        keys = _franchise_keys(conn, business_id)
        return bool(keys) and keys != {franchise.outlet_taxpayer(rec.source_key)}
    if rec.source_id in ("tx_tabc", "npi"):
        return _franchise_only(conn, business_id)
    return False


def _name_candidates(conn: sqlite3.Connection, rec: _Rec, rejected: set) -> List[sqlite3.Row]:
    """Businesses a record may join on its exact normalized name alone.

    * A franchise record: a place known only from OpenStreetMap (no primary
      record at all, active or not).
    * An OpenStreetMap record: a business known only from a franchise record
      (no sales-tax, TABC, or NPI record at all).
    * A sales-tax record: a business known only from the franchise record of
      the outlet's own taxpayer.
    * A TABC or NPI record: none (see ``_match_franchise_twins``).
    """
    if not rec.name_norm:
        return []
    if rec.source_id == FRANCHISE:
        sql = ("SELECT * FROM businesses b WHERE b.name_norm=? AND b.place=? AND b.active=1 AND NOT EXISTS"
               f" (SELECT 1 FROM source_records s WHERE s.business_id=b.id AND s.source_id IN {_PRIMARY_SQL})"
               " ORDER BY b.id")
        params: tuple = (rec.name_norm, rec.place)
    elif rec.source_id in ("osm", "tx_sales_tax"):
        sql = ("SELECT * FROM businesses b WHERE b.name_norm=? AND b.place=? AND b.active=1"
               " AND IFNULL(b.street_norm,'')=''"
               " AND EXISTS (SELECT 1 FROM source_records s WHERE s.business_id=b.id AND s.source_id=?"
               " AND s.active=1) AND NOT EXISTS (SELECT 1 FROM source_records s WHERE s.business_id=b.id"
               f" AND s.source_id IN {_PREMISES_SQL}) ORDER BY b.id")
        params = (rec.name_norm, rec.place, FRANCHISE)
    else:
        return []
    candidates = [b for b in conn.execute(sql, params).fetchall() if b["id"] not in rejected]
    if rec.source_id == "tx_sales_tax":
        own = franchise.outlet_taxpayer(rec.source_key)
        candidates = [b for b in candidates if _franchise_keys(conn, b["id"]) == {own}]
    return candidates


def _match_by_name(conn: sqlite3.Connection, rec: _Rec, rejected: set, stamp: str) -> Optional[MatchResult]:
    candidates = _name_candidates(conn, rec, rejected)
    if len(candidates) == 1:
        biz = candidates[0]
        if rec.source_id == "tx_sales_tax":
            sentence = ("Joined because the outlet and the franchise-tax record have the same taxpayer number"
                        " and the same name.")
        else:
            sentence = ("Joined because the franchise-tax record and the business have the same name, and the"
                        " franchise-tax record gives no location to compare.")
        return _join(conn, rec, biz["id"], RULE_SAME_NAME, {"name_norm": rec.name_norm}, sentence, stamp)
    if len(candidates) > 1 and rec.source_id == FRANCHISE:
        # Places known only from OpenStreetMap: never published, so the question
        # takes nothing off the site. The franchise record waits for the answer.
        detail = (f"This {rec.label} record has the same name as {len(candidates)} places known only from"
                  " OpenStreetMap and gives no location to tell them apart; choose one or keep it separate.")
        return _review(conn, rec, [(b["id"], detail) for b in candidates], REVIEW_NAME_MANY, stamp)
    # Several franchise-only companies with one name: an OpenStreetMap place (or
    # an outlet) cannot tell them apart by name, so it joins none of them.
    return None


# ---------------------------------------------------------------- the rules

def _match(conn: sqlite3.Connection, source_record_id: int, stamp: str) -> MatchResult:
    result = _match_rules(conn, source_record_id, stamp)
    if result.business_id is not None and result.action in ("created", "matched"):
        _carry_suppression(conn, source_record_id, result.business_id, stamp)
    return result


def _match_rules(conn: sqlite3.Connection, source_record_id: int, stamp: str) -> MatchResult:
    row = conn.execute("SELECT * FROM source_records WHERE id=?", (source_record_id,)).fetchone()
    if row is None:
        return MatchResult("ignored", None, "missing", "No source record has this id.")
    rec = _load(row)
    if not rec.active:
        # Left as it is; an inactive record neither joins nor creates anything.
        return MatchResult("ignored", rec.business_id, "inactive", "The record is no longer in its source.")

    # 00. A record that now names another town leaves its old business (a business has one place).
    if rec.business_id is not None:
        old = _business(conn, rec.business_id)
        if old is not None and (old["place"] or "longview") != rec.place:
            rec = _leave_place(conn, rec, old, stamp)

    # 0. A company with a sales-tax outlet in its own town is listed by the outlet.
    if rec.source_id == FRANCHISE and franchise.has_sales_tax_outlet(conn, rec.source_key, rec.place):
        return _franchise_step_aside(conn, rec, stamp)

    # 0b. A franchise record named like a TABC or NPI practice waits for a person.
    if rec.source_id == FRANCHISE:
        accepted, rejected = _decisions(conn, rec)
        twins = _match_franchise_twins(conn, rec, accepted, rejected, stamp)
        if twins is not None:
            return twins

    # 1. Already linked: refresh the business in place.
    if rec.business_id is not None and _business(conn, rec.business_id) is not None:
        conn.execute("UPDATE source_records SET match_state='matched' WHERE id=?", (rec.id,))
        notes = _refresh_identity(conn, rec.business_id, rec, stamp)
        notes += _enrich(conn, rec.business_id, rec, stamp, confirm_osm=False)
        _resolve_merge_reviews(conn, rec.id, stamp)
        return MatchResult(
            "matched", rec.business_id, RULE_EXISTING,
            " ".join(["Kept the existing link from this record to its business.", *notes]),
        )

    accepted, rejected = _decisions(conn, rec)
    for business_id in accepted:
        if _same_place(_business(conn, business_id), rec):
            return _join(conn, rec, business_id, RULE_REVIEWED, {"review": "accepted"},
                         "Joined because a reviewer accepted this match.", stamp)

    # 2. Same phone, addresses agree.
    phone_conflicts: List[sqlite3.Row] = []
    if rec.phone and not _shared_line(conn, rec.phone, stamp):
        agree, conflict = [], []
        for r in conn.execute(
            "SELECT DISTINCT business_id FROM source_records WHERE phone=? AND id != ?"
            " AND business_id IS NOT NULL ORDER BY business_id",
            (rec.phone, rec.id),
        ):
            biz = _business(conn, r["business_id"])
            if (not _same_place(biz, rec) or biz["id"] in rejected
                    or _taxpayer_bars(conn, rec, biz["id"])):
                continue
            (agree if _phone_addresses_agree(rec, biz) else conflict).append(biz)
        if len(agree) == 1:
            biz = agree[0]
            street = rec.street_norm or biz["street_norm"]
            if rec.street_norm and biz["street_norm"]:
                sentence = f"Joined because both records list {rec.phone} at {street}."
            else:
                sentence = (f"Joined because both records list {rec.phone} and one of them has no street,"
                            " so the addresses do not conflict.")
            evidence = {"phone": rec.phone, "street_norm": rec.street_norm or None,
                        "business_street_norm": biz["street_norm"], "zip": rec.zip or None,
                        "business_zip": biz["zip"]}
            return _join(conn, rec, biz["id"], RULE_PHONE, evidence, sentence, stamp)
        if len(agree) > 1:
            detail = (f"This {rec.label} record's phone is also listed by {len(agree)} businesses whose"
                      " addresses do not rule it out; choose one or keep it separate.")
            return _review(conn, rec, [(b["id"], detail) for b in agree], REVIEW_PHONE_MANY, stamp)
        phone_conflicts = conflict

    # 3-5. Same address.
    partial: List[Tuple[sqlite3.Row, float]] = []
    if rec.street_norm:
        scored = []
        for biz in conn.execute(
            "SELECT * FROM businesses WHERE street_norm=? AND place=? ORDER BY id", (rec.street_norm, rec.place)
        ).fetchall():
            if biz["id"] in rejected or not _same_address(rec, biz) or _taxpayer_bars(conn, rec, biz["id"]):
                continue
            scored.append((biz, _similarity(conn, rec, biz)))
        address_evidence = {"street_norm": rec.street_norm, "zip": rec.zip or None, "suite": rec.suite or None}

        strong = [(b, s) for b, s in scored if s >= MERGE_SIMILARITY]
        if strong:
            best = max(s for _, s in strong)
            top = [(b, s) for b, s in strong if s == best]
            if len(top) == 1:
                biz, sim = top[0]
                sentence = (f"Joined because both records are at {rec.street_norm} and their names are"
                            f" similar ({sim:.2f}).")
                evidence = dict(address_evidence, business_zip=biz["zip"], business_suite=biz["suite"],
                                similarity=sim)
                return _join(conn, rec, biz["id"], RULE_ADDRESS_NAME, evidence, sentence, stamp)
            detail = (f"This {rec.label} record is at {rec.street_norm} with names equally similar to"
                      f" {len(top)} businesses; choose one or keep it separate.")
            return _review(conn, rec, [(b["id"], detail) for b, _ in top], REVIEW_ADDRESS_MANY, stamp)

        if rec.website_domain:
            by_domain = [b for b, _ in scored if rec.website_domain in _domains(conn, b)]
            if len(by_domain) == 1:
                biz = by_domain[0]
                sentence = (f"Joined because both records list the website {rec.website_domain}"
                            f" at {rec.street_norm}.")
                evidence = dict(address_evidence, website_domain=rec.website_domain,
                                business_zip=biz["zip"], business_suite=biz["suite"])
                return _join(conn, rec, biz["id"], RULE_DOMAIN_ADDRESS, evidence, sentence, stamp)
            if len(by_domain) > 1:
                detail = (f"This {rec.label} record's website {rec.website_domain} is listed by"
                          f" {len(by_domain)} businesses at {rec.street_norm}; choose one or keep it separate.")
                return _review(conn, rec, [(b["id"], detail) for b in by_domain], REVIEW_ADDRESS_MANY, stamp)

        partial = [(b, s) for b, s in scored if REVIEW_SIMILARITY <= s < MERGE_SIMILARITY]

    # 5 (and a phone seen at another street): hold for a person instead of guessing.
    questions: List[Tuple[int, str]] = []
    for biz, sim in partial:
        questions.append((biz["id"], (
            f"This {rec.label} record is at {rec.street_norm} like business {_ref(biz)}, but the names are"
            f" only partly similar ({sim:.2f}); join them or keep them separate."
        )))
    for biz in phone_conflicts:
        if biz["id"] in {bid for bid, _ in questions}:
            continue
        questions.append((biz["id"], (
            f"This {rec.label} record lists the same phone as business {_ref(biz)} but at"
            f" {rec.street_norm or 'another address'} instead of {biz['street_norm']}; it may be another"
            " location or a shared line."
        )))
    if questions:
        rule = REVIEW_ADDRESS_PARTIAL if partial else REVIEW_PHONE_STREET
        return _review(conn, rec, questions, rule, stamp)

    # 5b. The same name as a franchise-tax company (a franchise record has no street to compare).
    by_name = _match_by_name(conn, rec, rejected, stamp)
    if by_name is not None:
        return by_name

    # 6. Nothing matched.
    if rec.source_id not in PRIMARY_SOURCES and rec.source_id != "osm":
        return _ignore(conn, rec, "not_a_primary_source",
                       f"Not joined, and a {rec.label} record cannot create a business on its own.")
    if not rec.name:
        return _ignore(conn, rec, "no_name", "Not joined, and a record without a name cannot create a business.")
    return _create(conn, rec, stamp)


# ---------------------------------------------------------------- public API

def match_record(conn: sqlite3.Connection, source_record_id: int, now: Now = None) -> MatchResult:
    """Match one source record (rules in SPEC order); atomic on its own."""
    stamp = _stamp(now)
    with db.transaction(conn):
        result = _match(conn, int(source_record_id), stamp)
    logger.debug("record %d: %s by %s (business %s)", source_record_id, result.action, result.rule,
                 result.business_id)
    return result


def _drop_dba_names(conn: sqlite3.Connection, stamp: str) -> int:
    """A business an older version named 'Legal Name DBA Trade Name' takes its
    identity record's trade name, even when that record has not changed."""
    renamed = 0
    for biz in conn.execute("SELECT id, name FROM businesses ORDER BY id").fetchall():
        source = _identity_source(conn, biz["id"]) if normalize.has_dba(biz["name"]) else None
        if source is not None:
            rec = _load(conn.execute("SELECT * FROM source_records WHERE id=?", (source,)).fetchone())
            if rec.name and not normalize.has_dba(rec.name):
                renamed += bool(_refresh_identity(conn, biz["id"], rec, stamp))
    return renamed


def match_pending(conn: sqlite3.Connection, now: Now = None) -> Dict[str, int]:
    """Match every active record in state 'new', 500 per transaction, then refresh activity."""
    stamp = _stamp(now)
    counts = {"matched": 0, "created": 0, "review": 0, "ignored": 0}
    for _ in range(MAX_PASSES):
        # Before every pass: a pass can create the outlet or practice a franchise record must now defer to.
        requeued = _requeue_franchise(conn)
        if requeued:
            logger.info("matching: %d franchise-tax records requeued (a sales-tax outlet, or a practice with the"
                        " same name, appeared or went)", requeued)
        ids = [r["id"] for r in conn.execute(
            f"SELECT id FROM source_records WHERE match_state='new' AND active=1 ORDER BY {_ORDER_SQL}"
        )]
        if not ids:
            break
        for start in range(0, len(ids), BATCH_SIZE):
            with db.transaction(conn):
                for record_id in ids[start:start + BATCH_SIZE]:
                    counts[_match(conn, record_id, stamp).action] += 1
    with db.transaction(conn):
        renamed = _drop_dba_names(conn, stamp)
    if renamed:
        logger.info("matching: %d businesses renamed to their trade name", renamed)
    changed = refresh_activity(conn, now=stamp)
    logger.info("matching: %d matched, %d created, %d review, %d ignored; %d businesses changed activity",
                counts["matched"], counts["created"], counts["review"], counts["ignored"], changed)
    return counts


def refresh_activity(conn: sqlite3.Connection, now: Now = None) -> int:
    """A business is active while any linked record is; its scope follows its active primary records.

    Businesses with no linked records are left alone. Returns how many changed.
    """
    stamp = _stamp(now)
    changed = 0
    with db.transaction(conn):
        rows = conn.execute(
            "SELECT b.id, b.active, b.scope, MAX(s.active) AS any_active FROM businesses b"
            " JOIN source_records s ON s.business_id = b.id GROUP BY b.id ORDER BY b.id"
        ).fetchall()
        for row in rows:
            values = {}
            active = 1 if row["any_active"] else 0
            if active != row["active"]:
                values["active"] = active
            scope = _scope_for(conn, row["id"], row["scope"])
            if scope != row["scope"]:
                values["scope"] = scope
            if values:
                values["updated_at"] = stamp
                _update(conn, row["id"], values)
                changed += 1
    return changed


def _public_id(seed: str) -> str:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return "lv-" + base64.b32encode(digest).decode("ascii").rstrip("=").lower()[:10]


def _slug_taken(conn: sqlite3.Connection, slug: str, business_id: int) -> bool:
    return conn.execute(
        "SELECT 1 FROM businesses WHERE slug=? AND id != ?", (slug, business_id)
    ).fetchone() is not None


def _choose_slug(conn: sqlite3.Connection, biz: sqlite3.Row, public_id: str) -> str:
    """The name's slug; a taken or reserved one gets the end of the public id.

    Never the street: the slug is fixed when the business is created, before
    anyone knows whether its address may be shown, and a home address is shown
    as "Longview, TX" only, so its street must not appear in the URL either.
    """
    base = normalize.slugify(biz["name"])
    candidates = []
    if base:
        candidates.append(base)
        candidates.append(f"{base}-{public_id[-4:]}")
        candidates.append(f"{base}-{public_id[3:]}")
    else:
        candidates.append(public_id)
    for slug in candidates:
        if slug and not _reserved(slug) and not _slug_taken(conn, slug, biz["id"]):
            return slug
    n = 2
    while _slug_taken(conn, f"{candidates[-1]}-{n}", biz["id"]):
        n += 1
    return f"{candidates[-1]}-{n}"


def assign_identity(conn: sqlite3.Connection, business_id: int) -> Tuple[str, str]:
    """Give a business its public id and slug once; both stay fixed afterwards.

    ``public_id`` hashes the first linked record's ``source_id:source_key`` (the
    record that created the business), so it survives a rebuild of the archive.
    """
    biz = _business(conn, business_id)
    if biz is None:
        raise LookupError(f"no business {business_id}")
    public_id = biz["public_id"]
    if not public_id:
        first = conn.execute(
            "SELECT source_id, source_key FROM source_records WHERE business_id=?"
            f" ORDER BY match_state='created' DESC, {_ORDER_SQL} LIMIT 1",
            (business_id,),
        ).fetchone()
        seed = f"{first['source_id']}:{first['source_key']}" if first else f"business:{business_id}"
        public_id = _public_id(seed)
        n = 1
        while conn.execute(
            "SELECT 1 FROM businesses WHERE public_id=? AND id != ?", (public_id, business_id)
        ).fetchone():
            public_id = _public_id(f"{seed}#{n}")
            n += 1
    slug = biz["slug"] or _choose_slug(conn, biz, public_id)
    if public_id != biz["public_id"] or slug != biz["slug"]:
        conn.execute("UPDATE businesses SET public_id=?, slug=? WHERE id=?", (public_id, slug, business_id))
    return public_id, slug
